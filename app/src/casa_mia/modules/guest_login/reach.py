"""What each guest login's Home Assistant user can get to, and what is left open.

Read from HA as the Supervisor's admin user: the users, every dashboard with its views and
its kiosk-mode block, and whether kiosk-mode is installed. Facts HA itself decides:

- A non-admin can open every dashboard that is not admin-only, and every view of it, by
  its address. The sidebar, and a view's `visible` list, only decide what is shown: they
  hide, they do not lock.
- kiosk-mode hides the header (the view tabs) and the sidebar for a user, per dashboard:
  for everyone, for non-admins, for named users (matched by the user's name).

`report` turns these into one entry per login, with flags for what is probably open by
mistake, so locking a login down is checked rather than assumed. A flag the app can put
right carries a `fix`, which `fix` carries out, writing to Home Assistant through its
websocket as the Supervisor's admin user. Only the fixes named here run, each checked
afresh against HA first: the page sends a name and an id, never a command.
"""

from __future__ import annotations

import logging
from typing import Any

from ...ha import HA, HAError
from ..kiosk_mode import merge, split
from .common import BadRequest, _norm

_LOGGER = logging.getLogger(__name__)

BAD, WARN, NOTE = "bad", "warn", "note"


def gather(ha: HA) -> dict[str, Any]:
    """Everything `report` needs, read from HA (HAError if it cannot be asked)."""
    users = ha.users()
    (listed,) = ha.call({"type": "lovelace/dashboards/list"})
    boards = [{"url_path": None, "title": "Overview", "show_in_sidebar": True}] + list(
        listed
    )
    for board in boards:
        try:
            (config,) = ha.call(
                {"type": "lovelace/config", "url_path": board["url_path"]}
            )
        except HAError:
            config = None  # auto-generated or broken
        board["config"] = config if isinstance(config, dict) else None
    try:
        (resources,) = ha.call({"type": "lovelace/resources"})
    except HAError:
        resources = []
    kiosk = any("kiosk-mode" in str(r.get("url", "")) for r in resources or [])
    return {"users": users, "boards": boards, "kiosk_installed": kiosk}


def hidden_by_kiosk(block: Any, user: dict[str, Any]) -> set[str]:
    """kiosk-mode's options on for this user in a dashboard's kiosk_mode block."""
    ui, _ = split(block)
    on = set(ui["everyone"])
    on |= set(ui["admin_settings" if user.get("is_admin") else "non_admin_settings"])
    name = str(user.get("name") or "").lower()
    for entry in ui["users"]:
        if name in (u.lower() for u in entry["users"]):
            on |= set(entry["on"])
    return on


def _visible_to(view: dict[str, Any], user_id: str | None) -> bool:
    """Whether a view's tab shows for the user (HA's `visible`: a bool or user list)."""
    visible = view.get("visible", True)
    if isinstance(visible, list):
        return any(isinstance(v, dict) and v.get("user") == user_id for v in visible)
    return bool(visible) and not view.get("subview")


def _board_of(path: str) -> str | None:
    """The dashboard's url_path for a landing path (None: the default dashboard)."""
    first = _norm(path).split("/")[0]
    return None if first in ("", "lovelace") else first


