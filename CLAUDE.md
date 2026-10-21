@AGENTS.core.md

# CLAUDE.md

Casa Mia's rules for every coding agent. The shared core rules are in `AGENTS.core.md`
(generated; see its header), imported above. This file holds only what is specific to this repo, and it wins where the two
conflict. The RULE numbers are cited in code comments, so keep them.

Read `HANDOVER.md` first (core: Write it down). It covers the camera modules and the lessons
learned so far.

## The purpose, above every rule: a helpful home, not just a smart one

Casa Mia is for building a home that is **helpful**, not just smart. A home with things not
working that nobody knows about is of no use. Nothing may fail silently: not a device, not a
stream, not a save, not Casa Mia itself (core: Nothing fails silently). When something stops
working, it says so on screen, with how long it has been down, and where Sensor Watch and
the log can see it.

## RULE MINUS ONE: no real private data in the repo. Ever.

**This repo is public.** Core: No real private data applies in full. Here it also covers
`swap.json`, `people.json`, the box's config, camera, room and tablet names, and guest slugs.

## RULE ZERO: bump the version FIRST

From a clean repo, **before making any change** that touches `app/` or `integration/`, bump
the version with `.venv/bin/python tools/versioning.py bump` (for example 2026.10.1-b3 →
2026.10.1-b4). That also syncs `app/config.yaml` and adds the `## <version>` heading at the
top of `app/CHANGELOG.md`. Then write that version's changelog lines under the heading. A
test fails without it, and the Supervisor shows that file in the update dialog.

Bump only if HEAD already holds the current version (`git show HEAD:pyproject.toml`): one
build number per deploy, not per edit. A changed component then gets
`tools/component_versions.py --update` (see Commands). Do this before reading further and
before editing, every time. Claude and Codex both forget it constantly.

Why: the Supervisor offers an update only when `version` in `app/config.yaml` changes. With
no bump, the update silently never appears, and you lose time debugging the wrong thing.

Safety net, not a licence: `tools/fake_git_host.py` notices a commit that changed `app/` or
`integration/` without a bump. It bumps the build number itself, commits that as
`fake_git_host.py`, and shouts (banner, bell, macOS notification). If that fires, you failed
this rule.

## RULE ONE: use tokensave to explore code

Core: Exploring code (tokensave). It was once ignored for a whole session (one tool call in
hundreds), hence the rule number.

## RULE TWO: the log records everything that happens

Core: Nothing fails silently (logging). The log is how problems are diagnosed with the owner
away from home. The Casa Mia specifics:

- The start banner is boxed, so each restart stands out.
- INFO records every call and text (who, the number and the message), each guest login and
  each tablet check.
- `server.py` logs every admin-page change and integration request (method, path, result) in
  one place. Modules still log what the change meant.
- Never log the guest slugs or legacy QR ids. Bodies are not logged for this reason.

## RULE THREE: keep files small; split before they sprawl

Core: Source hygiene, except that **the limit here is 800 lines**, enforced by
`tests/test_file_sizes.py`. Why: `compositor.py` grew to 3,600 lines (2026-10-10). Nobody
could hold it in their head, and every change risked a part nobody was looking at.

- The files already over the limit are listed in `OVER` in that test at their current size.
  They may shrink but never grow. Lower a file's number as it shrinks, and remove it once
  it is under 800.
- The pattern to follow is the compositor package, `app/src/casa_mia/modules/compositor/`.
  The gatherer's layers run `Cache` → `Fetcher` → `Survey` → `Monitor` → `Gatherer`, and the
  compositor's run `Generator` → `PictureServer` → `Compositor`. `guest_login` was moved into
  a package under this rule.
- `set_compositor(monkeypatch, NAME, value)` in `tests/conftest.py` patches a constant in
  every part of the compositor.

## RULE FOUR: push, never poll, without the owner's explicit approval

