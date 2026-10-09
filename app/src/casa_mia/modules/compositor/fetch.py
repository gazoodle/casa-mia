"""The fetching: each wanted channel's loop at its pace, from its stream (go2rtc) or as snapshots, into the cache."""

from __future__ import annotations

import asyncio
import logging
import time

import aiohttp

from .. import streams
from .cache import Cache
from .common import (
    BENCH,
    FETCH_TIMEOUT,
    GO2RTC_CHECK,
    GO2RTC_RTSP,
    IDLE,
    INTERVAL,
    LINGER,
    PACES,
    STILL_TTL,
    STREAM_RETRY,
    STRIKES,
    refused,
)
from .drawing import (
    Picture,
    Use,
)

_LOGGER = logging.getLogger(__name__)


class Fetcher(Cache):
    """Each wanted channel fetched at its own pace, from its stream or as snapshots."""

    def want(self, owner: str, uses: dict[str, list[Use]]) -> None:
        """What a compositor draws from, as of now: each channel and its places. A
        channel not fetched yet starts at once. On its loop."""
        now = time.monotonic()
        self._wants[owner] = (now, uses)
        new = [c for c in uses if c not in self._feeds]
        for c in uses:
            self._wanted[c] = now
        if new and self._wake:
            self._wake.set()

    async def updated(self, entity: str, timeout: float) -> bool:
        """Wait for a channel's next picture (at most timeout seconds): whether it came."""
        event = self._fresh.setdefault(entity, asyncio.Event())
        try:
            await streams.within(event.wait(), timeout)
            return True
        except TimeoutError:
            return False

    async def _run(self) -> None:
        """Watch the wants: start a fetching loop for each channel wanted, stop each one
        (and its stream) LINGER seconds after it was last wanted, or all of them while
        paused; and size, from their streams, the channels of the cameras in use."""
        assert self._wake
        while True:
            now = time.monotonic()
            uses: dict[str, list[Use]] = {}
            for at, mine in list(self._wants.values()):
                if now - at < LINGER:
                    for c, places in mine.items():
                        uses.setdefault(c, []).extend(places)
            self.uses = uses
            live = set() if self.paused else set(uses)
            self._stop_feeds(live)
            if live:
                if not self.gathering:
                    self.gathering = True
                    _LOGGER.info(
                        "compositor (cameras): wanted; each channel fetched every %g s",
                        self.pace("gatherer"),
                    )
                for c in live - set(self._feeds):
                    task = asyncio.ensure_future(self._feed(c))
                    self._feeds[c] = task
            elif self.gathering:
                self.gathering = False
                _LOGGER.info("compositor (cameras): nothing wanted; fetching stopped")
            self._wake.clear()
            try:
                await streams.within(self._wake.wait(), 1.0)
            except TimeoutError:
                pass

    def _stop_feeds(self, keep: set[str] | frozenset[str] = frozenset()) -> None:
        """Stop every channel's fetching loop and stream but those in keep."""
        for c in [c for c in self._feeds if c not in keep]:
            self._feeds.pop(c).cancel()
        self._stop_readers(set(keep))

    async def _feed(self, entity: str) -> None:
        """One channel, fetched at the gatherer's pace on its own until stopped (see
        _once); continuous (0): again as soon as it answers."""
        while True:
            started = time.monotonic()
            new = await self._once(entity)
            wait = self._pace_of(entity) - (time.monotonic() - started)
            # ponytail: continuous polls a stream for its next frame every IDLE s; a
            # frame event from the reader would wake it exactly, if this ever matters.
            await self.paced(wait if new else max(wait, IDLE))

    async def _once(self, entity: str) -> bool:
        """Fetch a channel once. A miss keeps the picture already cached (it goes
        stale); it counts against the channel only while others answer (one did in
        the INTERVAL before it was asked, or since): when none do, Home Assistant (or
        the way to it) is down, a restart say, which is no camera's fault, and an outage
        costs each channel one miss at most. STRIKES in a row and it sits out for BENCH
        seconds, skipped until then. Whether a new picture came."""
        started = time.monotonic()
        window = max(self.pace("gatherer"), INTERVAL)  # "others answered lately"
        if entity in self._benched:
            if started < self._benched[entity]:
                return False
            del self._benched[entity]
            _LOGGER.info("compositor (cameras): trying %s again", entity)
        got = await self._get(entity)
        now = time.monotonic()
        if got is not None:
            self._answered = now
            self._misses.pop(entity, None)
            if self._ha_down:
                self._ha_down = False
                _LOGGER.info("compositor (cameras): cameras answer again")
            if got:
                self.keep(entity, got[0], got[1], streamed=got[2])
                return True
        elif self._answered > started - window:
            self._misses[entity] = self._misses.get(entity, 0) + 1
            if self._misses[entity] >= STRIKES:
                del self._misses[entity]
                self._benched[entity] = now + BENCH
                _LOGGER.warning(
                    "compositor (cameras): %s missed %d times in a row; it sits out "
                    "(its picture goes stale) and is tried again in %.0f min",
                    entity,
                    STRIKES,
                    BENCH / 60,
                )
        elif not self._ha_down and now - self._answered > window * 2:
            self._ha_down = True
            _LOGGER.warning(
                "compositor (cameras): no camera answers; Home Assistant unreachable? "
                "Trying on"
            )
        return False

    async def _get(self, entity: str) -> tuple[Picture, float, bool] | tuple[()] | None:
        """A channel's newest picture, when it came, and whether from its stream: its
        stream's newest frame where it is read (an empty answer when no new frame has
        come since the last: nothing to convert), a snapshot until the first frame
        comes and where it is not streamed; None when it gives nothing."""
        reader = await self._reader(entity)
        if reader and reader.frame is not None:
            if reader.at == self._taken.get(entity):
                return ()
            got = await asyncio.to_thread(reader.image)
            if got:
                self._taken[entity] = got[1]
                return got[0], got[1], True
        if entity in self._snap_wrong:
            return ()  # its snapshot would not be it: its stream's frames only
        image = await self._fetch_now(entity)
        return (image, time.monotonic(), False) if image else None

    def _fetch(self, entity: str) -> asyncio.Future:
        """A channel's still, shared: pictures built together (the live one and a
        preview) fetch it once."""
        now = time.monotonic()
        hit = self._stills.get(entity)
        if hit is None or now - hit[0] > STILL_TTL:
            hit = self._stills[entity] = (
                now,
                asyncio.ensure_future(self._fetch_now(entity)),
            )
        return hit[1]

    async def _fetch_now(self, entity: str) -> bytes | None:
        """A channel's still at its own size: HA passes the camera's JPEG on as it is
        (asked for a size, it decodes and shrinks it); the compositor shrinks it once,
        to exactly the place it is drawn in."""
        assert self.http
        started = time.monotonic()
        try:
            async with self.http.get(
                f"{self.ha_url}/api/camera_proxy/{entity}",
                timeout=aiohttp.ClientTimeout(total=FETCH_TIMEOUT),
            ) as r:
                if r.status != 200:
                    return None
                image = await r.read()
        except (aiohttp.ClientError, TimeoutError):
            return None
        self._took[entity] = time.monotonic() - started
        return image

    def _rtsp(self, name: str) -> str:
        return "rtsp://{}:{}/{}".format(*GO2RTC_RTSP, name)

    def _streamable(self, entity: str) -> bool:
        return (
            bool(self.go2rtc)
            and time.monotonic() >= self._no_stream.get(entity, (0.0, ""))[0]
        )

    async def _name(self, entity: str) -> str | None:
        """A channel's name on HA's go2rtc, putting it there; None (and not asked again
        for BENCH seconds) if HA cannot stream it."""
        if entity in self._names:
            return self._names[entity]
        assert self.http
        try:
            name, why = await streams.register(
                self.http, self.ws_url, self.token, entity
            )
        except (aiohttp.ClientError, TimeoutError, ValueError) as exc:
            # HA itself out of reach (restarting): no fault of the camera's, so asked
            # again soon, not after BENCH (every camera sat out 10 min after a restart).
            why = f"cannot ask Home Assistant: {exc or type(exc).__name__}"
            self._no_stream[entity] = (time.monotonic() + STREAM_RETRY, why)
            _LOGGER.warning(
                "compositor (cameras): %s, %s channel: %s; its snapshots, asked again "
                "in %.0f s",
                self._title(entity),
                self._channel(entity)[1],
                why,
                STREAM_RETRY,
            )
            return None
        if name is None:
            self._no_stream[entity] = (time.monotonic() + BENCH, why)
            _LOGGER.info(
                "compositor (%s): %s, %s channel: no stream to read (%s); its snapshots "
                "instead, asked again in %.0f min",
                "cameras",
                self._title(entity),
                self._channel(entity)[1],
                why,
                BENCH / 60,
            )
            return None
        self._names[entity] = name
        return name

    async def _reader(self, entity: str) -> streams.Reader | None:
        """A channel's stream reader, started if need be; None when it is not streamed.
        A lost stream is logged, and read again after STREAM_RETRY seconds (when HA has
        restarted, its go2rtc no longer has it: it is put there again)."""
        reader = self._readers.get(entity)
        if reader and reader.alive:
            return reader
        if reader:
            del self._readers[entity]
            self.count("gather_cpu", reader.cpu_s + reader.convert_s)
            self._names.pop(entity, None)
            why = reader.error or "stopped"
            if refused(why):  # HA's go2rtc down (a restart): no fault of the stream
                self._go2rtc_down(why)
                return None
            self._no_stream[entity] = (time.monotonic() + STREAM_RETRY, why)
            _LOGGER.warning(
                "compositor (%s): %s, %s channel: stream lost (%s); snapshots for %.0f s",
                "cameras",
                self._title(entity),
                self._channel(entity)[1],
                why,
                STREAM_RETRY,
            )
            return None
        if not self._streamable(entity):
            return None
        name = await self._name(entity)
        if not name:
            return None
        reader = self._readers[entity] = streams.Reader(
            entity, self._rtsp(name), keys_only=self._keys_only
        )
        _LOGGER.info(
            "compositor (%s): %s, %s channel: reading its stream",
            "cameras",
            self._title(entity),
            self._channel(entity)[1],
        )
        return reader

    def _pace_of(self, entity: str) -> float:
        """A channel's own pace (seconds between its pictures): the slower of the
        gatherer's and its fastest user's, the generator drawing most often from it (a
        picture taken more often than any drawing uses one is wasted). One the screenshot
        swap shows a still for: the slowest the gatherer goes, as the still never changes."""
        if self._swapped(entity):
            return PACES["gatherer"][1]
        now = time.monotonic()
        users = [
            self.pace(owner)
            for owner, (at, uses) in list(self._wants.items())
            if owner in PACES and entity in uses and now - at < LINGER
        ]
        gatherer = self.pace("gatherer")
        return max(gatherer, min(users)) if users else gatherer

    def _go2rtc_down(self, why: str) -> None:
        """HA's go2rtc refused a stream: it is down (HA restarting, say), no stream's
        fault; every channel has its snapshots until _watch_go2rtc finds it back."""
        if self.go2rtc:
            self.go2rtc = False
            _LOGGER.warning(
                "compositor (cameras): Home Assistant's go2rtc is out of reach (%s); "
                "snapshots until it is back (looked at every %.0f s)",
                why,
                GO2RTC_CHECK,
            )

    def _keys_only(self, reader: streams.Reader) -> bool:
        """Whether a stream's keyframes are enough: its pictures are taken (at its own
        pace, see _pace_of) no faster than its keyframes come (rule 0: a frame decoded
        is one used), or they come at least as often as the "freshness" allowance (a
        picture up to that old will do). Else every frame: a picture fresher than its
        keyframes needs every frame since the last one decoded."""
        pace, gop = self._pace_of(reader.entity), reader.gop_s
        if gop is None:
            return pace > 0
        return (pace > 0 and pace >= gop) or gop <= self.pace("freshness")

    def _stop_readers(self, keep: set[str] | frozenset[str] = frozenset()) -> None:
        """Stop reading every stream but those in keep."""
        for entity in [e for e in self._readers if e not in keep]:
            gone = self._readers.pop(entity)
            gone.stop()
            self.count("gather_cpu", gone.cpu_s + gone.convert_s)
            _LOGGER.info(
                "compositor (%s): %s, %s channel: stream no longer read",
                "cameras",
                self._title(entity),
                self._channel(entity)[1],
            )

    async def ready_still(self, entity: str) -> Picture | None:
        """The kept still of a camera, at once; one never seen is fetched now, and kept
        (not while paused: none then)."""
        if entity not in self.shots:
            if self.paused:
                return None
            image = await self._fetch(entity)
            if image is None:
                return None
            self.keep(entity, image)
        return self.shots[entity][1]
