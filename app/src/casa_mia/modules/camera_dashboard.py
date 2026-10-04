"""camera_dashboard: one source for the camera composites and their HA dashboard.

The store describes everything: the cameras (chosen from HA, each with its channels,
zoom entity, PTZ presets and page controls), the groups the compositor tiles them into,
the overview's layout (landscape and portrait), and the dashboard's settings (url, Back /
Home / Help, wall tablet users, live cards). From it come:

  * the compositor's config: the draft compositor (DRAFT_PORT) draws the draft for
    previews; the live one (compositor.PORT) draws only what was last deployed, so
    editing never disturbs the wall tablets;
  * the dashboard: overview -> group pages -> live camera pages, in ONE dashboard that
    adapts to whoever is looking with card visibility conditions (portrait screens get
    the portrait composites; wall tablet users and phones the medium channel, everyone
    else the high one). Tap zones come from the compositor's own layout functions, so
    they always line up. Ported from tablet-provision/composite-test/gen_dashboard.py.

Deploying saves the dashboard into HA over the websocket (a storage-mode dashboard: no
configuration.yaml change, no restart), after keeping a copy of what it replaces. A
preview deploy goes to `<dashboard>-preview` and shows the draft composites; a live one
goes to the dashboard itself and makes the draft the live compositor's config.

Files in the app's config folder: camera-dashboard.json (the draft, edited on the admin
page), camera-dashboard-live.json (what was last deployed live) and
camera-dashboard-backups/ (the dashboards' configs before each deploy). On first start an
older groups.json / entities.json / dashboard_config.json is imported.
"""

from __future__ import annotations

import copy
import json
import logging
import re
import threading
import urllib.parse
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

from ..ha import HA, HAError
from .compositor import (
    DEFAULT_TILE,
    DRAFT_STORE,
    EMPTY_COMMANDER,
    EMPTY_OVERVIEW,
    LIVE_STORE,
    PANELS,
    PORT,
    Compositor,
    commander_cameras,
    commander_layout,
    config_from_store,
    mime,
    overview_layout,
    ratio,
    tile_grid,
)

_LOGGER = logging.getLogger(__name__)

DRAFT_PORT = 8098
THUMB_WIDTH = 160  # the page's camera thumbnails
# The draft compositor keeps the latest still of every chosen camera, fetched this often
# (seconds), so the page's thumbnails and previews are ready at once.
KEEP_STILLS_EVERY = 60.0
CAMERA = re.compile(r"camera\.[a-z0-9_]+")
# The integration's Camera Commander device: its Main camera select (options: the
# commander's camera titles). Its taps and automations choose the main camera.
COMMANDER_SELECT = "select.camera_commander_main_camera"
# The look of every camera picture on the dashboards when the integration's Security look
# switch is on: a CSS filter, made by the page from a tint (applied by the browser).
LOOK_CSS = re.compile(
    r"^(\s*(grayscale|sepia|hue-rotate|saturate|brightness|contrast|invert|opacity|blur)"
    r"\(\s*-?[0-9.]+(deg|%|px)?\s*\))*\s*$"
)
BACKUPS = "camera-dashboard-backups"
DEPLOYS = "camera-dashboard-deploys.json"  # when each was last deployed: live, preview
KEEP_BACKUPS = 20  # per dashboard
LEGACY_DASHBOARD = "dashboard_config.json"  # tablet-provision's generator settings
# A 1x1 transparent image: the tap zones over a composite.
BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
# The same, marked: the commander's highlight, which Keep camera pictures live pulses.
HIGHLIGHT = BLANK + "#cm-highlight"
CHANNEL = re.compile(r"_(high|medium|low)_resolution_channel$")
ZOOM = re.compile(r"^number\..*_zoom_level$")
URL_PATH = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)+$")  # HA wants a hyphen in it
CARDS = ("picture-entity", "webrtc-camera", "advanced-camera-card")

DEFAULTS: dict[str, Any] = {
    "dashboard": "dashboard-cameras",
    "title": "Cameras",
    "home": "/lovelace",
    "help": "/lovelace/troubleshooting",
    "nav_style": "badges",  # Back / Home / Help as header badges, or "tiles"
    "theme": "",
    # Tiles need an entity; this one is only a placeholder (an input_button helper).
    "placeholder": "input_button.navigate_placeholder",
    "portrait_query": "(orientation: portrait)",
    "phone_query": "(max-width: 767px)",
    "wall_users": [],  # HA user ids of the wall tablets: they get the medium channel
    "live_card": "picture-entity",  # wall tablets and phones
    "hi_live_card": "",  # everyone else; blank = the same as live_card
    "compositor_host": "",  # blank = this box's LAN address
    "cameras": {},
    "groups": {},
    "overview": EMPTY_OVERVIEW,
    "overview_portrait": EMPTY_OVERVIEW,
    "overview_mode": "groups",  # the landscape overview: the groups, or the commander
    # The Security look: a tint (and how strong, how dark) and the CSS filter made of it.
    "look": {"tint": "#3d7bff", "strength": 3, "darkness": 20, "css": ""},
    "commander": EMPTY_COMMANDER,
}

Response = tuple[int, str, bytes]
Store = dict[str, Any]


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def with_defaults(store: Store) -> Store:
    """A store with every setting; its own copy, sharing nothing with DEFAULTS."""
    return copy.deepcopy({**DEFAULTS, **store})


# --- importing tablet-provision's files ------------------------------------------------


def import_legacy(
    groups: dict, entities: dict[str, dict], dash: dict | None = None
) -> Store:
    """A store from groups.json, entities.json and (if there is one) the old generator's
    dashboard_config.json. Its PTZ presets, gate and light controls were keyed by page
    title; here they belong to the camera or group whose page they are on."""
    dash = copy.deepcopy(dash or {})
    groups = copy.deepcopy(groups)
    store: Store = with_defaults(
        {
            "overview": groups.pop("_overview", EMPTY_OVERVIEW),
            "overview_portrait": groups.pop("_overview_portrait", EMPTY_OVERVIEW),
            "cameras": {},
            "groups": {},
        }
    )
    if dash:  # the old generator's settings, and what it had hardcoded
        store |= {
            "dashboard": dash.get("dash", DEFAULTS["dashboard"]),
            "theme": "WallTablets",
            **{
                k: dash[k]
                for k in (
                    "portrait_query",
                    "phone_query",
                    "wall_users",
                    "live_card",
                    "hi_live_card",
                    "nav_style",
                )
                if k in dash
            },
        }
    cams: dict[str, dict] = store["cameras"]
    for name, v in groups.items():
        v = {"cameras": v} if isinstance(v, list) else v
        for c in v["cameras"]:
            cam = cams.setdefault(c["entity"], {"title": c["title"]})
            if c.get("live"):
                cam["live"] = c["live"]
            cam |= entities.get(c["entity"], {})
        store["groups"][name] = {
            "cameras": [c["entity"] for c in v["cameras"]],
            "tile": list(v.get("tile", DEFAULT_TILE)),
            "fit": v.get("fit", "cover"),
            "menu": not name.startswith("Wall"),
        }
    by_title = {c["title"]: c for c in cams.values()}
    for title, ptz in dash.get("ptz", {}).items():
        if title in by_title:
            by_title[title]["ptz"] = {
                "action": "unifiprotect.ptz_goto_preset",
                "data": {"device_id": ptz["device_id"]},
                "presets": ptz["presets"],
            }
    gates = dash.get("gates", {})
    for title in gates.get("cameras", []):
        if title in by_title:
            by_title[title].setdefault("controls", []).extend(gates["controls"])
    for name in gates.get("groups", []):
        if name in store["groups"]:
            store["groups"][name].setdefault("controls", []).extend(gates["controls"])
    lights = dash.get("lights", {})
    for title, keys in lights.get("pages", {}).items():
        controls = [lights["controls"][k] for k in keys]
        for page in (store["groups"].get(title), by_title.get(title)):
            if page is not None:
                page.setdefault("controls", []).extend(controls)
    return store


