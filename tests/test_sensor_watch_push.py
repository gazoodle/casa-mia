"""Sensor Watch's records pushed to the integration: its merge (push.py, loaded by path),
and the app's live feed (live.py) against a stand-in Home Assistant websocket: every
record on connecting, each change after, a refusal and a reconnect sending them all, an
integration older than the push asked to fetch, and the Home tile's health as pushed."""

import asyncio
import threading
import time
from collections.abc import Callable
from typing import Any

import pytest
from aiohttp import web

from casa_mia.ha import HA
from casa_mia.modules.sensor_watch import live as live_mod
from casa_mia.modules.sensor_watch.common import APPLY, clean
from sensor_watch_fakes import SALT, make, push

STATUS = "sensor.sensor_watch_status"
OWN = [
    {
        "entity_id": STATUS,
        "platform": "casa_mia",
        "translation_key": "sensor_watch_status",
    },
    {
        "entity_id": "sensor.sensor_watch_task_count",
        "platform": "casa_mia",
        "translation_key": "sensor_watch_task_count",
    },
]
TANK = {"entity_id": "sensor.tank", "level": "task", "value": "20", "since": "t"}


def test_app_and_integration_agree_on_the_command():
    assert APPLY == push.APPLY


def test_a_push_merges_onto_its_base_or_asks_for_every_record():
    have = {
        "sensor.a": {"entity_id": "sensor.a"},
        "sensor.b": {"entity_id": "sensor.b"},
    }
    c = {"entity_id": "sensor.c"}
    whole = {"revision": "r2", "records": [c]}
    assert push.merged(have, "r1", whole) == {"sensor.c": c}  # every record: as sent
    change = {"revision": "r2", "base": "r1", "records": [c], "removed": ["sensor.a"]}
    assert push.merged(have, "r1", change) == {
        "sensor.b": have["sensor.b"],
        "sensor.c": c,
    }
    assert push.merged(have, "r0", change) is None  # not ours: send them all
    assert push.merged(have, None, change) is None  # nothing yet


