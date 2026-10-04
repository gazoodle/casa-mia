#!/usr/bin/env python3
"""Make a release, step by step: `tools/release.py`.

A walk through the whole process, the same every time, for whoever runs it (on this repo or
a fork). It checks, prepares and shows; nothing is published until you say yes, and it can
be stopped at any prompt and run again: it works out where it got to from the version on
origin/main, a `release-<version>` branch, and the tags on origin.

`main` takes changes only through pull requests with the checks passing (a ruleset), so
the release goes through one too:

  1. The checkout: on main, nothing uncommitted, level with origin.
  2. The checks CI runs: ruff, pyright, pytest (the web build and component versions too).
  3. Prepare: `tools/versioning.py release` (2026.10.1-b30 -> 2026.10.1, the builds'
     changelog sections merged into one), then you review the release notes, editing them
     if you like. Abort puts everything back.
  4. Pull request, after your OK: the release committed on a `release-<version>` branch,
     pushed, and a pull request opened; then it waits for the checks.
  5. Publish, after your OK: merge the pull request, tag the merged commit with the version
     and push the tag, which starts the Release workflow.
  6. GitHub: the Release workflow builds the images, publishes the release and updates the
     `stable` branch. What to do there (the first time: make the GHCR packages public).

Needs git, the venv (`tools/setup`) and the GitHub CLI, `gh`, logged in (`gh auth login`).
See docs/releases.md.
"""

from __future__ import annotations

import datetime as dt
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import versioning  # tools/, next to this script

ROOT = Path(__file__).resolve().parents[1]
VENV = ROOT / ".venv" / "bin"
RELEASE_FILES = ("pyproject.toml", "app/config.yaml", "app/CHANGELOG.md")
CHECKS = (
    ("Lint", [VENV / "ruff", "check", "."]),
    ("Formatting", [VENV / "ruff", "format", "--check", "."]),
    ("Types", [VENV / "pyright"]),
    ("Tests (includes the web build and component versions)", [VENV / "pytest", "-q"]),
)

BOLD, DIM, GREEN, AMBER, RED, OFF = (
    ("\033[1m", "\033[2m", "\033[32m", "\033[33m", "\033[31m", "\033[0m")
    if sys.stdout.isatty()
    else ("",) * 6
)


class Stop(Exception):
    """End the run here, with this said; nothing half-done is left behind."""


def say(text: str = "") -> None:
    print(text, flush=True)


def step(n: int, title: str) -> None:
    say(f"\n{BOLD}── {n}. {title} {'─' * max(0, 60 - len(title))}{OFF}")


def good(text: str) -> None:
    say(f"  {GREEN}✓{OFF} {text}")


def warn(text: str) -> None:
    say(f"  {AMBER}!{OFF} {text}")


def run(*command: str, check: bool = True) -> str:
    done = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    if check and done.returncode:
        raise Stop(
            f"{' '.join(command)} failed:\n{(done.stderr or done.stdout).strip()}"
        )
    return done.stdout.strip()


def git(*args: str, check: bool = True) -> str:
    return run("git", *args, check=check)


def ask(question: str, choices: str = "yn") -> str:
    """One letter of `choices`; the first is the default (Enter)."""
    shown = "/".join(c.upper() if i == 0 else c for i, c in enumerate(choices))
    while True:
        try:
            answer = input(f"\n  {BOLD}{question}{OFF} [{shown}] ").strip().lower()
        except EOFError:
            raise Stop("No answer: stopped.") from None
        if not answer:
            return choices[0]
        if answer[:1] in choices:
            return answer[:1]


def stage(main_version: str, tagged: bool, branch: str | None) -> str:
    """Where the release got to, from origin/main's version, whether that version's tag
    is on origin, and any release branch: "prepare" (start), "pull request" (a release
    branch is waiting to be merged), "tag" (merged, not tagged) or "released"."""
    if versioning.parse(main_version)[3] is not None:
        return "pull request" if branch else "prepare"
    return "released" if tagged else "tag"


