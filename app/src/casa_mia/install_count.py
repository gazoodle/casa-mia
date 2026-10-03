"""The install count: once per version, fetch that release's notes from GitHub. GitHub
counts the download, and that number is the Downloads badge on the project's page. It sends
nothing about the house; GitHub sees only the box's address, as for any download. Off with
the `count_install` option."""

from __future__ import annotations

import logging
from pathlib import Path

from .download import fetch, prune

_LOGGER = logging.getLogger(__name__)

NOTES_URL = (
    "https://github.com/gazoodle/casa-mia/releases/download/{version}/release-notes.md"
)


def count_install(version: str, folder: Path, url: str = NOTES_URL) -> bool:
    """True if this version's notes were downloaded now (so counted). Never raises."""
    if "-" in version:  # a build (2026.10.1-b3): it has no GitHub release
        _LOGGER.info("install count: build %s has no release to count", version)
        return False
    dest = folder / f"{version}.md"
    if dest.exists():
        _LOGGER.info("install count: %s already counted", version)
        return False
    try:
        folder.mkdir(parents=True, exist_ok=True)
        fetch(url.format(version=version), dest)
    except OSError as exc:
        _LOGGER.warning(
            "install count: %s not counted (%s); next start tries again", version, exc
        )
        return False
    prune(folder, "*.md", lambda path: path == dest)
    _LOGGER.info("install count: %s counted, thank you", version)
    return True
