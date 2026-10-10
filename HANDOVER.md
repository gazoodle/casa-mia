# Handover: Casa Mia, for agents joining the work

Where the project stands and how the work is done here, as of 2026-10-09 (`dev` at
2026.10.4-b25). **Read this at the start of every
session**, then CLAUDE.md in full; where they disagree, CLAUDE.md wins. It replaces
re-reading old transcripts: the history below is all a new session needs.

**Keep it current.** When a piece of work ends (a commit the owner asked for, a phase,
a session), update "Where things stand" and add a line to "What happened". Replace, don't
append: compress old history into a line, so this file stays under about 250 lines. A
rule the owner gives that every session needs goes into CLAUDE.md (or here, under "Lessons
learned", when it's about this project's working practice). The repo is public: no
private details here either (RULE MINUS ONE).

## What Casa Mia is

A Home Assistant **app** (never "add-on") and an **integration**, released together under
one version from one public repo (`gazoodle/casa-mia`). It is the owner's house system,
generalised for others. Modules, each switched on in the app's Configuration tab (option
keys in brackets; some keys keep older names, see "Lessons learned"):

- **Tablet Layout:** a custom Lovelace view type on HA's Sections view, locked to the
  screen's size, with edge panels, layers and an edit mode. Guide: `docs/tablet-layout.md`.
- **Cameras, Camera Commander, Auto Dashboards** (`compositor_enabled`,
  `camera_dashboard_enabled`): see "The camera modules" below.
- **Guest login** (`guest_login_enabled`): guests sign in with a QR code to a landing
  dashboard. Security is by hiding (kiosk-mode), not enforcement; the docs say so.
