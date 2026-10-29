import threading
import urllib.error
import urllib.request

import pytest

from casa_mia.server import WEB_DIR, make_server


def serve(**kw):
    server = make_server(0, modules={"x": lambda: {"state": "running"}}, **kw)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_port}"


def fetch(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.headers, r.read()
    except urllib.error.HTTPError as err:
        return err.code, err.headers, b""


def test_ui_is_served_with_the_ingress_prefix():
    server, base = serve(admin_from=None)
    try:
        status, headers, body = fetch(
            base + "/", {"X-Ingress-Path": "/api/hassio_ingress/abc123"}
        )
        assert status == 200 and headers["Content-Type"].startswith("text/html")
        assert b'<base href="/api/hassio_ingress/abc123/">' in body
        # A deep link gets the page too; the UI routes itself.
        assert fetch(base + "/some/page")[0] == 200
        asset = next((WEB_DIR / "assets").glob("*.js")).name
        status, headers, _ = fetch(f"{base}/assets/{asset}")
        assert status == 200 and "immutable" in headers["Cache-Control"]
    finally:
        server.shutdown()
        server.server_close()


def test_bad_ingress_header_and_traversal_are_ignored():
    server, base = serve(admin_from=None)
    try:
        body = fetch(base + "/", {"X-Ingress-Path": '"><script>'})[2]
        assert b'<base href="/">' in body
        status, _, body = fetch(base + "/../server.py")
        assert b"API_VERSION" not in body
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.parametrize("path", ["/", "/assets/x.js"])
def test_ui_only_for_the_ingress_gateway(path):
    server, base = serve()  # default: only 172.30.32.2
    try:
        assert fetch(base + path)[0] == 403
        assert fetch(base + "/health")[0] == 200  # the integration's API stays open
    finally:
        server.shutdown()
        server.server_close()


def test_an_admin_change_is_pushed_to_home_assistant():
    told = threading.Event()
    answers = {"PUT": 200, "POST": 400}

    def api(method, rest, query, body):
        return answers.get(method, 200), "application/json", b"{}"

    server, base = serve(
        admin_from=None, api={"/api/x/": api}, on_admin_change=told.set
    )
    try:
        fetch(f"{base}/api/x/thing")  # a read: nothing to tell
        req = urllib.request.Request(f"{base}/api/x/thing", data=b"{}", method="POST")
        with pytest.raises(urllib.error.HTTPError):
            urllib.request.urlopen(req)  # refused: nothing changed
        assert not told.is_set()
        req = urllib.request.Request(f"{base}/api/x/thing", data=b"{}", method="PUT")
        urllib.request.urlopen(req).close()
        assert told.wait(2)
    finally:
        server.shutdown()
        server.server_close()
