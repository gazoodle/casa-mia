# Handover: Casa Mia, for agents joining the work

Where the project stands and how the work is done here, as of 2026-10-10 (`dev` at
2026.10.6-b9; 2026.10.5 released; 2026.10.6 about to be released). **Read this at the start of every
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
  dashboard, with passcodes, 2FA, sign-out on close, a goodbye, a reach check with fixes
  and a sign-in log (see "Guest login" below). Security is by limiting what a code is
  worth (closed, signed out), not by locking HA down; the guide says so, and why (xkcd).
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
- **After an app restart** the card starts a fresh stream by itself: each card's view
  carries `run` (`commander/live.py` RUN, one per app process), and the app fires
  `casa_mia_settings_changed` 2 s after starting. (Fixes blank tablets after an update.)

## Guest login (2026.10.6)

`modules/guest_login/`, layered: `common.py` (constants, Endpoint, errors) → `signin.py`
(SignIn: HA's login flow, 2FA `Pending`, `mfa`, `sessions`) → `login.py` (GuestLogin: the
guest port's pages, opening and closing, expiry to the second, `_note` for the audit);
`codes.py` (Codes: QR codes, guest card) → `api.py` (GuestAPI: the admin API, store,
`_closed`: rotate, then sign out after `GOODBYE_GRACE` 8 s); `reach.py` (the check and its
named fixes), `audit.py` (the sign-in log, JSON lines, pruned), `printing.py` (Wi-Fi code,
guest card SVG), `page.py` (welcome, goodbye), `supervisor.py`.
- **Sign-out:** `HA.sign_out` deactivates then reactivates the user (removes its refresh
  tokens, closes its sockets). It follows the login, not the endpoint (`_signs_out`); never
  an admin. **Who's signed in** signs in as the login, lists `auth/refresh_tokens`, revokes
  its own token.
- **The goodbye:** `guest-goodbye.ts` (in cm-cards.js, every page) reads the Access
  switch's attributes (`guest_user_id`, `signs_out`, `goodbye_url`, `guest_port`,
  `closes_at`) and moves the page before the sign-out.
- **One "ask me now" event:** `settings.CHANGED_EVENT` (`casa_mia_settings_changed`); the
  integration answers with `async_refresh` (not debounced). Reuse it; don't add another.
- **Passcode** (`pin`, `hmac.compare_digest`, before the flow); refused for a login with
  2FA. **Never stored in the audit:** passcodes, codes, secret addresses.

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
- **Screenshot swap replaces text, not pictures:** a QR code drawn from the real text
  still scans to the real address. Swap the text *before* drawing (the guest card did it
  after, b7). And a swapped QR can't be scanned to test with: turn swap off, point the
  phone, turn it on, then tap.
- **Screenshots:** the HA app window is captured by `screencapture -l <window id> -o -x`
  (find the id with a CGWindowList Swift snippet; the id changes when the app restarts),
  then `cwebp -q 82 -alpha_q 100 -resize 1600 0`. Phone shots go in an iPhone frame
  (Dynamic Island) by a Pillow script, blurring the address bar; it lived in the session's
  scratchpad, so rewrite it (or ask to keep it in `tools/`). Check each shot for real
  names, and `webpinfo` that no EXIF or XMP went in. Decode a QR in a shot with macOS
  Vision (`VNDetectBarcodesRequest`) to prove where it points.
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
  maturity ratings; Kiosk Satellites Run everywhere; Working together; **the integration
  split in three** (`casa_mia`, children `casa_mia_guest_login` and `casa_mia_commander`
  sharing its coordinator via `casa_mia/children.py`); docs ready for a soft launch.
- **2026.10.5** (released): garnish on every Sections dashboard; **the Over layer card**;
  one hover ring for edit-mode controls.
- **2026.10.6-b1 to b8** (committed, about to be released): HA 2026.9 floor stated; the
  Over layer rated Alpha; **Guest login, all of its backlog** (overnight in b2, then with
  the owner): sign-out on close, 2FA, rotating addresses, engineer page, house rules,
  page QR codes, the reach check and its fixes, the goodbye, the QR codes dialog and
  guest card, a passcode per endpoint, Who's signed in, the sign-in log; the commander's
  fresh stream after an app restart; the guide rewritten around new screenshots (three
  iPhone shots), with the two xkcd comics behind the design. Proven on the box: sign-out
  on close, the passcode, the goodbye.

## Where things stand

- **Releasing 2026.10.6** next (the owner runs `tools/release.py`). Backlog has the owner's
  own item at the top: GHCR pull counting to replace the README-fetch install count.
- **Untested on the box:** 2FA against a real user, the reach check's fixes, Who's signed
  in. **The reach check's screenshot** is still to take: see the backlog (a swap-only
  dashboard list).
- **The owner tested the GitHub release install end to end** on the HAOS test VM. Don't
  offer to walk it again.
- **Soft launch:** the owner's post for HA Community → Share your Projects. Lead with the
  Tablet Layout, then the Over layer, then garnish (and now guest login). Say up front:
  needs HA OS or Supervised, the install count is anonymous with an off switch, it's one
  house's system made general.
- **Casa Mia is non-commercial, always** (the owner's commitment); the MIT licence stays,
  and what others do with it is on them.
- **The 2026.9 floor is stated, not tested:** everything has run on 2026.10 only.
- **Seen occasionally:** "Invalid configuration" on a card that clears after a refresh.
  Possibly HA frontend issue #53890 (`add_extra_js_url` elements lost before the scoped
  registry polyfill). Unconfirmed; watch for it.
- **Loose ends:** move the card's motion test into the cards' `npm test`; HA warns about
  `via_device` in commanders' DeviceInfo (until 2027.8); the compositor's log lines give
  viewers' addresses only; the Tablet Layout guide's examples.
- **Next from the backlog**, when the owner picks: the reach check's screenshot; the Over layer's intercom mode and card
  transparency; Kiosk mode's way out (`?disable_km`); Auto Dashboards' Back/Home/Help made
  general; every camera detection with its own icon; Tablet Layout bugs; nested sections
  when HA 2026.11 ships them (don't build ahead of HA).
