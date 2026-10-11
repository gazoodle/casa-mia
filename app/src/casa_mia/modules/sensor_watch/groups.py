"""Sensor groups that keep themselves up to date: a group is a saved set of filters (the
scan's: domain, area, label, integration, device, device class, kind, search) and a
profile, or DEFAULTS: each member set up by what it is (defaults.py: a cover closed, a
lock locked, a leak critical), passing over those with no default. Everything matching is watched, following the profile; whatever matches later
(a new plug) joins by itself, checked each minute; a member stopped by hand is
remembered (`left`) and never pulled back. Deleting a group keeps its members watched."""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

from ...ha import HAError
from .common import MAX_TEXT, BadRequest, Response, _json, clean
from .defaults import default_record
from .profiles import FITS, follower, new_id
from .scans import FILTERS, Scanner, matches

_LOGGER = logging.getLogger(__name__)

SYNC = 60.0  # seconds between looking for new members (a backstop: see nudge)
# Seconds after HA's registry changes (a new entity, a label added) before looking: its
# state follows its registry entry, and an integration adding many sends many.
SETTLE = 2.0
DEFAULTS = "defaults"  # a group's "profile": each member by what it is


def clean_group(body: dict[str, Any], profiles: dict[str, Any]) -> dict[str, Any]:
    """A group's name, filters, profile and those left out (unticked in its preview, or
    stopped by hand), or BadRequest saying what is wrong."""
    name = str(body.get("name") or "").strip()
    if not name or len(name) > MAX_TEXT:
        raise BadRequest(f"A group needs a name (at most {MAX_TEXT} characters).")
    raw = body.get("filters")
    if not isinstance(raw, dict):
        raise BadRequest("A group needs its filters.")
    filters = {k: str(v).strip() for k, v in raw.items() if k in FILTERS and v}
    if not filters:
        raise BadRequest("A group needs at least one filter, or it takes everything.")
    if body.get("profile") not in profiles and body.get("profile") != DEFAULTS:
        raise BadRequest(
            "A group needs a profile for its members to follow, or the defaults."
        )
    left = body.get("left") or []
    if not isinstance(left, list) or not all(isinstance(e, str) for e in left):
        raise BadRequest("left: the entity ids to leave out.")
    return {
        "name": name,
        "filters": filters,
        "profile": body["profile"],
        "left": sorted(set(left)),
    }


def member(
    c: dict[str, Any], group: dict[str, Any], profiles: dict[str, Any]
) -> dict[str, Any] | None:
    """Candidate `c`'s record as a member of `group`: following its profile, or set up by
    what it is; None when the group can't take it (another kind, or no default)."""
    eid = c["entity_id"]
    if group["profile"] == DEFAULTS:
        found = default_record(c)
        return found and clean(eid, found) | {"group": group["id"]}
    profile = profiles.get(group["profile"])
    if profile is None or profile["kind"] not in FITS.get(c["kind"], ()):
        return None
    return follower(eid, "", profile, None) | {"group": group["id"]}


