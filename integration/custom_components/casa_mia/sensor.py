"""Sensors: the app version, the tablet firmware server (gitproxy), guest login,
phone and SMS (fona), and the camera compositor's cache (its pictures, its size) and
health (its verdict on the whole system, and what to do)."""

from __future__ import annotations

from datetime import datetime

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    PERCENTAGE,
    SIGNAL_STRENGTH_DECIBELS_MILLIWATT,
    EntityCategory,
    UnitOfInformation,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .coordinator import CasaMiaCoordinator
from .guest import GuestEndpointEntity, add_endpoint_entities, guest_module


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        only_on(
            coordinator,
            [
                AppVersionSensor(coordinator, entry),
                GitProxyStateSensor(coordinator, entry),
                GitProxyLatestSensor(coordinator, entry),
                GitProxyBytesSensor(coordinator, entry),
                GitProxyPercentSensor(coordinator, entry),
                GuestStateSensor(coordinator, entry),
                FonaStateSensor(coordinator, entry),
                FonaSignalSensor(coordinator, entry),
                FonaSignalQualitySensor(coordinator, entry),
                CachePicturesSensor(coordinator, entry),
                CacheSizeSensor(coordinator, entry),
                CompositorHealthSensor(coordinator, entry),
            ],
        )
    )
    add_endpoint_entities(
        coordinator,
        entry,
        async_add_entities,
        lambda i: [
            GuestLastLoginSensor(coordinator, entry, i),
            GuestLoginsSensor(coordinator, entry, i),
        ],
    )


# Device name per module ({house}: the app's house_name); add a line when a module gets
# entities.
MODULE_DEVICES = {
    "alarm": "{house} alarm",
    "fona": "FONA",
    "gitproxy": "Firmware server",
    "guest_login": "Guest login",
    "camera_dashboard": "Camera Commander",
    "compositor": "Camera compositor",
}


def device_name(coordinator: CasaMiaCoordinator, module: str) -> str:
    """A module's device name; the alarm is named after the house (Villa Rosa alarm)."""
    house = coordinator.data.get("house") or "Casa Mia"
    return MODULE_DEVICES[module].format(house=house)


def modules_off(coordinator: CasaMiaCoordinator) -> set[str]:
    """Modules the app reports switched off. Their devices and entities are not created
    (and are removed); a module the app does not mention at all is left alone."""
    health = coordinator.data.get("modules", {})
    return {m for m in MODULE_DEVICES if health.get(m, {}).get("state") == "disabled"}


def only_on(coordinator: CasaMiaCoordinator, entities: list) -> list:
    """The entities whose module is not switched off."""
    off = modules_off(coordinator)
    return [e for e in entities if getattr(e, "_module", None) not in off]


class CasaMiaEntity(CoordinatorEntity[CasaMiaCoordinator]):
    """Base for every Casa Mia entity. Entities with `_module` set live on that module's
    own device (linked to the app device); the rest live on the app device."""

    _attr_has_entity_name = True
    _module: str | None = None

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        app = (DOMAIN, entry.entry_id)
        if self._module is None:
            self._attr_device_info = DeviceInfo(
                identifiers={app}, name="Casa Mia app", manufacturer="Casa Mia"
            )
        else:
            self._attr_device_info = DeviceInfo(
                identifiers={(DOMAIN, f"{entry.entry_id}_{self._module}")},
                name=device_name(coordinator, self._module),
                manufacturer="Casa Mia",
                via_device=app,
            )

    @property
    def gitproxy(self) -> dict:
        """The gitproxy module's health from /health (empty if the app lacks it)."""
        return self.coordinator.data.get("modules", {}).get("gitproxy", {})


class AppVersionSensor(CasaMiaEntity, SensorEntity):
    _attr_translation_key = "app_version"
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_app_version"

    @property
    def native_value(self) -> str | None:
        return self.coordinator.data.get("version")


