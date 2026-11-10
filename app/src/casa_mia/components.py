"""Install the bundled HA custom components into HA's config folder.

Each component under the source root is mirrored to `<config>/custom_components/<domain>`.
When files change, a marker records the version now on disk so the component itself can
raise a "restart required" Repair, and only if its own loaded version differs.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import urllib.request
from dataclasses import dataclass
from pathlib import Path

MARKER = ".restart_required.json"
# Components once bundled and no longer: taken out of HA's config, so HA stops loading
# them. None now: casa_mia_sensor_watch was here from 2026.10.10-b4, while Sensor Watch
# was part of casa_mia, and is bundled again as its own integration since 2026.11.3.
RETIRED: tuple[str, ...] = ()
# Fired in Home Assistant when a start changed any component's files, with
# {"components": {domain: version}}: Sensor Watch's integration, which doesn't know the
# app, raises its restart Repair on it (its const.INSTALLED_EVENT).
INSTALLED_EVENT = "casa_mia_components_installed"
# Components also published by themselves, each from the mirror repository named here
# (tools/mirror.py, docs/design/marketplace-mirrors.md). HACS or the Marketplace may have
# put a newer one in HA's config than this app bundles, and that one is left alone. The
# rest come from the app only and always follow it, so that installing an earlier app
# takes them back with it (docs/releases.md).
PUBLISHED = {"casa_mia_sensor_watch": "casa-mia-sensor-watch"}
_VERSION = re.compile(r"(\d+)\.(\d+)\.(\d+)(?:-b(\d+))?")
# HA's notification service through the Supervisor proxy. The notice needs no dismissing:
# HA drops notifications when it restarts, which is what it asks for.
NOTIFY_URL = "http://supervisor/core/api/services/persistent_notification/create"
NOTIFICATION_ID = "casa_mia_restart"
_LOGGER = logging.getLogger(__name__)

# `homeassistant_config` is mounted here inside an app; absent on the Mac.
HA_CONFIG = Path(os.environ.get("CM_HA_CONFIG", "/homeassistant"))
# The Dockerfile bundles the components in /components. Not an ENV: s6-overlay (PID 1 in the
# HA base image) hands the app a clean environment, so image ENV never reaches it.
CONTAINER_COMPONENTS = Path("/components")


def default_components(container: Path = CONTAINER_COMPONENTS) -> Path:
    if container.is_dir():
        return container
    return Path(__file__).resolve().parents[3] / "integration" / "custom_components"


COMPONENTS = Path(os.environ.get("CM_COMPONENTS") or default_components())


@dataclass(frozen=True, slots=True)
class InstallResult:
    domain: str
    status: str  # "installed", "updated", "current", or "kept" (a newer one is there)
    previous_version: str | None
    version: str | None  # the one in HA's config now

    @property
    def changed(self) -> bool:
        return self.status in ("installed", "updated")


def is_ignored(path: Path) -> bool:
    return (
        "__pycache__" in path.parts
        or path.suffix in {".pyc", ".pyo"}
        or path.name in {".DS_Store", MARKER, "swap.json"}  # swap: screenshots, by hand
        or "swap" in path.parts  # and the screenshot swap's camera pictures
        or path.name.startswith("._")
    )


def manifest_version(folder: Path) -> str | None:
    try:
        version = json.loads((folder / "manifest.json").read_text("utf-8")).get(
            "version"
        )
    except (OSError, ValueError, AttributeError):
        return None
    return version if isinstance(version, str) and version.strip() else None


def version_key(version: str | None) -> tuple[int, int, int, bool, int] | None:
    """Puts versions in order, a release above its own builds (2026.11.3-b9 < 2026.11.3).
    None for a version that isn't one of ours."""
    found = _VERSION.fullmatch(version or "")
    if not found:
        return None
    year, month, release, build = found.groups()
    return int(year), int(month), int(release), build is None, int(build or 0)


