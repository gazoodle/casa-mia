"""camera_dashboard: The generated dashboard: the commanders' pages, then each camera's."""

from __future__ import annotations

from typing import Any

import yaml

from ... import swap
from ..commander import COMMANDER_SELECT, commander_selects
from ..compositor import (
    EMPTY_COMMANDER,
    PANELS,
    cameras_of,
    commander_cameras,
    commander_layout,
    commanders_of,
    slug,
    visible,
)
from .common import BLANK, HIGHLIGHT, Store, with_defaults


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
