import importlib.util
import json
from pathlib import Path

# Loaded by path: the package __init__ needs Home Assistant, this module does not.
FILE = (
    Path(__file__).resolve().parents[1]
    / "integration/custom_components/casa_mia/restart_notice.py"
)
spec = importlib.util.spec_from_file_location("restart_notice", FILE)
assert spec and spec.loader
notice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notice)


def write_marker(folder, to_version):
    (folder / notice.MARKER).write_text(json.dumps({"to_version": to_version}))


def test_no_marker_means_no_restart(tmp_path):
    assert notice.pending_restart("1.0.0", tmp_path) is None


def test_newer_version_installed_needs_restart(tmp_path):
    write_marker(tmp_path, "1.1.0")
    assert notice.pending_restart("1.0.0", tmp_path) == "1.1.0"
    assert (tmp_path / notice.MARKER).exists()


def test_marker_matching_loaded_version_is_cleared(tmp_path):
    write_marker(tmp_path, "1.1.0")
    assert notice.pending_restart("1.1.0", tmp_path) is None
    assert not (tmp_path / notice.MARKER).exists()


def test_garbage_marker_is_ignored(tmp_path):
    (tmp_path / notice.MARKER).write_text("not json")
    assert notice.pending_restart("1.0.0", tmp_path) is None