def report(store: dict[str, Any], facts: dict[str, Any]) -> list[dict[str, Any]]:
    """One entry per login: its user, the endpoints using it, what it can reach, flags."""
    users = {u["id"]: u for u in facts["users"]}
    by_name = {u.get("username"): u for u in facts["users"] if u.get("username")}
    open_boards = [b for b in facts["boards"] if not b.get("require_admin")]
    out = []
    for name, login in sorted(store["logins"].items()):
        user = users.get(login.get("user_id")) or by_name.get(login.get("username"))
        eps = [
            e
            for e in store["endpoints"]
            if (e.get("account") or store["default_login"]) == name
        ]
        flags: list[dict[str, Any]] = []

        def flag(level: str, text: str, fix: dict[str, Any] | None = None) -> None:
            flags.append(
                {"level": level, "text": text, **({"fix": fix} if fix else {})}
            )

        if user is None:
            flag(BAD, f"No Home Assistant user called {login.get('username')}.")
            user = {"id": None, "name": login.get("username"), "is_admin": False}
        else:
            if user.get("is_admin"):
                flag(
                    BAD,
                    "An administrator: visitors get full control of Home Assistant.",
                )
            if not user.get("is_active", True):
                flag(BAD, "The user is deactivated, so nobody can sign in with it.")
            if not user.get("local_only"):
                flag(
                    WARN,
                    "Can sign in from outside the house network (Settings > People > "
                    "the user > 'Can only log in from the local network' is off).",
                    None
                    if user.get("is_admin")
                    else {"action": "local_only", "login": name, "label": "Local only"},
                )
        if len(eps) > 1:
            flag(
                WARN,
                f"Shared by {len(eps)} endpoints: a guest of one can be signed out only "
                "when all are closed, and sees what the others' guests see. A login each "
                "keeps them apart.",
            )
        dashboards = []
        for board in open_boards:
            views = (board.get("config") or {}).get("views") or []
            root = board["url_path"] or "lovelace"
            hidden = hidden_by_kiosk(
                (board.get("config") or {}).get("kiosk_mode"), user
            )
            if not facts["kiosk_installed"]:
                hidden = set()
            landing = [
                e["id"] for e in eps if _board_of(e["dashboard"]) == board["url_path"]
            ]
            config = board.get("config")
            dashboards.append(
                {
                    "id": board.get("id"),  # None: the default dashboard (Overview)
                    "url_path": board["url_path"],
                    # Its config can be saved here (not YAML, not made by HA).
                    "editable": isinstance(config, dict)
                    and "views" in config
                    and board.get("mode", "storage") == "storage",
                    "title": board.get("title") or root,
                    "path": f"/{root}",
                    "sidebar": bool(board.get("show_in_sidebar", True)),
                    "landing": landing,
                    "hides_header": "hide_header" in hidden,
                    "hides_sidebar": "hide_sidebar" in hidden,
                    "views": [
                        {
                            "title": v.get("title") or str(v.get("path") or n),
                            "path": f"/{root}/{v.get('path') or n}",
                            "tab": _visible_to(v, user.get("id")),
                        }
                        for n, v in enumerate(views)
                    ],
                }
            )
        if eps and not facts["kiosk_installed"]:
            flag(
                BAD,
                "kiosk-mode is not installed, so the header and sidebar show: every "
                "dashboard in the sidebar is a tap away. See the Kiosk mode page.",
            )
        for ep in eps:
            board = next(
                (
                    d
                    for d in dashboards
                    if _board_of(d["path"]) == _board_of(ep["dashboard"])
                ),
                None,
            )
            if board is None:
                flag(
                    BAD,
                    f"{ep['label']} lands on a dashboard this user cannot open (missing, "
                    "or for administrators only).",
                )
                continue
            if not facts["kiosk_installed"]:
                continue
            missing = [
                w
                for w, on in (
                    ("header", board["hides_header"]),
                    ("sidebar", board["hides_sidebar"]),
                )
                if not on
            ]
            if missing:
                flag(
                    BAD if "sidebar" in missing else WARN,
                    f"{ep['label']}: kiosk-mode does not hide the {' or the '.join(missing)} "
                    f"on {board['title']} for this user. See the Kiosk mode page.",
                    {
                        "action": "kiosk",
                        "login": name,
                        "dashboard": board["url_path"],
                        "label": "Hide them for this user",
                    }
                    if board["editable"] and user.get("id") and not user.get("is_admin")
                    else None,
                )
            elif views := [
                v for v in board["views"] if v["path"] != "/" + _norm(ep["dashboard"])
            ]:
                flag(
                    NOTE,
                    f"{board['title']} has {len(views)} other view(s): hidden from "
                    f"{ep['label']}'s visitors (no header), but open to anyone who knows "
                    "their address.",
                )
        others = [d for d in dashboards if not d["landing"]]
        if eps and others:
            in_sidebar = [d["title"] for d in others if d["sidebar"]]
            flag(
                NOTE,
                f"{len(others)} other dashboard(s) open to every user by address"
                + (f", in the sidebar: {', '.join(in_sidebar)}" if in_sidebar else "")
                + ". Make the ones guests must not see admin-only (Admin only, below).",
            )
        out.append(
            {
                "name": name,
                "user": {
                    "name": user.get("name"),
                    "is_admin": bool(user.get("is_admin")),
                    "local_only": bool(user.get("local_only")),
                    "found": user.get("id") is not None,
                },
                "endpoints": [{"id": e["id"], "label": e["label"]} for e in eps],
                "dashboards": dashboards,
                "flags": flags,
            }
        )
    _LOGGER.info(
        "guest login: checked what %d login(s) can reach: %d flag(s)",
        len(out),
        sum(1 for r in out for f in r["flags"] if f["level"] != NOTE),
    )
    return out


