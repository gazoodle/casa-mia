"""The Camera compositor page's API and the integration's buttons."""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from typing import Any
from urllib.parse import unquote

from .common import (
    PACES,
)
from .compositor import Compositor
from .drawing import mime

_LOGGER = logging.getLogger(__name__)

# --- the Camera compositor page and the integration's buttons ------------------------


def admin_api(
    live: Compositor,
    draft: Compositor | None,
    host: Callable[[], str | None] = lambda: None,
    names: Callable[[], dict[str, str]] = dict,
):
    """The Camera compositor page's API (/api/compositor/): GET / is what the live
    compositor (dashboards, wall tablets) and the draft one (previews, Show the draft
    cards) serve now, each with its size test page's address on the LAN (`host`: this
    box's LAN address, when known), each stream's viewer named where `names` knows
    its address (a Kiosk Satellite tablet's name); POST restart (both engines), <live|draft>/flush,
    <live|draft>/forget {"camera": <entity>} (the cache, shared: whole or one
    channel), cache/purge, cache/forget {"camera": <entity>}, gatherer/<pause|run>
    and <live|draft>/<generator|server>/<pause|run> answer with it afresh; GET
    thumb/<entity>?w=<px>[&whole=1] is a cached picture as a thumbnail."""
    engines = {"live": live, "draft": draft}

    def one(engine: Compositor) -> dict[str, Any]:
        at = host()
        test = f"http://{at}:{engine.port}/size-test" if at else None
        status, known = engine.status(), names()
        for s in status.get("sending") or []:
            s["name"] = known.get(s["viewer"])
        return {**status, "size_test": test}

    def status() -> tuple[int, str, bytes]:
        data = {
            "gatherer": live.gather.status(),
            "live": one(live),
            "draft": one(draft) if draft else None,
        }
        return 200, "application/json", json.dumps(data).encode()

    def fail(code: int, error: str) -> tuple[int, str, bytes]:
        return code, "application/json", json.dumps({"error": error}).encode()

    def handle(
        method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> tuple[int, str, bytes]:
        parts = [p for p in path.split("/") if p]
        if method == "GET" and not parts:
            return status()
        if method == "GET" and len(parts) == 2 and parts[0] == "thumb":
            parts[1] = unquote(parts[1])  # a composite's key has an @ in it
            # A cached picture, width wide (whole: at its shape, else cut to 16:9).
            try:
                width = max(32, min(int((query.get("w") or ["320"])[0]), 1920))
            except ValueError:
                return fail(400, "w: a width in px")
            whole = (query.get("whole") or ["0"])[0] == "1"
            which = (query.get("engine") or [""])[0]
            if which:  # a composite: a picture a compositor drew
                drawer = engines.get(which)
                drawn = drawer._pictures.get(parts[1]) if drawer else None
                if not drawn:
                    return fail(404, "no such picture")
                made = live.gather.thumb(f"{which}/{parts[1]}", width, whole, drawn[1])
            else:
                made = live.gather.thumb(parts[1], width, whole)
            return (200, mime(made), made) if made else fail(404, "no such picture")
        if method != "POST":
            return fail(404, "not found")
        if parts[:1] == ["gatherer"] and parts[1:] in (["pause"], ["run"]):
            live.gather.pause(parts[1] == "pause")
            return status()
        if parts == ["gatherer", "restart"]:
            live.gather.restart()
            return status()
        if (
            len(parts) == 3
            and parts[0] in engines
            and engines[parts[0]]
            and parts[1] in ("generator", "server")
            and parts[2] in ("pause", "run")
        ):
            engines[parts[0]].pause(parts[1], parts[2] == "pause")  # type: ignore[union-attr]
            return status()
        if parts == ["pace"]:
            try:
                asked = json.loads(body or b"{}")
                which, seconds = str(asked["which"]), float(asked["seconds"])
                if which not in PACES:
                    return fail(404, f"no such setting: {which}")
                engine = engines.get(which)  # a generator's pace: that engine's
                if which in engines and not engine:
                    return fail(404, "no such engine")
                live.gather.set_pace(which, seconds)
                if engine:  # its next drawing at the new pace, now
                    tick = engine._tick
                    engine._on_loop(lambda: tick.set() if tick else None)
            except (ValueError, KeyError, TypeError) as exc:
                return fail(400, f"pace: {exc}")
            return status()
        if parts == ["flag"]:
            try:
                asked = json.loads(body or b"{}")
                live.gather.set_flag(str(asked["which"]), bool(asked["on"]))
            except (ValueError, KeyError, TypeError) as exc:
                return fail(400, f"flag: {exc}")
            return status()
        if parts == ["cache", "purge"]:
            for engine in (live, draft):
                if engine:
                    engine.flush()
            return status()
        if parts == ["cache", "forget"]:
            try:
                asked = json.loads(body or b"{}")
                if "picture" in asked:  # a composite: redrawn at its next turn
                    drawer = engines[str(asked["engine"])]
                    if not drawer:
                        return fail(404, "no such engine")
                    drawer.forget_picture(str(asked["picture"]))
                    return status()
                camera = str(asked["camera"])
            except (ValueError, KeyError, TypeError):
                return fail(400, "which picture?")
            live.forget(camera)
            return status()
        if parts == ["restart"]:
            for engine in (live, draft):
                if engine:
                    engine.restart()
            return status()
        engine = engines.get(parts[0]) if parts else None
        if not engine or len(parts) != 2:
            return fail(404, "not found")
        if parts[1] == "flush":
            engine.flush()
            return status()
        if parts[1] == "forget":
            try:
                camera = str(json.loads(body or b"{}")["camera"])
            except (ValueError, KeyError, TypeError):
                return fail(400, "which camera?")
            engine.forget(camera)
            return status()
        return fail(404, "not found")

    return handle


def control(live: Compositor, draft: Compositor | None) -> Callable[[str, bytes], int]:
    """The integration's buttons: POST /compositor/restart (both engines), and
    /compositor/flush {"which": "live" | "draft"}."""
    api = admin_api(live, draft)

    def handle(path: str, body: bytes) -> int:
        if path.strip("/") == "flush":
            try:
                which = str(json.loads(body or b"{}").get("which") or "live")
            except (ValueError, AttributeError):
                return 400
            return api("POST", f"{which}/flush", {}, b"")[0]
        return api("POST", path, {}, body)[0]

    return handle
