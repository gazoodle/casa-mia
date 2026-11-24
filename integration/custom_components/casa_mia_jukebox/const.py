"""Jukebox's names, shared by its files."""

DOMAIN = "casa_mia_jukebox"
TITLE = "Jukebox"
ANNOUNCE = "announce"
PLAY = "play"
# Fired after each announcement, with what was asked and each room's result.
EVENT = "casa_mia_jukebox_announced"
# The Casa Mia app's, when a start changed any component's files (its components.py).
INSTALLED_EVENT = "casa_mia_components_installed"

CONF_PLAYERS = "players"
CONF_TTS = "tts"
CONF_CHIME = "chime"
CONF_QUIET = "quiet"
CONF_SIDEBAR = "sidebar"

# Where www/ is served, and the chime that comes with Jukebox (tools/jukebox_chime.py).
URL = f"/{DOMAIN}"
CHIME = f"{URL}/chime.wav"
# A room's announcement volume until its number is set.
DEFAULT_VOLUME = 25
