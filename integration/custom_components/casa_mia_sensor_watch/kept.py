"""What must outlive a restart of Home Assistant, kept in its storage: which integrations
are failing and since when, and for each lasting fault (an integration, the Recorder, an
unavailable sensor) since when, and what was said of it.

Why: a restart stamps every entity as just changed, so an outage of days said it began at
the restart; and with nothing remembered, "found" and "new" couldn't be told apart, so a
phone was told again of each old fault and never of a new one (to 2026.11.11)."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
KEY = f"{DOMAIN}_kept"
# seconds a write waits, so a storm is one write (Home Assistant writes it when stopping).
SAVE_AFTER = 5


class Kept:
    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict[str, Any]] = Store(hass, 1, KEY)
        # entry id -> {since (a timestamp), state, reason}: levels.track_failures'.
        self.failing: dict[str, dict[str, Any]] = {}
        # row key -> {since (ISO), told: the level last said, or None for one only
        # rolled up, groups: those it was said for}.
        self.said: dict[str, dict[str, Any]] = {}

    async def load(self) -> Kept:
        try:
            data = await self._store.async_load() or {}
            failing, said = data.get("failing", {}), data.get("said", {})
            for failure in failing.values():
                if (
                    not isinstance(failure["since"], int | float)
                    or not failure["state"]
                ):
                    raise ValueError(f"not a failure: {failure}")
            for row in said.values():
                if datetime.fromisoformat(row["since"]).tzinfo is None:
                    raise ValueError(f"a time with no zone: {row['since']}")
        except (
            HomeAssistantError,
            AttributeError,
            KeyError,
            TypeError,
            ValueError,
        ) as exc:
            _LOGGER.warning(
                "can't read how long faults have lasted, so each is timed from now: %s",
                exc,
            )
            return self
        self.failing, self.said = failing, said
        return self

    def note(self, key: str, **fields: Any) -> None:
        was = self.said.get(key, {"told": None})
        if (now := was | fields) != self.said.get(key):
            self.said[key] = now
            self.changed()

    def forget(self, key: str) -> None:
        if self.said.pop(key, None) is not None:
            self.changed()

    def changed(self) -> None:
        self._store.async_delay_save(self._data, SAVE_AFTER)

    async def save(self) -> None:
        """At once: Sensor Watch is unloading, and may load again before the wait is up."""
        await self._store.async_save(self._data())

    def _data(self) -> dict[str, Any]:
        return {"failing": dict(self.failing), "said": dict(self.said)}


async def forget_all(hass: HomeAssistant) -> None:
    """Sensor Watch deleted: added again months later, nothing has been failing since."""
    await Store(hass, 1, KEY).async_remove()
