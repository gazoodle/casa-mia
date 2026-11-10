"""talk.py, the script go2rtc runs while a viewer talks through a Protect camera."""

import json
import os

import pytest

from conftest import COMPONENTS, load_component_file

talk = load_component_file("casa_mia_protect_talkback", "talk")


@pytest.fixture
def secrets(tmp_path):
    path = tmp_path / "secrets.json"
    path.write_text(json.dumps({"host": "console.invalid", "api_key": "k"}))
    return str(path)


def test_hands_over_to_ffmpeg_in_the_sessions_codec(secrets, monkeypatch):
    calls = []
    monkeypatch.setattr(
        talk,
        "open_session",
        lambda host, key, camera: (
            calls.append((host, key, camera))
            or {"url": "rtp://192.0.2.9:7004/x", "codec": "opus", "samplingRate": 24000}
        ),
    )
    monkeypatch.setattr(
        talk.os, "execvp", lambda file, args: calls.append((file, args))
    )

    talk.main(secrets, "cam1")

    assert calls[0] == ("console.invalid", "k", "cam1")
    file, args = calls[1]
    assert file == "ffmpeg"
    assert args[args.index("-i") - 6 : args.index("-i") + 2] == [
        "-f",
        "alaw",
        "-ar",
        "8000",
        "-ac",
        "1",
        "-i",
        "-",
    ]
    assert args[-3:] == ["-f", "rtp", "rtp://192.0.2.9:7004/x"]
    assert args[args.index("-ar:a") + 1] == "24000"


def test_no_session_means_exit_1_without_the_url(secrets, monkeypatch, capsys):
    def refuse(*args):
        raise OSError("connection refused")

    monkeypatch.setattr(talk, "open_session", refuse)
    assert talk.main(secrets, "cam1") == 1
    assert "cam1" in capsys.readouterr().err


def test_unknown_codec_is_refused(secrets, monkeypatch):
    monkeypatch.setattr(
        talk,
        "open_session",
        lambda *a: {"url": "x", "codec": "g711", "samplingRate": 8000},
    )
    assert talk.main(secrets, "cam1") == 1


def test_talk_script_is_executable():
    # go2rtc runs it directly; the app's install keeps the mode (shutil.copy2).
    assert os.access(COMPONENTS / "casa_mia_protect_talkback" / "talk.py", os.X_OK)
