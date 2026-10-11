"""Band profiles: say a range once for many sensors. A profile is a named set of levels
(bands, on/off, or exact states, with what unavailable counts as and the hold-off);
a record that follows one keeps only its entity and name. The integration is sent each
record resolved (resolve()), so it never sees a profile: editing one moves the
revision, and every follower changes with it."""

from __future__ import annotations

import secrets
from typing import Any

from .common import MAX_TEXT, BadRequest, clean

# What a sensor of each kind may follow: a number can be watched by bands or by exact
# states; on/off and exact states only as themselves.
FITS = {"numeric": ("numeric", "state"), "binary": ("binary",), "state": ("state",)}
# A profile's levels are checked as a record's are, for a stand-in entity.
STAND_IN = "profile.levels"


def clean_profile(body: dict[str, Any]) -> dict[str, Any]:
    """A profile's name and levels, or BadRequest saying what is wrong."""
    name = str(body.get("name") or "").strip()
    if not name or len(name) > MAX_TEXT:
        raise BadRequest(f"A profile needs a name (at most {MAX_TEXT} characters).")
    levels = clean(STAND_IN, body)
    del levels["entity_id"]
    return levels | {"name": name}


def new_id(profiles: dict[str, Any]) -> str:
    while (pid := secrets.token_hex(4)) in profiles:
        pass
    return pid


def resolve(
    record: dict[str, Any], profiles: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    """The record as the integration and the page use it: a follower gets its profile's
    levels (keeping its own entity, name and the profile's id); a lost profile leaves
    what the record still has."""
    profile = profiles.get(record.get("profile") or "")
    if profile is None:
        return record
    levels = {k: v for k, v in profile.items() if k not in ("id", "name")}
    return levels | {
        "entity_id": record["entity_id"],
        "name": record.get("name", ""),
        "profile": profile["id"],
    }


def follower(
    entity_id: str, name: str, profile: dict[str, Any], kind: str | None
) -> dict[str, Any]:
    """A record that follows `profile`; `kind` (the sensor's own, when known) must fit."""
    if kind is not None and profile["kind"] not in FITS.get(kind, ()):
        raise BadRequest(
            f"{entity_id} is {kind}: it can't follow {profile['name']}, a {profile['kind']} profile."
        )
    if len(name) > MAX_TEXT:
        raise BadRequest(f"Name: at most {MAX_TEXT} characters.")
    return {"entity_id": entity_id, "name": name, "profile": profile["id"]}
