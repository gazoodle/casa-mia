"""auto_dashboards: The generated dashboard: a live page for each camera.

The commanders had pages here too, to 2026.11.12-b7: the compositor's picture with a tap
zone over each tile. A commander is now put on a dashboard with its card (owner,
2026-11-23: the generated page was mistaken for the way to show a commander)."""

from __future__ import annotations

from typing import Any

import yaml

from ..cameras import preset_data, preset_entries
from ..compositor import cameras_of, commanders_of, slug, visible
from .common import Store, with_defaults


def menu_cameras(store: Store) -> list[str]:
    """The cameras that get a live page: the commanders' (in the panels shown)."""
    return cameras_of([visible(c) for c in commanders_of(store)])


# --- the dashboard ---------------------------------------------------------------------


def navigate(path: str) -> dict:
    return {"action": "navigate", "navigation_path": path}


def build_dashboard(store: Store) -> dict:
    """The whole dashboard config for HA (`views`)."""
    s = with_defaults(store)
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
        shown = cam["title"]
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

    # one live page per camera in any commander (a tap on a main camera opens its page,
    # wherever the commander's card is shown)
    return {"views": [camera_view(e) for e in menu_cameras(s)]}


def preset_action(ptz: dict, preset: str) -> dict:
    return {
        "action": "perform-action",
        "perform_action": ptz["action"],
        "target": {},
        "data": preset_data(ptz, preset),
    }


class Plain(yaml.SafeDumper):
    """Every value in full: no &anchors / *aliases for the shared conditions."""

    def ignore_aliases(self, data: Any) -> bool:
        return True


def to_yaml(config: dict) -> str:
    return yaml.dump(
        config, Dumper=Plain, sort_keys=False, width=10_000, allow_unicode=True
    )
