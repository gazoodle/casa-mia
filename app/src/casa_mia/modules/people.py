"""people: everyone known to the home, and the admin API (/api/people/) to edit them.

The store is `people.json` in the app's config folder (the master copy, edited on the
admin page). Each person has one phone number, kept in international form (+44...),
and whether they may call and whether they may text. The FONA reports callers as
07... and texters as +447...; both are normalised the same way before matching, so
each person needs only the one number. A person can be linked to an HA person.
"""

from __future__ import annotations

import json
import logging
import re
import secrets
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..ha import HA, HAError

_LOGGER = logging.getLogger(__name__)

COUNTRY = "44"  # numbers starting 0 are UK numbers
KINDS = ("call", "text")
MAX_NAME = 60

Response = tuple[int, str, bytes]


def normalise(raw: str | None, country: str = COUNTRY) -> str | None:
    """A phone number as +<country><number>, or None if it isn't one.
    07700 900123, +44 (0)7700 900123 and 00447700900123 all give +447700900123."""
    if not raw:
        return None
    s = re.sub(r"[\s\-().]", "", raw.replace("(0)", ""))
    if s.startswith("+"):
        digits = s[1:]
    elif s.startswith("00"):
        digits = s[2:]
    elif s.startswith("0"):
        digits = country + s[1:]
    else:
        digits = s
    if digits.startswith(
        country + "0"
    ):  # +44 07700...: the UK trunk 0 never follows +44
        digits = country + digits[len(country) + 1 :]
    if not digits.isdigit() or not 7 <= len(digits) <= 15:
        return None
    return "+" + digits


class BadRequest(Exception):
    pass


class People:
    def __init__(self, store_path: Path, ha: HA | None = None) -> None:
        self.store_path = store_path
        self.ha = ha
        self._lock = threading.Lock()
        self.people: list[dict[str, Any]] = []
        self._broken: str | None = None
        try:
            self.people = json.loads(store_path.read_text()).get("people", [])
        except FileNotFoundError:
            pass
        except (OSError, ValueError, AttributeError) as exc:
            # Never overwrite a store we could not read: refuse every number instead.
            _LOGGER.error("cannot read %s, nobody is authorised: %s", store_path, exc)
            self._broken = str(exc)

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "state": "offline" if self._broken else "running",
                "error": self._broken and f"cannot read people.json: {self._broken}",
                "people": len(self.people),
                "callers": sum(1 for p in self.people if p.get("call")),
                "texters": sum(1 for p in self.people if p.get("text")),
            }

    def check(self, number: str | None, kind: str) -> dict[str, Any]:
        """May this number call (kind "call") or text ("text")? The answer carries the
        normalised number, the person's name when known, and why when refused."""
        normal = normalise(number)
        if not number:
            return _answer(False, normal, None, "number withheld")
        if normal is None:
            return _answer(False, normal, None, f"not a phone number: {number}")
        with self._lock:
            person = next((p for p in self.people if p["phone"] == normal), None)
        if person is None:
            return _answer(False, normal, None, "unknown number")
        if not person.get(kind):
            verb = "call" if kind == "call" else "text"
            return _answer(False, normal, person["name"], f"not allowed to {verb}")
        return _answer(True, normal, person["name"], None)

    # -- the admin page's API

    def handle(
        self, method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> Response:
        try:
            payload = json.loads(body) if body else {}
            if not isinstance(payload, dict):
                raise BadRequest("Expected a JSON object.")
            parts = [p for p in path.strip("/").split("/") if p]
            return self._route(method, parts, query, payload)
        except BadRequest as exc:
            return _json(400, {"error": str(exc)})
        except ValueError:
            return _json(400, {"error": "Expected JSON."})

    def _route(
        self,
        method: str,
        parts: list[str],
        query: dict[str, list[str]],
        body: dict[str, Any],
    ) -> Response:
        if method == "GET" and parts == []:
            return _json(200, self.view())
        if method == "GET" and parts == ["persons"]:
            return self.persons()
        if method == "GET" and parts == ["check"]:
            number = (query.get("number") or [""])[0]
            return _json(200, {k: self.check(number, k) for k in KINDS})
        if method == "POST" and parts == []:
            return self._save(None, body)
        if len(parts) == 1 and method == "PUT":
            return self._save(parts[0], body)
        if len(parts) == 1 and method == "DELETE":
            with self._lock:
                before = len(self.people)
                self.people = [p for p in self.people if p["id"] != parts[0]]
                if len(self.people) == before:
                    return _json(404, {"error": "No such person."})
                self._commit()
            return _json(200, self.view())
        return _json(404, {"error": "Not found."})

    def view(self) -> dict[str, Any]:
        with self._lock:
            people = sorted(self.people, key=lambda p: p["name"].lower())
            return {"people": [dict(p) for p in people], "error": self._broken}

    def persons(self) -> Response:
        """HA's people (Settings > People), to link to; an error if HA can't be asked."""
        if self.ha is None:
            return _json(
                200, {"persons": [], "error": "Home Assistant is not reachable."}
            )
        try:
            return _json(200, {"persons": self.ha.persons(), "error": None})
        except HAError as exc:
            return _json(200, {"persons": [], "error": str(exc)})

    def _save(self, person_id: str | None, body: dict[str, Any]) -> Response:
        name = str(body.get("name") or "").strip()
        if not name or len(name) > MAX_NAME:
            raise BadRequest(f"A name is needed (at most {MAX_NAME} characters).")
        phone = normalise(str(body.get("phone") or ""))
        if phone is None:
            raise BadRequest(
                "That is not a phone number. Type it as 07700 900123 or +44 7700 900123."
            )
        person = body.get("person") or None
        if person is not None and not isinstance(person, str):
            raise BadRequest("person must be an HA person id.")
        entry = {
            "name": name,
            "phone": phone,
            "call": bool(body.get("call")),
            "text": bool(body.get("text")),
            "person": person,
        }
        with self._lock:
            if self._broken:
                raise BadRequest(
                    "people.json could not be read; fix or remove it first."
                )
            clash = next(
                (
                    p
                    for p in self.people
                    if p["phone"] == phone and p["id"] != person_id
                ),
                None,
            )
            if clash:
                raise BadRequest(f"{phone} already belongs to {clash['name']}.")
            if person_id is None:
                entry["id"] = secrets.token_hex(4)
                self.people.append(entry)
                status = 201
            else:
                current = next((p for p in self.people if p["id"] == person_id), None)
                if current is None:
                    return _json(404, {"error": "No such person."})
                current.update(entry)
                status = 200
            self._commit()
        _LOGGER.info(
            "saved %s (calls %s, texts %s)", name, entry["call"], entry["text"]
        )
        return _json(status, self.view())

    def _commit(self) -> None:
        """Save atomically (caller holds the lock)."""
        tmp = self.store_path.with_name(self.store_path.name + ".tmp")
        self.store_path.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps({"people": self.people}, indent=2))
        tmp.replace(self.store_path)


def _answer(
    allowed: bool, number: str | None, who: str | None, reason: str | None
) -> dict[str, Any]:
    return {"allowed": allowed, "number": number, "who": who, "reason": reason}


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()


Checker = Callable[[str | None, str], dict[str, Any]]
