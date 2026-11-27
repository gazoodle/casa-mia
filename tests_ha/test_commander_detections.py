"""The event entities on a commander camera's device (casa_mia_commander/detections.py),
found by the tracker that finds its motion sensors and kept current by the entity
registry's events, for the Main camera select's `detections` attribute."""

from types import SimpleNamespace

from custom_components.casa_mia_commander.motion import MotionTracker
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

CAMERA = "camera.garden_gate_high_resolution_channel"


def _tracker(hass) -> MotionTracker:
    """A tracker for one commander showing the camera, on a stand-in coordinator."""
    one = {"id": "", "name": "Cameras", "cameras": {CAMERA: "Garden gate"}}
    coordinator = SimpleNamespace(
        data={"modules": {"commander": {"commanders": [one]}}}
    )
    return MotionTracker(hass, coordinator, "")  # type: ignore[arg-type]


def _device(hass, name: str) -> tuple[MockConfigEntry, dr.DeviceEntry]:
    entry = MockConfigEntry(domain="test")
    entry.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={("test", name)}
    )
    return entry, device


def _entity(hass, domain: str, name: str, at, **kw) -> str:
    entry, device = at
    return (
        er.async_get(hass)
        .async_get_or_create(
            domain,
            "test",
            name,
            config_entry=entry,
            device_id=device.id,
            suggested_object_id=name,
            **kw,
        )
        .entity_id
    )


async def test_the_cameras_enabled_event_entities_are_found(hass):
    gate = _device(hass, "gate")
    _entity(hass, "camera", "garden_gate_high_resolution_channel", gate)
    person = _entity(
        hass, "event", "gate_object", gate, translation_key="smart_detection"
    )
    ring = _entity(hass, "event", "gate_ring", gate, translation_key="doorbell")
    plain = _entity(hass, "event", "gate_plain", gate)  # no translation key
    _entity(
        hass,
        "event",
        "gate_sound",
        gate,
        translation_key="sound_detection",
        disabled_by=er.RegistryEntryDisabler.USER,
    )
    _entity(
        hass, "event", "shed_ring", _device(hass, "shed"), translation_key="doorbell"
    )
    tracker = _tracker(hass)

    tracker.refresh()

    assert tracker.detections == {
        CAMERA: {person: "smart_detection", ring: "doorbell", plain: ""}
    }
    tracker.unload()


async def test_a_camera_with_none_has_no_key(hass):
    _entity(
        hass, "camera", "garden_gate_high_resolution_channel", _device(hass, "gate")
    )
    tracker = _tracker(hass)

    tracker.refresh()

    assert tracker.detections == {}
    tracker.unload()


async def test_one_added_later_is_found_at_once_and_redraws_the_select(hass):
    gate = _device(hass, "gate")
    _entity(hass, "camera", "garden_gate_high_resolution_channel", gate)
    tracker = _tracker(hass)
    tracker.refresh()
    redrawn: list[dict] = []
    tracker.found.append(lambda: redrawn.append(dict(tracker.detections)))

    ring = _entity(hass, "event", "gate_ring", gate, translation_key="doorbell")
    await hass.async_block_till_done()

    # Once, with no report from the app.
    assert redrawn == [{CAMERA: {ring: "doorbell"}}]

    tracker.unload()  # and no longer followed
    _entity(hass, "event", "gate_object", gate, translation_key="smart_detection")
    await hass.async_block_till_done()
    assert tracker.detections == {CAMERA: {ring: "doorbell"}}
