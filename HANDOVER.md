# Handover: Casa Mia, for agents joining the work

This is where the project stands and how the work is done here, as of 2026-10-09 (`dev` at
2026.10.4-b2). Read it first. Then read **CLAUDE.md in full**: its rules apply to every
agent, Codex included, and `AGENTS.md` sends you there too. Where this file and CLAUDE.md
disagree, CLAUDE.md wins.

Do not commit this file unless the owner asks you to. The repo is public, so this file
holds no private details either.

## What Casa Mia is

A Home Assistant **app** (never call it an "add-on") and an **integration**, released
together under one version, from one public repo (`gazoodle/casa-mia`). It is the owner's
house system, generalised for others. The modules, each switched on in the app's
Configuration tab:

- **Tablet Layout:** a custom Lovelace view type (`custom:casa-mia-tablet-layout`), built on
  HA's Sections view. It is locked to the screen's size and has edge panels, layers, and an
  edit mode with chips, dimension lines and padlocks. Its guide is `docs/tablet-layout.md`.
- **Camera Commander card and camera compositor:** the compositor gathers camera streams
  through HA's go2rtc and draws one live picture per commander, sized exactly for the card
  showing it. It has health verdicts, graphs and self-recovery. It lives in
  `app/src/casa_mia/modules/compositor/`, a layered package.
- **Camera Dashboard:** generates the camera dashboards. It is being split into the
  Commander and Auto Dashboards (see the backlog).
- **Guest login:** guests sign in with a QR code to a landing dashboard
  (`modules/guest_login/`).
- **Kiosk Satellites:** finds the wall tablets running Kiosk Satellite, an Android kiosk app
  with a REST API documented at kiosksatellite.com/docs/remote-api/. It keeps a login to
  each tablet, backs them up and proxies their admin pages (`modules/kiosks/`).
- **Kiosk mode, firmware server, people, phone and SMS (FONA, a GSM gateway, mission
  critical), alarm panel** (integration only), and **dashboard helpers** (small frontend
  scripts).

Code map:

| Path | What it holds |
|---|---|
| `app/src/casa_mia/` | The app (Python 3.11). |
| `app/web/` | The admin UI (React), built into the app. |
| `integration/custom_components/casa_mia/` | The integration. |
| `integration/cards/` | The Lit and TypeScript cards and view, built into `www/cm-cards.js`. |
| `docs/` | The user docs. |
| `docs/architecture.md` | The charter. |
| `BACKLOG.md` | Planned work. |

## The rules that bite (details in CLAUDE.md)

- **RULE MINUS ONE: no real private data in the repo, ever.** That covers code, tests,
  changelog, docs and commit messages. Invent examples instead: Oak Tree, Barn, 07700
  900xxx, 192.0.2.x. Before every commit, read the staged diff and the message. The house's
  real name and anything in `swap.json`, `people.json` or the box's config are off limits.
  "Rosa Place" is the screenshot stand-in name.
- **RULE ZERO: bump the version first.**
  - Before changing `app/` or `integration/`, if HEAD holds the current version, run
    `.venv/bin/python tools/versioning.py bump`. Then write the changelog lines under the
    new heading in `app/CHANGELOG.md`.
  - Each commit that changes the app needs its own build number. Today a second commit
    without a new bump made `tools/fake_git_host.py` bump to b2 by itself (commit
    `4a15ae8`). That is the safety net firing, which counts as a failure.
  - After changing the integration, run `.venv/bin/python tools/component_versions.py --update`.
  - After changing card sources, run `tools/build_cards`. After changing the admin UI, run
    `tools/build_web`. The built files are committed, and tests fail when they are stale.
