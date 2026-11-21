import json
from datetime import date

import pytest

from casa_mia.modules.people import (
    People,
    about,
    next_birthday,
    normalise,
    plate_key,
)


@pytest.mark.parametrize(
    ("raw", "normal"),
    [
        ("07700 900123", "+447700900123"),
        ("07700900123", "+447700900123"),
        ("+44 7700 900123", "+447700900123"),
        ("+44 (0)7700-900123", "+447700900123"),
        ("+44 07700 900123", "+447700900123"),
        ("00447700900123", "+447700900123"),
        ("447700900123", "+447700900123"),
        ("+33 6 12 34 56 78", "+33612345678"),
        ("", None),
        (None, None),
        ("Vodafone", None),
        ("123", None),
    ],
)
def test_normalise(raw, normal):
    assert normalise(raw) == normal


def make(tmp_path, people=None):
    store = tmp_path / "people.json"
    if people is not None:
        store.write_text(json.dumps({"people": people}))
    return People(store), store


def call(p, method, path="", body=None, query=None):
    status, ctype, data = p.handle(
        method, path, query or {}, json.dumps(body).encode() if body else b""
    )
    assert ctype == "application/json"
    return status, json.loads(data)


def test_check_by_kind_and_format(tmp_path):
    p, _ = make(
        tmp_path,
        [
            {
                "id": "a",
                "name": "Alex",
                "phone": "+447700900123",
                "call": True,
                "text": True,
            },
            {
                "id": "b",
                "name": "Cleaner",
                "phone": "+447700900456",
                "call": True,
                "text": False,
            },
        ],
    )
    # The FONA reports callers as 07... and texters as +44...: both match the one entry.
    assert p.check("07700900123", "call") == {
        "allowed": True,
        "number": "+447700900123",
        "who": "Alex",
        "reason": None,
    }
    assert p.check("+447700900123", "text")["allowed"]
    refused = p.check("+447700900456", "text")
    assert not refused["allowed"] and refused["who"] == "Cleaner"
    assert refused["reason"] == "not allowed to text"
    assert p.check("07700900456", "call")["allowed"]
    assert p.check("07700900999", "call")["reason"] == "unknown number"
    assert p.check("", "call")["reason"] == "number withheld"
    assert p.check("Vodafone", "text")["reason"] == "not a phone number: Vodafone"


def test_api_add_edit_delete(tmp_path):
    p, store = make(tmp_path)
    status, view = call(
        p, "POST", "", {"name": "Alex", "phone": "07700 900123", "call": True}
    )
    assert status == 201
    (alex,) = view["people"]
    assert alex["phone"] == "+447700900123" and alex["call"] and not alex["text"]
    assert json.loads(store.read_text())["people"][0]["name"] == "Alex"

    status, view = call(p, "PUT", alex["id"], {**alex, "text": True})
    assert status == 200 and view["people"][0]["text"]
    assert p.check("+447700900123", "text")["allowed"]

    # One number, one person.
    status, err = call(p, "POST", "", {"name": "Sam", "phone": "+447700900123"})
    assert status == 400 and "already belongs to Alex" in err["error"]
    for bad in ({"name": "", "phone": "07700900124"}, {"name": "X", "phone": "nope"}):
        assert call(p, "POST", "", bad)[0] == 400

    status, both = call(p, "GET", "check", query={"number": ["07700900123"]})
    assert both["call"]["allowed"] and both["text"]["allowed"]

    assert call(p, "DELETE", alex["id"])[1]["people"] == []
    assert call(p, "DELETE", alex["id"])[0] == 404
    assert call(p, "GET", "nope/x")[0] == 404


@pytest.mark.parametrize(
    ("raw", "key"),
    [
        ("ZZ00 ZZZ", "ZZ00ZZZ"),
        ("zz00-zzz", "ZZ00ZZZ"),
        ("ZZOO ZZZ", "ZZ00ZZZ"),  # O read for 0
        ("ZI5 SIX", "Z1551X"),
        ("", ""),
        (None, ""),
    ],
)
def test_plate_key(raw, key):
    assert plate_key(raw) == key


