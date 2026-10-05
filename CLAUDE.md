# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RULE MINUS ONE: NO REAL PRIVATE DATA IN THE REPO. EVER.

**This repo is public.** Nothing that came from the owner's real life may be committed: not in code, comments, docstrings, tests, fixtures, `app/CHANGELOG.md`, docs, or **commit messages**. That means real people's names, phone numbers, the house's name, addresses and IPs, camera and room names, tablet names, guest slugs, tokens, serials, anything in `swap.json`, `people.json` or the box's config. **A real example the owner typed in chat is still real.**

Use invented examples only: Ofcom's drama numbers (`07700 900000`–`07700 900999`), made-up names ("Ann", "Annex"), made-up places ("Oak Tree", "Barn").

**The check, before every commit, no exceptions:** read the staged diff *and* the commit message, and ask of each name, number and place: did I invent this, or did it come from the owner's data? If in doubt, replace it. If something real ever reaches GitHub, say so at once; the fix is a history rewrite and a force-push, with the owner's go-ahead.

Why: in 2026.10.2 Claude put the owner's real mobile number into a test and a family member's name into the changelog, a docstring and a commit message, and pushed them. Phone numbers in public repos get scraped for spam. It took a history rewrite to get them out.

## RULE ZERO: bump the version FIRST

From a clean repo, **before making any change** that touches `app/` or `integration/`, bump the version: `.venv/bin/python tools/versioning.py bump` (2026.10.1-b3 → 2026.10.1-b4; it also syncs `app/config.yaml` and adds the `## <version>` heading at the top of `app/CHANGELOG.md`), then write that version's changelog lines under it (a test fails without the heading; the Supervisor shows that file in the update dialog). Bump only if HEAD already holds the current version (`git show HEAD:pyproject.toml`): one build number per deploy, not per edit. (A changed component then gets `tools/component_versions.py --update`; see Commands.) Do this before reading further, before editing, every time. Claude and Codex both forget this constantly.

Why: the Supervisor offers an update only when `version` in `app/config.yaml` changes. No bump means the update silently never appears, and you lose time debugging the wrong thing.

Safety net, not a licence: `tools/fake_git_host.py` notices a commit that changed `app/` or `integration/` without a bump, bumps the build number itself, commits it as `fake_git_host.py`, and shouts (banner, bell, macOS notification). If that fires, you failed this rule.

## RULE ONE: use tokensave to explore code, not grep/cat/sed

Before you read or search any code in this repo, use the tokensave tools. This is a rule, not a suggestion, and it was ignored for a whole session (1 tool call in hundreds). Concretely:

- **Finding or understanding code:** `tokensave_context` (plain-English question), `tokensave_search` (a symbol name), `tokensave_callers` / `tokensave_callees` / `tokensave_impact` (who uses it, what breaks), `tokensave_files` (layout). Not `grep`, `rg`, `find`, `ls -R`, or `cat` through Bash.
- **Reading a file you won't edit:** `tokensave_read` (`mode: "map"` for its symbols, `"lines"` for a slice). The harness `Read` is only for a file you are about to edit (the Edit tool requires it).
- **The tools are deferred in this harness:** their schemas are not loaded at session start, so a call fails until you load them. First thing in a session, run `ToolSearch` with `select:mcp__tokensave__tokensave_context,mcp__tokensave__tokensave_search,mcp__tokensave__tokensave_read,mcp__tokensave__tokensave_files,mcp__tokensave__tokensave_callers,mcp__tokensave__tokensave_impact,mcp__tokensave__tokensave_status`. Do not skip tokensave because "the tool isn't available": load it.
- **Freshness:** call `tokensave_status` at the start; after any edit run `tokensave sync` (about 50 ms) before querying again.
- **Fine to use Bash for:** running tests, linters, git, `sed`/`python` to make an edit, and non-code files (docs, YAML manifests, config). Anything about what the code does goes through tokensave first.
- Never launch an Explore (or any) agent for code research here.

## RULE TWO: the log records everything that happens

The app's log is how problems are diagnosed, often remotely (the owner away from home). A silent log is useless. Every module must log, without being asked:

