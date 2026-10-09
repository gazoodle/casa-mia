"""kiosk_mode: the admin page's editor for kiosk-mode (github.com/NemesisRE/kiosk-mode), the
dashboard plugin that hides Home Assistant's header, sidebar and more, per dashboard and per
user. Guest login leans on it: a guest's dashboard should be all they can reach.

kiosk-mode reads `kiosk_mode:` at the root of each dashboard's config. The page shows every
dashboard that has it, and edits it in two parts:
  - what the page has controls for: the on/off options in kiosk_mode.json, for everyone
    (the root), non-admins (`non_admin_settings`), admins (`admin_settings`) and named users
    (`user_settings`, by each user's name, as kiosk-mode matches them);
  - everything else, as YAML: other options (mobile_settings, entity_settings, ...),
    templates in place of on, anything new. YAML from kiosk-mode's README goes in as it is
    (with or without its `kiosk_mode:` line). It is checked as YAML before it is saved.
`split` and `merge` turn a kiosk_mode block into those two parts and back. An option set
off is kiosk-mode's default, so the page drops it; `kiosk: true` becomes its two halves,
hide_header and hide_sidebar.

Dashboards are read and saved through HA's websocket (lovelace/config, lovelace/config/save),
as the Supervisor's admin user. A YAML-mode dashboard is shown but not saved (its file is
the owner's); a dashboard Home Assistant generates is ignored by kiosk-mode until it is
taken over (Edit dashboard, Take control).
"""

from __future__ import annotations

import copy
import json
import logging
import threading
from pathlib import Path
from typing import Any

import yaml

from ..ha import HA, HAError

_LOGGER = logging.getLogger(__name__)

CATALOGUE = json.loads((Path(__file__).parent.parent / "kiosk_mode.json").read_text())
KNOWN = {k for g in CATALOGUE["groups"] for k in g["options"]}
SCOPES = ("admin_settings", "non_admin_settings")  # the page's role rows
DEFAULT = "-"  # the default dashboard's id in the API (its url_path is None)

Response = tuple[int, str, bytes]


class BadRequest(Exception):
    pass


# -- the page's part and the YAML part ---------------------------------------------------


def _take(block: dict[str, Any]) -> tuple[list[str], dict[str, Any]]:
    """The page's options from one block (those on), and what is left of it."""
    on: list[str] = []
    rest: dict[str, Any] = {}
    for key, value in block.items():
        if key == "kiosk" and isinstance(value, bool):
            if value:
                on += ["hide_header", "hide_sidebar"]
        elif key in KNOWN and isinstance(value, bool):
            if value:
                on.append(key)
        else:
            rest[key] = value
    return sorted(set(on)), rest


def split(block: Any) -> tuple[dict[str, Any], dict[str, Any]]:
    """A kiosk_mode block as the page's part (options on: everyone, non-admins, admins,
    and each group of named users) and the rest, which the page keeps as YAML."""
    if not isinstance(block, dict):
        return {
            "everyone": [],
            "non_admin_settings": [],
            "admin_settings": [],
            "users": [],
        }, {}
    root = {k: v for k, v in block.items() if k not in (*SCOPES, "user_settings")}
    everyone, extras = _take(root)
    ui: dict[str, Any] = {"everyone": everyone}
    for scope in SCOPES:
        on, rest = (
            _take(block.get(scope) or {})
            if isinstance(block.get(scope), dict)
            else ([], None)
        )
        ui[scope] = on
        if rest:
            extras[scope] = rest
        elif rest is None and scope in block:
            extras[scope] = block[scope]  # not a block of options: left as it was
    ui["users"] = []
    left_over = []
    entries = block.get("user_settings")
    for entry in entries if isinstance(entries, list) else []:
        users = entry.get("users") if isinstance(entry, dict) else None
        if not isinstance(users, list) or not all(isinstance(u, str) for u in users):
            left_over.append(entry)  # a template or something new: YAML
            continue
        on, rest = _take({k: v for k, v in entry.items() if k != "users"})
        ui["users"].append({"users": users, "on": on})
        if rest:
            left_over.append({"users": users, **rest})
    if left_over:
        extras["user_settings"] = left_over
    elif "user_settings" in block and not isinstance(entries, list):
        extras["user_settings"] = entries
    return ui, extras


def _same(a: list[str], b: list[str]) -> bool:
    return sorted(x.lower() for x in a) == sorted(x.lower() for x in b)


