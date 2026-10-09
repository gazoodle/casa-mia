"""Finding the kiosks (HA's devices, added addresses, each kiosk's fleet) and logging in to them."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from ...ha import HAError
from .common import (
    MANUFACTURER,
    PORT,
    TOKEN_DAYS,
    _address,
    _model,
    _now,
)
from .store import Store

_LOGGER = logging.getLogger(__name__)


class Finder(Store):
    def _probe(self, address: str, source: str) -> str | None:
        """Ask an address who it is; record the kiosk. Its id, or None if no kiosk."""
        try:
            ident = self._get_json(address, "/api/fleet/identity")
            health = self._get_json(address, "/api/health")
        except (OSError, ValueError) as exc:
            _LOGGER.debug("kiosks: nothing at %s (%s)", address, exc)
            return None
        kid = str(ident.get("id") or "")
        if not kid:
            return None
        link = health.get("link") or {}
        with self._lock:
            old = self.kiosks.get(kid, {})
            if not old.get("online"):
                _LOGGER.info(
                    "kiosk %s (%s) %s at %s, version %s",
                    ident.get("name"),
                    kid,
                    "found" if not old else "back online",
                    address,
                    ident.get("version"),
                )
            elif old.get("version") != ident.get("version"):
                _LOGGER.info(
                    "kiosk %s updated %s -> %s",
                    ident.get("name"),
                    old.get("version"),
                    ident.get("version"),
                )
            self.kiosks[kid] = {
                **old,
                "id": kid,
                "name": ident.get("name") or health.get("name") or kid,
                "address": address,
                "ip": health.get("ip"),
                "version": ident.get("version") or health.get("appVersion"),
                "leader": bool(ident.get("leader")),
                "follows": ident.get("follows") or None,
                "model": _model(health),
                "battery": health.get("battery"),
                "charging": health.get("charging"),
                "rssi": link.get("rssi"),
                "online": True,
                "last_seen": _now(),
                "source": old.get("source") or source,
                "error": None,
            }
        return kid

    # -- finding them

    def _from_ha(self) -> list[str]:
        """Addresses of the kiosks HA knows through ESPHome."""
        if self.ha is None:
            return []
        try:
            (devices,) = self.ha.call({"type": "config/device_registry/list"})
            self.ha_error = None
        except HAError as exc:
            self.ha_error = str(exc)
            _LOGGER.warning("kiosks: cannot read Home Assistant's devices: %s", exc)
            return []
        out = []
        for d in devices or []:
            if d.get("manufacturer") != MANUFACTURER:
                continue
            url = urllib.parse.urlsplit(d.get("configuration_url") or "")
            if url.hostname:
                out.append(_address(url.hostname, url.port or PORT))
        return out

    def _from_fleet(self) -> list[str]:
        """Addresses from each logged-in kiosk's list of the kiosks it has heard."""
        out = []
        for kid, token in list(self.tokens.items()):
            k = self.kiosks.get(kid)
            if not (k and k.get("online")):
                continue
            try:
                status, data = self._request(
                    k["address"], "/api/commands/fleet", "POST", b"{}", token
                )
                devices = (json.loads(data).get("data") or {}).get("devices") or []
            except (OSError, ValueError) as exc:
                _LOGGER.debug("kiosks: fleet list from %s failed: %s", k["name"], exc)
                continue
            if status != 200:
                continue
            for d in devices:
                if d.get("address") and not d.get("self"):
                    out.append(_address(d["address"], int(d.get("port") or PORT)))
        return out

    def scan(self, discover: bool = True) -> None:
        """Probe every address we know (and, with `discover`, look for more)."""
        with self._lock:
            known = {
                k["address"]: "seen" for k in self.kiosks.values() if "address" in k
            }
        tried: set[str] = set()
        rounds: list[tuple[str, list[str]]] = [("added", list(self.addresses))]
        if discover:
            rounds.append(("Home Assistant", self._from_ha()))
            rounds.append(
                ("firmware server", [_address(ip, PORT) for ip in self.seeds()])
            )
        rounds.append(("seen", list(known)))
        found: set[str] = set()
        for source, addresses in rounds:
            for address in addresses:
                if address not in tried:
                    tried.add(address)
                    kid = self._probe(address, source)
                    if kid:
                        found.add(kid)
        if discover:
            for address in self._from_fleet():
                if address not in tried:
                    tried.add(address)
                    kid = self._probe(address, "another kiosk")
                    if kid:
                        found.add(kid)
        with self._lock:
            for kid, k in self.kiosks.items():
                if kid not in found and k.get("online"):
                    k["online"] = False
                    _LOGGER.warning(
                        "kiosk %s (%s) not answering", k.get("name"), k.get("address")
                    )
            if discover:
                self.last_scan = _now()
            self._save()

    # -- actions

    def login(self, password: str) -> dict[str, str]:
        """Log in to every kiosk that answers; each one's result."""
        results = {}
        for kid, k in list(self.kiosks.items()):
            if not k.get("online"):
                results[kid] = "offline"
                continue
            try:
                status, data = self._request(
                    k["address"],
                    "/api/login",
                    "POST",
                    json.dumps({"password": password, "ttl_days": TOKEN_DAYS}).encode(),
                )
                token = json.loads(data).get("token") if status == 200 else None
            except (OSError, ValueError) as exc:
                status, token = 0, None
                _LOGGER.warning("kiosk %s: login failed: %s", k["name"], exc)
            if token:
                self.tokens[kid] = token
                results[kid] = "ok"
                _LOGGER.info("kiosk %s: logged in", k["name"])
            else:
                results[kid] = (
                    "refused" if status in (401, 403) else f"failed ({status})"
                )
                _LOGGER.warning("kiosk %s: login %s", k["name"], results[kid])
        with self._lock:
            self._save()
        return results
