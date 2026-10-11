"""Band profiles: say a range once for many sensors. A profile is a named set of levels
(bands, on/off, or exact states, with what unavailable counts as and the hold-off);
a record that follows one keeps only its entity and name. The integration is sent each
record resolved (resolve()), so it never sees a profile: editing one moves the
revision, and every follower changes with it.

Profiles are shared as JSON (export(), merge()): the file a page exports, or the
library shipped beside this module (library.json: profiles for common things, each
with what it's about and its source)."""

from __future__ import annotations

import json
import secrets
from pathlib import Path
from typing import Any

from .common import MAX_TEXT, BadRequest, clean

# What a sensor of each kind may follow: a number can be watched by bands or by exact
# states; on/off and exact states only as themselves.
# Anything may be watched for being there at all (available).
FITS = {
    "numeric": ("numeric", "state", "available"),
    "binary": ("binary", "available"),
    "state": ("state", "available"),
}
# A profile's levels are checked as a record's are, for a stand-in entity.
STAND_IN = "profile.levels"
LIBRARY = Path(__file__).with_name("library.json")
FORMAT = "casa_mia.sensor_watch.profiles"  # marks an exported file


def clean_profile(body: dict[str, Any]) -> dict[str, Any]:
    """A profile's name and levels, or BadRequest saying what is wrong."""
    name = str(body.get("name") or "").strip()
    if not name or len(name) > MAX_TEXT:
        raise BadRequest(f"A profile needs a name (at most {MAX_TEXT} characters).")
    levels = clean(STAND_IN, body)
    del levels["entity_id"]
    levels.pop("attribute", None)  # a profile is levels; what's watched is the record's
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
        **({"group": record["group"]} if record.get("group") else {}),
        **({"attribute": record["attribute"]} if record.get("attribute") else {}),
        **({"disabled": True} if record.get("disabled") else {}),
    }


def follower(
    entity_id: str,
    name: str,
    profile: dict[str, Any],
    kind: str | None,
    attribute: str = "",
) -> dict[str, Any]:
    """A record that follows `profile`; `kind` (the sensor's own, or its `attribute`'s,
    when known) must fit."""
    if kind is not None and profile["kind"] not in FITS.get(kind, ()):
        raise BadRequest(
            f"{entity_id} is {kind}: it can't follow {profile['name']}, a {profile['kind']} profile."
        )
    if len(name) > MAX_TEXT:
        raise BadRequest(f"Name: at most {MAX_TEXT} characters.")
    record = {"entity_id": entity_id, "name": name, "profile": profile["id"]}
    return record | ({"attribute": attribute} if attribute else {})


def library() -> list[dict[str, Any]]:
    """The profiles shipped with Casa Mia, as the library file has them."""
    return json.loads(LIBRARY.read_text())["profiles"]


def export(profiles: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Every profile as a file to share (no ids: an import gives its own)."""
    return {
        "format": FORMAT,
        "version": 1,
        "profiles": [
            {k: v for k, v in p.items() if k != "id"}
            for p in sorted(profiles.values(), key=lambda p: p["name"].lower())
        ],
    }


def merge(
    incoming: Any, profiles: dict[str, dict[str, Any]]
) -> tuple[dict[str, dict[str, Any]], list[str], list[str]]:
    """The profiles after importing `incoming` (an exported file, or its list), each
    checked first: one named as a profile here replaces its levels (its followers
    follow), the rest are added. Returns them with the names added and replaced, or
    BadRequest naming the first that's wrong (nothing is taken then)."""
    items = incoming.get("profiles") if isinstance(incoming, dict) else incoming
    if not isinstance(items, list) or not items:
        raise BadRequest("Expected profiles to import.")
    out = {pid: dict(p) for pid, p in profiles.items()}
    named = {p["name"].lower(): pid for pid, p in out.items()}
    added: list[str] = []
    replaced: list[str] = []
    for n, item in enumerate(items, 1):
        if not isinstance(item, dict):
            raise BadRequest(f"Profile {n}: expected an object.")
        try:
            profile = clean_profile(item)
        except BadRequest as exc:
            raise BadRequest(f"Profile {n} ({item.get('name') or 'no name'}): {exc}")
        pid = named.get(profile["name"].lower())
        (replaced if pid else added).append(profile["name"])
        pid = pid or new_id(out)
        out[pid] = profile | {"id": pid}
        named[profile["name"].lower()] = pid
    return out, added, replaced
