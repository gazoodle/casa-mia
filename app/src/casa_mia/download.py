"""Downloading release files and dropping old ones: shared by the firmware server (the
tablets' APKs) and the install count (this app's release notes)."""

from __future__ import annotations

import logging
import urllib.request
from collections.abc import Callable
from pathlib import Path

_LOGGER = logging.getLogger(__name__)

TIMEOUT = 60


def fetch(url: str, dest: Path, on_chunk: Callable[[int], None] | None = None) -> None:
    """Via a .part file, so a crash can't leave half a file under the real name.
    `on_chunk` gets each chunk's size (for a progress bar). Raises OSError."""
    tmp = dest.with_name(dest.name + ".part")
    with (
        urllib.request.urlopen(url, timeout=TIMEOUT) as resp,
        open(tmp, "wb") as out,
    ):
        while chunk := resp.read(1 << 20):
            out.write(chunk)
            if on_chunk:
                on_chunk(len(chunk))
    tmp.rename(dest)


def prune(folder: Path, pattern: str, keep: Callable[[Path], bool]) -> None:
    """Remove the files in `folder` matching `pattern` that `keep` turns down."""
    for path in sorted(folder.glob(pattern)):
        if keep(path):
            continue
        _LOGGER.info("removing old download %s", path.name)
        try:
            path.unlink()
        except OSError as exc:
            _LOGGER.warning("%s could not be removed: %s", path.name, exc)
