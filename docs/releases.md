# Releases and CI

Public versions are `YYYY.M.R`, the month unpadded as Home Assistant's own and a release number starting at 1 (for example `2026.10.1`, `2027.1.1`). Development builds append `-b<n>`.

## Checks

CI runs Ruff lint and formatting, Pyright, pytest, the locked npm/TypeScript/Vite build, and native container builds on amd64 and arm64 GitHub runners. Checks run independently so existing failures remain visible. Pyright covers the app, tools and tests; integration typing and real Home Assistant tests need a separate environment using the supported Core Python version.

The release image uses `app/Dockerfile.release` with the repository root as its context. It packages the checked-out app, committed web assets and bundled integrations together, without cloning a moving branch. The existing `app/Dockerfile` remains the local fake-git-host build path.

## Day to day: the `dev` branch

`main` takes changes only through pull requests with the required checks passing (a repository ruleset), and it moves only at a release. Day-to-day work happens on `dev`:

- Commit to `dev`. `tools/fake_git_host.py` serves whatever is checked out, so your own boxes (and any test systems) follow `dev` through the `#app-dev` URL.
- Push `dev` to GitHub whenever you like (`git push origin dev`): a backup, and CI runs on it.
- Never commit to `main` itself.

## Make a release

On `dev`, run the walkthrough and follow its prompts:

```sh
tools/setup              # once, or after dependencies change
gh auth login            # once: the GitHub CLI, https://cli.github.com
git switch dev
tools/release.py
```

It does the same steps every time, on this repository or a fork, and publishes nothing until you say yes:

1. **The checkout:** on the working branch (not `main`), nothing uncommitted, not behind its copy on `origin`, and holding everything `origin/main` has.
2. **The checks CI runs:** Ruff lint and formatting, Pyright, pytest (which also checks the web build and the component versions).
3. **Prepare:** `tools/versioning.py release` drops the `-bN` (2026.10.1-b30 becomes 2026.10.1) and merges every build's changelog section since the last release into one. If the month has moved on since the builds began, the release is that month's first (builds of 2026.10.2 released in November become 2026.11.1). It then shows the release notes for review: they are the GitHub release's text and what the Supervisor shows in its update dialog, so keep what someone installing or updating needs and drop build-to-build detail. Edit them there (it opens `$EDITOR`), or abort, which puts everything back. Accepting them commits `Release <version>` on `dev` (only there; your boxes see the release version through the fake git host).
4. **Pull request, after your first OK:** pushes `dev` and opens the pull request from `dev` into `main` (or updates the open one), with the notes as its description, then waits for the required checks. Nothing is published yet.
5. **Publish, after your second OK:** merges the pull request (keeping `dev`), tags the merged commit with the version, pushes the tag, which starts the Release workflow, and brings `dev` up to `main`. That is a fast-forward, as `dev` is already inside the merge: no rebase, `dev`'s commits never change. From here the version is public, and the next bump on `dev` starts the next release's builds.
6. **On GitHub:** links to the workflow run, the first release's package step (below), and the release and `stable` URLs, and it can follow the run in the terminal.

Stop at any prompt (or Ctrl-C) and run it again: it works out where it got to from the versions on `dev` and `origin/main` and the tags on `origin`, and carries on. If a check fails on the pull request, commit the fix on `dev` and run it again: it pushes and waits again. To give up before publishing, close the pull request and undo the release commit on `dev` (`git reset --hard HEAD~1`).

The tagged workflow validates versions and nonempty notes, reruns all checks against that source commit, and builds/publishes:

- `ghcr.io/<owner>/<repo>-amd64:<version>`
- `ghcr.io/<owner>/<repo>-aarch64:<version>`

named after the repository the workflow runs in (lower case), so a fork publishes its own images and its `stable` branch points at them.

Each image records its source commit and version in OCI labels. Digest records are attached to the GitHub release along with `release-notes.md`, whose name must remain unchanged for installation counting.

## Repository setup

Enable GitHub Actions and allow workflows to write repository contents and packages (Settings → Actions → General → Workflow permissions: **Read and write**; a stricter repository setting overrides what the workflow asks for, and the `stable` push fails). The workflow requests these permissions explicitly. No personal access token is required.

GHCR packages may be private when first created. After the first successful image push, set **both packages** to public in their package settings and retain the repository's Actions access: open `https://github.com/<owner>?tab=packages`, then for each package Package settings → Danger Zone → Change visibility → Public. If the anonymous pull check fails because visibility is private, change visibility and choose **Re-run failed jobs** on the workflow run. Publication of the GitHub release and stable manifest waits for successful anonymous pulls for both architectures. The Release workflow also offers a manual retry for an existing release tag.

Once CI check names appear in the PR, require workflow syntax and all Python, frontend and container checks in a ruleset for `main`. Branch protection and package visibility require repository administration settings; they are not configured by these workflow files.

Retain published versioned images and tags. Do not move release tags or republish an already released version with different source. Changes require a new release version.

## Stable installation

Add this repository URL in Home Assistant's app store:

```text
https://github.com/gazoodle/casa-mia#stable
```

The workflow creates/updates `stable` from the release source after all images are available, adding the Supervisor `image:` reference. Supervisor substitutes `{arch}` and pulls the app version's prebuilt image. Raspberry Pi and Home Assistant Blue do not need to rebuild it. The integration is bundled in the same image and delivered by the existing installer.

The normal repository branch remains the development source. Keep local development on the fake-git-host `#app-dev` URL, which continues to build locally (and follows published releases). Don't move a box between repository URLs: the app's slug comes from the URL, so another URL is another app, installed afresh with none of the old one's settings.

Each release also gets a `stable-<version>` delivery tag containing the image manifest. For rollback, use a backup/restore or explicitly select the earlier `#stable-<version>` repository and reinstall that app version, preserving/restoring app data as appropriate. Supervisor may not offer a downgrade as a normal update. The raw source release tag alone does not contain the generated GHCR manifest.

Do not rerun an older release to roll back the shared `stable` branch. Keep rollback scoped to the device. Review release notes and test live-system recovery separately; CI does not change live Home Assistant configuration.
