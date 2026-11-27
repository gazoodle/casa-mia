"""When each commander camera's event entity last fired, kept across restarts
(casa_mia_commander/fired.py), for the times the card's latest-detection chip needs where
Home Assistant restored an entity as unknown (its event kept, its time lost)."""

import logging
from datetime import timedelta

from custom_components.casa_mia_commander import fired as fired_module
from custom_components.casa_mia_commander.fired import FIRED, SAVE_AFTER, Fired
from homeassistant.core import State
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

PERSON = "event.gate_object"
RING = "event.gate_ring"
AT = "2026-11-20T09:15:00+00:00"


def _later(hass, seconds: float) -> None:
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=seconds))


async def _fired(hass, said: list[int] | None = None) -> Fired:
    return await Fired(
        hass, lambda: said.append(1) if said is not None else None
    ).load()


def _nothing_recorded(monkeypatch) -> None:
    monkeypatch.setattr(fired_module, "get_instance", lambda hass: _Recorder([]))


async def test_a_fire_is_kept_and_given_back_after_a_restart(
    hass, hass_storage, monkeypatch
):
    _nothing_recorded(monkeypatch)
    fired = await _fired(hass)
    fired.watch([PERSON])
    hass.states.async_set(PERSON, AT, {"event_type": "person", "event_id": "e1"})
    await hass.async_block_till_done()

    # Its own state has the time: nothing to give.
    assert fired.lost([PERSON]) == {}
    _later(hass, SAVE_AFTER + 1)
    await hass.async_block_till_done()
    assert hass_storage[FIRED]["data"][PERSON]["at"] == AT

    # Home Assistant stops (unavailable, nothing recorded) and starts again: unknown,
    # with its event restored.
    hass.states.async_set(PERSON, "unavailable", {})
    fired.unload()
    again = await _fired(hass)
    hass.states.async_set(PERSON, "unknown", {"event_type": "person", "event_id": "e1"})
    again.watch([PERSON])
    assert again.lost([PERSON]) == {PERSON: AT}

    # Another event than the one recorded: no time is made up for it.
    hass.states.async_set(PERSON, "unknown", {"event_type": "person", "event_id": "e2"})
    assert again.lost([PERSON]) == {}
    again.unload()


async def test_an_entity_added_later_with_no_time_is_said_once(
    hass, hass_storage, monkeypatch
):
    _nothing_recorded(monkeypatch)
    hass_storage[FIRED] = {
        "version": 1,
        "key": FIRED,
        "data": {
            PERSON: {"at": AT, "event_id": "e1", "event_type": "person"},
            RING: {"at": AT, "event_id": "e3", "event_type": "ring"},
            "event.broken": "not a record",
        },
    }
    said: list[int] = []
    fired = await _fired(hass, said)
    assert set(fired.records) == {PERSON, RING}
    fired.watch([PERSON, RING])

    # As Home Assistant adds them, after this integration.
    hass.states.async_set(PERSON, "unknown", {"event_type": "person", "event_id": "e1"})
    hass.states.async_set(RING, "unknown", {"event_type": "ring", "event_id": "e3"})
    await hass.async_block_till_done()
    _later(hass, 2)
    await hass.async_block_till_done()

    assert said == [1]
    assert fired.lost([PERSON, RING]) == {PERSON: AT, RING: AT}
    fired.unload()


class _Recorder:
    """The recorder's executor, run in place: its answer, or its failure."""

    def __init__(self, answer):
        self.answer = answer
        self.asked: list[str] = []

    async def async_add_executor_job(self, job, hass, start, end, entity, *rest):
        self.asked.append(entity)
        if isinstance(self.answer, Exception):
            raise self.answer
        return {entity: self.answer}


async def test_one_with_no_record_is_looked_up_once_in_the_recorder(
    hass, hass_storage, monkeypatch
):
    newest_first = [
        State(PERSON, "unknown", {"event_type": "person"}),
        State(PERSON, "unavailable", {}),
        State(PERSON, AT, {"event_type": "person"}),  # no event id: not recorded
        State(PERSON, "2026-11-26T10:00:00+00:00", {"event_type": "vehicle"}),
    ]
    recorder = _Recorder(newest_first)
    monkeypatch.setattr(fired_module, "get_instance", lambda hass: recorder)
    hass.states.async_set(PERSON, "unknown", {"event_type": "person", "event_id": "e9"})
    said: list[int] = []
    fired = await _fired(hass, said)

    fired.watch([PERSON])
    await hass.async_block_till_done()
    _later(hass, 2)
    await hass.async_block_till_done()

    # Matched by its type, as the recorder kept no event id.
    assert fired.lost([PERSON]) == {PERSON: AT}
    assert said == [1]
    fired.watch([PERSON, RING])  # watched again: not asked again
    await hass.async_block_till_done()
    assert recorder.asked == [PERSON, RING]
    fired.unload()


async def test_a_recorder_that_fails_is_logged(hass, hass_storage, monkeypatch, caplog):
    recorder = _Recorder(RuntimeError("the database is away"))
    monkeypatch.setattr(fired_module, "get_instance", lambda hass: recorder)
    hass.states.async_set(PERSON, "unknown", {"event_type": "person"})
    fired = await _fired(hass)

    with caplog.at_level(logging.WARNING):
        fired.watch([PERSON, RING])
        await hass.async_block_till_done()

    assert fired.records == {}
    assert "could not say when event.gate_object, event.gate_ring" in caplog.text
    assert "the database is away" in caplog.text
    assert recorder.asked == [PERSON]  # it stops at the first failure
    assert hass.data.get(FIRED) is None
    fired.unload()
