import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import release  # noqa: E402


def test_release_picks_up_where_it_got_to():
    assert release.stage("2026.10.1-b30", tagged=False, branch=None) == "prepare"
    # prepared on its branch, its pull request not merged yet
    branch = "release-2026.10.1"
    assert release.stage("2026.10.1-b30", tagged=False, branch=branch) == "pull request"
    # merged (origin/main is at the release), not tagged yet
    assert release.stage("2026.10.1", tagged=False, branch=None) == "tag"
    assert release.stage("2026.10.1", tagged=True, branch=None) == "released"
