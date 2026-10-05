"""Test-wide speed-ups."""

import socketserver
import threading

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