class GitProxyStateSensor(CasaMiaEntity, SensorEntity):
    _module = "gitproxy"
    """Is the tablet firmware server serving? Attributes carry the last check and any error."""

    _attr_translation_key = "gitproxy_state"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = ["running", "offline", "disabled"]

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_gitproxy_state"

    @property
    def native_value(self) -> str | None:
        return self.gitproxy.get("state")

    @property
    def extra_state_attributes(self) -> dict:
        g = self.gitproxy
        return {k: g.get(k) for k in ("last_check", "error", "port")}


class GitProxyLatestSensor(GitProxyStateSensor):
    """The newest tablet firmware version being served."""

    _attr_translation_key = "gitproxy_latest"
    _attr_device_class = None
    _attr_options = None
    extra_state_attributes = None  # type: ignore[assignment]

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_gitproxy_latest"

    @property
    def native_value(self) -> str | None:
        return self.gitproxy.get("latest")


class GitProxyBytesSensor(GitProxyLatestSensor):
    """Bytes downloaded for the release being fetched; resets when a new release starts."""

    _attr_translation_key = "gitproxy_bytes"
    _attr_device_class = SensorDeviceClass.DATA_SIZE
    _attr_native_unit_of_measurement = UnitOfInformation.BYTES
    _attr_suggested_unit_of_measurement = UnitOfInformation.MEGABYTES
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_gitproxy_bytes"

    @property
    def native_value(self) -> int | None:
        return self.gitproxy.get("downloaded_bytes")

    @property
    def extra_state_attributes(self) -> dict:
        return {"total_bytes": self.gitproxy.get("total_bytes")}


class GitProxyPercentSensor(GitProxyBytesSensor):
    _attr_translation_key = "gitproxy_percent"
    _attr_device_class = None
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_suggested_unit_of_measurement = None

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_gitproxy_percent"

    @property
    def native_value(self) -> float | None:  # type: ignore[override]
        return self.gitproxy.get("downloaded_percent")


class GuestStateSensor(CasaMiaEntity, SensorEntity):
    """Is the guest login server serving? Attribute `error` carries any problem."""

    _module = "guest_login"
    _attr_translation_key = "guest_state"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = ["running", "offline", "disabled"]

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_guest_state"

    @property
    def native_value(self) -> str | None:
        return guest_module(self.coordinator).get("state")

    @property
    def extra_state_attributes(self) -> dict:
        g = guest_module(self.coordinator)
        return {"port": g.get("port"), "error": g.get("error")}


class FonaStateSensor(CasaMiaEntity, SensorEntity):
    """Is the FONA up? Attributes carry the port, firmware and any error."""

    _module = "fona"
    _attr_translation_key = "fona_state"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = ["connected", "starting", "offline", "disabled"]

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fona_state"

    @property
    def fona(self) -> dict:
        return self.coordinator.data.get("modules", {}).get("fona", {})

    @property
    def native_value(self) -> str | None:
        return self.fona.get("state")

    @property
    def extra_state_attributes(self) -> dict:
        f = self.fona
        keys = (
            "error",
            "port",
            "firmware",
            "last_call",
            "last_call_from",
            "last_text",
            "last_text_from",
            "queued",
        )
        return {k: f.get(k) for k in keys}


class FonaSignalSensor(FonaStateSensor):
    """GSM signal strength, read hourly."""

    _attr_translation_key = "fona_signal"
    _attr_device_class = SensorDeviceClass.SIGNAL_STRENGTH
    _attr_options = None
    _attr_native_unit_of_measurement = SIGNAL_STRENGTH_DECIBELS_MILLIWATT
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    extra_state_attributes = None  # type: ignore[assignment]

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fona_signal"

    @property
    def native_value(self) -> int | None:  # type: ignore[override]
        return self.fona.get("rssi_dbm")


