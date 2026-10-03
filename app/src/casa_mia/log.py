"""Logging in Home Assistant's own format and colours, so app logs read like Core's and ESPHome's:

2026-10-01 16:42:28.675 INFO (MainThread) [casa_mia.components] message
"""

from __future__ import annotations

import logging
import os

# Copied from homeassistant/bootstrap.py (`async_enable_logging`) and const.py.
FMT = "%(asctime)s.%(msecs)03d %(levelname)s (%(threadName)s) [%(name)s] %(message)s"
DATEFMT = "%Y-%m-%d %H:%M:%S"
# Core's colorlog mapping as ANSI codes (cyan, green, yellow, red); the Supervisor's log
# viewer renders them. Plain ANSI instead of the colorlog dependency.
_COLOURS = {
    "DEBUG": "36",
    "INFO": "32",
    "WARNING": "33",
    "ERROR": "31",
    "CRITICAL": "31",
}


class ColourFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        line = super().format(record)
        code = _COLOURS.get(record.levelname)
        return f"\x1b[{code}m{line}\x1b[0m" if code else line


def configure_logging(level: str = "info") -> None:
    formatter_class = (
        logging.Formatter if os.environ.get("NO_COLOR") else ColourFormatter
    )
    handler = logging.StreamHandler()
    handler.setFormatter(formatter_class(FMT, DATEFMT))
    logging.basicConfig(handlers=[handler], level=level.upper())
    # Pillow logs every TIFF/EXIF tag of every image at DEBUG: thousands of lines a minute.
    logging.getLogger("PIL").setLevel(logging.WARNING)
    # Route warnings.warn(...) into the log, where they are seen and can be filtered.
    logging.captureWarnings(True)
