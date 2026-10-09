# AGENTS.md

Read CLAUDE.md in full; it applies to every coding agent here.

**Test settings shared by Claude and Codex:** `.venv/bin/pytest -q` runs the full suite with 8 workers by default (`pyproject.toml`). Keep that default; use `-n 0` only for serial debugging. No slow tests are excluded. See `tests/README.md` for the measurements and fixture rules. Run the full suite before committing, and commit only when the owner asks.

**First rule, before any change from a clean repo: bump the version** (`.venv/bin/python tools/versioning.py bump`, then write the changelog lines under the `## <version>` heading it adds to `app/CHANGELOG.md`). See "RULE ZERO" in CLAUDE.md. Forgetting it means the HA Supervisor never offers the update.
