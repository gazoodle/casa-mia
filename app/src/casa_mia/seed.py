"""Copy house config shipped in the image into the app's config folder."""

from __future__ import annotations

import logging
from pathlib import Path

_LOGGER = logging.getLogger(__name__)


def seed_config(seed: Path, config_dir: Path) -> None:
    """Copy the house config shipped in the image (config/compositor in the repo) into the
    app's config folder, for files not already there. Never overwrites: the copy in the
    config folder is the live one and may have been edited."""
    if not seed.is_dir():
        return
    config_dir.mkdir(parents=True, exist_ok=True)
    for src in seed.glob("*.json"):
        if not (config_dir / src.name).exists():
            (config_dir / src.name).write_bytes(src.read_bytes())
            _LOGGER.info("seeded %s into %s", src.name, config_dir)
