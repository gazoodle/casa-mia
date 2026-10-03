import datetime as dt
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import versioning  # noqa: E402

OCT = dt.date(2026, 10, 2)
NOV = dt.date(2026, 11, 3)


def test_builds_count_up_then_release():
    assert versioning.next_build("0.1.43", OCT) == "2026.10.1-b1"
    assert versioning.next_build("2026.10.1-b9", OCT) == "2026.10.1-b10"
    assert versioning.release_of("2026.10.1-b10", OCT) == "2026.10.1"
    assert versioning.next_build("2026.10.1", OCT) == "2026.10.2-b1"
    assert versioning.next_build("2026.10.2", NOV) == "2026.11.1-b1"
    # Builds started in October and released in November are November's first.
    assert versioning.release_of("2026.10.2-b3", NOV) == "2026.11.1"
    with pytest.raises(ValueError):
        versioning.release_of("2026.10.1", OCT)


def test_release_merges_the_build_notes():
    log = (
        "# Changelog\n\n## 2026.10.2-b2\n\n- two\n\n## 2026.10.2-b1\n\n- one\n\n"
        "## 2026.10.1\n\n- old\n"
    )
    merged = versioning.merge_builds(log, "2026.10.2")
    assert (
        merged
        == "# Changelog\n\n## 2026.10.2\n\n- two\n- one\n\n## 2026.10.1\n\n- old\n"
    )
    assert versioning.notes(merged, "2026.10.2") == "- two\n- one\n"
    with pytest.raises(ValueError):
        versioning.merge_builds(merged, "2026.10.3")
