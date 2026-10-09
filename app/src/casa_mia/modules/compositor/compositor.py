"""The compositor: one store's commanders, its generator (generator.Generator) and its
server (server.PictureServer) as one, started and stopped together."""

from __future__ import annotations

import asyncio
import logging
import time

from .common import load_config
from .drawing import cameras_of
from .server import PictureServer

_LOGGER = logging.getLogger(__name__)


class Compositor(PictureServer):
    """Draws and serves the commanders of one Camera Dashboard store (live, or the
    draft's for previews), from the pictures of a Gatherer it may share with another
    compositor, on the gatherer's loop; start()/stop()/health() are thread-safe."""

    def start(self) -> None:
        """Never raises: a failure shows up as state `offline` in health()."""
        try:
            self.cfg = load_config(self.config_dir, self.store)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            self._error = f"bad config in {self.config_dir}: {exc}"
            _LOGGER.error(self._error)
            return
        if not cameras_of(self.cfg.commanders):
            _LOGGER.warning(
                "compositor (%s): no cameras yet; it needs %s", self.store, self.needs
            )
        self.gather.configure(self.store, self.cfg)
        self.gather.start()
        if self.gather.loop:
            asyncio.run_coroutine_threadsafe(self._serve(), self.gather.loop)
            self._ready.wait(10)

    def restart(self) -> None:
        """Stop the whole engine and start it again: config re-read, every cache and
        stream gone, the server bound afresh."""
        _LOGGER.info("compositor (%s): restarting", self.store)
        self.stop()
        deadline = time.monotonic() + 10
        while self._running and time.monotonic() < deadline:
            time.sleep(0.05)
        self._loop = None
        if self.gather.loop:
            self._on_loop(self._clear)
        else:
            self._clear()
        for state in (self._streams, self._open, self._asked, self._sizes):
            state.clear()
        self._ready.clear()
        self.start()
