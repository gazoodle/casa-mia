"""Sightings: the photograph a paper needs. Each camera that can tell what it has seen
gets one image entity on the camera's own device, "Last sighting". When one of the
camera's detections fires (somebody at the door, a person, a vehicle, an animal, a smoke
or CO alarm heard), a still is taken from the camera at that moment and kept, with what
sort of sighting it was. The pages read it like any other entity: Home Assistant serves
the picture and pushes the change.

Plain motion takes no photograph: in a house with many cameras it would never stop.

Where Casa Mia's app is running, its compositor is already fetching the cameras that
its commanders show, at their streams' full size: a picture it has from the last few
seconds is used, and the camera is asked only when it has none. The two meet through a
Home Assistant service and nothing else, so this works the same with no app.

A UniFi Protect camera's detection names its event, and Protect makes a thumbnail of
each event, choosing the frame itself. The photograph taken at once is replaced by that
thumbnail when Protect has it, so a sighting never waits for Protect and is never
without a picture because of it.

The entity holds the latest for its camera. Each sighting is also told to sightings.py,
which keeps the last half hour's with their photographs for the pages. All in memory:
after a restart there is no sighting until the next detection. Any brand of camera, as long as its detections are
entities on the same device as its camera entity.
"""

from __future__ import annotations

import asyncio
import base64
import binascii
import logging
import re
import secrets
from datetime import datetime
from typing import Any

from homeassistant.components.image import ImageEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNAVAILABLE
from homeassistant.core import Event, EventStateChangedData, HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from . import sightings
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
# The sorts of sighting, the most pressing first, each with the words that mark it in a
# detection's name. stories.ts ranks them by the same names.
KINDS: dict[str, set[str]] = {
    "alarm": {"smoke", "co"},
    "doorbell": {"doorbell"},
    "person": {"person", "people", "human"},
    "vehicle": {"vehicle", "car"},
    "animal": {"animal", "pet", "dog", "cat"},
}
ORDER = list(KINDS)
BY_EVENT = ""  # a trigger whose kind is told by the type of each event it fires
# A car alarm or a car horn heard is not a vehicle seen.
SOUNDS = {"alarm", "horn", "siren"}
# One still for each camera in this many seconds: a person and their car arrive together.
APART = 5
WIDTH = 960  # pixels: wide enough for the front page, small enough to keep many
TIMEOUT = 10  # seconds for the camera to answer
# Casa Mia's service that answers with a picture its compositor already holds, and the
# oldest one worth having (s): the compositor's own default for how old a picture may be.
CACHE = ("casa_mia", "camera_picture")
FRESH = 5
PROTECT = "unifiprotect"  # the integration whose detections name their event
THUMB_WAIT = 15  # seconds for Protect to have an event's thumbnail


def kind_of(name: str, device_class: str | None = None) -> str | None:
    """What sort of sighting a detection reports, or None for one that takes no
    photograph. `name` is a sensor's translation key or its own name, or the type of
    event an event entity has just fired.

    ponytail: told from English words in the name. Cameras whose detections are named
    otherwise get no sightings; a table for each integration if that is ever met."""
    words = set(re.split(r"[^a-z]+", name.lower()))
    if device_class in ("smoke", "carbon_monoxide") or words & KINDS["alarm"]:
        return "alarm"
    if words & SOUNDS:
        return None
    return next((kind for kind, marks in KINDS.items() if words & marks), None)


async def cached(hass: HomeAssistant, camera_id: str) -> tuple[bytes, str] | None:
    """The picture Casa Mia's compositor holds of a camera, if there is such a service
    and it has one new enough. None otherwise, said in the log at DEBUG: the camera is
    asked instead, so nothing is lost."""
    if not hass.services.has_service(*CACHE):
        return None
    try:
        got = await hass.services.async_call(
            *CACHE,
            {"entity_id": camera_id, "fresh": FRESH},
            blocking=True,
            return_response=True,
        )
        if not got or not got.get("picture"):
            _LOGGER.debug("Casa Mia has no picture of %s: %s", camera_id, got)
            return None
        return base64.b64decode(str(got["picture"])), str(got["type"])
    except (HomeAssistantError, KeyError, binascii.Error) as err:
        _LOGGER.warning(
            "Casa Mia's picture of %s could not be had, so the camera is asked: %s",
            camera_id,
            err,
        )
        return None


