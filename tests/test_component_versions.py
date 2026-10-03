import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_component_versions_match_lock():
    result = subprocess.run(
        [sys.executable, "tools/component_versions.py"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout


def test_update_stamps_a_changed_component_with_the_app_version(tmp_path, monkeypatch):
    sys.path.insert(0, str(ROOT / "tools"))
    import component_versions as cv

    comp = tmp_path / "integration" / "custom_components" / "demo"
    comp.mkdir(parents=True)
    (comp / "manifest.json").write_text('{"domain": "demo", "version": "0.5.2"}')
    (comp / "a.py").write_text("x = 1\n")
    (tmp_path / "pyproject.toml").write_text('[project]\nversion = "2026.10.1-b3"\n')
    monkeypatch.setattr(cv, "ROOT", tmp_path)
    monkeypatch.setattr(cv, "COMPONENTS", comp.parent)
    monkeypatch.setattr(cv, "LOCK", tmp_path / "integration" / "versions.lock.json")
    monkeypatch.setattr(sys, "argv", ["component_versions.py", "--update"])

    assert cv.main() == 0  # new component: stamped
    assert '"2026.10.1-b3"' in (comp / "manifest.json").read_text()
    (tmp_path / "pyproject.toml").write_text('[project]\nversion = "2026.10.1-b4"\n')
    assert cv.main() == 0  # unchanged files: the version stays
    assert '"2026.10.1-b3"' in (comp / "manifest.json").read_text()
    (comp / "a.py").write_text("x = 2\n")
    monkeypatch.setattr(sys, "argv", ["component_versions.py"])
    assert cv.main() == 1  # changed, not recorded: the check fails
    monkeypatch.setattr(sys, "argv", ["component_versions.py", "--update"])
    assert cv.main() == 0
    assert '"2026.10.1-b4"' in (comp / "manifest.json").read_text()
