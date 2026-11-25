"""Snooze: a fault the house knows about, put out of the way until a time (owner,
2026-11-23). A snoozed row leaves the Status, Problem, the counts, the lists and the
sidebar, and no event is sent for it; it stays in sight as `snoozed` (who, until when).

Why: one cloud down for days held Status at error, so a fault that came after it changed
nothing anyone could see. No Acknowledge and no Mute: either can hide a fault for ever.

A snooze can't outlast its reason. It ends:
- at its time, kept across restarts, and the fault is then said again as still there;
- when the fault gets worse by its reading (not by escalation, which is time alone, or
  every snooze would wake itself), or becomes another kind of fault (levels.fault:
  retrying turned into "sign in again");
- when the fault has been gone for RECOVERED, so a flapping cloud doesn't cancel it and
  next month's fault isn't hidden.

Critical is never snoozed, nor a sensor rolled up into its integration (that is the row
to snooze). Every row set is judged here (watch._Rows), so no path can leave one marked
or unmarked wrongly, and one set after its time is over even if the timer was lost."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.util import dt as dt_util

from .kept import Kept
from .levels import fault, rank, still
from .rollup import RollUp

_LOGGER = logging.getLogger(__name__)
RECOVERED = 900  # seconds gone or nominal before its snooze is over
TIME_UP = "its time is up"


class Snooze:
    def __init__(
        self,
        hass: HomeAssistant,
        kept: Kept,
        now: dict[str, dict[str, Any]],
        rollup: RollUp,
        tell: Callable[[], None],
    ) -> None:
        self.hass, self.kept, self.now = hass, kept, now
        self._rollup, self._tell = rollup, tell
        self._timer: CALLBACK_TYPE | None = None
        self._arm()

    def quiet(self, key: str) -> bool:
        """Nothing is to be said of it: snoozed, or just recovered from it."""
        return key in self.kept.snoozed

    def judge(self, key: str, row: dict[str, Any] | None) -> None:
        """A row is being set (None: taken away): mark it snoozed, or end its snooze."""
        snooze = self.kept.snoozed.get(key)
        if row is not None:
            row.pop("snoozed", None)
        if snooze is None:
            return
        now = dt_util.utcnow()

        if row is None or row.get("level") in (None, "nominal"):
            if "clear" not in snooze:
                clear = now + timedelta(seconds=RECOVERED)
                snooze["clear"] = clear.isoformat()
                self.kept.changed()
            return
        real, kind = row.get("real") or row["level"], fault(key, row)
        over = (
            TIME_UP
            if datetime.fromisoformat(snooze["until"]) <= now
            else "it had recovered"
            if "clear" in snooze and datetime.fromisoformat(snooze["clear"]) <= now
            else f"worse, {real}"
            if rank(real) > rank(snooze["level"])
            else f"another fault, {kind}"
            if kind and snooze["kind"] and kind != snooze["kind"]
            else None
        )
        if over:
            self._forget(key)
            _LOGGER.info("%s (%s): snooze over: %s", row["name"], key, over)
            # Once whoever set the row has said what it has to: if that was nothing
            # (the same level for another reason), it is said then. A task of Home
            # Assistant's, not eager, so it runs after them and is awaited at a stop.
            self.hass.async_create_task(
                self._later(key, over == TIME_UP), eager_start=False
            )
            return

        if snooze.pop("clear", None):
            self.kept.changed()  # back within RECOVERED: the same fault, still snoozed
        row["snoozed"] = {"until": snooze["until"], "by": snooze["by"]}

    def snooze(self, key: str, until: datetime, by: str | None) -> None:
        row = self.now.get(key)
        if row is None or row.get("level") in (None, "nominal"):
            raise ServiceValidationError(f"{key} is at no level to snooze now")
        if parent := row.get("under"):
            name = (self.now.get(parent) or {}).get("name") or "its integration"
            raise ServiceValidationError(
                f"{row['name']} is rolled up into {name}: snooze that"
            )
        if row["level"] == "critical":
            raise ServiceValidationError(
                f"{row['name']} is critical, which can't be snoozed"
            )
        if until <= dt_util.utcnow():
            raise ServiceValidationError("a snooze ends at a time still to come")

        self.kept.snoozed[key] = {
            "until": until.isoformat(),
            "by": by,
            "level": row.get("real") or row["level"],
            "kind": fault(key, row),
        }
        self.kept.changed()
        self._rollup.unsay(key, "snoozed")
        self.now[key] = row  # set again: judged, so marked, and noted for the page
        self._arm()
        _LOGGER.info(
            "%s (%s): snoozed until %s by %s",
            row["name"],
            key,
            until.isoformat(timespec="minutes"),
            by or "an automation",
        )
        self._tell()

    def unsnooze(self, key: str) -> None:
        if key not in self.kept.snoozed:
            raise ServiceValidationError(f"{key} isn't snoozed")
        _LOGGER.info("%s: unsnoozed", key)
        self._end(key, timed=False)

    @callback
    def unload(self) -> None:
        if self._timer:
            self._timer()
            self._timer = None

    def _forget(self, key: str) -> None:
        del self.kept.snoozed[key]
        self.kept.changed()
        self._arm()

    def _end(self, key: str, timed: bool) -> None:
        """Its snooze is over, at its time or by hand: counted again, and said."""
        self._forget(key)
        if (row := self.now.get(key)) is not None:
            self.now[key] = row  # set again: judged, so no longer marked
        self._after(key, timed, found=not timed)
        self._tell()

    async def _later(self, key: str, timed: bool) -> None:
        self._after(key, timed)

    @callback
    def _after(self, key: str, timed: bool, found: bool = False) -> None:
        """Say a fault whose snooze ended, unless it is said already, has gone, or is
        snoozed again. `timed`: at its time, so said as still there. `found`: unsnoozed
        by hand, which raises the sidebar's again and leaves the phone be; otherwise it
        is a change, and a phone hears."""
        row = self.now.get(key)
        if row is None or row.get("level") in (None, "nominal"):
            return
        if row.get("under") or row.get("snoozed") or self._rollup.said(key):
            return
        message = still(key, row, dt_util.utcnow()) if timed else None
        self._rollup.say(key, found, message)

    def _arm(self) -> None:
        """One timer, for the first snooze to end."""
        self.unload()
        if not self.kept.snoozed:
            return
        first = min(
            datetime.fromisoformat(s["until"]) for s in self.kept.snoozed.values()
        )
        self._timer = async_track_point_in_utc_time(self.hass, self._due, first)

    @callback
    def _due(self, now: datetime) -> None:
        self._timer = None
        due = [
            key
            for key, snooze in self.kept.snoozed.items()
            if datetime.fromisoformat(snooze["until"]) <= now
        ]
        for key in due:
            _LOGGER.info("%s: snooze over: %s", key, TIME_UP)
            self._end(key, timed=True)
        self._arm()  # a timer that fired early finds nothing due, and waits again
