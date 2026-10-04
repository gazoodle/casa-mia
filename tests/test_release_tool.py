import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import release  # noqa: E402


def test_release_picks_up_where_it_got_to():
    stage = release.stage
    # dev on a build, main on the last (tagged) release: start
    assert stage("2026.10.1-b30", "0.1.0", False, True) == "prepare"
    # prepared and committed on dev, its pull request not merged yet
    assert stage("2026.10.1", "2026.9.1-b3", False, False) == "pull request"
    # merged into main, not tagged yet (dev may have moved on since)
    assert stage("2026.10.1", "2026.10.1", False, False) == "tag"
    assert stage("2026.10.2-b1", "2026.10.1", False, False) == "tag"
    assert stage("2026.10.1", "2026.10.1", True, True) == "released"
