"""Track motion, one tracker per commander: while a commander's Track motion switch is
on, a camera of it that sees motion becomes its main one. Rules (seconds from the commander's
settings on the Camera Dashboard page): the newest motion wins; a switch holds `hold`
seconds before motion elsewhere takes over (that camera waits its turn); `back` seconds
after all motion stops it goes back to the camera chosen by hand (0: it stays); and a
choice by hand (a tap, or an automation) pauses tracking for `pause` seconds. Whatever
the switch, the commander's cameras seeing motion are told to the app, which marks their
tiles.

A camera's motion sensor is a binary_sensor of device class motion on its device, else
one named after it (binary_sensor.<camera, less its channel>_motion)."""

from __future__ import annotations

import logging
import re
import time
from collections.abc import Callable
from typing import Any

import aiohttp
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later, async_track_state_change_event

from .coordinator import CasaMiaCoordinator, async_post

_LOGGER = logging.getLogger(__name__)
CHANNEL = re.compile(r"_(high|medium|low)_resolution_channel$")
SETTINGS = {"hold": 10, "back": 30, "pause": 120}


def commanders(coordinator: CasaMiaCoordinator) -> list[dict[str, Any]]:
    """The app's commanders, each with its id, name, cameras, main camera and Track
    motion settings (see the app's CameraDashboard.commanders)."""
    module = coordinator.data.get("modules", {}).get("camera_dashboard", {})
    found = module.get("commanders")
    if found is None:  # an app from before there were several: its one
        one = module.get("commander")
        return [{"name": "Cameras", **one, "id": ""}] if one else []
    return found


def commander(coordinator: CasaMiaCoordinator, cid: str) -> dict[str, Any]:
    """One commander, by id; empty while the app has no such commander."""
    return next((c for c in commanders(coordinator) if c.get("id") == cid), {})


def tracker(coordinator: CasaMiaCoordinator, cid: str) -> MotionTracker:
    """A commander's tracker, made the first time it is asked for."""
    if cid not in coordinator.motion:
        coordinator.motion[cid] = MotionTracker(coordinator.hass, coordinator, cid)
    return coordinator.motion[cid]


def motion_sensors(hass: HomeAssistant, cameras: list[str]) -> dict[str, str]:
    """motion sensor -> its camera, for the cameras that have one."""
    registry = er.async_get(hass)

    def is_motion(entity_id: str) -> bool:
        entry = registry.async_get(entity_id)
        cls = entry and (entry.device_class or entry.original_device_class)
        state = hass.states.get(entity_id)
        return cls == "motion" or bool(
            state and state.attributes.get("device_class") == "motion"
        )

    out: dict[str, str] = {}
    for cam in cameras:
        entry = registry.async_get(cam)
        found = sorted(
            e.entity_id
            for e in (
                er.async_entries_for_device(registry, entry.device_id)
                if entry and entry.device_id
                else []
            )
            if e.domain == "binary_sensor"
            and not e.disabled_by
            and is_motion(e.entity_id)
        )
        named = f"binary_sensor.{CHANNEL.sub('', cam.split('.', 1)[1])}_motion"
        if not found and hass.states.get(named) and is_motion(named):
            found = [named]
        if found:
            out[found[0]] = cam
    return out


