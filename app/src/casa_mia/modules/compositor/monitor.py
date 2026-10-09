"""The monitor: the whole system sampled every few seconds, the health verdict on it, and the gatherer's status for the Camera compositor page."""

from __future__ import annotations

import asyncio
import collections
import logging
import math
import os
import time
from typing import Any

from ... import swap
from .common import (
    GO2RTC_CHECK,
    HEALTH_S,
    LAG_WAITING,
    LINGER,
    MONITOR_EVERY,
    PACES,
    enlarged,
    memory,
)
from .survey import Survey

_LOGGER = logging.getLogger(__name__)


class Monitor(Survey):
    """The whole system measured, judged, and reported."""

    def state(self, entity: str) -> str:
        """A channel's state: sitting out; live (its stream read); starting (its stream
        being read or sized, no frame yet); snapshots (fetched, not streamed); stopped
        (not wanted, or paused)."""
        if entity in self._benched:
            return "sitting out"
        reader = self._readers.get(entity)
        if reader and reader.frame is not None:
            return "live"
        if reader or entity in self._surveying:
            return "starting"
        return "snapshots" if entity in self._feeds else "stopped"

    async def _monitor(self) -> None:
        """Sample the whole compositor system every MONITOR_EVERY seconds: CPU as a
        share of the whole box (gathering, composing, the app in all), memory (the
        app's, the cache's, the box's), bytes sent a second, and where viewers wait (the
        bottleneck): the share of the streams' time their writes waited for the
        network, the share of the time the busier compositor spent drawing, pictures
        a second sent and skipped (drawn for a stream still sending the one before),
        and the average picture sent."""
        cpus = os.cpu_count() or 1
        then = None
        while True:
            now = time.monotonic()
            with self._totals_lock:
                totals = dict(self._totals)
                for total, began in self._spending.values():
                    totals[total] = totals.get(total, 0.0) + now - began
            totals["gather_cpu"] = totals.get("gather_cpu", 0.0) + sum(
                r.cpu_s + r.convert_s for r in list(self._readers.values())
            )
            totals["app_cpu"] = time.process_time()
            if then is not None:
                took = max(now - then[0], 0.001)

                def gone(key: str, then_totals: dict = then[1]) -> float:
                    return max(totals.get(key, 0.0) - then_totals.get(key, 0.0), 0.0)

                def pct(key: str, took: float = took) -> float:
                    return round(100 * gone(key) / took / cpus, 1)

                stream_s = gone("stream_s")  # streams open, by the time each was
                pictures = gone("out_pictures")
                drawing = max(
                    (gone(k) for k in totals if k.startswith("draw_s:")), default=0.0
                )
                mem = memory()
                self.history.append(
                    {
                        "t": round(time.time(), 1),
                        "gather": pct("gather_cpu"),
                        "compose": pct("compose_cpu"),
                        "app": pct("app_cpu"),
                        "out_bps": round(8 * gone("out_bytes") / took),
                        "streams": round(stream_s / took),
                        "waiting": round(100 * gone("send_wait") / stream_s, 1)
                        if stream_s
                        else 0.0,
                        "drawing": round(100 * drawing / took, 1),
                        "sent_fps": round(pictures / took, 1),
                        "skipped_fps": round(gone("out_skipped") / took, 1),
                        "kb_picture": round(gone("out_bytes") / pictures / 1000)
                        if pictures
                        else None,
                        "cache": self.cache_stats()["bytes"],
                        **mem,
                    }
                )
            then = (now, totals)
            await asyncio.sleep(MONITOR_EVERY)

    def verdict(self) -> dict[str, str]:
        """How the panels are doing, and what to do about it: the first that holds of
        HA's go2rtc out of reach, most streams failed, the gatherer paused, the CPU the
        limit (gathering's or drawing's), a generator unable to keep up with its pace,
        the network the limit (pictures queue on the way: panels lag), nothing
        watching, or all well. Judged on the last
        HEALTH_S seconds' samples, so one odd sample doesn't flip it. Its state (one of
        HEALTH_STATES), tone (good, warn, bad), headline and advice."""

        def said(state: str, tone: str, headline: str, advice: str) -> dict[str, str]:
            return {
                "state": state,
                "tone": tone,
                "headline": headline,
                "advice": advice,
            }

        channels = set(self.shots) | set(self.res)
        failing = [e for e in channels if e in self._no_stream]
        if channels and self.go2rtc is False:
            return said(
                "go2rtc_down",
                "bad",
                "Home Assistant's go2rtc is out of reach: every camera is on snapshots",
                f"It is looked at every {GO2RTC_CHECK:.0f} s and comes back by itself "
                "(after Home Assistant restarts, say). If it doesn't within a minute, "
                "restart the Casa Mia app.",
            )
        if len(failing) >= 2 and 2 * len(failing) >= len(channels):
            why = collections.Counter(self._no_stream[e][1] for e in failing)
            return said(
                "streams_failing",
                "bad",
                f"{len(failing)} of {len(channels)} camera streams have failed "
                f"({why.most_common(1)[0][0]})",
                "Restart the gatherer (here, or the integration's Restart gatherer "
                "button): every stream is tried again at once, the pictures kept. If "
                "they fail again, the reason says why.",
            )
        if self.paused:
            return said(
                "paused",
                "warn",
                "The gatherer is paused: the cameras' pictures don't change",
                "Run it again.",
            )
        h = list(self.history)[-max(1, math.ceil(HEALTH_S / MONITOR_EVERY)) :]
        open_ = [x for x in h if x["streams"] > 0]

        def mean(key: str, of: list[dict] = h) -> float:
            return sum(x[key] for x in of) / len(of) if of else 0.0

        app, gather, compose = mean("app"), mean("gather"), mean("compose")
        sent, skipped = mean("sent_fps", open_), mean("skipped_fps", open_)
        waiting = mean("waiting", open_)
        got = f"{sent:.1f} of {sent + skipped:.1f} pictures a second"
        if not open_:
            return said(
                "idle",
                "good",
                "Nothing is watching right now",
                "No panel has a stream open, so there is nothing to judge. Open a "
                "dashboard and look again.",
            )
        if app > 80 and gather >= compose:
            return said(
                "cpu_gathering",
                "bad",
                "The CPU is the bottleneck: gathering takes most of it "
                f"({gather:.0f}% of the box)",
                "Slow the Gatherer's pace, or raise Picture age allowed so more "
                "streams decode keyframes only.",
            )
        if app > 80:
            return said(
                "cpu_drawing",
                "bad",
                "The CPU is the bottleneck: drawing takes most of it "
                f"({compose:.0f}% of the box)",
                "Slow the Live generator's pace.",
            )
        if mean("drawing") > 80:
            return said(
                "drawing_behind",
                "warn",
                "A generator can't keep up with its pace: drawing "
                f"{mean('drawing'):.0f}% of the time",
                "Slow the Live generator's pace: pictures can't be drawn faster than "
                "this box draws them.",
            )
        # A send waits only once every buffer on the way (the network's, a VPN's,
        # Home Assistant's proxy's) is full: pictures queue there, and the panel
        # shows them late. So any waiting that lasts means lag, even with none
        # skipped.
        if waiting > LAG_WAITING:
            sizes = [x["kb_picture"] for x in open_ if x.get("kb_picture")]
            kb = f", {sum(sizes) / len(sizes):.0f} kB a picture" if sizes else ""
            return said(
                "network",
                "warn",
                "Panels lag: the network can't take pictures as fast as they're "
                f"drawn, so they queue on the way (sends wait {waiting:.0f}% of the "
                f"time; viewers get {got}{kb})",
                "Send less: a slower Live generator pace, or smaller pictures (a "
                "card's Away sharpness, which applies when it goes through Home "
                "Assistant: on a VPN to the LAN address it counts as at home and "
                "asks for its screen's full sharpness). A panel on the LAN keeps up.",
            )
        return said(
            "fine",
            "good",
            "Your panels are working fine",
            f"Viewers get every picture drawn ({sent:.1f} a second), and the box has "
            f"room to spare (CPU {app:.0f}%).",
        )

    def _cpu_pct(self, key: str, cpu_s: float, now: float) -> float:
        """The share of one CPU used since the last status (%)."""
        then = self._cpu_seen.get(key)
        self._cpu_seen[key] = (now, cpu_s)
        if then is None or now <= then[0]:
            return 0.0
        return round(100 * max(cpu_s - then[1], 0.0) / (now - then[0]), 1)

    def status(self) -> dict[str, Any]:
        """Its state, and each channel's picture: its camera and tier, its state, its
        size (and whether its stream's), whether still waiting for its first, where it
        comes from (and why not its stream), age and fetch time, misses in a row, when
        one sitting out is tried again, who wants it, and the places drawn from it, each
        with how much it is enlarged."""
        now = time.monotonic()
        owners = {
            c: sorted(
                o for o, (at, w) in self._wants.items() if c in w and now - at < LINGER
            )
            for c in self.uses
        }

        def row(e: str) -> dict[str, Any]:
            camera, tier = self._channel(e)
            reading = self._readers.get(e)
            cpu = (
                self._cpu_pct(e, reading.cpu_s + reading.convert_s, now)
                if reading and reading.alive
                else None
            )
            w, h = self.res.get(e, (0, 0))
            at = self.shots.get(e, (None, b""))[0]
            reader = self._readers.get(e)
            return {
                "camera": e,
                "of": camera,  # the camera it is a channel of
                "title": self.cfg.titles.get(camera, camera),
                "channel": tier,
                "state": self.state(e),
                "waiting": e in self._waiting,
                "source": "stream"
                if reader and reader.frame is not None
                else "snapshot",
                "fps": reader.fps() if reader else None,
                # its stream's decoding: its share of a CPU, keyframes only or every
                # frame, and its keyframe interval
                "cpu_pct": cpu,
                "decoding": None
                if not reading
                else "keyframes"
                if reading.keyframes_only
                else "every frame",
                "gop_s": round(reading.gop_s, 2) if reading and reading.gop_s else None,
                "no_stream": self._no_stream[e][1] if e in self._no_stream else None,
                "width": w,
                "height": h,
                "size_from": "stream"
                if e in self._streamed
                else "still"
                if w
                else None,
                "age_s": None
                if at is None or e in self._waiting
                else round(now - at, 1),
                # the picture held now (a frame, a snapshot): its own size
                "picture": list(self._shot_size[e]) if e in self._shot_size else None,
                "fetch_ms": round(self._took[e] * 1000) if e in self._took else None,
                "missed": self._misses.get(e, 0),
                "back_in_s": round(self._benched[e] - now)
                if e in self._benched
                else None,
                "wanted_by": owners.get(e, []),
                "pace_s": self._pace_of(e) if e in self._feeds else None,
                "surveys": list(reversed(self._surveyed.get(e, []))),
                "uses": [
                    {
                        "picture": picture,
                        "place": where,
                        "width": pw,
                        "height": ph,
                        "enlarged": round(enlarged((w, h), (pw, ph), whole), 2)
                        if w
                        else None,
                    }
                    for picture, where, (pw, ph), whole in self.uses.get(e, [])
                ],
            }

        return {
            # the whole app's share of a CPU since the last status (%)
            "cpu_pct": self._cpu_pct("app", time.process_time(), now),
            "cache": self.cache_stats(),
            "health": self.verdict(),
            "monitor": {
                "cpus": os.cpu_count() or 1,
                "every_s": MONITOR_EVERY,
                "history": list(self.history),
            },
            "paused": self.paused,
            "gathering": self.gathering,
            # The swapped stills are fetched at the slowest (Fetcher._pace_of).
            "pace": PACES["gatherer"][1] if swap.stamp() else self.pace("gatherer"),
            "freshness": self.pace("freshness"),
            "flags": dict(self.flags),
            "survey": {
                **{k: v for k, v in self.survey.items() if k not in ("at", "ended")},
                "pace": self.pace("survey"),
                "at_once": int(self.pace("survey_at_once")),
                "next_in": round(
                    max(0.0, self.survey["ended"] + self.pace("survey") - now)
                )
                if "ended" in self.survey and not self.paused
                else None,
            },
            "go2rtc": self.go2rtc,
            "streams_read": sum(1 for r in self._readers.values() if r.alive),
            "channels": [row(e) for e in sorted(set(self.shots) | set(self.res))],
        }

    def status_rows(self) -> list[dict[str, Any]]:
        return self.status()["channels"]
