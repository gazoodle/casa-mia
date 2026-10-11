"""The Sensor Watch guide's table of library profiles is written from library.json."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import library_table  # noqa: E402


def test_the_guide_lists_every_library_profile():
    assert library_table.GUIDE.read_text() == library_table.wanted(), (
        "run tools/library_table.py --update"
    )