# --- checking a store ------------------------------------------------------------------


def problems(store: Store) -> list[str]:
    """What is wrong with a store, in words for the admin page; empty when it is fine."""
    out: list[str] = []
    cams, groups = store.get("cameras", {}), store.get("groups", {})
    if not URL_PATH.match(store.get("dashboard", "")):
        out.append(
            "The dashboard's URL must be lower case letters and digits with a hyphen, "
            "e.g. dashboard-cameras."
        )
    if store.get("nav_style") not in ("badges", "tiles"):
        out.append("Navigation must be badges or tiles.")
    for key in ("live_card", "hi_live_card"):
        if store.get(key) and store[key] not in CARDS:
            out.append(f"Unknown live card {store[key]!r}.")
    for entity, cam in cams.items():
        if not str(cam.get("title") or "").strip():
            out.append(f"{entity} needs a title.")
        if cam.get("live") and cam["live"] not in CARDS:
            out.append(
                f"{cam.get('title', entity)}: unknown live card {cam['live']!r}."
            )
    for name, g in groups.items():
        if not name.strip():
            out.append("A group needs a name.")
        if not g.get("cameras"):
            out.append(f"Group {name!r} has no cameras.")
        for e in g.get("cameras", []):
            if e not in cams:
                out.append(f"Group {name!r}: {e} is not one of the cameras.")
        size = list(g.get("tile", DEFAULT_TILE))
        if not (
            len(size) == 2
            and all(isinstance(n, int) for n in size)
            and 80 <= size[0] <= 1920
            and 45 <= size[1] <= 1920
        ):
            out.append(f"Group {name!r}: tile size must be 80-1920 by 45-1920.")
        if g.get("fit", "cover") not in ("cover", "contain"):
            out.append(f"Group {name!r}: fit must be cover or contain.")
        if not isinstance(g.get("gap", 0), int) or g.get("gap", 0) < 0:
            out.append(f"Group {name!r}: the gap must be 0 px or more.")
    menu = [n for n, g in groups.items() if g.get("menu", True)]
    for kind, names in (
        ("group", menu),
        ("camera", [cams[e]["title"] for e in menu_cameras(store) if e in cams]),
    ):
        seen: dict[str, str] = {}
        for n in names:
            if slug(n) in seen:
                out.append(f"The {kind} pages {seen[slug(n)]!r} and {n!r} clash.")
            seen[slug(n)] = n
    look_css = (store.get("look") or {}).get("css", "")
    if not isinstance(look_css, str) or not LOOK_CSS.match(look_css):
        out.append("The Security look is not a CSS filter the dashboards can use.")
    if store.get("overview_mode", "groups") not in ("groups", "commander"):
        out.append("The landscape overview must be the groups or the commander.")
    cmd = commander_of(store)
    for key, low, high in (("width", 320, 3840), ("height", 240, 2160)):
        if not isinstance(cmd.get(key), int) or not low <= cmd[key] <= high:
            out.append(f"The commander's {key} must be {low}-{high}.")
    if not isinstance(cmd.get("gap"), int) or cmd["gap"] < 0:
        out.append("The commander's gap must be 0 px or more.")
    for panel in PANELS:
        pane = cmd.get(panel) or {}
        size = pane.get("size")
        if not isinstance(size, (int, float)) or not 0 <= size <= 45:
            out.append(f"The commander's {panel} panel: size must be 0-45%.")
        if pane.get("fit", "cover") not in ("cover", "contain"):
            out.append(f"The commander's {panel} panel: fit must be cover or contain.")
        for e in pane.get("cameras", []):
            if e not in cams:
                out.append(
                    f"The commander's {panel} panel: {e} is not one of the cameras."
                )
    if cmd.get("main_fit", "fit") not in ("fit", "fill", "crop", "own", "fixed"):
        out.append(
            "The commander's main camera: fit must be fit, fill, crop, own or fixed."
        )
    smallest = cmd.get("panel_min", 8)
    if not isinstance(smallest, (int, float)) or not 0 <= smallest <= 40:
        out.append("The commander's smallest panel must be 0-40% of the picture.")
    width = cmd.get("main_width", 70)
    if not isinstance(width, (int, float)) or not 10 <= width <= 100:
        out.append("The commander's main width must be 10-100% of the picture.")
    try:
        ratio(cmd.get("main_ratio", "16:9"))
    except (ValueError, ZeroDivisionError):
        out.append(
            f"The commander's main shape {cmd.get('main_ratio')!r} is not a shape."
        )
    for panel in ("top", "bottom"):
        for end in ("anchor_left", "anchor_right"):
            if not isinstance((cmd.get(panel) or {}).get(end, False), bool):
                out.append(
                    f"The commander's {panel} panel: {end} must be true or false."
                )
    placed: dict[str, str] = {}
    for panel in PANELS:
        for e in (cmd.get(panel) or {}).get("cameras", []):
            if e in placed:
                title = cams.get(e, {}).get("title", e)
                out.append(
                    f"The commander shows {title} in both its {placed[e]} and {panel} panels."
                )
            placed.setdefault(e, panel)
    lit = cmd.get("highlight") or {}
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(lit.get("colour", "#7bd1a0"))):
        out.append("The commander's highlight colour must be like #7bd1a0.")
    if lit.get("style", "breathe") not in ("breathe", "ripple"):
        out.append("The commander's highlight pulse must breathe or ripple.")
    for key in ("width", "blur", "pulse"):
        value = lit.get(key, 0)
        if not isinstance(value, (int, float)) or value < 0:
            out.append(f"The commander's highlight {key} must be 0 or more.")
    for key, value in (cmd.get("motion") or {}).items():
        if not isinstance(value, (int, float)) or value < 0:
            out.append(f"The commander's Track motion {key} must be 0 seconds or more.")
    if cmd.get("main") and cmd["main"] not in commander_cameras(cmd):
        out.append("The commander's main camera must be one of its cameras.")
    if store.get("overview_mode") == "commander" and not commander_cameras(cmd):
        out.append("The commander is the landscape overview but has no cameras.")
    for which in ("overview", "overview_portrait"):
        for key in ("cell_aspect", "strip_aspect"):
            try:
                ratio(store.get(which, {}).get(key, 1.7))
            except (ValueError, ZeroDivisionError):
                out.append(
                    f"The {which.replace('_', ' ')}'s {key.replace('_', ' ')} is not a shape."
                )
        for row in store.get(which, {}).get("rows", []):
            names = row.get("groups") or row.get("strip") or []
            if not names:
                out.append(f"An empty row in the {which.replace('_', ' ')}.")
            for n in names:
                if n not in groups:
                    out.append(f"The {which.replace('_', ' ')} names a missing {n!r}.")
    return out


