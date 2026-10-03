"""Install the bundled HA custom components into HA's config folder.

Each component under the source root is mirrored to `<config>/custom_components/<domain>`.
When files change, a marker records the version now on disk so the component itself can
raise a "restart required" Repair, and only if its own loaded version differs.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import urllib.request
from dataclasses import dataclass
from pathlib import Path

MARKER = ".restart_required.json"
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
    status: str  # "installed", "updated" or "current"
    previous_version: str | None
    version: str | None

    @property
    def changed(self) -> bool:
        return self.status != "current"


def is_ignored(path: Path) -> bool:
    return (
        "__pycache__" in path.parts
        or path.suffix in {".pyc", ".pyo"}
        or path.name in {".DS_Store", MARKER}
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


def _files(folder: Path) -> dict[Path, Path]:
    return {
        p.relative_to(folder): p
        for p in sorted(folder.rglob("*"))
        if p.is_file() and not is_ignored(p)
    }


def install_component(source: Path, destination: Path) -> InstallResult:
    first_install = not destination.exists()
    previous = manifest_version(destination)
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

    version = manifest_version(source)
    status = "installed" if first_install else "updated" if changed else "current"
    if changed:
        marker = {"status": status, "from_version": previous, "to_version": version}
        (destination / MARKER).write_text(json.dumps(marker) + "\n", "utf-8")
    return InstallResult(source.name, status, previous, version)


def install_all(source_root: Path, config_folder: Path) -> list[InstallResult]:
    return [
        install_component(src, config_folder / "custom_components" / src.name)
        for src in sorted(source_root.iterdir())
        if (src / "manifest.json").is_file()
    ]


def ask_for_restart(
    results: list[InstallResult], token: str, url: str = NOTIFY_URL
) -> bool:
    """A first install has no Repair to ask for HA's restart (that comes from the component,
    which is not loaded yet), so post an HA notification instead. Best effort."""
    new = [r.domain for r in results if r.status == "installed"]
    if not new:
        return False
    body = {
        "notification_id": NOTIFICATION_ID,
        "title": "Casa Mia: restart Home Assistant",
        "message": (
            "The Casa Mia integration has been installed. Restart Home Assistant "
            "(Settings → ⋮ → Restart Home Assistant), then add Casa Mia under "
            "[Devices & services](/config/integrations/dashboard)."
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