class Hub:
    """Home Assistant's websocket, just enough: every message heard, APPLY answered by
    `answer` (success, with `levels` for the records of a change, by default), the
    entity registry, the list service, and a way to push to the live feed."""

    def __init__(self) -> None:
        self.cond = threading.Condition()
        self.heard: list[dict[str, Any]] = []
        self.read = 0  # how far expect() has looked
        self.levels: dict[str, dict[str, Any]] = {}
        self.answer: Callable[[dict[str, Any]], dict[str, Any] | None] = lambda _m: None
        self.live: web.WebSocketResponse | None = None  # the feed's connection
        self.connections = 0
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self.loop.run_forever, daemon=True)
        self.thread.start()
        self.runner = self._run(self._start())

    def _run(self, coro: Any) -> Any:
        return asyncio.run_coroutine_threadsafe(coro, self.loop).result(5)

    async def _start(self) -> web.AppRunner:
        app = web.Application()
        app.router.add_get("/api/websocket", self._ws)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "127.0.0.1", 0)
        await site.start()
        port = site._server.sockets[0].getsockname()[1]  # type: ignore[union-attr]
        self.url = f"ws://127.0.0.1:{port}/api/websocket"
        return runner

    def close(self) -> None:
        self._run(self.runner.cleanup())
        self.loop.call_soon_threadsafe(self.loop.stop)
        self.thread.join(5)

    async def _ws(self, request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        self.connections += 1
        await ws.send_json({"type": "auth_required"})
        await ws.receive_json()
        await ws.send_json({"type": "auth_ok"})
        async for msg in ws:
            m = msg.json()
            with self.cond:
                self.heard.append(m)
                self.cond.notify_all()
            await ws.send_json(self._result(ws, m))
        return ws

    def _result(self, ws: web.WebSocketResponse, m: dict[str, Any]) -> dict[str, Any]:
        kind, ok = m["type"], {"id": m["id"], "type": "result", "success": True}
        if kind == "config/entity_registry/list":
            return ok | {"result": OWN}
        if kind == "call_service":
            rows = list(self.levels.values())
            return ok | {"result": {"response": {"worst": "task", "sensors": rows}}}
        if kind == "subscribe_entities":
            self.live = ws
        if kind == APPLY:
            if error := self.answer(m):
                return {
                    "id": m["id"],
                    "type": "result",
                    "success": False,
                    "error": error,
                }
            sent = [r["entity_id"] for r in m["records"]] if "base" in m else []
            levels = {e: self.levels[e] for e in sent if e in self.levels}
            return ok | {"result": {"revision": m["revision"], "levels": levels}}
        return ok | {"result": None}

    def expect(self, test: Callable[[dict[str, Any]], bool]) -> dict[str, Any]:
        """The next message heard (after the last one expected) that passes `test`."""

        def found() -> int | None:
            return next(
                (i for i in range(self.read, len(self.heard)) if test(self.heard[i])),
                None,
            )

        with self.cond:
            assert self.cond.wait_for(lambda: found() is not None, 5), "not heard"
            i = found()
            assert i is not None
            self.read = i + 1
            return self.heard[i]

    def since(self) -> list[dict[str, Any]]:
        """What was heard after the last message expected."""
        with self.cond:
            return self.heard[self.read :]

    def send(self, m: dict[str, Any]) -> None:
        assert self.live is not None
        self._run(self.live.send_json(m))

    def drop(self) -> None:
        assert self.live is not None
        self._run(self.live.close())


def applies(base: bool | None = None) -> Callable[[dict[str, Any]], bool]:
    return lambda m: m["type"] == APPLY and (base is None or ("base" in m) == base)


@pytest.fixture
def hub():
    h = Hub()
    yield h
    h.close()


@pytest.fixture
def feed(hub, tmp_path, monkeypatch):
    """A Sensor Watch with the salt watched, its live feed connected to the hub."""
    monkeypatch.setattr(live_mod, "RETRY", 0.01)
    monkeypatch.setattr(live_mod, "TICK", 0.01)
    rung = threading.Event()
    watch = make(tmp_path / "sw.json", HA(hub.url, "token"), on_change=rung.set)
    watch._save({"sensor.salt": clean("sensor.salt", SALT)}, "saved the salt")
    live = watch.live
    assert live is not None
    thread = threading.Thread(target=lambda: asyncio.run(live._run()))
    watch.rung = rung  # type: ignore[attr-defined]
    thread.start()
    yield watch
    live.stop()
    thread.join(5)


def until(test: Callable[[], bool]) -> None:
    deadline = time.monotonic() + 5
    while not test():
        assert time.monotonic() < deadline, "never"
        time.sleep(0.005)


def wait_levels(watch, test: Callable[[dict[str, Any]], bool]) -> dict[str, Any]:
    live = watch.live
    now = live.snapshot()
    while not test(now["levels"]):
        later = live.wait(now["rev"], 5)
        assert later["rev"] != now["rev"], "the levels never came"
        now = later
    return now["levels"]


def test_every_record_on_connecting_then_each_change_with_its_levels(hub, feed):
    whole = hub.expect(applies(base=False))
    assert [r["entity_id"] for r in whole["records"]] == ["sensor.salt"]
    subscribed = hub.expect(lambda m: m["type"] == "subscribe_entities")
    assert subscribed["entity_ids"] == sorted(
        ["sensor.salt", *(e["entity_id"] for e in OWN)]
    )
    hub.expect(
        lambda m: m["type"] == "call_service"
    )  # the levels, to start from the truth

    # A record saved: only it, on from the revision the integration has; its level in
    # the answer (applying fires no event), and its sensor followed too.
    hub.levels["sensor.tank"] = TANK
    feed._save({"sensor.tank": clean("sensor.tank", SALT)}, "saved the tank")
    change = hub.expect(applies(base=True))
    assert change["base"] == whole["revision"] and change["removed"] == []
    assert [r["entity_id"] for r in change["records"]] == ["sensor.tank"]
    assert change["revision"] == feed.health()["revision"]
    assert wait_levels(feed, lambda lv: "sensor.tank" in lv)["sensor.tank"] == TANK
    hub.expect(
        lambda m: m["type"] == "subscribe_entities" and "sensor.tank" in m["entity_ids"]
    )

    # Stopped watching: removed, and gone from the levels.
    feed._save({"sensor.tank": None}, "stopped watching the tank")
    gone = hub.expect(applies(base=True))
    assert gone["records"] == [] and gone["removed"] == ["sensor.tank"]
    wait_levels(feed, lambda lv: "sensor.tank" not in lv)
    assert not feed.rung.is_set()  # pushed: no doorbell


def test_a_refusal_or_a_reconnect_sends_every_record(hub, feed):
    hub.expect(applies(base=False))
    hub.answer = lambda m: {"code": "resync", "message": "no"} if "base" in m else None
    feed._save({"sensor.tank": clean("sensor.tank", SALT)}, "saved the tank")
    hub.expect(applies(base=True))
    again = hub.expect(applies(base=False))  # refused: every record
    assert sorted(r["entity_id"] for r in again["records"]) == [
        "sensor.salt",
        "sensor.tank",
    ]
    hub.answer = lambda _m: None
    hub.drop()  # Home Assistant restarting
    hub.expect(applies(base=False))


def test_an_integration_older_than_the_push_is_asked_to_fetch(hub, feed):
    hub.answer = lambda _m: {"code": "unknown_command", "message": "Unknown command."}
    hub.expect(applies(base=False))
    assert feed.rung.wait(5)  # it fetches when the doorbell rings
    feed.rung.clear()
    feed._save({"sensor.tank": clean("sensor.tank", SALT)}, "saved the tank")
    assert feed.rung.wait(5)
    assert not [m for m in hub.since() if m["type"] == APPLY]  # not sent again


def test_the_home_tile_follows_the_integrations_entities_as_pushed(hub, feed):
    sub = hub.expect(lambda m: m["type"] == "subscribe_entities")["id"]
    culprit = {"entity_id": "sensor.salt", "name": "Salt", "message": "Top up the salt"}
    status = {"s": "task", "a": {"task_list": [culprit], "watching": 1}}
    count = "sensor.sensor_watch_task_count"
    hub.send(
        {
            "id": sub,
            "type": "event",
            "event": {"a": {STATUS: status, count: {"s": "1", "a": {}}}},
        }
    )
    until(lambda: feed.health()["health"] == "task")
    assert feed.health()["worst"] == "Salt: Top up the salt"
    assert feed.health()["counts"] == {"task": 1}
    # A change, as HA sends it: what's added or changed, and what's removed.
    hub.send(
        {
            "id": sub,
            "type": "event",
            "event": {
                "c": {
                    STATUS: {"+": {"s": "nominal"}, "-": {"a": ["task_list"]}},
                    count: {"+": {"s": "0"}},
                }
            },
        }
    )
    until(lambda: feed.health()["health"] == "nominal")
    assert feed.health()["worst"] is None and feed.health()["counts"] == {}
