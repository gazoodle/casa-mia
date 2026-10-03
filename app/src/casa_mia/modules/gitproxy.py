"""gitproxy: mirror the Kiosk Satellite firmware and serve it to the tablets.

Tablets on a network without internet can't reach GitHub for updates. Kiosk
Satellite's "Custom Repository" source is just an HTTP folder holding
`releases.json` (GitHub's releases API response, saved as is) and the APKs it
names, so mirroring plus a static file server is enough. Ported from
tablet-provision/fake_git_host.py; tablets point at
http://<ha-host>:8000 (Kiosk Satellite adds /releases.json itself).

`handle` is the admin page's API (/api/gitproxy/): status with the tablets' URL and the
files on disk, Check now, and how many older releases to keep (saved in `settings_path`).
"""

from __future__ import annotations

import functools
import http.server
import json
import logging
import threading
import urllib.request
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..download import fetch, prune

_LOGGER = logging.getLogger(__name__)

PORT = 8000
RELEASES_API = (
    "https://api.github.com/repos/jxlarrea/kiosk-satellite/releases?per_page=30"
)
DOWNLOAD_URL = (
    "https://github.com/jxlarrea/kiosk-satellite/releases/download/{tag}/{name}"
)
ABI_SUFFIXES = ("", ".arm64-v8a", ".armeabi-v7a", ".x86_64")
MIRROR_INTERVAL_SECONDS = 12 * 60 * 60  # matches the app's own check interval
TIMEOUT = 60
# Previous releases kept on disk besides the latest; older APKs are deleted after each mirror.
KEEP_PREVIOUS_REVISIONS = 2
MAX_KEEP = 5
APK_PREFIX = "kiosk-satellite-"
APK_EXTENSION = ".apk"


class _Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(
        self, *args: Any, on_request: Callable[[str, str, str], None], **kwargs: Any
    ) -> None:
        # Before super(): the base class handles the request inside __init__.
        self.on_request = on_request
        super().__init__(*args, **kwargs)

    def log_request(self, code: int | str = "-", size: int | str = "-") -> None:
        """Called once per answered request with its status."""
        self.on_request(
            self.client_address[0], self.path, str(getattr(code, "value", code))
        )

    def log_message(self, format: str, *args: object) -> None:
        _LOGGER.debug("%s - %s", self.address_string(), format % args)


