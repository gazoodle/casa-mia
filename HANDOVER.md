# Handover: Casa Mia, for agents joining the work

Where the project stands and how the work is done here, as of 2026-10-10 (`dev` at
2026.10.6-b4, uncommitted; b3 committed; 2026.10.5 released). **Read this at the start of every
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

- **HA's visibility is decided in core since 2026.9:** a section or card learns its answer a
  moment after the page loads. To know whether HA hid a section, read its `hidden`
  attribute (and listen for `section-visibility-changed`), not private methods such as
  `_conditionsVisible` (wrong for a condition core can't evaluate, an empty Not).
- **`clip-path` makes an element a backdrop root:** a `backdrop-filter` inside it sees
  nothing behind (the Over layer's blur vanished). Clip the blurred element itself.
- **Mid-release fixes stay out of `app/` and `integration/`:** `fake_git_host.py` bumps the
  version on such a commit, on top of the release commit. CI fixes go in `tests/` and
  `.github/`.
- **Cards copied to the box last until the app restarts:** it puts its bundled
  `cm-cards.js` back on start. Check with `cmp` and copy again.
- **Before claiming something is new,** search HA's frontend (issues, PRs, discussions) and
  HACS's default list (`hacs/default`'s `plugin` file); the owner asks.

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
- **2026.10.4** (released): the camera split (Cameras, Camera Commander, Auto Dashboards);
  maturity ratings; Kiosk Satellites Run everywhere; Working together (pages and tablets
  reload after an update; the compositor names its viewers from Kiosk Satellites); **the
  integration split in three** (`casa_mia`, children `casa_mia_guest_login` and
  `casa_mia_commander` sharing its coordinator via `casa_mia/children.py`, offered under
  Discovered); docs ready for a soft launch (DOCS.md, every applet guide, screenshots).
- **2026.10.5** (released): `counts: false` dropped (garnish only); one hover ring for every
  edit-mode control (`HOVER` in ha.ts); **garnish on every Sections dashboard**
  (`garnish-sections.ts` wraps HA's `hui-section._updateVisibility`; Settings → Dashboards,
  `dashboards.garnish_everywhere`); **the Over layer card** (`integration/cards/src/over-layer/`:
  common, card, editor, door): one card or its whole panel (`panel: true`: a copy of its
  section, made with HA's `hui-section`) over the view or window while its Visibility holds;
  float/full/scroll, nine anchors with offsets, backdrop, block taps; down when a section
  round it is hidden by its own Visibility (its `hidden`, ignoring Casa Mia's own hiding,
  marked `cmContentHidden`); no URL escape, an admins-only door over HA's edit button and
  `?edit=1`. A README section and guide for each.
- **2026.10.6-b1** (committed, not pushed): Home Assistant 2026.9 or later
  stated (`homeassistant:` in `app/config.yaml`, README, DOCS.md); the Over layer rated Alpha.
- **2026.10.6-b2** (committed and installed; built overnight, unasked-for choices made by Claude, **uncommitted** for
  the owner to inspect): the whole Guest login backlog. Endpoint options `end_sessions`
  (closing signs the login's user out: `HA.sign_out` deactivates then reactivates the user,
  which removes its refresh tokens and closes its sockets; kept while another open endpoint
  shares the login; never for an admin), `rotate` (new slug on close), `info` (house info,
  Continue before sign-in); a ticker closes timed openings properly (`_expire`, 15 s);
  2FA (HA's `mfa` step: the page asks for the code, `Pending` flows 5 min); the engineer
  page (no photo, no delay); **Sign everyone out** per login; `reach.py` (what each login
  can reach, flags); **QR code for a page** (`page-qr`); the guide's "How far can a session
  be narrowed?". `login.py`'s Supervisor calls moved to `supervisor.py` (RULE THREE). The
  guest API fixtures moved to `tests/conftest.py`.

## Where things stand

- **2026.10.6-b4 is in the working tree, not committed:** a passcode per endpoint (`pin`,
  checked in `_post` with `hmac.compare_digest` before the login flow; the welcome page
  asks first, reusing the 2FA form); sign-out follows the login (`_signs_out`: any of
  its endpoints ticked; health's `end_sessions` is that); **Who's signed in** (`SignIn.sessions`:
  signs in as the login, lists `auth/refresh_tokens`, revokes its own token). Refused for a login with 2FA (`SignIn.mfa`, learnt
  from each flow; `GET logins/<name>/mfa` finds out). The owner's own BACKLOG.md edit (GHCR
  pull counting) is left unstaged for them.
- **2026.10.6-b3 (committed `c2983b5`).** On the box, b2 is proven: sign-out
  on close works. b3 adds: the goodbye (`guest-goodbye.ts` in cm-cards.js reads the Access
  switch's new attributes `guest_user_id`, `signs_out`, `goodbye_url`, `guest_port`, and
  sends the visitor's page to `/bye` on the guest port or the set address; the app waits
  `GOODBYE_GRACE` 40 s before signing out, because the integration polls every 30 s);
  the reach check's fix buttons (`reach.fix`: local_only, kiosk, admin_only; named fixes
  only, checked afresh); the QR codes dialog (guest card `printing.py`, Wi-Fi code, a page);
  house info is house rules only (no Wi-Fi: a phone that opens the page is on the network);
  wrapping fixed in the login tiles and the reach check (`.rowMeta` is nowrap: tiles
  override it). Splits (RULE THREE): `common.py`, `signin.py` (SignIn → GuestLogin),
  `codes.py` (Codes → GuestAPI). Untested on the box: 2FA, the goodbye, the fixes.

- **The owner tested the GitHub release install end to end** on the HAOS test VM. Don't
  offer to walk it again.
- **Soft launch:** a post for HA Community → Share your Projects, tomorrow, by the owner.
  Lead with the Tablet Layout, then the Over layer, then garnish. Say up front: needs HA OS
  or Supervised (an app; the cards aren't on HACS: "Modules as stand-alone projects" in
  the backlog), the install count is anonymous with an off switch, it's one house's system
  made general (maturity ratings, every module starts off).
- **The 2026.9 floor is stated, not tested:** everything has run on 2026.10 only. Worth a
  check on a 2026.9 HA when there's one to hand.
- **Seen occasionally:** "Invalid configuration" on a card that clears after a while or a
  page refresh. Possibly HA frontend issue #53890 (custom elements from
  `add_extra_js_url` lost when they load before the scoped registry polyfill), which is how
  `cm-cards.js` loads. Unconfirmed; watch for it.
- **Loose ends:** move the card's motion test into the cards' `npm test` (package.json;
  CI runs it from checks.yml meanwhile); HA warns about `via_device` in commanders'
  DeviceInfo (a warning until 2027.8); the compositor's log lines give viewers' addresses
  only; the Tablet Layout guide's examples.
- **Next from the backlog**, when the owner picks: the Over layer's intercom mode; Kiosk
  mode's way out (`?disable_km`); Auto Dashboards' Back/Home/Help made general; every
  camera detection with its own icon; guest login reach and tightening; Tablet Layout bugs
  (fixed-shape main ignores edge sizes; two edit-mode blemishes); nested sections when HA
  2026.11 ships them (garnish should carry over; the owner said not to build ahead of HA).
