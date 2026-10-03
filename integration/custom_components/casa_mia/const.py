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
