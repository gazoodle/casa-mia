"""Dash-Bored's agent's column inside a real Home Assistant: which Katas a ZenOS-AI house's
cabinet gives, and the column a model writes from them, kept and fed to the pages.
ZenOS is not loaded: its cabinets are sensors set by hand, and the model is a fake
ai_task.generate_data."""

import asyncio

from custom_components.casa_mia_dash_bored import katas
from custom_components.casa_mia_dash_bored.const import COLUMN, DOMAIN
from homeassistant.core import SupportsResponse
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

AT = "2026-11-15T16:52:45+00:00"
LATER = "2026-11-15T17:07:45+00:00"


def kata(**over):
    value = {
        "subjective": None,
        "general_inference": None,
        "attention": None,
        "error": None,
        "urgency": 0,
        "confidence": 0.9,
        "watchlist": [],
    }
    return {"value": {**value, **over}, "timestamp": AT}


def whole(text="Home stable.", at=AT, **over):
    told = {"summary": text, "urgency": 1, "confidence": 0.9, "timestamp": at, **over}
    return {"value": {"zen_summary": told}, "timestamp": at}


# --- which Katas are told: the rules that were katas.ts's ---------------------------


def test_a_kata_that_says_something_is_a_piece_named_as_the_dojo_names_it():
    """The most urgent first. Bookkeeping, templates, Katas of nulls and ZenOS's
    accounts of itself are left out."""
    drawers = {
        "_label_index": {},
        "kata_template": {"value": {"structure": {"watchlist": []}, "example": {}}},
        "zen_scheduler": {"value": {"recent_runs": []}},
        "room_manager": kata(confidence=0),
        "security_manager": kata(
            general_inference="Several rooms have lights on.",
            attention="The garage door is open.",
            urgency=4,
            confidence=0.4,
        ),
        "zen_system": kata(subjective="The pipeline is healthy."),
        "trapper_keeper": kata(general_inference="No ambient katas."),
        "taskmaster": kata(subjective=" Nothing is due. "),
    }
    parts = {
        "security_manager": {
            "value": {"friendly_name": "Security", "pipeline_tier": "keeper"}
        },
        "trapper_keeper": {"value": {"pipeline_tier": "system"}},
    }
    told = katas.pieces(drawers, parts)
    assert [
        (p["part"], p["account"], p["attention"], p["urgency"], p["unsure"])
        for p in told
    ] == [
        (
            "Security",
            "Several rooms have lights on.",
            "The garage door is open.",
            4,
            True,
        ),
        ("Taskmaster", "Nothing is due.", None, 0, False),
    ]


def test_a_kata_with_only_its_reason_for_saying_nothing_is_told_as_that():
    (piece,) = katas.pieces({"locks": kata(error="No locks are labelled.")}, {})
    assert (piece["account"], piece["failed"]) == ("No locks are labelled.", True)


def test_the_whole_house_summary_with_its_errors():
    lead = katas.summary(
        {"zen_summary": whole(objective="Keep it so.", errors=["no snapshot", ""])}
    )
    assert (lead["summary"], lead["objective"], lead["errors"]) == (
        "Home stable.",
        "Keep it so.",
        ["no snapshot"],
    )
    assert katas.summary({"zen_summary": whole(text=None)}) is None


def test_a_reply_with_a_paper_missing_is_no_column():
    good = {"head": "All quiet", "body": "One.\n\nTwo.", "items": ["A", " ", "B"]}
    papers = katas.shaped({paper: good for paper in katas.PAPERS})
    assert papers["tabloid"] == {
        "head": "All quiet",
        "body": ["One.", "Two."],
        "items": ["A", "B"],
    }
    try:
        katas.shaped({"broadsheet": good, "tabloid": good, "rolling": {"head": "x"}})
    except ValueError as err:
        assert "rolling" in str(err)
    else:
        raise AssertionError("a reply with an empty paper was taken")


# --- the column, written and fed ------------------------------------------------------


class Model:
    """A fake ai_task.generate_data: each call is counted, and answers with the column
    (or raises `fails`) once `go` is set."""

    def __init__(self, hass):
        self.calls = []
        self.go = asyncio.Event()
        self.go.set()
        self.fails = None
        hass.services.async_register(
            "ai_task",
            "generate_data",
            self.answer,
            supports_response=SupportsResponse.ONLY,
        )

    async def answer(self, call):
        self.calls.append(call.data)
        await self.go.wait()
        if self.fails:
            raise self.fails
        column = {"head": "All quiet", "body": f"Call {len(self.calls)}.", "items": []}
        return {"data": {paper: column for paper in katas.PAPERS}}


async def zenos(hass, *, model="ai_task.local"):
    """An invented ZenOS house: its Kata cabinet, labelled as ZenOS labels it, the
    agent's name and the model it uses."""
    entities = er.async_get(hass)
    cabinet = entities.async_get_or_create("sensor", "test", "katas")
    entities.async_update_entity(cabinet.entity_id, labels={katas.KATAS})
    hass.states.async_set(katas.PERSONA, "Juniper")
    hass.states.async_set(katas.MODEL, model)
    return cabinet.entity_id


