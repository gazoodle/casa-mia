import json

from casa_mia import settings


def call(method, body=None):
    status, _, data = settings.handle(
        method, "", {}, json.dumps(body).encode() if body is not None else b""
    )
    return status, json.loads(data)


def test_settings_default_save_and_refuse(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "FOLDER", tmp_path)
    assert call("GET") == (200, settings.DEFAULTS)
    status, saved = call(
        "PUT",
        {
            "tablet_view": {
                "identify_panels": True,
                "identify_outline": "2px dashed lime",
            }
        },
    )
    assert status == 200 and saved["tablet_view"] == {
        "identify_panels": True,
        "identify_outline": "2px dashed lime",
        "show_size": False,
    }
    assert call("GET")[1] == saved  # kept
    assert call("PUT", {"tablet_view": {"show_size": "yes"}})[0] == 400  # wrong type
    assert call("PUT", {"tablet_view": {"rm_rf": True}})[0] == 400  # unknown
    assert call("PUT", {"tablet_view": {"identify_outline": "x" * 101}})[0] == 400
    (tmp_path / "settings.json").write_text('{"tablet_view": {"show_size": 3}}')
    assert settings.values() == settings.DEFAULTS  # a bad file falls back
