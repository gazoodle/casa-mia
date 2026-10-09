"""The survey: a slow pass over every channel of every camera, to learn its size and whether its stream plays."""

from __future__ import annotations

import asyncio
import collections
import io
import logging
import time

from PIL import Image

from .. import streams
from .common import (
    BENCH,
    channels,
    forgotten,
    refused,
)
from .fetch import Fetcher

_LOGGER = logging.getLogger(__name__)


class Survey(Fetcher):
    """The survey of every channel: its size, and whether it streams."""

    async def _survey_loop(self) -> None:
        """The survey: from the start, a pass over each channel of every camera, a few
        at a time (the "survey_at_once" setting, each read in a thread of its own); each
        one's stream is opened for its first frame (FRAME_TIMEOUT at
        most), kept as its picture, and its size (kept across restarts); a camera HA
        cannot stream gives a snapshot instead. Then it sleeps (the "survey" pace) and
        passes again. A channel being read anyway is passed over (its frames are
        fresher). Paused with the gatherer; a purge or a new camera, a pass at once."""
        assert self._survey_now
        while True:
            if self.paused:
                self._survey_now.clear()
                await self._survey_now.wait()  # woken when run again
                continue
            self._survey_now.clear()
            limit = asyncio.Semaphore(int(self.pace("survey_at_once")))  # this pass's
            todo = [
                e
                for camera in self._cameras()
                for e in channels(self.cfg, camera).values()
            ]
            started = time.monotonic()
            self.survey = {"running": True, "done": 0, "of": len(todo), "at": started}
            got: list[str] = []

            async def one(entity: str) -> None:
                async with limit:
                    if not self.paused:
                        self._surveying.add(entity)
                        try:
                            got.append(await self._survey_one(entity))
                        finally:
                            self._surveying.discard(entity)
                self.survey["done"] += 1

            # A task, so Home Assistant starting can cut it short (ha_started).
            self._pass = asyncio.ensure_future(asyncio.gather(*(one(e) for e in todo)))
            try:
                await self._pass
            except asyncio.CancelledError:
                if (me := asyncio.current_task()) and me.cancelling():
                    raise  # the gatherer itself stopping
                _LOGGER.info(
                    "compositor (cameras): survey cut short after %d of %d channels",
                    self.survey["done"],
                    len(todo),
                )
                continue  # a new pass, at once
            took = time.monotonic() - started
            self.survey = {
                "running": False,
                "done": len(todo),
                "of": len(todo),
                "took_s": round(took, 1),
                "cpu_s": round(self.survey.get("cpu_s", 0.0), 1),  # this pass's
                "ended": time.monotonic(),
            }
            _LOGGER.info(
                "compositor (cameras): survey of %d channels in %.0f s (%.1f s of "
                "CPU): %d from their streams, %d snapshots, %d read anyway, %d "
                "nothing; again in %g s",
                len(todo),
                took,
                self.survey["cpu_s"],
                got.count("stream"),
                got.count("snapshot"),
                got.count("read"),
                got.count("nothing"),
                self.pace("survey"),
            )
            await self._sleep_or(self._survey_now, self.pace("survey"))

    async def _survey_one(self, entity: str) -> str:
        """Survey a channel and record it (see _surveyed): what it gave ("stream",
        "snapshot", "read" anyway, or "nothing")."""
        started = time.monotonic()
        outcome, why, size, cpu = await self._survey_try(entity)
        self.survey["cpu_s"] = self.survey.get("cpu_s", 0.0) + cpu
        self.count("gather_cpu", cpu)
        self._surveyed.setdefault(entity, collections.deque(maxlen=5)).append(
            {
                "at": time.time(),
                "outcome": outcome,
                "why": why,
                "took_s": round(time.monotonic() - started, 1),
                "cpu_ms": round(cpu * 1000),
                "size": list(size) if size else None,
            }
        )
        return outcome

    async def _survey_try(
        self, entity: str
    ) -> tuple[str, str, tuple[int, int] | None, float]:
        """Survey a channel: what came of it, why not its stream (if it was not), the
        size it gave, and the CPU its stream's read took (s). A stream that gives no frame is logged and not tried again for
        BENCH seconds (its snapshot meanwhile)."""
        reader = self._readers.get(entity)
        if reader and reader.alive and reader.frame is not None:
            return "read", "", (reader.frame.width, reader.frame.height), 0.0
        why, cpu = "", 0.0
        known = entity in self._names  # given to go2rtc before: it may have forgotten
        if not self.go2rtc:
            why = "Home Assistant's go2rtc is out of reach"
        elif not self._streamable(entity):
            until, reason = self._no_stream[entity]
            why = f"{reason} (its stream tried again in {max(0, until - time.monotonic()) / 60:.0f} min)"
        elif not (name := await self._name(entity)):
            why = self._no_stream.get(entity, (0.0, "Home Assistant cannot stream it"))[
                1
            ]
        else:
            image, failed, cpu = await asyncio.to_thread(
                streams.first_frame, self._rtsp(name)
            )
            if image is None and known and forgotten(failed):
                # go2rtc restarted (with HA) and forgot it: no fault of the stream's,
                # so given to it afresh and read again at once.
                self._names.pop(entity, None)
                if name := await self._name(entity):
                    image, failed, again = await asyncio.to_thread(
                        streams.first_frame, self._rtsp(name)
                    )
                    cpu += again
            if image is not None:
                self.keep(entity, image, streamed=True)
                return "stream", "", image.size, cpu
            why = failed
            if refused(failed):  # HA's go2rtc down (a restart): no fault of the stream
                self._go2rtc_down(failed)
            elif not name:  # not given afresh: _name has marked it, and why
                why = self._no_stream.get(entity, (0.0, failed))[1]
            else:
                self._no_stream[entity] = (time.monotonic() + BENCH, failed)
                self._names.pop(entity, None)  # put on go2rtc afresh next time
                _LOGGER.info(
                    "compositor (cameras): %s, %s channel: its stream gave no frame "
                    "(%s); its snapshot instead, its stream tried again in %.0f min",
                    self._title(entity),
                    self._channel(entity)[1],
                    failed,
                    BENCH / 60,
                )
        if entity in self._snap_wrong:
            return "nothing", f"{why}; its snapshot is not its size", None, cpu
        image = await self._fetch_now(entity)
        if image is None:
            return "nothing", f"{why}; no snapshot either", None, cpu
        self.keep(entity, image)
        try:
            size = Image.open(io.BytesIO(image)).size
        except OSError:
            size = None
        return "snapshot", why, size, cpu

    async def _sleep_or(self, event: asyncio.Event, seconds: float) -> None:
        """Sleep that long, or less when the event is set or a pace changes."""
        waits = [asyncio.ensure_future(event.wait())]
        if self._repaced:
            waits.append(asyncio.ensure_future(self._repaced.wait()))
        try:
            await asyncio.wait(
                waits, timeout=seconds, return_when=asyncio.FIRST_COMPLETED
            )
        finally:  # cancelled too (its loop stopping): no wait left behind
            for w in waits:
                w.cancel()
