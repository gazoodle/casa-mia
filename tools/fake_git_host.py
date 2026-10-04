#!/usr/bin/env python3
"""Serve this checkout over the LAN as if it were GitHub.

*** NEVER TEST THIS ***

Home Assistant's App store installs from a URL, and the Supervisor clones that
URL *on the HA box*, inside its own container. That is why `file://` cannot be
made to work however many slashes it gets: the path resolves in the Supervisor's
filesystem, where this Mac's checkout does not exist. It needs a real network
URL, and until the repo is public there is nowhere to point one.

So point it here:

    .venv/bin/python tools/fake_git_host.py

then paste the printed URL into Settings -> Apps -> App store -> the
three-dot menu -> Repositories. Nothing is written to the working tree, pushed
or published; this only reads the checkout it lives in and maintains one
throwaway branch, described below.

A plain HTTP file server is not an alternative, tempting as it looks. The
Supervisor clones with `--depth=1`, and git's dumb HTTP transport cannot do
shallow clones at all ("dumb http transport does not support shallow
capabilities"). `git daemon` speaks the smart protocol, ships with git, and
needs no CGI host to do it.

## Why the printed URL carries `#app-dev`

`app/Dockerfile` clones the source a *second* time, inside the Docker build
itself: Supervisor scopes the build context to `app/` alone, so `app/src/`,
`integration/` and everything else sitting beside it are invisible to `COPY`
however committed they are. That inner clone needs a URL
of its own, and `main`'s copy of the Dockerfile carries the real, eventually-
public GitHub one — which this daemon cannot make reachable, credentials or
not.

Rather than hand-edit that URL before testing and remember to put it back
before every release (the failure mode this replaced), this maintains a
second branch, `app-dev`, that is *always* identical to whatever HEAD
currently is except for one file: `app/Dockerfile`, with its `CM_REPO`/
`CM_REF` lines rewritten to point at this daemon and at `app-dev` itself.
Supervisor's own repository field understands a `#branch` suffix
(`supervisor/validate.py`: `RE_REPOSITORY`, confirmed against the real
Supervisor source, not the docs, which do not mention it) — so both the outer
clone (of the App repository) and the inner one (inside the Docker build) end
up fetching the same self-consistent branch, and `main` never needs touching.

The branch is rebuilt with plumbing commands only (`hash-object`,
`update-index` against a throwaway index file, `write-tree`, `commit-tree`,
`update-ref`) — never a `checkout`, so your actual working tree, index and
HEAD are never touched, whatever you have open in an editor right now. A
background thread re-syncs it every couple of seconds for as long as this
keeps running, comparing tree hashes so it only commits when something
actually changed: commit new work to `main` (or whatever branch you're on)
while this is running, and `app-dev` catches up on its own — no restart,
no re-paste.

## The version-bump enforcer

The Supervisor offers an update only when `version` in `app/config.yaml` changes, and people
and coding agents keep forgetting to bump it. So the same loop that syncs `app-dev` also
checks every new HEAD: if the latest commit changed `app/` or `integration/` and left the
`pyproject.toml` version as it was in its parent, it bumps the patch number in
`pyproject.toml` and `app/config.yaml`, commits just those two files itself, and shouts
(banner, terminal bell, macOS notification). The fix is to bump first, from a clean repo.
It refuses, and still shouts, when you have uncommitted edits to those two files.

## Releases from GitHub

Once the repo makes releases on GitHub, the box should get them without its App store
repository changing (a new address means a new app slug: a new app, config folder and
options). So every RELEASE_CHECK_SECONDS this also asks GitHub for the latest published
release (drafts and prereleases are not "latest"), whose tag must be a release version,
YYYY.M.R. When that is higher than the local HEAD's version, it fetches the repo from
`origin` and builds `app-dev` from the release's tag instead of HEAD; otherwise (equal,
lower, none, or GitHub unreachable) from HEAD as before. Versions order as releases do:
2026.10.1 is above its own builds (2026.10.1-b26) and below the next ones (2026.10.2-b1),
so the box follows whichever is newer: your builds, a release, your next builds. Each
switch of source is announced in the terminal.

Two things to remember while using it regardless. Only committed work is
served, from whatever branch HEAD is on -- the App you install is the one you
committed, not the one in the editor. And macOS may want to allow incoming
connections the first time; the HA box cannot reach a daemon the firewall is
holding shut.
"""

