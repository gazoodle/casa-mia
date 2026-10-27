#!/usr/bin/env python3
"""Write the Sensor Watch guide's table of library profiles from library.json.

    .venv/bin/python tools/library_table.py --update

tests/test_library_table.py fails when the guide's table differs, so a new profile in
the library shows in the guide too."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / "app/src/casa_mia/modules/sensor_watch/library.json"
GUIDE = ROOT / "docs/applets/sensor-watch.md"
START = "<!-- library table: tools/library_table.py --update -->"
END = "<!-- end of library table -->"
LEVELS = ("nominal", "task", "warning", "error", "critical")
MODES = {
    "numeric": "bands",
    "binary": "on/off",
    "state": "exact states",
    "available": "available",
}


def _n(x: float) -> str:
    return f"{x:g}"


def _wait(seconds: int) -> str:
    if not seconds:
        return "at once"
    if seconds >= 2 * 86400 and seconds % 86400 == 0:
        return f"after {seconds // 86400} days"
    if seconds % 3600 == 0:
        return f"after {seconds // 3600} h"
    if seconds % 60 == 0:
        return f"after {seconds // 60} min"
    return f"after {seconds} s"


def behaviour(p: dict[str, Any]) -> str:
    """Its levels in a line: "under 207 critical · 207–216 warning · …", then when."""
    kind = p["kind"]
    if kind == "numeric":
        parts = []
        for b in p["bands"]:
            low, high = b["from"], b["to"]
            if low is None:
                span = "any" if high is None else f"under {_n(high)}"
            else:
                span = (
                    f"{_n(low)} and over" if high is None else f"{_n(low)}–{_n(high)}"
                )
            parts.append(f"{span} {b['level']}")
        text = " · ".join(parts)
        if accuracy := p.get("accuracy"):
            unit = " %" if accuracy["percent"] else ""
            text += f", ±{_n(accuracy['amount'])}{unit}"
    elif kind == "binary":
        text = f"off {p['off']['level']} · on {p['on']['level']}"
    elif kind == "state":
        text = f"{', '.join(p['states'])} nominal"
        text += "".join(
            f" · {e['state']} {e['level']}" for e in p.get("exceptions") or []
        )
        text += f" · else {p['other']}"
    else:
        text = f"there {p['available']['level']} · unavailable {p['unavailable']}"
    text = f"{text}; {_wait(p.get('hold_off', 60))}"
    for level, seconds in (p.get("escalate") or {}).items():
        up = LEVELS[LEVELS.index(level) + 1]
        text += f"; {level} becomes {up} {_wait(seconds)}"
    return text


def table() -> str:
    profiles = json.loads(LIBRARY.read_text())["profiles"]
    rows = sorted(profiles, key=lambda p: (p["category"], p["name"]))
    lines = [
        START,
        "",
        "| Profile | Category | Mode | Behaviour |",
        "| --- | --- | --- | --- |",
        *(
            f"| {p['name']} | {p['category']} | {MODES[p['kind']]} | {behaviour(p)} |"
            for p in rows
        ),
        "",
        END,
    ]
    return "\n".join(lines)


def wanted() -> str:
    """The guide with the table as the library has it now."""
    text = GUIDE.read_text()
    before, rest = text.split(START, 1)
    _, after = rest.split(END, 1)
    return before + table() + after


if __name__ == "__main__":
    if "--update" in sys.argv:
        GUIDE.write_text(wanted())
        print(f"wrote {GUIDE.relative_to(ROOT)}")
    else:
        print(table())
