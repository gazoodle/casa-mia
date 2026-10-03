"""Casa Mia app."""

import re
from importlib.metadata import version


def app_version() -> str:
    """The version as the Supervisor shows it: Python normalises 2026.10.1-b1 to
    2026.10.1b1 in the package metadata, so put the dash back."""
    return re.sub(r"b(\d+)$", r"-b\1", version("casa-mia"))
