"""commander: what is wrong with the commanders, in words for the admin page."""

from __future__ import annotations

import re
from typing import Any

from ..compositor import (
    LABELS,
    LAYOUT,
    PANELS,
    commander_cameras,
    commanders_of,
    ratio,
    slug,
    visible,
)

FITS = tuple(value for value, _ in LAYOUT["panel"]["fit"]["options"])  # a panel's
RESPONSIVE = LAYOUT["responsive"]  # the Responsive layout's options
MOST_CAMERAS = 32  # in a Responsive commander
EDGES = ("bottom", "right", "left", "top")


def _labels(the: str, cmd: dict) -> list[str]:
    """What is wrong with how a commander's camera names are drawn."""
    labels = cmd.get("labels", {})
    if not isinstance(labels, dict):
        return [f"{the}'s labels must be a set of settings."]
    out: list[str] = []
    kept = LABELS["picture"]["main_keep"]
    if cmd.get("main_keep", kept["default"]) not in [v for v, _ in kept["options"]]:
        out.append(f"{the}'s part of the main camera to keep is not one of the nine.")
    for key, o in LABELS["labels"].items():
        value = labels.get(key, o["default"])
        label = re.sub(r", (px|%)$", "", o["label"]).lower()  # (less its unit)
        if "min" in o:
            ok = isinstance(value, int) and not isinstance(value, bool)
            if not ok or not o["min"] <= value <= o["max"]:
                out.append(f"{the}'s labels: {label} must be {o['min']}-{o['max']}.")
        elif "options" in o:
            if value not in [v for v, _ in o["options"]]:
                out.append(f"{the}'s labels: {label} is not one of the choices.")
        elif not re.fullmatch(r"#[0-9a-fA-F]{6}", str(value)):
            out.append(f"{the}'s labels: {label} must be like #ffffff.")
    return out


def _responsive(the: str, cmd: dict, cams: dict) -> list[str]:
    """What is wrong with a commander's Responsive settings. They are checked in either
    mode: both modes' settings are kept, and a mode chosen later must find them sound."""
    out: list[str] = []
    if cmd.get("mode", "fixed") not in ("fixed", "responsive"):
        out.append(f"{the}'s layout must be fixed or responsive.")
    r = cmd.get("responsive")
    if not isinstance(r, dict):
        return [*out, f"{the}'s Responsive settings must be a set of settings."]

    listed = r.get("cameras", [])
    if not isinstance(listed, list) or not all(isinstance(e, str) for e in listed):
        return [*out, f"{the}'s Responsive cameras must be a list."]
    for e in listed:
        if e not in cams:
            out.append(f"{the}'s Responsive cameras: {e} is not one of the cameras.")
    if len(set(listed)) < len(listed):
        out.append(f"{the}'s Responsive cameras list a camera twice.")
    if len(listed) > MOST_CAMERAS:
        out.append(f"{the} has more than {MOST_CAMERAS} Responsive cameras.")

    for key, o in RESPONSIVE.items():
        value, label = r.get(key, o["default"]), o["label"].split(",")[0].lower()
        if "min" in o:
            ok = isinstance(value, int) and not isinstance(value, bool)
            if not ok or not o["min"] <= value <= o["max"]:
                out.append(f"{the}'s {label} must be {o['min']}-{o['max']}.")
        elif "options" in o and value not in [v for v, _ in o["options"]]:
            out.append(f"{the}'s {label} is not one of the choices.")
    for key in ("edges", "edges_tall"):
        edges = r.get(key, RESPONSIVE[key]["default"])
        if edges is None and key == "edges_tall":
            continue
        if not isinstance(edges, list) or any(e not in EDGES for e in edges):
            out.append(f"{the}'s edges must be from {', '.join(EDGES)}.")
        elif len(set(edges)) < len(edges):
            out.append(f"{the}'s edges list an edge twice.")
    least, most = (
        r.get(k, RESPONSIVE[k]["default"]) for k in ("main_least", "main_most")
    )
    if isinstance(least, int) and isinstance(most, int) and least > most:
        out.append(f"{the}'s main camera must be at least no more than its most.")
    return out


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
                out.append(f"{the}'s {panel} panel: fit must be {', '.join(FITS)}.")
            try:
                ratio(pane.get("cell", "1:1"))
            except (TypeError, ValueError, ZeroDivisionError):
                out.append(
                    f"{the}'s {panel} panel: tile shape {pane.get('cell')!r} is not a shape."
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
        out += _responsive(the, cmd, cams)
        out += _labels(the, cmd)
        if cmd.get("main") and cmd["main"] not in commander_cameras(cmd):
            out.append(f"{the}'s main camera must be one of its cameras.")
        if not commander_cameras(visible(cmd)):
            out.append(
                f"{the} has no cameras: give it some."
                if cmd.get("mode") == "responsive"
                else f"{the} has no cameras: put some in its panels (shown)."
            )
    return out
