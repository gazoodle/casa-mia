import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import release  # noqa: E402


def test_release_picks_up_where_it_got_to():
    assert release.stage("2026.10.1-b30", tagged_on_origin=False) == "prepare"
    # prepared and committed, the tag not pushed (stopped, or the push failed)
    assert release.stage("2026.10.1", tagged_on_origin=False) == "publish"
    assert release.stage("2026.10.1", tagged_on_origin=True) == "released"
