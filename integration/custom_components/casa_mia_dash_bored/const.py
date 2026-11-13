"""Dash-Bored's constants."""

DOMAIN = "casa_mia_dash_bored"
TITLE = "Dash-Bored"
# Fired by the Casa Mia app when it has written newer files for its components: the
# moment to look for this one's restart marker (restart_notice.py).
INSTALLED_EVENT = "casa_mia_components_installed"

URL = f"/{DOMAIN}"  # where www/ is served
PANEL = "dash-bored"  # the page's address in Home Assistant: /dash-bored
ELEMENT = (
    "dash-bored-gazette"  # the custom element cards.js defines, page and card both
)

# Websocket commands, any signed-in user's.
CARDS_VERSION = f"{DOMAIN}/cards"  # which version of cards.js is served
ALERTS = f"{DOMAIN}/alerts"  # the feed of Sensor Watch's alerts

# Sensor Watch's bus event, and the level it gives a sensor with nothing wrong. Named
# here and not imported: the two integrations meet only through Home Assistant, and each
# works without the other.
WATCH_EVENT = "casa_mia_sensor_watch"
NOMINAL = "nominal"