- **INFO, every activity:** start and stop (the start banner is boxed so each restart stands out), config changes (what was saved, by the admin page or the integration), actions taken on the live system (a text sent, an endpoint opened, a download started, a file pruned), and every event in or out (each call and text with who, the number and the message; each guest login; each tablet check).
- **DEBUG, raw traffic:** serial lines, protocol chatter, HTTP polls; anything that would flood INFO.
- **WARNING / ERROR, problems:** refusals and intrusions, failures, retries, lost connections, with the reason.
- `server.py` logs every admin-page change and integration request (method, path, result) in one place; modules still log what the change meant.
- **Never log secrets:** passwords, tokens, the guest slugs and legacy QR ids. Bodies are not logged for this reason.
- Use `logging.getLogger(__name__)`, never `print` (see Commands).

## Status

Skeleton stage: README.md is the charter; the app skeleton, tooling and fake git host exist, no modules yet. Existing code to learn from lives elsewhere (the earlier `fona_sms` component, an earlier app's `ingress.py`, the composite-test server); read it rather than rewriting from memory.

Planned but unscheduled work lives in `BACKLOG.md`; add ideas there, do not start them unasked.

## Commands

Always use the venv, never system python: `tools/setup` (re-runnable) creates `.venv` on Python 3.11 (matches the HA base image).

- Tests: `.venv/bin/pytest`. **The whole suite must run in under 15 seconds** (it runs about 6 s; it was 51 s). It is therefore the default after any change, and a test or fixture that pushes it past 15 s is fixed, not tolerated. No real sleeps for waiting (patch the interval, e.g. a module's `INTERVAL`/`LINGER`, or write the state the test needs directly); servers go through the `serve` fixture in `tests/conftest.py` (which also makes `serve_forever` poll every 10 ms: the default 0.5 s made every `shutdown()` cost half a second); set a shared fixture up once instead of repeating the setup per test. Check with `pytest --durations=10`. While iterating you may run just the affected file(s) (`tokensave_affected` finds them), but run the full suite before committing.
- Lint/format: `.venv/bin/ruff check .` and `.venv/bin/ruff format .`
- Types: `.venv/bin/pyright`
- Branches: work on `dev`; never commit to `main`. `main` is protected (pull requests only, the 8 CI checks required) and moves only at a release, through `tools/release.py`. "Push to GitHub" means `git push origin dev`.
- Serve the checkout to the HA box: `.venv/bin/python tools/fake_git_host.py`, then add the printed URL (ends `#app-dev`) in Settings → Apps → App store → Repositories. Only committed work is served. It listens on port 9419 (one above git's 9418, so another fake git host can run alongside). It also checks GitHub every 10 minutes and serves the latest published release (tag `YYYY.M.R`) instead of HEAD when that is newer, so the box follows releases without its repository URL (and so the app's slug) ever changing.
- Deploy: commit, keep `tools/fake_git_host.py` running, then `tools/deploy` (SSH to the box: `ha store reload`, `ha apps update 4e358812_casa_mia`, log tail). `CM_HA_SSH` overrides the login, `CM_APP_SLUG` the app's slug (its hash comes from the repository URL in the App store, so it changes if that URL does).
- Branding: finished PNGs, committed as they are (nothing renders them): `app/icon.png` and `logo.png`, and the integration's `brand/` (`icon`, `logo`, `dark_logo`, each with `@2x`; no `dark_icon`, as the icon works on dark). The large masters are in `branding/` for making new sizes.
- Components (`integration/custom_components/<domain>/`) each carry their **own** `manifest.json` version: the app version they last changed in, stamped by `.venv/bin/python tools/component_versions.py --update` (never edit it by hand). Run it after changing a component's files (after the app bump); a test fails on files changed since the lock. The app pushes every bundled component into `/config/custom_components` on start; each component's `restart_notice.py` raises its own restart Repair only when its loaded version differs from the installed one. `restart_notice.py` and `repairs.py` are domain-agnostic; keep copies identical across components.
- pyright excludes `integration/`: the `homeassistant` package needs Python 3.13+, our venv is 3.11 (matches the app image). Revisit (a second venv, or trixie base) when integration tests need real HA.
- Logging: use `logging.getLogger(__name__)`, never `print`. `casa_mia/log.py` configures Home Assistant's own format (`2026-10-01 16:42:28.675 INFO (MainThread) [logger.name] message`, copied from Core's `bootstrap.py`); the `log_level` app option sets the level. Do not call `logging.basicConfig` elsewhere.
- Admin UI (React, `app/web/`): `tools/build_web` builds it into `app/src/casa_mia/web/` (committed; the image needs no Node) and stamps its source hash; `tests/test_web_build.py` fails on a stale build. Served by `server.py` on 8780 to HA's ingress gateway only (`/health` stays open to the integration). `cd app/web && npm run dev` for live editing against an app on 8780.
- Version: one source, `pyproject.toml`, in Home Assistant's style. Releases are `YYYY.M.R` (month unpadded, as HA's own); private builds are `YYYY.M.R-bN`. `tools/versioning.py bump` makes the next build; Releases are made by the user with `tools/release.py`, a deterministic walkthrough (run on `dev`: checks, `tools/versioning.py release`, notes review, a pull request from `dev` into `main`, then merge, tag and push on their OK; see docs/releases.md); never run it or tag a release yourself unless asked. `.github/workflows/release.yml` then builds the GHCR images, makes the GitHub release and updates `stable`. `tools/sync_app_version.py` copies the version into `app/config.yaml` (a test fails if they differ).