from __future__ import annotations

import datetime as dt
import json
import math
import os
import re
import socket
import subprocess
import tempfile
import threading
import urllib.request
from pathlib import Path

import versioning  # tools/, next to this script

REPO = Path(__file__).resolve().parents[1]
# One above git's registered port (9418), which another project's fake_git_host.py
# uses, so both can run at once on the same Mac.
PORT = 9419
DEV_BRANCH = "app-dev"
DOCKERFILE_PATH = "app/Dockerfile"
_SYNC_INTERVAL_SECONDS = 2
RELEASE_CHECK_SECONDS = 600  # GitHub allows 60 unauthenticated API calls an hour
RELEASE_RE = re.compile(r"^\d{4}\.\d{1,2}\.\d+$")  # a release: YYYY.M.R, no -bN
# Paths whose change must come with a version bump, and the files that hold the version.
WATCHED_PATHS = ("app", "integration")
VERSION_FILES = ("pyproject.toml", "app/config.yaml")
_BOT_ENV = {
    "GIT_AUTHOR_NAME": "fake_git_host.py",
    "GIT_AUTHOR_EMAIL": "fake-git-host@localhost",
    "GIT_COMMITTER_NAME": "fake_git_host.py",
    "GIT_COMMITTER_EMAIL": "fake-git-host@localhost",
}
_warned_head: str | None = None
_ARG_REPO_RE = re.compile(r"(?m)^ARG CM_REPO=.*$")
_ARG_REF_RE = re.compile(r"(?m)^ARG CM_REF=.*$")


