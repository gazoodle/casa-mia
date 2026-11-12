"""Home Assistant, as Sensor Watch's records read it (records/common.Source): each
command the records ask (named as Home Assistant's websocket commands are, from when the
app asked them over one) answered here from inside Home Assistant: the states and the
registries directly, the Recorder's statistics and history in its own executor.

Each answer is built from the few fields the records use, not from Home Assistant's own
JSON forms, which differ between its versions."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable, Iterable, Mapping
from typing import Any

from homeassistant.components.recorder import get_instance, history
from homeassistant.components.recorder.statistics import statistics_during_period
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import floor_registry as fr
from homeassistant.helpers import label_registry as lr
from homeassistant.util import dt as dt_util

from .records import HAError

_LOGGER = logging.getLogger(__name__)
# seconds a worker waits for Home Assistant's answer: a year of statistics for hundreds
# of sensors takes a few; past this, something is stuck, and the page is told so.
TIMEOUT = 60.0

Command = dict[str, Any]


async def _states(hass: HomeAssistant, _c: Command) -> list[dict[str, Any]]:
    return [
        {"entity_id": s.entity_id, "state": s.state, "attributes": s.attributes}
        for s in hass.states.async_all()
    ]


async def _entities(hass: HomeAssistant, _c: Command) -> list[dict[str, Any]]:
    return [
        {
            "entity_id": e.entity_id,
            "platform": e.platform,
            "translation_key": e.translation_key,
            "area_id": e.area_id,
            "device_id": e.device_id,
            "entity_category": e.entity_category.value if e.entity_category else None,
            "labels": sorted(e.labels),
            "options": e.options,
        }
        for e in er.async_get(hass).entities.values()
    ]


def _all_devices(hass: HomeAssistant) -> Iterable[dr.DeviceEntry]:
    """Every device. Older Home Assistants keep them as a mapping by id; newer ones
    give the devices when iterated, and warn of any use as a mapping."""
    devices = dr.async_get(hass).devices
    return devices.values() if isinstance(devices, Mapping) else devices


async def _devices(hass: HomeAssistant, _c: Command) -> list[dict[str, Any]]:
    return [
        {
            "id": d.id,
            "area_id": d.area_id,
            "name_by_user": d.name_by_user,
            "name": d.name,
            "manufacturer": d.manufacturer,
            "model": d.model,
        }
        for d in _all_devices(hass)
    ]


async def _areas(hass: HomeAssistant, _c: Command) -> list[dict[str, Any]]:
    return [
        {"area_id": a.id, "name": a.name, "floor_id": a.floor_id}
        for a in ar.async_get(hass).async_list_areas()
    ]


async def _floors(hass: HomeAssistant, _c: Command) -> list[dict[str, Any]]:
    return [
        {"floor_id": f.floor_id, "name": f.name}
        for f in fr.async_get(hass).async_list_floors()
    ]


async def _labels(hass: HomeAssistant, _c: Command) -> list[dict[str, Any]]:
    return [
        {"label_id": label.label_id, "name": label.name}
        for label in lr.async_get(hass).async_list_labels()
    ]


def _recorder(hass: HomeAssistant) -> Any:
    if "recorder" not in hass.config.components:
        raise HAError("Home Assistant's Recorder is not running.")
    return get_instance(hass)


def _start(c: Command) -> Any:
    start = dt_util.parse_datetime(c["start_time"])
    if start is None:
        raise HAError(f"not a time: {c['start_time']}")
    return dt_util.as_utc(start)


async def _statistics(hass: HomeAssistant, c: Command) -> dict[str, list[dict]]:
    found = await _recorder(hass).async_add_executor_job(
        statistics_during_period,
        hass,
        _start(c),
        None,
        set(c["statistic_ids"]),
        c["period"],
        None,
        set(c["types"]),
    )
    # Each row's start in milliseconds, as Home Assistant's own command answers.
    return {
        sid: [row | {"start": int(row["start"] * 1000)} for row in rows]
        for sid, rows in found.items()
    }


async def _history(hass: HomeAssistant, c: Command) -> dict[str, list[dict]]:
    # In order: start, end, entities, filters, include the state at the start, only
    # significant changes, minimal response, no attributes, and compressed states (each
    # {"s": state, "lu": last updated in seconds, "a": attributes}).
    return await _recorder(hass).async_add_executor_job(
        history.get_significant_states,
        hass,
        _start(c),
        None,
        c["entity_ids"],
        None,
        True,
        c["significant_changes_only"],
        c["minimal_response"],
        c["no_attributes"],
        True,
    )


async def _config(hass: HomeAssistant, _c: Command) -> dict[str, Any]:
    return {
        "components": sorted(hass.config.components),
        "country": hass.config.country,  # for the mains profile the set-up offers
    }


ANSWERS: dict[str, Callable[[HomeAssistant, Command], Awaitable[Any]]] = {
    "get_states": _states,
    "config/entity_registry/list": _entities,
    "config/device_registry/list": _devices,
    "config/area_registry/list": _areas,
    "config/floor_registry/list": _floors,
    "config/label_registry/list": _labels,
    "recorder/statistics_during_period": _statistics,
    "history/history_during_period": _history,
    "get_config": _config,
}


class Source:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    def call(self, *commands: Command) -> list[Any]:
        """The answers, in order. From a worker thread only (the records' routes run in
        Home Assistant's executor): it waits for the loop, which must not wait for itself."""
        future = asyncio.run_coroutine_threadsafe(
            self._answer(commands), self.hass.loop
        )
        try:
            return future.result(TIMEOUT)
        except TimeoutError as exc:
            future.cancel()
            raise HAError(f"Home Assistant did not answer in {TIMEOUT:.0f} s") from exc

    async def _answer(self, commands: tuple[Command, ...]) -> list[Any]:
        answers = []
        for c in commands:
            try:
                answers.append(await ANSWERS[c["type"]](self.hass, c))
            except HAError:
                raise
            except Exception as exc:  # whatever Home Assistant raised: said, not lost
                _LOGGER.exception("could not answer %s", c["type"])
                raise HAError(f"{c['type']}: {exc}") from exc
        return answers