async def from_camera(hass: HomeAssistant, camera_id: str) -> tuple[bytes, str]:
    """A picture from a camera now, and its content type."""
    # Imported here: the camera integration brings an image library with it, which a
    # house with no cameras need not load.
    from homeassistant.components import camera  # noqa: PLC0415

    image = await camera.async_get_image(hass, camera_id, timeout=TIMEOUT, width=WIDTH)
    return image.content, image.content_type


async def protect_thumbnail(
    hass: HomeAssistant, entry_id: str, event_id: str
) -> bytes | None:
    """UniFi Protect's own thumbnail of an event, as its integration's thumbnail view
    fetches it (unifiprotect/views.py): through that config entry's client. Another
    integration's insides, so whatever goes wrong here is the caller's to catch."""
    entry = hass.config_entries.async_get_entry(entry_id)
    api = entry.runtime_data.api  # type: ignore[union-attr]
    return await api.get_event_thumbnail(event_id, width=WIDTH)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, add: AddConfigEntryEntitiesCallback
) -> None:
    """One entity for each device that has a camera and a detection worth a photograph.

    ponytail: found once, at set-up. A camera added later gets its entity when the
    integration is next reloaded or Home Assistant restarts."""
    entities, devices = er.async_get(hass), dr.async_get(hass)
    cameras: dict[str, str] = {}
    triggers: dict[str, dict[str, str]] = {}
    protect: dict[str, str] = {}  # a Protect detection -> its config entry

    for found in entities.entities.values():
        if not found.device_id or found.disabled or found.platform == DOMAIN:
            continue
        if found.domain == "camera":
            cameras.setdefault(found.device_id, found.entity_id)
        elif found.domain in ("binary_sensor", "event"):
            device_class = found.device_class or found.original_device_class
            kinds = (found.capabilities or {}).get("event_types") or []
            if found.domain == "binary_sensor":
                kind = kind_of(
                    found.translation_key or found.original_name or found.entity_id,
                    device_class,
                )
            elif device_class == "doorbell":
                kind = "doorbell"
            else:
                # An event entity that can report several things (UniFi Protect's
                # says person, animal or vehicle): which, it says each time it fires.
                kind = BY_EVENT if any(kind_of(str(k)) for k in kinds) else None
            if kind is not None:
                triggers.setdefault(found.device_id, {})[found.entity_id] = kind
                if found.platform == PROTECT and found.config_entry_id:
                    protect[found.entity_id] = found.config_entry_id

    sightings = [
        Sighting(hass, device, camera_id, triggers[device_id], protect)
        for device_id, camera_id in cameras.items()
        if device_id in triggers and (device := devices.async_get(device_id))
    ]
    _LOGGER.info("Dash-Bored takes photographs from %d camera(s)", len(sightings))
    add(sightings)


