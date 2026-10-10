"""A small client for Home Assistant's websocket API, through the Supervisor's proxy.

Each call opens one connection, runs its commands and closes: the admin page asks rarely,
so a held connection would buy nothing. The commands run as the Supervisor's own HA user,
which is an administrator.
"""

from __future__ import annotations

import asyncio
from typing import Any

import aiohttp

TIMEOUT = 10
ADMIN_GROUP = "system-admin"


class HAError(Exception):
    pass


class HA:
    def __init__(self, ws_url: str, token: str) -> None:
        self.ws_url = ws_url
        self.token = token

    def call(self, *commands: dict[str, Any]) -> list[Any]:
        """Run the commands in order; their results, or HAError for the first that fails."""
        try:
            return asyncio.run(asyncio.wait_for(self._call(commands), TIMEOUT))
        except (aiohttp.ClientError, TimeoutError, OSError, ValueError) as exc:
            raise HAError(f"cannot talk to Home Assistant: {exc}") from exc

    async def _call(self, commands: tuple[dict[str, Any], ...]) -> list[Any]:
        async with (
            aiohttp.ClientSession() as session,
            session.ws_connect(self.ws_url, max_msg_size=0) as ws,
        ):
            await ws.receive_json()  # auth_required
            await ws.send_json({"type": "auth", "access_token": self.token})
            if (await ws.receive_json()).get("type") != "auth_ok":
                raise HAError("Home Assistant refused the app's token")
            results = []
            for n, command in enumerate(commands, 1):
                await ws.send_json({"id": n, **command})
                while True:
                    msg = await ws.receive_json()
                    if msg.get("id") == n and msg.get("type") == "result":
                        break
                if not msg.get("success"):
                    error = msg.get("error") or {}
                    raise HAError(f"{command['type']}: {error.get('message', error)}")
                results.append(msg.get("result"))
            return results

    def users(self) -> list[dict[str, Any]]:
        """People who can log in: not system users, with their username if they have one."""
        (users,) = self.call({"type": "config/auth/list"})
        out = []
        for u in users:
            if u.get("system_generated"):
                continue
            # HA's config/auth/list gives the password login's username at the top level
            # (its credentials list only names each one's type).
            username = u.get("username")
            out.append(
                {
                    "id": u["id"],
                    "name": u.get("name") or username or u["id"],
                    "username": username,
                    "is_admin": ADMIN_GROUP in (u.get("group_ids") or []),
                    "is_active": u.get("is_active", True),
                    "local_only": u.get("local_only", False),
                }
            )
        return sorted(out, key=lambda u: u["name"].lower())

    def persons(self) -> list[dict[str, Any]]:
        """HA's people (Settings > People): id, name and linked user, sorted by name."""
        (result,) = self.call({"type": "person/list"})
        people = (result or {}).get("storage", []) + (result or {}).get("config", [])
        return sorted(
            (
                {
                    "id": p["id"],
                    "name": p.get("name") or p["id"],
                    "user_id": p.get("user_id"),
                }
                for p in people
            ),
            key=lambda p: p["name"].lower(),
        )

    def dashboards(self) -> list[dict[str, str]]:
        """Every dashboard view as a landing-page choice: path, dashboard and view titles.
        Admin-only dashboards are left out: guests and engineers are never admins."""
        (dashboards,) = self.call({"type": "lovelace/dashboards/list"})
        boards = [{"url_path": None, "title": "Overview"}] + [
            {"url_path": d["url_path"], "title": d.get("title") or d["url_path"]}
            for d in dashboards
            if not d.get("require_admin")
        ]
        out = []
        for board in boards:
            root = board["url_path"] or "lovelace"
            try:
                (config,) = self.call(
                    {"type": "lovelace/config", "url_path": board["url_path"]}
                )
                views = config.get("views") or [] if isinstance(config, dict) else []
            except HAError:
                views = []  # auto-generated or broken: offer the dashboard itself
            if not views:
                out.append(
                    {"path": f"/{root}", "dashboard": board["title"], "view": ""}
                )
            for n, view in enumerate(views):
                out.append(
                    {
                        "path": f"/{root}/{view.get('path') or n}",
                        "dashboard": board["title"],
                        "view": view.get("title") or str(view.get("path") or n),
                    }
                )
        return out

    def create_user(self, name: str, username: str, password: str) -> str:
        """A new non-admin, local-only HA user with a password login; returns its id."""
        (created,) = self.call(
            {
                "type": "config/auth/create",
                "name": name,
                "group_ids": ["system-users"],
                "local_only": True,
            }
        )
        user_id = created["user"]["id"]
        self.call(
            {
                "type": "config/auth_provider/homeassistant/create",
                "user_id": user_id,
                "username": username,
                "password": password,
            }
        )
        return user_id

    def sign_out(self, user_id: str) -> None:
        """End every session of a user: deactivating one removes its refresh tokens, which
        closes its connections; it is then active again at once, for the next sign-in."""
        self.call(
            {"type": "config/auth/update", "user_id": user_id, "is_active": False}
        )
        try:
            self.call(
                {"type": "config/auth/update", "user_id": user_id, "is_active": True}
            )
        except HAError:  # once more: a user left inactive locks every visitor out
            self.call(
                {"type": "config/auth/update", "user_id": user_id, "is_active": True}
            )

    def set_password(self, user_id: str, password: str) -> None:
        self.call(
            {
                "type": "config/auth_provider/homeassistant/admin_change_password",
                "user_id": user_id,
                "password": password,
            }
        )
