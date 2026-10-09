"""The server: each compositor's pictures over HTTP (a still, or a stream of them), and each open stream measured (Sending). Over the generator (generator.Generator); compositor.Compositor is the two."""

from __future__ import annotations

import asyncio
import html
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import aiohttp
from aiohttp import web

from .. import streams
from .common import (
    FETCH_TIMEOUT,
    LINGER,
    MAX_STREAMS,
    WARM_STREAM_EVERY,
    WARM_STREAM_TIER,
    asked_size,
    slug,
    view_key,
    viewer,
)
from .drawing import (
    commander_cameras,
    mime,
)
from .gatherer import (
    Gatherer,
)
from .generator import Generator

_LOGGER = logging.getLogger(__name__)


@dataclass
class Sending:
    """An open stream, measured: what it sent, and how long writes waited for the
    network to take it (a slow link shows as waiting; a busy box as slow drawing)."""

    picture: str
    viewer: str
    since: float
    frames: int = 0
    sent: int = 0
    waiting: float = 0.0
    skipped: int = 0  # pictures drawn for it that it never sent (it was still sending)
    sid: str = ""  # the card's name for it (one showing of its picture), if it gave one
    card: str = ""  # the card's version, if it gave one (an older card gives none)
    ended: str = ""  # why it ended, when something ended it (else: the viewer left)
    gather: "Gatherer | None" = None  # the whole system's tally, kept too

    async def write(self, resp: web.StreamResponse, data: bytes) -> None:
        began = time.monotonic()
        token = self.gather.begin("send_wait") if self.gather else None
        try:
            await resp.write(data)
        finally:
            if self.gather:
                self.gather.end(token)
        self.waiting += time.monotonic() - began
        self.frames += 1
        self.sent += len(data)
        if self.gather:
            self.gather.sent(len(data))

    def figures(self, now: float) -> dict[str, Any]:
        open_s = max(now - self.since, 0.001)
        return {
            "picture": self.picture,
            "viewer": self.viewer,
            "open_s": round(open_s),
            "frames": self.frames,
            "kb_frame": round(self.sent / max(self.frames, 1) / 1000),
            "kbit_s": round(self.sent * 8 / 1000 / open_s),
            "waiting_pct": round(100 * self.waiting / open_s),
            # Pictures a second it sent (what its viewer saw), and that were drawn for
            # it (what there was to send).
            "sid": self.sid,
            "card": self.card,
            "fps": round(self.frames / open_s, 1),
            "drawn_fps": round((self.frames + self.skipped) / open_s, 1),
        }


