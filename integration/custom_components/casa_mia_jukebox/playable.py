"""What the device in someone's hand can play of what a Sonos speaker lists, and where
it is fetched from. Nothing here imports Home Assistant, so it is tested by itself;
phone.py does the asking.

A speaker addresses everything in its own way. A phone's browser plays three kinds:

- a song from Spotify (`x-sonos-spotify:spotify%3atrack%3a…`), by Spotify's own player
  in the page, which takes the song's Spotify name (`spotify:track:…`);
- a file of the music library (`x-file-cifs://server/share/…`), once that share is
  among Home Assistant's media, by a link to it there;
- a radio station, by its stream's web address. A station from TuneIn
  (`x-sonosapi-stream:s1234…`) is known to Sonos by a number, which TuneIn turns into
  the address.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from pathlib import Path
from typing import Any
from urllib.parse import unquote

FILE = "x-file-cifs:"
# What of a song's listing (upnp._song) the page is sent.
_SHOWN = ("title", "artist", "album", "duration", "picture", "source")
# The kinds of stream every phone's browser plays. HLS plays in Safari alone.
_PLAIN = ("mp3", "aac")


def spotify(address: str) -> tuple[str, str] | None:
    """The kind and Spotify's own name of a thing from Spotify, however a speaker or
    Home Assistant wrote its address: ("track", "spotify:track:4uLU6h…")."""
    found = re.search(r"spotify:(track|album|playlist|artist):(\w+)", unquote(address))
    return (found[1], found[0]) if found else None


def track(song: Mapping[str, Any]) -> dict[str, Any] | None:
    """A song as a speaker lists it, as the page plays it on a phone: `uri` is what
    the phone's player is given. None for a song from a service a phone can't play."""
    address = str(song["address"])
    found = spotify(address)
    if found and found[0] == "track":
        uri = found[1]
    elif address.startswith(FILE):
        uri = address
    else:
        return None
    return {key: song[key] for key in _SHOWN} | {"uri": uri}


def direct(address: str) -> str | None:
    """A station's web address, where the speaker's own address holds it
    (`x-rincon-mp3radio://https://example.com/stream`)."""
    found = re.match(r"(?:x-rincon-mp3radio|aac|hls-radio)://(.+)", address)
    if not found:
        return None
    rest = found[1]
    return rest if rest.startswith(("http://", "https://")) else f"http://{rest}"


def tunein(address: str) -> str | None:
    """TuneIn's number for a station (`s1234`), from the speaker's address for it."""
    found = re.match(r"x-sonosapi-(?:stream|hls|radio):(s\d+)", address)
    return found[1] if found else None


def chosen(body: Any) -> tuple[str, bool] | None:
    """Of the streams TuneIn offers for a station, the one to play: its address, and
    whether that is the stream itself (otherwise it is a list to read: `listed`)."""
    offered = [
        one
        for one in (body if isinstance(body, list) else [])
        if isinstance(one, dict) and one.get("url")
    ]
    if not offered:
        return None
    best = next((one for one in offered if one.get("media_type") in _PLAIN), offered[0])
    return str(best["url"]), bool(best.get("is_direct", True))


def listed(text: str) -> str | None:
    """The first stream of a list of them, as stations publish (.m3u or .pls)."""
    for line in text.splitlines():
        line = line.strip()
        if line.lower().startswith("file") and "=" in line:
            line = line.partition("=")[2].strip()
        if line.startswith(("http://", "https://")):
            return line
    return None


def placed(
    dirs: Mapping[str, str], address: str, known: dict[str, tuple[str, str]]
) -> tuple[str, str] | None:
    """Where a file of the music library is among Home Assistant's media: the media
    folder's name and the path within it. `dirs` is Home Assistant's media folders by
    name. Reads the disk, so not for the event loop.

    A speaker knows the file as `x-file-cifs://server/share/artist/song.mp3`; Home
    Assistant has the same share mounted under a name the owner chose. So the path
    within the share is looked for under each media folder and each folder one level
    inside it, with and without the share's own name. Where a share turned out to be
    is kept in `known`, and looked for once."""
    parts = [unquote(part) for part in address.partition("://")[2].split("/")]
    # A server, a share and a path within it, which never climbs out of the share.
    if len(parts) < 3 or any(part in ("", ".", "..") for part in parts[2:]):
        return None
    server, share, *rest = parts
    within = Path(*rest)

    key = f"{server}/{share}"
    if key in known:
        name, base = known[key]
        found = name in dirs and (Path(dirs[name]) / base / within).is_file()
        return (name, (Path(base) / within).as_posix()) if found else None

    for name, root in dirs.items():
        top = Path(root)
        try:
            inside = sorted(p for p in top.iterdir() if p.is_dir())
        except OSError:
            continue  # a media folder that isn't there
        for base in (top, *inside):
            for start in (base, base / share):
                if (start / within).is_file():
                    known[key] = (name, start.relative_to(top).as_posix())
                    return name, (start / within).relative_to(top).as_posix()
    return None
