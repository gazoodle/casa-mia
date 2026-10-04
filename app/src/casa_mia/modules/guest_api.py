"""The guest-login admin API (for the admin panel, through ingress) and its config store.

The store is `guest-login.json` in the app's config folder and is the master copy: logins
(HA users, with the password the module signs visitors in with), endpoints, welcome-page
defaults and the host printed in QR codes. Every change is saved and applied to the
running module at once; nothing restarts.
"""

from __future__ import annotations

import json
import logging
import re
import secrets
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

from .. import qr, swap
from ..ha import HA, HAError
from .guest_login import (
    MAX_DELAY,
    PORT,
    WELCOME_DELAY,
    WELCOME_MESSAGE,
    Endpoint,
    GuestLogin,
    _norm,
    welcome_title,
)
from .guest_page import header_jpeg, render_welcome

_LOGGER = logging.getLogger(__name__)

NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")  # endpoint ids and login names
SLUG = re.compile(r"^[A-Za-z0-9_-]{12,}$")
TYPES = ("guest", "engineer")
# Fields of an endpoint that live in the store (the rest of Endpoint is runtime state).
STORED = (
    "id",
    "label",
    "dashboard",
    "type",
    "account",
    "slug",
    "legacy",
    "title",
    "message",
    "delay",
)

Response = tuple[int, str, bytes]


def empty_store() -> dict[str, Any]:
    return {
        "logins": {},
        "default_login": "",
        "endpoints": [],
        "welcome": {
            "title": welcome_title(),
            "message": WELCOME_MESSAGE,
            "delay": WELCOME_DELAY,
        },
        "qr_host": "",
    }


def load_store(path: Path) -> dict[str, Any]:
    data = empty_store()
    if path.exists():
        try:
            data.update(json.loads(path.read_text()))
        except (OSError, ValueError) as exc:
            _LOGGER.error("guest login: cannot read %s (%s); starting empty", path, exc)
    return data


def runtime(
    data: dict[str, Any],
) -> tuple[list[Endpoint], dict[str, tuple[str, str]], str, tuple[str, str, int]]:
    """The store as GuestLogin.apply() takes it."""
    endpoints = [
        Endpoint(**{k: v for k, v in e.items() if k in STORED})
        for e in data["endpoints"]
    ]
    logins = {n: (lg["username"], lg["password"]) for n, lg in data["logins"].items()}
    w = data["welcome"]
    welcome = (
        w.get("title") or welcome_title(),
        w.get("message") or WELCOME_MESSAGE,
        int(w.get("delay", WELCOME_DELAY)),
    )
    return endpoints, logins, data["default_login"], welcome


class BadRequest(Exception):
    pass


def _clean_endpoint(
    body: dict[str, Any], data: dict[str, Any], old_id: str | None
) -> dict[str, Any]:
    ep = {k: body.get(k) for k in STORED}
    ep["id"] = str(ep["id"] or "").strip()
    ep["label"] = str(ep["label"] or "").strip()
    if not NAME.match(ep["id"]) or ep["id"] == "login":
        raise BadRequest(
            "ID: lower-case letters, digits and dashes, for example suite-1 ('login' is reserved)."
        )
    if ep["id"] != old_id and any(e["id"] == ep["id"] for e in data["endpoints"]):
        raise BadRequest(f"There is already an endpoint with ID {ep['id']}.")
    if not ep["label"]:
        raise BadRequest(
            "Give it a label: it names the endpoint's device in Home Assistant."
        )
    dashboard = str(ep["dashboard"] or "").strip()
    if not dashboard:
        raise BadRequest("Choose the dashboard the visitor lands on.")
    ep["dashboard"] = "/" + _norm(dashboard)
    ep["type"] = ep["type"] if ep["type"] in TYPES else "guest"
    ep["account"] = ep["account"] or None
    if ep["account"] and ep["account"] not in data["logins"]:
        raise BadRequest(f"There is no login called {ep['account']}.")
    ep["legacy"] = bool(ep["legacy"])
    ep["slug"] = str(ep["slug"] or "").strip() or None
    if ep["slug"] and not SLUG.match(ep["slug"]):
        raise BadRequest(
            "The secret address must be at least 12 letters, digits, - or _."
        )
    if not (ep["slug"] or ep["legacy"]):
        raise BadRequest(
            "Give it a secret address, or mark it as answering a printed QR code."
        )
    for other in data["endpoints"]:
        if other["id"] == old_id:
            continue
        if ep["slug"] and other.get("slug") == ep["slug"]:
            raise BadRequest(
                f"Endpoint {other['id']} already uses that secret address."
            )
        if (
            ep["legacy"]
            and other.get("legacy")
            and _norm(other["dashboard"]) == _norm(ep["dashboard"])
        ):
            raise BadRequest(
                f"Endpoint {other['id']} already answers printed QR codes for that dashboard."
            )
    ep["title"] = str(ep["title"] or "").strip() or None
    ep["message"] = str(ep["message"] or "").strip() or None
    if ep["delay"] in ("", None):
        ep["delay"] = None
    else:
        try:
            ep["delay"] = max(0, min(int(ep["delay"]), MAX_DELAY))
        except (TypeError, ValueError):
            raise BadRequest(
                "Welcome delay: a whole number of seconds, 0 to 30."
            ) from None
    return ep