class PictureServer(Generator):
    """A compositor's HTTP side: its routes and their handlers, over its generator."""

    async def _serve(self) -> None:
        self._loop, self._stop = asyncio.get_running_loop(), asyncio.Event()
        runner = None
        try:
            self._draw_lock = asyncio.Lock()
            self._watching, self._tick = asyncio.Event(), asyncio.Event()
            self._serving = asyncio.Event()
            if not self.serving_paused:
                self._serving.set()
            if self.prewarm:  # the first LINGER gathers, so the first viewer waits less
                self._warm_until = time.monotonic() + LINGER
                self._watching.set()
            app = web.Application()
            app.add_routes(
                [
                    web.get("/", self._index),
                    web.get("/status", self._status),
                    web.get("/size-test", self._size_test),
                    web.get("/g/{name}.jpg", self._jpg),
                    web.get("/g/{name}.mjpg", self._mjpg),
                    web.post("/g/{name}/done", self._done),
                ]
            )
            runner = web.AppRunner(app, access_log=None)
            await runner.setup()
            site = web.TCPSite(runner, "0.0.0.0", self.port)
            await site.start()
            if self.port == 0:
                self.port = site._server.sockets[0].getsockname()[1]  # type: ignore[union-attr]
            self._running = True
            _LOGGER.info("compositor (%s) serving on :%d", self.store, self.port)
            tasks = [asyncio.create_task(self._gather())]
            self._ready.set()
            await self._stop.wait()
            # The loop is the gatherer's, shared: its own tasks end with it, not the loop.
            ending = [*tasks, *self._bg]
            for task in ending:
                task.cancel()
            await asyncio.gather(*ending, return_exceptions=True)
        except OSError as exc:
            self._error = f"cannot serve on :{self.port}: {exc}"
            _LOGGER.error(self._error)
        finally:
            self._running = False
            self._ready.set()
            if runner:
                await runner.cleanup()

    # -- gathering and drawing

    async def _warm_streams(self, name: str) -> None:
        """Start HA's HLS streams for a commander's cameras, so a tap into a live page
        finds them already running. A cold HLS stream takes 7-9 s to become playable; a
        running one ~10 ms. Rate-limited; cameras without channels are skipped."""
        assert self.gather.http
        now = time.monotonic()
        if now - self._warmed.get(name, -1e9) < WARM_STREAM_EVERY:
            return
        self._warmed[name] = now
        ents = [
            "camera." + self.cfg.entities[e][WARM_STREAM_TIER].replace("camera.", "")
            for e in commander_cameras(self.cfg.named(name) or {})
            if WARM_STREAM_TIER in self.cfg.entities.get(e, {})
        ]
        if not ents:
            return
        try:
            async with self.gather.http.ws_connect(self.ws_url, max_msg_size=0) as ws:
                await ws.receive_json()
                await ws.send_json({"type": "auth", "access_token": self.token})
                await ws.receive_json()
                for i, e in enumerate(ents, 1):
                    await ws.send_json(
                        {
                            "id": i,
                            "type": "camera/stream",
                            "entity_id": e,
                            "format": "hls",
                        }
                    )
                urls = []
                while len(urls) < len(ents):
                    m = await streams.within(ws.receive_json(), FETCH_TIMEOUT)
                    if m.get("type") == "result" and m.get("success"):
                        urls.append(self.ha_url + m["result"]["url"])
                    elif m.get("type") == "result":
                        ents.pop()  # a camera with no HLS stream: don't wait for it
            await asyncio.gather(*(self._hit_hls(u) for u in urls))
        except (aiohttp.ClientError, TimeoutError):
            pass

    async def _hit_hls(self, master_url: str) -> None:
        """Fetch the master then the variant playlist: HA holds the variant until the
        stream is up, so this returns when the stream is running (and keeps it running
        for HA's idle timeout)."""
        assert self.gather.http
        try:
            t = aiohttp.ClientTimeout(total=30)
            async with self.gather.http.get(master_url, timeout=t) as r:
                text = await r.text()
            variant = next(
                ln for ln in text.splitlines() if ln and not ln.startswith("#")
            )
            async with self.gather.http.get(
                master_url.rsplit("/", 1)[0] + "/" + variant, timeout=t
            ) as r:
                await r.read()
        except (aiohttp.ClientError, TimeoutError, StopIteration):
            pass

    def _warm_in_background(self, name: str) -> None:
        task = asyncio.ensure_future(self._warm_streams(name))
        self._bg.add(task)
        task.add_done_callback(self._bg.discard)

    # -- HTTP handlers

    def _live_main(self, request: web.Request) -> bool:
        """Whether a picture's main camera is left to the card's live video: asked for
        (?main=video) and allowed (the whole system's live_main switch)."""
        return request.query.get("main") == "video" and self.gather.flags["live_main"]

    def _known(self, name: str) -> dict | None:
        """The commander served as /g/<name>, when it has cameras."""
        cmd = self.cfg.named(name)
        return cmd if cmd and commander_cameras(cmd) else None

    async def _jpg(self, request: web.Request) -> web.Response:
        if not (cmd := self._known(request.match_info["name"])):
            raise web.HTTPNotFound()
        name = slug(cmd["name"])  # /g/commander is the first's: its pictures' key
        if self.serving_paused:
            raise web.HTTPServiceUnavailable(text="paused")
        self._warm_in_background(name)
        data = await self._frame(
            cmd, asked_size(request.query), self._live_main(request)
        )
        if data is None:
            raise web.HTTPServiceUnavailable(text="no picture drawn (drawing paused?)")
        self.gather.sent(len(data))
        return web.Response(
            body=data, content_type=mime(data), headers={"Cache-Control": "no-store"}
        )

    async def _done(self, request: web.Request) -> web.Response:
        """A card done with a stream it named (out of sight, or gone): ended now, even
        mid-send (a write the network isn't taking would hold a stop till it did).
        Logged whether or not that stream is open, with the card's reason."""
        sid = request.query.get("sid", "")
        why = "".join(c for c in request.query.get("why", "")[:40] if c.isprintable())
        found = self._named.pop(sid, None)
        if found:
            task, sending = found
            sending.ended = f"the card is done with it ({why or 'no reason given'})"
            task.cancel()
        else:
            _LOGGER.info(
                "compositor (%s): %s told by %s that the card is done with stream %s "
                "(%s), which is not open",
                self.store,
                request.match_info["name"],
                viewer(request),
                sid or "(no name)",
                why or "no reason given",
            )
        return web.Response(status=204)

    async def _mjpg(self, request: web.Request) -> web.StreamResponse:
        if not (cmd := self._known(request.match_info["name"])):
            raise web.HTTPNotFound()
        name = slug(cmd["name"])  # /g/commander is the first's: its pictures' key
        resp = web.StreamResponse(
            headers={
                "Content-Type": "multipart/x-mixed-replace; boundary=frame",
                "Cache-Control": "no-store",
            }
        )
        resp.force_close()  # when this stream ends, drop the connection rather than idle
        # A browser doesn't close an <img> stream when the page that had it is left, so
        # they pile up until the client's connection limit is hit and the next page's
        # image waits. So a client's oldest streams are ended when it opens more.
        stop, streams = asyncio.Event(), self._streams.setdefault(viewer(request), [])
        streams.append(stop)
        while len(streams) > MAX_STREAMS:
            streams.pop(0).set()
        # Drawn at the size its address asks for (a card's exact size), else its own.
        size, live_main = asked_size(request.query), self._live_main(request)
        key = view_key(name, size, live_main)
        self._open[key] = self._open.get(key, 0) + 1
        sid = request.query.get("sid", "")[:40]
        sending = Sending(
            key,
            viewer(request) or "",
            time.monotonic(),
            sid=sid,
            card=request.query.get("v", "")[:40],
            gather=self.gather,
        )
        if sid:
            # The card's showing asked again (at a new size, say): its stream before is
            # done with, whether or not the browser let it go.
            if old := self._named.get(sid):
                old[1].ended = "the card asked again (a new size)"
                old[0].cancel()
            self._named[sid] = (asyncio.current_task(), sending)  # type: ignore[assignment]
        self._sending.append(sending)
        open_token = self.gather.begin("stream_s")
        _LOGGER.info(
            "compositor (%s): stream %s to %s opened (%s)",
            self.store,
            key,
            sending.viewer,
            f"card {sending.card or '?'}, stream {sid}"
            if sid
            else "no stream name: not a Camera Commander card of 2026.10.3-b70 or later",
        )
        await resp.prepare(request)
        try:
            # Chrome draws a multipart frame only when it sees the *next* part begin, so a
            # lone frame would sit unseen for a whole interval. So every write ends by
            # opening the following part (boundary + header, no body yet): the frame just
            # sent is drawn at once, and the next one fills the part already open.
            # The parts' type (JPEG, or WebP with transparent gaps) is set by the first
            # picture; a deploy that changes it ends the stream (the dashboard reloads).
            self._warm_in_background(name)
            data = await self._frame(cmd, size, live_main)
            while data is None and not stop.is_set():  # none drawn yet: wait for one
                await self._next_picture(key, stop)
                if not (cmd := self._known(name)):
                    sending.ended = "its commander is gone"
                    return resp
                data = await self._frame(cmd, size, live_main)
            if data is None:
                sending.ended = sending.ended or "no picture to send"
                return resp
            seen = self._draws[key]  # the drawing sent
            kind = mime(data)
            part = f"--frame\r\nContent-Type: {kind}\r\n\r\n".encode()
            await resp.write(part)
            while not stop.is_set():
                if mime(data) != kind:
                    sending.ended = "its picture's type changed (a deploy)"
                    break
                if self._serving and not self._serving.is_set():
                    await self._serving.wait()  # paused: nothing sent until it runs
                await sending.write(resp, data + b"\r\n" + part)
                # The next picture as soon as one is drawn (or the same again after
                # KEEPALIVE, should drawing stop); at once if one was drawn while this
                # one was sending (waiting for the one after halved a slow link's rate).
                if self._draws[key] == seen:
                    await self._next_picture(key, stop)
                if stop.is_set():
                    break
                self._warm_in_background(name)
                cmd = self._known(name)  # a reload may have changed it, or removed it
                if not cmd:
                    sending.ended = "its commander is gone"
                    break
                live_main = self._live_main(request)  # the switch may have changed
                data = (
                    await self._frame(cmd, size, live_main) or data
                )  # none: as before
                skipped = max(self._draws[key] - seen - 1, 0)  # drawn while sending
                sending.skipped += skipped
                self.gather.count("out_skipped", skipped)
                seen = self._draws[key]
        except (ConnectionResetError, asyncio.CancelledError):
            pass  # the viewer went away, or a reason is set (see ended)
        finally:
            if stop.is_set() and not sending.ended:
                sending.ended = "ended by the server (too many from this viewer)"
            if stop in streams:
                streams.remove(stop)
            if sid and (self._named.get(sid) or (None,))[0] is asyncio.current_task():
                del self._named[sid]
            self._open[key] -= 1
            self._sending.remove(sending)
            self.gather.end(open_token)
            f = sending.figures(time.monotonic())
            _LOGGER.info(
                "compositor (%s): stream %s to %s ended, %s, after %.0f s: %d frames, "
                "%.0f kB a frame, %.0f kbit/s, %.0f%% of the time waiting to send",
                self.store,
                key,
                sending.viewer,
                sending.ended or "the viewer went away",
                f["open_s"],
                f["frames"],
                f["kb_frame"],
                f["kbit_s"],
                f["waiting_pct"],
            )
        return resp

    async def _size_test(self, request: web.Request) -> web.Response:
        """A page asking for a commander at exactly the window's size, as a card does,
        showing what it asked for and what came back (resize it to test end to end)."""
        page = Path(__file__).with_name("size-test.html").read_text()
        return web.Response(text=page, content_type="text/html")

    async def _status(self, request: web.Request) -> web.Response:
        return web.json_response(self._status_now())

    async def _index(self, request: web.Request) -> web.Response:
        links = "".join(
            f'<li>{html.escape(c["name"])}: <a href="/g/{slug(c["name"])}.jpg">jpg</a> '
            f'<a href="/g/{slug(c["name"])}.mjpg">mjpg</a></li>'
            for c in self.cfg.commanders
            if commander_cameras(c)
        )
        return web.Response(text=f"<ul>{links}</ul>", content_type="text/html")