- **Kiosk Satellites** (`kiosks_enabled`): the wall tablets running Kiosk Satellite (REST
  API at kiosksatellite.com/docs/remote-api/): login, backups, proxied admin pages, and
  **Run everywhere** (its Quick Controls sent to every tablet in turn; icons and words are
  the KS author's, credited in the app and docs).
- **Phone and SMS** (`fona_enabled`, FONA GSM gateway, mission critical), **git proxy**,
  **alarm panel** (integration only), **kiosk mode**, **firmware server**, **people**,
  **dashboard helpers**.

Each module's maturity (Skeleton … Released) is defined once in
`app/src/casa_mia/maturity.json`; `tools/maturity.py --update` writes it into the option
descriptions and the docs. A module's entry can name its `option` (or `""` for none).

| Path | What it holds |
|---|---|
| `app/src/casa_mia/` | The app (Python 3.11); `modules/` one package per module. |
| `app/web/` | The admin UI (React), built into `app/src/casa_mia/web/`. |
| `integration/custom_components/casa_mia/` | The integration. |
| `integration/cards/` | Lit cards and the Tablet Layout view, built into `www/cm-cards.js`. |
| `docs/` | User docs: `README.md`, `applets/` (one page per module), `architecture.md` (charter). |
| `BACKLOG.md` | Planned work, each item dated "asked <date>". |
| `BACKSTORY.md` | The owner's own notes on why this exists. Theirs to edit. |

## The camera modules (split in b9–b18)

The old Camera Dashboard was split three ways. Option keys didn't change; labels did:
`compositor_enabled` is shown as **Camera Commander**, `camera_dashboard_enabled` as
**Auto Dashboards**, and Cameras is on when either is (`cameras_on = commander_on or
dashboards_on`).

- **Cameras** (`modules/cameras.py`, `cameras.json`): the house's cameras, each one's
  channels, motion sensor, motion detection switch (UniFi's "Motion", Kiosk Satellite's
  "Screensaver motion detection"), thumbnails and a live view dialog. Saved at once.
- **Camera Commander** (`modules/commander/`: store.Base → live.Live → api.Commander,
  `commanders.json`): the commanders, saved straight to live (no draft); writes
  `compositor.json` for the compositor. The page (b20): a list to pick one, its preview
  sticky under the Save bar, settings scrolling beneath. Track motion has **Never takes
  over** (`motion_ignore`): cameras whose motion marks the dot but never switches.
- **Compositor** (`modules/compositor/`, layered: Generator → PictureServer → Compositor;
  gatherer Cache → Fetcher → Survey → Monitor → Gatherer): draws each commander as one
  picture from go2rtc streams.
- **Auto Dashboards** (`modules/auto_dashboards/`: Base → Backups → Deploys →
  AutoDashboards): a draft that copies cameras, commanders and the compositor host from
  the other pages, previewed and deployed as the camera dashboard.
- **Integration:** each commander is a device with a Main camera select (attributes
  `card`, and `motion`: camera → sensor) and a Track motion switch; `motion.py` is the
  tracker. Commander health is under `modules["commander"]`; the device keeps its old
  identifier (`DEVICE_KEYS` in `sensor.py`). POSTs go to `/commander/main` and
  `/commander/motion`; the old `/camera-dashboard/` paths still route there.
- **The Camera Commander card** draws the motion dot itself in CSS (`motion.ts`), with
  options for colour, size, pulse, linger and corner. `tap_main` defaults to more-info.
  The card editor strips defaults, so a saved card holds only what was changed.

## The rules that bite (details in CLAUDE.md)

- **RULE MINUS ONE: no real private data**, anywhere, commit messages included. Invent:
  Oak Tree, Barn, 07700 900xxx, 192.0.2.x. "Rosa Place" is the screenshot stand-in for
  the house. Addresses or passwords the owner pastes in chat (a tablet to scrape, a test
  VM) stay in the scratchpad, never the repo. Scan the staged diff and message first.
- **RULE ZERO: bump first** (`tools/versioning.py bump` when HEAD holds the current
  version), changelog lines under the new heading, `tools/component_versions.py --update`
  when the integration changed, `tools/build_web` / `tools/build_cards` after UI sources.
- **RULE ONE: tokensave** for code. **RULE TWO: log everything** (never secrets).
- **RULE THREE: no file over 800 lines.** `OVER` in `tests/test_file_sizes.py` is now
  empty. Split into a layered package, in its own commit, before growing a file past it.
- **Tests:** `.venv/bin/pytest -q`, 269 tests in about 3 s (Codex's optimisation); must
  stay under 15 s.
- **Git:** work on `dev`. Commit only when asked, gated:
  `if .venv/bin/pytest -q > $SCRATCH/pt.txt; then git commit ...`. Push only when asked
  (`git push origin dev`). Never run `tools/release.py` or tag.
- **The live HA box:** read its logs and config shares freely; change nothing without
  agreement. Never print tokens from `kiosks.json`.

## Lessons learned (working practice not in CLAUDE.md)

- **Codex shares this checkout.** Before bumping, check `git status`: if Codex has an
  uncommitted bump, don't bump over it; if Codex has uncommitted work, stage only your own
  files (`git add -A -- . ':!<their paths>'`).
- **Confirm a feature before building** when the owner says so: restate it, with the
  choices you'd make, and wait. They review UI on the box before the next iteration, so
  ask for nothing else and change nothing while they look.
- **Rename labels, not keys.** Option keys, store keys and device identifiers outlive their
  names (see the camera split); change what's shown and keep the key.
- **The restart Repair:** the integration reads its loaded version at import
  (`LOADED_VERSION`), so an entry reload can't clear the marker. The Repair can need a page
  reload to appear; a persistent notification (the bell) goes with it.
- **Don't rewrite JSON or YAML files through a parser** (`en.json`, `maturity.json`): it
  reformats them. Edit them as text. Regex edits on `BACKLOG.md` remove too much: check
  the diff.
- **Default-stripping editors:** a card's stored config keeps old values forever, so a
  changed default doesn't reach saved cards. The owner's two commander cards still hold
  `tap_main: live` and need changing by hand.
- **`Field` is a `<label>`:** a click on anything non-interactive inside it clicks its
  first button. Chips in a Field lost each camera as it was added (b21); `Chips` now
  cancels that click.

## How to work with the owner

- An expert who works fast. Act, then report briefly; recommend rather than survey. Build
  only what was asked; ideas go into `BACKLOG.md`, not code.
- "App", not "add-on". Nothing only on hover (pages are used on an iPad); tooltips may
  add to what's shown. Safari hard refresh is ⌘⌥R.
- They edit the README and docs alongside you: read a section before replacing it.
- Screenshots: the whole HA window, WebP at 1600 px, into `docs/screenshots/`; for a set-up
  shot give only the steps for it, then stop.

## The dev loop

- **Deploy:** commit with a bump, keep `tools/fake_git_host.py` running; the owner installs
  the offered update from the App store. An integration change needs an HA restart.
- **Cards with no restart:** copy the built `cm-cards.js` to
  `/Volumes/config/custom_components/casa_mia/www/` (check with `cmp`), hard refresh;
  `tools/dev_cards` does it on every save.
- **The test VM:** a HAOS VM that installs Casa Mia from GitHub like a new user. Ask the
  owner for its address. Its token is in `~/.config/casa-mia/vm-token` (never print it).
  Drive it with the Playwright in `../advanced-camera-card/node_modules`, logging in by
  setting `hassTokens` in localStorage via `addInitScript`.
- The layout engine exists twice (`compositor.commander_layout` and
  `integration/cards/src/layout.ts`); both pass `tests/layout_cases.json`. Layout options
  live once in `app/src/casa_mia/layout.json`.

## What happened

- **To 2026.10.3** (released): the Tablet Layout view; the Commander card with a live main
  picture; the compositor rebuilt as a pipeline and split into a package; RULE THREE; the
  docs restructured; screenshot mode.
- **2026.10.4-b1–b7** (Codex and Claude): Kiosk Satellites split; Working together (pages
  and tablets reload after an update); GitHub issue forms; Garnish controls in the
  Tablet Layout edit surface; Section card retired; the UI split into folders.
- **b8:** maturity ratings per module; Guest login docs ("How safe is it?").
- **b9–b13:** the camera split (Cameras page, Commander page and store, draft compositor
  retired); the restart Repair fixed; the card's motion dot.
- **b14:** Codex completed the applet guides and cut the suite from 12 s to 3 s.
- **b15–b17:** motion sensor and detection switch on the live view and camera list;
  restart notification; Kiosk Satellites Run everywhere; docs for Cameras and Commander.
- **b18:** Camera Dashboard renamed Auto Dashboards. **b19:** Track motion exclusions.
- **b20:** the Commander page reworked: pick from a list, sticky preview, chips for the
  cameras that never take over. **b21:** those chips kept what was added.

## Where things stand

- **b21 is committed, not pushed:** Never takes over keeps its cameras; a larger preview. The owner is to deploy it
  and look at the new Commander page. Known rough edge: the preview docks 64px down to clear the Save bar; if
  the bar wraps (narrow screens), it covers the preview's top a little. Measure the bar
  if the owner minds.
- **b22 committed, not pushed: the integration split in three.** `casa_mia_guest_login` and
  `casa_mia_commander` (children: `dependencies: ["casa_mia"]`, a no-field single-entry
  flow, Casa Mia's coordinator through `running_coordinator`; shared helpers in
  `casa_mia/children.py`). Casa Mia offers each under Discovered while its module is on
  (once per HA run), reloads them when it is set up again, and lets its orphaned old
  devices be deleted (`async_remove_config_entry_device`). Picture proxy now
  `/api/casa_mia_commander/live`, token `casa_mia_commander/picture_token`. Tests pass, but
  **never loaded in a real HA yet**: try it on the test rig or VM before the live box.
  Breaking lines lead b22's changelog (the convention is now in CLAUDE.md and
  docs/releases.md).
  **b23:** b22 broke Casa Mia's own setup (it still listed the `select` platform, moved
  to the commander); a test now checks each listed platform has its file. Direct registry
  calls use `via_device_id`; HA still warns about `via_device` in entities' DeviceInfo
  (commanders.py), not yet looked into (a warning until 2027.8). Over layer designed in
  BACKLOG.md.