Core: Push, never poll. Here the app fires an event (`settings.CHANGED_EVENT`, or a module's
own event carrying the new values) and the integration acts on it at once. Inside HA, listen
to HA's own events and signals (state changes, `SIGNAL_CONFIG_ENTRY_CHANGED`), never a
timer. The existing 30 s `/health` poll stays as the liveness check and backstop, not as the
way a change arrives.

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

## Status

Skeleton stage. `docs/architecture.md` is the charter: it was moved out of `README.md`, which
is now the shop window, and the user docs are in `docs/`. The app skeleton, tooling and fake
git host exist, but there are no modules yet. Existing code to learn from lives elsewhere
(the earlier `fona_sms` component, an earlier app's `ingress.py`, the composite-test server);
read it rather than rewriting from memory.

## Commands

`tools/setup` (re-runnable) creates `.venv` on Python 3.11, which matches the HA base image.

- **Tests:** `.venv/bin/pytest -q` runs the full suite with 8 workers by default (configured
  in `pyproject.toml`; `tools/setup` installs pytest-xdist). Use `-n 0` for serial debugging
  only. No slow tests are excluded. Measurements and fixture rules are in `tests/README.md`.
  Check timing with `--durations=20`. Camera teardown uses `stop_compositor` in
  `tests/conftest.py`. HTTP servers go through the `serve` fixture, which makes
  `serve_forever` poll every 10 ms. `tokensave_affected` finds the files to run while
  iterating.
- **Lint/format:** `.venv/bin/ruff check .` and `.venv/bin/ruff format .`
- **Types:** `.venv/bin/pyright`
- **Branches:** work on `dev` and never commit to `main`. `main` is protected (pull requests
  only, with the 8 CI checks required) and moves only at a release, through
  `tools/release.py`. "Push to GitHub" means `git push origin dev`.
- **Serve the checkout to the HA box:** run `.venv/bin/python tools/fake_git_host.py`, then
  add the printed URL (it ends `#app-dev`) in Settings → Apps → App store → Repositories.
  - Only committed work is served. It listens on port 9419, one above git's 9418, so another
    fake git host can run alongside.
  - It checks GitHub every 10 minutes and serves the latest published release (tag
    `YYYY.M.R`) instead of HEAD when that is newer. The box follows releases without its
    repository URL, and so the app's slug, ever changing.
- **Deploy:** commit (with the version bumped) and keep `tools/fake_git_host.py` running. The
  owner refreshes the App store and installs the update offered, almost at once.
  `tools/deploy` (an SSH `ha store reload` + `ha apps update`) was retired: the store refresh
  does the same without confusing HA about the latest version.
- **Branding:** finished PNGs are committed as they are (nothing renders them): `app/icon.png`
  and `logo.png`, and the integration's `brand/` (`icon`, `logo` and `dark_logo`, each with
  `@2x`). There is no `dark_icon`, because the icon works on dark. The large masters are in
  `branding/`, for making new sizes.
- **Components** (`integration/custom_components/<domain>/`) each carry their **own**
  `manifest.json` version.
  - It is the app version the component last changed in, stamped by
    `.venv/bin/python tools/component_versions.py --update`; never edit it by hand. Run it
    after changing a component's files (after the app bump). A test fails on files changed
    since the lock.
  - The app pushes every bundled component into `/config/custom_components` on start. Each
    component's `restart_notice.py` raises its own restart Repair only when its loaded
    version differs from the installed one.
  - `restart_notice.py` and `repairs.py` are domain-agnostic; keep the copies identical across
    components (`tests/test_restart_notice.py` checks).
  - There are three components: `casa_mia`, and its children `casa_mia_guest_login` and
    `casa_mia_commander`, which share its coordinator (`casa_mia/children.py`). A child is
    for a module with many devices (each commander, each guest endpoint). A module with one
    device lives in `casa_mia` itself, as Sensor Watch does (`casa_mia/sensor_watch/`; it was
    its own integration until 2026.10.10-b4). `components.py` `RETIRED` takes an old
    component's folder out of HA's config.
