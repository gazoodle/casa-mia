"""fona: phone and SMS. Calls and texts reach the house through an Arduino (sketch
FonaForHA) driving an Adafruit FONA GSM module, on USB serial. Mission-critical: a way
to reach the house that needs no internet (for example, to open gates).

The layers, each answering a text of exactly "PING" so a broken one can be found from
afar (see the backlog for the sketch):

1. Arduino: replies "PONG from Arduino" to anyone, then prints `TEXT:<number>:<text>`
   (or `RING:<number>` after hanging up a call).
2. This module: replies "PONG from App" to anyone (with the name when the number is
   known), then checks the number against `people` and fires one HA event,
   `casa_mia_fona`, marked authorised or intrusion. Nothing more is said to an
   unauthorised number.
3. The integration: replies "PONG from Integration" to an authorised PING.
4. HA automations: decide what an authorised call or text does, and reply.

Serial: the port is found by its stable /dev/serial/by-id name (never ttyACM0, which
moves). Opening it resets the Arduino, which prints `INFO: FONA <v> start`; we answer
START and it prints `INFO: FONA <v> ready` once the FONA answers. Only SEND and
ERASEALL reply OK/FAILED. A quiet line is probed with ALIVE?; no answer means the port
is reopened, as is any read error. Reconnects back off up to a minute.
"""

from __future__ import annotations

import glob
import json
import logging
import threading
import time
from collections import deque
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any, Protocol

from .people import normalise

_LOGGER = logging.getLogger(__name__)

PORT_GLOB = "/dev/serial/by-id/*Arduino*"
BAUD = 115200
EVENT = "casa_mia_fona"
PING, PONG = "PING", "PONG from App"
MAX_TEXT = 160
QUIET_SECONDS = 300  # probe a line this quiet with ALIVE?
ANSWER_SECONDS = 30  # ...and reopen it if ALIVE? gets no answer in this time
NO_START_SECONDS = 5  # opened but no `start` line (no reset on open): ask ALIVE?
START_RETRY_SECONDS = 60  # after "ERROR: FONA not found"
RSSI_SECONDS = 3600
COMMAND_SECONDS = 60  # longest wait for OK/FAILED after SEND or ERASEALL
BACKOFF = (1, 2, 5, 10, 30, 60)
# Signal quality from the modem's RSSI (AT+CSQ, 0-31; 99 unknown), as the usual GSM bands:
# 20+ is -73 dBm or better, 15 is -83, 10 is -93, 2 is -109.
QUALITY = ((20, "excellent"), (15, "good"), (10, "ok"), (2, "bad"), (0, "terrible"))


def quality(rssi: int | None) -> str | None:
    if rssi is None or not 0 <= rssi <= 31:
        return None
    return next(name for floor, name in QUALITY if rssi >= floor)


class Port(Protocol):
    def readline(self) -> bytes: ...
    def write(self, data: bytes, /) -> int | None: ...
    def close(self) -> None: ...


def open_serial(path: str) -> Port:
    import serial  # pyserial; imported here so tests need no serial hardware

    return serial.Serial(path, BAUD, timeout=1)


def find_port() -> tuple[str | None, str | None]:
    """The Arduino's by-id path, or None and why not."""
    found = sorted(glob.glob(PORT_GLOB))
    if len(found) == 1:
        return found[0], None
    if not found:
        listed = sorted(glob.glob("/dev/serial/by-id/*")) or ["nothing"]
        return None, f"no Arduino in /dev/serial/by-id (found {', '.join(listed)})"
    # ponytail: pick-one-of-many is a config setting when a second Arduino appears
    return None, f"more than one Arduino: {', '.join(found)}"


