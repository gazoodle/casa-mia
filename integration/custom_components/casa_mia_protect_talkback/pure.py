"""Parts of Protect Talkback that don't need Home Assistant, so they can be tested alone."""

import hashlib
import json
import re
from pathlib import Path

import yaml

# First line of every config we amend, followed by a digest of what we added. The running
# go2rtc's config file is checked for it, so "applied" is proved from the live process,
# and for exactly the streams wanted now, not from a flag in our own memory.
MARKER = "# Amended by casa_mia_protect_talkback"
# go2rtc can't decode the browser's Opus, so the microphone reaches talk.py as A-law,
# the codec the browser and go2rtc agree on directly (tested 2026-11-05).
TALK_AUDIO = "alaw/8000"

Streams = dict[str, list[str]]  # go2rtc stream name -> its sources


def marker_line(talk_script: str, streams: Streams) -> str:
    wanted = json.dumps({"script": talk_script, "streams": streams}, sort_keys=True)
    return f"{MARKER} {hashlib.sha256(wanted.encode()).hexdigest()[:12]}"


def amend(text: str, talk_script: str, streams: Streams) -> str:
    """Give HA's go2rtc config our final say: allow the talk script, and define the
    talkback cameras' streams.

    go2rtc refuses `exec:` sources added through its API ("source from insecure
    producer", go2rtc 1.9.15 streams.Validate), so they can only come from the config
    file. HA's own config only allows `ffmpeg` to be executed. Everything else stays as
    HA wrote it.
    """
    config = yaml.safe_load(text)

    paths = config.setdefault("exec", {}).setdefault("allow_paths", [])
    if talk_script not in paths:
        paths.append(talk_script)
    if streams:
        config["streams"] = {**(config.get("streams") or {}), **streams}

    return f"{marker_line(talk_script, streams)}\n{yaml.safe_dump(config, sort_keys=False)}"


def first_line(config_file: str) -> str:
    with open(config_file, encoding="utf-8") as file:
        return file.readline().rstrip("\n")


def talkback_stream(identifier: str, stream_source: str, talk: str) -> list[str]:
    """The sources HA's go2rtc integration gives a camera's stream, plus the talk source.

    The first two copy HA 2026.11's `WebRTCProvider._update_stream_source()`. HA only
    replaces a stream when none of its sources equals the camera's stream_source, so it
    leaves this one alone.
    ponytail: ignores HA's per-camera orientation setting, which rewrites the source.
    """
    return [
        stream_source,
        f"ffmpeg:{identifier}#audio=opus#query=log_level=debug",
        talk,
    ]


def talk_source(talk_script: str, secrets_file: str, camera_id: str) -> str:
    """The go2rtc source that carries a viewer's microphone to one Protect camera.

    go2rtc only runs it while a browser sends audio, and stops it when that ends.
    """
    return f"exec:{talk_script} {secrets_file} {camera_id}#backchannel=1#audio={TALK_AUDIO}"


def getter_of(descriptor: object):
    """The function behind a property, or None.

    HA 2026.11 declares Camera.camera_entity_capabilities with propcache's
    cached_property, which keeps it in `.func`; a plain property keeps it in `.fget`.
    """
    function = getattr(descriptor, "func", None) or getattr(descriptor, "fget", None)
    return function if callable(function) else None


def normalise_mac(mac: str) -> str:
    """Protect's API gives "AABBCCDDEEFF"; HA's device registry "aa:bb:cc:dd:ee:ff"."""
    return re.sub(r"[^0-9a-f]", "", mac.lower())


def parent_pid(stat: str) -> int:
    """The parent pid from /proc/<pid>/stat: "pid (comm) state ppid ...".

    comm may itself contain spaces and ")", so split after the last ")".
    """
    return int(stat.rsplit(")", 1)[1].split()[1])


def go2rtc_children(parent: int, proc: Path = Path("/proc")) -> list[tuple[int, str]]:
    """(pid, config file) for each go2rtc started by `parent` with `-c <file>`.

    HA starts go2rtc as a direct child and keeps no reference we can reach, so the
    process table is the one place to find it without depending on HA internals.
    """
    found = []
    for entry in proc.iterdir():
        if not entry.name.isdigit():
            continue
        try:
            if parent_pid((entry / "stat").read_text()) != parent:
                continue
            argv = (entry / "cmdline").read_bytes().rstrip(b"\0").split(b"\0")
        except OSError:
            continue  # the process ended while we looked

        if Path(argv[0].decode()).name == "go2rtc" and b"-c" in argv[:-1]:
            found.append((int(entry.name), argv[argv.index(b"-c") + 1].decode()))
    return found
