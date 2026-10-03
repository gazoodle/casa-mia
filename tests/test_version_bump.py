import datetime as dt
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import fake_git_host  # noqa: E402


def git(repo, *args):
    return subprocess.run(
        ("git", *args), cwd=repo, check=True, capture_output=True, text=True
    ).stdout.strip()


def make_repo(tmp_path):
    git(tmp_path, "init", "-q", "-b", "main")
    git(tmp_path, "config", "user.email", "t@t")
    git(tmp_path, "config", "user.name", "t")
    (tmp_path / "app").mkdir()
    (tmp_path / "pyproject.toml").write_text('[project]\nversion = "0.1.0"\n')
    (tmp_path / "app" / "config.yaml").write_text('name: x\nversion: "0.1.0"\n')
    git(tmp_path, "add", "-A")
    git(tmp_path, "commit", "-qm", "base")
    return tmp_path


def test_unbumped_app_change_is_bumped_and_committed(tmp_path, monkeypatch):
    repo = make_repo(tmp_path)
    monkeypatch.setattr(fake_git_host, "REPO", repo)
    monkeypatch.setattr(fake_git_host, "_shout", lambda message: None)

    (repo / "app" / "thing.py").write_text("x = 1\n")
    git(repo, "add", "-A")
    git(repo, "commit", "-qm", "change app")

    today = dt.date.today()
    first = f"{today.year}.{today.month}.1-b1"  # 0.1.0 counts as a release
    assert fake_git_host.ensure_version_bumped() == first
    assert f'version = "{first}"' in (repo / "pyproject.toml").read_text()
    assert f'version: "{first}"' in (repo / "app" / "config.yaml").read_text()
    assert git(repo, "status", "--porcelain") == ""
    assert f"Bump version to {first}" in git(repo, "log", "-1", "--format=%s")
    # The bump commit itself is a bump: no loop.
    assert fake_git_host.ensure_version_bumped() is None


def test_bumped_or_unrelated_commits_are_left_alone(tmp_path, monkeypatch):
    repo = make_repo(tmp_path)
    monkeypatch.setattr(fake_git_host, "REPO", repo)
    monkeypatch.setattr(fake_git_host, "_shout", lambda message: None)

    (repo / "README.md").write_text("docs only\n")
    git(repo, "add", "-A")
    git(repo, "commit", "-qm", "docs")
    assert fake_git_host.ensure_version_bumped() is None


def test_dirty_version_file_is_not_touched(tmp_path, monkeypatch):
    repo = make_repo(tmp_path)
    shouts = []
    monkeypatch.setattr(fake_git_host, "REPO", repo)
    monkeypatch.setattr(fake_git_host, "_shout", shouts.append)
    monkeypatch.setattr(fake_git_host, "_warned_head", None)

    (repo / "app" / "thing.py").write_text("x = 1\n")
    git(repo, "add", "-A")
    git(repo, "commit", "-qm", "change app")
    (repo / "pyproject.toml").write_text('[project]\nversion = "0.1.0"\n# editing\n')

    assert fake_git_host.ensure_version_bumped() is None
    assert len(shouts) == 1
