"""commander: Live: the compositors drawing the commanders, the card's view of each, its
main camera and motion."""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

from ... import swap
from ...settings import CHANGED_EVENT
from ..compositor import (
    EMPTY_COMMANDER,
    LAYOUT,
    PANELS,
    Compositor,
    channels,
    commander_cameras,
    config_from_store,
    slug,
)
from .common import BadRequest
from .store import Base

_LOGGER = logging.getLogger(__name__)


class Live(Base):
    def _commanders(self) -> list[Compositor]:
        """The compositor drawing the commanders, when it has them."""
        return [c for c in (self.live,) if c and c.cfg.commanders]

    def commanders(self) -> list[dict[str, Any]]:
        """For the integration, a device each: every commander (by id), its cameras (entity -> title; the
        titles are its select's options), its main one now, and how its Track motion
        behaves (seconds: hold a switch, go back after, pause after a choice by hand)."""
        out: dict[str, dict[str, Any]] = {}
        for comp in self._commanders():
            cfg = comp.cfg
            for cmd in cfg.commanders:
                one = out.setdefault(
                    cmd["id"],
                    {
                        "id": cmd["id"],
                        "name": cmd["name"],
                        # its picture's address
                        "picture": f"/g/{slug(cmd['name'])}.mjpg",
                        "cameras": {},
                        "main": None,
                        "motion": {**EMPTY_COMMANDER["motion"], **cmd["motion"]},
                        # cameras Track motion leaves out (the card marks them still)
                        "motion_ignore": list(cmd["motion_ignore"]),
                    },
                )
                one["card"] = self._card(cmd, cfg.titles)  # the card's view of it
                for e in commander_cameras(cmd):
                    one["cameras"].setdefault(e, cfg.titles.get(e, e))
                if one["main"] is None and (now := comp.main_camera(cmd)):
                    one["main"] = cfg.titles.get(now, now)
        for one in out.values():
            one["options"] = list(dict.fromkeys(one["cameras"].values()))
        return list(out.values())

    def _card(self, cmd: dict, titles: dict[str, str]) -> dict[str, Any]:
        """What the Camera Commander card draws a commander from (its Main camera
        select's `card` attribute): the layout (it lays it out with the same engine, so
        its taps line up), its picture's address, the main camera at start, and each
        camera's title (its select's option) and live page on the dashboard, and its
        channels, smallest first, each with its size where known (the card plays its
        main camera's as live video, when the compositor's live_main switch is on)."""
        try:
            url_path, base = self._target()
        except BadRequest:  # the LAN address not known yet: no picture until it is
            url_path, base = self.dashboard() or "", ""
        mine = commander_cameras(cmd)
        comp = self.live
        cfg = config_from_store(self.full())
        sizes = comp.gather.res if comp else {}
        keys = (
            "width",
            "height",
            "aspects",
            "highlight",
            "debug",
            *(k for k, o in LAYOUT["main"].items() if o.get("for") != "view"),
            *PANELS,
        )
        return {
            "picture": f"{base}/g/{slug(cmd['name'])}.mjpg" if base else "",
            "layout": {k: cmd[k] for k in keys},
            "start": cmd["main"]
            if cmd.get("main") in mine
            else mine[0]
            if mine
            else "",
            "cameras": {
                e: {
                    "title": titles.get(e, e),
                    # its page on the camera dashboard; "" with no dashboard
                    "live": f"/{url_path}/cam-{slug(titles.get(e, e))}"
                    if url_path
                    else "",
                    "channels": [
                        [c, *sizes[c]] if c in sizes else [c, 0, 0]
                        for c in channels(cfg, e).values()
                    ],
                }
                for e in mine
            },
            "live_main": self.live_main(comp),
        }

    @staticmethod
    def live_main(comp: Compositor | None) -> bool:
        """Whether cards play their main camera live: the compositor's switch, and off
        while the screenshot swap is on (a live video is the camera's own, never swapped).
        Told to the card, which then asks for the plain picture (the compositor serves
        either, so no stream it has open stalls); the switch itself is left as set."""
        return bool(comp and comp.gather.flags["live_main"]) and not swap.stamp()

    def check_live_main(self) -> bool:
        """Whether live_main changed since last looked (the switch, or the swap): if so
        the integration is told to ask again now, so every card follows within a second
        rather than at its next poll (30 s)."""
        now = self.live_main(self.live)
        if now == self._live_was:
            return False
        if self._live_was is not None:
            _LOGGER.info(
                "commander: live main camera now %s%s; telling the integration",
                "on" if now else "off",
                " (the screenshot swap is on)" if swap.stamp() else "",
            )
            if token := os.environ.get("SUPERVISOR_TOKEN"):
                from ..guest_login import fire_event

                fire_event(token, CHANGED_EVENT, {})
        self._live_was = now
        return True

    def _watch_live_main(self) -> None:
        while True:
            self.check_live_main()
            time.sleep(1)

    def commander(self) -> dict[str, Any]:
        """The first commander there was (id ""), as an integration from before there
        were several reads it."""
        found = [c for c in self.commanders() if not c["id"]]
        return found[0] if found else {}

    def control(self, path: str, body: bytes) -> int:
        """The integration: POST /commander/main {"main": <title or entity>,
        "commander": <id>} shows that camera as that commander's main one (no id: the
        first commander there was, id ""). An integration from before Camera Commander had its own page posts the same to
        /camera-dashboard/commander. (Motion is the Camera Commander card's to show now,
        from the sensors themselves: an older integration's POST .../motion gets 204.)"""
        if path.strip("/") == "motion":
            return 204
        if path.strip("/") not in ("main", "commander"):
            return 404
        try:
            data = json.loads(body or b"{}")
            wanted, cid = str(data.get("main") or ""), str(data.get("commander") or "")
        except (ValueError, AttributeError):
            return 400
        entity = next(
            (
                e
                for comp in self._commanders()
                for cmd in comp.cfg.commanders
                if cmd["id"] == cid
                for e in commander_cameras(cmd)
                if wanted in (e, comp.cfg.titles.get(e))
            ),
            None,
        )
        if entity is None:
            _LOGGER.warning("commander %r: %r is not one of its cameras", cid, wanted)
            return 400
        for comp in self._commanders():
            comp.set_main(entity, cid)
        _LOGGER.info("commander %r: main camera %s (from Home Assistant)", cid, entity)
        self._mains[cid] = entity
        if self.state_path:
            try:
                self._write(self.state_path, {"mains": self._mains})
            except OSError as exc:
                _LOGGER.warning("commander: main camera not kept: %s", exc)
        return 200

    def health(self) -> dict[str, Any]:
        with self._lock:
            error = self._error
        return {
            "state": "offline" if error else "running",
            "error": error,
            "commander": self.commander(),
            "commanders": self.commanders(),
        }