class FonaSignalQualitySensor(FonaStateSensor):
    """The signal as a word: excellent, good, ok, bad, terrible (GSM RSSI bands)."""

    _attr_translation_key = "fona_signal_quality"
    _attr_options = ["excellent", "good", "ok", "bad", "terrible"]
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    extra_state_attributes = None  # type: ignore[assignment]

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_fona_signal_quality"

    @property
    def native_value(self) -> str | None:
        return self.fona.get("signal")


class GuestLastLoginSensor(GuestEndpointEntity, SensorEntity):
    _attr_translation_key = "last_login"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, endpoint_id: str
    ) -> None:
        super().__init__(coordinator, entry, endpoint_id)
        self._attr_unique_id = f"{entry.entry_id}_guest_{endpoint_id}_last_login"

    @property
    def native_value(self) -> datetime | None:
        return dt_util.parse_datetime(self.endpoint.get("last_login") or "")


class GuestLoginsSensor(GuestEndpointEntity, SensorEntity):
    _attr_translation_key = "logins"
    _attr_state_class = SensorStateClass.TOTAL_INCREASING

    def __init__(
        self, coordinator: CasaMiaCoordinator, entry: ConfigEntry, endpoint_id: str
    ) -> None:
        super().__init__(coordinator, entry, endpoint_id)
        self._attr_unique_id = f"{entry.entry_id}_guest_{endpoint_id}_logins"

    @property
    def native_value(self) -> int | None:
        return self.endpoint.get("logins")


class CachePicturesSensor(CasaMiaEntity, SensorEntity):
    """The camera compositor's cache: the pictures in it (the cameras' and the
    composites'); the parts as attributes."""

    _module = "compositor"
    _attr_translation_key = "cache_pictures"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_{self._attr_translation_key}"

    @property
    def cache(self) -> dict:
        health = self.coordinator.data.get("modules", {}).get("compositor", {})
        return health.get("cache") or {}

    @property
    def available(self) -> bool:
        return super().available and bool(self.cache)

    @property
    def native_value(self) -> int | None:
        return self.cache.get("pictures")

    @property
    def extra_state_attributes(self) -> dict:
        return {
            k: self.cache.get(k)
            for k in ("cameras", "waiting", "composites", "thumbnails")
        }


class CacheSizeSensor(CachePicturesSensor):
    """The memory the camera compositor's cache takes."""

    _attr_translation_key = "cache_size"
    _attr_device_class = SensorDeviceClass.DATA_SIZE
    _attr_native_unit_of_measurement = UnitOfInformation.MEGABYTES
    _attr_suggested_display_precision = 1

    @property
    def native_value(self) -> float | None:  # type: ignore[override]
        size = self.cache.get("bytes")
        return None if size is None else round(size / 1_000_000, 2)

    @property
    def extra_state_attributes(self) -> None:  # type: ignore[override]
        return None


class CompositorHealthSensor(CasaMiaEntity, SensorEntity):
    """The camera compositor's verdict on the whole system, judged on the last 30 s:
    a state to automate on (its streams failed: restart the gatherer, say), and the
    headline and advice in words, as attributes. The app's HEALTH_STATES."""

    _module = "compositor"
    _attr_translation_key = "compositor_health"
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = [
        "go2rtc_down",
        "streams_failing",
        "paused",
        "cpu_gathering",
        "cpu_drawing",
        "drawing_behind",
        "network",
        "slow_link",
        "idle",
        "fine",
    ]

    def __init__(self, coordinator: CasaMiaCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_{self._attr_translation_key}"

    @property
    def verdict(self) -> dict:
        health = self.coordinator.data.get("modules", {}).get("compositor", {})
        return health.get("health") or {}

    @property
    def available(self) -> bool:
        return super().available and bool(self.verdict)

    @property
    def native_value(self) -> str | None:
        return self.verdict.get("state")

    @property
    def extra_state_attributes(self) -> dict:
        return {k: self.verdict.get(k) for k in ("tone", "headline", "advice")}