def test_plates_and_gates(tmp_path):
    p, _ = make(tmp_path)
    # A person can be just a car: no phone number.
    status, view = call(
        p, "POST", "", {"name": "Alex", "plates": ["zz00  zzz"], "gate": True}
    )
    assert status == 201
    (alex,) = view["people"]
    assert alex["phone"] is None and alex["plates"] == ["ZZ00 ZZZ"]
    assert call(p, "POST", "", {"name": "Sam", "plates": ["ZZ51 ZZZ"]})[0] == 201

    assert p.check_plate("ZZ00ZZZ") == {
        "allowed": True,
        "plate": "ZZ00ZZZ",
        "who": "Alex",
        "reason": None,
    }
    assert p.check_plate("ZZOO ZZZ")["allowed"]  # misread, still Alex
    sam = p.check_plate("ZZ5I ZZZ")
    assert not sam["allowed"] and sam["who"] == "Sam"
    assert sam["reason"] == "not allowed to open the gates"
    assert p.check_plate("ZZ99 ZZZ")["reason"] == "unknown plate"
    assert p.check_plate("")["reason"] == "no plate read"
    assert call(p, "GET", "plate", query={"plate": ["ZZ00 ZZZ"]})[1]["allowed"]
    # A person without a number never matches a call.
    assert p.check("07700900123", "call")["reason"] == "unknown number"

    # One plate, one person; look-alikes count as the same plate.
    status, err = call(p, "POST", "", {"name": "Kim", "plates": ["ZZOO ZZZ"]})
    assert status == 400 and "already belongs to Alex" in err["error"]
    for bad in (
        {"name": "Kim"},  # no number, plate or HA person
        {"name": "Kim", "plates": ["!"]},
        {"name": "Kim", "plates": ["ZZ11 ZZZ", "zz11zzz"]},
        {"name": "Kim", "plates": "ZZ11 ZZZ"},
    ):
        assert call(p, "POST", "", bad)[0] == 400


def test_unreadable_store_refuses_everyone_and_is_kept(tmp_path):
    store = tmp_path / "people.json"
    store.write_text("{not json")
    p = People(store)
    assert p.health()["state"] == "offline"
    assert not p.check("07700900123", "call")["allowed"]
    assert call(p, "POST", "", {"name": "Alex", "phone": "07700900123"})[0] == 400
    assert store.read_text() == "{not json"


def test_persons_without_ha(tmp_path):
    p, _ = make(tmp_path)
    status, out = call(p, "GET", "persons")
    assert status == 200 and out["persons"] == [] and out["error"]


def test_gender_pronouns_and_birth_are_kept_and_checked(tmp_path):
    p, _ = make(tmp_path)
    # Someone with no number or car, known by their HA person.
    status, view = call(
        p,
        "POST",
        "",
        {
            "name": "Robin",
            "person": "robin1",
            "gender": "other",
            "pronouns": " Xe/Xem/Xyr/Xyrs/Xemself ",
            "born": "--02-29",
        },
    )
    assert status == 201
    (robin,) = view["people"]
    assert robin["pronouns"] == "xe/xem/xyr/xyrs/xemself"
    assert (robin["gender"], robin["born"]) == ("other", "--02-29")

    # Each optional; an entry from before them reads as unset.
    _, view = call(p, "PUT", robin["id"], {"name": "Robin", "person": "robin1"})
    assert {
        k: view["people"][0][k] for k in ("gender", "pronouns", "born")
    } == dict.fromkeys(("gender", "pronouns", "born"))

    for born in ("1984", "1984-03", "1984-03-07"):
        assert (
            call(p, "POST", "", {"name": born, "person": "x", "born": born})[0] == 201
        )
    for bad in (
        {"gender": "m"},
        {"pronouns": "she/her"},
        {"pronouns": "she/her/her/hers/her self"},
        {"born": "07/03/1984"},
        {"born": "1984-02-30"},
        {"born": "--13-01"},
        {"born": "-"},
        {"born": "--03"},  # a month alone
        {"born": "1984--07"},
        {"born": "1850"},
        {"born": "2999-01-01"},
    ):
        assert call(p, "POST", "", {"name": "Kim", "person": "k", **bad})[0] == 400, bad


