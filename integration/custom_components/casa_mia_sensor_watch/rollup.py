"""A failed integration is one problem (owner, 2026-11-22). Home Assistant's own health
rows, and each watched sensor that is unavailable because its integration failed rolled
up into that integration's row: not counted, listed or said by itself, but there under
it (`under`, its key).

Why: one cloud's outage filled every card and the Status sensor's list, and the one other
fault, which came later and so sorted last, was on none of them.

Never rolled up:
- one at critical (by its record, or escalated to it);
- one that is there with a bad reading;
- one already said by itself, until the integration's row is there to stand for it.

A roll-up can't outlast its cause: it needs the integration's row, or that integration
within SETTLE of failing or of recovering (system.py's timer), and is judged again as
each of those ends."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any, Protocol

from homeassistant.components import persistent_notification
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify

from .const import WITHDRAWN
from .kept import Kept
from .levels import INTEGRATION, failure_message

_LOGGER = logging.getLogger(__name__)
OWN = (INTEGRATION, "homeassistant.")  # Home Assistant's own rows' keys


class Fire(Protocol):
    def __call__(
        self,
        eid: str,
        row: dict[str, Any],
        previous: str | None,
        initial: bool = False,
        group: str | None = None,
    ) -> None: ...


class RollUp:
    def __init__(
        self,
        hass: HomeAssistant,
        kept: Kept,
        now: dict[str, dict[str, Any]],
        records: Callable[[], dict[str, dict[str, Any]]],
        fire: Fire,
        tell: Callable[[], None],
    ) -> None:
        self.hass, self.kept, self.now = hass, kept, now
        self._records, self._fire, self._tell = records, fire, tell
        self._rows: set[str] = set()  # Home Assistant's own, in `now`
        # Integrations failing or just recovered: what's new under one waits with it.
        self._settling: set[str] = set()
        self._under: dict[str, str] = {}  # sensor -> the integration it is under
        self._children: dict[str, set[str]] = {}  # and back
        # The unavailable ones that aren't nominal: all that a failure can move, so a
        # change of failures looks at these alone, never at every sensor watched.
        self._gone: set[str] = set()
        # The level last said of each, by itself; `_out`: those said so in this run.
        self._told = {k: r["told"] for k, r in kept.said.items() if r.get("told")}
        self._out: set[str] = set()
        self._groups: dict[
            str, set[str]
        ] = {}  # integration -> groups said for, this run
        self._found: set[str] = set()  # rows found as the page's settings changed

    def told(self, eid: str, row: dict[str, Any]) -> None:
        """An event was sent for it, by itself."""
        if row["level"] == "nominal":
            self._told.pop(eid, None)
            self._out.discard(eid)
            self.kept.forget(eid)
            return
        self._told[eid] = row["level"]
        self._out.add(eid)
        if row.get("gone") or eid.startswith(OWN):
            self.kept.note(eid, since=row["since"], told=row["level"])

    def said(self, key: str) -> bool:
        """Is it said, by itself, as things stand?"""
        return key in self._told

    def unsay(self, key: str, why: str) -> None:
        """What was said of it is taken back (it is snoozed): as never said, so that it
        is said afresh, to each group too, when it counts again."""
        if self._told.pop(key, None):
            self._withdraw(key, why)
        self._out.discard(key)
        self._found.discard(key)
        self._groups.pop(key, None)
        if key in self.kept.said:  # how long it has lasted is kept
            self.kept.note(key, told=None, groups=[])

    def say(self, key: str, initial: bool, message: str | None = None) -> None:
        """A row's event, unasked by any change in it (its snooze is over), and again
        for each group with sensors under it. `message`: said in place of its own."""
        row = self.now[key] | ({"message": message} if message else {})
        self._fire(key, row, None, initial)
        self._say_groups(key, row, initial)

    def place(self, eid: str, initial: bool = False) -> bool:
        """A sensor's row was set: put it under its failed integration, or take it out.
        True when that has said all there is to say, so the caller fires nothing."""
        row = self.now[eid]
        was, key = self._under.get(eid), self._parent(eid, row)
        before = self._told.get(eid)
        nominal = row["level"] == "nominal"

        if row.get("under") != key:
            if key:
                row["under"] = key
            else:
                row.pop("under")
            self.now[eid] = row  # changed in place: noted (watch._Rows)
        if nominal:
            self._told.pop(eid, None)
            self._out.discard(eid)
        if nominal or not row.get("gone"):
            self._gone.discard(eid)
            self.kept.forget(eid)  # seen there, so whatever it was is over
        else:
            self._gone.add(eid)
        if not key and not was:
            return False

        if key != was:
            if was:
                self._release(eid, was)
            if key:
                self._under[eid] = key
                self._children.setdefault(key, set()).add(eid)
                self._out.discard(eid)
                self.kept.note(eid, since=row["since"])
                if before:
                    self._withdraw(eid, "rolled up")
                _LOGGER.info("%s (%s): rolled up into %s", row["name"], eid, key)
        if key:
            self._recount(key)
            group = (self._records().get(eid) or {}).get("group")
            self._say_group(key, group, self.now.get(key) or {})
        else:
            self._out_of_it(eid, row, before, initial)
        self._tell()
        return True

    def left(self, eid: str, removed: bool) -> None:
        """A sensor with no row now: no longer watched, or no opinion of it."""
        self._gone.discard(eid)
        if was := self._under.get(eid):
            self._release(eid, was)
        if removed:
            if self._told.pop(eid, None):
                self._withdraw(eid, "no longer watched")
            self._out.discard(eid)
            self.kept.forget(eid)

    def prune(self, records: dict[str, Any]) -> None:
        """Given every record: forget what is kept of sensors no longer watched."""
        for key in list(self.kept.said):
            if key not in records and not key.startswith(OWN):
                self.left(key, removed=True)

    def apply(
        self,
        rows: dict[str, dict[str, Any]],
        settling: set[str],
        loaded: dict[str, dict[str, Any]],
        found: bool,
    ) -> None:
        """Home Assistant's own health, as now (system.py). `loaded`: the failures proved
        over. `found`: asked because the page's settings changed, so nothing here is a
        change in the house."""
        was = (self._rows, self._settling)
        ended = self._rows - set(rows)
        for key in ended:
            self.now.pop(key)
        said = {k for k in self._told if k.startswith(OWN)}
        over = (ended | said) - set(rows)

        news, moved = [], bool(over)
        for key, row in rows.items():
            old, level = self.now.get(key), row["level"]
            kept = self.kept.said.get(key, {})
            since = (
                row.get("since")
                or (old and old["level"] == level and old["since"])
                or (kept.get("told") == level and kept.get("since"))
                or dt_util.utcnow().isoformat()
            )
            new = row | {"since": since}
            if key.startswith(INTEGRATION):
                new["message"] = self._message(key)
            if new != old:
                self.now[key] = new
                moved = True
            if old and old["level"] == level:
                continue
            previous = old["level"] if old else None
            if not old and level == "nominal":
                if not (previous := self._told.get(key)):
                    continue  # as it should be: goes unsaid
            initial = not old and level != "nominal" and (found or key in self._told)
            if found and initial:
                self._found.add(key)
            news.append((key, previous, initial))
        self._rows, self._settling = set(rows), settling

        # The sensors move first, so an integration's event says how many it stands for.
        if found or was != (self._rows, self._settling):
            for eid in self._gone | set(self._under):
                if eid in self.now:  # not waiting out Refresh state
                    self.place(eid, found)
        for key in over:
            self._ended(key, loaded.get(key))
        for key, previous, initial in news:
            self._fire(key, self.now[key], previous, initial)
            self._say_groups(key, self.now[key])
        if moved:
            self._tell()

    def _parent(self, eid: str, row: dict[str, Any]) -> str | None:
        if not row.get("gone") or row["level"] in ("nominal", "critical"):
            return None
        entry = er.async_get(self.hass).async_get(eid)
        if entry is None or not entry.config_entry_id:
            return None
        key = f"{INTEGRATION}{entry.config_entry_id}"
        if key in self._rows or (key in self._settling and eid not in self._out):
            return key
        return None

    def _out_of_it(
        self, eid: str, row: dict[str, Any], before: str | None, initial: bool
    ) -> None:
        """Out of a roll-up: say where it is, from what was last said of it."""
        _LOGGER.info("%s (%s): no longer rolled up", row["name"], eid)
        if row["level"] == "nominal":
            if before:  # said before it was rolled up, so said to be back
                self._fire(eid, row, before)
        elif row["level"] == before:
            self._fire(eid, row, None, True)  # said already: the sidebar's, again
        else:
            self._fire(eid, row, before, initial)

    def _release(self, eid: str, key: str) -> None:
        self._under.pop(eid, None)
        self._children.get(key, set()).discard(eid)
        self._recount(key)

    def _message(self, key: str) -> str:
        failure = self.kept.failing[key.removeprefix(INTEGRATION)]
        return failure_message(failure, len(self._children.get(key, ())))

    def _recount(self, key: str) -> None:
        if key not in self._rows or key not in self.now:
            return
        row, message = self.now[key], self._message(key)
        if row["message"] != message:
            self.now[key] = row | {"message": message}

    def _say_groups(self, key: str, row: dict[str, Any], initial: bool = False) -> None:
        records = self._records()
        children = self._children.get(key, ())
        groups = {(records.get(eid) or {}).get("group") for eid in children}
        for group in sorted(g for g in groups if g):
            self._say_group(key, group, row, initial)

    def _say_group(
        self, key: str, group: str | None, row: dict[str, Any], initial: bool = False
    ) -> None:
        """An integration's event again for a group with sensors under it, so what
        follows one group (the blueprint, a device trigger) still hears of them. Once
        its own has been said, and once for each group."""
        if not group or key not in self._rows or key not in self._out:
            return
        said = self._groups.setdefault(key, set())
        if group in said:
            return
        said.add(group)
        before = set(self.kept.said.get(key, {}).get("groups", []))
        initial = initial or key in self._found or group in before
        self._fire(key, row, None, initial, group)
        self.kept.note(key, groups=sorted(before | said))

    def _ended(self, key: str, back: dict[str, Any] | None) -> None:
        """A row that went: back only on proof (loaded). Ignored, switched off, disabled
        or deleted is no longer watched, which is never said as good news."""
        groups = set(self.kept.said.get(key, {}).get("groups", []))
        previous = self._told.get(key)
        if back and previous:
            self._fire(key, back, previous)
            for group in sorted(groups):
                self._fire(key, back, previous, False, group)
        elif not back and previous:
            self._withdraw(key, "no longer watched")
        self._told.pop(key, None)
        self._out.discard(key)
        self._found.discard(key)
        self._groups.pop(key, None)
        self.kept.forget(key)

    def _withdraw(self, key: str, why: str) -> None:
        """What was said of it no longer stands, and it isn't back to nominal: its
        notification goes, whoever keeps the events is told, and nothing is claimed."""
        # The blueprint's id for it (blueprints/notify.yaml notification_id).
        persistent_notification.async_dismiss(self.hass, f"sensor_watch_{slugify(key)}")
        self.hass.bus.async_fire(WITHDRAWN, {"entity_id": key, "reason": why})
        _LOGGER.info("%s: withdrawn (%s), not said to be back", key, why)
