"""Listening to a Sonos speaker's own reports of its clips, over its local websocket.

Home Assistant's `play_media` answers as soon as the speaker has accepted a clip, long
before it has played, so the speaker is the only one that can say when a clip has ended
(pure.py has what was measured). The connection lasts for one clip.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

import aiohttp

from .pure import Watch

PORT = 1443
# The key every local client of a Sonos speaker sends, Home Assistant's own Sonos
# library among them. It is not a secret.
HEADERS = {"X-Sonos-Api-Key": "123e4567-e89b-12d3-a456-426655440000"}
PROTOCOL = "v1.api.smartspeaker.audio"
# Seconds: for the speaker to answer at all, and for a clip to end once it is sent. A
# speaker that never reports the end must not hold its queue for ever.
ANSWER = 5
CLIP = 90


async def info(session: aiohttp.ClientSession, host: str) -> dict:
    """What a speaker says of itself: its ids, and what it can do."""
    async with (
        session.get(
            f"https://{host}:{PORT}/api/v1/players/local/info",
            headers=HEADERS,
            ssl=False,  # the speaker's certificate is Sonos's own, for no name we could check
            timeout=aiohttp.ClientTimeout(total=ANSWER),
        ) as response
    ):
        response.raise_for_status()
        return await response.json(content_type=None)


@asynccontextmanager
async def listening(
    session: aiohttp.ClientSession, host: str, about: dict
) -> AsyncIterator[Callable[[], Awaitable[str]]]:
    """Subscribed to a speaker's clips, and past its report of the old ones. Send the
    clip inside, then await what this gives: the clip's result, once it has ended."""
    async with asyncio.timeout(ANSWER):
        socket = await session.ws_connect(
            f"wss://{host}:{PORT}/websocket/api",
            headers=HEADERS,
            protocols=[PROTOCOL],
            ssl=False,
        )

    async with socket:
        watch = Watch()

        async def until(done: Callable[[str | None], bool]) -> str | None:
            async for message in socket:
                if message.type is not aiohttp.WSMsgType.TEXT:
                    continue
                parts = json.loads(message.data)
                if not isinstance(parts, list) or len(parts) != 2:
                    continue
                result = watch.feed(parts[1])
                if done(result):
                    return result
            raise ConnectionError("the speaker closed the connection")

        head = {
            "namespace": "audioClip:1",
            "command": "subscribe",
            "householdId": about.get("householdId"),
            "playerId": about.get("playerId"),
        }
        await socket.send_json([head, {}])
        async with asyncio.timeout(ANSWER):
            await until(lambda _result: watch.ready)

        async def ended() -> str:
            async with asyncio.timeout(CLIP):
                result = await until(lambda result: result is not None)
            assert result is not None
            return result

        yield ended