def merge(ui: dict[str, Any], extras: dict[str, Any]) -> dict[str, Any]:
    """The kiosk_mode block for the page's part and the YAML part (the YAML wins where
    both set the same thing)."""
    out: dict[str, Any] = {k: True for k in ui.get("everyone", [])}
    for scope in SCOPES:
        if ui.get(scope):
            out[scope] = {k: True for k in ui[scope]}
    users = [
        {"users": list(e["users"]), **{k: True for k in e["on"]}}
        for e in ui.get("users", [])
        if e["users"]
    ]
    if users:
        out["user_settings"] = users
    for key, value in copy.deepcopy(extras).items():
        if (
            key == "user_settings"
            and isinstance(value, list)
            and isinstance(out.get(key), list)
        ):
            for entry in value:
                same = next(
                    (
                        e
                        for e in out[key]
                        if isinstance(entry, dict)
                        and isinstance(entry.get("users"), list)
                        and _same(e["users"], entry["users"])
                    ),
                    None,
                )
                if same is not None:
                    same.update(entry)
                else:
                    out[key].append(entry)
        elif isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key].update(value)
        else:
            out[key] = value
    return out


def parse_yaml(text: str) -> dict[str, Any]:
    """The YAML box's options: kiosk-mode's README examples as they are, with or without
    their `kiosk_mode:` line. BadRequest, saying where, if it is not YAML options."""
    try:
        data = yaml.safe_load(text or "")
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        where = f" (line {mark.line + 1}, column {mark.column + 1})" if mark else ""
        problem = getattr(exc, "problem", None) or str(exc)
        raise BadRequest(f"Not valid YAML{where}: {problem}.") from exc
    if data is None:
        return {}
    if isinstance(data, dict) and set(data) == {"kiosk_mode"}:
        data = data["kiosk_mode"] or {}
    if not isinstance(data, dict):
        raise BadRequest(
            "Expected options, one per line (hide_header: true), not a single value or a list."
        )
    return data


def dump_yaml(data: dict[str, Any]) -> str:
    return (
        yaml.safe_dump(
            data, sort_keys=False, allow_unicode=True, default_flow_style=False
        )
        if data
        else ""
    )


def _check_ui(ui: Any) -> dict[str, Any]:
    if not isinstance(ui, dict):
        raise BadRequest("Expected the page's options.")
    out: dict[str, Any] = {}
    for scope in ("everyone", *SCOPES):
        on = ui.get(scope) or []
        if not isinstance(on, list) or any(k not in KNOWN for k in on):
            raise BadRequest(f"Unknown option in {scope}.")
        out[scope] = sorted(set(on))
    out["users"] = []
    for entry in ui.get("users") or []:
        names = [
            str(n).strip() for n in (entry or {}).get("users") or [] if str(n).strip()
        ]
        on = (entry or {}).get("on") or []
        if not isinstance(on, list) or any(k not in KNOWN for k in on):
            raise BadRequest("Unknown option for named users.")
        if names:
            out["users"].append({"users": names, "on": sorted(set(on))})
    return out


def summary(ui: dict[str, Any]) -> str:
    """One line for the list: who has the header and sidebar hidden."""

    def short(on: list[str]) -> str:
        bits = [
            w
            for k, w in (("hide_header", "header"), ("hide_sidebar", "sidebar"))
            if k in on
        ]
        more = len([k for k in on if k not in ("hide_header", "hide_sidebar")])
        if more:
            bits.append(f"{more} more")
        return " and ".join(bits[:2]) + (f", {bits[2]}" if len(bits) > 2 else "")

    parts = []
    for scope, who in (
        ("everyone", "Everyone"),
        ("non_admin_settings", "Non-admins"),
        ("admin_settings", "Admins"),
    ):
        if ui.get(scope):
            parts.append(f"{who}: {short(ui[scope])}")
    for entry in ui.get("users", []):
        if entry["on"]:
            parts.append(f"{', '.join(entry['users'])}: {short(entry['on'])}")
    return "; ".join(parts) or "Nothing hidden yet"


# -- the module --------------------------------------------------------------------------


