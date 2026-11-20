"""people: everyone known to the home, and the admin API (/api/people/) to edit them.

The store is `people.json` in the app's config folder (the master copy, edited on the
admin page). Each person has at most one phone number, kept in international form
(+44...), and whether they may call and whether they may text. The FONA reports callers
as 07... and texters as +447...; both are normalised the same way before matching, so
each person needs only the one number. A person can also have number plates, and whether
they open the gates (the integration's check_plate service asks). A person can be
linked to an HA person, and needs a number, a plate or that link.

For messages that fit the person, each can have a gender, pronouns and a date of birth,
all optional; the integration's people service hands them out. The forms follow
standards rather than inventing one:

- gender: female, male or other (FHIR's AdministrativeGender; unset is unknown).
- pronouns: all five forms a sentence needs, she/her/her/hers/herself (subject, object,
  possessive determiner, possessive pronoun, reflexive). Unset is they/them, never a
  guess from the gender.
- born: ISO 8601 with reduced precision, as FHIR's birthDate: 1984 or 1984-03-07; or
  vCard's --03-07 (RFC 6350 BDAY), a birthday with no year.
"""

from __future__ import annotations

import json
import logging
import re
import secrets
import threading
from collections.abc import Callable
from datetime import date
from pathlib import Path
from typing import Any

from ..ha import HA, HAError

_LOGGER = logging.getLogger(__name__)
# Fired with no data after every saved change to the list: whoever draws or words by it
# (Dash-Bored's household feed) asks the People action again. Push, not poll (RULE FOUR).
CHANGED_EVENT = "casa_mia_people_changed"

COUNTRY = "44"  # numbers starting 0 are UK numbers
KINDS = ("call", "text")
MAX_NAME = 60
GENDERS = ("female", "male", "other")
FORMS = ("subject", "object", "determiner", "possessive", "reflexive")
THEY = "they/them/their/theirs/themselves"
# 1984, 1984-03-07 or --03-07: the year (or "-" for none), then the month and day.
BORN = re.compile(r"(\d{4}|-)(?:-(\d\d)-(\d\d))?")
# A letter of any alphabet, and words such as xe's or e-m.
WORD = re.compile(r"[^\W\d_]+(?:['-][^\W\d_]+)*")

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


# Cameras misread these, so a plate matches with each pair taken as the same character.
LOOK_ALIKE = str.maketrans("OIS", "015")


def plate_key(raw: str | None) -> str:
    """A plate as it is compared: capitals and digits only, look-alikes folded.
    "zz00 zzz", "ZZ00-ZZZ" and "ZZOO ZZZ" all give ZZ00ZZZ."""
    return re.sub(r"[^A-Z0-9]", "", (raw or "").upper()).translate(LOOK_ALIKE)


def plates(raw: Any) -> list[str]:
    """The plates as typed (capitals, single spaces), each checked."""
    if not isinstance(raw, list):
        raise BadRequest("plates must be a list.")
    out: list[str] = []
    for typed in raw:
        plate = " ".join(str(typed).upper().split())
        if (
            not re.fullmatch(r"[A-Z0-9 \-]+", plate)
            or not 2 <= len(plate_key(plate)) <= 10
        ):
            raise BadRequest(f"{plate or 'An empty plate'} is not a number plate.")
        if any(plate_key(p) == plate_key(plate) for p in out):
            raise BadRequest(f"{plate} is in the list twice.")
        out.append(plate)
    return out


def pronouns(raw: Any) -> str | None:
    """The five forms in lower case, she/her/her/hers/herself, or None when unset."""
    if not raw:
        return None
    forms = [f.strip().lower() for f in str(raw).split("/")]
    if len(forms) != len(FORMS) or not all(
        WORD.fullmatch(f) and len(f) <= 20 for f in forms
    ):
        raise BadRequest("Pronouns need all five forms, as she/her/her/hers/herself.")
    return "/".join(forms)


def _parts(born: str) -> tuple[int | None, int | None, int | None]:
    """The year, month and day of a stored date of birth; None for each part unknown."""
    m = BORN.fullmatch(born)
    if m is None or (m[1] == "-" and not m[2]):
        raise ValueError(born)
    year = None if m[1] == "-" else int(m[1])
    return year, int(m[2]) if m[2] else None, int(m[3]) if m[3] else None


def born(raw: Any, today: date) -> str | None:
    """A date of birth as stored (1984, 1984-03-07 or --03-07), or None when unset."""
    if not raw:
        return None
    try:
        year, month, day = _parts(str(raw))
        # 2000 for a birthday with no year: a leap year, so 29 February passes.
        when = date(year or 2000, month or 1, day or 1)
    except ValueError:
        raise BadRequest(
            f"{raw} is not a date of birth. Give the year, the day and month, or all three."
        ) from None
    if year is not None and not (1900 <= year and when <= today):
        raise BadRequest(
            f"{raw} is not a date of birth: it is too long ago or to come."
        )
    return str(raw)


def _birthday(year: int, month: int, day: int) -> date:
    """The birthday in a given year; 29 February falls on 1 March in other years."""
    try:
        return date(year, month, day)
    except ValueError:
        return date(year, 3, 1)