- **Docs ready for the soft launch** (b24; the compositor screenshot taken after b25). The
  Tablet Layout guide's examples wait until after.
- **b25: Working together, the compositor knows its viewers.** The Camera compositor page
  names each stream's viewer from Kiosk Satellites (`Store.names()`, passed to
  `admin_api(names=...)`), the IP kept beside it. Its log lines still give the address only.
- **2026.10.4 released.** Next builds (2026.10.5-b1, b2): `counts: false` no longer read;
  one hover ring for every edit-mode control (`HOVER` in ha.ts); **garnish on every
  Sections dashboard** (b2: `garnish-sections.ts` wraps HA's `hui-section._updateVisibility`;
  Settings → Dashboards switch, `dashboards.garnish_everywhere`); README section for it.
  Still to do: move the card's motion test into the cards' `npm test` (package.json); CI
  runs it from checks.yml meanwhile.
- **b3: the Over layer card** (`integration/cards/src/over-layer/`: common, card, editor, door):
  one card over the view or window while its Visibility holds; float/full/scroll; nine
  anchors with offsets; backdrop; block taps. Down when a section round it is hidden by its
  own Visibility (reads the section's `hidden`, ignoring garnish's, `cmGarnishHidden`). No
  URL escape: the admins-only door over HA's edit button (rect lid, round pulse), and
  `?edit=1`. Guide `docs/over-layer.md`, README section. Next: "show its whole panel".
- **Soft launch on the HA community forum**, still to do: a release (the owner runs
  `tools/release.py`), a fresh install on the test VM, then a forum post draft (HA
  Community → Share your Projects, leading with the Tablet Layout).
- **Next from the backlog**, when the owner picks: Auto Dashboards' Back/Home/Help made
  general; every camera detection with its own icon; guest login reach and tightening;
  Tablet Layout bugs (fixed-shape main ignores edge sizes; two edit-mode blemishes).
