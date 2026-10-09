"""camera_dashboard: The cameras as Home Assistant has them: channels, zoom, motion sensors."""

from __future__ import annotations

import re

from .common import CHANNEL, ZOOM

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
