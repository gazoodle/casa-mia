"""RULE THREE (CLAUDE.md): no source file over LIMIT lines. The files already over it
are held at their size until they are split: they may shrink, never grow."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 800
SOURCES = (
    "app/src/**/*.py",
    "app/web/src/**/*.ts",
    "app/web/src/**/*.tsx",
    "integration/custom_components/**/*.py",
    "integration/cards/src/**/*.ts",
    "tools/*.py",
    "tests/*.py",
)
# Over the limit before the rule (2026-10-10): split each when next working in it,
# lower its number as it shrinks, and take it off once it is under LIMIT.
OVER = {
    "tests/test_camera_dashboard.py": 845,
}


def lines() -> dict[str, int]:
    return {
        str(p.relative_to(ROOT)): len(p.read_text().splitlines())
        for pattern in SOURCES
        for p in ROOT.glob(pattern)
    }


def test_no_source_file_grows_past_its_limit():
    over = {
        f"{path}: {n} lines (at most {OVER.get(path, LIMIT)}; split it, see RULE THREE)"
        for path, n in lines().items()
        if n > OVER.get(path, LIMIT)
    }
    assert not over, "\n".join(sorted(over))


def test_the_list_of_files_over_the_limit_is_current():
    now = lines()
    stale = {p for p in OVER if p not in now or now[p] <= LIMIT}
    assert not stale, f"under {LIMIT} lines now (or gone): take off OVER: {stale}"
