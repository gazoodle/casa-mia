import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from casa_mia.install_count import count_install


def serve(requests):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            requests.append(self.path)
            if self.path.startswith("/2026.11.1/"):
                self.send_response(404)
                self.end_headers()
                return
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"## notes\n")

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def test_each_release_is_counted_once_and_old_notes_go(tmp_path):
    requests = []
    server = serve(requests)
    url = f"http://127.0.0.1:{server.server_port}/{{version}}/release-notes.md"
    try:
        assert not count_install("2026.10.1-b5", tmp_path, url)  # a build: no release
        assert count_install("2026.10.1", tmp_path, url)
        assert not count_install("2026.10.1", tmp_path, url)  # a restart: not again
        assert count_install("2026.10.2", tmp_path, url)  # an update: counted
        # A release not published yet (or GitHub down): no exception, tried next start.
        assert not count_install("2026.11.1", tmp_path, url)
    finally:
        server.shutdown()
        server.server_close()
    assert requests == [
        "/2026.10.1/release-notes.md",
        "/2026.10.2/release-notes.md",
        "/2026.11.1/release-notes.md",
    ]
    assert sorted(p.name for p in tmp_path.iterdir()) == ["2026.10.2.md"]