def github_repo() -> str | None:
    """owner/name of origin on GitHub; None if it is elsewhere."""
    url = git("config", "remote.origin.url", check=False)  # as set, not rewritten
    found = re.search(r"github\.com[:/](.+?)(?:\.git)?/?$", url)
    return found.group(1) if found else None


def origin_version() -> str:
    match = versioning.PYPROJECT_RE.search(git("show", "origin/main:pyproject.toml"))
    if not match:
        raise Stop("origin/main's pyproject.toml has no version.")
    return match.group(1)


def tagged_on_origin(version: str) -> bool:
    return bool(git("ls-remote", "--tags", "origin", f"refs/tags/{version}"))


def release_branch() -> str | None:
    """A `release-<version>` branch here or on origin: a release under way."""
    names = git("branch", "--list", "release-*", "--format=%(refname:short)").split()
    names += [
        line.split("refs/heads/")[1]
        for line in git("ls-remote", "--heads", "origin", "release-*").splitlines()
    ]
    found = sorted(set(names))
    if len(found) > 1:
        raise Stop(
            f"More than one release branch: {', '.join(found)}. Delete the stale ones."
        )
    return found[0] if found else None


# -- the steps


def check_tools() -> str:
    if not shutil.which("gh"):
        raise Stop(
            "The GitHub CLI is needed: https://cli.github.com, then gh auth login."
        )
    if subprocess.run(["gh", "auth", "status"], capture_output=True).returncode:
        raise Stop("gh is not logged in: gh auth login")
    if not VENV.joinpath("python").exists():
        raise Stop("No .venv: run tools/setup first.")
    repo = github_repo()
    if repo is None:
        raise Stop("origin is not on GitHub: releases are made there.")
    return repo


def check_checkout() -> None:
    step(1, "The checkout")
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    if branch != "main":
        raise Stop(f"You are on {branch}; releases are made from main: git switch main")
    good("on main")
    if dirty := git("status", "--porcelain"):
        raise Stop(
            "There are uncommitted changes; commit or stash them first:\n" + dirty
        )
    good("nothing uncommitted")
    ahead, behind = git(
        "rev-list", "--left-right", "--count", "HEAD...origin/main"
    ).split()
    if int(behind):
        raise Stop(f"origin/main has {behind} commits you don't: git pull first.")
    if int(ahead):
        raise Stop(
            f"You have {ahead} commits origin/main doesn't. They go through a pull "
            "request first; merge it, git pull, then run this again."
        )
    good("level with origin/main")


def run_checks() -> None:
    step(2, "The checks CI runs")
    for name, command in CHECKS:
        say(f"  {DIM}{name}…{OFF}")
        done = subprocess.run(
            [str(c) for c in command], cwd=ROOT, capture_output=True, text=True
        )
        if done.returncode:
            say((done.stdout + done.stderr).strip()[-3000:])
            raise Stop(f"{name} failed: fix it on main first (nothing was changed).")
        good(name)


def restore() -> None:
    git("checkout", "--", *RELEASE_FILES)


