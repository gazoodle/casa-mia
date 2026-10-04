# Releases and CI

Public versions are `YYYY.MM.REL`, with a two-digit month and a release number starting at 1 (for example `2026.10.1`). Development builds append `-b<n>`.

## Checks

CI runs Ruff lint and formatting, Pyright, pytest, the locked npm/TypeScript/Vite build, and native container builds on amd64 and arm64 GitHub runners. Checks run independently so existing failures remain visible. Pyright covers the app, tools and tests; integration typing and real Home Assistant tests need a separate environment using the supported Core Python version.

The release image uses `app/Dockerfile.release` with the repository root as its context. It packages the checked-out app, committed web assets and bundled integrations together, without cloning a moving branch. The existing `app/Dockerfile` remains the local fake-git-host build path.

## Prepare the first release

After the release-prep PR is reviewed and merged, fix any existing failing checks separately before publishing. There are currently no published releases.

```sh
tools/setup
.venv/bin/python tools/versioning.py release
git diff -- pyproject.toml app/config.yaml app/CHANGELOG.md
git add pyproject.toml app/config.yaml app/CHANGELOG.md
git commit -m "Prepare release 2026.10.1"
git push origin main
git tag 2026.10.1
git push origin 2026.10.1
```

Use the version printed by the release command, rather than copying the example if the development version has changed. Release preparation removes the trailing development suffix and coalesces development changelog sections; it does not increment the release number or move it to another month.

The tagged workflow validates versions and nonempty notes, reruns all checks against that source commit, and builds/publishes:

- `ghcr.io/gazoodle/casa-mia-amd64:<version>`
- `ghcr.io/gazoodle/casa-mia-aarch64:<version>`

Each image records its source commit and version in OCI labels. Digest records are attached to the GitHub release along with `release-notes.md`, whose name must remain unchanged for installation counting.

## Repository setup

Enable GitHub Actions and allow workflows to write repository contents and packages. The workflow requests these permissions explicitly. No personal access token is required.

GHCR packages may be private when first created. After the first successful image push, set **both packages** to public in their package settings and retain the repository's Actions access. If the anonymous pull check fails because visibility is private, change visibility and rerun failed jobs. Publication of the GitHub release and stable manifest waits for successful anonymous pulls for both architectures. The Release workflow also offers a manual retry for an existing release tag.

Once CI check names appear in the PR, require workflow syntax and all Python, frontend and container checks in a ruleset for `main`. Branch protection and package visibility require repository administration settings; they are not configured by these workflow files.

Retain published versioned images and tags. Do not move release tags or republish an already released version with different source. Changes require a new release version.

## Stable installation

Add this repository URL in Home Assistant's app store:

```text
https://github.com/gazoodle/casa-mia#stable
```

The workflow creates/updates `stable` from the release source after all images are available, adding the Supervisor `image:` reference. Supervisor substitutes `{arch}` and pulls the app version's prebuilt image. Raspberry Pi and Home Assistant Blue do not need to rebuild it. The integration is bundled in the same image and delivered by the existing installer.

The normal repository branch remains the development source. Keep local development on the fake-git-host `#app-dev` URL, which continues to build locally.

Each release also gets a `stable-<version>` delivery tag containing the image manifest. For rollback, use a backup/restore or explicitly select the earlier `#stable-<version>` repository and reinstall that app version, preserving/restoring app data as appropriate. Supervisor may not offer a downgrade as a normal update. The raw source release tag alone does not contain the generated GHCR manifest.

Do not rerun an older release to roll back the shared `stable` branch. Keep rollback scoped to the device. Review release notes and test live-system recovery separately; CI does not change live Home Assistant configuration.
