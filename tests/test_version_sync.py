import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_app_config_version_matches_pyproject():
    result = subprocess.run(
        [sys.executable, "tools/sync_app_version.py", "--check"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout
