"""Patches into Home Assistant's internals, for the children that need them until HA does
the job itself: Casa Mia Intercom (calls on WebRTC offers) and Casa Mia Protect Talkback
(talk through UniFi Protect cameras).

Each child keeps one Patches. It checks every target before replacing any (raising
PatchError), so a changed HA gets no half-patch, and puts back everything it replaced. A
failure is a Repair on the child's own domain, so it is seen, and HA goes on unpatched.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable

from homeassistant.const import __version__ as HA_VERSION
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryError
from homeassistant.helpers import issue_registry as ir

_LOGGER = logging.getLogger(__name__)

ISSUE_ID = "patch_failed"  # each child's translations say what stops working
# The integration these two replace, from the separate intercom repo (up to 2026.11.1-b11).
OLD_DOMAIN = "intercom_talkback"


class PatchError(Exception):
    """HA's internals no longer look as a patch expects."""


class Patches:
    """What one child replaced inside HA, to put back."""

    def __init__(self, domain: str, tested_ha: str) -> None:
        # tested_ha: the HA release whose source the patches were written against.
        self.domain, self.tested_ha = domain, tested_ha
        self._undo: list[tuple[object, str, object]] = []

    def __bool__(self) -> bool:
        return bool(self._undo)

    def apply(self, replacements: Iterable[tuple[object, str, object]]) -> None:
        """Replace each (owner, attribute, replacement). Check them all before calling."""
        if HA_VERSION != self.tested_ha:
            _LOGGER.warning(
                "%s was written for HA %s, running on %s: check the patches still apply",
                self.domain,
                self.tested_ha,
                HA_VERSION,
            )
        for owner, name, replacement in replacements:
            # None when inherited: then putting back means deleting ours.
            self._undo.append((owner, name, vars(owner).get(name)))
            setattr(owner, name, replacement)

    def remove(self) -> None:
        while self._undo:
            owner, name, original = self._undo.pop()
            if original is None:
                delattr(owner, name)
            else:
                setattr(owner, name, original)
        _LOGGER.info("%s: removed its patches", self.domain)

    def fail(self, hass: HomeAssistant, reason: str) -> None:
        _LOGGER.error("%s: patches not applied: %s", self.domain, reason)
        ir.async_create_issue(
            hass,
            self.domain,
            ISSUE_ID,
            is_fixable=False,
            severity=ir.IssueSeverity.ERROR,
            translation_key=ISSUE_ID,
            translation_placeholders={"reason": reason},
        )

    def succeed(self, hass: HomeAssistant) -> None:
        ir.async_delete_issue(hass, self.domain, ISSUE_ID)


def refuse_beside_old(hass: HomeAssistant) -> None:
    """Both would patch the same parts of HA's go2rtc: the old one must be disabled first
    (it stays installed, switched off, until these are proven on the box)."""
    if any(not e.disabled_by for e in hass.config_entries.async_entries(OLD_DOMAIN)):
        raise ConfigEntryError(
            "The old Intercom talkback integration is still enabled. Disable its entry "
            "(Settings > Devices & services), then reload this one."
        )
