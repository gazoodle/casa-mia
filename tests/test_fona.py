"""The fona module against a fake Arduino that speaks FonaForHA's line protocol and can
reset, vanish and come back."""

import json
import queue
import threading
import time

import pytest

from casa_mia.modules import fona as fona_module
from casa_mia.modules.fona import Fona
from casa_mia.modules.people import People

ALEX = "+447700900123"
CLEANER = "+447700900456"


class FakeArduino:
    """One USB Arduino. Opening its port resets it (prints `start`) unless reset_on_open
    is off; `vanished` makes reads and opens fail like an unplugged cable."""

    def __init__(self, reset_on_open=True, modem_started=False):
        self.reset_on_open = reset_on_open
        self.modem = modem_started
        self.mute = False
        self.vanished = False
        self.opens = 0
        self.written = []
        self._out = queue.Queue()

    def say(self, line):
        self._out.put(line)

    # -- the module's side

    def open(self, path):
        if self.vanished:
            raise OSError("no such device")
        self.opens += 1
        if self.reset_on_open:
            self.modem = False
            self.say("INFO: FONA 1.0.2 start")
        return self

    def readline(self):
        if self.vanished:
            raise OSError("device disconnected")
        try:
            return (self._out.get(timeout=0.01) + "\n").encode()
        except queue.Empty:
            return b""

    def write(self, data, /):
        line = data.decode().strip()
        self.written.append(line)
        if self.mute:
            return
        if line == "START":
            self.modem = True
            self.say("INFO: FONA 1.0.2 ready")
        elif line in ("ERASEALL",) or line.startswith("SEND:"):
            self.say("OK")
        elif line == "RSSI":
            self.say("RSSI:20:-73dBm")
        elif line == "ALIVE?":
            self.say(
                "YES" if self.modem else "YES, but FONA module not found or started."
            )
        elif line == "RESET":
            self.modem = False
            self.say("INFO: FONA 1.0.2 start")

    def close(self):
        pass

    def sent_texts(self):
        return [w for w in self.written if w.startswith("SEND:")]


def wait_for(condition, timeout=3.0):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if condition():
            return
        time.sleep(0.01)
    raise AssertionError("timed out")


@pytest.fixture
def people(tmp_path):
    store = tmp_path / "people.json"
    store.write_text(
        json.dumps(
            {
                "people": [
                    {
                        "id": "a",
                        "name": "Alex",
                        "phone": ALEX,
                        "call": True,
                        "text": True,
                    },
                    {
                        "id": "b",
                        "name": "Cleaner",
                        "phone": CLEANER,
                        "call": True,
                        "text": False,
                    },
                ]
            }
        )
    )
    return People(store)


@pytest.fixture
def run(people):
    started = []

    def start(arduino):
        events = []
        f = Fona(
            people.check,
            events.append,
            port="/dev/serial/by-id/usb-Arduino-test",
            open_port=arduino.open,
            backoff=(0.01,),
        )
        f.start()
        started.append(f)
        return f, events

    yield start
    for f in started:
        f.stop()


def test_starts_the_modem_then_clears_the_sim_and_reads_signal(run):
    arduino = FakeArduino()
    f, _ = run(arduino)
    wait_for(lambda: f.health()["state"] == "connected")
    wait_for(lambda: f.health()["rssi_dbm"] == -73)
    assert arduino.written[:1] == ["START"]
    assert "ERASEALL" in arduino.written
    assert f.health()["firmware"] == "1.0.2"


def test_ping_is_answered_for_anyone_then_checked(run, caplog):
    caplog.set_level("DEBUG", logger="casa_mia.modules.fona")
    arduino = FakeArduino()
    f, events = run(arduino)
    wait_for(lambda: f.health()["state"] == "connected")

    arduino.say("TEXT:+447700900999:PING")
    wait_for(lambda: len(events) == 1)
    assert "SEND:+447700900999:PONG from App" in arduino.sent_texts()
    assert events[0] == {
        "kind": "text",
        "authorised": False,
        "number": "+447700900999",
        "who": None,
        "message": "PING",
        "reason": "unknown number",
    }

    arduino.say(f"TEXT:{ALEX}:PING")
    wait_for(lambda: len(events) == 2)
    assert f"SEND:{ALEX}:PONG from App (Alex)" in arduino.sent_texts()
    assert events[1]["authorised"] and events[1]["who"] == "Alex"
    assert f.health()["last_text_from"] == f"Alex ({ALEX})"

    # Calls and texts are logged at INFO; raw serial lines only at DEBUG.
    infos = [r.getMessage() for r in caplog.records if r.levelname == "INFO"]
    assert f"authorised text from Alex ({ALEX}): 'PING'" in infos
    assert not any(m.startswith("FONA ->") for m in infos)
    wait_for(lambda: f"FONA: text to {ALEX} sent" in caplog.text)


