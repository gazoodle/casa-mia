import json

import pytest

from casa_mia.modules.people import People, normalise, plate_key


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
        {"name": "Kim"},
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
