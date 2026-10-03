# AGENTS.md

Read CLAUDE.md in full; it applies to every coding agent here.

**First rule, before any change from a clean repo: bump the version** (`.venv/bin/python tools/versioning.py bump`, then write the changelog lines under the `## <version>` heading it adds to `app/CHANGELOG.md`). See "RULE ZERO" in CLAUDE.md. Forgetting it means the HA Supervisor never offers the update.