- **Breaking changes** (anything that makes a user act after updating: a renamed service or
  entity, a new integration to add, devices to delete) go **first** in their version's
  changelog section, one line each: `- **Breaking:** what changed. What to do.` Keep them
  through the release-notes review; they lead the release notes.
- **pyright excludes `integration/`.** The `homeassistant` package needs Python 3.13+, but
  our venv is 3.11 to match the app image. Revisit (a second venv, or a trixie base) when
  integration tests need real HA.
- **Logging setup:** `casa_mia/log.py` configures Home Assistant's own format
  (`2026-10-01 16:42:28.675 INFO (MainThread) [logger.name] message`, copied from Core's
  `bootstrap.py`). The `log_level` app option sets the level. Do not call
  `logging.basicConfig` anywhere else.
- **Maturity:** each module's level (Skeleton … Released) lives once, in
  `app/src/casa_mia/maturity.json`, which the admin page reads.
  `.venv/bin/python tools/maturity.py --update` writes it into the option descriptions
  (`app/translations/en.yaml`) and the docs pages. `tests/test_maturity.py` fails when they
  differ, or when a module option has no rating.
- **Admin UI** (React, `app/web/`):
  - `tools/build_web` builds it into `app/src/casa_mia/web/` (committed, so the image needs no
    Node) and stamps its source hash. `tests/test_web_build.py` fails on a stale build.
  - `server.py` serves it on 8780 to HA's ingress gateway only (`/health` stays open to the
    integration).
  - For live editing against an app on 8780, run `cd app/web && npm run dev`.
- **Pills and chips:** there is one source, `app/web/src/pills.css` (global `cm-` classes,
  coloured by `--tone`).
  - The admin UI's modules compose them (`composes: cm-pill cm-fixed from global`, adding
    only a tone or layout).
  - The cards and the Tablet Layout editor adopt them through
    `integration/cards/src/pills.ts` (HA's colours under the same token names), and
    `tools/web_hash.py` hashes it into both builds.
  - `docs/design/pills-and-chips.html` (open it from the checkout) links that file and gives
    each style an Id the owner refers to. A new pill or chip uses these classes, never a
    hand-rolled one.
- **Chrome** (buttons, dialogs, folds, menus, selects, sliders, switches, choices, callouts,
  help, empty boxes):
  - There is one source, `app/web/src/ui.module.css`, which the modules compose. The
    browser's own controls are drawn as ours in `styles.css`.
  - Components live in `ui.tsx`, `controls.tsx` (Select, Slider) and `confirm.tsx`
    (confirmBox, askBox).
  - The browser's `<select>` is banned too, as well as `confirm()`, `prompt()` and `alert()`;
    `tests/test_no_browser_controls.py` fails on any of them.
  - `docs/design/chrome.html` links the live CSS and gives each style an Id.
- **Lovelace cards** (Lit + TypeScript, `integration/cards/`): Camera Commander, Section and
  the Tablet Layout (a custom view type), all in one bundle.
  - `tools/build_cards` builds it into the integration's `www/cm-cards.js` (committed, and
    always loaded by the integration) and stamps its source hash (`tests/test_web_build.py`
    again).
  - For a fast loop against the box with no restart, run `tools/dev_cards`. It rebuilds into
    the box's own copy (the config share is mounted at `/Volumes/config`) on every save;
    then hard-refresh the browser. The next app start restores the committed build.
  - The layout engine exists twice, as `compositor.commander_layout` (Python) and
    `integration/cards/src/layout.ts`. Both must pass `tests/layout_cases.json`
    (`tests/test_layout_cases.py` runs both). Regenerate the cases from Python after a
    deliberate change.
  - Layout options (labels, help, defaults) live once, in `app/src/casa_mia/layout.json`,
    which the compositor, the admin page and the card editors all read. A new layout option
    goes there, and into both engines when it applies to both.
