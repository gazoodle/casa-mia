"""Each doorbell's call: idle, ringing, answered or complete, shared by every UI.

A doorbell is any HA device with a doorbell event entity and a camera entity (UniFi
Protect's doorbells, for one), whatever integration made it. pure.Call decides; this
keeps its clock and timers, hears the rings and updates the entities. The patches
(patches.py) enforce it: a WebRTC offer that sends a microphone is the answer, and is
refused while another user holds the call. The call ends when the answering session
closes, so a closed page or a lost tablet can't leave the door claimed.
"""

import logging
import time
from collections.abc import Callable
from datetime import UTC, datetime

import probatio
from homeassistant.components import websocket_api
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import (
    CALLBACK_TYPE,
    Event,
    EventStateChangedData,
    HomeAssistant,
    callback,
)
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.event import async_call_later, async_track_state_change_event

from . import pure
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

RING = "ring"  # a doorbell event entity's event_type for a ring
DOORBELL = "doorbell"  # the event entities' device class

# HA device id -> its doorbell: the patches look them up.
_doorbells: dict[str, "Doorbell"] = {}


def get(device_id: str) -> "Doorbell | None":
    return _doorbells.get(device_id)


def for_camera(camera) -> "Doorbell | None":
    """The doorbell whose device has this camera entity."""
    entry = camera.registry_entry
    return _doorbells.get(entry.device_id) if entry and entry.device_id else None


def iso(timestamp: float | None) -> str | None:
    return (
        datetime.fromtimestamp(timestamp, UTC).isoformat()
        if timestamp is not None
        else None
    )


def release(session_id: str) -> None:
    """A WebRTC session closed; whichever call it held is over."""
    for doorbell in _doorbells.values():
        doorbell.release(session_id)


def doorbell_devices(hass: HomeAssistant) -> dict[str, list[er.RegistryEntry]]:
    """Each doorbell device's id, with its enabled event and camera entities."""
    by_device: dict[str, list[er.RegistryEntry]] = {}
    for entry in er.async_get(hass).entities.values():
        if (
            entry.device_id
            and not entry.disabled
            and entry.domain in ("event", "camera")
        ):
            by_device.setdefault(entry.device_id, []).append(entry)
    return {
        device_id: entries
        for device_id, entries in by_device.items()
        if any(e.domain == "camera" for e in entries)
        and any(_rings(e) for e in entries)
    }


def _rings(entry: er.RegistryEntry) -> bool:
    return (
        entry.domain == "event"
        and (entry.device_class or entry.original_device_class) == DOORBELL
    )