class KioskMode:
    def __init__(self, ha: HA | None) -> None:
        self.ha = ha
        self._lock = threading.Lock()
        self._facts: dict[str, Any] = {"state": "starting"}

    def start(self) -> None:
        """Look once now, so the home page's tile has its facts."""
        threading.Thread(
            target=self._scan_quietly, name="kiosk-mode", daemon=True
        ).start()

    def _scan_quietly(self) -> None:
        try:
            self.view()
        except Exception as exc:  # the tile then says so; the page asks again
            _LOGGER.warning("kiosk mode: cannot look at the dashboards: %s", exc)

    def health(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._facts)

    # -- reading

    def _dashboards(self) -> list[dict[str, Any]]:
        assert self.ha is not None
        (listed,) = self.ha.call({"type": "lovelace/dashboards/list"})
        boards = [{"url_path": None, "title": "Overview", "mode": "storage"}] + [
            {
                "url_path": d["url_path"],
                "title": d.get("title") or d["url_path"],
                "mode": d.get("mode", "storage"),
            }
            for d in listed
        ]
        out = []
        for board in boards:
            item = {
                "id": board["url_path"] or DEFAULT,
                "title": board["title"],
                "path": f"/{board['url_path'] or 'lovelace'}",
                "mode": board["mode"],
                "editable": board["mode"] == "storage",
                "why": None,
                "enabled": False,
            }
            try:
                (config,) = self.ha.call(
                    {"type": "lovelace/config", "url_path": board["url_path"]}
                )
            except HAError:
                config = None
            if not isinstance(config, dict) or (
                "strategy" in config and "views" not in config
            ):
                item.update(
                    mode="auto",
                    editable=False,
                    why="Home Assistant makes this dashboard, so kiosk-mode ignores it. Take control of it first (Edit dashboard, then Take control).",
                )
                out.append(item)
                continue
            if board["mode"] == "yaml":
                item["why"] = "A YAML dashboard: copy the YAML into its file."
            block = config.get("kiosk_mode")
            ui, extras = split(block)
            item.update(
                enabled="kiosk_mode" in config,
                ui=ui,
                extras=dump_yaml(extras),
                summary=summary(ui),
            )
            out.append(item)
        return out

    def _resource(self) -> dict[str, Any] | None:
        assert self.ha is not None
        try:
            (resources,) = self.ha.call({"type": "lovelace/resources"})
        except HAError:
            return None
        found = next(
            (r for r in resources or [] if "kiosk-mode" in str(r.get("url", ""))), None
        )
        return {"url": found["url"]} if found else None

    def view(self) -> dict[str, Any]:
        if self.ha is None:
            return {
                "resource": None,
                "dashboards": [],
                "users": [],
                "error": "Home Assistant is not reachable.",
            }
        try:
            resource = self._resource()
            dashboards = self._dashboards()
            users = [
                {"name": u["name"], "is_admin": u["is_admin"]}
                for u in self.ha.users()
                if u.get("is_active", True)
            ]
        except HAError as exc:
            with self._lock:
                self._facts = {"state": "offline", "error": str(exc)}
            return {"resource": None, "dashboards": [], "users": [], "error": str(exc)}
        enabled = [d for d in dashboards if d["enabled"]]
        with self._lock:
            self._facts = {
                "state": "running" if resource else "unconfigured",
                "installed": resource["url"] if resource else None,
                "dashboards": len(enabled),
                "names": [d["title"] for d in enabled],
            }
        _LOGGER.debug(
            "kiosk mode: %d dashboards, %d with kiosk_mode",
            len(dashboards),
            len(enabled),
        )
        return {
            "resource": resource,
            "dashboards": dashboards,
            "users": users,
            "error": None,
        }

    # -- saving

    def _save(self, board_id: str, change) -> Response:
        """Read the dashboard's config afresh, change its kiosk_mode, save it."""
        if self.ha is None:
            return _json(503, {"error": "Home Assistant is not reachable."})
        url_path = None if board_id == DEFAULT else board_id
        try:
            (config,) = self.ha.call({"type": "lovelace/config", "url_path": url_path})
            if not isinstance(config, dict) or (
                "strategy" in config and "views" not in config
            ):
                raise BadRequest(
                    "Home Assistant makes this dashboard; take control of it first."
                )
            listed = self.ha.call({"type": "lovelace/dashboards/list"})[0]
            if any(
                d["url_path"] == url_path and d.get("mode") == "yaml" for d in listed
            ):
                raise BadRequest("A YAML dashboard: its file is yours to edit.")
            what = change(config)
            self.ha.call(
                {"type": "lovelace/config/save", "url_path": url_path, "config": config}
            )
        except HAError as exc:
            _LOGGER.error("kiosk mode: cannot save dashboard %s: %s", board_id, exc)
            return _json(502, {"error": f"Home Assistant refused: {exc}"})
        _LOGGER.info("kiosk mode: dashboard %s %s", url_path or "Overview", what)
        return _json(200, self.view())

    def handle(
        self, method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> Response:
        try:
            payload = json.loads(body) if body else {}
            if not isinstance(payload, dict):
                raise BadRequest("Expected a JSON object.")
            parts = [p for p in path.strip("/").split("/") if p]
            if method == "GET" and parts == []:
                return _json(200, self.view())
            if method == "POST" and parts == ["check"]:
                parse_yaml(str(payload.get("yaml") or ""))
                return _json(200, {"ok": True})
            if method == "PUT" and len(parts) == 1:
                ui = _check_ui(payload.get("ui"))
                block = merge(ui, parse_yaml(str(payload.get("yaml") or "")))

                def put(config: dict[str, Any]) -> str:
                    config["kiosk_mode"] = block
                    return f"kiosk_mode saved: {summary(ui)}; YAML: {', '.join(k for k in block if k not in KNOWN and k not in (*SCOPES, 'user_settings')) or 'none'}"

                return self._save(parts[0], put)
            if method == "DELETE" and len(parts) == 1:

                def drop(config: dict[str, Any]) -> str:
                    config.pop("kiosk_mode", None)
                    return "kiosk_mode removed"

                return self._save(parts[0], drop)
            return _json(404, {"error": "Not found."})
        except BadRequest as exc:
            return _json(400, {"error": str(exc)})
        except ValueError:
            return _json(400, {"error": "Expected JSON."})


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()
