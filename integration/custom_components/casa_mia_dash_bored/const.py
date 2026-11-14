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

# The label that keeps an entity, a device's entities or an area's off Dash-Bored's pages
# and nowhere else (hiding it in Home Assistant takes it off every dashboard). Made at
# set-up so that it is there to pick. The pages know it by the id Home Assistant derives
# from this name (HIDE in house.ts), which a later rename of the label does not change.
HIDE_LABEL = "Dash-Bored hide"

# The entry's options, which the pages know by these names (Options in house.ts).
CONF_FLOOR_ORDER = "floor_order"
CONF_ROOM_ORDER = "room_order"

# Websocket commands, any signed-in user's.
CARDS_VERSION = f"{DOMAIN}/cards"  # which version of cards.js is served
ALERTS = f"{DOMAIN}/alerts"  # the feed of Sensor Watch's alerts
SIGHTINGS = f"{DOMAIN}/sightings"  # the feed of what the cameras have seen
PERSONAL = f"{DOMAIN}/personal"  # the feed of the Personal column's announcements
SETTINGS = f"{DOMAIN}/settings"  # the feed of the house's settings (settings.py)
PLAYING = f"{DOMAIN}/playing"  # the feed of what the media players have played

# Sensor Watch's bus event, and the level it gives a sensor with nothing wrong. Named
# here and not imported: the two integrations meet only through Home Assistant, and each
# works without the other.
WATCH_EVENT = "casa_mia_sensor_watch"
NOMINAL = "nominal"
# Love it or Loathe it's bus event for a song somebody rated: named, not imported, as above.
RATED_EVENT = "casa_mia_love_or_loathe_rated"
