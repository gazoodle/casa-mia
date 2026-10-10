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
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ...ha import HA, HAError
from .audit import KEEP_DAYS, KEEP_MAX, Audit, states_lookup
from .codes import Codes, Response, _json
from .common import (
    GOODBYE_GRACE,
    MAX_DELAY,
    PHOTO,
    PHOTO_MAX,
    PHOTO_MIN,
    PORT,
    WELCOME_DELAY,
    WELCOME_MESSAGE,
    BadRequest,
    Endpoint,
    _norm,
    welcome_title,
)
from .login import GuestLogin
from .page import header_jpeg, render_welcome
from .printing import SECURITY
from .reach import fix, gather, report

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
    "info",
    "end_sessions",
    "rotate",
    "pin",
)
HOUSE_INFO = ("text",)  # the house rules
GOODBYE = ("title", "message", "url")  # the goodbye page, or an address instead
WIFI = {"ssid": "", "password": "", "security": "WPA", "hidden": False}


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
        "house_info": dict.fromkeys(HOUSE_INFO, ""),
        "goodbye": dict.fromkeys(GOODBYE, ""),
        "wifi": dict(WIFI),
        "audit": {"days": KEEP_DAYS, "max": KEEP_MAX},
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
) -> tuple[
    list[Endpoint],
    dict[str, tuple[str, str]],
    str,
    tuple[str, str, int],
    dict[str, str],
    dict[str, str],
    int,
]:
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
    return (
        endpoints,
        logins,
        data["default_login"],
        welcome,
        data["house_info"],
        data["goodbye"],
        int(w.get("photo", PHOTO)),
    )


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
    for flag in ("legacy", "info", "end_sessions", "rotate"):
        ep[flag] = bool(ep[flag])
    ep["slug"] = str(ep["slug"] or "").strip() or None
    if ep["slug"] and not SLUG.match(ep["slug"]):
        raise BadRequest(
            "The secret address must be at least 12 letters, digits, - or _."
        )
    if not (ep["slug"] or ep["legacy"]):
        raise BadRequest(
            "Give it a secret address, or mark it as answering a printed QR code."
        )
    ep["pin"] = str(ep["pin"] or "").strip() or None
    if ep["pin"] and not 4 <= len(ep["pin"]) <= 32:
        raise BadRequest("The passcode: 4 to 32 characters.")
    if ep["rotate"] and not ep["slug"]:
        raise BadRequest("A new address on closing needs a secret address.")
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


