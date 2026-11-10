"""The parts of Casa Mia Protect Talkback that don't need Home Assistant (pure.py)."""

from pathlib import Path

import yaml

from conftest import load_component_file

pure = load_component_file("casa_mia_protect_talkback", "pure")


# Shape of HA 2026.11's managed go2rtc config (go2rtc/server.py), with dummy credentials.
HA_CONFIG = """# This file is managed by Home Assistant
# Do not edit it manually

app:
  modules: ["api","exec","ffmpeg","http","rtsp","webrtc","ws"]

api:
  listen: ""
  unix_listen: "/tmp/go2rtc-x/go2rtc.sock"
  allow_paths: ["/","/api","/api/streams"]
  local_auth: true
  username: user1
  password: pass1

# ffmpeg needs the exec module
# Restrict execution to only ffmpeg binary
exec:
  allow_paths:
    - ffmpeg

rtsp:
  listen: "127.0.0.1:18554"

webrtc:
  listen: ":18555/tcp"
  ice_servers: []
"""
TALK = "/config/custom_components/casa_mia_protect_talkback/talk.py"
STREAMS = {
    "unifiprotect_AABBCCDDEEFF_0": pure.talkback_stream(
        "unifiprotect_AABBCCDDEEFF_0",
        "rtsps://192.0.2.10:7441/abc",
        pure.talk_source(TALK, "/config/.storage/x.json", "cam1"),
    )
}


def test_amend_allows_talk_script_adds_streams_and_keeps_the_rest():
    amended = pure.amend(HA_CONFIG, TALK, STREAMS)

    assert amended.splitlines()[0] == pure.marker_line(TALK, STREAMS)
    assert yaml.safe_load(amended) == {
        **yaml.safe_load(HA_CONFIG),
        "exec": {"allow_paths": ["ffmpeg", TALK]},
        "streams": STREAMS,
    }


def test_the_talkback_stream_keeps_ha_sources_first():
    # HA leaves a stream alone only when one source equals the camera's stream_source.
    sources = STREAMS["unifiprotect_AABBCCDDEEFF_0"]
    assert sources[0] == "rtsps://192.0.2.10:7441/abc"
    assert (
        sources[1]
        == "ffmpeg:unifiprotect_AABBCCDDEEFF_0#audio=opus#query=log_level=debug"
    )
    assert sources[2].startswith(f"exec:{TALK} ")


def test_amend_twice_adds_the_script_once():
    twice = pure.amend(pure.amend(HA_CONFIG, TALK, STREAMS), TALK, STREAMS)
    assert yaml.safe_load(twice)["exec"]["allow_paths"] == ["ffmpeg", TALK]


def test_amend_adds_exec_section_if_ha_drops_it():
    config = yaml.safe_load(HA_CONFIG)
    del config["exec"]
    amended = pure.amend(yaml.safe_dump(config), TALK, {})
    assert yaml.safe_load(amended)["exec"] == {"allow_paths": [TALK]}
    assert "streams" not in yaml.safe_load(amended)


def test_the_marker_changes_with_the_streams(tmp_path):
    config = tmp_path / "go2rtc.yaml"
    config.write_text(pure.amend(HA_CONFIG, TALK, STREAMS))

    assert pure.first_line(str(config)) == pure.marker_line(TALK, STREAMS)
    assert pure.first_line(str(config)) != pure.marker_line(TALK, {})
    assert pure.marker_line(TALK, {}).startswith(pure.MARKER)


def test_parent_pid_survives_odd_process_names():
    assert pure.parent_pid("4242 (go2rtc) S 17 4242 4242 0 -1") == 17
    assert pure.parent_pid("4242 (a) b (c)) S 17 4242") == 17


def _fake_process(proc: Path, pid: int, ppid: int, argv: list[str]) -> None:
    entry = proc / str(pid)
    entry.mkdir()
    (entry / "stat").write_text(f"{pid} ({Path(argv[0]).name}) S {ppid} 0 0")
    (entry / "cmdline").write_bytes(b"\0".join(a.encode() for a in argv) + b"\0")


def test_go2rtc_children_finds_only_our_go2rtc(tmp_path):
    _fake_process(tmp_path, 100, 1, ["/usr/bin/python3", "-m", "homeassistant"])
    _fake_process(tmp_path, 200, 100, ["/bin/go2rtc", "-c", "/tmp/go2rtc_a.yaml"])
    _fake_process(tmp_path, 300, 999, ["/bin/go2rtc", "-c", "/tmp/other.yaml"])
    _fake_process(tmp_path, 400, 100, ["/usr/bin/ffmpeg", "-i", "x"])
    _fake_process(tmp_path, 500, 100, ["/bin/go2rtc", "-c"])  # no file after -c
    (tmp_path / "self").mkdir()

    assert pure.go2rtc_children(100, tmp_path) == [(200, "/tmp/go2rtc_a.yaml")]


def test_talk_source_is_what_go2rtc_needs():
    source = pure.talk_source("/c/talk.py", "/s/e.json", "cam1")
    command, _, query = source.partition("#")
    assert command == "exec:/c/talk.py /s/e.json cam1"
    assert query == "backchannel=1#audio=alaw/8000"


def test_normalise_mac_matches_protect_and_ha_forms():
    assert pure.normalise_mac("0A1B2C3D4E5F") == pure.normalise_mac("0a:1b:2c:3d:4e:5f")


def test_getter_of_finds_the_function_behind_ha_and_plain_properties():
    # HA 2026.11 pins propcache 0.5.4 and uses its cached_property for
    # Camera.camera_entity_capabilities; the first T2 install failed on exactly this.
    from propcache.api import cached_property

    class Entity:
        @cached_property
        def cached(self):
            return "cached"

        @property
        def plain(self):
            return "plain"

    assert pure.getter_of(vars(Entity)["cached"])(Entity()) == "cached"
    assert pure.getter_of(vars(Entity)["plain"])(Entity()) == "plain"
    assert pure.getter_of(None) is None
