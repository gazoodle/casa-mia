"""camera_dashboard: Commanders: the compositors drawing them, the card's view, the main camera."""

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
from .common import BadRequest, Store
from .store import Base

_LOGGER = logging.getLogger(__name__)


class Commanders(Base):
    def _commanders(self) -> list[Compositor]:
        """The compositors drawing commanders: the live one (the dashboard) and the draft
        one (the preview dashboard). One choice of main camera moves both."""
        return [c for c in (self.live, self.draft) if c and c.cfg.commanders]

    def commanders(self) -> list[dict[str, Any]]:
        """For the integration, a device each: every commander (by id; live and draft,
        the live one's name and settings winning), its cameras (entity -> title; the
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
                    },
                )
                # The card's view of it: as deployed, and as the saved draft is
                live = comp is not self.draft
                one.setdefault(
                    "card" if live else "draft_card", self._card(cmd, cfg.titles, live)
                )
                for e in commander_cameras(cmd):
                    one["cameras"].setdefault(e, cfg.titles.get(e, e))
                if one["main"] is None and (now := comp.main_camera(cmd)):
                    one["main"] = cfg.titles.get(now, now)
        for one in out.values():
            one["options"] = list(dict.fromkeys(one["cameras"].values()))
        return list(out.values())

    def _card(self, cmd: dict, titles: dict[str, str], live: bool) -> dict[str, Any]:
        """What the Camera Commander card draws a commander from (its Main camera
        select's `card` attribute, or `draft_card` for the saved draft, from the draft
        compositor): the layout (it lays it out with the same engine, so its taps line
        up), its picture's address, the main camera at start, and each camera's title
        (its select's option) and live page on the dashboard (or the preview one), and its
        channels, smallest first, each with its size where known (the card plays its
        main camera's as live video, when the compositor's live_main switch is on)."""
        try:
            url_path, base = self._target(self.store, live)
        except BadRequest:  # the LAN address not known yet: no picture until it is
            url_path, base = self.store["dashboard"], ""
        mine = commander_cameras(cmd)
        comp = self.live if live else self.draft
        cfg = config_from_store(self.store)
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
                    "live": f"/{url_path}/cam-{slug(titles.get(e, e))}",
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
                "camera dashboard: live main camera now %s%s; telling the integration",
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
        """The integration: POST /camera-dashboard/commander {"main": <title or entity>,
        "commander": <id>} shows that camera as that commander's main one, live and in
        the preview (no id: the first commander there was, id "");
        POST /camera-dashboard/motion {"cameras": [...], "commander": <id>}: its cameras
        seeing motion now (a red dot on their tiles; no id: every commander's)."""
        if path.strip("/") == "motion":
            return self._motion(body)
        if path.strip("/") != "commander":
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

    def _motion(self, body: bytes) -> int:
        try:
            data = json.loads(body or b"{}")
            seen, cid = data.get("cameras") or [], data.get("commander")
        except (ValueError, AttributeError):
            return 400
        if not isinstance(seen, list) or not isinstance(cid, (str, type(None))):
            return 400
        moving = frozenset(str(e) for e in seen)
        for comp in self._commanders():
            comp.set_motion(moving, cid)
        _LOGGER.debug(
            "commander %r: motion on %s", cid, ", ".join(sorted(moving)) or "none"
        )
        return 200

    def _record_shapes(self, store: Store) -> None:
        """Note each commander camera's natural shape in the store (from the stills the
        draft compositor keeps), so the picture and the dashboard's tap zones lay out
        the same way when the main camera sets its own size. A shape not known yet keeps
        the one recorded before (16:9 until there is one)."""
        cmds = store.get("commanders")
        if not isinstance(cmds, list) or not self.draft:
            return
        for cmd in cmds:
            if not isinstance(cmd, dict):
                continue
            shapes = dict(cmd.get("aspects") or {})
            for e in commander_cameras({**EMPTY_COMMANDER, **cmd}):
                if (shape := self.draft.aspect(e)) is not None:
                    shapes[e] = shape
            cmd["aspects"] = shapes

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "state": "offline" if self._error else "running",
                "error": self._error,
                "cameras": len(self.store["cameras"]),
                "deployed": self.deploys().get("live"),
                "changed": self._changed(),
                "commander": self.commander(),
                "commanders": self.commanders(),
            }
