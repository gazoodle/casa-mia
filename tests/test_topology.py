"""Topology's model (casa_mia/topology/model.py), which needs no Home Assistant, against
its contract in tests/topology_cases.json."""

import json
from pathlib import Path

import pytest

from conftest import load_component_file

model = load_component_file("casa_mia", "topology/model")
CASES = json.loads(Path(__file__).with_name("topology_cases.json").read_text())
AREAS = CASES["registry"]["areas"]
FLOORS = set(CASES["registry"]["floors"])


@pytest.mark.parametrize(("text", "kept"), CASES["directions"].items())
def test_a_direction_is_read_however_it_is_written(text, kept):
    assert model.direction(text) == kept


@pytest.mark.parametrize("text", CASES["not_directions"])
def test_anything_else_is_refused_and_named(text):
    with pytest.raises(ValueError, match=repr(text)):
        model.direction(text)


@pytest.mark.parametrize(("way", "back"), CASES["opposites"].items())
def test_the_way_back_is_half_way_round(way, back):
    assert model.opposite(way) == back


def test_every_point_has_an_opposite_that_leads_back():
    assert all(model.opposite(model.opposite(w)) == w for w in model.DIRECTIONS)


def test_the_feed_is_the_contract():
    assert model.view(CASES["record"], 7, AREAS, FLOORS) == CASES["view"]


def test_an_empty_topology_is_normal():
    empty = {"sites": [], "buildings": [], "connections": []}
    assert model.check(empty, AREAS, FLOORS) == empty
    assert model.view(empty, 0, AREAS, FLOORS) == {
        "rev": 0, "sites": [], "buildings": [], "exits": {}, "broken": []
    }  # fmt: skip


def test_a_save_keeps_directions_in_their_one_form():
    saved = model.check(
        {
            "sites": [],
            "buildings": [],
            "connections": [
                {"a": "hall", "b": "parlour", "way": "North-East"},
                {"a": "kitchen", "b": "scullery", "way": "e", "back": "S/S/W"},
                {"a": "hall", "b": "garden", "way": "", "back": None},
            ],
        },
        AREAS,
        FLOORS,
    )
    assert [(c["way"], c["back"]) for c in saved["connections"]] == [
        ("ne", None), ("e", "ssw"), (None, None)
    ]  # fmt: skip


def test_a_save_is_refused_with_every_reason():
    record = {
        "sites": [{"id": "home", "name": "Home"}, {"id": "home", "name": "Again"}],
        "buildings": [
            {"id": "house", "name": "House", "site": "farm", "floors": ["ground", "loft"], "areas": []},
            {"id": "barn", "name": "Barn", "site": None, "floors": ["ground"], "areas": ["hall", "garden"]},
            {"id": "shed", "name": "Shed", "site": None, "floors": [], "areas": ["garden"]},
        ],
        "connections": [
            {"a": "hall", "b": "hall", "way": "n"},
            {"a": "hall", "b": "parlour", "way": "sideways"},
            {"a": "parlour", "b": "hall", "way": "s"},
            {"a": "hall", "b": "attic", "way": None},
        ],
    }  # fmt: skip
    with pytest.raises(model.Invalid) as refused:
        model.check(record, AREAS, FLOORS)
    assert refused.value.problems == [
        "two sites are 'home'",
        "building 'house': no site 'farm'",
        "building 'house': no floor 'loft'",
        "'ground' is in 'house' and 'barn'",
        "building 'barn': 'hall' is on a floor",
        "'garden' is in 'barn' and 'shed'",
        "hall to hall: an area joined to itself",
        "hall to parlour: not a direction: 'sideways'",
        "parlour to hall: joined twice",
        "hall to attic: no area 'attic'",
    ]


def test_what_was_saved_gives_the_same_feed():
    """A record that check() accepts is what view() is given: nothing is lost between."""
    record = {k: CASES["record"][k] for k in ("sites", "connections")} | {
        "buildings": [{**b, "floors": [f for f in b["floors"] if f in FLOORS]} for b in CASES["record"]["buildings"][:2]]
    }  # fmt: skip
    record["connections"] = [c for c in record["connections"] if c["b"] in AREAS]
    saved = model.check(record, AREAS, FLOORS)
    assert model.view(saved, 1, AREAS, FLOORS)["exits"] == CASES["view"]["exits"]
