"""tools/check_patches.py: reading and moving the checked range, and what counts as a
change between two Home Assistant releases. (Downloading a release is not tested.)"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import check_patches  # noqa: E402
from check_patches import FILES, PATCHING, changes, checked, recorded  # noqa: E402


def test_the_range_is_read_from_patching_and_only_its_newest_moves():
    text = PATCHING.read_text()
    oldest, newest = checked(text)
    assert recorded(text, "2099.1.0").count("CHECKED = (") == 1
    assert checked(recorded(text, "2099.1.0")) == (oldest, "2099.1.0")
    with pytest.raises(SystemExit):
        checked("nothing here")


def test_only_files_that_differ_are_reported():
    same = {name: "x = 1\n" for name in FILES}
    assert changes(same, dict(same)) == []

    moved = {**same, FILES[0]: "x = 2\n"}
    diff = "".join(changes(same, moved))
    assert FILES[0] in diff and "-x = 1" in diff and "+x = 2" in diff
    assert FILES[1] not in diff

    gone = {**same, FILES[2]: None}
    assert changes(same, gone) == [f"{FILES[2]}: gone\n"]
    assert changes(gone, same) == [f"{FILES[2]}: added\n"]


def test_a_release_not_newer_than_the_newest_checked_is_left_alone(monkeypatch):
    def no_download(*_):
        raise AssertionError("nothing is downloaded")

    monkeypatch.setattr(check_patches, "sources", no_download)
    oldest, newest = checked(PATCHING.read_text())
    assert check_patches.main([newest]) == 0
    assert check_patches.main([oldest]) == 0
