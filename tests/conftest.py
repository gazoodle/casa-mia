"""Test-wide speed-ups."""

import socketserver
import threading
import time

import pytest

_serve_forever = socketserver.BaseServer.serve_forever


def _quick_serve_forever(self, poll_interval=0.01):
    """`shutdown()` waits for the serve loop to notice, up to one poll interval (0.5 s
    by default): with a test server per test that was most of the suite's run time."""
    _serve_forever(self, poll_interval)


socketserver.BaseServer.serve_forever = _quick_serve_forever


@pytest.fixture
def serve():
    """`serve(server)` runs an http.server in a thread and returns its base URL; every
    server started is shut down at the end of the test."""
    started = []

    def start(server):
        threading.Thread(target=server.serve_forever, daemon=True).start()
        started.append(server)
        return f"http://127.0.0.1:{server.server_port}"

    yield start
    for server in started:
        server.shutdown()
        server.server_close()


def set_compositor(monkeypatch, name: str, value) -> None:
    """Set a compositor constant (LINGER, MONITOR_EVERY...) in every part of the
    package that uses it: each imports it by name from common."""
    import importlib
    import pkgutil

    from casa_mia.modules import compositor

    found = False
    for part in pkgutil.iter_modules(compositor.__path__):
        module = importlib.import_module(f"{compositor.__name__}.{part.name}")
        if hasattr(module, name):
            monkeypatch.setattr(module, name, value)
            found = True
    assert found, name


def stop_compositor(comp) -> None:
    """Wait for its asynchronous gatherer shutdown, rather than guessing a delay."""
    loop = comp.gather.loop if comp._own_gather else None
    comp.stop()
    deadline = time.monotonic() + 2
    while loop and loop.is_running() and time.monotonic() < deadline:
        time.sleep(0.001)
    assert not loop or not loop.is_running(), "gatherer did not stop"
