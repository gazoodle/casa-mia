@AGENTS.core.md

# CLAUDE.md

Casa Mia's rules for every coding agent. The shared core rules are in `AGENTS.core.md`
(generated; see its header), imported above. This file holds only what is specific to this
repo, and it wins where the two conflict. The RULE numbers are cited in code comments, so
keep them.

Read `HANDOVER.md` first (core: Write it down): where things stand, the modules' shapes and
the lessons learned. `docs/architecture.md` is the charter; `README.md` is the shop window;
the user docs are in `docs/`.

## The purpose, above every rule: a helpful home, not just a smart one

A home with things not working that nobody knows about is of no use. Nothing may fail
silently: not a device, not a stream, not a save, not Casa Mia itself (core: Nothing fails
silently). When something stops working, it says so on screen, with how long it has been
down, and where Sensor Watch and the log can see it.

## RULE MINUS ONE: no real private data in the repo. Ever.

**This repo is public.** Core: No real private data applies in full. Here it also covers
`swap.json`, `people.json`, the box's config, camera, room and tablet names, and guest slugs.

## RULE ZERO: bump the version FIRST

**Before any change** that touches `app/` or `integration/`, bump with
`.venv/bin/python tools/versioning.py bump` (2026.10.1-b3 → 2026.10.1-b4). It syncs
`app/config.yaml` and adds the `## <version>` heading to `app/CHANGELOG.md`; write that
version's lines under it (a test fails without them, and the Supervisor shows the file in
the update dialog). Bump only if HEAD already holds the current version
(`git show HEAD:pyproject.toml`): one build per deploy, not per edit. A changed component
then gets `tools/component_versions.py --update`. Claude and Codex both forget this
constantly.

Why: the Supervisor offers an update only when `version` in `app/config.yaml` changes.
Without a bump the update silently never appears, and you debug the wrong thing.

Safety net, not a licence: `tools/fake_git_host.py` spots a commit to `app/` or
`integration/` without a bump, bumps and commits it itself, and shouts. If that fires, you
failed this rule.

## RULE ONE: use tokensave to explore code

Core: Exploring code (tokensave). It was once ignored for a whole session (one tool call in
hundreds), hence the rule number.

## RULE TWO: the log records everything that happens

Core: Nothing fails silently (logging). The log is how problems are diagnosed with the owner
away from home. Here:

- The start banner is boxed, so each restart stands out.
- INFO records every call and text (who, the number and the message), each guest login and
  each tablet check.
- `server.py` logs every admin-page change and integration request (method, path, result) in
  one place; modules still log what the change meant.
- Never log the guest slugs or legacy QR ids; bodies are not logged for this reason.
- `casa_mia/log.py` sets Home Assistant's own format, at the `log_level` app option. Never
  call `logging.basicConfig` anywhere else.

## RULE THREE: keep files small; split before they sprawl

Core: Source hygiene, except that **the limit here is 800 lines**, enforced by
`tests/test_file_sizes.py` (its `OVER` list is empty; never add to it). Follow the
compositor package (`modules/compositor/`, layered). `set_compositor(monkeypatch, NAME,
value)` in `tests/conftest.py` patches a constant in every part of it.

Why: `compositor.py` grew to 3,600 lines (2026-10-10). Nobody could hold it in their head,
and every change risked a part nobody was looking at.

## RULE FOUR: push, never poll, without the owner's explicit approval

Core: Push, never poll. Here the app fires an event (`settings.CHANGED_EVENT`, or a module's
own event carrying the new values) and the integration acts on it at once. Inside HA, listen
to HA's own events and signals (state changes, `SIGNAL_CONFIG_ENTRY_CHANGED`), never a
timer. The 30 s `/health` poll stays as the liveness check and backstop only.

Why: in 2026.10.11 a guest's sign-in reached HA at once as an event, but the Logins sensor
that an Over layer waited on ignored it and updated up to 30 s later.

## RULE FIVE: safe by construction, not by catching failures

Core: Nothing fails silently (safe by construction). Here, "working" means a video frame was
actually presented or an answer was actually received. Copies of the other side's state
(the integration's copy of the app's records, the page's levels, a card's rows) are leases
too.

Why: in 2026.10.11 the Camera Commander showed "(live)" over a picture frozen for 50
minutes. "Live" was a flag set at the first frame and cleared only on a reported failure,
and the stream stalled without reporting one (`docs/never-silently-stuck.md`).

## Commands

`tools/setup` (re-runnable) creates `.venv` on Python 3.11, matching the HA base image.

- **Tests:** `.venv/bin/pytest -q` (8 workers; `-n 0` only for serial debugging). Fixture
  rules and timings are in `tests/README.md`: camera teardown through `stop_compositor`,
  HTTP servers through the `serve` fixture. `tokensave_affected` finds the files to run
  while iterating.
- **Lint, format, types:** `.venv/bin/ruff check .`, `.venv/bin/ruff format .`,
  `.venv/bin/pyright`. pyright excludes `integration/`: the `homeassistant` package needs
  Python 3.13, the venv is 3.11.
- **Branches:** work on `dev`, never commit to `main` (protected: pull requests with the 8
  CI checks, moved only by `tools/release.py`). "Push to GitHub" means `git push origin dev`.
