import io
import json
from typing import Any

import pytest
from PIL import Image

from casa_mia import header
from casa_mia.modules.guest_login import render_welcome


@pytest.fixture(autouse=True)
def folder(tmp_path, monkeypatch):
    monkeypatch.setattr(header, "FOLDER", tmp_path)
    return tmp_path


def jpeg(width, height):
    out = io.BytesIO()
    Image.new("RGB", (width, height), "green").save(out, "PNG")
    return out.getvalue()


def call(method, rest="", body=b"") -> tuple[int, Any]:
    status, ctype, data = header.handle(method, rest, {}, body)
    return status, json.loads(data) if ctype == "application/json" else data


def test_defaults_to_the_bundled_photo():
    status, view = call("GET")
    assert status == 200 and view["custom"] is False
    assert view["home"] == {"zoom": 1.0, "x": 50.0, "y": 49.0}
    assert view["welcome"] == {"zoom": 1.35, "x": 21.0, "y": 89.0}
    assert (header.phone_jpeg() or b"").startswith(b"\xff\xd8")
    assert call("GET", "image")[0] == 404


def test_upload_shrinks_and_replaces_then_reset(folder):
    status, view = call("PUT", "image", jpeg(4000, 3000))
    assert status == 200 and view["custom"] and view["stamp"]
    assert Image.open(folder / "header.jpg").size == (2400, 1800)
    status, image = call("GET", "image")
    assert status == 200 and image.startswith(b"\xff\xd8")
    assert Image.open(io.BytesIO(header.phone_jpeg() or b"")).size == (1100, 825)
    assert call("DELETE", "image")[1]["custom"] is False
    assert not (folder / "header.jpg").exists()


def test_rubbish_is_refused(folder):
    assert call("PUT", "image", b"not a photo")[0] == 400
    assert not (folder / "header.jpg").exists()


def test_framing_is_clamped_saved_and_reaches_the_welcome_page():
    status, view = call(
        "PUT", body=json.dumps({"welcome": {"zoom": 9, "x": -5, "y": "30"}}).encode()
    )
    assert status == 200
    assert view["welcome"] == {"zoom": 4.0, "x": 0.0, "y": 30.0}
    assert view["home"] == header.DEFAULT["home"]
    page = render_welcome("Hi", "There", 3, "header.jpg")
    assert "scale(4)" in page and "transform-origin:0% 30%" in page
