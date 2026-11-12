"""tools/mirror.py: what a published component's own repository holds, and the decisions
that make publishing it safe to retry. Nothing here reaches GitHub."""

import json
import sys
import zipfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import mirror  # noqa: E402
import release as release_tool  # noqa: E402

WATCH = "casa_mia_sensor_watch"
REPO = "example/casa-mia"
GUIDE = "docs/applets/sensor-watch.md"


def test_the_tree_is_the_component_and_what_a_store_needs(tmp_path):
    out = tmp_path / "out"
    manifest = mirror.build(WATCH, REPO, "HEAD", "example", out)

    # The component as committed: every file, and nothing else.
    committed = mirror.git(
        "ls-tree", "-r", "--name-only", f"HEAD:{mirror.COMPONENTS}/{WATCH}"
    )
    component = out / "custom_components" / WATCH
    assert sorted(committed.splitlines()) == sorted(
        path.relative_to(component).as_posix()
        for path in component.rglob("*")
        if path.is_file()
    )
    assert manifest == mirror.manifest_at(WATCH, "HEAD")

    # Around it, what HACS and the Marketplace ask of a repository's files.
    hacs = json.loads((out / "hacs.json").read_text())
    assert hacs["name"] == manifest["name"] and hacs["homeassistant"][:4].isdigit()
    assert hacs["zip_release"] is True and hacs["filename"] == "sensor_watch.zip"
    assert hacs["hide_default_branch"] is True  # a ZIP release has no branch to offer
    assert (out / "LICENSE").read_text().startswith("MIT License")
    assert (
        "category: integration" in (out / ".github/workflows/validate.yml").read_text()
    )
    readme = (out / "README.md").read_text()
    assert readme.startswith(f"# {manifest['name']}\n")
    assert "https://github.com/example/casa-mia-sensor-watch" in readme
    assert (
        "[![Downloads](https://img.shields.io/github/downloads/example/casa-mia-sensor-watch"
        "/total?label=Downloads)](https://github.com/example/casa-mia-sensor-watch/releases)"
    ) in readme
    assert "isn't the number of houses" in readme
    assert (
        manifest["issue_tracker"]
        in (out / ".github/ISSUE_TEMPLATE/config.yml").read_text()
    )
    assert mirror.problems(out, WATCH, REPO, "HEAD") == []

    # A link that works only inside Casa Mia, or names nothing there, is caught.
    (out / "README.md").write_text(
        f"[a](other.md) [b](https://github.com/{REPO}/blob/HEAD/docs/nowhere.md)"
    )
    assert len(mirror.problems(out, WATCH, REPO, "HEAD")) == 2


def test_the_release_zip_is_the_component_at_its_root(tmp_path):
    component = mirror.component_at(WATCH, "HEAD", tmp_path / "tree")
    archive = mirror.package(component, tmp_path / "sensor_watch.zip")
    assert mirror.archive_problems(archive, WATCH, "HEAD") == []

    # Where a store unpacks it, custom_components/<domain>: the files at its root, the
    # compiled page and cards with them.
    names = zipfile.ZipFile(archive).namelist()
    assert "manifest.json" in names and "__init__.py" in names
    assert {"www/panel.js", "www/panel.css", "www/cards.js"} <= set(names)
    assert not any(name.startswith(("custom_components/", WATCH)) for name in names)

    # The same files give the same bytes, so a retry builds the very same asset.
    again = mirror.package(component, tmp_path / "again.zip")
    assert again.read_bytes() == archive.read_bytes()


def _rezip(archive, out, rename=lambda name: name, drop=(), extra=None, change=None):
    with zipfile.ZipFile(archive) as old, zipfile.ZipFile(out, "w") as new:
        for name in old.namelist():
            if name not in drop:
                data = old.read(name) + (b"#" if name == change else b"")
                new.writestr(rename(name), data)
        if extra:
            new.writestr(extra, b"")
    return out


def test_a_wrong_zip_is_refused_before_it_is_published(tmp_path):
    good = mirror.package(
        mirror.component_at(WATCH, "HEAD", tmp_path / "tree"), tmp_path / "good.zip"
    )

    def wrong(**how):
        bad = _rezip(good, tmp_path / "sensor_watch.zip", **how)
        return mirror.archive_problems(bad, WATCH, "HEAD")

    assert wrong(drop=("www/panel.js",)) == ["sensor_watch.zip lacks www/panel.js"]
    assert wrong(extra="notes.txt") == [
        f"sensor_watch.zip holds notes.txt, not in {WATCH}"
    ]
    assert wrong(change="www/cards.js") == [
        "sensor_watch.zip's www/cards.js differs from the committed one"
    ]
    # A folder around the files: a store would install custom_components/<d>/<d>/.
    nested = wrong(rename=lambda name: f"{WATCH}/{name}")
    assert nested[0] == "sensor_watch.zip has no manifest.json at its root"
    assert "sensor_watch.zip lacks manifest.json" in nested


