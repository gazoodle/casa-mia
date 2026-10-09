#!/usr/bin/env python3
"""Write each module's maturity (app/src/casa_mia/maturity.json, the one source) where a
newcomer reads it before switching the module on:

  * its option's description in the app's Configuration tab (app/translations/en.yaml),
    which starts "Alpha." and so on;
  * its docs page, a line under the title;
  * the levels and their meanings in docs/README.md, between the maturity markers.

The admin page reads the JSON itself.

    tools/maturity.py            check (also run by pytest)
    tools/maturity.py --update   write the ratings into the files above
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "app" / "src" / "casa_mia" / "maturity.json"
OPTIONS = ROOT / "app" / "translations" / "en.yaml"
DOCS = ROOT / "docs"
START, END = "<!-- maturity -->", "<!-- /maturity -->"


def load() -> dict:
    return json.loads(SOURCE.read_text())


def _names(m: dict) -> str:
    return "|".join(re.escape(lv["name"]) for lv in m["levels"].values())


def options_text(m: dict, text: str) -> str:
    """en.yaml with each module option's description led by its level's name."""
    for key, mod in m["modules"].items():
        name = m["levels"][mod["level"]]["name"]
        # The description's first words: after `description: "` or `description: >-\n  `.
        text = re.sub(
            rf"(\n  {key}_enabled:\n(?:    .*\n)*?    description: (?:\"|>-\n      ))"
            rf"(?:(?:{_names(m)})\. )?",
            lambda g: f"{g[1]}{name}. ",
            text,
            count=1,
        )
    return text


def page_text(m: dict, mod: dict, text: str) -> str:
    """A docs page with its maturity line after its opening paragraph."""
    lv = m["levels"][mod["level"]]
    up = "../" * mod["docs"].count("/")
    line = (
        f"> **Maturity: {lv['name']}.** {lv['meaning']} "
        f"([The levels]({up}README.md#maturity))"
    )
    text = re.sub(r"\n> \*\*Maturity: .*\n\n", "\n", text, count=1)
    title, opening, rest = text.split("\n\n", 2)
    return f"{title}\n\n{opening}\n\n{line}\n\n{rest}"


def readme_text(m: dict, text: str) -> str:
    """docs/README.md with the levels between its markers."""
    rows = "\n".join(
        f"- **{lv['name']}:** {lv['meaning']}" for lv in m["levels"].values()
    )
    head, _, rest = text.partition(START)
    _, _, tail = rest.partition(END)
    return f"{head}{START}\n{rows}\n{END}{tail}"


def wanted() -> dict[Path, str]:
    """Each file as it should read."""
    m = load()
    out = {OPTIONS: options_text(m, OPTIONS.read_text())}
    readme = DOCS / "README.md"
    out[readme] = readme_text(m, readme.read_text())
    for mod in m["modules"].values():
        page = DOCS / mod["docs"]
        out[page] = page_text(m, mod, page.read_text())
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--update", action="store_true")
    args = parser.parse_args()
    want = wanted()
    stale = [p for p, text in want.items() if p.read_text() != text]
    if args.update:
        for path in stale:
            path.write_text(want[path])
            print(f"updated {path.relative_to(ROOT)}")
        return 0
    for path in stale:
        print(
            f"{path.relative_to(ROOT)}: maturity out of date (tools/maturity.py --update)"
        )
    return 1 if stale else 0


if __name__ == "__main__":
    raise SystemExit(main())
