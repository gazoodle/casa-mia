import json
import time
import urllib.error
import urllib.request

from casa_mia.modules.gitproxy import ABI_SUFFIXES, GitProxy, _tag_of


def test_tag_of():
    assert _tag_of("kiosk-satellite-2026.9.44.arm64-v8a.apk") == "2026.9.44"
    assert _tag_of("kiosk-satellite-2026.9.44.apk") == "2026.9.44"


def test_mirror_serves_and_prunes(tmp_path):
    # file:// URLs stand in for GitHub.
    src = tmp_path / "src"
    src.mkdir()
    tags = ["3.0", "2.0", "1.0", "0.9"]
    (src / "releases.json").write_text(
        json.dumps(
            [
                {
                    "tag_name": t,
                    "assets": [
                        {"name": f"kiosk-satellite-{t}{abi}.apk", "size": 3}
                        for abi in ABI_SUFFIXES
                    ],
                }
                for t in tags
            ]
        )
    )
    for abi in ABI_SUFFIXES:
        (src / f"kiosk-satellite-3.0{abi}.apk").write_bytes(b"apk")
    out = tmp_path / "out"
    out.mkdir()
    (out / "kiosk-satellite-0.9.apk").write_bytes(b"old")  # fourth newest: pruned

    proxy = GitProxy(
        out,
        port=0,
        releases_api=(src / "releases.json").as_uri(),
        download_url=src.as_uri() + "/{name}",
    )
    proxy.start()
    try:
        health = _wait_for_check(proxy)
        assert health["state"] == "running"
        assert health["latest"] == "3.0" and health["error"] is None
        assert not health["downloading"]
        assert (health["downloaded_bytes"], health["total_bytes"]) == (12, 12)
        assert health["downloaded_percent"] == 100.0
        assert not (out / "kiosk-satellite-0.9.apk").exists()
        url = f"http://127.0.0.1:{health['port']}/releases.json"
        assert json.load(urllib.request.urlopen(url))[0]["tag_name"] == "3.0"
    finally:
        proxy.stop()


def test_failed_check_keeps_serving(tmp_path):
    proxy = GitProxy(tmp_path, port=0, releases_api=(tmp_path / "missing").as_uri())
    proxy.start()
    try:
        health = _wait_for_check(proxy)
        assert health["state"] == "running" and "check failed" in health["error"]
    finally:
        proxy.stop()


def _wait_for_check(proxy):
    # start() runs the first mirror in the background.
    for _ in range(100):
        if proxy.health()["last_check"]:
            return proxy.health()
        time.sleep(0.05)
    raise AssertionError("no mirror check finished")


def test_post_runs_registered_action(tmp_path):
    import threading

    from casa_mia.server import make_server

    ran = threading.Event()
    server = make_server(0, actions={"/gitproxy/check": ran.set})
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        req = urllib.request.Request(f"{base}/gitproxy/check", method="POST")
        assert urllib.request.urlopen(req).status == 202
        assert ran.wait(2)
        try:
            urllib.request.urlopen(
                urllib.request.Request(f"{base}/nope", method="POST")
            )
        except urllib.error.HTTPError as err:
            assert err.code == 404
        else:
            raise AssertionError("expected 404")
    finally:
        server.shutdown()
        server.server_close()


def test_admin_api(tmp_path):
    out = tmp_path / "firmware"
    out.mkdir()
    (out / "releases.json").write_text(
        json.dumps([{"tag_name": t} for t in ("3.0", "2.0", "1.0")])
    )
    for t in ("3.0", "2.0", "1.0"):
        (out / f"kiosk-satellite-{t}.apk").write_bytes(b"apk")
    settings = tmp_path / "config" / "gitproxy.json"
    proxy = GitProxy(
        out,
        port=0,
        releases_api=(tmp_path / "missing").as_uri(),
        settings_path=settings,
        lan_host=lambda: "10.0.0.5",
    )
    proxy._latest = proxy._latest_on_disk()

    def call(method, path, body=b""):
        status, ctype, data = proxy.handle(method, path, {}, body)
        assert ctype == "application/json"
        return status, json.loads(data)

    status, view = call("GET", "status")
    assert status == 200
    assert view["url"] == "http://10.0.0.5:0"
    assert view["keep"] == 2 and view["latest"] == "3.0"
    assert {f["name"] for f in view["files"]} == {
        "releases.json",
        "kiosk-satellite-3.0.apk",
        "kiosk-satellite-2.0.apk",
        "kiosk-satellite-1.0.apk",
    }
    assert all(f["size"] > 0 and f["modified"] for f in view["files"])

    # Lowering keep saves it and prunes at once; the latest always stays.
    status, view = call("PUT", "settings", b'{"keep": 0}')
    assert status == 200 and view["keep"] == 0
    assert [f.name for f in out.glob("*.apk")] == ["kiosk-satellite-3.0.apk"]
    assert json.loads(settings.read_text()) == {"keep": 0}
    assert GitProxy(out, settings_path=settings).keep == 0

    for bad in (b'{"keep": -1}', b'{"keep": 6}', b'{"keep": "2"}', b"nope", b"{}"):
        assert call("PUT", "settings", bad)[0] == 400
    assert call("GET", "nope")[0] == 404


def test_saved_keep_is_clamped(tmp_path):
    settings = tmp_path / "gitproxy.json"
    settings.write_text('{"keep": -5}')
    assert GitProxy(tmp_path, settings_path=settings).keep == 0


def test_tablet_requests_are_logged_and_tracked(tmp_path, caplog):
    (tmp_path / "releases.json").write_text("[]")
    (tmp_path / "kiosk-satellite-1.0.apk").write_bytes(b"apk")
    proxy = GitProxy(tmp_path, port=0, releases_api=(tmp_path / "missing").as_uri())
    proxy.start()
    try:
        assert proxy.health()["last_tablet_check"] is None
        base = f"http://127.0.0.1:{proxy.port}"
        with caplog.at_level("INFO", logger="casa_mia.modules.gitproxy"):
            urllib.request.urlopen(f"{base}/releases.json").read()
            urllib.request.urlopen(f"{base}/kiosk-satellite-1.0.apk").read()
        health = proxy.health()
        assert health["last_tablet_check"] and health["last_tablet"] == "127.0.0.1"
        assert "tablet 127.0.0.1 checked for firmware updates (200)" in caplog.text
        assert "tablet 127.0.0.1 is downloading kiosk-satellite-1.0.apk (200)" in (
            caplog.text
        )
    finally:
        proxy.stop()


def test_release_without_files_is_not_offered(tmp_path):
    # GitHub lists 4.0 but its APKs are not attached yet (404): tablets must not see it.
    src = tmp_path / "src"
    src.mkdir()
    (src / "releases.json").write_text(
        json.dumps(
            [{"tag_name": "4.0", "assets": []}, {"tag_name": "3.0", "assets": []}]
        )
    )
    out = tmp_path / "out"
    out.mkdir()
    (out / "kiosk-satellite-3.0.apk").write_bytes(b"apk")  # mirrored last time
    proxy = GitProxy(
        out,
        port=0,
        releases_api=(src / "releases.json").as_uri(),
        download_url=src.as_uri() + "/{name}",
    )
    proxy.mirror()
    offered = [r["tag_name"] for r in json.loads((out / "releases.json").read_text())]
    assert offered == ["3.0"]
    assert "failed to download" in proxy.health()["error"]
