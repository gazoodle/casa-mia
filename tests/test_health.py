import json
import socket
import threading
import urllib.error
import urllib.request

import pytest

import casa_mia
from casa_mia import app_version
from casa_mia.server import make_server


@pytest.fixture
def base_url():
    server = make_server(0)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()
    server.server_close()


def test_health_reports_ok_and_version(base_url):
    with urllib.request.urlopen(f"{base_url}/health") as response:
        assert json.load(response) == {
            "status": "ok",
            "version": app_version(),
            "api": 1,
            "integration_url": f"http://{socket.gethostname()}:8780",
            "house": "Casa Mia",
            "modules": {},
        }


def test_other_paths_are_only_for_ingress(base_url):
    # Anything but /health is the admin UI, which only the ingress gateway may load.
    with pytest.raises(urllib.error.HTTPError) as err:
        urllib.request.urlopen(f"{base_url}/nope")
    assert err.value.code == 403


def test_version_is_shown_as_the_supervisor_shows_it(monkeypatch):
    # Python normalises 2026.10.1-b2 to 2026.10.1b2; the app puts the dash back.
    monkeypatch.setattr(casa_mia, "version", lambda _: "2026.10.1b2")
    assert app_version() == "2026.10.1-b2"
    monkeypatch.setattr(casa_mia, "version", lambda _: "2026.10.1")
    assert app_version() == "2026.10.1"
