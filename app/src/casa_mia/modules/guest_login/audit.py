"""The guest-login audit: every scan, sign-in, refusal and sign-out, kept in its own store
so it survives restarts and updates, apart from Home Assistant's log.

One JSON object per line in `guest-login-audit.jsonl`, beside the guest-login store.
Records are appended as they happen and pruned by age and by count (both set on the admin
page), on start and every hour. Each record is enriched on a worker thread, so a visitor's
sign-in never waits for it: the device and person whose device tracker had the visitor's
address at the time, from Home Assistant's states.

Never recorded: passcodes, 2FA codes, and secret addresses (an unknown one is only said to
be unknown).
"""

from __future__ import annotations

import csv
import io
import json
import logging
import queue
import threading
import time
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

_LOGGER = logging.getLogger(__name__)

KEEP_DAYS = 90
KEEP_MAX = 2000
PRUNE_EVERY = 3600.0  # seconds
STATES_TTL = 60.0  # seconds HA's states are reused for lookups
# What a record may carry from the visitor's browser (the welcome page sends these).
CLIENT_KEYS = ("tz", "langs", "screen", "dpr", "platform", "touch", "dark")
TEXT_MAX = 300  # longest string kept from a visitor's request

Lookup = Callable[[str], dict[str, Any] | None]


def device_of(agent: str) -> str:
    """A short name for a browser's user agent, e.g. "iPhone, Safari"."""
    a = agent.lower()
    system = next(
        (
            name
            for key, name in (
                ("iphone", "iPhone"),
                ("ipad", "iPad"),
                ("android", "Android"),
                ("mac os x", "Mac"),
                ("windows", "Windows"),
                ("cros", "ChromeOS"),
                ("linux", "Linux"),
            )
            if key in a
        ),
        "",
    )
    browser = next(
        (
            name
            for key, name in (
                ("edg/", "Edge"),
                ("firefox/", "Firefox"),
                ("fxios", "Firefox"),
                ("crios", "Chrome"),
                ("samsungbrowser", "Samsung Internet"),
                ("chrome/", "Chrome"),
                ("safari/", "Safari"),
            )
            if key in a
        ),
        "",
    )
    return ", ".join(p for p in (system, browser) if p) or "unknown"


def clean_client(raw: Any) -> dict[str, Any]:
    """The browser facts the welcome page sent, kept to known keys and short values."""
    if not isinstance(raw, dict):
        return {}
    out: dict[str, Any] = {}
    for key in CLIENT_KEYS:
        value = raw.get(key)
        if isinstance(value, bool | int | float):
            out[key] = value
        elif isinstance(value, str):
            out[key] = value[:TEXT_MAX]
    return out


