# Handover: Casa Mia, for agents joining the work

Where the project stands and how the work is done here, as of 2026-11-10 (`dev` at
2026.11.2-b22; 2026.11.1 released). **Read this at the start of every session**, then
CLAUDE.md in full; where they disagree, CLAUDE.md wins. It replaces re-reading old
transcripts.

**Keep it current.** When a piece of work ends, update "Where things stand" and add a line
to "What happened". Replace, don't append: compress old history into a line, so this file
stays under about 250 lines. Planned work goes in `BACKLOG.md`, not here. A rule every
session needs goes into CLAUDE.md (or under "Lessons learned" when it's about this
project's working practice). The repo is public: no private details here either (RULE
MINUS ONE).

## What Casa Mia is

A Home Assistant **app** (never "add-on") and an **integration**, released together under
one version from one public repo (`gazoodle/casa-mia`): the owner's house system,
generalised for others. Modules, each switched on in the app's Configuration tab (option
keys in brackets; some keep older names):

- **Tablet Layout:** a custom Lovelace view type on HA's Sections view, locked to the
  screen's size, with edge panels, layers, garnish, the Over layer and an edit mode. Guide:
  `docs/tablet-layout.md`.
- **Cameras, Camera Commander, Auto Dashboards** (`compositor_enabled`,
  `camera_dashboard_enabled`): see "The camera modules" below.
- **Sensor Watch:** see "Sensor Watch" below. Beta.
- **Guest login** (`guest_login_enabled`): see "Guest login" below. Security is by limiting
  what a code is worth (closed, signed out), not by locking HA down; the guide says why
  (xkcd).