def test_calls_and_texts_use_their_own_permission(run):
    arduino = FakeArduino()
    f, events = run(arduino)
    wait_for(lambda: f.health()["state"] == "connected")
    arduino.say("RING:07700900456")  # calls arrive in national form
    arduino.say(f"TEXT:{CLEANER}:open the gates\\nplease")
    arduino.say("RING:")  # withheld
    wait_for(lambda: len(events) == 3)
    by_kind = {(e["kind"], e["number"]): e for e in events}
    assert by_kind[("call", CLEANER)]["authorised"]
    text = by_kind[("text", CLEANER)]
    assert not text["authorised"] and text["reason"] == "not allowed to text"
    assert text["message"] == "open the gates\nplease"
    assert by_kind[("call", "")]["reason"] == "number withheld"
    assert f.health()["last_call_from"] == "withheld, intrusion: number withheld"
    assert f.health()["last_call"] and f.health()["last_text"]
    assert arduino.sent_texts() == []  # nothing said to anyone without a PING


def test_send_requests(run):
    arduino = FakeArduino()
    f, _ = run(arduino)
    wait_for(lambda: f.health()["state"] == "connected")
    body = json.dumps({"number": "07700900123", "message": "Gates open\nbye"}).encode()
    assert f.control("send", body) == 202
    wait_for(lambda: f"SEND:{ALEX}:Gates open\\nbye" in arduino.sent_texts())
    wait_for(lambda: f.health()["sent"] >= 2)  # ERASEALL and the text
    assert f.control("send", b'{"number": "nope", "message": "x"}') == 400
    assert (
        f.control("send", json.dumps({"number": ALEX, "message": "x" * 161}).encode())
        == 400
    )
    assert f.control("send", b"junk") == 400
    assert f.control("nope") == 404


def test_reconnects_after_the_cable_is_pulled(run, caplog):
    arduino = FakeArduino()
    f, _ = run(arduino)
    wait_for(lambda: f.health()["state"] == "connected")
    arduino.vanished = True
    wait_for(lambda: f.health()["state"] == "offline")
    # A retry may already have replaced the current error with "cannot open".
    assert "lost" in caplog.text
    arduino.vanished = False
    wait_for(lambda: f.health()["state"] == "connected")
    assert arduino.opens == 2


def test_reset_restarts_the_modem(run):
    arduino = FakeArduino()
    f, _ = run(arduino)
    wait_for(lambda: f.health()["state"] == "connected")
    assert f.control("reset") == 202
    wait_for(lambda: arduino.written.count("START") == 2)
    wait_for(lambda: f.health()["state"] == "connected")


@pytest.fixture
def fast(monkeypatch):
    monkeypatch.setattr(fona_module, "NO_START_SECONDS", 0.05)
    monkeypatch.setattr(fona_module, "QUIET_SECONDS", 0.2)
    monkeypatch.setattr(fona_module, "ANSWER_SECONDS", 0.2)


def test_port_that_does_not_reset_is_asked_alive(run, fast):
    # Already running: ALIVE? says YES, so no START is needed.
    arduino = FakeArduino(reset_on_open=False, modem_started=True)
    f, _ = run(arduino)
    wait_for(lambda: f.health()["state"] == "connected")
    assert "ALIVE?" in arduino.written and "START" not in arduino.written

    # Arduino up but its modem not started: START it.
    cold = FakeArduino(reset_on_open=False, modem_started=False)
    f2, _ = run(cold)
    wait_for(lambda: f2.health()["state"] == "connected")
    assert cold.written.index("ALIVE?") < cold.written.index("START")


def test_silent_line_is_reopened(run, fast):
    arduino = FakeArduino()
    f, _ = run(arduino)
    wait_for(lambda: f.health()["state"] == "connected")
    arduino.mute = True
    wait_for(lambda: arduino.opens >= 2)
    arduino.mute = False
    wait_for(lambda: f.health()["state"] == "connected")


def test_events_do_not_block_the_line(run, people):
    gate = threading.Event()
    arduino = FakeArduino()
    f = Fona(
        people.check,
        lambda e: gate.wait(5),  # HA stuck
        port="x",
        open_port=arduino.open,
        backoff=(0.01,),
    )
    f.start()
    try:
        wait_for(lambda: f.health()["state"] == "connected")
        arduino.say(f"TEXT:{ALEX}:PING")
        wait_for(lambda: f"SEND:{ALEX}:PONG from App (Alex)" in arduino.sent_texts())
    finally:
        gate.set()
        f.stop()


def test_modem_missing_is_reported_and_retried(run, monkeypatch):
    monkeypatch.setattr(fona_module, "START_RETRY_SECONDS", 0.05)
    arduino = FakeArduino()
    real_write = arduino.write
    tries = []

    def write(data, /):
        if data.decode().strip() == "START" and len(tries) < 1:
            tries.append(1)
            arduino.written.append("START")
            arduino.say("ERROR: FONA not found")
            return
        real_write(data)

    arduino.write = write
    f, _ = run(arduino)
    wait_for(lambda: f.health()["error"] == "modem not found")
    wait_for(lambda: f.health()["state"] == "connected")


@pytest.mark.parametrize(
    ("rssi", "word"),
    [
        (31, "excellent"),
        (20, "excellent"),
        (19, "good"),
        (14, "ok"),
        (10, "ok"),
        (9, "bad"),
        (2, "bad"),
        (1, "terrible"),
        (0, "terrible"),
        (99, None),
        (None, None),
    ],
)
def test_signal_quality(rssi, word):
    assert fona_module.quality(rssi) == word
