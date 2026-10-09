"""camera_dashboard: What is wrong with a store (problems) and what HA seems to lack (warnings)."""

from __future__ import annotations

from ..commander import commander_selects
from ..commander import problems as commander_problems
from ..compositor import (
    commanders_of,
    slug,
)
from .common import CARDS, URL_PATH, Store, with_defaults
from .dashboard import menu_cameras

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
    out += commander_problems(store)
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
