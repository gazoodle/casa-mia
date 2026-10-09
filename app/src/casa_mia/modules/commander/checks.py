"""commander: what is wrong with the commanders, in words for the admin page."""

from __future__ import annotations

import re
from typing import Any

from ..compositor import (
    PANELS,
    commander_cameras,
    commanders_of,
    ratio,
    slug,
    visible,
)

FITS = ("cover", "contain", "stack", "reverse", "centre")


def problems(store: dict[str, Any]) -> list[str]:
    """What is wrong with the commanders of a store (`commanders`, and the `cameras` they
    show); empty when they are fine."""
    out: list[str] = []
    cams = store.get("cameras", {})
    cmds = store.get("commanders")
    if not isinstance(cmds, list) or not cmds:
        out.append("There must be at least one commander.")
        cmds = []
    paths: dict[str, str] = {}
    ids = [c.get("id", "") if isinstance(c, dict) else "" for c in cmds]
    if any(not isinstance(i, str) or not re.fullmatch(r"[a-z0-9]*", i) for i in ids):
        out.append("A commander's id must be lower case letters and digits.")
    elif len(set(ids)) < len(ids):
        out.append("Two commanders share an id: give the copy a new one.")
    for c in cmds:
        name = str(c.get("name") or "").strip() if isinstance(c, dict) else ""
        if not name or not slug(name):
            out.append("Every commander needs a name (with letters or digits).")
        elif slug(name) in paths:
            out.append(f"The commanders {paths[slug(name)]!r} and {name!r} clash.")
        elif slug(name).startswith("cam-"):
            out.append(f"The commander {name!r} would clash with the camera pages.")
        paths.setdefault(slug(name), name)
    for cmd in commanders_of({"commanders": cmds}):
        the = f"The {cmd['name']} commander"
        if not isinstance(cmd.get("page", True), bool):
            out.append(f"{the}'s dashboard page must be true or false.")
        for key, low, high in (("width", 320, 3840), ("height", 240, 2160)):
            if not isinstance(cmd.get(key), int) or not low <= cmd[key] <= high:
                out.append(f"{the}'s {key} must be {low}-{high}.")
        if not isinstance(cmd.get("gap"), int) or cmd["gap"] < 0:
            out.append(f"{the}'s gap must be 0 px or more.")
        if not isinstance(cmd.get("margin", 0), int) or cmd.get("margin", 0) < 0:
            out.append(f"{the}'s margin must be 0 px or more.")
        for panel in PANELS:
            pane = cmd.get(panel) or {}
            size, unit = pane.get("size"), pane.get("unit", "%")
            most = 2000 if unit == "px" else 45
            if unit not in ("%", "px"):
                out.append(f"{the}'s {panel} panel: size must be in % or px.")
            elif not isinstance(size, (int, float)) or not 0 <= size <= most:
                out.append(f"{the}'s {panel} panel: size must be 0-{most}{unit}.")
            lines = pane.get("lines", 1)
            if (
                not isinstance(lines, int)
                or isinstance(lines, bool)
                or not 1 <= lines <= 10
            ):
                out.append(f"{the}'s {panel} panel: rows or columns must be 1-10.")
            if not isinstance(pane.get("hidden", False), bool):
                out.append(f"{the}'s {panel} panel: hidden must be true or false.")
            if pane.get("fit", "cover") not in FITS:
                out.append(
                    f"{the}'s {panel} panel: fit must be cover, contain, stack, "
                    "reverse or centre."
                )
            for e in pane.get("cameras", []):
                if e not in cams:
                    out.append(f"{the}'s {panel} panel: {e} is not one of the cameras.")
        if cmd.get("main_fit", "fit") not in ("fit", "fill", "crop", "own", "fixed"):
            out.append(
                f"{the}'s main camera: fit must be fit, fill, crop, own or fixed."
            )
        stale = cmd.get("stale", 30)
        if not isinstance(stale, (int, float)) or stale <= 0:
            out.append(f"{the}'s Stale after must be more than 0 seconds.")
        smallest = cmd.get("panel_min", 8)
        if not isinstance(smallest, (int, float)) or not 0 <= smallest <= 40:
            out.append(f"{the}'s smallest panel must be 0-40% of the picture.")
        width = cmd.get("main_width", 70)
        if not isinstance(width, (int, float)) or not 10 <= width <= 100:
            out.append(f"{the}'s main width must be 10-100% of the picture.")
        try:
            ratio(cmd.get("main_ratio", "16:9"))
        except (ValueError, ZeroDivisionError):
            out.append(f"{the}'s main shape {cmd.get('main_ratio')!r} is not a shape.")
        for panel in ("top", "bottom"):
            for end in ("anchor_left", "anchor_right"):
                if not isinstance((cmd.get(panel) or {}).get(end, False), bool):
                    out.append(f"{the}'s {panel} panel: {end} must be true or false.")
        placed: dict[str, str] = {}
        for panel in PANELS:
            for e in (cmd.get(panel) or {}).get("cameras", []):
                if e in placed:
                    title = cams.get(e, {}).get("title", e)
                    out.append(
                        f"{the} shows {title} in both its {placed[e]} and {panel} panels."
                    )
                placed.setdefault(e, panel)
        lit = cmd.get("highlight") or {}
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(lit.get("colour", "#7bd1a0"))):
            out.append(f"{the}'s highlight colour must be like #7bd1a0.")
        if lit.get("style", "breathe") not in ("breathe", "ripple"):
            out.append(f"{the}'s highlight pulse must breathe or ripple.")
        for key in ("width", "blur", "pulse"):
            value = lit.get(key, 0)
            if not isinstance(value, (int, float)) or value < 0:
                out.append(f"{the}'s highlight {key} must be 0 or more.")
        ignore = cmd.get("motion_ignore", [])
        if not isinstance(ignore, list) or not all(isinstance(e, str) for e in ignore):
            out.append(f"{the}'s cameras left out of Track motion must be a list.")
        for key, value in (cmd.get("motion") or {}).items():
            if not isinstance(value, (int, float)) or value < 0:
                out.append(f"{the}'s Track motion {key} must be 0 seconds or more.")
        if cmd.get("main") and cmd["main"] not in commander_cameras(cmd):
            out.append(f"{the}'s main camera must be one of its cameras.")
        if not commander_cameras(visible(cmd)):
            out.append(f"{the} has no cameras: put some in its panels (shown).")
    return out