def lan_address() -> str:
    """This machine's address on the LAN the HA box shares.

    A UDP socket aimed off-LAN picks whichever interface the kernel would route
    through, without sending a packet. Deliberately not `gethostname()`: the
    Supervisor resolves names in its own container, where this Mac's `.local`
    name may or may not exist, and a numeric address never has that argument.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        probe.connect(("8.8.8.8", 80))
        return str(probe.getsockname()[0])


def _run(
    *args: str,
    input: str | None = None,
    env: dict[str, str] | None = None,
    check: bool = True,
) -> str:
    full_env = {**os.environ, **env} if env else None
    result = subprocess.run(
        ("git", *args),
        cwd=REPO,
        capture_output=True,
        text=True,
        input=input,
        env=full_env,
    )
    if check and result.returncode != 0:
        raise subprocess.CalledProcessError(
            result.returncode, args, result.stdout, result.stderr
        )
    return result.stdout.strip()


def _patched_dockerfile(content: str, lan_url: str) -> str:
    content = _ARG_REPO_RE.sub(f"ARG CM_REPO={lan_url}", content, count=1)
    content = _ARG_REF_RE.sub(f"ARG CM_REF={DEV_BRANCH}", content, count=1)
    return content


def _order(version: str) -> tuple[float, ...]:
    """A version's place: a release above its own builds, below the next release's."""
    y, m, r, b = versioning.parse(version)
    return (y, m, r, math.inf if b is None else b)


def _github_repo() -> str | None:
    """owner/name of `origin` on GitHub, from its URL; None if it is elsewhere."""
    url = _run("remote", "get-url", "origin", check=False)
    match = re.search(r"github\.com[:/]([^/]+/[^/]+?)(?:\.git)?/?$", url)
    return match.group(1) if match else None


def latest_release() -> str | None:
    """The tag of the latest published release on GitHub, when it is a release version;
    None when there is none, or GitHub can't be asked."""
    repo = _github_repo()
    if not repo:
        return None
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/releases/latest",
        headers={"Accept": "application/vnd.github+json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as answer:
            tag = str(json.load(answer).get("tag_name") or "")
    except (OSError, ValueError) as exc:  # 404: no release yet
        print(f"    release check: none ({exc})", flush=True)
        return None
    return tag if RELEASE_RE.match(tag) else None


_release: str | None = None  # the latest release seen, already fetched
_release_checked = -math.inf
_serving: str | None = None  # what app-dev was last built from, for the announcements


def _base() -> tuple[str, str] | None:
    """The commit to build app-dev from, and what it is: the latest release when its
    version is above HEAD's (fetched from origin first), else HEAD."""
    global _release, _release_checked
    head = _run("rev-parse", "HEAD", check=False)
    if not head:
        return None
    local = _pyproject_version(_run("show", f"{head}:pyproject.toml", check=False))
    now = dt.datetime.now().timestamp()
    if now - _release_checked >= RELEASE_CHECK_SECONDS:
        _release_checked = now
        tag = latest_release()
        if tag and tag != _release:
            fetched = subprocess.run(
                ("git", "fetch", "--quiet", "--tags", "origin"),
                cwd=REPO,
                capture_output=True,
                text=True,
            )
            if fetched.returncode != 0:
                print(f"    release check: fetch failed: {fetched.stderr.strip()}")
                tag = None
        if tag:
            _release = tag
    if _release and local:
        try:
            newer = _order(_release) > _order(local)
        except ValueError:
            newer = False
        if newer:
            commit = _run("rev-parse", f"{_release}^{{commit}}", check=False)
            if commit:
                return commit, f"release {_release} from GitHub (local is {local})"
    return head, f"local HEAD, {local or 'no version'}"


def _sync_dev_branch() -> str | None:
    """Recreate DEV_BRANCH from the base (HEAD, or a newer GitHub release) with the
    Dockerfile's clone target swapped to point at this daemon. Returns the new commit
    sha if anything changed, else None. Plumbing only: never touches the working
    tree or `.git/index`, so it is safe to run against a checkout mid-edit.
    """
    global _serving
    base = _base()
    if not base:
        return None
    head, what = base
    if what.split(",")[0] != (_serving or "").split(",")[0]:
        print(f"    serving {what}", flush=True)
    _serving = what
    try:
        original = _run("show", f"{head}:{DOCKERFILE_PATH}")
    except subprocess.CalledProcessError:
        return None  # nothing at this path on this commit yet

    lan_url = f"git://{lan_address()}:{PORT}/{REPO.name}"
    patched = _patched_dockerfile(original, lan_url)
    if patched == original:
        return None  # no ARG lines matched, or already pointed here

    blob = _run("hash-object", "-w", "--stdin", input=patched)

    with tempfile.TemporaryDirectory() as tmp:
        index_env = {"GIT_INDEX_FILE": str(Path(tmp) / "index")}
        _run("read-tree", head, env=index_env)
        _run(
            "update-index",
            "--add",
            "--cacheinfo",
            "100644",
            blob,
            DOCKERFILE_PATH,
            env=index_env,
        )
        tree = _run("write-tree", env=index_env)

    existing = _run(
        "rev-parse", "--verify", "--quiet", f"refs/heads/{DEV_BRANCH}", check=False
    )
    if existing and _run("rev-parse", f"{existing}^{{tree}}") == tree:
        return None  # already in sync

    commit_env = {
        "GIT_AUTHOR_NAME": "fake_git_host.py",
        "GIT_AUTHOR_EMAIL": "fake-git-host@localhost",
        "GIT_COMMITTER_NAME": "fake_git_host.py",
        "GIT_COMMITTER_EMAIL": "fake-git-host@localhost",
    }
    commit = _run(
        "commit-tree",
        tree,
        "-p",
        head,
        "-m",
        f"fake_git_host.py: point {DOCKERFILE_PATH} at this daemon",
        env=commit_env,
    )
    _run("update-ref", f"refs/heads/{DEV_BRANCH}", commit)
    return commit


def _shout(message: str) -> None:
    bar = "!" * 78
    print(f"\a\n{bar}\n!!! {message}\n{bar}\n", flush=True)
    try:
        subprocess.run(
            (
                "osascript",
                "-e",
                f'display notification "{message}" with title "Casa Mia: VERSION BUMP"',
            ),
            capture_output=True,
            check=False,
        )
    except FileNotFoundError:
        pass  # not macOS: the banner is enough


def _pyproject_version(text: str) -> str | None:
    match = versioning.PYPROJECT_RE.search(text)
    return match.group(1) if match else None


def ensure_version_bumped() -> str | None:
    """If HEAD changed app/ or integration/ without bumping the version, bump and commit.

    Returns the new version, or None when nothing was needed or possible.
    # ponytail: only HEAD vs HEAD~1; two quick commits inside one poll can slip past.
    """
    global _warned_head
    head = _run("rev-parse", "HEAD", check=False)
    parent = _run("rev-parse", "--verify", "--quiet", "HEAD~1", check=False)
    if not head or not parent:
        return None
    if not _run("diff", "--name-only", parent, head, "--", *WATCHED_PATHS, check=False):
        return None
    now = _pyproject_version(_run("show", f"{head}:pyproject.toml", check=False))
    before = _pyproject_version(_run("show", f"{parent}:pyproject.toml", check=False))
    if now is None or now != before:
        return None

    if _run("status", "--porcelain", "--", *VERSION_FILES, check=False):
        if _warned_head != head:
            _warned_head = head
            _shout(
                f"COMMIT {head[:8]} CHANGED THE APP WITHOUT A VERSION BUMP and "
                "pyproject.toml/app/config.yaml have uncommitted edits, so I cannot "
                "fix it. Bump the version yourself."
            )
        return None

    version = versioning.next_build(now, dt.date.today())
    versioning.write(version, REPO)
    _run(
        "commit",
        "-q",
        "--only",
        "-m",
        f"Bump version to {version} (auto: {head[:8]} changed the app without one)",
        "--",
        *VERSION_FILES,
        env=_BOT_ENV,
    )
    _shout(
        f"NO VERSION BUMP in {head[:8]}: I bumped to {version} and committed it for "
        "you. Bump the version FIRST, before any change. Without it the Supervisor "
        "never offers the update."
    )
    return version


def _watch_and_sync(stop: threading.Event) -> None:
    while not stop.is_set():
        ensure_version_bumped()
        commit = _sync_dev_branch()
        if commit:
            print(f"    synced  {DEV_BRANCH} -> {commit[:12]}")
        stop.wait(_SYNC_INTERVAL_SECONDS)


def main() -> int:
    url = f"git://{lan_address()}:{PORT}/{REPO.name}#{DEV_BRANCH}"
    dirty = _run("status", "--porcelain", check=False)
    print(f"Serving {REPO}")
    print(f"    URL     {url}")
    print(f"    Branch  {_run('rev-parse', '--abbrev-ref', 'HEAD', check=False)}")
    print(
        f"    Release the latest on GitHub instead, when newer (checked every "
        f"{RELEASE_CHECK_SECONDS // 60} min)"
    )
    if dirty:
        print(
            f"    NOTE    {len(dirty.splitlines())} uncommitted "
            "file(s) will NOT be served"
        )
    print("Ctrl-C to stop.\n")

    stop = threading.Event()
    syncer = threading.Thread(target=_watch_and_sync, args=(stop,), daemon=True)
    syncer.start()
    try:
        return subprocess.call(
            (
                "git",
                "daemon",
                "--export-all",
                "--informative-errors",
                "--verbose",
                "--reuseaddr",
                f"--base-path={REPO.parent}",
                f"--port={PORT}",
                # Whitelisting the one repo keeps everything else in the parent
                # folder unreachable, base-path or not.
                str(REPO),
            )
        )
    except KeyboardInterrupt:
        return 0
    finally:
        stop.set()


if __name__ == "__main__":
    raise SystemExit(main())