class Grouper(Scanner):
    def start(self) -> None:
        super().start()
        self._nudged = threading.Event()
        if self.live:  # HA's entity registry changed: look now, not at the next sweep
            self.live.on_registry = self._nudged.set
        threading.Thread(
            target=self._keep, name="sensor-watch-groups", daemon=True
        ).start()

    def _keep(self) -> None:
        # ponytail: runs for the app's life, as the module does
        while True:
            if self._nudged.wait(SYNC):
                time.sleep(SETTLE)  # let the rest come, and the new entity's state
                self._nudged.clear()
                if self.reader:
                    self.reader.forget()  # read HA's entities afresh
                _LOGGER.debug("groups: HA's registry changed; looking for new members")
            try:
                self.sync()
            except (HAError, BadRequest) as exc:
                _LOGGER.warning("groups: could not look for new members: %s", exc)

    def sync(self, only: str | None = None) -> int:
        """Watch whatever matches a group (or just group `only`) and isn't watched or left
        out, following its profile; how many joined. Sensors its profile doesn't fit are
        passed over."""
        if self.reader is None:
            return 0
        with self._lock:
            groups = [g for g in self.groups.values() if only in (None, g["id"])]
            watched = set(self.records)
            profiles = dict(self.profiles)
        if not groups:
            return 0
        every = self.reader.candidates()
        joins: dict[str, dict[str, Any]] = {}
        for g in groups:
            left = set(g.get("left") or [])
            for c in every:
                eid = c["entity_id"]
                if eid in watched or eid in joins or eid in left:
                    continue
                if not matches(c, g["filters"]):
                    continue
                if (record := member(c, g, profiles)) is not None:
                    joins[eid] = record
        if joins:
            names = {g["id"]: g["name"] for g in groups}
            by_group: dict[str, list[str]] = {}
            for eid, r in joins.items():
                by_group.setdefault(names[r["group"]], []).append(eid)
            what = "; ".join(
                f"group {n}: {len(ids)} joined ({', '.join(ids)})"
                for n, ids in by_group.items()
            )
            self._save(joins, what)
        return len(joins)

    def leaving(self, entity_ids: list[str]) -> dict[str, dict[str, Any]] | None:
        """The groups after these members are stopped by hand (remembered as left, so
        they aren't pulled back), or None when none of them was in a group."""
        with self._lock:
            groups = {k: dict(g) for k, g in self.groups.items()}
            gids = {e: (self.records.get(e) or {}).get("group") for e in entity_ids}
        changed = False
        for eid, gid in gids.items():
            if gid in groups:
                groups[gid]["left"] = sorted({*groups[gid].get("left", []), eid})
                changed = True
        return groups if changed else None

    def _groups(self, method: str, parts: list[str], body: dict[str, Any]) -> Response:
        """POST groups (a new one; its members join at once); PUT groups/<id> (its name,
        filters or profile); POST groups/<id>/readmit (let those left out back in);
        DELETE groups/<id> (its members stay watched, as they are)."""
        with self._lock:
            groups = {k: dict(g) for k, g in self.groups.items()}
            profiles = dict(self.profiles)
            records = dict(self.records)
        if method == "POST" and parts == []:
            group = clean_group(body, profiles) | {"id": new_id(groups)}
            groups[group["id"]] = group
            self._save(
                {}, f"new group {group['name']}: {group['filters']}", groups=groups
            )
            joined = self.sync(group["id"])
            return _json(201, self.view() | {"created": group["id"], "joined": joined})
        group = groups.get(parts[0]) if parts else None
        if group is None:
            return _json(404, {"error": "No such group."})
        members = [r for r in records.values() if r.get("group") == group["id"]]
        if method == "PUT" and len(parts) == 1:
            changed = clean_group(body, profiles)
            groups[group["id"]] = group | changed
            # Members that follow the group's profile follow its new one; those it no
            # longer takes (its filters narrowed, or left out) stop being watched.
            known = self._known()
            out = {
                r["entity_id"]
                for r in members
                if r["entity_id"] in changed["left"]
                or (
                    r["entity_id"] in known
                    and not matches(known[r["entity_id"]], changed["filters"])
                )
            }
            # (A member set up by the defaults has no profile of its own.)
            was = group["profile"] if group["profile"] != DEFAULTS else None
            moved: dict[str, dict[str, Any] | None] = {}
            if changed["profile"] != group["profile"]:
                for r in members:
                    eid = r["entity_id"]
                    if r.get("profile") != was or eid in out or eid not in known:
                        continue
                    new = member(known[eid], groups[group["id"]], profiles)
                    if new is None:
                        out.add(eid)  # the new profile doesn't fit it
                    else:
                        moved[eid] = new | {
                            "name": r.get("name", ""),
                            **({"disabled": True} if r.get("disabled") else {}),
                        }
            moved |= dict.fromkeys(out)
            dropped = (
                f"; {len(out)} no longer in it ({', '.join(sorted(out))})"
                if out
                else ""
            )
            self._save(
                moved,
                f"group {changed['name']} saved: {changed['filters']}{dropped}",
                groups=groups,
            )
            joined = self.sync(group["id"])
            return _json(200, self.view() | {"joined": joined})
        if method == "POST" and parts[1:] == ["readmit"]:
            back = len(group.get("left") or [])
            groups[group["id"]] = group | {"left": []}
            self._save(
                {}, f"group {group['name']}: {back} left out let back in", groups=groups
            )
            joined = self.sync(group["id"])
            return _json(200, self.view() | {"joined": joined})
        if method == "DELETE" and len(parts) == 1:
            del groups[group["id"]]
            kept = {
                r["entity_id"]: {k: v for k, v in r.items() if k != "group"}
                for r in members
            }
            what = (
                f"group {group['name']} deleted; its {len(kept)} members stay watched"
            )
            self._save(kept, what, groups=groups)
            return _json(200, self.view())
        return _json(404, {"error": "Not found."})
