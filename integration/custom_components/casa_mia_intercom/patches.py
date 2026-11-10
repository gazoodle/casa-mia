"""The patches into Home Assistant's WebRTC path (its go2rtc provider) that enforce the calls.

1. Answering: a WebRTC offer to a doorbell's camera that sends a microphone claims the
   doorbell's call (call.py) for the HA user behind the websocket, and is refused while
   another user holds it. The viewer keeps video and visitor audio either way.
2. Hanging up: when HA closes a WebRTC session (the page unsubscribed or its websocket
   dropped), the call that session held ends.

Whether a camera can talk at all is someone else's: HA's own two-way audio, or Casa Mia
Protect Talkback for UniFi Protect cameras.
"""

import asyncio
import logging

from homeassistant.core import HomeAssistant, callback

from ..casa_mia.patching import PatchError, Patches
from . import call, pure
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# The HA release whose internals these were written against (read from HA's source on
# 2026-11-05).
PATCHES = Patches(DOMAIN, "2026.11.0")


def install(hass: HomeAssistant) -> None:
    """Apply both patches, once. Raises PatchError, having changed nothing."""
    if PATCHES:
        return

    try:
        from homeassistant.components.camera import WebRTCError
        from homeassistant.components.go2rtc import WebRTCProvider
        from homeassistant.components.websocket_api.connection import current_connection
    except ImportError as exc:
        raise PatchError(f"an import moved: {exc}") from exc

    handle_offer = getattr(WebRTCProvider, "async_handle_async_webrtc_offer", None)
    close_session = getattr(WebRTCProvider, "async_close_session", None)
    if not asyncio.iscoroutinefunction(handle_offer) or not callable(close_session):
        raise PatchError(
            "HA's go2rtc no longer has async_handle_async_webrtc_offer() and async_close_session()"
        )

    async def _handle_offer(
        provider, camera, offer_sdp, session_id, send_message
    ) -> None:
        doorbell = call.for_camera(camera)
        if doorbell and pure.sends_audio(offer_sdp):
            # HA's websocket handler runs this in the connection's own context.
            connection = current_connection.get()
            user = connection.user if connection else None
            user_id, name = (
                (user.id, user.name or user.id)
                if user
                else (session_id, "an unknown user")
            )

            def hang_up() -> None:
                send_message(WebRTCError("intercom_call_ended", "The call was ended"))
                provider.async_close_session(session_id)

            if not doorbell.claim(session_id, user_id, name, hang_up):
                # HA's frontend then reconnects without the microphone, keeping the video.
                send_message(
                    WebRTCError(
                        "intercom_answered_elsewhere",
                        f"Answered by {doorbell.call.answered_by}",
                    )
                )
                return
        await handle_offer(provider, camera, offer_sdp, session_id, send_message)

    @callback
    def _close_session(provider, session_id: str) -> None:
        close_session(provider, session_id)
        call.release(session_id)

    PATCHES.apply(
        (
            (WebRTCProvider, "async_handle_async_webrtc_offer", _handle_offer),
            (WebRTCProvider, "async_close_session", _close_session),
        )
    )
    PATCHES.succeed(hass)
    _LOGGER.info("Patched HA's WebRTC offers and sessions for the doorbells' calls")