class GuestAPI:
    def __init__(
        self,
        guest: GuestLogin,
        store_path: Path,
        data: dict[str, Any],
        ha: HA,
        media_dir: Path,
        lan_host: Callable[[], str | None] = lambda: None,
        mdns_name: Callable[[], str | None] = lambda: None,
    ) -> None:
        self.guest = guest
        self.store_path = store_path
        self.data = data
        self.ha = ha
        self.media_dir = media_dir
        self.lan_host = remember(lan_host)
        self.mdns_name = remember(mdns_name)
        self._lock = threading.Lock()

    # -- plumbing

    def _commit(self) -> None:
        """Save the store and apply it to the running module (caller holds the lock)."""
        tmp = self.store_path.with_name(self.store_path.name + ".tmp")
        self.store_path.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps(self.data, indent=2))
        tmp.replace(self.store_path)
        self.guest.apply(*runtime(self.data))

    def qr_host(self) -> str:
        return self.data.get("qr_host") or self.lan_host() or "homeassistant.local"

    def qr_text(self, ep: dict[str, Any]) -> str:
        """The address a QR code carries. A printed-QR endpoint keeps the exact old form."""
        base = f"http://{self.qr_host()}:{PORT}"
        if ep.get("legacy"):
            return f"{base}/?d=/{_norm(ep['dashboard'])}"
        return f"{base}/e/{ep['slug']}"

    def handle(
        self, method: str, path: str, query: dict[str, list[str]], body: bytes
    ) -> Response:
        try:
            payload = json.loads(body) if body else {}
            if not isinstance(payload, dict):
                raise BadRequest("Expected a JSON object.")
            return self._route(method, path.strip("/").split("/"), query, payload)
        except BadRequest as exc:
            return _json(400, {"error": str(exc)})
        except HAError as exc:
            return _json(502, {"error": str(exc)})
        except ValueError:
            return _json(400, {"error": "Expected JSON."})

    def _route(
        self,
        method: str,
        parts: list[str],
        query: dict[str, list[str]],
        body: dict[str, Any],
    ) -> Response:
        head, rest = parts[0], parts[1:]
        if method == "GET" and head in ("", "config"):
            return _json(200, self.view())
        if method == "GET" and head == "ha":
            return self.ha_choices()
        if method == "GET" and head == "preview":
            return self.preview(query)
        if method == "GET" and head == "header.jpg":
            image = header_jpeg()
            return (
                (200, "image/jpeg", image)
                if image
                else _json(404, {"error": "no image"})
            )
        if method == "GET" and head == "slug":
            return _json(200, {"slug": secrets.token_urlsafe(18)})
        if method == "PUT" and head == "settings":
            return self.settings(body)
        if head == "logins":
            return self.logins(method, rest, body)
        if head == "endpoints":
            return self.endpoints(method, rest, query, body)
        if head == "qr" and rest:
            return self.qr(method, rest)
        return _json(404, {"error": "not found"})

    # -- reading

    def view(self) -> dict[str, Any]:
        live = self.guest.health()["endpoints"]
        used: dict[str, int] = {}
        for e in self.data["endpoints"]:
            name = e.get("account") or self.data["default_login"]
            used[name] = used.get(name, 0) + 1
        return {
            "logins": [
                {
                    "name": n,
                    "username": lg["username"],
                    "user_id": lg.get("user_id"),
                    "display": lg.get("display"),
                    "endpoints": used.get(n, 0),
                }
                for n, lg in sorted(self.data["logins"].items())
            ],
            "default_login": self.data["default_login"],
            "welcome": self.data["welcome"],
            "qr_host": self.data.get("qr_host", ""),
            "qr_host_effective": self.qr_host(),
            # Every name this box answers to; Try it picks one the admin isn't using.
            "hosts": list(
                dict.fromkeys(
                    h for h in (self.qr_host(), self.lan_host(), self.mdns_name()) if h
                )
            ),
            "port": PORT,
            "endpoints": [
                {
                    **e,
                    **{
                        k: live.get(e["id"], {}).get(k)
                        for k in ("enabled", "until", "logins", "last_login")
                    },
                    "url": self.qr_text(e),
                }
                for e in self.data["endpoints"]
            ],
        }

    def ha_choices(self) -> Response:
        """HA's users and every dashboard view, for the pickers. Partial on error."""
        out: dict[str, Any] = {"users": [], "dashboards": [], "error": None}
        try:
            out["users"] = self.ha.users()
            out["dashboards"] = self.ha.dashboards()
        except HAError as exc:
            out["error"] = str(exc)
        return _json(200, out)

    def preview(self, query: dict[str, list[str]]) -> Response:
        """The welcome page as a visitor would see it, from the given (unsaved) values or
        the saved defaults. It signs nobody in."""
        w = self.data["welcome"]

        def arg(name: str, default: Any) -> Any:
            return (query.get(name) or [""])[0] or default

        try:
            delay = int(arg("delay", w.get("delay", WELCOME_DELAY)))
        except ValueError:
            delay = WELCOME_DELAY
        page = render_welcome(
            arg("title", w.get("title") or welcome_title()),
            arg("message", w.get("message") or WELCOME_MESSAGE),
            delay,
            "header.jpg",  # relative: api/guest/header.jpg, through ingress
            preview=True,
        )
        return 200, "text/html; charset=utf-8", page.encode()

    # -- writing

    def settings(self, body: dict[str, Any]) -> Response:
        with self._lock:
            default = body.get("default_login", self.data["default_login"]) or ""
            if default and default not in self.data["logins"]:
                raise BadRequest(f"There is no login called {default}.")
            welcome = dict(self.data["welcome"])
            for key in ("title", "message"):
                if key in body.get("welcome", {}):
                    welcome[key] = str(body["welcome"][key] or "").strip()
            if "delay" in body.get("welcome", {}):
                try:
                    welcome["delay"] = max(
                        0, min(int(body["welcome"]["delay"]), MAX_DELAY)
                    )
                except (TypeError, ValueError):
                    raise BadRequest(
                        "Welcome delay: a whole number of seconds, 0 to 30."
                    ) from None
            host = str(body.get("qr_host", self.data.get("qr_host", "")) or "").strip()
            if host and not re.match(r"^[A-Za-z0-9.-]+$", host):
                raise BadRequest(
                    "QR host: a host name or IP address, without http:// or a port."
                )
            self.data.update(default_login=default, welcome=welcome, qr_host=host)
            self._commit()
        return _json(200, self.view())

    def logins(self, method: str, rest: list[str], body: dict[str, Any]) -> Response:
        with self._lock:
            logins = self.data["logins"]
            if method == "POST" and not rest:
                name = str(body.get("name") or "").strip()
                if not NAME.match(name):
                    raise BadRequest(
                        "Name: lower-case letters, digits and dashes, for example house-guest."
                    )
                if name in logins:
                    raise BadRequest(f"There is already a login called {name}.")
                password = str(body.get("password") or "")
                if len(password) < 8:
                    raise BadRequest("The password needs at least 8 characters.")
                create = body.get("create")
                if create:
                    username = str(create.get("username") or "").strip().lower()
                    display = str(create.get("name") or "").strip() or name
                    if not re.match(r"^[a-z0-9._-]+$", username):
                        raise BadRequest(
                            "Username: lower-case letters, digits, dots, dashes."
                        )
                    user_id = self.ha.create_user(display, username, password)
                else:
                    username = str(body.get("username") or "").strip()
                    user_id = body.get("user_id")
                    display = body.get("display")
                    if not username:
                        raise BadRequest(
                            "Choose the Home Assistant user to sign visitors in as."
                        )
                logins[name] = {
                    "username": username,
                    "password": password,
                    "user_id": user_id,
                    "display": display,
                }
                if not self.data["default_login"]:
                    self.data["default_login"] = name
                self._commit()
                return _json(201, self.view())
            if not rest or rest[0] not in logins:
                return _json(404, {"error": "No such login."})
            name = rest[0]
            if method == "POST" and rest[1:] == ["test"]:
                why = self.guest.test_login(name)
                return _json(
                    200,
                    {
                        "ok": why is None,
                        "message": why or "Home Assistant accepted this login.",
                    },
                )
            if method == "PUT":
                password = body.get("password")
                if password:
                    if len(password) < 8:
                        raise BadRequest("The password needs at least 8 characters.")
                    if body.get("set_in_ha"):
                        if not logins[name].get("user_id"):
                            raise BadRequest(
                                "This login is not linked to a Home Assistant user id."
                            )
                        self.ha.set_password(logins[name]["user_id"], password)
                    logins[name]["password"] = password
                self._commit()
                return _json(200, self.view())
            if method == "DELETE":
                users = [
                    e["id"]
                    for e in self.data["endpoints"]
                    if (e.get("account") or self.data["default_login"]) == name
                ]
                if users:
                    raise BadRequest(
                        f"Endpoints still use this login: {', '.join(users)}. Move them first."
                    )
                del logins[name]
                if self.data["default_login"] == name:
                    self.data["default_login"] = next(iter(logins), "")
                self._commit()
                return _json(200, self.view())
        return _json(404, {"error": "not found"})

    def endpoints(
        self,
        method: str,
        rest: list[str],
        query: dict[str, list[str]],
        body: dict[str, Any],
    ) -> Response:
        with self._lock:
            eps = self.data["endpoints"]
            if method == "POST" and not rest:
                eps.append(_clean_endpoint(body, self.data, None))
                self._commit()
                return _json(201, self.view())
            index = next(
                (i for i, e in enumerate(eps) if rest and e["id"] == rest[0]), None
            )
            if index is None:
                return _json(404, {"error": "No such endpoint."})
            old_id = eps[index]["id"]
            if method == "POST" and rest[1:] in (["on"], ["off"]):
                minutes = None
                if query.get("minutes"):
                    try:
                        minutes = float(query["minutes"][0])
                    except ValueError:
                        raise BadRequest("minutes must be a number") from None
                self.guest.set_enabled(old_id, rest[1] == "on", minutes)
                return _json(200, self.view())
            if method == "PUT":
                ep = _clean_endpoint(body, self.data, old_id)
                if ep["id"] != old_id:
                    self.guest.rename_endpoint(old_id, ep["id"])
                eps[index] = ep
                self._commit()
                return _json(200, self.view())
            if method == "DELETE":
                del eps[index]
                self._commit()
                return _json(200, self.view())
        return _json(404, {"error": "not found"})

    def qr(self, method: str, rest: list[str]) -> Response:
        name = rest[0]
        ep_id, _, kind = name.rpartition(".")
        if method == "POST" and rest[1:] == ["media"]:
            ep_id, kind = name, "png"
        ep = next((e for e in self.data["endpoints"] if e["id"] == ep_id), None)
        if ep is None or kind not in ("png", "svg"):
            return _json(404, {"error": "No such endpoint."})
        text = self.qr_text(ep)
        if method == "GET":
            shown = swap.out(text)  # a screenshot's code must not scan to the real one
            return (
                (200, "image/svg+xml", qr.svg(shown))
                if kind == "svg"
                else (200, "image/png", qr.png(shown))
            )
        if method == "POST" and rest[1:] == ["media"]:
            folder = self.media_dir / "casa-mia" / "guest-qr"
            try:
                folder.mkdir(parents=True, exist_ok=True)
                (folder / f"{ep_id}.png").write_bytes(qr.png(text))
            except OSError as exc:
                return _json(
                    500, {"error": f"Could not write to the media folder: {exc}"}
                )
            rel = f"casa-mia/guest-qr/{ep_id}.png"
            return _json(
                200,
                {
                    "file": f"/media/{rel}",
                    "media_source": f"media-source://media_source/local/{rel}",
                },
            )
        return _json(404, {"error": "not found"})


def remember(lookup: Callable[[], str | None]) -> Callable[[], str | None]:
    """Cache a lookup's first answer: the box's address and name don't change while the app
    runs, and the page asks every few seconds."""
    found: list[str] = []

    def cached() -> str | None:
        if not found and (value := lookup()):
            found.append(value)
        return found[0] if found else None

    return cached


def _json(status: int, data: Any) -> Response:
    return status, "application/json", json.dumps(data).encode()