def manifest_name(folder: Path) -> str:
    try:
        return json.loads((folder / "manifest.json").read_text("utf-8"))["name"]
    except (OSError, ValueError, KeyError, TypeError):
        return folder.name


def _files(folder: Path) -> dict[Path, Path]:
    return {
        p.relative_to(folder): p
        for p in sorted(folder.rglob("*"))
        if p.is_file() and not is_ignored(p)
    }


def install_component(source: Path, destination: Path) -> InstallResult:
    first_install = not destination.exists()
    previous = manifest_version(destination)
    version = manifest_version(source)

    # No downgrade of a component a store may have updated past this app. A version
    # that can't be read, on either side, is no reason to hold back.
    ours, theirs = version_key(version), version_key(previous)
    if source.name in PUBLISHED and ours and theirs and ours < theirs:
        _LOGGER.warning(
            "component %s left at %s: this app bundles the older %s",
            source.name,
            previous,
            version,
        )
        return InstallResult(source.name, "kept", previous, previous)

    wanted = _files(source)
    changed = False
    for relative, path in wanted.items():
        target = destination / relative
        if target.exists() and target.read_bytes() == path.read_bytes():
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        changed = True
    if destination.exists():
        for relative in set(_files(destination)) - set(wanted):
            (destination / relative).unlink()
            changed = True
        for folder in sorted(destination.rglob("*"), reverse=True):
            if folder.is_dir() and not any(folder.iterdir()):
                folder.rmdir()

    status = "installed" if first_install else "updated" if changed else "current"
    if changed:
        marker = {"status": status, "from_version": previous, "to_version": version}
        (destination / MARKER).write_text(json.dumps(marker) + "\n", "utf-8")
    return InstallResult(source.name, status, previous, version)


def install_all(source_root: Path, config_folder: Path) -> list[InstallResult]:
    results = [
        install_component(src, config_folder / "custom_components" / src.name)
        for src in sorted(source_root.iterdir())
        if (src / "manifest.json").is_file()
    ]
    for name in RETIRED:
        old = config_folder / "custom_components" / name
        if (old / "manifest.json").is_file():
            shutil.rmtree(old)
            _LOGGER.info("component %s retired: removed from %s", name, old.parent)
    return results


def ask_for_restart(
    results: list[InstallResult], token: str, url: str = NOTIFY_URL
) -> bool:
    """A first install has no Repair to ask for HA's restart (that comes from the component,
    which is not loaded yet), so post an HA notification instead. Best effort."""
    new = [r.domain for r in results if r.status == "installed"]
    if not new:
        return False
    names = ", ".join(manifest_name(COMPONENTS / d) for d in new)
    body = {
        "notification_id": NOTIFICATION_ID,
        "title": "Casa Mia: restart Home Assistant",
        "message": (
            f"Installed: {names}. Restart Home Assistant (Settings → ⋮ → Restart "
            "Home Assistant), then set them up under "
            "[Devices & services](/config/integrations/dashboard): Casa Mia first; it "
            "then offers the others under Discovered while their module is on in the "
            "app. Sensor Watch needs no Casa Mia: add it there yourself, unless it was "
            "switched on in the app before, when it is set up for you."
        ),
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=10).close()
    except OSError as exc:
        _LOGGER.warning("could not ask for a Home Assistant restart: %s", exc)
        return False
    _LOGGER.info("new component %s: asked for a Home Assistant restart", ", ".join(new))
    return True


def install_bundled() -> list[InstallResult]:
    """Install everything bundled; never raises, so a bad install cannot stop the app."""
    if not HA_CONFIG.is_dir():
        _LOGGER.info("no HA config folder at %s, not installing components", HA_CONFIG)
        return []
    try:
        results = install_all(COMPONENTS, HA_CONFIG)
    except OSError:
        _LOGGER.exception("could not install components into %s", HA_CONFIG)
        return []
    for r in results:
        _LOGGER.info(
            "component %s %s (%s -> %s)",
            r.domain,
            r.status,
            r.previous_version,
            r.version,
        )
    return results