def about(person: dict[str, Any], today: date) -> dict[str, Any]:
    """What a message needs to know about a person (no number or plates), for the
    integration's people service. With only the year of birth, `age` is the age they
    reach this year; `days_to_birthday` is 0 on the day, None with no day and month."""
    forms = (person.get("pronouns") or THEY).split("/")
    year, month, day = _parts(person["born"]) if person.get("born") else (None,) * 3

    # The next birthday, today's included, and whether this year's is still to come.
    to_come = False
    days = None
    if month and day:
        birthday = _birthday(today.year, month, day)
        to_come = birthday > today
        if birthday < today:
            birthday = _birthday(today.year + 1, month, day)
        days = (birthday - today).days

    return {
        "name": person["name"],
        "person": person.get("person"),
        "gender": person.get("gender"),
        "pronouns": {**dict(zip(FORMS, forms)), "plural": forms[0] == "they"},
        "born": person.get("born"),
        "age": None if year is None else today.year - year - to_come,
        "days_to_birthday": days,
    }


class People:
    def __init__(
        self,
        store_path: Path,
        ha: HA | None = None,
        on_change: Callable[[], None] = lambda: None,
    ) -> None:
        self.store_path = store_path
        self.ha = ha
        self.on_change = (
            on_change  # after each saved change: __main__ fires CHANGED_EVENT
        )
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
                "gates": sum(1 for p in self.people if p.get("gate")),
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

    def check_plate(self, plate: str | None) -> dict[str, Any]:
        """May the car with this plate open the gates? For check_plate in Home Assistant,
        so each reading is logged, as each call and text is."""
        key = plate_key(plate)
        with self._lock:
            person = next(
                (
                    p
                    for p in self.people
                    if key and any(plate_key(x) == key for x in p.get("plates", []))
                ),
                None,
            )

        if not key:
            answer = _plate(False, plate, None, "no plate read")
        elif person is None:
            answer = _plate(False, plate, None, "unknown plate")
        elif not person.get("gate"):
            answer = _plate(
                False, plate, person["name"], "not allowed to open the gates"
            )
        else:
            answer = _plate(True, plate, person["name"], None)
        _LOGGER.info(
            "plate %s: %s",
            plate,
            f"opens the gates for {answer['who']}"
            if answer["allowed"]
            else f"refused ({answer['reason']}{', ' + answer['who'] if answer['who'] else ''})",
        )
        return answer

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
        if method == "GET" and parts == ["plate"]:
            return _json(200, self.check_plate((query.get("plate") or [""])[0]))
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
            # People saved before plates (2026.10.12-b7) have none, and no gates; before
            # 2026.11.11-b4, no gender, pronouns or date of birth.
            unset = {"plates": [], "gate": False, "gender": None, "pronouns": None}
            return {
                "people": [{**unset, "born": None, **p} for p in people],
                "error": self._broken,
            }

    def about(self, person: str | None, today: date) -> dict[str, Any]:
        """Everyone's details for messages (see about()), or those linked to one HA
        person, for the integration's people service."""
        with self._lock:
            chosen = [
                p for p in self.people if person is None or p.get("person") == person
            ]
        return {
            "people": [
                about(p, today) for p in sorted(chosen, key=lambda p: p["name"].lower())
            ]
        }

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
        typed = str(body.get("phone") or "").strip()
        phone = normalise(typed)
        if typed and phone is None:
            raise BadRequest(
                "That is not a phone number. Type it as 07700 900123 or +44 7700 900123."
            )
        cars = plates(body.get("plates") or [])
        person = body.get("person") or None
        if person is not None and not isinstance(person, str):
            raise BadRequest("person must be an HA person id.")
        if phone is None and not cars and person is None:
            raise BadRequest(
                "A phone number, a number plate or a Home Assistant person is needed."
            )
        gender = body.get("gender") or None
        if gender is not None and gender not in GENDERS:
            raise BadRequest("gender must be female, male or other.")
        entry = {
            "name": name,
            "phone": phone,
            "call": bool(body.get("call")),
            "text": bool(body.get("text")),
            "plates": cars,
            "gate": bool(body.get("gate")),
            "person": person,
            "gender": gender,
            "pronouns": pronouns(body.get("pronouns")),
            "born": born(body.get("born"), date.today()),
        }

        with self._lock:
            if self._broken:
                raise BadRequest(
                    "people.json could not be read; fix or remove it first."
                )
            # One number and one plate, one person.
            for other in self.people:
                if other["id"] == person_id:
                    continue
                if phone and other.get("phone") == phone:
                    raise BadRequest(f"{phone} already belongs to {other['name']}.")
                theirs = {plate_key(x) for x in other.get("plates", [])}
                if taken := next((c for c in cars if plate_key(c) in theirs), None):
                    raise BadRequest(f"{taken} already belongs to {other['name']}.")
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
            "saved %s (calls %s, texts %s, %d plates, gates %s)",
            name,
            entry["call"],
            entry["text"],
            len(cars),
            entry["gate"],
        )
        return _json(status, self.view())

    def _commit(self) -> None:
        """Save atomically (caller holds the lock)."""
        tmp = self.store_path.with_name(self.store_path.name + ".tmp")
        self.store_path.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps({"people": self.people}, indent=2))
        tmp.replace(self.store_path)
        self.on_change()


def _answer(
    allowed: bool, number: str | None, who: str | None, reason: str | None
) -> dict[str, Any]:
    return {"allowed": allowed, "number": number, "who": who, "reason": reason}


def _plate(
    allowed: bool, plate: str | None, who: str | None, reason: str | None
) -> dict[str, Any]:
    return {"allowed": allowed, "plate": plate, "who": who, "reason": reason}


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()


Checker = Callable[[str | None, str], dict[str, Any]]
