"""camera_dashboard: one source for the Camera Commander and its HA dashboard.

The store describes everything: the cameras (chosen from HA, each with its channels,
zoom entity, PTZ presets and page controls), the commanders (each a main camera framed
by panels of cameras, drawn as one picture by the compositor; one or more, in order, each
a page of the dashboard), and the dashboard's settings
(url, Back / Home / Help, wall tablet users, phones, live cards). From it come:

  * the compositor's config: the draft compositor (DRAFT_PORT) draws the draft for
    previews; the live one (compositor.PORT) draws only what was last deployed, so
    editing never disturbs the wall tablets;
  * the dashboard: the commanders -> live camera pages, in ONE dashboard that adapts to
    whoever is looking with card visibility conditions (wall tablet users and phones get
    the medium channel, everyone else the high one). Tap zones come from the
    compositor's own layout function, so they always line up.

Deploying saves the dashboard into HA over the websocket (a storage-mode dashboard: no
configuration.yaml change, no restart), after keeping a copy of what it replaces. A
preview deploy goes to `<dashboard>-preview` and shows the draft commander; a live one
goes to the dashboard itself and makes the draft the live compositor's config.

Files in the app's config folder: camera-dashboard.json (the draft, edited on the admin
page), camera-dashboard-live.json (what was last deployed live) and
camera-dashboard-backups/ (the live dashboard's last few configs before each deploy, as
many as camera-dashboard-settings.json says to keep; the preview keeps just one).
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

from .. import swap
from ..ha import HA, HAError
from .compositor import (
    DRAFT_STORE,
    EMPTY_COMMANDER,
    LAYOUT,
    LIVE_STORE,
    PANELS,
    PORT,
    Compositor,
    cameras_of,
    channels,
    commander_cameras,
    commander_layout,
    commanders_of,
    config_from_store,
    mime,
    ratio,
    slug,
    visible,
)

_LOGGER = logging.getLogger(__name__)

DRAFT_PORT = 8098
THUMB_WIDTH = 160  # the page's camera thumbnails
CAMERA = re.compile(r"camera\.[a-z0-9_]+")
# The integration's Camera Commander devices, one per commander: each one's Main camera
# select (options: its camera titles), which its taps and automations set. The first
# commander there was (id "") is on the Camera Commander device itself; the others on a
# device each, "Camera Commander <name>". Found in HA's entity registry by unique id.
COMMANDER_SELECT = "select.camera_commander_main_camera"


# The integration's unique ids for a commander's entities, after its entry id and "_":
# the first commander's (id ""), and any other's.
# Per entity: its domain, its unique id for the first commander (id "") and for any
# other, and the end of the entity id the integration gives it.
UNIQUE_IDS = {
    "main": ("select", "commander_main", "commander_{}_main", "main_camera"),
    "track_motion": (
        "switch",
        "track_motion",
        "commander_{}_track_motion",
        "track_motion",
    ),
    "security_look": (
        "switch",
        "security_look",
        "commander_{}_security_look",
        "security_look",
    ),
}


def commander_entities(
    store: Store, registry: list[dict] | None, what: str = "main"
) -> dict[str, str]:
    """Each commander's (by id) Main camera select (`what` "main"), Track motion switch
    ("track_motion") or Security look switch ("security_look"): as HA's entity registry
    has it (by unique id), else the entity id the integration gives a new one (from its
    device's name)."""
    domain, first, other, name = UNIQUE_IDS[what]
    found = {
        e.get("unique_id", "").partition("_")[2]: e["entity_id"]
        for e in registry or []
        if e.get("platform") == "casa_mia" and e["entity_id"].startswith(domain + ".")
    }
    out = {}
    for cmd in commanders_of(store):
        cid = cmd["id"]
        device = "camera_commander" + (
            "_" + slug(cmd["name"]).replace("-", "_") if cid else ""
        )
        out[cid] = found.get(other.format(cid) if cid else first) or (
            f"{domain}.{device}_{name}"
        )
    return out


def commander_selects(store: Store, registry: list[dict] | None) -> dict[str, str]:
    return commander_entities(store, registry, "main")


# The look of every camera picture on the dashboards when the integration's Security look
# switch is on: a CSS filter, made by the page from a tint (applied by the browser).
# The default tint's filter (as the page makes it for #3d7bff, strength 3, 20% darker):
# a look left at its defaults, or saved before it had a filter, uses this.
DEFAULT_LOOK_CSS = "grayscale(1) sepia(1) hue-rotate(186deg) saturate(3) brightness(0.80) contrast(1.1)"
LOOK_CSS = re.compile(
    r"^(\s*(grayscale|sepia|hue-rotate|saturate|brightness|contrast|invert|opacity|blur)"
    r"\(\s*-?[0-9.]+(deg|%|px)?\s*\))*\s*$"
)
BACKUPS = "camera-dashboard-backups"
DEPLOYS = "camera-dashboard-deploys.json"  # when each was last deployed: live, preview
SETTINGS = "camera-dashboard-settings.json"  # {"keep": older live versions to keep}
MAX_KEEP = 5
DEFAULT_KEEP = 3
PREVIEW = (
    "-preview"  # a preview dashboard's url_path ends with this; it keeps one backup
)
# A 1x1 transparent image: the tap zones over a composite.
BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
# The same, marked: the commander's highlight, which Keep camera pictures live pulses.
HIGHLIGHT = BLANK + "#cm-highlight"
CHANNEL = re.compile(r"_(high|medium|low)_resolution_channel$")
ZOOM = re.compile(r"^number\..*_zoom_level$")
URL_PATH = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)+$")  # HA wants a hyphen in it
FITS = (
    "cover",
    "contain",
    "stack",
    "reverse",
    "centre",
)  # a panel's (see EMPTY_COMMANDER)
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
    # Screens by media query: portrait ones (for the commanders to come, each shown to
    # the screens it suits) and phones (the medium channel).
    "portrait_query": "(orientation: portrait)",
    "phone_query": "(max-width: 767px)",
    "wall_users": [],  # HA user ids of the wall tablets: they get the medium channel
    "live_card": "picture-entity",  # wall tablets and phones
    "hi_live_card": "",  # everyone else; blank = the same as live_card
    "compositor_host": "",  # blank = this box's LAN address
    "cameras": {},
    # The Security look: a tint (and how strong, how dark) and the CSS filter made of it.
    "look": {"tint": "#3d7bff", "strength": 3, "darkness": 20, "css": DEFAULT_LOOK_CSS},
    "commanders": [EMPTY_COMMANDER],  # in order: the dashboard's first pages
}

