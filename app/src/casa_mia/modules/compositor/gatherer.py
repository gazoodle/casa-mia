"""The gatherer: every camera channel wanted, fetched at its pace into the cache both compositors draw from (see the package's docstring)."""

from __future__ import annotations

import asyncio
import logging
import threading

import aiohttp

from .common import (
    FLAGS,
    GO2RTC_CHECK,
    GO2RTC_RTSP,
    HA_WATCH_RETRY,
    PACES,
    Config,
    go2rtc_reachable,
    refused,
)
from .monitor import Monitor

_LOGGER = logging.getLogger(__name__)


class Gatherer(Monitor):
    """Every camera picture the compositors draw from, fetched once for all of them (the
    live one and the preview's), into one cache. It runs the asyncio loop the
    compositors share, in a thread of its own.

    Each compositor says, as it draws, which channel each of its places is drawn from
    (`want`). Each channel wanted is then fetched by a loop of its own, at its pace:
    a frame of its stream where Home Assistant's go2rtc carries it (converted once, when
    a new one has come), else a snapshot. A slow or dead camera holds up only itself; a
    channel that misses STRIKES times in a row (while others answer) sits out for BENCH
    seconds. A channel nobody has wanted for LINGER seconds is no longer fetched, nor its
    stream read; nobody wanting anything: nothing is fetched. Paused: nothing is fetched
    either, and the cache keeps what it has.

    Every channel has a picture from the start: "(Waiting …)" until its first comes, so
    the compositors draw at once. Each channel's size (its stream's, else its
    snapshot's) is kept in `sizes_path` across restarts, updated when it changes, and
    chooses which channel a place is drawn from before any picture has come."""

    def start(self) -> None:
        """Start its loop in a thread of its own; once (a running one is left be)."""
        with self._lock:
            if self.loop:
                return
            self.go2rtc = go2rtc_reachable()
            _LOGGER.info(
                "compositor (cameras): Home Assistant's go2rtc (RTSP, %s:%d): %s",
                *GO2RTC_RTSP,
                "reachable" if self.go2rtc else "not reachable",
            )
            ready = threading.Event()

            def run() -> None:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                self.loop = loop
                loop.run_until_complete(self._setup())
                ready.set()
                loop.run_forever()

            threading.Thread(target=run, daemon=True).start()
            ready.wait(10)

    async def _setup(self) -> None:
        self.http = aiohttp.ClientSession(
            headers={"Authorization": f"Bearer {self.token}"}
        )
        self._wake, self._repaced = asyncio.Event(), asyncio.Event()
        self._placehold()
        self._survey_now = asyncio.Event()
        tasks = [
            self._run(),
            self._survey_loop(),
            self._monitor(),
            self._watch_go2rtc(),
            self._watch_ha_start(),
        ]
        for coro in tasks:
            self._bg.add(asyncio.ensure_future(coro))

    def stop(self) -> None:
        """Stop its loop (a compositor's own gatherer, when it stops): streams no
        longer read, the cache kept."""
        loop = self.loop
        if not loop:
            return

        async def end() -> None:
            self._stop_feeds()
            tasks = list(self._bg)
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            if self.http:
                await self.http.close()
            loop.stop()

        asyncio.run_coroutine_threadsafe(end(), loop)
        self.loop = None

    def configure(self, owner: str, cfg: Config) -> None:
        """A compositor's cameras (its config, at start and each reload): the gatherer
        knows every compositor's. Thread-safe."""
        self._cfgs[owner] = cfg
        merged = Config()
        for c in self._cfgs.values():
            merged.entities |= c.entities
            merged.titles |= c.titles
            merged.commanders += c.commanders
        self.cfg = merged

        def apply() -> None:
            self._placehold()
            if self._survey_now:
                self._survey_now.set()  # a pass now: any camera just added

        self._soon(apply)

    def restart(self) -> None:
        """Start afresh, the pictures kept (no "(Waiting …)"): every stream stopped and
        read again, every mark forgotten (a channel sitting out, "not its stream", its
        name on go2rtc, given afresh), and a survey pass at once. What a restart of the app did, for streams that all failed at once.
        Thread-safe."""
        _LOGGER.info("compositor (cameras): gatherer restarting, its pictures kept")

        def afresh() -> None:
            self._stop_readers()
            for marks in (
                self._no_stream,
                self._names,
                self._benched,
                self._misses,
            ):
                marks.clear()
            for event in (self._wake, self._survey_now):
                if event:
                    event.set()

        self._soon(afresh)

    def ha_started(self, why: str) -> None:
        """Home Assistant has started: its cameras are all there now. A survey pass under
        way is cut short, and the gatherer starts afresh (restart), with a new pass at
        once: while HA started up it answered before its camera integrations had loaded,
        and each camera that failed then was benched for BENCH seconds. On the loop."""
        _LOGGER.info(
            "compositor (cameras): Home Assistant has started (%s): the gatherer starts "
            "afresh, with a new survey",
            why,
        )
        if self._pass and not self._pass.done():
            self._pass.cancel()
        self.restart()

    def pause(self, paused: bool) -> None:
        """Pause fetching (every loop and stream stopped, the cache kept) or run it
        again. Thread-safe."""
        if paused == self.paused:
            return
        self.paused = paused
        _LOGGER.info(
            "compositor (cameras): %s", "paused" if paused else "running again"
        )

        def wake() -> None:
            for event in (self._wake, self._survey_now):
                if event:
                    event.set()

        self._soon(wake)

    def set_pace(self, which: str, seconds: float) -> None:
        """Set a pace (within PACES), kept across restarts, taken up at once.
        Thread-safe; ValueError out of range."""
        low, high = PACES[which]
        if not low <= seconds <= high:
            raise ValueError(f"{which}: {low:g}-{high:g}")
        if which == "survey_at_once":
            seconds = float(round(seconds))  # a count
        self.paces[which] = seconds
        _LOGGER.info(
            "compositor (cameras): %s: %s",
            which,
            f"{seconds:g} at once"
            if which == "survey_at_once"
            else f"pictures up to {seconds:g} s old"
            if which == "freshness"
            else "continuous"
            if seconds == 0
            else f"every {seconds:g} s",
        )
        self._save_paces()

        def repace() -> None:
            if self._repaced:
                done, self._repaced = self._repaced, asyncio.Event()
                done.set()

        self._soon(repace)

    def set_flag(self, which: str, on: bool) -> None:
        """Turn one of the whole system's switches on or off, kept across restarts.
        Thread-safe; KeyError for none such."""
        if which not in FLAGS:
            raise KeyError(which)
        self.flags[which] = on
        _LOGGER.info("compositor (cameras): %s %s", which, "on" if on else "off")
        self._save_paces()

    async def _watch_go2rtc(self) -> None:
        """While HA's go2rtc is out of reach (found so at start, before HA was up, or
        refusing a stream since), look every GO2RTC_CHECK seconds; back, it has forgotten
        the cameras it was given, so each is given again (names dropped), the channels
        marked "not its stream" for its absence are cleared, and a survey pass starts."""
        while True:
            await asyncio.sleep(GO2RTC_CHECK)
            if self.go2rtc or not await asyncio.to_thread(go2rtc_reachable):
                continue
            self.go2rtc = True
            self._names.clear()
            for e in [e for e, (_, why) in self._no_stream.items() if refused(why)]:
                del self._no_stream[e]
            _LOGGER.info(
                "compositor (cameras): Home Assistant's go2rtc is back; its streams "
                "read again"
            )
            for event in (self._survey_now, self._wake):
                if event:
                    event.set()

    async def _watch_ha_start(self) -> None:
        """Hear Home Assistant say it has started (its homeassistant_started event), and
        call ha_started. Connected through its restarts: the connection drops while it
        is down and is made again every HA_WATCH_RETRY seconds; one made again finds it
        already running if the event came first, and that counts as started too."""
        assert self.http
        again = False  # a connection after the first: HA may have restarted meanwhile
        while True:
            try:
                async with self.http.ws_connect(self.ws_url, heartbeat=30) as ws:
                    await ws.receive_json()  # auth_required
                    await ws.send_json({"type": "auth", "access_token": self.token})
                    if (await ws.receive_json()).get("type") != "auth_ok":
                        _LOGGER.warning(
                            "compositor (cameras): Home Assistant refused the token; "
                            "its start is not heard (asked again in a minute)"
                        )
                        await asyncio.sleep(60)
                        continue
                    await ws.send_json(
                        {
                            "id": 1,
                            "type": "subscribe_events",
                            "event_type": "homeassistant_started",
                        }
                    )
                    await ws.send_json({"id": 2, "type": "get_config"})
                    async for msg in ws:
                        if msg.type != aiohttp.WSMsgType.TEXT:
                            break
                        m = msg.json()
                        if m.get("type") == "event":
                            self.ha_started("its homeassistant_started event")
                        elif m.get("id") == 2 and again:
                            if (m.get("result") or {}).get("state") == "RUNNING":
                                self.ha_started("found running on reconnecting")
            except (aiohttp.ClientError, TimeoutError, ValueError, TypeError):
                pass  # down, or restarting: tried again
            again = True
            await asyncio.sleep(HA_WATCH_RETRY)
