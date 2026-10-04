#!/usr/bin/env python3
"""The app's version: YYYY.M.R for releases (as Home Assistant does: month unpadded), YYYY.M.R-bN for the
private builds on the way to one. pyproject.toml is the one source.

  bump     next build: 2026.10.1-b3 -> 2026.10.1-b4; after a release (or the old 0.1.x
           numbers) the first build of the next release, 2026.10.1 -> 2026.10.2-b1, or
           YYYY.M.1-b1 in a new month. Syncs app/config.yaml, adds the changelog heading.
  release  drop the -bN (the month of the release, if it has moved on) and merge the
           changelog sections of every build since the last release into one.
  notes V  print release V's changelog section (the GitHub release body).
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PYPROJECT = ROOT / "pyproject.toml"
CHANGELOG = ROOT / "app" / "CHANGELOG.md"
PYPROJECT_RE = re.compile(r'(?m)^version = "([^"]+)"$')
VERSION_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:-b(\d+))?$")
HEADING_RE = re.compile(r"(?m)^## (\S+)\n")


def parse(version: str) -> tuple[int, int, int, int | None]:
    match = VERSION_RE.match(version)
    if not match:
        raise ValueError(f"not a version: {version!r}")
    y, m, r, b = match.groups()
    return int(y), int(m), int(r), int(b) if b else None


def next_build(version: str, today: dt.date) -> str:
    y, m, r, b = parse(version)
    if b is not None:
        return f"{y}.{m}.{r}-b{b + 1}"
    if (y, m) == (today.year, today.month):
        return f"{y}.{m}.{r + 1}-b1"
    return f"{today.year}.{today.month}.1-b1"


def release_of(version: str, today: dt.date) -> str:
    y, m, r, b = parse(version)
    if b is None:
        raise ValueError(f"{version} is already a release")
    if (y, m) != (today.year, today.month):
        y, m, r = today.year, today.month, 1
    return f"{y}.{m}.{r}"


def sections(text: str) -> list[tuple[str, str]]:
    """(version, body) for each `## version` heading, in file order."""
    found = list(HEADING_RE.finditer(text))
    ends = [m.start() for m in found[1:]] + [len(text)]
    return [
        (m.group(1), text[m.end() : end]) for m, end in zip(found, ends, strict=True)
    ]


def merge_builds(text: str, release: str) -> str:
    """Replace the build sections at the top (everything since the last release) with one
    `## release` section holding all their notes, newest first."""
    first = HEADING_RE.search(text)
    head = text[: first.start()] if first else text
    builds, rest = [], sections(text)
    while rest and parse(rest[0][0])[3] is not None:
        builds.append(rest.pop(0))
    if not builds:
        raise ValueError("no build sections to release")
    notes = "\n".join(body.strip("\n") for _, body in builds if body.strip())
    tail = "".join(f"## {v}\n{body}" for v, body in rest)
    return f"{head}## {release}\n\n{notes}\n\n{tail}"


def notes(text: str, version: str) -> str:
    for v, body in sections(text):
        if v == version:
            return body.strip("\n") + "\n"
    raise ValueError(f"no '## {version}' in the changelog")


def current() -> str:
    match = PYPROJECT_RE.search(PYPROJECT.read_text(encoding="utf-8"))
    if not match:
        raise ValueError("pyproject.toml has no version")
    return match.group(1)


def add_heading(text: str, version: str) -> str:
    """The changelog with an empty `## version` section on top, for a new build."""
    title = text.index("\n## ") + 1 if "\n## " in text else len(text)
    return f"{text[:title]}## {version}\n\n{text[title:]}"


def write(version: str, root: Path = ROOT) -> None:
    """Set the version in pyproject.toml and app/config.yaml."""
    for name, regex, line in (
        ("pyproject.toml", PYPROJECT_RE, f'version = "{version}"'),
        (
            "app/config.yaml",
            re.compile(r'(?m)^version: "[^"]+"$'),
            f'version: "{version}"',
        ),
    ):
        path = root / name
        path.write_text(
            regex.sub(line, path.read_text(encoding="utf-8"), count=1), encoding="utf-8"
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("bump", "release", "notes"))
    parser.add_argument("version", nargs="?")
    args = parser.parse_args()
    today = dt.date.today()
    log = CHANGELOG.read_text(encoding="utf-8")
    if args.action == "notes":
        sys.stdout.write(notes(log, args.version or current()))
        return 0
    if args.action == "bump":
        new = next_build(current(), today)
        CHANGELOG.write_text(add_heading(log, new), encoding="utf-8")
    else:
        new = release_of(current(), today)
        CHANGELOG.write_text(merge_builds(log, new), encoding="utf-8")
    write(new)
    print(new)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
