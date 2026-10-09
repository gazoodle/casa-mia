"""Each module's maturity is defined once (maturity.json) and written everywhere else."""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import maturity  # noqa: E402


def test_written_everywhere():
    stale = [p for p, text in maturity.wanted().items() if p.read_text() != text]
    assert not stale, "run tools/maturity.py --update"


def test_every_module_option_is_rated():
    m = maturity.load()
    options = re.findall(r"\n  (\w+)_enabled:", maturity.OPTIONS.read_text())
    assert set(options) <= set(m["modules"])
    assert all(mod["level"] in m["levels"] for mod in m["modules"].values())