class Audit:
    def __init__(
        self,
        path: Path,
        keep_days: int = KEEP_DAYS,
        keep_max: int = KEEP_MAX,
        lookup: Lookup | None = None,
    ) -> None:
        self.path = path
        self.keep_days, self.keep_max = keep_days, keep_max
        self.lookup = lookup  # the device and person behind an address, if any
        self._lock = threading.Lock()
        self._records: list[dict[str, Any]] = []
        self._queue: queue.Queue[dict[str, Any] | None] = queue.Queue()
        self._worker: threading.Thread | None = None
        self._pruned = 0.0
        self._load()

    # -- the store

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            lines = self.path.read_text().splitlines()
        except OSError as exc:
            _LOGGER.error("guest login audit: cannot read %s: %s", self.path, exc)
            return
        for line in lines:
            try:
                record = json.loads(line)
            except ValueError:
                continue  # a line cut short by a crash: the rest still count
            if isinstance(record, dict) and record.get("time"):
                self._records.append(record)
        self.prune()
        _LOGGER.info(
            "guest login audit: %d record(s) kept in %s (%d days, at most %d)",
            len(self._records),
            self.path.name,
            self.keep_days,
            self.keep_max,
        )

    def prune(self) -> int:
        """Drop records older than keep_days or beyond keep_max; how many went."""
        cutoff = (
            datetime.now(timezone.utc) - timedelta(days=self.keep_days)
        ).isoformat()
        with self._lock:
            before = len(self._records)
            kept = [r for r in self._records if r["time"] >= cutoff]
            self._records = kept[-self.keep_max :] if self.keep_max > 0 else []
            gone = before - len(self._records)
            if gone:
                self._rewrite()
            self._pruned = time.monotonic()
        if gone:
            _LOGGER.info("guest login audit: pruned %d old record(s)", gone)
        return gone

    def _rewrite(self) -> None:
        """Write every record afresh (caller holds the lock). Never raises."""
        try:
            tmp = self.path.with_name(self.path.name + ".tmp")
            tmp.write_text("".join(json.dumps(r) + "\n" for r in self._records))
            tmp.replace(self.path)
        except OSError as exc:
            _LOGGER.error("guest login audit: cannot write %s: %s", self.path, exc)

    def retention(self, keep_days: int, keep_max: int) -> None:
        self.keep_days, self.keep_max = keep_days, keep_max
        self.prune()

    # -- recording

    def record(self, event: dict[str, Any]) -> None:
        """Add an event (from any thread; returns at once). It gets its time now."""
        event = {"time": datetime.now(timezone.utc).isoformat(), **event}
        if self._worker is None or not self._worker.is_alive():
            self._worker = threading.Thread(
                target=self._work, name="guest-audit", daemon=True
            )
            self._worker.start()
        self._queue.put(event)

    def _work(self) -> None:
        while (event := self._queue.get()) is not None:
            try:
                self._append(event)
            finally:
                self._queue.task_done()

    def _append(self, event: dict[str, Any]) -> None:
        if self.lookup and event.get("ip"):
            try:
                if found := self.lookup(event["ip"]):
                    event.update(found)
            except Exception as exc:  # the record matters more than its extras
                _LOGGER.debug("guest login audit: lookup failed: %s", exc)
        with self._lock:
            self._records.append(event)
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                with self.path.open("a") as f:
                    f.write(json.dumps(event) + "\n")
            except OSError as exc:
                _LOGGER.error("guest login audit: cannot write %s: %s", self.path, exc)
            due = (
                len(self._records) > self.keep_max
                or time.monotonic() - self._pruned > PRUNE_EVERY
            )
        if due:
            self.prune()

    def flush(self) -> None:
        """Wait until every recorded event is stored (tests, and before reading)."""
        self._queue.join()

    # -- reading

    def records(
        self,
        kind: str = "",
        endpoint: str = "",
        limit: int = 200,
        offset: int = 0,
    ) -> dict[str, Any]:
        """Newest first, filtered by outcome ("ok" or "refused") and endpoint id."""
        with self._lock:
            rows = list(reversed(self._records))
        if kind == "ok":
            rows = [r for r in rows if r.get("ok")]
        elif kind == "refused":
            rows = [r for r in rows if r.get("ok") is False]
        if endpoint:
            rows = [r for r in rows if r.get("endpoint") == endpoint]
        return {
            "total": len(rows),
            "records": rows[offset : offset + max(1, min(limit, 1000))],
            "keep_days": self.keep_days,
            "keep_max": self.keep_max,
        }

    def csv(self) -> bytes:
        """Every record, oldest first, as CSV for a spreadsheet."""
        with self._lock:
            rows = list(self._records)
        keys = [
            "time",
            "event",
            "ok",
            "endpoint",
            "label",
            "login",
            "reason",
            "ip",
            "device",
            "agent",
            "langs",
            "person",
            "tracker",
            "mac",
            "via",
        ]
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow([*keys, "browser"])
        for r in rows:
            writer.writerow(
                [r.get(k, "") for k in keys] + [json.dumps(r.get("client") or {})]
            )
        return out.getvalue().encode()


def states_lookup(get_states: Callable[[], list[dict[str, Any]]]) -> Lookup:
    """Who an address belongs to, from HA's states: a device tracker whose `ip` (or
    `ip_address`) is the address, and the person whose trackers include it."""
    cache: dict[str, Any] = {"at": -STATES_TTL, "states": []}

    def lookup(ip: str) -> dict[str, Any] | None:
        if time.monotonic() - cache["at"] > STATES_TTL:
            cache.update(at=time.monotonic(), states=get_states())
        states = cache["states"]
        tracker = next(
            (
                s
                for s in states
                if s["entity_id"].startswith("device_tracker.")
                and ip
                in (
                    s.get("attributes", {}).get("ip"),
                    s.get("attributes", {}).get("ip_address"),
                )
            ),
            None,
        )
        if tracker is None:
            return None
        attrs = tracker.get("attributes", {})
        found: dict[str, Any] = {
            "tracker": tracker["entity_id"],
            "tracker_name": attrs.get("friendly_name") or tracker["entity_id"],
        }
        if attrs.get("mac"):
            found["mac"] = attrs["mac"]
        person = next(
            (
                s
                for s in states
                if s["entity_id"].startswith("person.")
                and tracker["entity_id"]
                in (s.get("attributes", {}).get("device_trackers") or [])
            ),
            None,
        )
        if person is not None:
            found["person"] = (
                person.get("attributes", {}).get("friendly_name") or person["entity_id"]
            )
        return found

    return lookup