Response = tuple[int, str, bytes]
Store = dict[str, Any]


def with_defaults(store: Store) -> Store:
    """A store with every setting and nothing else (settings since dropped, such as the
    groups, are left out); its own copy, sharing nothing with DEFAULTS. A store from
    before there were several commanders gets its one as the first (named Cameras)."""
    if "commanders" not in store and isinstance(store.get("commander"), dict):
        store = {**store, "commanders": commanders_of(store)}
    return copy.deepcopy(
        {**DEFAULTS, **{k: v for k, v in store.items() if k in DEFAULTS}}
    )


# --- checking a store ------------------------------------------------------------------


def problems(store: Store) -> list[str]:
    """What is wrong with a store, in words for the admin page; empty when it is fine."""
    out: list[str] = []
    cams = store.get("cameras", {})
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
    seen: dict[str, str] = {}
    for n in [cams[e]["title"] for e in menu_cameras(store) if e in cams]:
        if slug(n) in seen:
            out.append(f"The camera pages {seen[slug(n)]!r} and {n!r} clash.")
        seen[slug(n)] = n
    look_css = (store.get("look") or {}).get("css", "")
    if not isinstance(look_css, str) or not LOOK_CSS.match(look_css):
        out.append("The Security look is not a CSS filter the dashboards can use.")
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
        for key, value in (cmd.get("motion") or {}).items():
            if not isinstance(value, (int, float)) or value < 0:
                out.append(f"{the}'s Track motion {key} must be 0 seconds or more.")
        if cmd.get("main") and cmd["main"] not in commander_cameras(cmd):
            out.append(f"{the}'s main camera must be one of its cameras.")
        if not commander_cameras(visible(cmd)):
            out.append(f"{the} has no cameras: put some in its panels (shown).")
    return out