class Sighting(ImageEntity):
    """The still from one camera's latest sighting. Its state is when that was."""

    _attr_has_entity_name = True
    _attr_name = "Last sighting"
    _attr_should_poll = False
    _attr_content_type = "image/jpeg"

    def __init__(
        self,
        hass: HomeAssistant,
        device: dr.DeviceEntry,
        camera_id: str,
        triggers: dict[str, str],
        protect: dict[str, str],
    ) -> None:
        super().__init__(hass)
        self._camera = camera_id
        self._triggers = triggers
        self._protect = protect
        self._kind = ""
        self._at: datetime | None = None
        self._photo: bytes | None = None
        self._source = ""  # where the photograph came from, for the log
        self._id = ""  # this sighting's, in sightings.py's log
        self._event = ""  # Protect's event whose thumbnail has been asked for
        self._attr_unique_id = f"sighting-{device.id}"
        # The camera's own device, as a helper's entity joins one: the pages find the
        # room there.
        self.device_entry = device

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "kind": self._kind,
            "camera": self._camera,
            "photo": self._photo is not None,
            # When it was seen. The state is when the photograph last changed, which
            # is later when Protect's thumbnail has replaced the first one.
            "seen": self._at.isoformat() if self._at else None,
        }

    async def async_image(self) -> bytes | None:
        return self._photo

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_track_state_change_event(self.hass, list(self._triggers), self._seen)
        )

    async def _seen(self, event: Event[EventStateChangedData]) -> None:
        old, new = event.data["old_state"], event.data["new_state"]
        if not old or not new or old.state == STATE_UNAVAILABLE:
            return  # found at start-up, or come back: not something just seen
        if new.domain == "binary_sensor":
            if old.state != STATE_OFF or new.state != STATE_ON:
                return
        elif new.state in (old.state, STATE_UNAVAILABLE):
            return  # an event entity's state is when it last fired

        kind = self._triggers[new.entity_id] or kind_of(
            str(new.attributes.get("event_type") or "")
        )
        if not kind:
            return
        now = dt_util.utcnow()
        fresh = self._at is None or (now - self._at).total_seconds() >= APART
        # Within APART of the last still there is no new one: the same thing told again
        # by another of the camera's entities. But a doorbell rung as the person is seen
        # makes the sighting a doorbell's, and an entity that names Protect's event
        # (not all do) lets its thumbnail be asked for.
        better = not fresh and ORDER.index(kind) < ORDER.index(self._kind)
        entry_id = self._protect.get(new.entity_id)
        event_id = str(new.attributes.get("event_id") or "") if entry_id else ""
        if not fresh and not better and event_id in ("", self._event):
            return

        if fresh:
            self._at = now  # before the wait, so that what comes during it is not fresh
            self._id, self._event = secrets.token_urlsafe(16), ""
            try:
                held = await cached(self.hass, self._camera)
                self._source = "Casa Mia" if held else "the camera"
                self._photo, self._attr_content_type = held or await from_camera(
                    self.hass, self._camera
                )
            except (HomeAssistantError, TimeoutError) as err:
                # Still a sighting: told without a photograph, never with an old one.
                self._photo = None
                _LOGGER.warning(
                    "No photograph of the %s at %s: %s", kind, self._camera, err
                )
            self._attr_image_last_updated = now
        if fresh or better:
            self._kind = kind
            _LOGGER.info(
                "Sighting at %s: %s (photograph from %s)",
                self._camera,
                kind,
                self._source if self._photo else "nobody",
            )
            self._tell()

        if entry_id and event_id and event_id != self._event:
            self._event = event_id
            # Not awaited: the sighting is told now, and the better picture follows.
            # The entry's task, so that unloading the integration ends it.
            assert self.platform.config_entry
            self.platform.config_entry.async_create_background_task(
                self.hass,
                self._better(self._id, entry_id, event_id),
                f"{DOMAIN} thumbnail {event_id}",
            )

    def _tell(self) -> None:
        """This sighting, as it now is: to Home Assistant, and to the pages' log."""
        assert self._at and self.image_last_updated
        self.async_write_ha_state()
        self.hass.data[sightings.KEY].tell(
            {
                "id": self._id,
                "entity": self.entity_id,
                "camera": self._camera,
                "kind": self._kind,
                "at": self._at.timestamp(),
                "changed": self.image_last_updated.timestamp(),
                "photo": self._photo is not None,
            },
            (self._photo, self.content_type) if self._photo else None,
        )

    async def _better(self, sighting: str, entry_id: str, event_id: str) -> None:
        """Replace that sighting's photograph with Protect's thumbnail of its event, if
        that comes within THUMB_WAIT and no later sighting has taken its place."""
        try:
            async with asyncio.timeout(THUMB_WAIT):
                thumbnail = await protect_thumbnail(self.hass, entry_id, event_id)
        except Exception as err:  # noqa: BLE001 (another integration's insides)
            thumbnail = None
            _LOGGER.warning(
                "UniFi Protect's thumbnail of event %s at %s could not be had, so the "
                "first photograph stays: %s: %s",
                event_id,
                self._camera,
                type(err).__name__,
                err,
            )
        else:
            if not thumbnail:
                _LOGGER.info(
                    "UniFi Protect has no thumbnail of event %s at %s: the first "
                    "photograph stays",
                    event_id,
                    self._camera,
                )
        if not thumbnail or self._id != sighting:
            return

        was = len(self._photo or b"")
        self._photo, self._attr_content_type = thumbnail, "image/jpeg"
        self._source = "UniFi Protect"
        self._attr_image_last_updated = dt_util.utcnow()
        _LOGGER.info(
            "Sighting at %s: UniFi Protect's thumbnail (%d bytes) replaces the first "
            "photograph (%d bytes)",
            self._camera,
            len(thumbnail),
            was,
        )
        self._tell()
