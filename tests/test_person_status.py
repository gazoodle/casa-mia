"""The line under each person on the People page (app/web/src/personStatus.ts): what a
date of birth says, worded with the person's pronouns. Run in node as it is, as
test_sensor_watch_ladder.py runs the ladder; the ages and days are what the app's
people.about() gives for today, 7 March 2026."""

import json
import subprocess
from datetime import date
from pathlib import Path

import pytest

from casa_mia.modules.people import about
from test_layout_cases import node_strips_types

STATUS = Path(__file__).resolve().parents[1] / "app/web/src/personStatus.ts"
TODAY = date(2026, 3, 7)
SHE = "she/her/her/hers/herself"
XE = "xe/xem/xyr/xyrs/xemself"

# The date of birth, the pronouns (None: unset), the line.
CASES = [
    ("1984-03-07", SHE, "It's her 42nd birthday today."),
    ("1983-03-07", SHE, "It's her 43rd birthday today."),
    ("1984-03-08", SHE, "She is 41, and turns 42 tomorrow."),
    ("2005-03-19", None, "They are 20, and turn 21 in 12 days, on 19 March."),
    ("1984-12-03", XE, "Xe is 41. Xyr next birthday is on 3 December."),
    ("2000-02-29", SHE, "She is 26. Her next birthday is on 1 March."),
    (
        "2025-12-25",
        SHE,
        "She is under a year old. Her next birthday is on 25 December.",
    ),
    ("2025-04-01", SHE, "She is under a year old, and turns 1 in 25 days, on 1 April."),
    ("2026-03-07", None, "They were born today."),
    ("1984", SHE, "She turns 42 this year."),
    ("2026", None, "They were born this year."),
    ("1984-04", SHE, "She turns 42 in April."),
    ("1984-03", None, "They turn 42 this month."),
    ("1984-01", XE, "Xe turned 42 in January."),
    ("2026-02", SHE, "She was born in February."),
    ("--03-07", SHE, "It's her birthday today."),
    ("--03-08", None, "Their birthday is tomorrow."),
    ("--03-30", SHE, "Her birthday is on 30 March, in 23 days."),
    ("--11-05", SHE, "Her birthday is on 5 November."),
    (None, SHE, None),
]

CHECK = """
const { personStatus } = await import(process.argv[1]);
const today = new Date(2026, 2, 7);
const cases = JSON.parse(process.argv[2]);
console.log(JSON.stringify(cases.map(([born, about]) => personStatus(born, about, today))));
"""


@pytest.mark.skipif(not node_strips_types(), reason="needs node 22.6+")
def test_the_line_for_each_date_of_birth():
    told = [
        (born, about({"name": "X", "born": born, "pronouns": said}, TODAY))
        for born, said, _ in CASES
    ]
    run = subprocess.run(
        [
            "node",
            "--experimental-strip-types",
            "--no-warnings",
            "--input-type=module",
            "-e",
            CHECK,
            STATUS.as_uri(),
            json.dumps(told),
        ],
        capture_output=True,
        text=True,
    )
    assert run.returncode == 0, run.stdout + run.stderr
    for (born, _, line), got in zip(CASES, json.loads(run.stdout), strict=True):
        assert got == line, born