- **Kiosk Satellites** (`kiosks_enabled`): the wall tablets running Kiosk Satellite (REST
  API at kiosksatellite.com/docs/remote-api/): login, backups, proxied admin pages (the
  proxy at `/kiosk/<id>/` adds the app's token), screen thumbnails, **Run everywhere**
  (KS's Quick Controls on every tablet; icons and words are the KS author's, credited),
  and **Remote control** (`modules/kiosks/vnc.py`: the app logs in to droidVNC-NG on the
  tablet and relays it to noVNC in the page, so the VNC password never reaches the
  browser).
- **Heating Flow card** (`cards/src/heating-flow/`): an animated diagram of a heating
  system, with System, Heat pump and Rooms views. Guide: `docs/heating-flow.md`; its design
  lives in `docs/design/heating-flow.html`.
- **Phone and SMS** (`fona_enabled`, FONA GSM gateway, mission critical), **git proxy**,
  **alarm panel** (integration only), **kiosk mode**, **firmware server**, **people**,
  **dashboard helpers**.

Each module's maturity is defined once in `app/src/casa_mia/maturity.json`;
`tools/maturity.py --update` writes it into the option descriptions and the docs.

| Path | What it holds |
|---|---|
| `app/src/casa_mia/` | The app (Python 3.11); `modules/` one package per module. |
| `app/web/` | The admin UI (React), built into `app/src/casa_mia/web/`. |
| `integration/custom_components/casa_mia/` | The integration (and its children). |
| `integration/cards/` | Lit cards and the Tablet Layout view, built into `www/cm-cards.js`. |
| `docs/` | User docs: `README.md`, `applets/` (one page per module), `architecture.md` (charter). |
| `BACKLOG.md` | Planned work, each item dated "asked <date>". |
| `BACKSTORY.md` | The owner's own notes on why this exists. Theirs to edit. |

## The camera modules

The old Camera Dashboard was split three ways (2026.10.4). Option keys didn't change;
labels did: `compositor_enabled` is **Camera Commander**, `camera_dashboard_enabled` is
**Auto Dashboards**, and Cameras is on when either is.

- **Cameras** (`modules/cameras.py`, `cameras.json`): each camera's channels, motion sensor,
  motion detection switch, thumbnails and a live view dialog. Saved at once.
- **Camera Commander** (`modules/commander/`: store.Base → live.Live → api.Commander,
  `commanders.json`): saved straight to live; writes `compositor.json`. Track motion has
  **Never takes over** (`motion_ignore`).
- **Compositor** (`modules/compositor/`: Generator → PictureServer → Compositor; gatherer
  Cache → Fetcher → Survey → Monitor → Gatherer): draws each commander as one picture from
  go2rtc streams.
- **Auto Dashboards** (`modules/auto_dashboards/`: Base → Backups → Deploys →
  AutoDashboards): a draft built from the other pages, deployed as the camera dashboard.
- **Integration:** each commander is a device with a Main camera select and a Track motion
  switch (`motion.py`). The device keeps its old identifier (`DEVICE_KEYS` in
  `sensor.py`); the old `/camera-dashboard/` paths still route to `/commander/`.
- **The card** draws the motion dot in CSS (`motion.ts`). Its editor strips defaults, so a
  saved card holds only what was changed. After an app restart it starts a fresh stream by
  itself (each view carries `run`, and the app fires `casa_mia_settings_changed` 2 s after
  starting).

## Sensor Watch

- **App** (`modules/sensor_watch/`: store → scans → groups → api): records in
  `sensor-watch.json`, profiles (`profiles.py`; followers stored as pointers, sent
  resolved), the shipped library (`library.json`; `tools/library_table.py` writes the
  guide's table), groups (saved filters, synced on HA's registry events), suggestions from
  recorder statistics, Scan my house. `live.py` holds the websocket to HA and pushes each
  save to the integration (the `casa_mia/sensor_watch/apply` command, handled by the
  integration's `push.py`; the full set only to resync).
- **Integration** (`casa_mia/sensor_watch/`): `levels.py` holds the one evaluator, with no
  HA imports (accuracy, escalation); `watch.py` tracks states, hold-offs and timers, fires
  `casa_mia_sensor_watch`; status, counts and problem entities; the `list` service; device
  triggers; `blueprint.py` installs and keeps up **Notify on Sensor Watch**.
- **Page:** the band editor holds a numeric record's bands as a ladder out from nominal
  (`app/web/src/sensor-watch/ladder.ts`, run in node by `tests/test_sensor_watch_ladder.py`);
  the stored format is bands, and `common.py` `_ladder` refuses anything else on save.
- **Cards:** `custom:casa-mia-sensor-watch` (hides when clear), and the eye in HA's entity
  dialog (`cards/src/sensor-watch/eye.ts` patches `ha-more-info-dialog`; a tap leaves a note
  through `app/web/src/open.ts` and hops to the app's panel, which opens the editor).

## Guest login

`modules/guest_login/`, layered: `common.py` → `signin.py` (HA's login flow, 2FA,
sessions) → `login.py` (the guest port's pages, opening and closing, the audit's `_note`);
`codes.py` (QR codes, guest card) → `api.py` (the admin API; `_closed`: rotate, then sign
out after `GOODBYE_GRACE` 8 s); `reach.py` (the check and its fixes), `audit.py` (the
sign-in log), `printing.py`, `page.py`, `supervisor.py`.

- **Sign-out:** `HA.sign_out` deactivates then reactivates the user (removes its refresh
  tokens, closes its sockets). It follows the login, never an admin. **Who's signed in**
  signs in as the login, lists `auth/refresh_tokens`, revokes its own token.
- **The goodbye:** `guest-goodbye.ts` (in every page) reads the Access switch's attributes
  and moves the page before the sign-out.
- **One "ask me now" event:** `settings.CHANGED_EVENT` (`casa_mia_settings_changed`); the
  integration answers with `async_refresh`. Reuse it; don't add another.
- **Never stored in the audit:** passcodes, codes, secret addresses.

## The rules that bite

CLAUDE.md has them all. What trips agents here:

- **RULE MINUS ONE:** invent Oak Tree, Barn, 07700 900xxx, 192.0.2.x; "Rosa Place" is the
  screenshot stand-in for the house. Addresses, passwords and tablet details the owner
  gives in chat stay in the scratchpad. Scan the staged diff and the message first.
- **RULE ZERO:** bump first, and only when HEAD holds the current version.
- **Git:** commit only when asked, gated
  (`if .venv/bin/pytest -q > $SCRATCH/pt.txt; then git commit ...`); push only when asked.
- **The live HA box:** read its logs and config shares freely; change nothing without
  agreement. Never print tokens from `kiosks.json` or the VNC password.

## Lessons learned (working practice not in CLAUDE.md)

- **Codex shares this checkout.** Before bumping, check `git status`: don't bump over
  Codex's uncommitted bump; stage only your own files when it has work in progress.
- **Confirm a feature before building** when the owner says so: restate it with your
  choices, and wait. They review UI on the box before the next iteration; change nothing
  while they look.
- **Rename labels, not keys.** Option keys, store keys and device identifiers outlive their
  names. Likewise **don't recreate entity ids** (a red herring in 2026-10-19's camera hunt).
- **The restart Repair** reads the loaded version at import, so an entry reload can't clear
  it; it can need a page reload to appear.
- **Don't rewrite JSON or YAML through a parser** (`en.json`, `maturity.json`): it reformats
  them. Edit as text, and check the diff of any regex edit.
- **Default-stripping editors:** a saved card keeps old values, so a changed default doesn't
  reach it. The owner's two commander cards still hold `tap_main: live`.
- **`Field` is a `<label>`:** a click on anything non-interactive inside it clicks its first
  button (`Chips` cancels that).
- **HA's visibility is decided in core since 2026.9:** read a section's `hidden` attribute
  and `section-visibility-changed`, not private methods.
- **`clip-path` makes an element a backdrop root:** a `backdrop-filter` inside it sees
  nothing behind. Clip the blurred element itself.
- **Safari allows about six connections to HA:** another window holding them makes a Save
  hang silently. Read in the Companion app and edit in Safari to keep them apart.
- **Mid-release fixes stay out of `app/` and `integration/`:** `fake_git_host.py` would
  bump on top of the release commit. CI fixes go in `tests/` and `.github/`.
- **Cards copied to the box last until the app restarts** (it restores its bundled
  `cm-cards.js`). Check with `cmp`.
- **Screenshot swap replaces text, not pictures:** swap before drawing a QR code, and turn
  swap off to scan one.
- **Screenshots:** capture the HA app window with `screencapture -l <window id> -o -x` (the
  id from a CGWindowList Swift snippet; it changes when the app restarts), then
  `cwebp -q 82 -alpha_q 100 -resize 1600 0`. Phone shots go in an iPhone frame by a
  Pillow script (rewrite it, or ask to keep it in `tools/`). Check each for real names, and
  `webpinfo` for EXIF or XMP. Decode a QR in a shot with macOS Vision to prove where it
  points.
- **Real-HA checks** run in a scratch harness (Python 3.13,
  `pytest-homeassistant-custom-component`), not in the repo.
- **UI checks without the box:** serve the built page with `make_server` and drive it with
  the Playwright in `../advanced-camera-card/node_modules` (the cached Chromium), mocking
  the API with `page.route`; a websocket (Remote control) passes through to the local
  server.
- **A reinstalled app can lose HA's update entity** until the Supervisor integration is
  reloaded or HA restarts: HA's doing.
- **Before claiming something is new,** search HA's frontend (issues, PRs, discussions) and
  HACS's default `plugin` list; the owner asks.

## How to work with the owner

- An expert who works fast. Act, then report briefly; recommend rather than survey. Build
  only what was asked; ideas go into `BACKLOG.md`.
- "App", not "add-on". Nothing only on hover (pages are used on an iPad). Safari hard
  refresh is ⌘⌥R.
- They edit the README and docs alongside you: read a section before replacing it.
- Screenshots: the whole HA window, WebP at 1600 px, into `docs/screenshots/`; for a set-up
  shot give only the steps for it, then stop.
- Reliability work goes one agreed step at a time (see "Where things stand").

## The dev loop

- **Deploy:** commit with a bump and keep `tools/fake_git_host.py` running; the owner
  installs the offered update. An integration change needs an HA restart.
- **Cards with no restart:** copy the built `cm-cards.js` to
  `/Volumes/config/custom_components/casa_mia/www/`, hard refresh; `tools/dev_cards` does
  it on every save.
- **The test VM:** a HAOS VM that installs Casa Mia from GitHub like a new user (ask the
  owner for its address; token in `~/.config/casa-mia/vm-token`, never printed). Drive it
  with Playwright, logging in by setting `hassTokens` in localStorage via `addInitScript`.
  The owner has tested the GitHub install there end to end: don't offer it again.
- **The wall tablets:** adb over Wireless debugging from the Mac only, with the owner's
  go-ahead; never online updates or the Play Store. The scratch scripts of 2026-10-30
  (VNC probe, port scan, setup, tidy) were throw-away; the steps are in BACKLOG's "Run the
  whole house from your desk".
- **The Pulls badge** reads `ghcr-stats.json` on the `stats` branch, written daily by
  `.github/workflows/ghcr-stats.yml`. One install is about 5 pulls; each release's
  "Verify public pull" adds 2.

## What happened

- **To 2026.10.5** (released): the Tablet Layout view; the Commander card with a live main
  picture; the compositor rebuilt as a pipeline and split into a package; the camera split;
  the integration split in three (`casa_mia` and its children, sharing a coordinator via
  `casa_mia/children.py`); maturity ratings; Run everywhere; garnish everywhere; the Over
  layer.
- **2026.10.6** (released): Guest login, all of its backlog (sign-out on close, 2FA,
  rotating addresses, the reach check, the goodbye, passcodes, the sign-in log), and its
  guide; the Pulls badge.
- **2026.10.7** (released): the HA floor lowered to 2026.3, read from HA's history, not
  tested (the test is in the backlog).
- **2026.10.8:** Sensor Watch built (b1), built out on the box (b2–b13) and made whole
  (b14–b28: profiles and the library, groups, the card, live push, attributes, Available,
  the blueprint).
- **2026.10.10:** one look for pills, chips and chrome (b7, b8); Sensor Watch joined the
  `casa_mia` integration (b4).
- **2026-10-12, the stuck-camera investigation** (`docs/never-silently-stuck.md`): "(live)"
  over a frozen picture, and a Save that hung silently. HA 2026.10.0's FFmpeg checked TLS
  against the recorder's self-signed certificate (fixed in HA 2026.10.1). Out of it: the
  purpose at the top of CLAUDE.md and RULE FIVE.
- **2026-10-19 and 2026-11-10, why the wall tablets show no live video:** see "Where things
  stand". 2026.11.2-b22 built the card's camera ladder out of it.
- **2026.10.11** (released; soft launch 2026-10-29): Sensor Watch pushed to the integration
  (b13), accuracy (b14), notifications in words and escalation (b15), the eye in HA's
  entity dialog (b16), the band ladder (b25), readied for launch and rated Beta (b26–b31);
  the Heating Flow card's System view (b20); the README ordered by usefulness.
- **2026.10.12-b1 to b5:** Tablet Layout fills and limits; kiosk screen thumbnails; Remote
  control of the wall tablets (b2), with a VNC check, Android's buttons and a pointer dot
  (b3), and Full window, 1:1 and Android Settings (b4). droidVNC-NG was set up on every
  wall tablet on 2026-10-30. b5: dialogs portalled to `<body>` (a dialog inside another
  closed both) and toasts in the top layer (they were under the backdrop); Sensor Watch's
  group prompt from a new watch and the passed-over callout; the Wall tablet CPU profile;
  the eye's tooltip with the message; a row's last VNC answer; the
  `docs/run-the-house-from-your-desk.md` guide. b6: scripts survive running before
  `window.hassConnection` exists (HA imports them separately; `cards/src/connection.ts`), and
  `#BACK` stays put on the page a visit began on; Heating Flow's scale reaches −15 °C (indigo,
  off-black) and Glass draws the coldest water at full strength.

## Where things stand

- **Never silently stuck: go one step at a time** (2026-10-12). The owner wants it slow and
  methodical: one agreed step, built, recorded in `docs/never-silently-stuck.md`, seen on
  the test tablet, never redone; nothing planned beyond it; analyse before code, change
  nothing while investigating. Steps 1–3 done. Step 3 (2026.11.2-b22, 2026-11-10) is the
  first three rungs of the camera ladder for the Commander's main camera, built on the
  owner's "get on with it" and not as a step agreed beforehand. Its card bundle was copied
  to the live box that day; **what the wall tablets show hasn't been reported yet**, and
  its `live_report` websocket command has never run on HA. The next step is the owner's.
- **The wall tablets' live video** (investigated 2026-10-19 and 2026-11-10):
  - **Causes:** the old card gave up after two failed starts until the page reloaded
    (fixed in step 3). And the cameras' streams are H.265 (seen in go2rtc's stream list),
    which go2rtc answers with no video at all for a browser that didn't offer H.265 (seen
    with headless Chromium). On 2026-11-10 b22's card said exactly that on every wall
    tablet but the test one, all the same model (Tab M9, Android 15). The one difference:
    the test tablet's Android System WebView had been updated by hand over adb to 157 on
    2026-10-28; the others were on the factory 131. 157 was installed on the other three
    the same way (`adb install -r` of the APK pulled from the test tablet), and the main
    camera came up "(live)". The same APK then worked on the three Tab M10 3rd gen
    (TB310FU, Android 13, factory WebView 126), so all seven wall tablets run 157 and show
    "(live)" (2026-11-10). After an install, check Kiosk Satellite is running: on one
    tablet it stopped and stayed stopped because Settings was in front.
  - **The tablets have no Play Store**, so WebView never updates by itself (BACKLOG).
    Rollback for one tablet: `adb uninstall com.google.android.webview` (back to 131).
  - **Not fixed:** the Cameras live view (`LiveView.tsx`) now names an unplayable format,
    but has no timeout and no MJPEG fallback.
  - **Open:** whether a stalled WebRTC stream can fool the lease (`requestVideoFrameCallback`
    on a repeated frame); if seen again, compare screencaps and renew only when
    `rtpTimestamp` moves. go2rtc's API is on the box's port 1984, RTSP on 8554; a UDP STUN
    probe from the Mac proves nothing, so don't repeat it. Headless Chromium connects only
    the first pair of WebRTC peers made in one page, so a second session can't be tested
    with same-page peers: use a real go2rtc.
