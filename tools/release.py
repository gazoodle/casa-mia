#!/usr/bin/env python3
"""Make a release, step by step: `tools/release.py`, run on your working branch (dev).

A walk through the whole process, the same every time, for whoever runs it (on this repo or
a fork). It checks, prepares and shows; nothing is published until you say yes, and it can
be stopped at any prompt and run again: it works out where it got to from the versions on
your branch and on origin/main, and the tags on origin.

Work is done on a working branch (dev) and served to the boxes from there by the fake git
host; `main` moves only at a release, through a pull request with the checks passing (a
repository ruleset). The release rides on the working branch into that pull request:

  1. The checkout: on the working branch (not main), nothing uncommitted, holding
     everything main has.
  2. The checks CI runs: ruff, pyright, pytest (the web build and component versions too).
  3. Prepare: `tools/versioning.py release` (2026.10.1-b30 -> 2026.10.1, the builds'
     changelog sections merged into one), then you review the release notes, editing them
     if you like; then "Release <version>" is committed on the branch. Abort puts
     everything back.
  4. Pull request, after your OK: the branch pushed and a pull request into main opened
     (or the open one updated); then it waits for the checks. Nothing is published yet.
  5. Publish, after your OK: merge the pull request (the branch is kept), tag the merged
     commit with the version and push the tag, which starts the Release workflow; then
     the branch is brought up to main (a fast-forward: it is already in the merge).
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
import time
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


def is_build(version: str) -> bool:
    return versioning.parse(version)[3] is not None


def stage(
    branch_version: str, main_version: str, branch_tagged: bool, main_tagged: bool
) -> str:
    """Where the release got to, from the working branch's version, origin/main's, and
    whether each has its tag on origin: "tag" (main holds a release not tagged yet),
    "prepare" (start), "pull request" (prepared on the branch, not merged yet) or
    "released"."""
    if not is_build(main_version) and not main_tagged:
        return "tag"
    if is_build(branch_version):
        return "prepare"
    return "released" if branch_tagged else "pull request"


def github_repo() -> str | None:
    """owner/name of origin on GitHub; None if it is elsewhere."""
    url = git("config", "remote.origin.url", check=False)  # as set, not rewritten
    found = re.search(r"github\.com[:/](.+?)(?:\.git)?/?$", url)
    return found.group(1) if found else None


def version_at(ref: str) -> str:
    match = versioning.PYPROJECT_RE.search(git("show", f"{ref}:pyproject.toml"))
    if not match:
        raise Stop(f"{ref}'s pyproject.toml has no version.")
    return match.group(1)


def tagged_on_origin(version: str) -> bool:
    return bool(git("ls-remote", "--tags", "origin", f"refs/tags/{version}"))


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


def check_checkout() -> str:
    """The working branch, checked: not main, nothing uncommitted, not behind its copy on
    origin, and holding everything main has."""
    step(1, "The checkout")
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    if branch in ("main", "HEAD"):
        raise Stop(
            "Run this on your working branch (git switch dev): main moves only through "
            "the release's pull request."
        )
    good(f"on {branch}")
    if dirty := git("status", "--porcelain"):
        raise Stop(
            "There are uncommitted changes; commit or stash them first:\n" + dirty
        )
    good("nothing uncommitted")
    if git("rev-parse", "--verify", "--quiet", f"origin/{branch}", check=False):
        behind = git("rev-list", "--count", f"HEAD..origin/{branch}")
        if int(behind):
            raise Stop(
                f"origin/{branch} has {behind} commits you don't: git pull first."
            )
    holds_main = subprocess.run(
        ["git", "merge-base", "--is-ancestor", "origin/main", "HEAD"], cwd=ROOT
    )
    if holds_main.returncode:
        raise Stop(
            f"origin/main has commits {branch} doesn't: git merge origin/main, then run "
            "this again."
        )
    good(f"{branch} holds everything on origin/main")
    return branch


def run_checks() -> None:
    step(2, "The checks CI runs")
    for name, command in CHECKS:
        say(f"  {DIM}{name}…{OFF}")
        done = subprocess.run(
            [str(c) for c in command], cwd=ROOT, capture_output=True, text=True
        )
        if done.returncode:
            say((done.stdout + done.stderr).strip()[-3000:])
            raise Stop(f"{name} failed: fix it first (nothing was changed).")
        good(name)


def restore() -> None:
    git("checkout", "--", *RELEASE_FILES)


def prepare(version: str) -> str:
    """The release prepared, reviewed and committed on the working branch."""
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
    git("add", "--", *RELEASE_FILES)
    git("commit", "-q", "-m", f"Release {release}")
    good(f"committed Release {release} (here only; undo with git reset --hard HEAD~1)")
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
        # nano when there is one (friendlier than a vi from $EDITOR); CM_EDITOR wins
        editor = (
            os.environ.get("CM_EDITOR")
            or ("nano" if shutil.which("nano") else None)
            or os.environ.get("VISUAL")
            or os.environ.get("EDITOR")
            or "vi"
        )
        say(f"  {DIM}Opening {editor} (save and quit to come back here){OFF}")
        subprocess.run([*editor.split(), str(ROOT / "app/CHANGELOG.md")], check=False)


def checks(number: str, repo: str) -> list[tuple[str, str]]:
    """A pull request's required checks: (name, bucket), the bucket being pass, fail,
    pending, skipping or cancel."""
    out = run(
        "gh", "pr", "checks", number, "--repo", repo, "--required",
        "--json", "name,bucket", "--jq", '.[] | .name + "\\t" + .bucket',
        check=False,
    )  # fmt: skip
    return [tuple(line.split("\t", 1)) for line in out.splitlines() if "\t" in line]  # type: ignore[misc]


def pull_request(branch: str, release: str, repo: str) -> str:
    """Push the branch, open its pull request into main (or use the open one), and wait
    for the checks. Returns the pull request's number."""
    step(4, "Pull request")
    say(
        "  This will run:\n"
        f"    git push origin {branch}\n"
        f"    gh pr create --base main --head {branch}   (unless one is open)\n"
        "  then wait for the checks. Nothing is published yet."
    )
    if ask("Push and open the pull request?", "ny") != "y":
        raise Stop(
            "Stopped; the release is committed here only. Run this again to carry on, "
            "or undo it with git reset --hard HEAD~1."
        )
    git("push", "-q", "origin", f"{branch}:refs/heads/{branch}")
    good(f"pushed {branch}")
    number = run(
        "gh", "pr", "list", "--repo", repo, "--head", branch, "--base", "main",
        "--state", "open", "--json", "number", "--jq", ".[0].number",
    )  # fmt: skip
    if number:
        run(
            "gh", "pr", "edit", number, "--repo", repo,
            "--title", f"Release {release}",
            "--body", versioning.notes(git("show", "HEAD:app/CHANGELOG.md"), release),
        )  # fmt: skip
        good(f"pull request #{number} updated: Release {release}")
    else:
        url = run(
            "gh", "pr", "create", "--repo", repo, "--base", "main", "--head", branch,
            "--title", f"Release {release}",
            "--body", versioning.notes(git("show", "HEAD:app/CHANGELOG.md"), release),
        )  # fmt: skip
        number = url.rstrip("/").rsplit("/", 1)[1]
        good(f"pull request #{number}: {url}")
    say(
        f"  {DIM}Waiting for its checks (a few minutes; Ctrl-C stops waiting, not them){OFF}"
    )
    for _ in range(36):  # a just-opened pull request has no checks for a moment
        if checks(number, repo):
            break
        time.sleep(5)
    subprocess.run(
        ["gh", "pr", "checks", number, "--repo", repo, "--watch", "--required"],
        cwd=ROOT,
    )
    # gh's exit code also means "none yet" or "still running": go by what they say
    found = checks(number, repo)
    failed = [name for name, bucket in found if bucket in ("fail", "cancel")]
    if failed:
        raise Stop(
            f"On #{number}, {', '.join(failed)} failed. Fix it on {branch} (commit, "
            "nothing more), then run this again: it pushes the fix and waits again."
        )
    if not found or any(bucket == "pending" for _, bucket in found):
        raise Stop(f"#{number}'s checks have not finished: run this again to wait on.")
    good("the checks passed")
    return number


