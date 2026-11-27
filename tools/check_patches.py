#!/usr/bin/env python3
"""Check Casa Mia's patches into Home Assistant against a new Home Assistant release.

Casa Mia Intercom and Casa Mia Protect Talkback replace parts of Home Assistant's own code
(their patches.py). The releases they were checked against are recorded once, in
casa_mia/patching.py (CHECKED), and on any other release each logs a warning. This
downloads the newest release checked and a new one (the newest on PyPI unless given),
compares the files the patches reach into, and prints what changed.

- Nothing changed: it records the new release as checked.
- Something changed: read it against each patches.py. When the patches still hold, run
  it again with --accept to record the release; when they don't, fix them first.

Recording changes integration/, so bump the version first (CLAUDE.md, RULE ZERO), and
run tools/component_versions.py --update after.

    .venv/bin/python tools/check_patches.py [VERSION] [--accept]
"""

from __future__ import annotations

import difflib
import io
import json
import re
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from collections.abc import Mapping
from pathlib import Path

from packaging.version import Version

ROOT = Path(__file__).resolve().parents[1]
PATCHING = ROOT / "integration/custom_components/casa_mia/patching.py"
CHECKED = re.compile(r'^CHECKED = \("([^"]+)", "([^"]+)"\)$', re.M)

# Every file of Home Assistant's that the patches replace something in or import from.
# A patch that reaches into a new file adds it here.
FILES = (
    "homeassistant/components/go2rtc/__init__.py",  # WebRTCProvider: offers, sessions, streams
    "homeassistant/components/go2rtc/server.py",  # _create_temp_file, Server._start
    "homeassistant/components/go2rtc/util.py",  # get_camera_identifier
    "homeassistant/components/camera/__init__.py",  # Camera, its capabilities
    "homeassistant/components/camera/const.py",  # DATA_COMPONENT
    "homeassistant/components/camera/webrtc.py",  # WebRTCError
    "homeassistant/components/websocket_api/connection.py",  # current_connection
    "homeassistant/components/unifiprotect/camera.py",  # ProtectCamera
)


def checked(text: str) -> tuple[str, str]:
    """The oldest and newest releases checked, from patching.py's text."""
    found = CHECKED.search(text)
    if not found:
        raise SystemExit(f"no CHECKED = (...) line in {PATCHING}")
    return found[1], found[2]


def recorded(text: str, newest: str) -> str:
    """patching.py's text with `newest` as the newest release checked."""
    oldest, _ = checked(text)
    return CHECKED.sub(f'CHECKED = ("{oldest}", "{newest}")', text)


def changes(old: Mapping[str, str | None], new: Mapping[str, str | None]) -> list[str]:
    """A unified diff of each file that differs between two releases (None: not there)."""
    out: list[str] = []
    for name in FILES:
        a, b = old.get(name), new.get(name)
        if a == b:
            continue
        if a is None or b is None:
            out.append(f"{name}: {'added' if a is None else 'gone'}\n")
            continue
        out += difflib.unified_diff(
            a.splitlines(keepends=True),
            b.splitlines(keepends=True),
            f"{name} (old)",
            f"{name} (new)",
        )
    return out


def newest_release() -> str:
    request = urllib.request.Request(
        "https://pypi.org/pypi/homeassistant/json",
        headers={"User-Agent": "casa-mia-check-patches"},
    )
    with urllib.request.urlopen(request, timeout=20) as answer:
        return json.load(answer)["info"]["version"]


def sources(version: str, into: Path) -> dict[str, str | None]:
    """The FILES of one Home Assistant release, read from its wheel."""
    # The wheel is pure Python, read and never run, so the Python it asks for (newer than
    # this venv's, and it moves) doesn't matter.
    done = subprocess.run(
        [
            sys.executable,
            *("-m", "pip", "download", "-q", "--no-deps", "--only-binary=:all:"),
            *("--ignore-requires-python", "-d", str(into)),
            f"homeassistant=={version}",
        ],
        capture_output=True,
        text=True,
    )
    if done.returncode:
        said = "\n".join(done.stderr.strip().splitlines()[-2:])
        raise SystemExit(f"Couldn't download Home Assistant {version}:\n{said}")
    (wheel,) = into.glob(f"homeassistant-{version}-*.whl")
    with zipfile.ZipFile(wheel) as z:
        there = set(z.namelist())
        return {
            name: io.TextIOWrapper(z.open(name), encoding="utf-8").read()
            if name in there
            else None
            for name in FILES
        }


def main(argv: list[str]) -> int:
    accept = "--accept" in argv
    asked = [a for a in argv if not a.startswith("--")]
    text = PATCHING.read_text()
    oldest, newest = checked(text)
    version = asked[0] if asked else newest_release()
    if Version(version) <= Version(newest):
        print(
            f"Home Assistant {version} is not newer than {newest}, the newest checked."
        )
        return 0

    print(f"Comparing Home Assistant {newest} (the newest checked) with {version}...")
    with tempfile.TemporaryDirectory() as tmp:
        old = sources(newest, Path(tmp) / "old")
        new = sources(version, Path(tmp) / "new")
    diff = changes(old, new)

    if diff and not accept:
        sys.stdout.writelines(diff)
        print(
            "\nThe files the patches reach into changed. Read the changes against "
            "casa_mia_intercom/patches.py and casa_mia_protect_talkback/patches.py; when "
            "the patches still hold, run again with --accept."
        )
        return 1

    PATCHING.write_text(recorded(text, version))
    print(
        f"{'Accepted' if diff else 'No changes'}: recorded {oldest} to {version} as checked "
        f"in {PATCHING.relative_to(ROOT)}. Bump the version first if this build hasn't "
        f"been, then run tools/component_versions.py --update."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