- **Remote control** (2026.10.12-b2 to b5): working on every wall tablet, Android Settings
  included. DuraSpeed is off on every Tab M9 (2026-10-31), but the last two haven't been
  rebooted since, which clears Android's mark against KS. Kiosk Mode was switched off on the fleet leader for the setup walk: check it is back on.
  What's left, the after-reboot routine and the helper app idea are in BACKLOG.
- **Sensor Watch** is Beta and released, in daily use on the box. A camera group watches
  every camera channel (Available, a task) with a 0 hold-off the owner set for testing; the
  level is to be revisited. Confirm b31's `…` fix after an HA restart.
- **Untested on the box:** 2FA against a real user, the reach check's fixes, Who's signed
  in.
- **Soft launched 2026-10-29** (release 2026.10.11) to the owner's Gecko integration users:
  a Share your Projects topic,
  https://community.home-assistant.io/t/casa-mia-a-home-assistant-app-that-grew-out-of-my-hot-tubs-reminders/1030841,
  and a reply in the owner's Gecko thread,
  https://community.home-assistant.io/t/gecko-in-touch2-integration-spa-wireless-remote-control-module/150764.
  Feedback comes there and as GitHub issues. The topic asks whether people want one app or
  parts on their own (the backlog's appetite gate), and promises a Heating Flow guide next
  release: edit the topic to link it once it's out.
- **Casa Mia is non-commercial, always** (the owner's commitment); the MIT licence stays.
- **Seen occasionally:** "Invalid configuration" on a card that clears after a refresh.
  Possibly HA frontend issue #53890. Unconfirmed; watch for it.
- **Loose ends:** move the card's motion test into the cards' `npm test`; HA warns about
  `via_device` in commanders' DeviceInfo (until 2027.8); the compositor's log lines give
  viewers' addresses only; the Tablet Layout guide's examples.
- **Talk from the Commander card** (2026.11.2-b2, 2026-11-05): `commander/talk.ts`, a
  layer over `live.ts`; the card was split into base → live → talk → card. Built and
  unit-tested, **not yet tried on hardware**: the owner's six acceptance checks (two
  tablets and the iPhone) are still to do, with measured talk-to-audible delays.
- **Intercom and Protect Talkback moved in** (2026.11.2-b20, 2026-11-09) from the owner's
  separate intercom repo (its `intercom_talkback`, up to 2026.11.1-b11; that repo's app
  was only an installer, so nothing of it came over). Split in two children, each
  following an integration-only app module as `alarm` does:
  - `casa_mia_intercom` (module `intercom`): the calls and the WebRTC offer/close
    patches. A doorbell is any device with a doorbell event entity and a camera, found
    in the entity registry (reloads when one comes or goes), so it no longer knows about
    Protect. Entities are keyed by HA device id. Its `call` websocket command (the
    timer) has **never run on HA**.
  - `casa_mia_protect_talkback` (module `protect_talkback`): one entry per console, the
    go2rtc config and stream patches, the two-way flag, `talk.py` (must stay
    executable; a test checks). Delete it when go2rtc PR #2340 and HA's UniFi Protect
    two-way audio land (BACKLOG).
  - Shared: `casa_mia/patching.py` (Patches: apply, put back, Repair on failure; and the
    refusal to set up beside an enabled `intercom_talkback` entry). Brands from
    `tools/brand_children.py`.
  - **Cutover on the live box:** leave the old app and integration installed with its
    entry disabled until these are proven, then remove them.
- **Next:** the owner picks from BACKLOG. Nested sections wait until HA ships them (don't
  build ahead of HA).
