import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_changelog_has_an_entry_for_the_current_version():
    # The Supervisor shows app/CHANGELOG.md in the update dialog.
    version = tomllib.loads((ROOT / "pyproject.toml").read_text())["project"]["version"]
    changelog = (ROOT / "app" / "CHANGELOG.md").read_text()
    assert f"\n## {version}\n" in changelog, f"add '## {version}' to app/CHANGELOG.md"
