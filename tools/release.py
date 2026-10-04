#!/usr/bin/env python3
"""Make a release, step by step: `tools/release.py`.

A walk through the whole process, the same every time, for whoever runs it (on this repo or
a fork). It checks, prepares and shows; it changes nothing on GitHub until you say yes, and
it can be stopped at any prompt and run again: it works out where it got to from the
version in pyproject.toml and the tags on origin.

  1. The checkout: on main, nothing uncommitted, level with origin.
  2. The checks CI runs: ruff, pyright, pytest (the web build and component versions too).
  3. Prepare: `tools/versioning.py release` (2026.10.1-b30 -> 2026.10.1, the builds'
     changelog sections merged into one), then you review the release notes, editing them
     if you like. Abort puts everything back.
  4. Publish, after your OK: commit "Release <version>", push main, tag, push the tag.
  5. GitHub: the Release workflow builds the images, publishes the release and updates the
     `stable` branch. What to do there (the first time: make the GHCR packages public).

Needs git and the venv (`tools/setup`); the `gh` CLI is used to follow the workflow if it is
installed, and is not needed otherwise. See docs/releases.md.
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
    print(text)


def step(n: int, title: str) -> None:
    say(f"\n{BOLD}── {n}. {title} {'─' * max(0, 60 - len(title))}{OFF}")


def good(text: str) -> None:
    say(f"  {GREEN}✓{OFF} {text}")


def warn(text: str) -> None:
    say(f"  {AMBER}!{OFF} {text}")


def git(*args: str, check: bool = True) -> str:
    done = subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, check=False
    )
    if check and done.returncode:
        raise Stop(f"git {' '.join(args)} failed:\n{done.stderr.strip()}")
    return done.stdout.strip()


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


def stage(version: str, tagged_on_origin: bool) -> str:
    """Where the release got to: "prepare" (a build: start), "publish" (the release
    version is committed but its tag is not on origin), or "released"."""
    if versioning.parse(version)[3] is not None:
        return "prepare"
    return "released" if tagged_on_origin else "publish"


def github_repo() -> str | None:
    """owner/name of origin on GitHub, for the links; None if it is elsewhere."""
    url = git("remote", "get-url", "origin", check=False)
    found = re.search(r"github\.com[:/](.+?)(?:\.git)?/?$", url)
    return found.group(1) if found else None


# -- the steps


def check_checkout(release_commit: str | None) -> None:
    """`release_commit`: a release prepared and committed here, not pushed yet (the one
    commit allowed ahead of origin)."""
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
    git("fetch", "--quiet", "--tags", "origin")
    ahead, behind = git(
        "rev-list", "--left-right", "--count", "HEAD...origin/main"
    ).split()
    if int(behind):
        raise Stop(f"origin/main has {behind} commits you don't: git pull first.")
    if (
        int(ahead) == 1
        and release_commit
        and git("log", "-1", "--format=%s") == (release_commit)
    ):
        good(f"one commit ahead of origin/main: {release_commit}, not pushed yet")
        return
    if int(ahead):
        raise Stop(
            f"You have {ahead} commits origin/main doesn't. Push them (git push origin "
            "main), let CI pass, then run this again."
        )
    good("level with origin/main")


def run_checks() -> None:
    step(2, "The checks CI runs")
    if not VENV.joinpath("python").exists():
        raise Stop("No .venv: run tools/setup first.")
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
    if git("ls-remote", "--tags", "origin", f"refs/tags/{release}"):
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
        if answer in "ey":
            editor = os.environ.get("VISUAL") or os.environ.get("EDITOR") or "nano"
            say(f"  {DIM}Opening {editor} (save and quit to come back here)…{OFF}")
            subprocess.run(
                [*editor.split(), str(ROOT / "app/CHANGELOG.md")], check=False
            )


def publish(release: str, committed: bool) -> None:
    step(4, f"Publish {release}")
    say(
        "  This will run:\n"
        + (
            ""
            if committed
            else f'    git commit -m "Release {release}" (the three files)\n'
        )
        + "    git push origin main\n"
        + f"    git tag {release}\n"
        + f"    git push origin {release}     <- starts the Release workflow on GitHub\n"
        "\n  After this the version is public. A mistake needs a new release; never move"
        "\n  or reuse a release tag."
    )
    if ask("Go ahead?", "ny") != "y":
        if committed:
            raise Stop("Stopped; run tools/release.py again to publish.")
        restore()
        raise Stop("Stopped: the release files put back, nothing committed.")
    if not committed:
        git("add", "--", *RELEASE_FILES)
        git("commit", "-q", "-m", f"Release {release}")
        good(f"committed: Release {release}")
    git("push", "--quiet", "origin", "main")
    good("pushed main")
    if not git("tag", "--list", release):
        git("tag", release)
    git("push", "--quiet", "origin", f"refs/tags/{release}")
    good(f"pushed the tag {release}")


def on_github(release: str) -> None:
    step(5, "On GitHub")
    repo = github_repo()
    if repo is None:
        warn("origin is not on GitHub: the Release workflow only runs there.")
        return
    owner = repo.split("/")[0]
    actions = f"https://github.com/{repo}/actions/workflows/release.yml"
    say(
        f"  The Release workflow for {release} is running: checks, images for amd64 and\n"
        f"  aarch64, then the GitHub release and the `stable` branch.\n    {actions}\n"
        "\n  The first release only: its images go up as private packages, so the"
        "\n  workflow's anonymous pull check fails. Then:"
        f"\n    a. Open https://github.com/{owner}?tab=packages"
        f"\n    b. For each of {repo.split('/')[1]}-amd64 and {repo.split('/')[1]}-aarch64:"
        "\n       Package settings → Danger Zone → Change visibility → Public."
        "\n    c. Back on the workflow run: Re-run failed jobs."
        "\n\n  When it has finished: the release is at"
        f"\n    https://github.com/{repo}/releases/tag/{release}"
        "\n  and installs and updates come from (in Home Assistant's App store)"
        f"\n    https://github.com/{repo}#stable"
        "\n  Keep your own box on its development URL: another repository URL is another"
        "\n  app (a new slug, none of its settings)."
    )
    if shutil.which("gh") and ask("Follow the workflow here with gh?", "yn") == "y":
        run = subprocess.run(
            [
                "gh",
                "run",
                "list",
                "--workflow",
                "release.yml",
                "--limit",
                "1",
                "--json",
                "databaseId",
                "--jq",
                ".[0].databaseId",
                "--repo",
                repo,
            ],
            capture_output=True,
            text=True,
        ).stdout.strip()
        if run:
            subprocess.run(["gh", "run", "watch", run, "--repo", repo, "--exit-status"])
        else:
            warn("gh found no Release run yet; open the link above.")
    say(
        "\n  Then carry on as usual: the next change starts the next release's builds"
        "\n  (tools/versioning.py bump, Rule Zero)."
    )


def main() -> int:
    say(f"{BOLD}Casa Mia release{OFF} {DIM}(Ctrl-C at any prompt stops safely){OFF}")
    try:
        version = versioning.current()
        check_checkout(f"Release {version}")
        tagged = bool(git("ls-remote", "--tags", "origin", f"refs/tags/{version}"))
        where = stage(version, tagged)
        if where == "released":
            say(f"\n  {version} is already released (its tag is on origin).")
            on_github(version)
            return 0
        if where == "publish":
            warn(f"{version} is prepared and committed but not published: carrying on.")
            publish(version, committed=True)
        else:
            run_checks()
            release = prepare(version)
            publish(release, committed=False)
            version = release
        on_github(version)
        return 0
    except Stop as stop:
        say(f"\n  {RED}■{OFF} {stop}")
        return 1
    except KeyboardInterrupt:
        say(f"\n  {RED}■{OFF} Stopped.")
        if versioning.parse(versioning.current())[3] is None and git(
            "status", "--porcelain", "--", *RELEASE_FILES
        ):
            restore()
            say("  The release files were put back.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