class GitProxy:
    def __init__(
        self,
        directory: Path,
        port: int = PORT,
        releases_api: str = RELEASES_API,
        download_url: str = DOWNLOAD_URL,
        settings_path: Path | None = None,
        lan_host: Callable[[], str | None] = lambda: None,
    ) -> None:
        self.directory = directory
        self.port = port
        self.releases_api = releases_api
        self.download_url = download_url
        self.settings_path = settings_path
        self.lan_host = lan_host
        self.keep = KEEP_PREVIOUS_REVISIONS
        try:
            if settings_path:
                keep = int(json.loads(settings_path.read_text())["keep"])
                # Clamped: a negative keep would be a slice that drops the latest.
                self.keep = min(max(keep, 0), MAX_KEEP)
        except (OSError, ValueError, KeyError, TypeError):
            pass
        self._server: http.server.ThreadingHTTPServer | None = None
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._mirroring = threading.Lock()
        self._latest: str | None = None
        self._last_check: str | None = None
        self._error: str | None = None
        # Progress of the release being fetched; kept after it finishes, reset when the next starts.
        self._downloading = False
        self._bytes: int | None = None
        self._total: int | None = None
        # The last time a tablet asked for releases.json, and which tablet.
        self._tablet_check: str | None = None
        self._tablet: str | None = None

    def start(self) -> None:
        """Never raises: a failure shows up as state `offline` in health()."""
        self.directory.mkdir(parents=True, exist_ok=True)
        self._latest = self._latest_on_disk()
        try:
            self._server = http.server.ThreadingHTTPServer(
                ("0.0.0.0", self.port),
                functools.partial(
                    _Handler, directory=str(self.directory), on_request=self._served
                ),
            )
        except OSError as exc:
            self._error = f"cannot serve on :{self.port}: {exc}"
            _LOGGER.error(self._error)
            return
        self.port = self._server.server_port
        threading.Thread(target=self._server.serve_forever, daemon=True).start()
        threading.Thread(target=self._mirror_loop, daemon=True).start()
        _LOGGER.info("serving firmware from %s on :%d", self.directory, self.port)

    def stop(self) -> None:
        self._stop.set()
        if self._server:
            self._server.shutdown()
            self._server.server_close()
            self._server = None

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "state": "running" if self._server else "offline",
                "latest": self._latest,
                "last_check": self._last_check,
                "error": self._error,
                "checking": self._mirroring.locked(),
                "downloading": self._downloading,
                "downloaded_bytes": self._bytes,
                "total_bytes": self._total,
                "downloaded_percent": (
                    round(self._bytes * 100 / self._total, 1)
                    if self._bytes is not None and self._total
                    else None
                ),
                "port": self.port,
                "last_tablet_check": self._tablet_check,
                "last_tablet": self._tablet,
            }

    def _served(self, ip: str, path: str, code: str) -> None:
        """Log the tablets' update checks and downloads; everything else stays at debug."""
        name = path.split("?")[0].lstrip("/")
        if name == "releases.json":
            _LOGGER.info("tablet %s checked for firmware updates (%s)", ip, code)
            with self._lock:
                self._tablet_check = _now()
                self._tablet = ip
        elif name.endswith(APK_EXTENSION):
            _LOGGER.info("tablet %s is downloading %s (%s)", ip, name, code)
        else:
            _LOGGER.debug("%s asked for %s (%s)", ip, path, code)

    def _tags_on_disk(self) -> list[str]:
        """Release tags in the saved releases.json, newest first."""
        try:
            releases = json.loads((self.directory / "releases.json").read_bytes())
            return [str(release["tag_name"]) for release in releases]
        except (OSError, ValueError, KeyError, TypeError):
            return []

    def _latest_on_disk(self) -> str | None:
        """Newest release in releases.json whose universal APK is present."""
        for tag in self._tags_on_disk():
            if (self.directory / f"{APK_PREFIX}{tag}{APK_EXTENSION}").exists():
                return tag
        return None

    def _mirror_loop(self) -> None:
        while not self._stop.is_set():
            self.mirror()
            self._stop.wait(MIRROR_INTERVAL_SECONDS)

    def mirror(self) -> None:
        """Check now (the scheduled run and the Force Check button both land here)."""
        if not self._mirroring.acquire(blocking=False):
            _LOGGER.info("a firmware check is already running")
            return
        try:
            self._mirror()
        finally:
            self._mirroring.release()

    def _mirror(self) -> None:
        _LOGGER.info("checking for a new firmware release")
        try:
            with urllib.request.urlopen(self.releases_api, timeout=TIMEOUT) as resp:
                body = resp.read()
            releases = json.loads(body)
            tags = [release["tag_name"] for release in releases]
            tag = tags[0]
            sizes = {a["name"]: a["size"] for a in releases[0].get("assets", [])}
        except (OSError, ValueError, KeyError, IndexError, TypeError) as exc:
            self._finish(f"check failed: {exc}")
            return
        failed = []
        todo = [
            name
            for abi in ABI_SUFFIXES
            if not (
                self.directory / (name := f"{APK_PREFIX}{tag}{abi}{APK_EXTENSION}")
            ).exists()
        ]
        if todo:
            with self._lock:
                self._downloading, self._bytes = True, 0
                self._total = sum(sizes.get(name, 0) for name in todo)
        for name in todo:
            _LOGGER.info("downloading %s", name)
            try:
                self._download(
                    self.download_url.format(tag=tag, name=name), self.directory / name
                )
            except OSError as exc:
                _LOGGER.warning("%s failed: %s", name, exc)
                failed.append(name)
        self._downloading = False
        # Prune only once the latest universal APK is on disk, so a failed
        # download can never leave the folder with nothing installable.
        if (self.directory / f"{APK_PREFIX}{tag}{APK_EXTENSION}").exists():
            self._prune(tags)
            with self._lock:
                self._latest = tag
        self._publish(releases)
        self._finish(f"failed to download {', '.join(failed)}" if failed else None)

    def _publish(self, releases: list[dict[str, Any]]) -> None:
        """Write the releases.json the tablets read, listing only releases whose APK is
        on disk: GitHub can list a release before its files are attached, and a tablet
        told about one we don't have fails its update."""
        have = [
            r
            for r in releases
            if (self.directory / f"{APK_PREFIX}{r['tag_name']}{APK_EXTENSION}").exists()
        ]
        missing = [r["tag_name"] for r in releases[: self.keep + 1] if r not in have]
        if missing:
            _LOGGER.info(
                "not offering %s to tablets: not downloaded", ", ".join(missing)
            )
        tmp = self.directory / "releases.json.tmp"
        tmp.write_text(json.dumps(have))
        tmp.replace(self.directory / "releases.json")

    def _finish(self, error: str | None) -> None:
        if error:
            _LOGGER.warning(error)
        with self._lock:
            self._error = error
            self._last_check = _now()

    def _download(self, url: str, dest: Path) -> None:
        fetch(url, dest, self._count_bytes)

    def _count_bytes(self, size: int) -> None:
        with self._lock:
            self._bytes = (self._bytes or 0) + size

    def _prune(self, tags: list[str]) -> None:
        keep = set(tags[: self.keep + 1])
        prune(
            self.directory,
            f"{APK_PREFIX}*{APK_EXTENSION}",
            lambda apk: _tag_of(apk.name) in keep,
        )

    # -- the admin page's API

    def tablet_url(self) -> str:
        return f"http://{self.lan_host() or 'homeassistant.local'}:{self.port}"

    def view(self) -> dict[str, Any]:
        files = []
        for path in self.directory.iterdir():
            if path.is_file():
                stat = path.stat()
                files.append(
                    {
                        "name": path.name,
                        "size": stat.st_size,
                        "modified": datetime.fromtimestamp(
                            stat.st_mtime, timezone.utc
                        ).isoformat(timespec="seconds"),
                    }
                )
        files.sort(key=lambda f: (f["modified"], f["name"]), reverse=True)
        return {
            **self.health(),
            "url": self.tablet_url(),
            "keep": self.keep,
            "max_keep": MAX_KEEP,
            "files": files,
        }

    def set_keep(self, keep: int) -> None:
        """Save it, and prune now unless a check is running (that one prunes at its end).
        Raising it keeps more from the next release on; older APKs are not fetched back."""
        self.keep = keep
        if self.settings_path:
            self.settings_path.parent.mkdir(parents=True, exist_ok=True)
            self.settings_path.write_text(json.dumps({"keep": keep}))
        _LOGGER.info("keeping %d older firmware releases", keep)
        if self._latest and self._mirroring.acquire(blocking=False):
            try:
                self._prune(self._tags_on_disk())
            finally:
                self._mirroring.release()

    def handle(
        self, method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> tuple[int, str, bytes]:
        route = (method, path.strip("/"))
        if route == ("GET", "status"):
            return _json(200, self.view())
        if route == ("POST", "check"):
            threading.Thread(target=self.mirror, daemon=True).start()
            return _json(202, self.view())
        if route == ("PUT", "settings"):
            try:
                keep = json.loads(body)["keep"]
            except (ValueError, KeyError, TypeError):
                keep = None
            if type(keep) is not int or not 0 <= keep <= MAX_KEEP:
                return _json(400, {"error": f"keep must be 0 to {MAX_KEEP}."})
            self.set_keep(keep)
            return _json(200, self.view())
        return _json(404, {"error": "Not found."})


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _json(status: int, data: Any) -> tuple[int, str, bytes]:
    return status, "application/json", json.dumps(data).encode()


def _tag_of(filename: str) -> str:
    """kiosk-satellite-2026.9.44.arm64-v8a.apk -> 2026.9.44"""
    stem = filename[len(APK_PREFIX) : -len(APK_EXTENSION)]
    for suffix in ABI_SUFFIXES[1:]:
        if stem.endswith(suffix):
            return stem[: -len(suffix)]
    return stem