def test_links_are_made_to_work_from_another_repository():
    blob = f"https://github.com/{REPO}/blob/2026.12.1"
    text = "\n".join(
        (
            "[texts](phone-and-sms.md) [garnish](../tablet-layout.md#showing-and-hiding)",
            "[the event](#the-event) [elsewhere](https://example.org/a.md)",
            '<img src="../screenshots/card.webp" alt="A card">',
            "[shop]: https://example.org/shop",
            "[levels]: ../README.md#maturity",
        )
    )
    assert mirror.absolute(text, GUIDE, REPO, "2026.12.1") == "\n".join(
        (
            f"[texts]({blob}/docs/applets/phone-and-sms.md)"
            f" [garnish]({blob}/docs/tablet-layout.md#showing-and-hiding)",
            f"[the event]({blob}/{GUIDE}#the-event) [elsewhere](https://example.org/a.md)",
            f'<img src="https://raw.githubusercontent.com/{REPO}/2026.12.1'
            '/docs/screenshots/card.webp" alt="A card">',
            "[shop]: https://example.org/shop",
            f"[levels]: {blob}/docs/README.md#maturity",
        )
    )

    # Only the guide's opening goes into the README, with the definitions it uses.
    guide = "# T\n\nOne [shop][shop].\n\n## For\n\nTwo.\n\n## Later\n\n[x][other]\n\n[shop]: s\n[other]: o\n"
    assert (
        mirror.opening(guide)
        == "# T\n\nOne [shop][shop].\n\n## For\n\nTwo.\n\n[shop]: s\n"
    )


def test_a_retry_carries_on_and_a_published_version_is_never_changed():
    # new tree, the tag's tree, main's tree
    assert mirror.decide("a", "", "") == "commit"  # an empty mirror
    assert mirror.decide("a", "", "b") == "commit"  # the release before is on main
    assert mirror.decide("a", "", "a") == "tag"  # pushed, then stopped before the tag
    assert mirror.decide("a", "a", "a") == "done"
    assert mirror.decide("a", "b", "b") == "stop"


def test_a_fork_publishes_no_mirror_unless_it_names_an_owner():
    tracker = "https://github.com/example/casa-mia/issues"
    assert mirror.mirror_owner("Example/casa-mia", tracker, None) == "Example"
    assert mirror.mirror_owner("someone/casa-mia", tracker, None) is None
    assert mirror.mirror_owner("someone/casa-mia", tracker, "someone") == "someone"

    # The mirror is reached the way origin is.
    for origin, wanted in (
        ("https://github.com/example/casa-mia.git", "https://github.com/example/m.git"),
        ("https://github.com/example/casa-mia/", "https://github.com/example/m.git"),
        ("git@github.com:example/casa-mia.git", "git@github.com:example/m.git"),
    ):
        assert mirror.mirror_url(origin, "example/m") == wanted