def warnings(
    store: Store,
    entities: set[str],
    resources: list[str],
    users: set[str],
    helpers: set[str] | frozenset[str] | None = frozenset(),
    selects: dict[str, str] | None = None,
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
    names = {c["id"]: c["name"] for c in commanders_of(s)}
    for cid, select in (selects or commander_selects(s, None)).items():
        if select not in entities:
            out.append(
                f"{select} ({names.get(cid, cid)}'s taps) is not in Home Assistant: it "
                "comes with the Casa Mia integration while Camera Dashboard is on (a "
                "new commander's once the draft is saved; restart Home Assistant if the "
                "integration was just updated)."
            )
    if helpers is None:  # the integration hasn't said yet since the app started
        return out
    by_hand, ours = "nav_back" in urls, "cm-back.js" in helpers
    if not by_hand and not ours:
        out.append(
            "Back needs a Back button helper: switch on the Back button helper on "
            "the Settings page (the cog on the home page; it turns #BACK into the "
            "browser's Back)."
        )
    elif by_hand and ours:
        out.append(
            "Back goes back twice: nav_back_helper.js is among the dashboard resources "
            "and the Back button helper (Settings page) is on. Remove the resource."
        )
    return out


def menu_cameras(store: Store) -> list[str]:
    """The cameras that get a live page: the commanders' (in the panels shown)."""
    return cameras_of([visible(c) for c in commanders_of(store)])


# --- the dashboard ---------------------------------------------------------------------


def navigate(path: str) -> dict:
    return {"action": "navigate", "navigation_path": path}


def build_dashboard(
    store: Store,
    image_base: str,
    url_path: str,
    selects: dict[str, str] | None = None,
) -> dict:
    """The whole dashboard config for HA (`views`), with the composites served from
    image_base (http://host:port), the tap zones navigating inside url_path and setting
    each commander's Main camera select (`selects`: id -> entity, see
    `commander_selects`)."""
    s = with_defaults(store)
    selects = selects or commander_selects(s, None)
    cams = s["cameras"]
    theme = s["theme"] or None
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

    def commander_view(cmd: dict) -> dict:
        """The nav, then the commander's picture with its tap zones."""
        v: dict[str, Any] = {
            "type": "sections",
            "max_columns": 3,
            "title": cmd["name"],
            "path": slug(cmd["name"]),
            "sections": [
                {
                    "type": "grid",
                    "column_span": 3,
                    "cards": [
                        {
                            "type": "picture-elements",
                            "image": f"{image_base}/g/{slug(cmd['name'])}.mjpg",
                            "grid_options": {"columns": "full"},
                            "elements": commander_zones(cmd),
                        }
                    ],
                }
            ],
            "cards": [],
        }
        if theme:
            v["theme"] = theme
        return header(v, None, [])

    def commander_zones(cmd: dict) -> list[dict]:
        """A tap on a panel's camera makes it the main one (the integration's select); a
        tap on the main camera opens its live page: one zone per camera over the main
        area, each shown only while that camera is the main one. With the main camera
        at its own shape the whole layout follows it, so then every zone is in one set
        per main camera, each shown while that camera is the main one. While its select
        holds none of its cameras (nothing yet, or unavailable), the commander shows its
        own main camera, and so do its zones."""
        title = lambda e: cams[e]["title"]  # noqa: E731
        # The select's options come through the screenshot swap: its stand-ins.
        option = lambda e: swap.out(cams[e]["title"])  # noqa: E731
        select = selects.get(cmd["id"], COMMANDER_SELECT)
        mine = commander_cameras(cmd)
        own = cmd["main"] if cmd.get("main") in mine else mine[0]

        def shown_while(e: str | None, elements: list[dict]) -> dict:
            test = (
                {"state": option(e)}
                if e
                else {"state_not": [option(c) for c in mine]}  # its own main camera
            )
            return {
                "type": "conditional",
                "conditions": [{"condition": "state", "entity": select} | test],
                "elements": elements,
            }

        if cmd.get("main_fit") == "own":
            return [
                shown_while(e, highlight(cmd, m, m) + layout_zones(cmd, m, select))
                for e, m in [*((e, e) for e in mine), (None, own)]
            ]
        size, main_rect, _ = commander_layout(cmd)
        return layout_zones(cmd, None, select) + [
            shown_while(
                e,
                highlight(cmd, m, None)
                + [zone(main_rect, size, f"cam-{slug(title(m))}")],
            )
            for e, m in [*((e, e) for e in mine), (None, own)]
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

    def layout_zones(cmd: dict, main: str | None, select: str) -> list[dict]:
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
                    "target": {"entity_id": select},
                    "data": {"option": swap.out(title(e))},
                },
            )
            for panel in PANELS
            for e, rect in zip(cmd[panel]["cameras"], rects[panel], strict=True)
            if rect[2] > 0 and rect[3] > 0
        ]
        if main:
            out.append(zone(main_rect, size, f"cam-{slug(title(main))}"))
        return out

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
        shown = swap.out(cam["title"])  # its path keeps the real title
        mid_e, hi_e = cam.get("medium") or entity, cam.get("high") or entity
        mid_kind = cam.get("live") or s["live_card"]
        hi_kind = cam.get("live") or s["hi_live_card"] or mid_kind
        cards = (
            [live_card(mid_e, shown, None, mid_kind)]
            if mid_e == hi_e
            else [
                live_card(mid_e, shown, mid, mid_kind),
                live_card(hi_e, shown, hi, hi_kind),
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
            "title": shown,
            "path": f"cam-{slug(cam['title'])}",
            "sections": sections,
            "cards": [],
        }
        if theme:
            view["theme"] = theme
        return header(view, cam.get("zoom"), cam.get("controls", []))

    cmds = [
        c
        for c in map(visible, commanders_of(s))
        if commander_cameras(c) and c.get("page", True)
    ]
    # the commanders with a page, then one live page per camera in any commander (a tap
    # on a main camera opens its page, wherever the commander is shown)
    return {
        "views": [commander_view(c) for c in cmds]
        + [camera_view(e) for e in menu_cameras(s)]
    }


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
        helpers: Callable[[], set[str] | None] = set,
    ) -> None:
        self.dir = config_dir
        # the integration's dashboard helper scripts, as it says (None: not said yet)
        self.helpers = helpers
        self.state_path = state_path  # the commander's main camera, kept over restarts
        self.ha = ha
        self.lan_host = lan_host
        self.live = live
        self.draft = draft
        self._lock = threading.Lock()
        self._error: str | None = None
        self._mains: dict[str, str] = {}  # commander id -> main camera, as chosen
        self.store: Store = with_defaults({})

    @property
    def draft_path(self) -> Path:
        return self.dir / DRAFT_STORE

    @property
    def live_path(self) -> Path:
        return self.dir / LIVE_STORE

    def start(self) -> None:
        """Load the draft, and each commander's main camera as it was."""
        self._prune()  # to what is kept now (it used to be 20 each)
        if self.live and self.state_path and self.state_path.exists():
            try:
                kept = json.loads(self.state_path.read_text())
                # {"main": camera}: kept before there were several (the first one's)
                mains = kept.get("mains") or (
                    {"": kept["main"]} if kept.get("main") else {}
                )
            except (OSError, ValueError, AttributeError):
                mains = {}
            self._mains = {str(k): str(v) for k, v in mains.items()}
            for cid, main in self._mains.items():
                for comp in (self.live, self.draft):
                    if comp:
                        comp.set_main(main, cid)
                _LOGGER.info("commander %r: main camera %s (as it was)", cid, main)
        try:
            if self.draft_path.exists():
                self.store = with_defaults(json.loads(self.draft_path.read_text()))
            else:
                _LOGGER.info("camera dashboard: starting empty")
        except (OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
            # Never overwrite a store we could not read.
            self._error = f"cannot read {self.draft_path.name}: {exc}"
            _LOGGER.error("camera dashboard: %s", self._error)
            return
        _LOGGER.info(
            "camera dashboard: %d cameras, %d commanders (%d cameras in them), "
            "dashboard /%s",
            len(self.store["cameras"]),
            len(self.store["commanders"]),
            len(menu_cameras(self.store)),
            self.store["dashboard"],
        )

    def _commanders(self) -> list[Compositor]:
        """The compositors drawing commanders: the live one (the dashboard) and the draft
        one (the preview dashboard). One choice of main camera moves both."""
        return [c for c in (self.live, self.draft) if c and c.cfg.commanders]

    def commanders(self) -> list[dict[str, Any]]:
        """For the integration, a device each: every commander (by id; live and draft,
        the live one's name and settings winning), its cameras (entity -> title; the
        titles are its select's options), its main one now, and how its Track motion
        behaves (seconds: hold a switch, go back after, pause after a choice by hand)."""
        out: dict[str, dict[str, Any]] = {}
        for comp in self._commanders():
            cfg = comp.cfg
            for cmd in cfg.commanders:
                one = out.setdefault(
                    cmd["id"],
                    {
                        "id": cmd["id"],
                        "name": cmd["name"],
                        # its picture's address (the Security look finds it by this)
                        "picture": f"/g/{slug(cmd['name'])}.mjpg",
                        "cameras": {},
                        "main": None,
                        "motion": {**EMPTY_COMMANDER["motion"], **cmd["motion"]},
                    },
                )
                # The card's view of it: as deployed, and as the saved draft is
                live = comp is not self.draft
                one.setdefault(
                    "card" if live else "draft_card", self._card(cmd, cfg.titles, live)
                )
                for e in commander_cameras(cmd):
                    one["cameras"].setdefault(e, cfg.titles.get(e, e))
                if one["main"] is None and (now := comp.main_camera(cmd)):
                    one["main"] = cfg.titles.get(now, now)
        for one in out.values():
            one["options"] = list(dict.fromkeys(one["cameras"].values()))
        return list(out.values())

    def _card(self, cmd: dict, titles: dict[str, str], live: bool) -> dict[str, Any]:
        """What the Camera Commander card draws a commander from (its Main camera
        select's `card` attribute, or `draft_card` for the saved draft, from the draft
        compositor): the layout (it lays it out with the same engine, so its taps line
        up), its picture's address, the main camera at start, and each camera's title
        (its select's option) and live page on the dashboard (or the preview one), and its
        channels, smallest first, each with its size where known (the card plays its
        main camera's as live video, when the compositor's live_main switch is on)."""
        try:
            url_path, base = self._target(self.store, live)
        except BadRequest:  # the LAN address not known yet: no picture until it is
            url_path, base = self.store["dashboard"], ""
        mine = commander_cameras(cmd)
        comp = self.live if live else self.draft
        cfg = config_from_store(self.store)
        sizes = comp.gather.res if comp else {}
        keys = (
            "width",
            "height",
            "aspects",
            "highlight",
            "debug",
            *(k for k, o in LAYOUT["main"].items() if o.get("for") != "view"),
            *PANELS,
        )
        return {
            "picture": f"{base}/g/{slug(cmd['name'])}.mjpg" if base else "",
            "layout": {k: cmd[k] for k in keys},
            "start": cmd["main"]
            if cmd.get("main") in mine
            else mine[0]
            if mine
            else "",
            "cameras": {
                e: {
                    "title": titles.get(e, e),
                    "live": f"/{url_path}/cam-{slug(titles.get(e, e))}",
                    "channels": [
                        [c, *sizes[c]] if c in sizes else [c, 0, 0]
                        for c in channels(cfg, e).values()
                    ],
                }
                for e in mine
            },
            "live_main": bool(comp and comp.gather.flags["live_main"]),
        }

    def commander(self) -> dict[str, Any]:
        """The first commander there was (id ""), as an integration from before there
        were several reads it."""
        found = [c for c in self.commanders() if not c["id"]]
        return found[0] if found else {}

    def control(self, path: str, body: bytes) -> int:
        """The integration: POST /camera-dashboard/commander {"main": <title or entity>,
        "commander": <id>} shows that camera as that commander's main one, live and in
        the preview (no id: the first commander there was, id "");
        POST /camera-dashboard/motion {"cameras": [...], "commander": <id>}: its cameras
        seeing motion now (a red dot on their tiles; no id: every commander's)."""
        if path.strip("/") == "motion":
            return self._motion(body)
        if path.strip("/") != "commander":
            return 404
        try:
            data = json.loads(body or b"{}")
            wanted, cid = str(data.get("main") or ""), str(data.get("commander") or "")
        except (ValueError, AttributeError):
            return 400
        entity = next(
            (
                e
                for comp in self._commanders()
                for cmd in comp.cfg.commanders
                if cmd["id"] == cid
                for e in commander_cameras(cmd)
                if wanted in (e, comp.cfg.titles.get(e))
            ),
            None,
        )
        if entity is None:
            _LOGGER.warning("commander %r: %r is not one of its cameras", cid, wanted)
            return 400
        for comp in self._commanders():
            comp.set_main(entity, cid)
        _LOGGER.info("commander %r: main camera %s (from Home Assistant)", cid, entity)
        self._mains[cid] = entity
        if self.state_path:
            try:
                self._write(self.state_path, {"mains": self._mains})
            except OSError as exc:
                _LOGGER.warning("commander: main camera not kept: %s", exc)
        return 200

    def _motion(self, body: bytes) -> int:
        try:
            data = json.loads(body or b"{}")
            seen, cid = data.get("cameras") or [], data.get("commander")
        except (ValueError, AttributeError):
            return 400
        if not isinstance(seen, list) or not isinstance(cid, (str, type(None))):
            return 400
        moving = frozenset(str(e) for e in seen)
        for comp in self._commanders():
            comp.set_motion(moving, cid)
        _LOGGER.debug(
            "commander %r: motion on %s", cid, ", ".join(sorted(moving)) or "none"
        )
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
                "deployed": self.deploys().get("live"),
                "changed": self._changed(),
                "commander": self.commander(),
                "commanders": self.commanders(),
                # The Security look follows the saved draft: it is only how the
                # pictures look, best seen as soon as it is saved.
                "look_css": self.store["look"].get("css") or DEFAULT_LOOK_CSS,
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
            text = to_yaml(build_dashboard(store, base, url_path, self._selects(store)))
            return 200, "text/yaml; charset=utf-8", text.encode()
        if method == "GET" and len(parts) == 2 and parts[0] == "live":
            return _json(200, self.live_view(urllib.parse.unquote(parts[1])))
        if method == "GET" and len(parts) == 2 and parts[0] == "thumb":
            return self._thumb(urllib.parse.unquote(parts[1]))
        if method == "POST" and parts == ["switch"]:
            return _json(200, self._flip(body))
        if method == "POST" and parts == ["render"]:
            return self._render(body)
        if method == "POST" and parts == ["deploy"]:
            target = body.get("target")
            if target not in ("preview", "live"):
                raise BadRequest("target must be preview or live.")
            return _json(200, self.deploy(target == "live"))
        if method == "POST" and parts == ["remove-preview"]:
            return _json(200, self.remove_preview())
        if method == "GET" and parts == ["backups"]:
            return _json(200, {"backups": self.backups()})
        if method == "POST" and parts == ["restore"]:
            return _json(200, self.restore(str(body.get("name") or "")))
        if method == "POST" and parts == ["revert-preview"]:
            return _json(200, self.revert_preview())
        if method == "PUT" and parts == ["keep"]:
            return _json(200, self.set_keep(body.get("keep")))
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
            "preview_backup": next(
                (b["saved"] for b in self._kept(preview=True)), None
            ),
            "keep": self.keep(),
            "max_keep": MAX_KEEP,
            "empty_commander": EMPTY_COMMANDER,  # what a blank new one starts as
            "compositor": {
                "live": up(self.live),
                "draft": up(self.draft),
                "host": store["compositor_host"] or self.lan_host(),
            },
        }

    def _save(self, body: Store) -> Response:
        store = with_defaults(body)  # only known settings: the page sends back all
        if not isinstance(store["cameras"], dict):
            raise BadRequest("cameras must be an object.")
        dropped = 0
        for page in store["cameras"].values():
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
            "camera dashboard: draft saved (%d cameras; changed: %s)%s",
            len(store["cameras"]),
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
        selects = commander_selects(store, registry)
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
                selects,
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
            "commander_selects": selects,
            "commander_switches": commander_entities(store, registry, "track_motion"),
            "commander_looks": commander_entities(store, registry, "security_look"),
            "error": None,
        }

    def _selects(self, store: Store) -> dict[str, str]:
        """Each commander's Main camera select, from HA's entity registry."""
        if self.ha is None:
            return commander_selects(store, None)
        (registry,) = self.ha.call({"type": "config/entity_registry/list"})
        return commander_selects(store, registry)

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
        config = build_dashboard(store, base, url_path, self._selects(store))
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
        if live and self.live:
            self.live.reload()
        return {"url_path": url_path, "views": len(config["views"]), **self.view()}

    def remove_preview(self) -> dict[str, Any]:
        """Delete the preview dashboard from HA, and the backup of it (there would be
        nothing to put it back on). The live dashboard and the draft are untouched."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        with self._lock:
            url_path = self.store["dashboard"] + "-preview"
        (boards,) = self.ha.call({"type": "lovelace/dashboards/list"})
        board = next((b for b in boards if b.get("url_path") == url_path), None)
        if board is not None:
            self.ha.call(
                {"type": "lovelace/dashboards/delete", "dashboard_id": board["id"]}
            )
            _LOGGER.info(
                "camera dashboard: removed the preview dashboard /%s", url_path
            )
        else:
            _LOGGER.info(
                "camera dashboard: no preview dashboard /%s to remove", url_path
            )
        with self._lock:
            deploys = self.deploys()
            deploys.pop("preview", None)
            self._write(self.dir / DEPLOYS, deploys)
        for p in self._files(url_path):
            p.unlink()
        return self.view()

    # -- the dashboards' configs before each deploy

    def keep(self) -> int:
        """How many older versions of the live dashboard are kept (0 to MAX_KEEP)."""
        try:
            keep = int(json.loads((self.dir / SETTINGS).read_text())["keep"])
        except (OSError, ValueError, KeyError, TypeError):
            return DEFAULT_KEEP
        return min(max(keep, 0), MAX_KEEP)

    def set_keep(self, keep: Any) -> dict[str, Any]:
        if (
            not isinstance(keep, int)
            or isinstance(keep, bool)
            or not 0 <= keep <= MAX_KEEP
        ):
            raise BadRequest(f"keep must be a whole number from 0 to {MAX_KEEP}.")
        self._write(self.dir / SETTINGS, {"keep": keep})
        _LOGGER.info("camera dashboard: keeping %d older live versions", keep)
        self._prune()
        return self.view()

    def _files(self, url_path: str) -> list[Path]:
        folder = self.dir / BACKUPS
        return sorted(folder.glob(f"{url_path}-[0-9]*.json")) if folder.is_dir() else []

    def _prune(self) -> None:
        """Drop the backups beyond what is kept: one per preview, `keep` per live."""
        folder = self.dir / BACKUPS
        found: dict[str, list[Path]] = {}
        for p in sorted(folder.glob("*.json")) if folder.is_dir() else []:
            found.setdefault(p.name[: -len("-YYYYmmdd-HHMMSS.json")], []).append(p)
        for url_path, files in found.items():
            keep = 1 if url_path.endswith(PREVIEW) else self.keep()
            for p in files[: -keep or None]:
                p.unlink()
                _LOGGER.info("camera dashboard: pruned %s", p.name)

    def _backup(self, url_path: str) -> None:
        assert self.ha
        preview = url_path.endswith(PREVIEW)
        if not preview and self.keep() == 0:
            return
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
        self._prune()

    def _kept(self, preview: bool) -> list[dict[str, Any]]:
        """The kept configs, newest first: the preview's, or the live dashboard's."""
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
                if p.name[: -len("-YYYYmmdd-HHMMSS.json")].endswith(PREVIEW) == preview
            ]
            if folder.is_dir()
            else []
        )

    def backups(self) -> list[dict[str, Any]]:
        """The live dashboard's kept configs (the preview's one is revert_preview's)."""
        return self._kept(preview=False)

    def _put_back(self, name: str) -> None:
        assert self.ha
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

    def restore(self, name: str) -> dict[str, Any]:
        """Put a kept live dashboard config back (keeping the current one first, if
        any are kept). The compositor's config is not changed: revert the draft and
        deploy for that."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        if name not in [b["name"] for b in self.backups()]:
            raise BadRequest("No such backup.")
        self._put_back(name)
        return {"backups": self.backups()}

    def revert_preview(self) -> dict[str, Any]:
        """Put the preview dashboard back as it was before its last deploy. Doing it
        again puts it forward, as the config it replaces is kept."""
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        if not (kept := self._kept(preview=True)):
            raise BadRequest("The preview has no earlier version.")
        self._put_back(kept[0]["name"])
        return self.view()

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

    def _flip(self, body: dict[str, Any]) -> dict[str, Any]:
        """Turn one of the integration's commander switches (Security look, Track
        motion) on or off, through Home Assistant, which keeps its state."""
        entity, on = body.get("entity"), body.get("on")
        if self.ha is None:
            raise BadRequest("Home Assistant is not reachable.")
        with self._lock:
            store = self.store
        (registry,) = self.ha.call({"type": "config/entity_registry/list"})
        switches = {
            *commander_entities(store, registry, "track_motion").values(),
            *commander_entities(store, registry, "security_look").values(),
        }
        if entity not in switches or not isinstance(on, bool):
            raise BadRequest("Not one of the commanders' switches.")
        self.ha.call(
            {
                "type": "call_service",
                "domain": "switch",
                "service": "turn_on" if on else "turn_off",
                "target": {"entity_id": entity},
            }
        )
        _LOGGER.info("camera dashboard: %s switched %s", entity, "on" if on else "off")
        return {"entity": entity, "on": on}

    def _record_shapes(self, store: Store) -> None:
        """Note each commander camera's natural shape in the store (from the stills the
        draft compositor keeps), so the picture and the dashboard's tap zones lay out
        the same way when the main camera sets its own size. A shape not known yet keeps
        the one recorded before (16:9 until there is one)."""
        cmds = store.get("commanders")
        if not isinstance(cmds, list) or not self.draft:
            return
        for cmd in cmds:
            if not isinstance(cmd, dict):
                continue
            shapes = dict(cmd.get("aspects") or {})
            for e in commander_cameras({**EMPTY_COMMANDER, **cmd}):
                if (shape := self.draft.aspect(e)) is not None:
                    shapes[e] = shape
            cmd["aspects"] = shapes

    def _render(self, body: dict[str, Any]) -> Response:
        """A live preview: one commander (`index`, its place) drawn by the draft
        compositor from the page's unsaved edits ({"store", "index"})."""
        if not self.draft:
            return _json(404, {"error": "No previews: the draft compositor is off."})
        try:
            store = with_defaults(body.get("store") or {})
            self._record_shapes(store)
            index = body.get("index", 0)
            if not isinstance(index, int):
                raise ValueError("index must be a number")
            image = self.draft.render(config_from_store(store), index)
        except (ValueError, TypeError, AttributeError, KeyError) as exc:
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
