#!/usr/bin/env python3
"""Write each module's maturity (app/src/casa_mia/maturity.json, the one source) where a
newcomer reads it before switching the module on:

  * its option's description in the app's Configuration tab (app/translations/en.yaml),
    which starts "Alpha." and so on;
  * its docs page, a line under the title;
  * the levels and their meanings in docs/README.md, between the maturity markers;
  * a chip per level (docs/maturity/<level>.svg), the admin page's outline pill in its own
    tones and colours, light and dark; and in the README, after each `<!--module-->`
    marker, that module's chip, linked to the levels.

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
README = ROOT / "README.md"
WEB = ROOT / "app" / "web" / "src"
START, END = "<!-- maturity -->", "<!-- /maturity -->"


def load() -> dict:
    return json.loads(SOURCE.read_text())


def _names(m: dict) -> str:
    return "|".join(re.escape(lv["name"]) for lv in m["levels"].values())


def options_text(m: dict, text: str) -> str:
    """en.yaml with each module option's description led by its level's name."""
    for key, mod in m["modules"].items():
        name = m["levels"][mod["level"]]["name"]
        option = mod.get("option", f"{key}_enabled")
        if not option:  # switched on by another module's option
            continue
        # The description's first words: after `description: "` or `description: >-\n  `.
        text = re.sub(
            rf"(\n  {option}:\n(?:    .*\n)*?    description: (?:\"|>-\n      ))"
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


def chip_svg(name: str, level: str) -> str:
    """The level's chip as the admin page draws it (maturity.module.css on pills.css)."""
    tones = {
        cls: tone
        for sel, tone in re.findall(
            r"((?:\.\w+,\s*)*\.\w+)\s*\{\s*--tone: var\(--(\w+)\)",
            (WEB / "maturity.module.css").read_text(),
        )
        for cls in re.findall(r"\.(\w+)", sel)
    }
    # styles.css: dark first (the default), then light.
    dark, light = re.findall(
        rf"--{tones[level]}: (#\w+)", (WEB / "styles.css").read_text()
    )[:2]
    text = name.upper()
    width = round(len(text) * 7.4 + 20)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="22" '
        f'viewBox="0 0 {width} 22" role="img" aria-label="{name}">'
        f"<style>rect{{stroke:{light}}}text{{fill:{light}}}"
        f"@media (prefers-color-scheme:dark){{rect{{stroke:{dark}}}text{{fill:{dark}}}}}"
        "</style>"
        f'<rect x="0.5" y="0.5" width="{width - 1}" height="21" rx="10.5" '
        'fill="none" stroke-opacity="0.55"/>'
        f'<text x="{width / 2:g}" y="15" text-anchor="middle" '
        'font-family="Inter,system-ui,-apple-system,Segoe UI,sans-serif" '
        f'font-size="11" font-weight="600" textLength="{width - 20}" '
        f'lengthAdjust="spacing">{text}</text></svg>\n'
    )


def chips_text(m: dict, text: str) -> str:
    """The README with each marked module's chip after its marker."""

    def chip(g: re.Match) -> str:
        level = m["modules"][g[1]]["level"]
        name = m["levels"][level]["name"]
        return (
            f'<!--{g[1]}--><a href="docs/README.md#maturity">'
            f'<img src="docs/maturity/{level}.svg" alt="{name}"></a>'
        )

    return re.sub(r"<!--(\w+)-->(?:<a [^>]*><img [^>]*></a>)?", chip, text)


def wanted() -> dict[Path, str]:
    """Each file as it should read."""
    m = load()
    out = {OPTIONS: options_text(m, OPTIONS.read_text())}
    readme = DOCS / "README.md"
    out[readme] = readme_text(m, readme.read_text())
    out[README] = chips_text(m, README.read_text())
    for level, lv in m["levels"].items():
        out[DOCS / "maturity" / f"{level}.svg"] = chip_svg(lv["name"], level)
    for mod in m["modules"].values():
        if "docs" in mod:
            page = DOCS / mod["docs"]
            out[page] = page_text(m, mod, page.read_text())
    return out


def stale(want: dict[Path, str]) -> list[Path]:
    return [p for p, text in want.items() if not p.exists() or p.read_text() != text]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--update", action="store_true")
    args = parser.parse_args()
    want = wanted()
    old = stale(want)
    if args.update:
        for path in old:
            path.parent.mkdir(exist_ok=True)
            path.write_text(want[path])
            print(f"updated {path.relative_to(ROOT)}")
        return 0
    for path in old:
        print(
            f"{path.relative_to(ROOT)}: maturity out of date (tools/maturity.py --update)"
        )
    return 1 if old else 0


if __name__ == "__main__":
    raise SystemExit(main())