TODAY = date(2026, 3, 7)


@pytest.mark.parametrize(
    ("born", "age", "days"),
    [
        (None, None, None),
        ("1984", 42, None),  # the age reached this year
        ("1984-03-07", 42, 0),  # the day itself
        ("1984-03-08", 41, 1),  # still to come
        ("1984-03-06", 42, 364),  # just gone
        ("--03-08", None, 1),
        ("1984-03", 42, None),  # the birth month: taken from its start
        ("1984-04", 41, None),
        ("2000-02-29", 26, 359),  # 1 March 2027, not a leap year
    ],
)
def test_about_age_and_birthday(born, age, days):
    got = about({"name": "Alex", "born": born}, TODAY)
    assert (got["age"], got["days_to_birthday"]) == (age, days)


def test_about_pronouns_default_to_they_and_the_query_picks_a_person(tmp_path):
    p, _ = make(
        tmp_path,
        [
            {"id": "a", "name": "Sam", "phone": None, "person": "sam1"},
            {
                "id": "b",
                "name": "Ann",
                "phone": "+447700900123",
                "person": None,
                "gender": "female",
                "pronouns": "she/her/her/hers/herself",
            },
        ],
    )
    everyone = p.about(None, TODAY)["people"]
    assert [x["name"] for x in everyone] == ["Ann", "Sam"]
    assert "phone" not in everyone[0]
    assert everyone[0]["pronouns"] == {
        "subject": "she",
        "object": "her",
        "determiner": "her",
        "possessive": "hers",
        "reflexive": "herself",
        "plural": False,
    }
    (sam,) = p.about("sam1", TODAY)["people"]
    assert sam["pronouns"]["subject"] == "they" and sam["pronouns"]["plural"]
    assert sam["gender"] is None
    assert p.about("nobody", TODAY) == {"people": []}


def test_every_saved_change_is_announced_and_a_refused_one_is_not(tmp_path):
    # Dash-Bored's household feed asks the People action again on CHANGED_EVENT.
    changes = []
    p = People(tmp_path / "people.json", on_change=lambda: changes.append(1))
    status, view = call(p, "POST", body={"name": "Alex", "phone": "07700 900123"})
    assert status == 201 and len(changes) == 1
    who = view["people"][0]["id"]
    assert call(p, "PUT", who, {"name": "Alex", "phone": "07700 900124"})[0] == 200
    assert call(p, "DELETE", who)[0] == 200
    assert len(changes) == 3
    assert call(p, "DELETE", who)[0] == 404
    assert len(changes) == 3


def test_next_birthday_for_the_tile():
    people = [
        {"name": "Sam", "born": "1990"},
        {"name": "Ann", "born": "--03-09"},
        {"name": "Alex", "born": "1984-03-09"},
        {"name": "Kim", "born": "2001-12-25"},
    ]
    assert next_birthday(people, TODAY) == {"who": ["Alex", "Ann"], "days": 2}
    assert next_birthday(people[:1], TODAY) is None


def test_the_list_carries_what_about_says_for_the_line_under_each_person(tmp_path):
    p, _ = make(
        tmp_path,
        [{"id": "a", "name": "Sam", "phone": None, "person": "s", "born": "1990"}],
    )
    (sam,) = p.view()["people"]
    assert sam["about"]["pronouns"]["subject"] == "they"
    assert sam["about"]["age"] == date.today().year - 1990
