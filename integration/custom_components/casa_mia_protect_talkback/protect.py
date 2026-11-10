"""The UniFi Protect public API calls the integration needs."""

from dataclasses import dataclass

from aiohttp import ClientError, ClientSession, ClientTimeout

from .pure import normalise_mac

TIMEOUT = ClientTimeout(total=10)


class CannotConnect(Exception):
    pass


class InvalidAuth(Exception):
    pass


@dataclass(frozen=True)
class SpeakerCamera:
    id: str
    name: str
    mac: str  # normalised
    doorbell: bool


async def speaker_cameras(
    session: ClientSession, host: str, api_key: str
) -> list[SpeakerCamera]:
    """Cameras on this console that have a speaker, so can take talkback."""
    try:
        async with session.get(
            f"https://{host}/proxy/protect/integration/v1/cameras",
            headers={"X-API-KEY": api_key},
            timeout=TIMEOUT,
            ssl=False,  # the console uses a self-signed certificate
        ) as answer:
            if answer.status in (401, 403):
                raise InvalidAuth
            answer.raise_for_status()
            cameras = await answer.json()
    except (ClientError, TimeoutError, ValueError) as exc:
        raise CannotConnect(str(exc)) from exc

    return [
        SpeakerCamera(
            camera["id"],
            camera.get("name") or camera["id"],
            normalise_mac(camera["mac"]),
            "doorbell" in str(camera.get("type", "")).lower(),
        )
        for camera in cameras
        if camera.get("featureFlags", {}).get("hasSpeaker") and camera.get("mac")
    ]
