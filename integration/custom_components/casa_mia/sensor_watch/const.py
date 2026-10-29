"""Sensor Watch's constants."""

MODULE = "sensor_watch"  # the app's module, in its /health, and its device here
# Bus event on each change of level (after its hold-off), for automations. Kept from
# when Sensor Watch was its own integration, so automations on it still work.
EVENT = "casa_mia_sensor_watch"
SERVICE = "sensor_watch_list"  # casa_mia.sensor_watch_list
REFRESH = "sensor_watch_refresh"  # casa_mia.sensor_watch_refresh (and its button)
# One entity's watch, now and at each change: the eye in its dialog (cards' watch-eye.ts).
ENTITY = "casa_mia/sensor_watch/entity"
# Sensor Watch was its own integration to 2026.10.10-b3; Casa Mia takes its entities on.
OLD_DOMAIN = "casa_mia_sensor_watch"
