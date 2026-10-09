"""cameras: the house's cameras, as a source of data for the rest of Casa Mia.

Each camera chosen from Home Assistant, by its entity (the low channel, or the camera
itself if it has no channels): its title, its medium and high channels, its zoom entity,
its PTZ presets and its page controls (a gate, a light). Camera Commander and the Camera
Dashboard read it; it draws nothing itself. Every change is saved at once (no draft) and
told to the listeners.

Its file in the app's config folder: cameras.json. The first start moves the cameras from
camera-dashboard.json, where they were kept before, leaving that file as it was.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import urllib.parse
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..ha import HA, HAError

_LOGGER = logging.getLogger(__name__)

STORE = "cameras.json"
OLD_STORE = "camera-dashboard.json"  # where the cameras were kept before
THUMB_WIDTH = 160  # the page's camera thumbnails
CAMERA = re.compile(r"camera\.[a-z0-9_]+")
CHANNEL = re.compile(r"_(high|medium|low)_resolution_channel$")
ZOOM = re.compile(r"^number\..*_zoom_level$")

Response = tuple[int, str, bytes]
Cams = dict[str, dict[str, Any]]


class BadRequest(Exception):
    pass


# --- HA's cameras ----------------------------------------------------------------------


def ha_cameras(registry: list[dict], states: list[dict]) -> list[dict]:
    """The cameras HA has, one per camera device: the entity a composite uses (the low
    channel, or the camera itself if it has no channels), its medium and high channels,
    its zoom-level number entity and its device (for PTZ). Channels of one camera share a
    device but their names don't line up, so match on device, not name."""
    names = {
        s["entity_id"]: s.get("attributes", {}).get("friendly_name") for s in states
    }
    live = [e for e in registry if not e.get("disabled_by")]
    by_device: dict[str, dict[str, str]] = {}
    out = []
    for e in live:
        eid, dev = e["entity_id"], e.get("device_id")
        if ZOOM.match(eid) and dev:
            by_device.setdefault(dev, {})["zoom"] = eid
        if not eid.startswith("camera."):
            continue
        m = CHANNEL.search(eid)
        if m and dev:
            by_device.setdefault(dev, {})[m.group(1)] = eid
        else:
            out.append({"entity": eid, "device_id": dev})
    for dev, found in by_device.items():
        main = found.get("low") or found.get("medium") or found.get("high")
        if main:
            out.append(
                {"entity": main, "device_id": dev}
                | {k: found[k] for k in ("medium", "high", "zoom") if k in found}
            )
    for cam in out:
        name = names.get(cam["entity"]) or cam["entity"]
        cam["name"] = re.sub(
            r"\s*(low|medium|high) resolution channel$", "", name, flags=re.I
        )
    return sorted(out, key=lambda c: c["name"].lower())


def motion_sensors(
    registry: list[dict], states: list[dict], cameras: list[str]
) -> dict[str, str]:
    """Each camera's motion sensor, as the integration's Track motion finds it: a
    binary_sensor of device class motion on the camera's device, else one named after
    the camera (binary_sensor.<camera, less its channel>_motion)."""
    classes = {
        s["entity_id"]: s.get("attributes", {}).get("device_class") for s in states
    }
    by_id = {e["entity_id"]: e for e in registry}

    def motion(e: dict) -> bool:
        cls = e.get("device_class") or e.get("original_device_class")
        return cls == "motion" or classes.get(e["entity_id"]) == "motion"

    out = {}
    for cam in cameras:
        device = (by_id.get(cam) or {}).get("device_id")
        found = [
            e["entity_id"]
            for e in registry
            if device
            and e.get("device_id") == device
            and e["entity_id"].startswith("binary_sensor.")
            and not e.get("disabled_by")
            and motion(e)
        ]
        named = f"binary_sensor.{CHANNEL.sub('', cam.split('.', 1)[1])}_motion"
        if not found and classes.get(named) == "motion":
            found = [named]
        if found:
            out[cam] = sorted(found)[0]
    return out