def fix(ha: HA, store: dict[str, Any], body: dict[str, Any]) -> str:
    """Carry out one of the report's fixes; what was done, for the log and the page.
    BadRequest, saying why, if it no longer applies."""
    action = body.get("action")
    users = {u["id"]: u for u in ha.users()}

    def user_of(name: Any) -> dict[str, Any]:
        login = store["logins"].get(name) if isinstance(name, str) else None
        if login is None:
            raise BadRequest("No such login.")
        found = users.get(login.get("user_id")) or next(
            (u for u in users.values() if u.get("username") == login["username"]), None
        )
        if found is None:
            raise BadRequest(f"Home Assistant has no user {login['username']}.")
        if found["is_admin"]:
            raise BadRequest("Not for an administrator: change it in Home Assistant.")
        return found

    if action == "local_only":
        user = user_of(body.get("login"))
        ha.call(
            {"type": "config/auth/update", "user_id": user["id"], "local_only": True}
        )
        return f"{user['name']} can now sign in only from the house network"
    if action == "admin_only":
        (listed,) = ha.call({"type": "lovelace/dashboards/list"})
        board = next(
            (d for d in listed if d.get("id") == body.get("dashboard_id")), None
        )
        if board is None:
            raise BadRequest(
                "No such dashboard (the Overview can't be made admin-only)."
            )
        landing = [
            e["label"]
            for e in store["endpoints"]
            if _board_of(e["dashboard"]) == board["url_path"]
        ]
        if landing:
            raise BadRequest(f"{', '.join(landing)} land(s) there: it must stay open.")
        ha.call(
            {
                "type": "lovelace/dashboards/update",
                "dashboard_id": board["id"],
                "require_admin": True,
            }
        )
        return (
            f"{board.get('title') or board['url_path']} is now for administrators only"
        )
    if action == "kiosk":
        user = user_of(body.get("login"))
        url_path = body.get("dashboard")
        (listed,) = ha.call({"type": "lovelace/dashboards/list"})
        if url_path is not None and not any(d["url_path"] == url_path for d in listed):
            raise BadRequest("No such dashboard.")
        if any(d["url_path"] == url_path and d.get("mode") == "yaml" for d in listed):
            raise BadRequest("A YAML dashboard: add kiosk_mode to its file yourself.")
        (config,) = ha.call({"type": "lovelace/config", "url_path": url_path})
        if not isinstance(config, dict) or "views" not in config:
            raise BadRequest("Home Assistant makes this dashboard: take control first.")
        ui, extras = split(config.get("kiosk_mode"))
        name = user["name"]
        entry = next(
            (e for e in ui["users"] if name.lower() in (u.lower() for u in e["users"])),
            None,
        )
        if entry is None:
            ui["users"].append({"users": [name], "on": ["hide_header", "hide_sidebar"]})
        else:
            entry["on"] = sorted({*entry["on"], "hide_header", "hide_sidebar"})
        config["kiosk_mode"] = merge(ui, extras)
        ha.call(
            {"type": "lovelace/config/save", "url_path": url_path, "config": config}
        )
        return f"kiosk-mode hides the header and sidebar from {name} on {url_path or 'the Overview'}"
    raise BadRequest("Unknown fix.")
