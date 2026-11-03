"""The Swap page's API (/api/swap/), developer mode only. The server passes it the raw
request and answer, never swapped: its rules hold the real strings.

GET "" the swap ({"on", "rules"}); PUT "" a change to either, checked whole (a regex must
compile here; the page checks it compiles in the browser too); PUT "draft" a rule being
written ({"draft": rule or null}), handed to Home Assistant at once for every browser to
preview. A draft is never saved, and never logged: it carries real strings."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from .. import settings
from ..ha import HA, HAError
from . import document, engine, new_id, save

_LOGGER = logging.getLogger(__name__)

DRAFT = "casa_mia/swap/draft"  # the integration's websocket command
Response = tuple[int, str, bytes]


def _json(status: int, data: dict) -> Response:
    return status, "application/json", json.dumps(data).encode()


def _rule(found: Any, n: int) -> dict[str, Any]:
    """A rule as saved, or ValueError saying what is wrong with rule `n`."""
    if not isinstance(found, dict):
        raise ValueError(f"Rule {n} isn't a rule.")
    rule = {
        "id": found.get("id") or new_id(),
        "match": found.get("match"),
        "replace": found.get("replace", ""),
        "mode": found.get("mode", "exact"),
        "enabled": found.get("enabled", True),
    }
    if not all(isinstance(rule[k], str) for k in ("id", "match", "replace")):
        raise ValueError(f"Rule {n}: match and replace must be text.")
    if not isinstance(rule["enabled"], bool):
        raise ValueError(f"Rule {n}: enabled must be true or false.")
    try:
        engine.pattern(rule)
    except re.error as exc:
        raise ValueError(f"Rule {n}: {exc}.") from exc
    return rule


def _save(body: bytes) -> Response:
    try:
        change = json.loads(body or b"{}")
        if not isinstance(change, dict):
            raise ValueError("Not a change.")
        doc = document()
        if "on" in change:
            if not isinstance(change["on"], bool):
                raise ValueError("on must be true or false.")
            doc["on"] = change["on"]
        if "rules" in change:
            if not isinstance(change["rules"], list):
                raise ValueError("rules must be a list.")
            doc["rules"] = [_rule(r, n) for n, r in enumerate(change["rules"], 1)]
    except ValueError as exc:
        return _json(400, {"error": str(exc)})
    save(doc)
    _LOGGER.info(
        "screenshot swap saved: %s, %d rules",
        "on" if doc["on"] else "off",
        len(doc["rules"]),
    )
    return _json(200, {"on": doc["on"], "rules": doc["rules"]})


class SwapApi:
    def __init__(self, ha: HA) -> None:
        self.ha = ha

    def _draft(self, body: bytes) -> Response:
        try:
            draft = json.loads(body or b"{}").get("draft")
        except (ValueError, AttributeError):
            return _json(400, {"error": "Not a draft."})
        try:
            self.ha.call(
                {"type": DRAFT, "draft": draft if isinstance(draft, dict) else None}
            )
        except HAError as exc:
            _LOGGER.warning(
                "screenshot swap: the draft didn't reach Home Assistant: %s", exc
            )
            return _json(
                502, {"error": f"The preview didn't reach Home Assistant: {exc}"}
            )
        return _json(200, {})

    def handle(self, method: str, rest: str, query: dict, body: bytes) -> Response:
        if not settings.DEVELOPER:
            return _json(404, {"error": "The swap is in developer mode only."})
        rest = rest.strip("/")
        if method == "GET" and rest == "":
            doc = document()
            return _json(200, {"on": doc["on"], "rules": doc["rules"]})
        if method == "PUT" and rest == "":
            return _save(body)
        if method == "PUT" and rest == "draft":
            return self._draft(body)
        return _json(404, {"error": "Unknown request."})