def checked(cameras: Any) -> Cams:
    """The cameras as sent by the page, checked; page controls with no entity dropped."""
    if not isinstance(cameras, dict):
        raise BadRequest("cameras must be an object.")
    out: Cams = {}
    for entity, cam in cameras.items():
        if not CAMERA.fullmatch(str(entity)):
            raise BadRequest(f"{entity} is not a camera.")
        if not isinstance(cam, dict) or not str(cam.get("title") or "").strip():
            raise BadRequest(f"{entity} needs a title.")
        cam = dict(cam)
        if isinstance(cam.get("controls"), list):
            cam["controls"] = [
                c
                for c in cam["controls"]
                if isinstance(c, dict) and str(c.get("entity") or "").strip()
            ]
            if not cam["controls"]:
                del cam["controls"]
        out[entity] = cam
    return out


class Cameras:
    def __init__(
        self,
        config_dir: Path,
        ha: HA | None,
        still: Callable[[str, int], bytes | None] | None = None,
    ) -> None:
        self.dir = config_dir
        self.ha = ha
        self.still = still  # a camera's still at a width, for the thumbnails
        self.listeners: list[Callable[[Cams], None]] = []  # told of every change
        self._lock = threading.Lock()
        self._error: str | None = None
        self._cameras: Cams = {}

    @property
    def path(self) -> Path:
        return self.dir / STORE

    def start(self) -> None:
        """Load the cameras; the first time, move them from the Camera Dashboard's store."""
        try:
            if self.path.exists():
                self._cameras = json.loads(self.path.read_text())
            elif (self.dir / OLD_STORE).exists():
                old = json.loads((self.dir / OLD_STORE).read_text()).get("cameras")
                self._cameras = old or {}
                self._write(self._cameras)
                _LOGGER.info(
                    "cameras: moved %d cameras from %s to %s (that file is left as it was)",
                    len(self._cameras),
                    OLD_STORE,
                    STORE,
                )
        except (OSError, ValueError, AttributeError) as exc:
            # Never overwrite a store we could not read.
            self._error = f"cannot read the cameras: {exc}"
            _LOGGER.error("cameras: %s", self._error)
            return
        _LOGGER.info("cameras: %d cameras", len(self._cameras))

    def cameras(self) -> Cams:
        with self._lock:
            return json.loads(json.dumps(self._cameras))  # a copy

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "state": "offline" if self._error else "running",
                "error": self._error,
                "cameras": len(self._cameras),
            }

    # -- the admin page's API

    def handle(
        self, method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> Response:
        parts = [p for p in path.strip("/").split("/") if p]
        try:
            if method == "GET" and parts == []:
                return _json(200, {"cameras": self.cameras(), "error": self._error})
            if method == "PUT" and parts == []:
                payload = json.loads(body or b"{}")
                if not isinstance(payload, dict):
                    raise BadRequest("Expected a JSON object.")
                return _json(200, {"cameras": self.save(payload.get("cameras"))})
            if method == "GET" and parts == ["ha"]:
                return _json(200, self.from_ha())
            if method == "GET" and len(parts) == 2 and parts[0] == "live":
                return _json(200, self.live_view(urllib.parse.unquote(parts[1])))
            if method == "GET" and len(parts) == 2 and parts[0] == "thumb":
                return self._thumb(urllib.parse.unquote(parts[1]))
        except BadRequest as exc:
            return _json(400, {"error": str(exc)})
        except HAError as exc:
            _LOGGER.warning("cameras: %s", exc)
            return _json(502, {"error": str(exc)})
        except ValueError:
            return _json(400, {"error": "Expected JSON."})
        return _json(404, {"error": "Not found."})

    def save(self, cameras: Any) -> Cams:
        new = checked(cameras)
        with self._lock:
            if self._error:
                raise BadRequest(f"{STORE} could not be read; fix it first.")
            before, self._cameras = self._cameras, new
            self._write(new)
        added = sorted(set(new) - set(before))
        removed = sorted(set(before) - set(new))
        changed = sorted(e for e in new if e in before and new[e] != before[e])
        _LOGGER.info(
            "cameras: saved %d (added: %s; removed: %s; changed: %s)",
            len(new),
            ", ".join(added) or "none",
            ", ".join(removed) or "none",
            ", ".join(changed) or "none",
        )
        for tell in self.listeners:
            tell(self.cameras())
        return self.cameras()

    def from_ha(self) -> dict[str, Any]:
        """HA's cameras (to add), their motion sensors, and its entities (for the fields)."""
        if self.ha is None:
            return {"error": "Home Assistant is not reachable."}
        registry, states = self.ha.call(
            {"type": "config/entity_registry/list"}, {"type": "get_states"}
        )
        return {
            "cameras": ha_cameras(registry, states),
            "motion": motion_sensors(registry, states, list(self.cameras())),
            "entities": sorted(
                (
                    {
                        "entity": s["entity_id"],
                        "name": s.get("attributes", {}).get("friendly_name")
                        or s["entity_id"],
                        "state": s.get("state"),
                    }
                    for s in states
                ),
                key=lambda e: e["entity"],
            ),
            "error": None,
        }

    def _thumb(self, entity: str) -> Response:
        """A small still of one camera, for the page's thumbnails (the page decides how
        often to ask)."""
        if not self.still:
            return _json(404, {"error": "No thumbnails: the compositor is off."})
        if not CAMERA.fullmatch(entity):
            return _json(400, {"error": "Not a camera."})
        try:
            image = self.still(entity, THUMB_WIDTH)
        except (RuntimeError, TimeoutError) as exc:
            return _json(502, {"error": f"The compositor: {exc}"})
        if image is None:
            return _json(404, {"error": f"No picture from {entity}."})
        return 200, "image/jpeg", image

    def live_view(self, entity: str) -> dict[str, Any]:
        """Where the page's live view plays a camera from: HA's own MJPEG stream of each
        of its channels, as HA's camera cards do it. The browser plays it from HA directly,
        with the camera's short-lived access token in the address (the Supervisor's proxy
        holds a response until it ends, so a stream can't pass through the app). And its
        motion sensor, if it has one, which the page then follows itself."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        cam = self.cameras().get(entity)
        if cam is None or not CAMERA.fullmatch(entity):
            raise BadRequest(f"{entity} is not one of the cameras.")
        channels = [
            (
                "low" if CHANNEL.search(entity) else "camera",
                entity,
            ),
            ("medium", cam.get("medium")),
            ("high", cam.get("high")),
        ]
        wanted = {e for _, e in channels if e}
        registry, states = self.ha.call(
            {"type": "config/entity_registry/list"}, {"type": "get_states"}
        )
        tokens = {
            s["entity_id"]: s.get("attributes", {}).get("access_token")
            for s in states
            if s["entity_id"] in wanted
        }
        out, seen = [], set()
        for name, e in channels:
            if not e or e in seen or not tokens.get(e):
                continue
            seen.add(e)
            out.append(
                {
                    "channel": name,
                    "entity": e,
                    "url": f"/api/camera_proxy_stream/{e}?token={tokens[e]}",
                }
            )
        _LOGGER.info(
            "cameras: live view of %s (%s)",
            entity,
            ", ".join(c["channel"] for c in out) or "no stream",
        )
        return {
            "channels": out,
            "motion": motion_sensors(registry, states, [entity]).get(entity),
        }

    def _write(self, cameras: Cams) -> None:
        """Save atomically."""
        tmp = self.path.with_name(self.path.name + ".tmp")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps(cameras, indent=1))
        tmp.replace(self.path)


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()
