import json
import socket
import threading
import urllib.error
import urllib.request

import pytest

import casa_mia
from casa_mia import app_version, settings
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
            "developer": False,
            "settings": settings.DEFAULTS,  # none saved (no /config here)
            "swap": "",
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


def test_health_records_the_integrations_helpers(tmp_path, monkeypatch):
    from casa_mia import settings

    monkeypatch.setattr(settings, "FOLDER", tmp_path)
    helpers: set[str] = set()
    server = make_server(0, helpers=helpers)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        url = f"http://127.0.0.1:{server.server_port}/health"
        assert server.helpers_heard is False  # type: ignore[attr-defined]
        urllib.request.urlopen(f"{url}?helpers=cm-streams.js,cm-back.js").close()
        assert server.helpers_heard is True  # type: ignore[attr-defined]
        assert helpers == {"cm-streams.js", "cm-back.js"}
        # The integration's choice, taken once (from its options, before 2026.10.3-b28)
        assert settings.values()["helpers"] == {
            "streams": True,
            "back": True,
            "refresh": False,
        }
        urllib.request.urlopen(f"{url}?helpers=").close()  # all switched off
        assert helpers == set()
        assert settings.values()["helpers"]["back"] is True  # set here now, so kept
        urllib.request.urlopen(url).close()  # an older integration says nothing
        assert helpers == set()
    finally:
        server.shutdown()
        server.server_close()
