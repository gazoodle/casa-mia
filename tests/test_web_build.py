import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_admin_ui_build_matches_sources():
    result = subprocess.run(
        [sys.executable, "tools/web_hash.py"], cwd=ROOT, capture_output=True, text=True
    )
    assert result.returncode == 0, result.stdout
