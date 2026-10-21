"""The records as the app pushes them (its websocket command, APPLY): every record, or
only those changed and removed since a revision. Free of Home Assistant, so the tests
load it by path, as levels.py."""

from __future__ import annotations

from typing import Any

APPLY = "casa_mia/sensor_watch/apply"


def merged(
    have: dict[str, dict[str, Any]], revision: str | None, msg: dict[str, Any]
) -> dict[str, dict[str, Any]] | None:
    """The records once `msg` is applied to those we `have` (at `revision`): its records
    alone without a `base`; else ours with its changes, or None when its base isn't our
    revision (a push missed, or ours fetched since), for the app to send them all."""
    sent = {r["entity_id"]: r for r in msg["records"]}
    if "base" not in msg:
        return sent
    if msg["base"] != revision:
        return None
    removed = set(msg.get("removed") or ())
    return {e: r for e, r in have.items() if e not in removed} | sent