- **Version:** there is one source, `pyproject.toml`, in Home Assistant's style.
  - Releases are `YYYY.M.R` (month unpadded, as in HA's own), and private builds are
    `YYYY.M.R-bN`. `tools/versioning.py bump` makes the next build.
  - The user makes releases with `tools/release.py`, a deterministic walkthrough run on
    `dev`: checks, `tools/versioning.py release`, a notes review, a pull request from `dev`
    into `main`, then merge, tag and push on their OK (see `docs/releases.md`). Never run it
    or tag a release yourself unless asked.
  - `.github/workflows/release.yml` then builds the GHCR images, makes the GitHub release and
    updates `stable`.
  - `tools/sync_app_version.py` copies the version into `app/config.yaml`; a test fails if
    they differ.
- **tokensave:** `../tablet-provision` can be queried with `graph_root` as a read-only
  reference.

## Scope

Beyond the app and integration, the repo also holds:
- the FONA Arduino firmware;
- the ESPHome generator (Python; deterministic YAML for all Shelly/ESP devices);
- the tablet provisioner;
- the camera compositor and host;
- the local radio station Docker stack (currently on the NAS; it may move to HA);
- the KNX project (consumed and controlled, and increasingly automated).

Together these are the seed of a deterministically built HA config: generated output must be
reproducible from the sources here.

**Scope exclusion:** other projects are not modules of this repo. That covers the author's
other public projects and third-party ones such as advanced-camera-card. Don't vendor them
wholesale, and don't make this repo and them depend on each other.

## Architecture (proposed, see docs/architecture.md)

One repo and one version, with two deliverables released together:
- **App** (an HA add-on, `app/src/casa_mia/`): long-running, I/O-heavy, network-facing work,
  and anything that must survive a Core restart. It holds `core/` (config, logging, health,
  ingress/token gate, supervisor client) and `modules/{fona,gitproxy,compositor}/`. The
  alarm panel is integration-only.
- **Integration** (`integration/custom_components/casa_mia/`, domain `casa_mia`, tentative):
  config flow, entities, services, events and Repairs, and whatever works on HA's own state,
  registries and events, with the data it uses all the time stored there, not copied from
  the app. It talks to the app over a small versioned local API and HA's websocket, pushing
  changes. Each side checks the other's version at runtime and surfaces a mismatch as a
  Repair.
- **Each piece of work goes where it fits best** (owner, 2026-10-21; the placement rule in
  `docs/architecture.md`). The integration is not kept thin for its own sake. Why: that
  rule kept Sensor Watch's records in the app, and the integration had to copy them by a
  chain of pulls.
- **Module contract** (draft): `start()`, `stop()`, `health()`, a config schema, and it
  registers its own entities and routes. One module failing must not stop the others.
- The app is meant to install the integration into `/config/custom_components` on start and
  request a Core reload. This single delivery path is still to be confirmed.

## Constraints to respect

- **FONA** (GSM/SMS house access when the internet is down) is mission-critical. It lives in
  the app, reconnects with backoff, tolerates the Arduino resetting when the port opens, and
  must use the by-id serial path, never `ttyACM0`. Past failure: the read loop died silently
  after the port moved, and the sensors went stale.
- Keep app backup data small: no caches or model files in app data.
- **Deployment** is through a fake git host serving the working tree, so there are no GitHub
  credentials on the HA box.
  - There is no staging: deploy straight to the live box (`homeassistant.local:8123`).
  - To cut over from an old integration (FONA first), leave the old one installed and stop
    it to test the new module. If the new module is incomplete, switch it off with its flag
    and restore the old one. Retire the old one only once the new one is proven.
  - Rollback means deploying the previous tag.
- **Trap:** since HA OS 17, editing files and clicking Rebuild can leave old layers running.
  Bump the version and go through the update path instead.
- Don't touch the live HA config without the user's agreement. (The old `fona_sms`
  integration is deleted for good; FONA is now the app's `fona` module.)
- **Planned testing:** pytest with fakes (including a mock serial device that can reset,
  vanish and reappear) and `pytest-homeassistant-custom-component`, plus a manual fire-drill
  checklist in `docs/architecture.md`.