def fill(hass, cabinet, summary_at=AT, **drawers):
    hass.states.async_set(
        cabinet, "ok", {"variables": {"zen_summary": whole(at=summary_at), **drawers}}
    )


async def set_up(hass, **options):
    entry = MockConfigEntry(domain=DOMAIN, title="Dash-Bored", options=options)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def told(hass, hass_ws_client):
    """What a page is told of the column on subscribing, and its client."""
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": COLUMN})
    assert (await client.receive_json())["success"]
    return client, (await client.receive_json())["event"][0]


async def test_a_house_without_zenos_has_no_column_and_no_call(hass, hass_ws_client):
    model = Model(hass)
    await set_up(hass)
    _, now = await told(hass, hass_ws_client)
    assert now == {} and model.calls == []


async def test_one_column_per_new_summary_and_none_for_a_kata_alone(
    hass, hass_ws_client
):
    model = Model(hass)
    cabinet = await zenos(hass)
    await set_up(hass)
    fill(hass, cabinet, room=kata(subjective="The den is warm."))
    await hass.async_block_till_done()

    client, now = await told(hass, hass_ws_client)
    assert len(model.calls) == 1
    asked = model.calls[0]
    assert asked["entity_id"] == "ai_task.local" and set(asked["structure"]) == set(
        katas.PAPERS
    )
    assert "Juniper" in asked["instructions"]
    assert "The den is warm." in asked["instructions"]
    assert now["by"] == "Juniper" and now["late"] is None and now["writing"] is None
    assert now["papers"]["broadsheet"]["body"] == ["Call 1."]

    # A component's Kata alone starts nothing: the next summary takes it in.
    fill(hass, cabinet, room=kata(subjective="The den is cold."))
    await hass.async_block_till_done()
    assert len(model.calls) == 1

    fill(hass, cabinet, LATER)
    await hass.async_block_till_done()
    assert len(model.calls) == 2
    pushed = [(await client.receive_json())["event"][0] for _ in range(2)]
    assert pushed[0]["writing"] and pushed[1]["papers"]["rolling"]["body"] == [
        "Call 2."
    ]


async def test_a_newer_summary_drops_the_column_being_written(hass):
    model = Model(hass)
    model.go.clear()
    cabinet = await zenos(hass)
    await set_up(hass)
    fill(hass, cabinet)
    await hass.async_block_till_done(wait_background_tasks=False)
    fill(hass, cabinet, LATER)
    await asyncio.sleep(0)
    model.go.set()
    await hass.async_block_till_done()

    assert len(model.calls) == 2
    column = hass.data["casa_mia_dash_bored_column"]
    assert column.kept["papers"]["broadsheet"]["body"] == ["Call 2."]


async def test_a_failed_write_keeps_the_last_column_and_says_why(hass, hass_ws_client):
    model = Model(hass)
    cabinet = await zenos(hass)
    await set_up(hass)
    fill(hass, cabinet)
    await hass.async_block_till_done()

    model.fails = HomeAssistantError("Ollama is not answering")
    fill(hass, cabinet, LATER)
    await hass.async_block_till_done()
    _, now = await told(hass, hass_ws_client)
    assert now["papers"]["broadsheet"]["body"] == ["Call 1."]
    assert "Ollama is not answering" in now["late"]["reason"]


async def test_no_model_named_is_a_late_column_with_no_call(hass, hass_ws_client):
    model = Model(hass)
    cabinet = await zenos(hass, model="unknown")
    await set_up(hass)
    fill(hass, cabinet)
    await hass.async_block_till_done()
    _, now = await told(hass, hass_ws_client)
    assert model.calls == [] and now["papers"] is None
    assert katas.MODEL in now["late"]["reason"]


async def test_the_stored_column_is_served_after_a_restart_and_not_rewritten(
    hass, hass_ws_client, hass_storage
):
    stamp = katas.summary({"zen_summary": whole()})["at"]
    hass_storage[f"{DOMAIN}.column"] = {
        "version": 1,
        "key": f"{DOMAIN}.column",
        "data": {"at": stamp, "by": "Juniper", "papers": {"broadsheet": {}}},
    }
    model = Model(hass)
    cabinet = await zenos(hass)
    fill(hass, cabinet)
    await set_up(hass)
    _, now = await told(hass, hass_ws_client)
    assert now["at"] == stamp and now["by"] == "Juniper"
    assert model.calls == []


async def test_the_switch_off_means_no_column_and_no_call(hass, hass_ws_client):
    model = Model(hass)
    cabinet = await zenos(hass)
    entry = await set_up(hass, column=False)
    fill(hass, cabinet)
    await hass.async_block_till_done()
    client, now = await told(hass, hass_ws_client)
    assert now == {} and model.calls == []

    # Switched on in the Configure dialog: the column follows at once.
    hass.config_entries.async_update_entry(entry, options={"column": True})
    await hass.async_block_till_done()
    assert len(model.calls) == 1
