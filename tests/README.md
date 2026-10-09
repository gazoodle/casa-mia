# Running the Python tests

Run `.venv/bin/pytest -q` after changes and before any requested commit. It runs
every test with **8 workers**, configured in `pyproject.toml`. `tools/setup` installs
pytest-xdist through the test extra. Claude and Codex use the same settings.

- Diagnose one file: `.venv/bin/pytest -q tests/test_fona.py`.
- Debug serially: `.venv/bin/pytest -q -n 0`.
- Find outliers: `.venv/bin/pytest -q --durations=20`.

There is no separate slow tier and no default exclusion. Keep the full suite under
15 seconds; fix avoidable waits instead of hiding them behind a slow marker.
Use events for asynchronous progress, a controlled clock for expiry, and bounded
completion checks for real background threads. Camera teardown uses
`stop_compositor` in `conftest.py`; a fixed sleep neither proves shutdown nor fails
when it breaks. HTTP test servers use the `serve` fixture. Share stateless fixtures
when it saves meaningful setup, but keep mutable stores and service instances
isolated. Never use fixed ports or real household configuration.

## Worker measurements

Measured on 2026-10-09 from an isolated checkout of
`3471c481fe6754fdf3b6459d69cbfce6ddaf8fb3`, so concurrent app edits could not alter
the results. All 264 tests were included: no accepted slow-test list existed.
Each worker count had three runs in rotated order. These are wall times, including
worker startup, before the subsequent wait and teardown improvements.

| Workers | Run 1 (s) | Run 2 (s) | Run 3 (s) | Median (s) |
| --- | --- | --- | --- | --- |
| 1 | 12.740 | 12.542 | 12.518 | 12.542 |
| 2 | 6.592 | 6.509 | 6.655 | 6.592 |
| 4 | 4.017 | 4.151 | 4.124 | 4.124 |
| 6 | 3.383 | 3.549 | 3.738 | 3.549 |
| 8 | 3.037 | 3.060 | 3.306 | 3.060 |

Two 4-worker runs exposed a FONA assertion race: an immediate reconnect attempt
could replace the current "lost" error with "cannot open". The test now checks the
logged loss, then verifies recovery. Every other benchmark run passed.

Eight workers was the fastest count measured on the development machine. These
numbers do not predict results on other hardware; remeasure before changing the
shared default. CI uses the same full-suite command.

## Verification after the improvements

Measured from a frozen snapshot of `3d08d816a1d28fce09069a87601fdb5389b99db1`
plus this change, with the same five worker counts and three rotated runs each.
All **15 runs passed all 264 tests**, including the formerly flaky FONA case
and the restart test that now verifies background-loop shutdown.

| Workers | Run 1 (s) | Run 2 (s) | Run 3 (s) | Median (s) |
| --- | --- | --- | --- | --- |
| 1 | 8.989 | 8.494 | 8.539 | 8.539 |
| 2 | 4.545 | 5.000 | 4.664 | 4.664 |
| 4 | 3.288 | 3.622 | 3.337 | 3.337 |
| 6 | 2.990 | 2.731 | 3.231 | 2.990 |
| 8 | 3.009 | 2.801 | 3.334 | 3.009 |

Six and eight workers are effectively tied (medians differ by about 0.02 s).
Keep eight as the shared default: this repeat does not show a meaningful gain
from changing it. The serial wall time is about 8.5 s; the parallel default is
about 3 s. Both retain the complete suite. These two snapshots also contain
concurrent app changes, so the total speed difference cannot be attributed
solely to the test improvements.
