"""Home Assistant runs a timer's callable in a worker thread unless it is a @callback (or a
coroutine). A lambda can't be decorated where it stands, so one passed straight to a
timer runs off the loop: Sensor Watch's hold-off did, and its events never fired."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "integration" / "custom_components"
TIMER = re.compile(r"async_(?:call_later|call_at|track_\w+)\([^()]*\blambda\b")


def test_no_bare_lambda_timers():
    bad = [
        f"{p.relative_to(ROOT)}:{n}"
        for p in ROOT.rglob("*.py")
        for n, line in enumerate(p.read_text().splitlines(), 1)
        if TIMER.search(line)
    ]
    assert not bad, f"wrap the lambda in callback(...): {bad}"