class Doorbell:
    """One doorbell's call, as HA sees it."""

    def __init__(
        self, hass: HomeAssistant, device_id: str, entities: list[er.RegistryEntry]
    ) -> None:
        self.hass, self.device_id = hass, device_id
        device = dr.async_get(hass).async_get(device_id)
        self.name = (device and (device.name_by_user or device.name)) or device_id
        # Shown as the same physical device as the doorbell's own.
        self.connections = (
            {c for c in device.connections if c[0] == dr.CONNECTION_NETWORK_MAC}
            if device
            else set()
        )
        self.camera_entities = sorted(
            e.entity_id for e in entities if e.domain == "camera"
        )
        self.ring_entities = sorted(e.entity_id for e in entities if _rings(e))
        self.call = pure.Call(since=time.time())
        self._hang_up: Callable[[], None] | None = None  # cuts the answering session
        self._timer: CALLBACK_TYPE | None = None
        self._due: float | None = None  # the time self._timer is set for
        self._listeners: list[Callable[[], None]] = []
        self._unsubscribe: CALLBACK_TYPE | None = None

    def start(self) -> "Doorbell":
        _doorbells[self.device_id] = self
        self._unsubscribe = async_track_state_change_event(
            self.hass, self.ring_entities, self._event
        )
        _LOGGER.info(
            "%s: call state ready, rings from %s",
            self.name,
            ", ".join(self.ring_entities),
        )
        return self

    def stop(self) -> None:
        _doorbells.pop(self.device_id, None)
        for cancel in (self._unsubscribe, self._timer):
            if cancel:
                cancel()

    def listen(self, update: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(update)
        return lambda: self._listeners.remove(update)

    def claim(
        self, session: str, user_id: str, name: str, hang_up: Callable[[], None]
    ) -> bool:
        if not self.call.claim(session, user_id, name, time.time()):
            _LOGGER.warning(
                "%s: refused %s's microphone: answered by %s",
                self.name,
                name,
                self.call.answered_by,
            )
            return False
        self._hang_up = hang_up
        self._changed()
        return True

    def release(self, session: str) -> None:
        if self.call.release(session, time.time()):
            self._hang_up = None  # the session has closed already
            self._changed()

    def end(self) -> None:
        self._update(self.call.end(time.time()))

    def order(self, user_id: str, field: str, value: object) -> str | None:
        """The answering page keeps its call alive (pure.ORDERS). Why it refused, or None."""
        if refused := pure.ORDERS[field](self.call, user_id, value, time.time()):
            return refused
        self._changed()
        return None

    @callback
    def _event(self, event: Event[EventStateChangedData]) -> None:
        old, new = event.data["old_state"], event.data["new_state"]
        # A restore at startup (no old state) or a reconnect (from unavailable) re-shows
        # the last event; only a new timestamp from a live entity is a new ring.
        if (
            old is None
            or new is None
            or old.state == STATE_UNAVAILABLE
            or old.state == new.state
        ):
            return
        if (
            new.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN)
            and new.attributes.get("event_type") == RING
        ):
            self._update(self.call.ring(time.time()))

    @callback
    def _expire(self, _now) -> None:
        self._timer, self._due = None, None
        self._update(self.call.expire(time.time()))

    def _update(self, changed: bool) -> None:
        if not changed:
            return
        # Ended here rather than by the session closing: cut the talker off.
        if self.call.state != pure.ANSWERED and (hang_up := self._hang_up):
            self._hang_up = None
            hang_up()
        self._changed()

    def _changed(self) -> None:
        call = self.call
        # One timer, for whatever pure.Call says is owed next. Rescheduled only when that
        # moves: taking a call over keeps the deadline.
        due = call.due()
        if due != self._due:
            if self._timer:
                self._timer()
            self._timer = None
            if due is not None:
                self._timer = async_call_later(
                    self.hass, max(0.0, due - time.time()), self._expire
                )
            self._due = due

        _LOGGER.info(
            "%s: call %s, answered by %s, outcome %s, %s duplex%s, ends %s",
            self.name,
            call.state,
            call.answered_by,
            call.outcome,
            call.duplex,
            " (held)" if call.held else "",
            iso(call.ends_at),
        )
        for update in self._listeners:
            update()


class DoorbellEntity(Entity):
    """An entity on this integration's device for the doorbell, which follows its call."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, doorbell: Doorbell, key: str) -> None:
        self.doorbell = doorbell
        self._attr_translation_key = key
        self._attr_unique_id = f"{doorbell.device_id}_{key}"
        # Our own device: since HA 2026.8 a device belongs to one config entry, so these
        # can't sit on the doorbell's own. The MAC makes HA show it as the same physical
        # device; the name keeps it from being titled after the entry.
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, doorbell.device_id)},
            connections=doorbell.connections,
            name=doorbell.name,
            model="Casa Mia Intercom",
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.doorbell.listen(self.async_write_ha_state))


@websocket_api.websocket_command(
    {
        probatio.Required("type"): f"{DOMAIN}/call",
        probatio.Required("entity_id"): str,
        probatio.Optional("duplex"): probatio.In(list(pure.ANSWERED_LIMITS)),
        probatio.Optional("held"): bool,
        probatio.Optional("touched"): probatio.In([True]),
    }
)
@callback
def ws_call(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """The answering page keeps its call alive: the Camera Commander card or the Talk tile,
    on the device that answered. Only the user who answered may; nothing from outside
    moves the deadline."""
    fields = [f for f in pure.ORDERS if f in msg]
    if len(fields) != 1:
        connection.send_error(
            msg["id"],
            websocket_api.ERR_INVALID_FORMAT,
            "Send one of duplex, held or touched",
        )
        return

    entry = er.async_get(hass).async_get(msg["entity_id"])
    doorbell = (
        entry
        and entry.platform == DOMAIN
        and get(entry.unique_id.removesuffix("_call"))
    )
    if not doorbell:
        connection.send_error(
            msg["id"], websocket_api.ERR_NOT_FOUND, f"No call {msg['entity_id']}"
        )
        return

    user, (field,) = connection.user, fields
    if refused := doorbell.order(user.id, field, msg[field]):
        _LOGGER.warning(
            "%s: refused %s=%s from %s: %s",
            doorbell.name,
            field,
            msg[field],
            user.name,
            refused,
        )
        connection.send_error(msg["id"], refused, f"Refused: {refused}")
        return
    _LOGGER.info(
        "%s: %s=%s from %s, ends %s",
        doorbell.name,
        field,
        msg[field],
        user.name,
        iso(doorbell.call.ends_at),
    )
    connection.send_result(msg["id"], {})