def warnings(
    store: Store,
    entities: set[str],
    resources: list[str],
    users: set[str],
    helpers: set[str] | frozenset[str] = frozenset(),
) -> list[str]:
    """What the dashboard needs that this HA seems to lack: entities, wall tablet users,
    and the custom cards and the Back helper among the dashboard resources (a card can
    also be loaded another way, so these warn, never refuse)."""
    s = with_defaults(store)
    out: list[str] = []
    wanted: dict[str, str] = {}  # entity -> where it is used
    for e, cam in s["cameras"].items():
        for k in ("", "medium", "high", "zoom"):
            ent = cam.get(k) if k else e
            if ent:
                wanted.setdefault(ent, cam["title"])
        for c in cam.get("controls", []):
            wanted.setdefault(c["entity"], f"{cam['title']}'s page")
    for name, g in s["groups"].items():
        for c in g.get("controls", []):
            wanted.setdefault(c["entity"], f"{name}'s page")
    tiles = s["nav_style"] == "tiles"
    if tiles or any(c.get("ptz") for c in s["cameras"].values()):
        wanted.setdefault(s["placeholder"], "the tiles")
    out += [
        f"{e} (on {where}) is not in Home Assistant."
        for e, where in wanted.items()
        if e not in entities
    ]
    out += [
        f"Wall tablet user {u[:8]}… is not one of Home Assistant's users."
        for u in s["wall_users"]
        if u not in users
    ]
    cards = {s["live_card"], s["hi_live_card"]} | {
        c.get("live", "") for c in s["cameras"].values()
    }
    if tiles and any(c.get("zoom") for c in s["cameras"].values()):
        cards.add("mushroom")
    urls = " ".join(resources).lower()
    for card, look in (
        ("webrtc-camera", "webrtc"),
        ("advanced-camera-card", "advanced-camera-card"),
        ("mushroom", "mushroom"),
    ):
        if card in cards and look not in urls:
            out.append(f"The {card} card is not among the dashboard resources.")
    if s["overview_mode"] == "commander" and COMMANDER_SELECT not in entities:
        out.append(
            f"{COMMANDER_SELECT} (the commander's taps) is not in Home Assistant: it "
            "comes with the Casa Mia integration while Camera Dashboard is on."
        )
    by_hand, ours = "nav_back" in urls, "cm-back.js" in helpers
    if not by_hand and not ours:
        out.append(
            "Back needs a Back button helper: switch on the Casa Mia integration's "
            "Back button helper (it turns #BACK into the browser's Back)."
        )
    elif by_hand and ours:
        out.append(
            "Back goes back twice: nav_back_helper.js is among the dashboard resources "
            "and the Casa Mia integration's Back button helper is on. Remove the "
            "resource."
        )
    return out


def commander_of(store: Store) -> dict:
    return {**EMPTY_COMMANDER, **(store.get("commander") or {})}


def menu_cameras(store: Store) -> list[str]:
    """The cameras that get a live page: those in menu groups, in order of appearance,
    then the commander's (when it is the overview)."""
    out: dict[str, None] = {}
    for g in store.get("groups", {}).values():
        if g.get("menu", True):
            out |= dict.fromkeys(g["cameras"])
    if store.get("overview_mode") == "commander":
        out |= dict.fromkeys(commander_cameras(commander_of(store)))
    return list(out)


# --- the dashboard ---------------------------------------------------------------------


def navigate(path: str) -> dict:
    return {"action": "navigate", "navigation_path": path}