def prepare(version: str) -> str:
    release = versioning.release_of(version, dt.date.today())
    step(3, f"Prepare {version} -> {release}")
    if tagged_on_origin(release):
        raise Stop(f"origin already has the tag {release}; it can't be released twice.")
    done = subprocess.run(
        [str(VENV / "python"), "tools/versioning.py", "release"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if done.returncode or done.stdout.strip() != release:
        restore()
        raise Stop(f"tools/versioning.py release failed:\n{done.stderr.strip()}")
    good(f"pyproject.toml and app/config.yaml say {release}")
    good("the builds' changelog sections merged into one")
    review(release)
    return release


def review(release: str) -> None:
    say(
        "\n  These are the release notes: the GitHub release's text, and what the "
        "Supervisor\n  shows in its update dialog. Keep what someone installing or "
        "updating needs; drop\n  build-to-build detail (fixes to things that were "
        "never released)."
    )
    while True:
        notes = versioning.notes(
            (ROOT / "app/CHANGELOG.md").read_text(encoding="utf-8"), release
        )
        say(f"\n{DIM}{'┄' * 72}{OFF}\n{notes.rstrip()}\n{DIM}{'┄' * 72}{OFF}")
        if not notes.strip():
            warn("The notes are empty: the Release workflow refuses that.")
        answer = ask("Notes right? y: yes, e: edit app/CHANGELOG.md, a: abort", "yea")
        if answer == "y" and notes.strip():
            return
        if answer == "a":
            restore()
            raise Stop(
                "Aborted: pyproject.toml, app/config.yaml and the changelog put back."
            )
        editor = os.environ.get("VISUAL") or os.environ.get("EDITOR") or "nano"
        say(f"  {DIM}Opening {editor} (save and quit to come back here){OFF}")
        subprocess.run([*editor.split(), str(ROOT / "app/CHANGELOG.md")], check=False)


def open_pull_request(release: str, repo: str) -> str:
    """Commit the prepared release on its branch and open its pull request; back on
    main afterwards (main itself unchanged)."""
    branch = f"release-{release}"
    step(4, "Pull request")
    say(
        "  This will run:\n"
        f"    git switch -c {branch}\n"
        f'    git commit -m "Release {release}" (the three files)\n'
        f"    git push origin {branch}\n"
        f"    gh pr create (into main)\n"
        "  Nothing is published yet: the pull request is only proposed."
    )
    if ask("Open the pull request?", "ny") != "y":
        restore()
        raise Stop("Stopped: the release files put back, nothing committed.")
    git("switch", "-q", "-c", branch)
    git("add", "--", *RELEASE_FILES)
    git("commit", "-q", "-m", f"Release {release}")
    good(f"committed Release {release} on {branch}")
    git("switch", "-q", "main")
    return branch


def wait_for_pull_request(branch: str, repo: str) -> str:
    """Push the release branch, open its pull request if there is none, and wait for its
    checks. Returns the pull request's number."""
    release = branch.removeprefix("release-")
    here = git("rev-parse", "--verify", "--quiet", branch, check=False)
    there = git("rev-parse", "--verify", "--quiet", f"origin/{branch}", check=False)
    if here and here != there:  # made here, or changed here since (a fix)
        git("push", "-q", "origin", f"{branch}:refs/heads/{branch}")
        good(f"pushed {branch}")
    number = run(
        "gh", "pr", "list", "--repo", repo, "--head", branch, "--state", "open",
        "--json", "number", "--jq", ".[0].number",
    )  # fmt: skip
    if not number:
        notes = versioning.notes(git("show", f"{branch}:app/CHANGELOG.md"), release)
        url = run(
            "gh", "pr", "create", "--repo", repo, "--base", "main", "--head", branch,
            "--title", f"Release {release}", "--body", notes,
        )  # fmt: skip
        number = url.rstrip("/").rsplit("/", 1)[1]
        good(f"pull request #{number}: {url}")
    else:
        good(f"pull request #{number} is open")
    say(
        f"  {DIM}Waiting for its checks (a few minutes; Ctrl-C stops waiting, not them){OFF}"
    )
    watched = subprocess.run(
        ["gh", "pr", "checks", number, "--repo", repo, "--watch", "--required"],
        cwd=ROOT,
    )
    if watched.returncode:
        raise Stop(
            f"A check failed on #{number}. Fix it on {branch} (or abandon the release: "
            f"close #{number} and delete {branch} here and on origin), then run this "
            "again."
        )
    good("the checks passed")
    return number


def merge_and_tag(release: str, number: str | None, repo: str) -> None:
    step(5, f"Publish {release}")
    say(
        "  This will run:\n"
        + (f"    gh pr merge {number} --merge --delete-branch\n" if number else "")
        + "    git pull (main)\n"
        + f"    git tag {release}   (on the merged commit)\n"
        + f"    git push origin {release}     <- starts the Release workflow on GitHub\n"
        "\n  After this the version is public. A mistake needs a new release; never move"
        "\n  or reuse a release tag."
    )
    if ask("Go ahead?", "ny") != "y":
        raise Stop("Stopped; run tools/release.py again to carry on from here.")
    if number:
        run("gh", "pr", "merge", number, "--repo", repo, "--merge", "--delete-branch")
        good(f"merged #{number}")
    git("switch", "-q", "main")
    git("pull", "-q", "--ff-only", "origin", "main")
    git("branch", "-q", "-D", f"release-{release}", check=False)
    if origin_version() != release:
        raise Stop(
            f"origin/main is not at {release} after the merge: look before tagging."
        )
    if not git("tag", "--list", release):
        git("tag", release, "origin/main")
    git("push", "-q", "origin", f"refs/tags/{release}")
    good(f"tagged origin/main {release} and pushed the tag")


def on_github(release: str, repo: str) -> None:
    step(6, "On GitHub")
    owner, name = repo.split("/")
    say(
        f"  The Release workflow for {release} is running: checks, images for amd64 and\n"
        f"  aarch64, then the GitHub release and the `stable` branch.\n"
        f"    https://github.com/{repo}/actions/workflows/release.yml\n"
        "\n  The first release only: its images go up as private packages, so the"
        "\n  workflow's anonymous pull check fails. Then:"
        f"\n    a. Open https://github.com/{owner}?tab=packages"
        f"\n    b. For each of {name}-amd64 and {name}-aarch64:"
        "\n       Package settings → Danger Zone → Change visibility → Public."
        "\n    c. Back on the workflow run: Re-run failed jobs."
        "\n\n  When it has finished, the release is at"
        f"\n    https://github.com/{repo}/releases/tag/{release}"
        "\n  and installs and updates come from (in Home Assistant's App store)"
        f"\n    https://github.com/{repo}#stable"
        "\n  Keep your own box on its development URL: another repository URL is another"
        "\n  app (a new slug, none of its settings)."
    )
    if ask("Follow the workflow here?", "yn") == "y":
        found = run(
            "gh", "run", "list", "--repo", repo, "--workflow", "release.yml",
            "--limit", "1", "--json", "databaseId", "--jq", ".[0].databaseId",
            check=False,
        )  # fmt: skip
        if found:
            subprocess.run(
                ["gh", "run", "watch", found, "--repo", repo, "--exit-status"]
            )
        else:
            warn("No Release run yet; open the link above.")
    say(
        "\n  Then carry on as usual. Bring your working branch up to date with main"
        "\n  (git merge origin/main), and the next change starts the next release's"
        "\n  builds (tools/versioning.py bump, Rule Zero)."
    )


def main() -> int:
    say(f"{BOLD}Release{OFF} {DIM}(Ctrl-C at any prompt stops safely){OFF}")
    try:
        repo = check_tools()
        git("fetch", "-q", "--tags", "--prune", "origin")
        version = origin_version()
        branch = release_branch()
        where = stage(version, tagged_on_origin(version), branch)
        if where == "released":
            say(f"\n  {version} is already released (its tag is on origin).")
            on_github(version, repo)
            return 0
        if where == "tag":
            warn(f"origin/main is at {version}, merged but not tagged: carrying on.")
            merge_and_tag(version, None, repo)
        else:
            if where == "prepare":
                check_checkout()
                run_checks()
                release = prepare(version)
                branch = open_pull_request(release, repo)
            else:
                assert branch
                warn(f"The release on {branch} is under way: carrying on.")
            release = branch.removeprefix("release-")
            number = wait_for_pull_request(branch, repo)
            merge_and_tag(release, number, repo)
            version = release
        on_github(version, repo)
        return 0
    except Stop as stop:
        say(f"\n  {RED}■{OFF} {stop}")
        return 1
    except KeyboardInterrupt:
        say(f"\n  {RED}■{OFF} Stopped.")
        if git("rev-parse", "--abbrev-ref", "HEAD", check=False) == "main" and git(
            "status", "--porcelain", "--", *RELEASE_FILES, check=False
        ):
            restore()
            say("  The release files were put back.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