class Fona:
    def __init__(
        self,
        check: Callable[[str | None, str], dict[str, Any]],
        on_event: Callable[[dict[str, Any]], object],
        port: str | None = None,
        open_port: Callable[[str], Port] = open_serial,
        clock: Callable[[], float] = time.monotonic,
        backoff: tuple[float, ...] = BACKOFF,
    ) -> None:
        self.check = check
        self.on_event = on_event
        self.port = port  # None: find it by id each time
        self.open_port = open_port
        self.clock = clock
        self.backoff = backoff
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._outbox: deque[str] = deque()  # SEND:... lines, sent once ready
        self._reset = False
        self._rssi_now = False
        self._state = "offline"
        self._error: str | None = None
        self._path: str | None = None
        self._firmware: str | None = None
        self._rssi: int | None = None
        self._dbm: int | None = None
        # The last call and text: when, and who/what number (for the tile and sensor).
        self._last: dict[str, tuple[str, str] | None] = {"call": None, "text": None}
        self._sent = self._failed = 0

    # -- lifecycle

    def start(self) -> None:
        threading.Thread(target=self._run, name="fona", daemon=True).start()

    def stop(self) -> None:
        self._stop.set()

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {
                "state": self._state,
                "error": self._error,
                "port": self._path,
                "firmware": self._firmware,
                "rssi": self._rssi,
                "rssi_dbm": self._dbm,
                "signal": quality(self._rssi),
                **_last(self._last, "call"),
                **_last(self._last, "text"),
                "queued": len(self._outbox),
                "sent": self._sent,
                "failed": self._failed,
            }

    # -- requests (the integration's POST /fona/<action>)

    def send_text(self, number: str, message: str) -> None:
        # The Arduino reads one line per command; it turns backslash-n into new lines.
        escaped = message.replace("\n", "\\n")
        _LOGGER.info("text to %s queued: %r", number, message)
        self._outbox.append(f"SEND:{number}:{escaped}")

    def control(self, rest: str, body: bytes = b"") -> int:
        action = rest.split("?")[0].strip("/")
        if action == "reset":
            self._reset = True
            return 202
        if action == "rssi":
            self._rssi_now = True
            return 202
        if action == "send":
            try:
                data = json.loads(body)
                number, message = normalise(data["number"]), str(data["message"])
            except (ValueError, KeyError, TypeError):
                return 400
            if number is None or not 0 < len(message) <= MAX_TEXT:
                return 400
            self.send_text(number, message)
            return 202
        return 404

    # -- the serial thread

    def _run(self) -> None:
        failures = 0
        while not self._stop.is_set():
            path, why = (self.port, None) if self.port else find_port()
            if path is None:
                self._offline(why)
            else:
                try:
                    port = self.open_port(path)
                except OSError as exc:
                    self._offline(f"cannot open {path}: {exc}")
                else:
                    _LOGGER.info("FONA port %s open", path)
                    with self._lock:
                        self._path = path
                    failures = 0
                    try:
                        self._session(port)
                    except OSError as exc:
                        self._offline(f"lost {path}: {exc}")
                    finally:
                        port.close()
            wait = self.backoff[min(failures, len(self.backoff) - 1)]
            failures += 1
            self._stop.wait(wait)

    def _offline(self, why: str | None) -> None:
        with self._lock:
            changed = why != self._error
            self._state, self._error = "offline", why
        if changed and why:
            _LOGGER.error("FONA offline: %s", why)

    def _session(self, port: Port) -> None:
        """Talk to an open port until it fails (OSError) or the module stops."""
        opened = last_rx = self.clock()
        probe_at: float | None = None  # when ALIVE? was sent, unanswered
        waiting: tuple[str, float] | None = None  # command awaiting OK/FAILED
        start_at: float | None = None  # resend START after a failed start
        next_rssi = 0.0
        s = _Session()
        with self._lock:
            self._state, self._error = "starting", None

        def write(line: str) -> None:
            _LOGGER.debug("FONA <- %s", line)
            port.write(f"{line}\n".encode())

        while not self._stop.is_set():
            raw = port.readline()
            now = self.clock()
            if raw:
                last_rx, probe_at = now, None
                line = raw.decode("utf-8", errors="ignore").strip()
                if line:
                    _LOGGER.debug("FONA -> %s", line)
                    for out in self._line(line, s):
                        write(out)
                    if s.done_waiting:
                        waiting, s.done_waiting = None, False
                    if s.start_failed:
                        start_at, s.start_failed = now + START_RETRY_SECONDS, False

            if probe_at is not None and now - probe_at > ANSWER_SECONDS:
                raise OSError("no answer to ALIVE?")
            quiet = now - last_rx > QUIET_SECONDS
            unstarted = (
                not s.ready and not s.started and now - opened > NO_START_SECONDS
            )
            if probe_at is None and (quiet or (unstarted and not s.probed)):
                s.probed = True
                write("ALIVE?")
                probe_at = now
            if start_at is not None and now >= start_at:
                start_at = None
                write("START")
            if self._reset:
                self._reset, s.ready = False, False
                _LOGGER.info("FONA reset requested")
                write("RESET")
            if waiting and now - waiting[1] > COMMAND_SECONDS:
                s.waiting_for = None
                _LOGGER.warning("FONA gave no OK/FAILED for %s", waiting[0])
                waiting = None
            if not s.ready:
                continue
            if self._rssi_now or now >= next_rssi:
                self._rssi_now, next_rssi = False, now + RSSI_SECONDS
                write("RSSI")
            if waiting is None and s.erase:
                s.erase = False
                waiting = ("ERASEALL", now)
                s.waiting_for = "ERASEALL"
                write("ERASEALL")
            elif waiting is None and self._outbox:
                command = self._outbox.popleft()
                waiting = (command, now)
                s.waiting_for = command
                write(command)

    def _line(self, line: str, s: _Session) -> list[str]:
        """Act on one line from the Arduino; returns the lines to write back."""
        if line.startswith("INFO: FONA ") and line.endswith(" start"):
            self._set_firmware(line)
            s.started, s.ready = True, False
            _LOGGER.info("FONA %s started; starting the modem", self._firmware)
            return ["START"]
        if line.startswith("INFO: FONA ") and line.endswith(" ready"):
            self._set_firmware(line)
            self._ready(s)
            return []
        if line.startswith("YES"):  # answer to ALIVE?
            if s.ready:
                return []
            if "not found" in line:  # Arduino up, modem not started
                return ["START"]
            self._ready(s)  # already started before this connection
            return []
        if line == "OK" or line == "FAILED":
            s.done_waiting = True
            command, s.waiting_for = s.waiting_for or "?", None
            with self._lock:
                if line == "OK":
                    self._sent += 1
                else:
                    self._failed += 1
            what = (
                "text to " + command.split(":")[1]
                if command.startswith("SEND:")
                else command
            )
            if line == "FAILED":
                _LOGGER.warning("FONA: %s failed", what)
            elif command.startswith("SEND:"):
                _LOGGER.info("FONA: %s sent", what)
            return []
        if line.startswith("ERROR: FONA not found"):
            _LOGGER.error("FONA modem not found; retrying in %ds", START_RETRY_SECONDS)
            with self._lock:
                self._state, self._error = "starting", "modem not found"
            s.start_failed = True
            return []
        if line.startswith("RSSI:"):
            parts = line.split(":")
            try:
                rssi, dbm = int(parts[1]), int(parts[2].removesuffix("dBm"))
            except (IndexError, ValueError):
                _LOGGER.warning("FONA odd RSSI line %r", line)
                return []
            with self._lock:
                self._rssi, self._dbm = rssi, dbm
            return []
        if line.startswith("RING:"):
            self._handle("call", line[5:].strip(), None)
            return []
        if line.startswith("TEXT:"):
            number, _, message = line[5:].partition(":")
            self._handle("text", number.strip(), message.replace("\\n", "\n"))
            return []
        if line.startswith("ERR"):
            _LOGGER.warning("FONA: %s", line)
        return []

    def _set_firmware(self, line: str) -> None:
        with self._lock:
            self._firmware = line.removeprefix("INFO: FONA ").rsplit(" ", 1)[0]

    def _ready(self, s: _Session) -> None:
        s.ready, s.erase = True, True  # clear the SIM's message store, as before
        with self._lock:
            self._state, self._error = "connected", None
        _LOGGER.info("FONA ready")

    def _handle(self, kind: str, number: str, message: str | None) -> None:
        """A call or text: PING answer (queued, to anyone), auth, then one event."""
        verdict = self.check(number, kind)
        who = verdict["who"]
        if message == PING and number:
            reply = f"{PONG} ({who})" if who else PONG
            _LOGGER.info("PING from %s: replying %r", number, reply)
            self.send_text(number, reply)
        stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        shown = verdict["number"] or number or "withheld"
        source = (
            f"{who} ({shown})"
            if verdict["allowed"]
            else f"{shown}, intrusion: {verdict['reason']}"
            + (f" ({who})" if who else "")
        )
        with self._lock:
            self._last[kind] = (stamp, source)
        event = {
            "kind": kind,
            "authorised": verdict["allowed"],
            "number": verdict["number"] or number,
            "who": who,
            "message": message,
            "reason": verdict["reason"],
        }
        said = f": {message!r}" if message is not None else ""
        if verdict["allowed"]:
            _LOGGER.info("authorised %s from %s%s", kind, source, said)
        else:
            _LOGGER.warning("%s from %s%s", kind, source, said)
        # Off the serial thread: HA being slow must never stall the line.
        threading.Thread(target=self.on_event, args=(event,), daemon=True).start()


class _Session:
    """What one open port has learned so far."""

    def __init__(self) -> None:
        self.started = False  # saw `start` (the Arduino reset on open)
        self.ready = False  # modem answering; texts can be sent
        self.probed = False  # ALIVE? sent because no `start` came
        self.erase = False  # ERASEALL still to send after ready
        self.done_waiting = False  # OK/FAILED arrived
        self.start_failed = False  # "FONA not found": retry START later
        self.waiting_for: str | None = None  # the command awaiting OK/FAILED


def _last(last: dict[str, tuple[str, str] | None], kind: str) -> dict[str, str | None]:
    at, source = last[kind] or (None, None)
    return {f"last_{kind}": at, f"last_{kind}_from": source}
