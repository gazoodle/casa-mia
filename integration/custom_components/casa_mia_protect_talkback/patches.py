"""The patches into Home Assistant, and the proof that they took.

1. Config: HA writes its go2rtc config in `go2rtc.server._create_temp_file()`, which
   `Server._start()` looks up by name on every start and watchdog respawn. Wrapping it
   lets `pure.amend()` allow talk.py and define each talkback camera's whole stream,
   including the `exec:` talk source. go2rtc refuses `exec:` sources through its API, so
   the config file is the only way in; a change of streams means one go2rtc restart.
2. Streams: HA's `WebRTCProvider._update_stream_source()` leaves our streams alone
   because its own source is in them. The wrapper checks that this still holds, and if HA
   has replaced one (the Protect URL changed, say), warns and rebuilds the config.
3. Two-way flag: chosen UniFi Protect cameras report two-way audio, so HA's Talk button
   appears for them (and Casa Mia Intercom answers calls through them).

Who may talk is Casa Mia Intercom's business (its own patches), not this module's.
"""

import asyncio
import logging
import os
import signal
import time
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from ..casa_mia.patching import PatchError, Patches
from . import pure
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

TALK_SCRIPT = str(Path(__file__).parent / "talk.py")
RESTART_DEADLINE = 20.0  # seconds for HA's watchdog to bring go2rtc back
# The HA release whose internals these were written against (read from HA's source on
# 2026-11-05; the go2rtc config patch passed test T1 on it).
PATCHES = Patches(DOMAIN, "2026.11.0")

# entry id -> {normalised MAC: (secrets file, Protect camera id)}
_targets: dict[str, dict[str, tuple[str, str]]] = {}
# The talkback streams the config patch writes; set before each go2rtc (re)start.
_streams: pure.Streams = {}
# One check at a time: every entry, and the drift check, can ask for one.
_checking = asyncio.Lock()


def set_targets(entry_id: str, targets: dict[str, tuple[str, str]]) -> None:
    _targets[entry_id] = targets


def remove_targets(entry_id: str) -> bool:
    """Forget an entry's cameras; True when no entry is left."""
    _targets.pop(entry_id, None)
    return not _targets


def _target(camera) -> tuple[str, str] | None:
    """(secrets file, Protect camera id) when this HA camera gets talkback."""
    platform = getattr(camera, "platform", None)
    if not _targets or platform is None or platform.platform_name != "unifiprotect":
        return None
    entry = camera.registry_entry
    device = (
        entry
        and entry.device_id
        and dr.async_get(camera.hass).async_get(entry.device_id)
    )
    for kind, value in device.connections if device else ():
        if kind == dr.CONNECTION_NETWORK_MAC:
            for targets in _targets.values():
                if found := targets.get(pure.normalise_mac(value)):
                    return found
    return None


def install(hass: HomeAssistant) -> None:
    """Apply the three patches, once. Raises PatchError, having changed nothing."""
    if PATCHES:
        return

    try:
        from homeassistant.components.camera import Camera, CameraEntityCapabilities
        from homeassistant.components.camera.const import DATA_COMPONENT  # noqa: F401
        from homeassistant.components.go2rtc import WebRTCProvider
        from homeassistant.components.go2rtc import server as go2rtc_server
        from homeassistant.components.go2rtc.util import get_camera_identifier
        from homeassistant.components.unifiprotect.camera import ProtectCamera
    except ImportError as exc:
        raise PatchError(f"an import moved: {exc}") from exc

    create_temp_file = getattr(go2rtc_server, "_create_temp_file", None)
    update_stream = getattr(WebRTCProvider, "_update_stream_source", None)
    capabilities = pure.getter_of(getattr(Camera, "camera_entity_capabilities", None))
    if not callable(create_temp_file):
        raise PatchError("HA's go2rtc no longer has _create_temp_file()")
    if not asyncio.iscoroutinefunction(update_stream):
        raise PatchError("HA's go2rtc no longer has async _update_stream_source()")
    if capabilities is None:
        raise PatchError("Camera.camera_entity_capabilities has no getter we can wrap")
    two_way = CameraEntityCapabilities(two_way_audio=True)

    def _create_temp_file(*args, **kwargs) -> str:
        config_file = create_temp_file(*args, **kwargs)
        # A fault here must not stop go2rtc: every camera depends on it. Keep HA's own
        # config instead; the check after start then reports that talk is unavailable.
        try:
            path = Path(config_file)
            path.write_text(pure.amend(path.read_text(), TALK_SCRIPT, _streams))
        except Exception:
            _LOGGER.exception(
                "Couldn't amend go2rtc config %s; left as HA wrote it", config_file
            )
        return config_file

    async def _update_stream_source(provider, camera) -> None:
        await update_stream(provider, camera)
        if _target(camera) is None or _checking.locked():
            return
        # Viewing must keep working whatever happens here.
        try:
            identifier = get_camera_identifier(camera)
            stream = (await provider._rest_client.streams.list()).get(identifier)
            sources = [producer.url for producer in stream.producers] if stream else []
            if not any(source.startswith(f"exec:{TALK_SCRIPT} ") for source in sources):
                _LOGGER.warning(
                    "%s's go2rtc stream has lost its talk source; rebuilding the config",
                    camera.entity_id,
                )
                hass.async_create_task(ensure_running_amended(hass))
        except Exception:
            _LOGGER.exception("Couldn't check %s's go2rtc stream", camera.entity_id)

    # A plain property, not cached: whether a camera gets talkback changes with the
    # options, and the device registry lookup in _target() is cheap.
    def _capabilities(camera):
        return two_way if _target(camera) else capabilities(camera)

    PATCHES.apply(
        (
            (go2rtc_server, "_create_temp_file", _create_temp_file),
            (WebRTCProvider, "_update_stream_source", _update_stream_source),
            (ProtectCamera, "camera_entity_capabilities", property(_capabilities)),
        )
    )
    _LOGGER.info("Patched HA's go2rtc config and streams, and Protect's two-way flag")


