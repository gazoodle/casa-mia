"""Love it or Loathe it's constants."""

from .pure import IGNORE, LOATHE, LOVE

DOMAIN = "casa_mia_love_or_loathe"
TITLE = "Love it or Loathe it"
# Bus event on each match, for automations: the player, the track, the group and what
# was done about it.
EVENT = DOMAIN
# Bus event when somebody rates a song (rating.py): who, the feeling (love, loathe or
# clear), the song and the player. For automations, and for any page that announces it.
RATED_EVENT = f"{DOMAIN}_rated"
# Fired by the Casa Mia app when it has written newer files for its components: the
# moment to look for this one's restart marker (restart_notice.py).
INSTALLED_EVENT = "casa_mia_components_installed"

# The entry's options.
CONF_PLAYERS = "players"
# Who may rate songs here: the person entities whose loves and loathes count, and the
# logins (Home Assistant user ids) that may rate for one of them, such as a wall tablet's.
# Both empty until chosen, so nobody rates by default (owner, 2026-11-13).
CONF_RATERS = "raters"
CONF_SCREENS = "screens"
CONF_ENABLED = "enabled"  # off: the entry watches nothing (switch.py); on if absent
CONF_DELAY = "delay"  # seconds between a player reporting a track and it being heard
# On: a player switched to another station goes back when the song playing at the end of
# its minutes ends, not in the middle of it (owner, 2026-11-16). Off if absent.
CONF_BACK_AT_END = "back_at_end"
# Subentry ids in the order the page gave them (admin.py): the order groups settle a tie
# in, and stations are tried in. Home Assistant keeps them as made, and can't move one.
CONF_ORDER = "order"

# Subentry types: a group of songs, and a station to switch to.
GROUP = "group"
STATION = "station"

# A group's fields. Its feeling is what its select shows (select.py), kept here so that
# the form, the select and the rate action all change the one thing.
CONF_FEELING = "feeling"  # LOVE, LOATHE or IGNORE
CONF_BEFORE = (
    "before"  # its feeling before it was set to IGNORE: whose list it still is
)
CONF_PERSON = "person"  # the person entity whose ratings it collects
CONF_LIBRARY = "library"  # the shipped list a new group starts from (not kept)
CONF_PATTERNS = "patterns"
# Under LOVE and under LOATHE, what to do while the group is that:
CONF_ACTION = "action"
CONF_AMOUNT = "amount"
CONF_MINUTES = "minutes"
VOLUME = "volume"  # change it by a percentage until the next track
MUTE = "mute"  # until the next track
SWITCH = "switch"  # to another station, for some minutes
ONLY_EVENT = "event"  # nothing but the event
ACTIONS = (VOLUME, MUTE, SWITCH, ONLY_EVENT)
# What a new group is offered for each.
DEFAULT_ACTS = {
    LOVE: {CONF_ACTION: VOLUME, CONF_AMOUNT: 10, CONF_MINUTES: 5},
    LOATHE: {CONF_ACTION: MUTE, CONF_AMOUNT: -50, CONF_MINUTES: 5},
}

# The entry's strike (an option, beside the players): any song played CONF_TIMES times in
# the last CONF_HOURS hours gets the action that follows, however a group feels about the
# song (owner, 2026-11-15: "a repetition is a strike"). 0 times: no strike. Its switch,
# CONF_REPEATS_ON, turns it off and on without losing the numbers. Until 2026.11.8-b38
# each group had its own times and hours (__init__._convert moves them here).
CONF_REPEATS = "repeats"
CONF_REPEATS_ON = "repeats_on"  # on if absent
CONF_TIMES = "times"
CONF_HOURS = "hours"
DEFAULT_REPEATS = {CONF_TIMES: 0, CONF_HOURS: 4, **DEFAULT_ACTS[LOATHE]}
PLAYED_TOO_OFTEN = "Played too often"  # the strike's name, as a group's is shown

CLEAR = "clear"  # the rate action's third feeling: take the rating away
RATE = "rate"  # casa_mia_love_or_loathe.rate: add the song playing to a person's group

# A station's field: what media_player.play_media is given.
CONF_MEDIA = "media"

__all__ = ["IGNORE", "LOATHE", "LOVE"]
