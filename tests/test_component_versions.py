import json
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


def test_a_release_gives_its_version_to_the_components_its_builds_changed(
    tmp_path, monkeypatch
):
    sys.path.insert(0, str(ROOT / "tools"))
    import component_versions as cv

    root = tmp_path / "integration" / "custom_components"
    was = {
        "changed": "2026.11.3-b14",  # in one of this release's builds
        "earlier": "2026.11.2-b22",  # in an earlier release, before releases restamped
        "released": "2026.11.2",  # in an earlier release
        "elsewhere": "1.4",  # not a version of ours
    }
    for domain, version in was.items():
        (root / domain).mkdir(parents=True)
        (root / domain / "manifest.json").write_text(
            f'{{"domain": "{domain}", "version": "{version}", "name": "X"}}\n'
        )
    lock = tmp_path / "integration" / "versions.lock.json"
    monkeypatch.setattr(cv, "ROOT", tmp_path)
    monkeypatch.setattr(cv, "COMPONENTS", root)
    monkeypatch.setattr(cv, "LOCK", lock)
    digests = {domain: entry["digest"] for domain, entry in cv.current().items()}

    # Released in the month after its builds were started: still that release's.
    assert cv.restamp("2026.11.3-b15", "2026.12.1") == ["changed"]

    now = cv.current()
    assert {d: e["version"] for d, e in now.items()} == was | {"changed": "2026.12.1"}
    assert {
        d: e["digest"] for d, e in now.items()
    } == digests  # the files didn't change
    assert cv.problems(now, json.loads(lock.read_text())) == []  # and the lock says so
    assert '"name": "X"' in (root / "changed" / "manifest.json").read_text()