def uninstall() -> None:
    """Put every patched attribute back as it was."""
    PATCHES.remove()
    _streams.clear()


async def _wanted_streams(hass: HomeAssistant) -> pure.Streams:
    """Each enabled UniFi Protect camera entity that gets talkback, as a go2rtc stream.

    Protect makes several camera entities per device (one per resolution, plus the
    package camera); talk on any of them reaches the same speaker.
    """
    from homeassistant.components.camera.const import DATA_COMPONENT
    from homeassistant.components.go2rtc.util import get_camera_identifier

    component = hass.data.get(DATA_COMPONENT)
    streams: pure.Streams = {}
    for entry in er.async_get(hass).entities.values():
        if (
            entry.platform != "unifiprotect"
            or entry.domain != "camera"
            or entry.disabled
        ):
            continue
        camera = component.get_entity(entry.entity_id) if component else None
        if camera is None or (target := _target(camera)) is None:
            continue
        if source := await camera.stream_source():
            identifier = get_camera_identifier(camera)
            streams[identifier] = pure.talkback_stream(
                identifier, source, pure.talk_source(TALK_SCRIPT, *target)
            )
    return streams


async def ensure_running_amended(hass: HomeAssistant) -> None:
    """Prove the running go2rtc has the config wanted now; restart it once if it hasn't."""
    async with _checking:
        _streams.clear()
        _streams.update(await _wanted_streams(hass))
        wanted = pure.marker_line(TALK_SCRIPT, _streams)

        running = await hass.async_add_executor_job(_go2rtc)
        if running is None:
            PATCHES.fail(
                hass, "no go2rtc process started by HA was found (is go2rtc: url: set?)"
            )
            return
        pid, config_file = running
        if await hass.async_add_executor_job(pure.first_line, config_file) == wanted:
            _succeed(hass, pid, config_file)
            return

        _LOGGER.info(
            "Restarting go2rtc (pid %s) once with talkback for %s camera stream(s)",
            pid,
            len(_streams),
        )
        os.kill(pid, signal.SIGTERM)

        # Bounded wait for HA's watchdog, which respawns go2rtc about a second after exit.
        deadline = time.monotonic() + RESTART_DEADLINE
        while time.monotonic() < deadline:
            await asyncio.sleep(0.5)
            running = await hass.async_add_executor_job(_go2rtc)
            if running and running[0] != pid:
                if (
                    await hass.async_add_executor_job(pure.first_line, running[1])
                    == wanted
                ):
                    _succeed(hass, *running)
                else:
                    PATCHES.fail(
                        hass,
                        "go2rtc restarted without our config: HA no longer uses _create_temp_file()",
                    )
                return

        PATCHES.fail(
            hass,
            f"go2rtc didn't come back within {RESTART_DEADLINE:.0f} s of the restart",
        )


async def restart_if_amended(hass: HomeAssistant) -> None:
    """With no talkback left (last entry removed, or switched off in the app): give go2rtc
    HA's own config back."""
    running = await hass.async_add_executor_job(_go2rtc)
    if running and (
        await hass.async_add_executor_job(pure.first_line, running[1])
    ).startswith(pure.MARKER):
        _LOGGER.info("Restarting go2rtc (pid %s) with HA's own config", running[0])
        os.kill(running[0], signal.SIGTERM)
    PATCHES.succeed(hass)


def _go2rtc() -> tuple[int, str] | None:
    found = pure.go2rtc_children(os.getpid())
    if len(found) > 1:
        _LOGGER.warning("Found %s go2rtc processes; checking the newest", len(found))
    return max(found, default=None)


def _succeed(hass: HomeAssistant, pid: int, config_file: str) -> None:
    _LOGGER.info(
        "go2rtc (pid %s) is running with the amended config %s, talkback on %s",
        pid,
        config_file,
        ", ".join(sorted(_streams)) or "no camera streams",
    )
    PATCHES.succeed(hass)