def publish(branch: str, release: str, number: str | None, repo: str) -> None:
    step(5, f"Publish {release}")
    say(
        "  This will run:\n"
        + (f"    gh pr merge {number} --merge   ({branch} is kept)\n" if number else "")
        + f"    git tag {release} origin/main   (the merged commit)\n"
        + f"    git push origin {release}     <- starts the Release workflow on GitHub\n"
        + f"    git merge --ff-only origin/main   (on {branch}), git push\n"
        "\n  After this the version is public. A mistake needs a new release; never move"
        "\n  or reuse a release tag."
    )
    if ask("Go ahead?", "ny") != "y":
        raise Stop("Stopped; run tools/release.py again to carry on from here.")
    if number:
        run("gh", "pr", "merge", number, "--repo", repo, "--merge")
        good(f"merged #{number}")
    git("fetch", "-q", "origin", "main")
    if version_at("origin/main") != release:
        raise Stop(
            f"origin/main is not at {release} after the merge: look before tagging."
        )
    if not git("tag", "--list", release):
        git("tag", release, "origin/main")
    git("push", "-q", "origin", f"refs/tags/{release}")
    good(f"tagged origin/main {release} and pushed the tag")
    git("merge", "-q", "--ff-only", "origin/main")
    git("push", "-q", "origin", f"{branch}:refs/heads/{branch}")
    good(f"{branch} brought up to main and pushed")


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
        "\n  Then carry on as usual on your branch: the next change starts the next"
        "\n  release's builds (tools/versioning.py bump, Rule Zero)."
    )


def main() -> int:
    say(f"{BOLD}Release{OFF} {DIM}(Ctrl-C at any prompt stops safely){OFF}")
    try:
        repo = check_tools()
        git("fetch", "-q", "--tags", "--prune", "origin")
        branch = check_checkout()
        version = versioning.current()
        main_version = version_at("origin/main")
        where = stage(
            version,
            main_version,
            tagged_on_origin(version),
            tagged_on_origin(main_version),
        )
        if where == "released":
            say(f"\n  {version} is already released (its tag is on origin).")
        elif where == "tag":
            version = main_version
            warn(f"origin/main is at {version}, merged but not tagged: carrying on.")
            publish(branch, version, None, repo)
        else:
            if where == "prepare":
                run_checks()
                version = prepare(version)
            else:
                warn(f"Release {version} is prepared on {branch}: carrying on.")
            number = pull_request(branch, version, repo)
            publish(branch, version, number, repo)
        on_github(version, repo)
        return 0
    except Stop as stop:
        say(f"\n  {RED}■{OFF} {stop}")
        return 1
    except KeyboardInterrupt:
        say(f"\n  {RED}■{OFF} Stopped.")
        if git("status", "--porcelain", "--", *RELEASE_FILES, check=False):
            restore()
            say("  The release files were put back.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