class GuestAPI(Codes):
    def __init__(
        self,
        guest: GuestLogin,
        store_path: Path,
        data: dict[str, Any],
        ha: HA,
        media_dir: Path,
        lan_host: Callable[[], str | None] = lambda: None,
        mdns_name: Callable[[], str | None] = lambda: None,
        grace: float = GOODBYE_GRACE,
    ) -> None:
        super().__init__(guest, data, media_dir, remember(lan_host))
        self.grace = grace  # seconds between an endpoint closing and its sign-out
        self.store_path = store_path
        self.ha = ha
        self.mdns_name = remember(mdns_name)
        # Re-entrant: an endpoint closed from this page calls back into _closed.
        self._lock = threading.RLock()
        guest.on_closed = self._closed
        # Every scan, sign-in, refusal and sign-out, in its own store beside this one.
        keep = data["audit"]
        self.audit = Audit(
            store_path.with_name("guest-login-audit.jsonl"),
            int(keep.get("days", KEEP_DAYS)),
            int(keep.get("max", KEEP_MAX)),
            lookup=states_lookup(lambda: ha.call({"type": "get_states"})[0]),
        )
        guest.on_audit = self.audit.record
        guest.user_of = lambda name: self.data["logins"].get(name, {}).get("user_id")

    # -- plumbing

    def _commit(self) -> None:
        """Save the store and apply it to the running module (caller holds the lock)."""
        tmp = self.store_path.with_name(self.store_path.name + ".tmp")
        self.store_path.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(json.dumps(self.data, indent=2))
        tmp.replace(self.store_path)
        self.guest.apply(*runtime(self.data))

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
        if method == "GET" and head == "reach":
            with self._lock:
                store = json.loads(json.dumps(self.data))
            return _json(200, {"logins": report(store, gather(self.ha))})
        if method == "POST" and head == "reach" and rest == ["fix"]:
            with self._lock:
                store = json.loads(json.dumps(self.data))
            done = fix(self.ha, store, body)
            _LOGGER.info("guest login: reach check fix: %s", done)
            return _json(200, {"done": done, "logins": report(store, gather(self.ha))})
        if method == "GET" and head == "audit":
            self.audit.flush()
            if rest == ["audit.csv"]:
                return 200, "text/csv; charset=utf-8", self.audit.csv()

            def arg(name: str) -> str:
                return (query.get(name) or [""])[0]

            return _json(
                200,
                self.audit.records(
                    arg("kind"),
                    arg("endpoint"),
                    int(arg("limit") or 200),
                    int(arg("offset") or 0),
                ),
            )
        if method == "GET" and head in ("wifi.svg", "wifi.png"):
            return self.wifi_qr(head)
        if method == "GET" and head == "card" and rest:
            return self.card(rest[0])
        if head == "page-qr" and rest:
            return self.page_qr(method, rest[0], query)
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
                    "mfa": self.guest.mfa.get(n),  # None: not known yet
                    "endpoints": used.get(n, 0),
                }
                for n, lg in sorted(self.data["logins"].items())
            ],
            "default_login": self.data["default_login"],
            "welcome": self.data["welcome"],
            "qr_host": self.data.get("qr_host", ""),
            "house_info": self.data["house_info"],
            "goodbye": self.data["goodbye"],
            "wifi": self.data["wifi"],
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
            photo = int(arg("photo", w.get("photo", PHOTO)))
        except ValueError:
            delay, photo = WELCOME_DELAY, PHOTO
        page = render_welcome(
            arg("title", w.get("title") or welcome_title()),
            arg("message", w.get("message") or WELCOME_MESSAGE),
            delay,
            "header.jpg",  # relative: api/guest/header.jpg, through ingress
            preview=True,
            info=self.data["house_info"] if (query.get("info") or [""])[0] else None,
            photo=photo,
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
            if "photo" in body.get("welcome", {}):
                try:
                    welcome["photo"] = max(
                        PHOTO_MIN, min(int(body["welcome"]["photo"]), PHOTO_MAX)
                    )
                except (TypeError, ValueError):
                    raise BadRequest(
                        "Photo height: a whole number, 20 to 80."
                    ) from None
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
            goodbye = dict(self.data["goodbye"])
            for key in GOODBYE:
                if key in body.get("goodbye", {}):
                    goodbye[key] = str(body["goodbye"][key] or "").strip()
            if goodbye["url"] and not re.match(r"^https?://\S+$", goodbye["url"]):
                raise BadRequest(
                    "Goodbye address: a full web address, starting http:// or https://."
                )
            wifi = dict(self.data["wifi"])
            if "wifi" in body:
                got = body["wifi"] or {}
                wifi.update(
                    ssid=str(got.get("ssid") or "").strip(),
                    password=str(got.get("password") or ""),
                    security=got.get("security")
                    if got.get("security") in SECURITY
                    else "WPA",
                    hidden=bool(got.get("hidden")),
                )
            keep = dict(self.data["audit"])
            for key, low, high in (("days", 1, 3650), ("max", 100, 100000)):
                if key in body.get("audit", {}):
                    try:
                        keep[key] = max(low, min(int(body["audit"][key]), high))
                    except (TypeError, ValueError):
                        raise BadRequest(
                            "The log: whole numbers of days and records."
                        ) from None
            self.audit.retention(keep["days"], keep["max"])
            info = dict(self.data["house_info"])
            for key in HOUSE_INFO:
                if key in body.get("house_info", {}):
                    info[key] = str(body["house_info"][key] or "").strip()
            self.data.update(
                default_login=default,
                welcome=welcome,
                qr_host=host,
                house_info=info,
                goodbye=goodbye,
                wifi=wifi,
                audit=keep,
            )
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
            if method == "GET" and rest[1:] == ["sessions"]:
                found = self.guest.sessions(name)
                _LOGGER.info(
                    "guest login: login %s has %s",
                    name,
                    found.get("error")
                    or f"{len(found['sessions'])} session(s) signed in",
                )
                return _json(200, found)
            if method == "GET" and rest[1:] == ["mfa"]:
                return _json(200, {"mfa": self.guest.has_mfa(name)})
            if method == "POST" and rest[1:] == ["test"]:
                why = self.guest.test_login(name)
                return _json(
                    200,
                    {
                        "ok": why is None,
                        "message": why or "Home Assistant accepted this login.",
                    },
                )
            if method == "POST" and rest[1:] == ["sign-out"]:
                self.sign_out(name, "signed out from the Guest login page")
                return _json(200, {"message": f"Everyone signed in as {name} is out."})
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

    def _no_clash(self, ep: dict[str, Any]) -> dict[str, Any]:
        """Refuse a passcode on a login with two-factor sign-in: it asks for its own."""
        name = ep["account"] or self.data["default_login"]
        if ep["pin"] and name and self.guest.mfa.get(name):
            raise BadRequest(
                f"Login {name} has two-factor sign-in, which already asks the visitor "
                "for a code: leave the passcode empty."
            )
        return ep

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
                eps.append(self._no_clash(_clean_endpoint(body, self.data, None)))
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
                ep = self._no_clash(_clean_endpoint(body, self.data, old_id))
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

    # -- closing

    def _closed(self, ep: Endpoint) -> None:
        """An endpoint has closed: give it a new address and end its visitors' sessions,
        as it is set to. Runs on its own thread; never raises."""
        try:
            if ep.rotate:
                with self._lock:
                    stored = next(
                        (e for e in self.data["endpoints"] if e["id"] == ep.id), None
                    )
                    if stored and stored.get("slug"):
                        stored["slug"] = secrets.token_urlsafe(18)
                        self._commit()
                        _LOGGER.info(
                            "guest login: endpoint %s closed, so it has a new secret "
                            "address; its old QR code no longer works",
                            ep.id,
                        )
            if self.guest.signs_out(ep):
                name = ep.account or self.data["default_login"]
                if self.grace:
                    _LOGGER.info(
                        "guest login: endpoint %s closed; its visitors are signed out in "
                        "%.0f s, once their pages have gone to the goodbye page",
                        ep.id,
                        self.grace,
                    )
                    time.sleep(self.grace)
                now = self.guest.endpoints.get(ep.id)
                if now is not None and self.guest._is_on(now):
                    _LOGGER.info(
                        "guest login: endpoint %s opened again; its visitors stay in",
                        ep.id,
                    )
                elif others := self.guest.others_open(ep):
                    _LOGGER.info(
                        "guest login: endpoint %s closed; sessions of login %s kept, as "
                        "%s still open with it",
                        ep.id,
                        name,
                        ", ".join(others),
                    )
                else:
                    self.sign_out(name, f"endpoint {ep.id} closed", ep)
        except (BadRequest, HAError, OSError) as exc:
            _LOGGER.error("guest login: closing endpoint %s: %s", ep.id, exc)

    def sign_out(self, name: str, why: str, ep: Endpoint | None = None) -> None:
        """End every session of a login's HA user (BadRequest or HAError if it can't)."""
        login = self.data["logins"].get(name)
        if login is None:
            raise BadRequest(f"There is no login called {name}.")
        user = next(
            (
                u
                for u in self.ha.users()
                if u["id"] == login.get("user_id")
                or (u.get("username") and u["username"] == login["username"])
            ),
            None,
        )
        if user is None:
            raise BadRequest(f"Home Assistant has no user {login['username']}.")
        if user["is_admin"]:  # it would sign the house's own people out too
            raise BadRequest(
                f"{login['username']} is an administrator: its sessions are left alone."
            )
        self.ha.sign_out(user["id"])
        # With the endpoint whose closing did it, so filtering the log by endpoint shows it.
        self.audit.record(
            {
                "event": "sign-out",
                "ok": True,
                "login": name,
                "reason": why,
                **({"endpoint": ep.id, "label": ep.label} if ep else {}),
            }
        )
        _LOGGER.info(
            "guest login: every session of login %s (user %s) ended: %s",
            name,
            login["username"],
            why,
        )


def remember(lookup: Callable[[], str | None]) -> Callable[[], str | None]:
    """Cache a lookup's first answer: the box's address and name don't change while the app
    runs, and the page asks every few seconds."""
    found: list[str] = []

    def cached() -> str | None:
        if not found and (value := lookup()):
            found.append(value)
        return found[0] if found else None

    return cached
