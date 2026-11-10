#!/usr/bin/env python3
"""Send a viewer's microphone to a UniFi Protect camera's speaker.

go2rtc runs this (an `exec:` microphone return path) while a browser is sending audio,
writes that audio to stdin as A-law at 8 kHz, and stops it when the audio stops. It
opens a Protect talkback session, then hands over to ffmpeg, which re-encodes stdin into
the session's codec and sends it to the session's URL. Standard library only: it runs
inside HA's container, in go2rtc's environment.

Usage: talk.py <secrets.json> <protect camera id>
secrets.json holds {"host": ..., "api_key": ...}, written by the integration.
"""

import json
import os
import ssl
import sys
import urllib.request

# ffmpeg's encoder and output format for each codec Protect's session may ask for.
ENCODERS = {
    "opus": (["-c:a", "libopus", "-application", "voip"], "rtp"),
    "aac": (["-c:a", "aac"], "adts"),
    "vorbis": (["-c:a", "libvorbis"], "ogg"),
}


def open_session(host: str, api_key: str, camera_id: str) -> dict:
    # The console uses a self-signed certificate.
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    request = urllib.request.Request(
        f"https://{host}/proxy/protect/integration/v1/cameras/{camera_id}/talkback-session",
        method="POST",
        headers={"X-API-KEY": api_key},
    )
    with urllib.request.urlopen(request, timeout=5, context=context) as answer:
        return json.load(answer)


def main(secrets_file: str, camera_id: str) -> int:
    with open(secrets_file, encoding="utf-8") as file:
        secrets = json.load(file)

    try:
        session = open_session(secrets["host"], secrets["api_key"], camera_id)
        codec = session["codec"]
        rate = str(session.get("samplingRate") or session["sampling_rate"])
        url = session["url"]
    except (OSError, ValueError, KeyError) as exc:
        # go2rtc logs our stderr; never print the session URL, which carries a token.
        print(
            f"talk.py: no talkback session for camera {camera_id}: {exc}",
            file=sys.stderr,
        )
        return 1
    if codec not in ENCODERS:
        print(
            f"talk.py: Protect asked for unsupported codec {codec!r}", file=sys.stderr
        )
        return 1

    encoder, output_format = ENCODERS[codec]
    # exec, so go2rtc's stop reaches ffmpeg directly and the session ends with it.
    os.execvp(
        "ffmpeg",
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-fflags",
            "nobuffer",
            "-flags",
            "low_delay",
            "-f",
            "alaw",
            "-ar",
            "8000",
            "-ac",
            "1",
            "-i",
            "-",
            *encoder,
            "-ar:a",
            rate,
            "-ac:a",
            "1",
            "-flush_packets",
            "1",
            "-f",
            output_format,
            url,
        ],
    )


if __name__ == "__main__":
    raise SystemExit(main(*sys.argv[1:3]))
