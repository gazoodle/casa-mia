"""Jukebox's announcements: each room's own volume, quiet hours, and a queue for each
speaker, so that a chime is followed by its words and two announcements never talk over
each other.

A clip plays over whatever the speaker is playing and leaves the speaker's own volume
and state alone (measured, 2026-11-23), so nothing is saved or put back here, and
nothing that watches the player sees an announcement.
"""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

import aiohttp
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_ON, STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.util import dt as dt_util

from . import pure, speaker
from .const import CONF_QUIET, DEFAULT_VOLUME, EVENT

_LOGGER = logging.getLogger(__name__)
# Seconds an announcement waits for the ones before it on the same speaker. Later than
# that it is stale ("someone is at the door"), and is dropped with a result that says so.
TURN = 30


def room_name(hass: HomeAssistant, entity_id: str) -> str:
    """A player's name as its owner knows it."""
    entry = er.async_get(hass).async_get(entity_id)
    if entry and (entry.name or entry.original_name):
        return entry.name or entry.original_name or entity_id
    device = dr.async_get(hass).async_get(entry.device_id or "") if entry else None
    if device:
        return device.name_by_user or device.name or entity_id
    state = hass.states.get(entity_id)
    return state.name if state else entity_id


@asynccontextmanager
async def _turn(lock: asyncio.Lock, seconds: float) -> AsyncIterator[None]:
    """A speaker's queue: held until the announcements before this one have ended, for
    no longer than `seconds` (TimeoutError)."""
    async with asyncio.timeout(seconds):
        await lock.acquire()
    try:
        yield
    finally:
        lock.release()


def address(hass: HomeAssistant, entity_id: str) -> str | None:
    """A speaker's address on the network, from the link Home Assistant keeps for its
    device."""
    entry = er.async_get(hass).async_get(entity_id)
    device = dr.async_get(hass).async_get(entry.device_id or "") if entry else None
    link = device.configuration_url if device else None
    return pure.address(str(link) if link else None)


class Jukebox:
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass, self.entry = hass, entry
        # Each room's announcement volume, kept by its number entity (number.py).
        self.volumes: dict[str, int] = {}
        # The last announcement, as the event carries it; the sensor shows it.
        self.last: dict | None = None
        self._turns: defaultdict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        # What each speaker said of itself, asked once: it doesn't change while it runs.
        self._about: dict[str, dict] = {}
        self._listeners: list[Callable[[], None]] = []

    def listen(self, callback: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(callback)
        return lambda: self._listeners.remove(callback)

    @property
    def quiet(self) -> bool:
        """Quiet hours are whenever the chosen entity is on. One that is missing or
        unavailable is not on: better an announcement at night than none by day."""
        entity = self.entry.options.get(CONF_QUIET)
        return bool(entity) and self.hass.states.is_state(entity, STATE_ON)

    async def announce(
        self,
        players: list[str],
        clips: list[str],
        *,
        ready: Awaitable[str | None],
        said: str,
        volume: int | None,
        priority: bool,
    ) -> dict:
        """Plays the clips in each room, the rooms side by side, and answers with each
        room's result. `ready` gives None once the words are made, or why they can't be;
        each room waits for it in its turn, before its first clip, so a failure plays
        nothing. `said` is the announcement in words, for the log and the event."""
        players = list(dict.fromkeys(players))
        answers = await asyncio.gather(
            *(self._room(player, clips, ready, volume, priority) for player in players)
        )

        rooms = {
            player: {"result": result, **({"reason": reason} if reason else {})}
            for player, (result, reason) in zip(players, answers, strict=True)
        }
        self.last = {
            "result": pure.summary({p: r["result"] for p, r in rooms.items()}),
            "said": said,
            "priority": priority,
            "rooms": rooms,
            "at": dt_util.utcnow().isoformat(),
        }

        for player, room in rooms.items():
            level = (
                logging.INFO
                if room["result"] in (pure.PLAYED, pure.QUIET)
                else logging.WARNING
            )
            _LOGGER.log(
                level,
                "Announcement %r in %s: %s%s",
                said,
                room_name(self.hass, player),
                room["result"],
                f" ({room['reason']})" if "reason" in room else "",
            )
        self.hass.bus.async_fire(EVENT, self.last)
        for callback in list(self._listeners):
            callback()
        return self.last

    async def _room(
        self,
        player: str,
        clips: list[str],
        ready: Awaitable[str | None],
        volume: int | None,
        priority: bool,
    ) -> tuple[str, str | None]:
        """One room's announcement: its result, and the reason when there is more to say."""
        state = self.hass.states.get(player)
        if state is None or state.state == STATE_UNAVAILABLE:
            return pure.UNAVAILABLE, None
        entry = er.async_get(self.hass).async_get(player)
        if entry is None or entry.platform != "sonos":
            return pure.NOT_SONOS, None
        if self.quiet and not priority:
            return pure.QUIET, None
        host = address(self.hass, player)
        if host is None:
            return pure.NO_ANSWER, "Home Assistant has no address for this speaker"

        level = volume or self.volumes.get(player, DEFAULT_VOLUME)
        try:
            async with _turn(self._turns[player], TURN):
                if reason := await ready:
                    return pure.FAILED, reason
                for clip in clips:
                    result, reason = await self._clip(player, host, clip, level)
                    if result != pure.PLAYED:
                        return result, reason
        except TimeoutError:
            return pure.TOO_LATE, f"earlier announcements took more than {TURN} s"
        return pure.PLAYED, None

    async def _clip(
        self, player: str, host: str, clip: str, volume: int
    ) -> tuple[str, str | None]:
        """Sends one clip and waits for the speaker to say it has ended."""
        session = async_get_clientsession(self.hass)
        try:
            if host not in self._about:
                self._about[host] = await speaker.info(session, host)
            if not pure.has_clips(self._about[host]):
                return pure.NO_CLIPS, (
                    "this speaker can't play a clip over its music (a Sonos S1 system)"
                )

            async with speaker.listening(session, host, self._about[host]) as ended:
                await self.hass.services.async_call(
                    "media_player",
                    "play_media",
                    {
                        "entity_id": player,
                        "media_content_id": clip,
                        "media_content_type": "music",
                        "announce": True,
                        "extra": {"volume": volume},
                    },
                    blocking=True,
                )
                return await ended(), None
        except HomeAssistantError as err:
            return pure.FAILED, str(err)
        except (aiohttp.ClientError, OSError, TimeoutError, ValueError) as err:
            # Ask the speaker about itself afresh next time: it may have been replaced.
            self._about.pop(host, None)
            return pure.NO_ANSWER, (
                f"the speaker's own control port ({speaker.PORT}) didn't answer; "
                f"a Sonos S1 speaker has none: {err!r}"
            )