def build_dashboard(store: Store, image_base: str, url_path: str) -> dict:
    """The whole dashboard config for HA (`views`), with the composites served from
    image_base (http://host:port) and the tap zones navigating inside url_path."""
    s = with_defaults(store)
    cams, groups = s["cameras"], config_from_store(s).groups
    theme = s["theme"] or None
    portrait = {"condition": "screen", "media_query": s["portrait_query"]}
    landscape = {"condition": "not", "conditions": [portrait]}
    # the wall tablets (by user) and phones can't take the big streams
    mid = {
        "condition": "or",
        "conditions": [
            {"condition": "user", "users": s["wall_users"]},
            {"condition": "screen", "media_query": s["phone_query"]},
        ],
    }
    hi = {"condition": "not", "conditions": [mid]}
    nav = [
        ("Back", "mdi:arrow-left-bold", navigate("#BACK")),
        ("Home", "mdi:home", navigate(s["home"])),
        ("Help", "mdi:help", navigate(s["help"])),
    ]

    def tile(name: str, icon: str, action: dict) -> dict:
        return {
            "type": "tile",
            "entity": s["placeholder"],
            "name": name,
            "icon": icon,
            "hide_state": True,
            "vertical": False,
            "tap_action": action,
            "icon_tap_action": {"action": "none"},
            "features_position": "bottom",
        }

    def tile_section(buttons: list[tuple[str, str, dict]]) -> dict:
        """A row of tiles; a phone's single column wraps them two to a row."""
        return {
            "type": "grid",
            "column_span": 3,
            "cards": [tile(n, i, a) for n, i, a in buttons],
        }

    def control_badge(c: dict) -> dict:
        b = {
            "type": "entity",
            "entity": c["entity"],
            "show_name": True,
            "show_state": False,
            "show_icon": True,
            "tap_action": {"action": "toggle"},
        }
        return b | {k: c[k] for k in ("name", "icon") if c.get(k)}

    def control_tile(c: dict) -> dict:
        """The same control as a tile; without a name or icon it takes the entity's."""
        t = {
            "type": "tile",
            "entity": c["entity"],
            "hide_state": True,
            "vertical": False,
            "tap_action": {"action": "toggle"},
            "icon_tap_action": {"action": "toggle"},
            "features_position": "bottom",
        }
        return t | {k: c[k] for k in ("name", "icon") if c.get(k)}

    def header(view: dict, zoom: str | None, controls: list[dict]) -> dict:
        """Back / Home / Help at the top of a view, as header badges or as a first
        section of tiles, then the Zoom control and the page's own controls."""
        if s["nav_style"] == "badges":
            view["header"] = {
                "layout": "start",
                "badges_position": "bottom",
                "badges_wrap": "wrap",
            }
            view["badges"] = [
                {"type": "shortcut", "text": n, "icon": i, "tap_action": a}
                for n, i, a in nav
            ]
            if zoom:
                view["badges"].append(
                    {
                        "type": "entity",
                        "entity": zoom,
                        "name": "Zoom",
                        "show_name": False,
                        "show_state": True,
                        "show_icon": True,
                        "state_content": ["name", "state"],
                    }
                )
            view["badges"] += [control_badge(c) for c in controls]
        else:
            sec = tile_section(
                [("Help!" if n == "Help" else n, i, a) for n, i, a in nav]
            )
            if zoom:
                sec["cards"].append(
                    {
                        "type": "custom:mushroom-number-card",
                        "entity": zoom,
                        "layout": "horizontal",
                        "fill_container": False,
                        "grid_options": {"columns": 9, "rows": 1},
                        "name": "Zoom",
                    }
                )
            sec["cards"] += [control_tile(c) for c in controls]
            view["sections"].insert(0, sec)
        return view

    def zone(
        rect: tuple[int, int, int, int], canvas: tuple[int, int], to: str | dict
    ) -> dict:
        """A transparent tap zone over rect (x, y, w, h), going to a view of this
        dashboard (or doing an action); HA positions by centre."""
        x, y, w, h = rect
        cw, ch = canvas
        return {
            "type": "image",
            "image": BLANK,
            "tap_action": to if isinstance(to, dict) else navigate(f"/{url_path}/{to}"),
            "style": {
                "left": f"{(x + w / 2) / cw * 100:.2f}%",
                "top": f"{(y + h / 2) / ch * 100:.2f}%",
                "width": f"{w / cw * 100:.2f}%",
                "height": f"{h / ch * 100:.2f}%",
            },
        }

    def picture(image: str, zones: list[dict], upright: bool) -> dict:
        return {
            "type": "picture-elements",
            "image": image,
            "grid_options": {"columns": "full"},
            "visibility": [portrait if upright else landscape],
            "elements": zones,
        }

    def picture_view(
        path: str,
        title: str,
        name: str,
        zones: dict,
        controls: list[dict],
        landscape_name: str | None = None,
    ) -> dict:
        """The nav, then the composite in both layouts (one shown) with tap zones. The
        landscape picture can be another composite (the commander)."""
        url = f"{image_base}/g/{urllib.parse.quote(name)}.mjpg"
        land = f"{image_base}/g/{urllib.parse.quote(landscape_name or name)}.mjpg"
        v: dict[str, Any] = {
            "type": "sections",
            "max_columns": 3,
            "title": title,
            "path": path,
            "sections": [
                {
                    "type": "grid",
                    "column_span": 3,
                    "cards": [
                        picture(land, zones[False], False),
                        picture(url + "?layout=portrait", zones[True], True),
                    ],
                }
            ],
            "cards": [],
        }
        if theme:
            v["theme"] = theme
        return header(v, None, controls)

    def commander_zones(cmd: dict) -> list[dict]:
        """A tap on a panel's camera makes it the main one (the integration's select); a
        tap on the main camera opens its live page: one zone per camera over the main
        area, each shown only while that camera is the main one. With the main camera
        at its own shape the whole layout follows it, so then every zone is in one set
        per main camera, each shown while that camera is the main one."""
        title = lambda e: cams[e]["title"]  # noqa: E731

        def shown_while(e: str, elements: list[dict]) -> dict:
            return {
                "type": "conditional",
                "conditions": [
                    {
                        "condition": "state",
                        "entity": COMMANDER_SELECT,
                        "state": title(e),
                    }
                ],
                "elements": elements,
            }

        if cmd.get("main_fit") == "own":
            return [
                shown_while(e, highlight(cmd, e, e) + layout_zones(cmd, e))
                for e in commander_cameras(cmd)
            ]
        size, main_rect, _ = commander_layout(cmd)
        return layout_zones(cmd, None) + [
            shown_while(
                e,
                highlight(cmd, e, None)
                + [zone(main_rect, size, f"cam-{slug(title(e))}")],
            )
            for e in commander_cameras(cmd)
        ]

    def highlight(cmd: dict, e: str, main: str | None) -> list[dict]:
        """An outline over the main camera's own tile: drawn by the browser (so a tap
        shows it at once), its colour, width and blur (a glow) as set; it lets taps
        through, and pulses (Keep camera pictures live does that) unless pulse is 0."""
        size, _, rects = commander_layout(cmd, main)
        h = {**EMPTY_COMMANDER["highlight"], **(cmd.get("highlight") or {})}
        for panel in PANELS:
            for cam, rect in zip(cmd[panel]["cameras"], rects[panel], strict=True):
                if cam == e and rect[2] > 0 and rect[3] > 0:
                    mark = zone(rect, size, {"action": "none"})
                    mark["image"] = HIGHLIGHT
                    mark["style"] |= {
                        "border": f"{h['width']}px solid {h['colour']}",
                        "box-sizing": "border-box",
                        "box-shadow": f"0 0 {h['blur']}px {h['colour']}",
                        "pointer-events": "none",
                        "--cm-colour": h["colour"],
                        "--cm-blur": f"{h['blur']}px",
                        "--cm-pulse": f"{h['pulse']}s",
                        "--cm-style": h["style"],
                    }
                    return [mark]
        return []

    def layout_zones(cmd: dict, main: str | None) -> list[dict]:
        """The panels' tap zones (and, given the main camera, its own) for one layout."""
        size, main_rect, rects = commander_layout(cmd, main)
        title = lambda e: cams[e]["title"]  # noqa: E731
        out = [
            zone(
                rect,
                size,
                {
                    "action": "perform-action",
                    "perform_action": "select.select_option",
                    "target": {"entity_id": COMMANDER_SELECT},
                    "data": {"option": title(e)},
                },
            )
            for panel in PANELS
            for e, rect in zip(cmd[panel]["cameras"], rects[panel], strict=True)
            if rect[2] > 0 and rect[3] > 0
        ]
        if main:
            out.append(zone(main_rect, size, f"cam-{slug(title(main))}"))
        return out

    def group_zones(name: str, upright: bool) -> list[dict]:
        g = groups[name]
        (tw, th), n, gap = g["tile"], len(g["cameras"]), g.get("gap", 0)
        cols, rows = tile_grid(n)
        if upright:  # a single column of whole 16:9 tiles, as the compositor draws it
            th, cols, rows = tw * 9 // 16, 1, n
        return [
            zone(
                ((i % cols) * (tw + gap), (i // cols) * (th + gap), tw, th),
                (cols * tw + (cols - 1) * gap, rows * th + (rows - 1) * gap),
                f"cam-{slug(c['title'])}",
            )
            for i, c in enumerate(g["cameras"])
        ]

    def live_card(entity: str, title: str, condition: dict | None, kind: str) -> dict:
        if kind == "advanced-camera-card":
            # retries by itself when the stream drops, e.g. while a PTZ camera slews
            c: dict[str, Any] = {
                "type": "custom:advanced-camera-card",
                "cameras": [{"camera_entity": entity}],
                "menu": {"style": "none"},
                "grid_options": {"columns": "full"},
            }
        elif kind == "webrtc-camera":
            # H.265 through MSE at once (~0.7 s on a wall tablet), where the default
            # player tries WebRTC, fails on H.265 and falls back to HLS (~8 s). No title:
            # the cameras burn their own name and time into the picture.
            c = {
                "type": "custom:webrtc-camera",
                "entity": entity,
                "mode": "webrtc,mse",
                "muted": True,
                "grid_options": {"columns": "full"},
            }
        else:
            c = {
                "type": "picture-entity",
                "name": title,
                "entity": entity,
                "camera_image": entity,
                "camera_view": "live",
                "fit_mode": "contain",
                "show_name": True,
                "show_state": False,
                "tap_action": navigate("#BACK"),
                "grid_options": {"columns": "full"},
            }
        if condition:
            c["visibility"] = [condition]
        return c

    def camera_view(entity: str) -> dict:
        """A live page: the medium channel for wall tablets and phones, the high one for
        everyone else, then the PTZ presets; header as header()."""
        cam = cams[entity]
        mid_e, hi_e = cam.get("medium") or entity, cam.get("high") or entity
        mid_kind = cam.get("live") or s["live_card"]
        hi_kind = cam.get("live") or s["hi_live_card"] or mid_kind
        cards = (
            [live_card(mid_e, cam["title"], None, mid_kind)]
            if mid_e == hi_e
            else [
                live_card(mid_e, cam["title"], mid, mid_kind),
                live_card(hi_e, cam["title"], hi, hi_kind),
            ]
        )
        sections = [{"type": "grid", "cards": cards, "column_span": 3}]
        if ptz := cam.get("ptz"):
            sections.append(
                tile_section(
                    [
                        (label, "mdi:cctv", preset_action(ptz, preset))
                        for label, preset in preset_entries(ptz)
                    ]
                )
            )
        view: dict[str, Any] = {
            "type": "sections",
            "max_columns": 3,
            "title": cam["title"],
            "path": f"cam-{slug(cam['title'])}",
            "sections": sections,
            "cards": [],
        }
        if theme:
            view["theme"] = theme
        return header(view, cam.get("zoom"), cam.get("controls", []))

    views = []
    # 1. the overview: one tap zone per group, into that group's page
    zones = {}
    for upright in (False, True):
        cfg = s["overview_portrait" if upright else "overview"]
        if not cfg.get("rows"):
            zones[upright] = []
            continue
        size, items = overview_layout(cfg, groups)
        zones[upright] = [
            zone(i["rect"], size, f"cameras-{slug(i['group'])}") for i in items
        ]
    cmd = commander_of(s)
    use_commander = s["overview_mode"] == "commander" and commander_cameras(cmd)
    if use_commander:  # the landscape overview is the commander
        zones[False] = commander_zones(cmd)
    if use_commander or s["overview"].get("rows") or s["overview_portrait"].get("rows"):
        views.append(
            picture_view(
                "cameras",
                s["title"],
                "overview",
                zones,
                [],
                "commander" if use_commander else None,
            )
        )
    # 2. one page per menu group: one tap zone per camera, into that camera's page
    for name, g in s["groups"].items():
        if g.get("menu", True):
            views.append(
                picture_view(
                    f"cameras-{slug(name)}",
                    name,
                    name,
                    {u: group_zones(name, u) for u in (False, True)},
                    g.get("controls", []),
                )
            )
    # 3. one live page per camera in a menu group
    views += [camera_view(e) for e in menu_cameras(s)]
    return {"views": views}


def preset_entries(ptz: dict) -> list[tuple[str, str]]:
    """(label on the tile, preset name). A preset is a name, or {"preset", "label"} when
    the tile needs another label (a "Home" preset would clash with the Home button)."""
    return [
        (p, p) if isinstance(p, str) else (p.get("label") or p["preset"], p["preset"])
        for p in ptz.get("presets", [])
    ]


def preset_action(ptz: dict, preset: str) -> dict:
    return {
        "action": "perform-action",
        "perform_action": ptz["action"],
        "target": {},
        "data": {**ptz.get("data", {}), "preset": preset},
    }


class Plain(yaml.SafeDumper):
    """Every value in full: no &anchors / *aliases for the shared conditions."""

    def ignore_aliases(self, data: Any) -> bool:
        return True


def to_yaml(config: dict) -> str:
    return yaml.dump(
        config, Dumper=Plain, sort_keys=False, width=10_000, allow_unicode=True
    )


# --- HA's cameras ----------------------------------------------------------------------


def ha_cameras(registry: list[dict], states: list[dict]) -> list[dict]:
    """The cameras HA has, one per camera device: the entity a composite uses (the low
    channel, or the camera itself if it has no channels), its medium and high channels,
    its zoom-level number entity and its device (for PTZ). Channels of one camera share a
    device but their names don't line up, so match on device, not name."""
    names = {
        s["entity_id"]: s.get("attributes", {}).get("friendly_name") for s in states
    }
    live = [e for e in registry if not e.get("disabled_by")]
    by_device: dict[str, dict[str, str]] = {}
    out = []
    for e in live:
        eid, dev = e["entity_id"], e.get("device_id")
        if ZOOM.match(eid) and dev:
            by_device.setdefault(dev, {})["zoom"] = eid
        if not eid.startswith("camera."):
            continue
        m = CHANNEL.search(eid)
        if m and dev:
            by_device.setdefault(dev, {})[m.group(1)] = eid
        else:
            out.append({"entity": eid, "device_id": dev})
    for dev, found in by_device.items():
        main = found.get("low") or found.get("medium") or found.get("high")
        if main:
            out.append(
                {"entity": main, "device_id": dev}
                | {k: found[k] for k in ("medium", "high", "zoom") if k in found}
            )
    for cam in out:
        name = names.get(cam["entity"]) or cam["entity"]
        cam["name"] = re.sub(
            r"\s*(low|medium|high) resolution channel$", "", name, flags=re.I
        )
    return sorted(out, key=lambda c: c["name"].lower())


def motion_sensors(
    registry: list[dict], states: list[dict], cameras: list[str]
) -> dict[str, str]:
    """Each camera's motion sensor, as the integration's Track motion finds it: a
    binary_sensor of device class motion on the camera's device, else one named after
    the camera (binary_sensor.<camera, less its channel>_motion)."""
    classes = {
        s["entity_id"]: s.get("attributes", {}).get("device_class") for s in states
    }
    by_id = {e["entity_id"]: e for e in registry}

    def motion(e: dict) -> bool:
        cls = e.get("device_class") or e.get("original_device_class")
        return cls == "motion" or classes.get(e["entity_id"]) == "motion"

    out = {}
    for cam in cameras:
        device = (by_id.get(cam) or {}).get("device_id")
        found = [
            e["entity_id"]
            for e in registry
            if device
            and e.get("device_id") == device
            and e["entity_id"].startswith("binary_sensor.")
            and not e.get("disabled_by")
            and motion(e)
        ]
        named = f"binary_sensor.{CHANNEL.sub('', cam.split('.', 1)[1])}_motion"
        if not found and classes.get(named) == "motion":
            found = [named]
        if found:
            out[cam] = sorted(found)[0]
    return out


# --- the module ------------------------------------------------------------------------


class BadRequest(Exception):
    pass


class CameraDashboard:
    def __init__(
        self,
        config_dir: Path,
        ha: HA | None,
        lan_host: Callable[[], str | None],
        live: Compositor | None = None,
        draft: Compositor | None = None,
        state_path: Path | None = None,
        helpers: Callable[[], set[str]] = set,
    ) -> None:
        self.dir = config_dir
        self.helpers = helpers  # the integration's dashboard helper scripts, as it says
        self.state_path = state_path  # the commander's main camera, kept over restarts
        self.ha = ha
        self.lan_host = lan_host
        self.live = live
        self.draft = draft
        self._lock = threading.Lock()
        self._error: str | None = None
        self.store: Store = with_defaults({})
        self._live_look = ""  # the deployed Security look, for the integration

    @property
    def draft_path(self) -> Path:
        return self.dir / DRAFT_STORE

    @property
    def live_path(self) -> Path:
        return self.dir / LIVE_STORE

    def start(self) -> None:
        """Load the draft; on first start import the older files, as draft and live."""
        if self.live and self.state_path and self.state_path.exists():
            try:
                main = json.loads(self.state_path.read_text()).get("main")
            except (OSError, ValueError, AttributeError):
                main = None
            if main:
                for comp in (self.live, self.draft):
                    if comp:
                        comp.set_main(main)
                _LOGGER.info("commander: main camera %s (as it was)", main)
        try:
            if self.draft_path.exists():
                self.store = with_defaults(json.loads(self.draft_path.read_text()))
            elif (self.dir / "groups.json").exists():
                self._import()
            else:
                _LOGGER.info("camera dashboard: starting empty")
        except (OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
            # Never overwrite a store we could not read.
            self._error = f"cannot read {self.draft_path.name}: {exc}"
            _LOGGER.error("camera dashboard: %s", self._error)
            return
        try:  # the deployed Security look, for the integration's switch
            live = json.loads(self.live_path.read_text())
            self._live_look = str((live.get("look") or {}).get("css") or "")
        except (OSError, ValueError, AttributeError):
            self._live_look = ""
        _LOGGER.info(
            "camera dashboard: %d cameras, %d groups, dashboard /%s",
            len(self.store["cameras"]),
            len(self.store["groups"]),
            self.store["dashboard"],
        )

    def _import(self) -> None:
        def read(name: str) -> Any:
            path = self.dir / name
            return json.loads(path.read_text()) if path.exists() else None

        self.store = import_legacy(
            read("groups.json"), read("entities.json") or {}, read(LEGACY_DASHBOARD)
        )
        self._write(self.draft_path, self.store)
        if not self.live_path.exists():
            self._write(self.live_path, self.store)
        _LOGGER.info(
            "camera dashboard: imported groups.json%s (%d cameras, %d groups); "
            "groups.json and entities.json are no longer read",
            " and " + LEGACY_DASHBOARD
            if (self.dir / LEGACY_DASHBOARD).exists()
            else "",
            len(self.store["cameras"]),
            len(self.store["groups"]),
        )
        for comp in (self.live, self.draft):
            if comp:
                comp.reload()

    def _commanders(self) -> list[Compositor]:
        """The compositors drawing a commander: the live one (the dashboard) and the draft
        one (the preview dashboard). One choice of main camera moves both."""
        return [c for c in (self.live, self.draft) if c and c.cfg.commander]

    def commander(self) -> dict[str, Any]:
        """For the integration: the commander's cameras (entity -> title; the titles are
        the select's options), live and draft, the main one now, and how Track motion
        behaves (seconds: hold a switch, go back after, pause after a choice by hand)."""
        cameras: dict[str, str] = {}
        main = None
        motion = dict(EMPTY_COMMANDER["motion"])
        for comp in reversed(self._commanders()):  # the live one's settings win
            motion |= comp.cfg.commander.get("motion") or {}
        for comp in self._commanders():
            cfg = comp.cfg
            for e in commander_cameras(cfg.commander):
                cameras.setdefault(e, cfg.titles.get(e, e))
            if main is None and (now := comp.main_camera()):
                main = cfg.titles.get(now, now)
        return {
            "options": list(dict.fromkeys(cameras.values())),
            "main": main,
            "cameras": cameras,
            "motion": motion,
        }

    def control(self, path: str, body: bytes) -> int:
        """The integration: POST /camera-dashboard/commander {"main": <title or entity>}
        shows that camera as the commander's main one, live and in the preview;
        POST /camera-dashboard/motion {"cameras": [...]}: the cameras seeing motion now
        (a red dot on their tiles)."""
        if path.strip("/") == "motion":
            return self._motion(body)
        if path.strip("/") != "commander":
            return 404
        try:
            wanted = str(json.loads(body or b"{}").get("main") or "")
        except (ValueError, AttributeError):
            return 400
        entity = next(
            (
                e
                for comp in self._commanders()
                for e in commander_cameras(comp.cfg.commander)
                if wanted in (e, comp.cfg.titles.get(e))
            ),
            None,
        )
        if entity is None:
            _LOGGER.warning("commander: %r is not one of its cameras", wanted)
            return 400
        for comp in self._commanders():
            comp.set_main(entity)
        _LOGGER.info("commander: main camera %s (from Home Assistant)", entity)
        if self.state_path:
            try:
                self._write(self.state_path, {"main": entity})
            except OSError as exc:
                _LOGGER.warning("commander: main camera not kept: %s", exc)
        return 200

    def _motion(self, body: bytes) -> int:
        try:
            seen = json.loads(body or b"{}").get("cameras") or []
        except (ValueError, AttributeError):
            return 400
        if not isinstance(seen, list):
            return 400
        moving = frozenset(str(e) for e in seen)
        for comp in self._commanders():
            comp.set_motion(moving)
        _LOGGER.debug("commander: motion on %s", ", ".join(sorted(moving)) or "none")
        return 200

    def deploys(self) -> dict[str, str]:
        """When the live and preview dashboards were last deployed from here."""
        try:
            return json.loads((self.dir / DEPLOYS).read_text())
        except (OSError, ValueError):
            return {}

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "state": "offline" if self._error else "running",
                "error": self._error,
                "cameras": len(self.store["cameras"]),
                "groups": len(self.store["groups"]),
                "deployed": self.deploys().get("live"),
                "changed": self._changed(),
                "commander": self.commander(),
                "look_css": self._live_look,
            }

    def _changed(self) -> bool:
        """Whether the draft differs from what is deployed live."""
        try:
            return with_defaults(json.loads(self.live_path.read_text())) != self.store
        except (OSError, ValueError):
            return True

    # -- the admin page's API

    def handle(
        self, method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> Response:
        try:
            parts = [p for p in path.strip("/").split("/") if p]
            payload = json.loads(body) if body else {}
            if not isinstance(payload, dict):
                raise BadRequest("Expected a JSON object.")
            return self._route(method, parts, query, payload)
        except BadRequest as exc:
            return _json(400, {"error": str(exc)})
        except HAError as exc:
            _LOGGER.warning("camera dashboard: %s", exc)
            return _json(502, {"error": str(exc)})
        except ValueError:
            return _json(400, {"error": "Expected JSON."})

    def _route(
        self, method: str, parts: list[str], query: dict[str, list[str]], body: Store
    ) -> Response:
        if method == "GET" and parts == []:
            return _json(200, self.view())
        if method == "PUT" and parts == []:
            return self._save(body)
        if method == "GET" and parts == ["ha"]:
            return _json(200, self.from_ha())
        if method == "GET" and parts == ["yaml"]:
            live = (query.get("target") or ["live"])[0] == "live"
            with self._lock:
                store = self.store
            if found := problems(store):
                raise BadRequest("Fix these first: " + " ".join(found))
            url_path, base = self._target(store, live)
            text = to_yaml(build_dashboard(store, base, url_path))
            return 200, "text/yaml; charset=utf-8", text.encode()
        if method == "GET" and len(parts) == 2 and parts[0] == "live":
            return _json(200, self.live_view(urllib.parse.unquote(parts[1])))
        if method == "GET" and len(parts) == 2 and parts[0] == "thumb":
            return self._thumb(urllib.parse.unquote(parts[1]))
        if method == "POST" and parts == ["render"]:
            return self._render(body)
        if method == "POST" and parts == ["deploy"]:
            target = body.get("target")
            if target not in ("preview", "live"):
                raise BadRequest("target must be preview or live.")
            return _json(200, self.deploy(target == "live"))
        if method == "GET" and parts == ["backups"]:
            return _json(200, {"backups": self.backups()})
        if method == "POST" and parts == ["restore"]:
            return _json(200, self.restore(str(body.get("name") or "")))
        if method == "POST" and parts == ["revert"]:
            return self._revert()
        return _json(404, {"error": "Not found."})

    def view(self) -> dict[str, Any]:
        def up(comp: Compositor | None) -> bool:
            return bool(comp and comp.health()["state"] != "offline")

        health = self.health()
        with self._lock:
            store = self.store
        return {
            **health,
            "store": store,
            "problems": problems(store),
            "preview_dashboard": store["dashboard"] + "-preview",
            "previewed": self.deploys().get("preview"),
            "compositor": {
                "live": up(self.live),
                "draft": up(self.draft),
                "host": store["compositor_host"] or self.lan_host(),
            },
        }

    def _save(self, body: Store) -> Response:
        store = with_defaults(
            {k: v for k, v in body.items() if k in DEFAULTS}
        )  # only known settings: the page sends back what it was given
        if not isinstance(store["cameras"], dict) or not isinstance(
            store["groups"], dict
        ):
            raise BadRequest("cameras and groups must be objects.")
        dropped = 0
        for page in [*store["cameras"].values(), *store["groups"].values()]:
            if isinstance(page, dict) and isinstance(page.get("controls"), list):
                kept = [
                    c
                    for c in page["controls"]
                    if isinstance(c, dict) and str(c.get("entity") or "").strip()
                ]
                dropped += len(page["controls"]) - len(kept)
                page["controls"] = kept
                if not kept:
                    del page["controls"]
        if dropped:
            _LOGGER.info(
                "camera dashboard: dropped %d page controls with no entity", dropped
            )
        self._record_shapes(store)
        try:
            found = problems(store)
        except (AttributeError, KeyError, TypeError) as exc:
            raise BadRequest(f"Not a camera dashboard: {exc}") from exc
        with self._lock:
            if self._error:
                raise BadRequest(
                    f"{self.draft_path.name} could not be read; fix it first."
                )
            before = self.store
            self.store = store
            self._write(self.draft_path, store)
        _LOGGER.info(
            "camera dashboard: draft saved (%d cameras, %d groups; changed: %s)%s",
            len(store["cameras"]),
            len(store["groups"]),
            ", ".join(k for k in DEFAULTS if before.get(k) != store.get(k))
            or "nothing",
            f"; {len(found)} problems" if found else "",
        )
        if self.draft:
            self.draft.reload()
        return _json(200, self.view())

    def _revert(self) -> Response:
        """Throw the draft away: back to what is deployed live."""
        if not self.live_path.exists():
            raise BadRequest("Nothing has been deployed yet.")
        store = with_defaults(json.loads(self.live_path.read_text()))
        with self._lock:
            self.store = store
            self._write(self.draft_path, store)
        _LOGGER.info("camera dashboard: draft reverted to the live config")
        if self.draft:
            self.draft.reload()
        return _json(200, self.view())

    def from_ha(self) -> dict[str, Any]:
        """HA's cameras, users (for the wall tablets) and entities (for page controls)."""
        if self.ha is None:
            return {"error": "Home Assistant is not reachable."}
        registry, states, resources = self.ha.call(
            {"type": "config/entity_registry/list"},
            {"type": "get_states"},
            {"type": "lovelace/resources"},
        )
        users = self.ha.users()
        with self._lock:
            store = self.store
        return {
            "cameras": ha_cameras(registry, states),
            "motion": motion_sensors(registry, states, list(store["cameras"])),
            "users": users,
            "warnings": warnings(
                store,
                {s["entity_id"] for s in states},
                [r.get("url", "") for r in resources or []],
                {u["id"] for u in users},
                self.helpers(),
            ),
            "entities": sorted(
                (
                    {
                        "entity": s["entity_id"],
                        "name": s.get("attributes", {}).get("friendly_name")
                        or s["entity_id"],
                        "state": s.get("state"),
                    }
                    for s in states
                ),
                key=lambda e: e["entity"],
            ),
            "commander_select": COMMANDER_SELECT,
            "error": None,
        }

    def _target(self, store: Store, live: bool) -> tuple[str, str]:
        """The dashboard's url_path and the composites' address for a deploy."""
        host = store["compositor_host"] or self.lan_host()
        if not host:
            raise BadRequest(
                "This box's LAN address is not known; set the compositor host."
            )
        comp, default = (self.live, PORT) if live else (self.draft, DRAFT_PORT)
        port = comp.port if comp else default
        url_path = store["dashboard"] + ("" if live else "-preview")
        return url_path, f"http://{host}:{port}"

    def deploy(self, live: bool) -> dict[str, Any]:
        """Save the dashboard into HA (creating it if missing, keeping a copy of what it
        replaces). Live also makes the draft the live compositor's config."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        with self._lock:
            store = self.store
        if found := problems(store):
            raise BadRequest("Fix these first: " + " ".join(found))
        url_path, base = self._target(store, live)
        target = "live" if live else "preview"
        config = build_dashboard(store, base, url_path)
        (boards,) = self.ha.call({"type": "lovelace/dashboards/list"})
        if url_path not in [b.get("url_path") for b in boards]:
            self.ha.call(
                {
                    "type": "lovelace/dashboards/create",
                    "url_path": url_path,
                    "title": store["title"] + ("" if live else " (preview)"),
                    "icon": "mdi:cctv",
                    "show_in_sidebar": True,
                    "require_admin": not live,
                }
            )
            _LOGGER.info("camera dashboard: created dashboard /%s", url_path)
        else:
            self._backup(url_path)
        self.ha.call(
            {"type": "lovelace/config/save", "url_path": url_path, "config": config}
        )
        _LOGGER.info(
            "camera dashboard: deployed /%s (%d views, composites from %s)",
            url_path,
            len(config["views"]),
            base,
        )
        with self._lock:
            stamp = datetime.now().isoformat(timespec="seconds")
            self._write(self.dir / DEPLOYS, self.deploys() | {target: stamp})
            if live:
                self._write(self.live_path, store)
                self._live_look = store["look"].get("css", "")
        if live and self.live:
            self.live.reload()
        return {"url_path": url_path, "views": len(config["views"]), **self.view()}

    # -- the dashboards' configs before each deploy

    def _backup(self, url_path: str) -> None:
        assert self.ha
        try:
            (config,) = self.ha.call({"type": "lovelace/config", "url_path": url_path})
        except HAError as exc:  # an empty dashboard has no config yet
            _LOGGER.info("camera dashboard: nothing to keep of /%s (%s)", url_path, exc)
            return
        folder = self.dir / BACKUPS
        folder.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        path = folder / f"{url_path}-{stamp}.json"
        path.write_text(json.dumps({"url_path": url_path, "config": config}))
        _LOGGER.info("camera dashboard: kept /%s's config as %s", url_path, path.name)
        old = sorted(folder.glob(f"{url_path}-[0-9]*.json"))[:-KEEP_BACKUPS]
        for p in old:
            p.unlink()
            _LOGGER.info("camera dashboard: pruned %s", p.name)

    def backups(self) -> list[dict[str, Any]]:
        folder = self.dir / BACKUPS
        return (
            [
                {
                    "name": p.name,
                    "url_path": p.name[: -len("-YYYYmmdd-HHMMSS.json")],
                    "saved": datetime.fromtimestamp(p.stat().st_mtime).isoformat(
                        timespec="seconds"
                    ),
                }
                for p in sorted(folder.glob("*.json"), reverse=True)
            ]
            if folder.is_dir()
            else []
        )

    def restore(self, name: str) -> dict[str, Any]:
        """Put a kept dashboard config back (keeping the current one first). The
        compositor's config is not changed: revert the draft and deploy for that."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        if name not in [b["name"] for b in self.backups()]:
            raise BadRequest("No such backup.")
        kept = json.loads((self.dir / BACKUPS / name).read_text())
        self._backup(kept["url_path"])
        self.ha.call(
            {
                "type": "lovelace/config/save",
                "url_path": kept["url_path"],
                "config": kept["config"],
            }
        )
        _LOGGER.info("camera dashboard: restored /%s from %s", kept["url_path"], name)
        return {"backups": self.backups()}

    # -- previews

    def _thumb(self, entity: str) -> Response:
        """A small still of one camera, for the page's thumbnails (the page decides how
        often to ask)."""
        if not self.draft:
            return _json(404, {"error": "No thumbnails: the draft compositor is off."})
        if not CAMERA.fullmatch(entity):
            return _json(400, {"error": "Not a camera."})
        try:
            image = self.draft.still(entity, THUMB_WIDTH)
        except (RuntimeError, TimeoutError) as exc:
            return _json(502, {"error": f"The draft compositor: {exc}"})
        if image is None:
            return _json(404, {"error": f"No picture from {entity}."})
        return 200, "image/jpeg", image

    def live_view(self, entity: str) -> dict[str, Any]:
        """Where the page's live view plays a camera from: HA's own MJPEG stream of each
        of its channels, as HA's camera cards do it. The browser plays it from HA directly,
        with the camera's short-lived access token in the address (the Supervisor's proxy
        holds a response until it ends, so a stream can't pass through the app)."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        with self._lock:
            cam = self.store["cameras"].get(entity)
        if cam is None or not CAMERA.fullmatch(entity):
            raise BadRequest(f"{entity} is not one of the cameras.")
        channels = [
            (
                "low" if CHANNEL.search(entity) else "camera",
                entity,
            ),
            ("medium", cam.get("medium")),
            ("high", cam.get("high")),
        ]
        wanted = {e for _, e in channels if e}
        (states,) = self.ha.call({"type": "get_states"})
        tokens = {
            s["entity_id"]: s.get("attributes", {}).get("access_token")
            for s in states
            if s["entity_id"] in wanted
        }
        out, seen = [], set()
        for name, e in channels:
            if not e or e in seen or not tokens.get(e):
                continue
            seen.add(e)
            out.append(
                {
                    "channel": name,
                    "entity": e,
                    "url": f"/api/camera_proxy_stream/{e}?token={tokens[e]}",
                }
            )
        _LOGGER.info(
            "camera dashboard: live view of %s (%s)",
            entity,
            ", ".join(c["channel"] for c in out) or "no stream",
        )
        return {"channels": out}

    def _record_shapes(self, store: Store) -> None:
        """Note each commander camera's natural shape in the store (from the stills the
        draft compositor keeps), so the picture and the dashboard's tap zones lay out
        the same way when the main camera sets its own size. A shape not known yet keeps
        the one recorded before (16:9 until there is one)."""
        cmd = store.get("commander")
        if not isinstance(cmd, dict) or not self.draft:
            return
        shapes = dict(cmd.get("aspects") or {})
        for e in commander_cameras({**EMPTY_COMMANDER, **cmd}):
            if (shape := self.draft.aspect(e)) is not None:
                shapes[e] = shape
        cmd["aspects"] = shapes

    def _render(self, body: dict[str, Any]) -> Response:
        """A live preview: one composite ("overview" or a group) drawn by the draft
        compositor from the page's unsaved edits ({"store", "name", "portrait"})."""
        if not self.draft:
            return _json(404, {"error": "No previews: the draft compositor is off."})
        name = str(body.get("name") or "")
        try:
            store = with_defaults(body.get("store") or {})
            self._record_shapes(store)
            cfg = config_from_store(store)
            image = self.draft.render(cfg, name, bool(body.get("portrait")))
        except KeyError as exc:
            return _json(404, {"error": f"No group {exc.args[0]!r}."})
        except (ValueError, TypeError, AttributeError) as exc:
            return _json(422, {"error": str(exc)})
        except (RuntimeError, TimeoutError) as exc:
            return _json(502, {"error": f"The draft compositor: {exc}"})
        return 200, mime(image), image  # WebP when it has transparent gaps

    def _write(self, path: Path, store: Store) -> None:
        """Save atomically."""
        tmp = path.with_name(path.name + ".tmp")
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps(store, indent=1))
        tmp.replace(path)


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()