def test_publishing_is_safe_to_run_again(tmp_path, monkeypatch):
    # A small Casa Mia holding one published component, and an empty repository to be
    # its mirror. GitHub's part (gh, the workflow runs) is only noted.
    source, bare = tmp_path / "casa-mia", tmp_path / "mirror.git"
    manifest = {
        "domain": WATCH,
        "name": "Sensor Watch",
        "codeowners": [],
        "documentation": "https://example.org/guide",
        "issue_tracker": f"https://github.com/{REPO}/issues",
    }
    asked, followed = [], []
    monkeypatch.setattr(release_tool, "ROOT", source)
    monkeypatch.setattr(mirror, "ROOT", source)
    monkeypatch.setattr(mirror, "mirror_url", lambda *_: str(bare))
    monkeypatch.setattr(mirror, "hassfest", lambda out: [])
    listing = []  # what gh says the mirror's releases hold: "tag\tassets"

    def gh(*command, **_):
        asked.append(command)
        return "\n".join(listing) if command[:2] == ("gh", "api") else ""

    monkeypatch.setattr(mirror, "run", gh)
    monkeypatch.setattr(mirror, "follow", lambda *args, **_: followed.append(args))
    for who in ("AUTHOR", "COMMITTER"):
        monkeypatch.setenv(f"GIT_{who}_NAME", "A Tester")
        monkeypatch.setenv(f"GIT_{who}_EMAIL", "tester@example.org")
    git = mirror.git

    def make_release(version, guide="Watches sensors."):
        files = {
            f"{mirror.COMPONENTS}/{WATCH}/manifest.json": json.dumps(
                manifest | {"version": version}
            ),
            GUIDE: f"# Sensor Watch\n\n{guide}\n\n## What it's for\n\nThat.\n",
            "LICENSE": "MIT License\n",
            "app/config.yaml": 'homeassistant: "2026.3.0"\n',
            "pyproject.toml": f'[project]\nversion = "{version}"\n',
        }
        for path, text in files.items():
            (source / path).parent.mkdir(parents=True, exist_ok=True)
            (source / path).write_text(text)
        git("add", "-A")
        git("commit", "-q", "--allow-empty", "-m", version)
        git("tag", "-f", version)

    def there(*args):
        return git("-C", str(bare), *args)

    source.mkdir()
    git("init", "-q", "-b", "dev")
    git("remote", "add", "origin", f"https://github.com/{REPO}.git")
    git("init", "-q", "--bare", "-b", "main", str(bare))
    make_release("2026.12.1")

    # The first run: committed, validated, tagged and released.
    assert mirror.publish(WATCH, REPO, "example", "2026.12.1") == "published"
    first = there("rev-parse", "main")
    assert there("rev-parse", "2026.12.1^{commit}") == first and len(followed) == 1
    assert json.loads(
        there("show", f"main:custom_components/{WATCH}/manifest.json")
    ) == manifest | {"version": "2026.12.1"}
    assert [c[:3] for c in asked if c[2] == "create"] == [
        ("gh", "repo", "create"),
        ("gh", "release", "create"),
    ]
    created = next(c for c in asked if c[1:3] == ("release", "create"))
    assert created[4].endswith("/sensor_watch.zip")  # released with its ZIP

    # Run again: nothing to do. Stopped between the push and the tag: only the tag.
    assert mirror.publish(WATCH, REPO, "example", "2026.12.1") == "already published"
    there("tag", "-d", "2026.12.1")
    assert mirror.publish(WATCH, REPO, "example", "2026.12.1") == "published"
    assert (
        there("rev-parse", "2026.12.1^{commit}") == there("rev-parse", "main") == first
    )

    # A version already published is never given different files.
    make_release("2026.12.1", guide="Watches every sensor.")
    with pytest.raises(mirror.Stop, match="never changed"):
        mirror.publish(WATCH, REPO, "example", "2026.12.1")
    assert (
        there("rev-parse", "2026.12.1^{commit}") == there("rev-parse", "main") == first
    )

    # The next release is one more commit on the mirror's history. A release from before
    # the ZIPs (here 2026.12.1, as gh lists it) is given its ZIP from Casa Mia's tag of
    # the same name, whose files it holds; one already with a ZIP is left.
    make_release("2026.12.2")
    listing[:] = ["2026.12.1\t", "2026.11.9\tsensor_watch.zip"]
    asked.clear()
    assert mirror.publish(WATCH, REPO, "example", "2026.12.2") == "published"
    uploads = [c for c in asked if c[1:3] == ("release", "upload")]
    assert [c[3] for c in uploads] == ["2026.12.1"]
    assert uploads[0][4].endswith("/2026.12.1/sensor_watch.zip")
    assert there("rev-list", "--count", "main") == "2"
    assert there("rev-parse", "2026.12.2^{commit}") == there("rev-parse", "main")


def test_a_lost_watch_asks_github_how_the_run_ended(monkeypatch):
    # The run is listed, then `gh run watch` fails; `gh run view` has the answer.
    answers = {}
    monkeypatch.setattr(
        mirror.subprocess, "run", lambda *_, **__: type("Done", (), {"returncode": 1})
    )

    def gh(*command, **_):
        if command[2] == "list":
            return json.dumps([{"databaseId": 7, "headBranch": "main", "url": "u"}])
        return answers["view"]

    monkeypatch.setattr(mirror, "run", gh)
    answers["view"] = "completed success"
    mirror.follow("o/m", "its validation")
    for state, words in (
        ("completed failure", "did not succeed"),
        ("in_progress ", "Lost track"),
        ("", "Lost track"),
    ):
        answers["view"] = state
        with pytest.raises(mirror.Stop, match=words):
            mirror.follow("o/m", "its validation")