- **Deploy:** commit with the version bumped and keep `.venv/bin/python
  tools/fake_git_host.py` running; the owner refreshes the App store and installs. It serves
  committed work only, on port 9419 (its URL ends `#app-dev`), and serves the latest GitHub
  release instead of HEAD when that is newer, so the box follows releases without a new
  repository URL, and holds no GitHub credentials.
- **Version:** one source, `pyproject.toml`. Releases are `YYYY.M.R` (month unpadded),
  builds `YYYY.M.R-bN`. The owner releases with `tools/release.py` (see
  `docs/releases.md`); never run it or tag unless asked. `release.yml` then builds the GHCR
  images and the GitHub release.
- **Breaking changes** (anything a user must act on after updating) go **first** in their
  version's changelog section, one line each: `- **Breaking:** what changed. What to do.`
  They lead the release notes.
- **Components** (`integration/custom_components/<domain>/`) each carry their **own**
  `manifest.json` version: the app version they last changed in, stamped by
  `tools/component_versions.py --update`, never by hand (a test fails on files changed
  since the lock).
  - The app pushes every bundled component into `/config/custom_components` on start; each
    raises its own restart Repair when its loaded version differs.
  - `restart_notice.py` and `repairs.py` are domain-agnostic; keep the copies identical
    (`tests/test_restart_notice.py`).
  - Three components: `casa_mia`, and its children `casa_mia_guest_login` and
    `casa_mia_commander`, sharing its coordinator (`casa_mia/children.py`). A child is for a
    module with many devices; a module with one device lives in `casa_mia` (as
    `casa_mia/sensor_watch/` does). `components.py` `RETIRED` removes an old component's
    folder.
- **Maturity:** each module's level lives once, in `app/src/casa_mia/maturity.json`;
  `tools/maturity.py --update` writes it into `app/translations/en.yaml` and the docs
  (`tests/test_maturity.py` checks).
- **Admin UI** (React, `app/web/`): `tools/build_web` builds it into
  `app/src/casa_mia/web/` (committed; `tests/test_web_build.py` fails on a stale build).
  `server.py` serves it on 8780 to HA's ingress gateway only. Live editing: `cd app/web &&
  npm run dev`.
- **Pills, chips and chrome:** one source each, never hand-rolled. Pills and chips:
  `app/web/src/pills.css` (global `cm-` classes, coloured by `--tone`), adopted by the cards
  through `integration/cards/src/pills.ts`. Chrome (buttons, dialogs, menus, selects,
  sliders, switches, callouts): `ui.module.css`, with `ui.tsx`, `controls.tsx` (Select,
  Slider) and `confirm.tsx` (confirmBox, askBox). The browser's `<select>`, `confirm()`,
  `prompt()` and `alert()` are banned (`tests/test_no_browser_controls.py`). The owner's
  cheatsheets, with an Id per style: `docs/design/pills-and-chips.html` and `chrome.html`.
- **Lovelace cards** (Lit, `integration/cards/`), one bundle: `tools/build_cards` builds
  `www/cm-cards.js` (committed). `tools/dev_cards` rebuilds into the box's copy
  (`/Volumes/config`) on every save; the next app start restores the committed build.
  - The layout engine exists twice (`compositor.commander_layout` and
    `integration/cards/src/layout.ts`); both must pass `tests/layout_cases.json`.
    Regenerate the cases from Python after a deliberate change.
  - Layout options live once, in `app/src/casa_mia/layout.json`; a new one goes there, and
    into both engines when it applies to both.
- **Branding:** finished PNGs are committed as they are (`app/icon.png`, `logo.png`, the
  integration's `brand/`); the masters are in `branding/`.
- **tokensave:** `../tablet-provision` can be queried with `graph_root`, read-only.

## Scope

Beyond the app and integration, the repo is to hold the FONA Arduino firmware, the ESPHome
generator, the tablet provisioner, the compositor host, the radio station Docker stack and
the KNX project: the seed of a deterministically built HA config, reproducible from the
sources here. Other projects (the author's and third-party ones such as
advanced-camera-card) are not modules of this repo: don't vendor them, and don't make them
depend on each other.

## Architecture (see docs/architecture.md)

- **App** (`app/src/casa_mia/`): long-running, I/O-heavy, network-facing work, and anything
  that must survive a Core restart. One package per module under `modules/`.
- **Integration** (`integration/custom_components/casa_mia/`): config flow, entities,
  services, events and Repairs, and whatever works on HA's own state, registries and events,
  with the data it uses all the time stored there. The two talk over a small local API and
  HA's websocket, pushing changes, and each checks the other's version.
- **Each piece of work goes where it fits best** (owner, 2026-10-21). The integration is
  not kept thin for its own sake. Why: that rule kept Sensor Watch's records in the app, and
  the integration had to copy them by a chain of pulls.
- **Module contract:** `start()`, `stop()`, `health()`; one module failing never stops the
  others.

## Constraints to respect

- **FONA** (house access by phone when the internet is down) is mission-critical: it
  reconnects with backoff, tolerates the Arduino resetting when the port opens, and uses
  the by-id serial path, never `ttyACM0`. Past failure: the read loop died silently after
  the port moved, and the sensors went stale.
- Keep app backup data small: no caches or model files in app data.
- **No staging:** deploys go straight to the live box. Rollback means deploying the previous
  tag. To replace something live, leave the old one installed and switched off until the
  new one is proven.
- **Trap:** since HA OS 17, editing files and clicking Rebuild can leave old layers running.
  Bump and go through the update path instead.
- Don't touch the live HA config without the owner's agreement.
