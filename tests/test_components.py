import json

from casa_mia.components import MARKER, install_all


def make_component(root, domain="foo", version="1.0.0", body="x = 1\n"):
    folder = root / domain
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "manifest.json").write_text(json.dumps({"version": version}))
    (folder / "mod.py").write_text(body)
    return folder


def marker(config, domain="foo"):
    path = config / "custom_components" / domain / MARKER
    return json.loads(path.read_text()) if path.exists() else None


def test_install_update_current_and_stale_removal(tmp_path):
    src, config = tmp_path / "src", tmp_path / "config"
    config.mkdir()
    make_component(src)
    make_component(src, "bar", "2.0.0")

    first = install_all(src, config)
    assert [(r.domain, r.status) for r in first] == [
        ("bar", "installed"),
        ("foo", "installed"),
    ]
    assert marker(config) == {
        "status": "installed",
        "from_version": None,
        "to_version": "1.0.0",
    }

    # Nothing changed: no churn, marker untouched.
    assert [r.status for r in install_all(src, config)] == ["current", "current"]

    # Only foo changes; bar must not be reported or marked again.
    (config / "custom_components" / "bar" / MARKER).unlink()
    make_component(src, "foo", "1.1.0", "x = 2\n")
    (config / "custom_components" / "foo" / "stale.py").write_text("old")
    statuses = {r.domain: r.status for r in install_all(src, config)}
    assert statuses == {"bar": "current", "foo": "updated"}
    assert marker(config) == {
        "status": "updated",
        "from_version": "1.0.0",
        "to_version": "1.1.0",
    }
    assert marker(config, "bar") is None
    assert not (config / "custom_components" / "foo" / "stale.py").exists()


def test_default_components_prefers_the_container_folder(tmp_path):
    from casa_mia.components import default_components

    assert default_components(tmp_path) == tmp_path
    fallback = default_components(tmp_path / "missing")
    assert (fallback / "casa_mia" / "manifest.json").is_file()


def test_a_first_install_asks_for_a_restart(tmp_path):
    import json
    import threading
    from http.server import BaseHTTPRequestHandler, HTTPServer

    from casa_mia.components import InstallResult, ask_for_restart

    seen = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            body = self.rfile.read(int(self.headers["Content-Length"]))
            seen.append((self.headers["Authorization"], json.loads(body)))
            self.send_response(200)
            self.end_headers()

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/"
    current = InstallResult("casa_mia", "current", "1", "1")
    updated = InstallResult("casa_mia", "updated", "1", "2")
    installed = InstallResult("casa_mia", "installed", None, "2")
    try:
        # An update has the component's own Repair; only a first install posts.
        assert not ask_for_restart([current, updated], "tok", url)
        assert ask_for_restart([installed], "tok", url)
    finally:
        server.shutdown()
        server.server_close()
    assert len(seen) == 1
    auth, body = seen[0]
    assert auth == "Bearer tok"
    assert body["notification_id"] == "casa_mia_restart"
    assert "Restart Home Assistant" in body["message"]
    # Home Assistant unreachable: no exception, just False.
    assert not ask_for_restart([installed], "tok", url)