## Token economy (tokensave)

This repo is indexed by tokensave (`.tokensave/`, gitignored). RULE ONE above is the rule; the details:

- Explore with `tokensave_context`, `tokensave_search`, `tokensave_callers`/`callees`/`impact`, `tokensave_node`. Read non-edit files with `tokensave_read` (`mode: "map"` or `"lines"` for slices). Use the harness Read only on files about to be edited.
- Never launch an Explore (or any) agent for code research here; the tokensave tools answer it.
- Check `tokensave_status` for staleness before relying on the graph, and run `tokensave sync` after editing (it takes about 50 ms).
- Branch note: if status shows `[fallback]` for a new branch, run `tokensave branch add <name>`. The index is disposable (gitignored): `rm -rf .tokensave && tokensave init` rebuilds it in under a second, then reconnect the MCP server (`/mcp`).
- Other indexed projects can be queried with `graph_root`, e.g. `../tablet-provision` (absolute path; read-only reference).
- Non-code work (docs, YAML manifests, web research) uses normal tools.

## Scope

Beyond the app and integration, the repo also holds: FONA Arduino firmware, the ESPHome generator (Python, deterministic YAML for all Shelly/ESP devices), the tablet provisioner, the camera compositor and host, the local radio station Docker stack (currently on the NAS, may move to HA), and the KNX project (consumed and controlled, increasingly automated). Together this is the seed of a deterministically built HA config: generated output must be reproducible from sources here.

**Scope exclusion:** other projects (the author's other public projects, and third-party ones such as advanced-camera-card) are not modules of this repo. Do not vendor them wholesale or make this repo and them depend on each other.

**Copying is fine from the author's own projects** (tablet-provision and the others): the same author wrote them, so lift any code, CSS or patterns that fit, adapted to this repo. advanced-camera-card is third-party: respect its licence.

## Architecture (proposed, see README.md)

One repo, one version, two deliverables released together:
- **App** (HA add-on, `app/src/casa_mia/`): long-running, I/O-heavy, network-facing work, anything that must survive a Core restart. Holds `core/` (config, logging, health, ingress/token gate, supervisor client) and `modules/{fona,gitproxy,compositor}/` (the alarm panel is integration-only).
- **Integration** (`integration/custom_components/casa_mia/`, domain `casa_mia` tentative): thin. Config flow, entities, services, events, Repairs only. Talks to the app over a small versioned local API; each checks the other's version at runtime and surfaces a mismatch as a Repair.
- Module contract (draft): `start()`, `stop()`, `health()`, config schema, registers its own entities/routes. One module failing must not stop the others.
- The app is intended to install the integration into `/config/custom_components` on start and request a Core reload (single delivery path, still to be confirmed).

## Constraints to respect

- FONA (GSM/SMS house access when internet is down) is mission-critical: it lives in the app, reconnects with backoff, tolerates the Arduino resetting on port open, and must use the by-id serial path, never `ttyACM0`. Past failure: read loop died silently after the port moved, sensors went stale.
- Keep app backup data small: no caches or model files in app data.
- Deployment is via a fake git host serving the working tree (no GitHub credentials on the HA box). There is no staging: deploy straight to the live box (`homeassistant.local:8123`). Cut-over from an old integration (FONA first): leave the old one installed, stop it to test the new module, switch the new module off with its flag and restore the old one if incomplete, retire the old one only when the new is proven. Rollback = deploy the previous tag.
- Trap: since HA OS 17, editing files and clicking Rebuild can leave old layers running; bump the version through the update path instead.
- Do not touch live HA config without the user's agreement. (The old `fona_sms` integration is deleted for good; FONA is the app's `fona` module.)
- Planned testing: pytest with fakes (including a mock serial device that can reset/vanish/reappear) and `pytest-homeassistant-custom-component`; plus a manual fire-drill checklist in README.md.
