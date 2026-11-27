"""The parts of Jukebox that need no Home Assistant: what an announcement plays, and
following a clip on a speaker from the speaker's own reports.

A Sonos speaker reports its clips over its local websocket as `audioClipStatus` messages.
Measured on real speakers, 2026-11-23:

- A clip sent while another plays cuts the first off (`INTERRUPTED`): Sonos does not line
  them up, so Jukebox does, and needs to know when each has ended.
- The first report after subscribing is the speaker's last clip, already `DONE`, from
  whenever that was. Home Assistant doesn't hand back the id of the clip it sent, so ours
  is the first one that wasn't in that report.
"""

from __future__ import annotations

from urllib.parse import urlsplit

# A room's result.
PLAYED = "played"
QUIET = "quiet_hours"
UNAVAILABLE = "unavailable"
NOT_SONOS = "not_sonos"
NO_CLIPS = "no_audio_clips"
NO_ANSWER = "no_answer"
TOO_LATE = "too_late"
INTERRUPTED = "interrupted"
FAILED = "failed"

# The whole announcement's: every room, some, or none. A room in quiet hours was not
# meant to play, so it counts for neither.
ALL, PARTLY, NOTHING = "played", "partly", "nothing"

# A clip's statuses that are not its end.
_GOING = {"ACTIVE", "QUEUED"}
_ENDS = {"DONE": PLAYED, "INTERRUPTED": INTERRUPTED}


def clips(chime: str, media: str, said: str) -> list[str]:
    """What one announcement plays, in order: `said` is the message's media id. Empty
    strings are left out."""
    return [clip for clip in (chime, media, said) if clip]


def address(configuration_url: str | None) -> str | None:
    """A speaker's address, from the link Home Assistant's Sonos integration gives its
    device (`http://<address>:1400/...`)."""
    return urlsplit(configuration_url or "").hostname


def has_clips(info: dict) -> bool:
    """Whether a speaker can play a clip over what it is playing. An S1 speaker can't."""
    return "AUDIO_CLIP" in info.get("device", info).get("capabilities", ())


class Watch:
    """Follows one clip through a speaker's reports. Give it every report in turn:
    the first only says which clips are old; after that it answers with our clip's
    result once it has ended."""

    def __init__(self) -> None:
        self.old: set[str] | None = None

    @property
    def ready(self) -> bool:
        return self.old is not None

    def feed(self, body: dict) -> str | None:
        if "audioClips" not in body:
            return None
        if self.old is None:
            self.old = {clip["id"] for clip in body["audioClips"]}
            return None

        for clip in body["audioClips"]:
            if clip["id"] not in self.old and clip.get("status") not in _GOING:
                return _ENDS.get(clip.get("status"), FAILED)
        return None


def summary(rooms: dict[str, str]) -> str:
    """One word for a whole announcement, from each room's result."""
    meant = [result for result in rooms.values() if result != QUIET]
    played = meant.count(PLAYED)
    if meant and played == len(meant):
        return ALL
    return PARTLY if played else NOTHING
