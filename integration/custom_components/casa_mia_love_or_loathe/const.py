"""Love it or Loathe it's constants."""

DOMAIN = "casa_mia_love_or_loathe"
TITLE = "Love it or Loathe it"
# Bus event on each match, for automations: the player, the track, the group and what
# was done about it.
EVENT = DOMAIN
# Fired by the Casa Mia app when it has written newer files for its components: the
# moment to look for this one's restart marker (restart_notice.py).
INSTALLED_EVENT = "casa_mia_components_installed"

# The entry's options.
CONF_PLAYERS = "players"
CONF_DELAY = "delay"  # seconds between a player reporting a track and it being heard

# Subentry types: a group of songs, and a station to switch to.
GROUP = "group"
STATION = "station"

# A group's fields.
CONF_KIND = "kind"
CONF_LIBRARY = "library"
CONF_PATTERNS = "patterns"
CONF_ACTION = "action"
CONF_AMOUNT = "amount"
CONF_MINUTES = "minutes"
LOVE = "love"
LOATHE = "loathe"
VOLUME = "volume"  # change it by a percentage until the next track
MUTE = "mute"  # until the next track
SWITCH = "switch"  # to another station, for some minutes
ONLY_EVENT = "event"  # nothing but the event
ACTIONS = (VOLUME, MUTE, SWITCH, ONLY_EVENT)

# A station's field: what media_player.play_media is given.
CONF_MEDIA = "media"