class MotionTracker:
    def __init__(
        self, hass: HomeAssistant, coordinator: CasaMiaCoordinator, cid: str
    ) -> None:
        self.hass = hass
        self.coordinator = coordinator
        self.cid = cid  # its commander's id
        self.enabled = False  # the Track motion switch
        self.sensors: dict[str, str] = {}  # sensor -> camera
        self.moving: set[str] = set()  # cameras seeing motion now
        self.main: str | None = None  # the camera shown as main, as last switched
        self.by_hand: str | None = None  # the camera last chosen by hand
        self.hold_until = 0.0
        self.paused_until = 0.0
        self.waiting: str | None = None  # motion that waits for the hold to end
        self.shown: list[
            Callable[[str], None]
        ] = []  # the select: show a switch at once
        self._unsub: CALLBACK_TYPE | None = None
        self._timers: dict[str, CALLBACK_TYPE] = {}

    # -- what the app says about the commander

    def _commander(self) -> dict[str, Any]:
        return commander(self.coordinator, self.cid)

    @property
    def _who(self) -> str:
        return self._commander().get("name") or repr(self.cid)

    def _settings(self) -> dict[str, float]:
        return SETTINGS | (self._commander().get("motion") or {})

    def _title(self, camera: str) -> str:
        return (self._commander().get("cameras") or {}).get(camera, camera)

    @callback
    def refresh(self) -> None:
        """Each report from the app: follow the commander's cameras' motion sensors."""
        by_title = {t: e for e, t in (self._commander().get("cameras") or {}).items()}
        if self.main is None:
            self.main = by_title.get(self._commander().get("main") or "")
        cameras = list(by_title.values())
        sensors = motion_sensors(self.hass, cameras)
        if sensors == self.sensors:
            return
        if self._unsub:
            self._unsub()
        self.sensors = sensors
        self._unsub = (
            async_track_state_change_event(self.hass, list(sensors), self._changed)
            if sensors
            else None
        )
        self.moving = {
            cam
            for sensor, cam in sensors.items()
            if (state := self.hass.states.get(sensor)) and state.state == "on"
        }
        _LOGGER.info(
            "track motion (%s): watching %s",
            self._who,
            ", ".join(f"{s} ({self._title(c)})" for s, c in sensors.items())
            or "nothing",
        )
        self._tell_app()

    # -- motion

    @callback
    def _changed(self, event: Event) -> None:
        sensor = event.data["entity_id"]
        cam = self.sensors.get(sensor)
        new = event.data.get("new_state")
        if cam is None:
            return
        on = new is not None and new.state == "on"
        if on == (cam in self.moving):
            return
        (self.moving.add if on else self.moving.discard)(cam)
        _LOGGER.debug(
            "track motion (%s): %s %s", self._who, sensor, "on" if on else "off"
        )
        self._tell_app()
        if not self.enabled:
            return
        if on:
            self._cancel("back")
            self._motion(cam, sensor)
        elif not self.moving and (back := self._settings()["back"]) > 0:
            self._later("back", back, self._go_back)

    @callback
    def _motion(self, cam: str, why: str) -> None:
        now = time.monotonic()
        if now < self.paused_until:
            _LOGGER.debug(
                "track motion (%s): %s ignored (paused after a choice)", self._who, why
            )
            return
        if cam == self.main:
            return
        if now < self.hold_until:
            self.waiting = cam  # the newest motion waits for the hold to end
            self._later("hold", self.hold_until - now, self._after_hold)
            return
        self._switch(cam, f"motion on {why}")

    @callback
    def _after_hold(self) -> None:
        if self.enabled and self.waiting in self.moving:
            cam = self.waiting
            assert cam is not None
            self._switch(cam, "motion, after the hold")
        self.waiting = None

    @callback
    def _go_back(self) -> None:
        if (
            self.enabled
            and not self.moving
            and self.by_hand
            and self.by_hand != self.main
        ):
            self._switch(self.by_hand, "back: all motion stopped")

    @callback
    def _switch(self, cam: str, why: str) -> None:
        title = self._title(cam)
        self.main = cam
        self.hold_until = time.monotonic() + self._settings()["hold"]
        self.waiting = None
        _LOGGER.info("track motion (%s): main camera %s (%s)", self._who, title, why)
        for show in self.shown:
            show(title)
        self.hass.async_create_task(
            self._post(
                "/camera-dashboard/commander", {"main": title, "commander": self.cid}
            )
        )

    # -- a choice by hand

    @callback
    def chosen_by_hand(self, title: str) -> None:
        """A tap (or an automation) chose a camera: tracking pauses, and going back
        after motion returns to it."""
        cameras = self._commander().get("cameras") or {}
        cam = next((e for e, t in cameras.items() if t == title), None)
        self.by_hand = self.main = cam
        self.waiting = None
        self.paused_until = time.monotonic() + self._settings()["pause"]
        self._cancel("hold")
        self._cancel("back")

    # -- the app

    @callback
    def _tell_app(self) -> None:
        self.hass.async_create_task(
            self._post(
                "/camera-dashboard/motion",
                {"cameras": sorted(self.moving), "commander": self.cid},
            )
        )

    async def _post(self, path: str, body: dict[str, Any]) -> None:
        try:
            await async_post(self.hass, self.coordinator.url, path, body)
        except aiohttp.ClientError as exc:
            _LOGGER.warning(
                "track motion (%s): the app did not take %s: %s", self._who, path, exc
            )

    # -- timers

    @callback
    def _later(self, name: str, seconds: float, run: Callable[[], None]) -> None:
        self._cancel(name)

        @callback  # on HA's loop, not a worker thread
        def due(_now: Any) -> None:
            self._timers.pop(name, None)
            run()

        self._timers[name] = async_call_later(self.hass, seconds, due)

    @callback
    def _cancel(self, name: str) -> None:
        if cancel := self._timers.pop(name, None):
            cancel()

    @callback
    def unload(self) -> None:
        if self._unsub:
            self._unsub()
        for cancel in self._timers.values():
            cancel()
        self._timers.clear()
