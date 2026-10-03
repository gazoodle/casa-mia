"""Raise a "restart required" Repair when the app has installed newer files than are loaded.

The app writes `.restart_required.json` into this folder whenever it changes it. This file is
domain-agnostic (the domain is the folder name) so every Casa Mia component carries an
identical copy and prompts for its own restart only when its own version really changed.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

HERE = Path(__file__).parent
DOMAIN = HERE.name
MARKER = ".restart_required.json"
ISSUE_ID = "restart_required"


def manifest_version(folder: Path = HERE) -> str | None:
    try:
        version = json.loads((folder / "manifest.json").read_text("utf-8")).get(
            "version"
        )
    except (OSError, ValueError, AttributeError):
        return None
    return version if isinstance(version, str) and version.strip() else None


def pending_restart(loaded_version: str | None, folder: Path = HERE) -> str | None:
    """The version waiting for a restart, or None. Clears a marker the loaded code satisfies."""
    marker = folder / MARKER
    try:
        to_version = json.loads(marker.read_text("utf-8")).get("to_version")
    except (OSError, ValueError, AttributeError):
        return None
    if to_version == loaded_version:
        marker.unlink(missing_ok=True)
        return None
    return to_version if isinstance(to_version, str) else "unknown"


async def async_check_restart(hass: Any, loaded_version: str | None) -> None:
    from homeassistant.helpers import issue_registry as ir

    pending = await hass.async_add_executor_job(pending_restart, loaded_version)
    if pending is None:
        ir.async_delete_issue(hass, DOMAIN, ISSUE_ID)
        return
    ir.async_create_issue(
        hass,
        DOMAIN,
        ISSUE_ID,
        is_fixable=True,
        severity=ir.IssueSeverity.WARNING,
        translation_key=ISSUE_ID,
        translation_placeholders={
            "from_version": loaded_version or "unknown",
            "to_version": pending,
        },
    )
