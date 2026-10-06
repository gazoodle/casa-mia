"""Constants for the Casa Mia integration."""

DOMAIN = "casa_mia"
# Must match the app's `API_VERSION` (app/src/casa_mia/server.py); a mismatch is a Repair.
API_VERSION = 1
# Bus event the app fires on each guest login (app/src/casa_mia/modules/guest_login.py: EVENT).
GUEST_LOGIN_EVENT = "casa_mia_guest_login"
# Bus event the app fires for each call or text on the FONA, authorised or not
# (app/src/casa_mia/modules/fona.py: EVENT).
FONA_EVENT = "casa_mia_fona"
# Options key: the code the alarm panel asks for (no default; unset refuses arm/disarm).
CONF_ALARM_CODE = "alarm_code"
# The dashboard helper scripts the integration loads into HA's frontend (www/), switched
# on the app's Settings page (its "helpers" section): key -> (file, on by default, for an
# app from before they moved there). Back and refresh start off: a box may run its own
# copies, and two Back helpers would go back twice.
SCRIPTS = {
    "streams": ("cm-streams.js", True),
    "back": ("cm-back.js", False),
    "refresh": ("cm-refresh.js", False),
}
SCRIPTS_URL = "/casa_mia"
# The Lovelace cards (Camera Commander, Section, Tablet Layout), built from
# integration/cards by tools/build_cards; always loaded, an unused card does nothing.
CARDS_JS = "cm-cards.js"