- **RULE ONE: tokensave for exploring code** (Claude's MCP tools). If you don't have
  tokensave, use your normal tools, but read before you write.
- **RULE TWO: the log records everything.** INFO for every action and event, DEBUG for raw
  traffic, never secrets. Use `logging.getLogger(__name__)`.
- **RULE THREE: no source file over 800 lines**, enforced by `tests/test_file_sizes.py`.
  - The files already over are listed in `OVER` at their current size. They may shrink but
    never grow. To work in one, split it first.
  - A split module becomes a **package**, never sibling files. It gets `common.py` for
    constants, defined once, and its classes become layers, each extending the one below,
    with no upward calls. Each part has its own `_LOGGER`, and `__init__.py` re-exports.
  - The models are `modules/compositor/` and `modules/kiosks/` (Store → Finder → Backups →
    Commands → Kiosks).
  - A split is a separate commit from any feature, with code moved verbatim.
- **Tests:** `.venv/bin/pytest -q` must run in under 15 s (about 12 s now, 257 tests). Don't
  use real sleeps, and run servers through the `serve` fixture. Also run
  `.venv/bin/ruff check .`, `ruff format`, and `.venv/bin/pyright`.
- **Git:**
  - Work on `dev`. `main` is protected.
  - Commit **only when asked**, gated as
    `if .venv/bin/pytest -q > scratch/pt.txt; then git commit ...`.
  - Push only when asked (`git push origin dev`).
  - **Never run `tools/release.py` or tag**: the owner does releases.
- **The live HA box:** don't change its config without agreement. Reading its logs is fine.
  Never print the tokens in the app's `kiosks.json`.

## How to work with the owner

- They are an expert who works fast. Act, then report briefly, and recommend rather than
  survey. Don't build what wasn't asked for. Ideas go into `BACKLOG.md` as "asked
  <date>" items, and aren't started.
- Say "app", not "add-on". Information must never be shown only on hover: the pages are
  used on an iPad. The Safari hard refresh is ⌘⌥R.
- **Screenshots:**
  - Take the whole HA window, as WebP at 1600 px, into `docs/screenshots/`.
  - When you need the owner to set something up, give only the steps for that shot, then
    stop.
  - Photos must have their metadata stripped.
  - The `Swap` binary sensor shows when screenshot mode (`swap.json`) is on. It puts
    invented names over the real ones.
- They often add their own lines to the README and docs, so read a section before you
  replace it.

## The dev loop

- **Deploy:** commit with a bump, keep `tools/fake_git_host.py` running, and the owner
  installs the offered update from the HA App store.
- **Cards against the live box with no restart:** copy the built `cm-cards.js` to
  `/Volumes/config/custom_components/casa_mia/www/` (the config share is mounted), check
  the copy with `cmp`, and hard-refresh. `tools/dev_cards` does the same on every save.
- **The test VM:** a HAOS VM on Parallels that installs Casa Mia from GitHub like a new
  user would. It has no layout-card or other HACS cards. Ask the owner for its address.
  - A long-lived token for it is in `~/.config/casa-mia/vm-token`. Read it from the file
    and never print it.
  - You can drive it headless with the Playwright in
    `../advanced-camera-card/node_modules` and its cached Chromium in
    `~/Library/Caches/ms-playwright/chromium-*`. Log in by setting `hassTokens` in
    localStorage via `addInitScript`.
- The layout engine exists twice, in `compositor.commander_layout` (Python) and
  `integration/cards/src/layout.ts`. Both must pass `tests/layout_cases.json`. Layout
  options are defined once, in `app/src/casa_mia/layout.json`.

## What happened recently

**Leading up to 2026.10.3, released by the owner (5 days, 86 builds, 146 commits):**
- The Tablet Layout view: panel stacks, layers, and edit mode.
- The Commander card, rebuilt with a live main picture and the Security look as a card
  option.
- The compositor rebuilt as a pipeline.
- `compositor.py` (3,600 lines) and the guest login split into packages, and RULE THREE
  added.
- The docs restructured: a README shop window, `docs/` with the Tablet Layout guide and a
  page per applet, and the charter moved to `docs/architecture.md`.
- Screenshot mode: watermarked swap pictures, the `Swap` sensor, and slow gathering while
  swapped.

**On `dev` since the release (not pushed):**
- `b67d336`: Kiosk Satellites split into `modules/kiosks/`.
- `c6109e9`, the first **Working together** feature (see below):
  - A page left open through an update offers a **Reload** in HA's toast. The integration's
    websocket command `casa_mia/cards` gives the version it serves, and `cm-cards.js`
    checks it at each reconnect.
  - Wall tablets reload themselves. The integration sends `cards=<version>` on its
    `/health` poll. When that changes, the server (`on_cards`) calls
    `Kiosks.reload_all`, which sends Kiosk Satellite's `reload` command to each tablet
    it's logged in to.
  - GitHub issue forms (`.github/ISSUE_TEMPLATE/`): a bug report and an idea form.
- `4a15ae8`: the automatic bump to b2 (see RULE ZERO).
- **Not yet seen on a real update:** the tablet reload fires on the integration's first
  poll after HA restarts. Watch the app log for `kiosk …: reloaded` lines.

**Working together** is a new direction and a README section. Because the modules share
one app and one integration, each knows things the others can use. Each feature that ships
goes into the README section and `BACKLOG.md` → "Across modules". The next ones:
- The compositor's client list shows each kiosk by name instead of by IP.
- The integration knows each page's logged-in user ("who's looking").
- Guests identify themselves with a PIN on a guest-login page.
- Reload the tablets after other frontend changes (helpers, settings, deploys), using the
  same `reload_all`.

## What's next (the owner's order, roughly)

1. **Get ready to announce to the community.** The owner wants it, but not yet.
   - Write the 11 applet docs in `docs/applets/`. They hold 47 "To write" placeholders,
     and the README's Documentation link leads there. Camera Dashboard (the Commander) and
     Guest login come first.
   - Add a **maturity rating per module** (skeleton, in development, alpha, beta,
     released), defined once and shown in the app and the docs. It's in the backlog.
   - Then a forum post in HA Community → Share your Projects, leading with the Tablet
     Layout.
2. **Tablet Layout bugs, from the backlog:**
   - With `main_fit: fixed`, main ignores the edges' sizes.
   - Two blemishes in edit mode.
3. **Small items:**
   - `cm-streams.js` reports a false "CASA-MIA CARDS were missing; loaded on a second try"
     when all the cards are defined.
   - An HA version check in the Tablet Layout, so a breaking change in HA's frontend can
     get its own code path.
4. **Waiting on the owner:**
   - Music Assistant's back button on Kiosk Satellite, which may be a bug for Kiosk
     Satellite's author.
   - Splitting the integration into units.
   - Modules as stand-alone projects. The owner has more to say on this.

`BACKLOG.md` → "Next up" has everything else, each item dated and explained.
