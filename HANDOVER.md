# Handover: Casa Mia, for agents joining the work

Where the project stands and how the work is done here, as of 2026-10-20 (`dev` at
2026.10.11-b11; 2026.10.10 released). **Read this at the start of every
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
- **2026.10.6-b11:** the install count (release notes fetched by the app) removed; the
  README's **Pulls** badge reads `ghcr-stats.json` on the `stats` branch, written daily by
  `.github/workflows/ghcr-stats.yml` (actionstore/ghcr-stats scrapes each image's package
  page, in a job with no token; our own job sums and force-pushes). Measured on the VM:
  one install = about 5 pulls, and each release's "Verify public pull" adds 2.
- **2026.10.7** (released): the HA floor lowered to 2026.3 (read from HA's history, not
  tested; the test is in the backlog).
- **2026.10.8-b1: Sensor Watch** (in development, untested on a real HA): app
  `modules/sensor_watch/` (common → suggest, history → api: records in
  `sensor-watch.json`, suggestions from recorder statistics or state history, Scan my
  house in rounds of 500) and a fourth component, `casa_mia_sensor_watch` (levels.py has
  no HA imports and holds the one evaluator; watch.py tracks states, hold-off, event
  `casa_mia_sensor_watch`; status, counts, problem; `list` service with a response, which
  the page also uses for live levels). Built for thousands: `/health` carries only a
  revision, the integration fetches `/sensor-watch/records` (the server's new `reads`)
  when it moves; attribute-only updates stop at once; summary cached; entity writes
  coalesced to one a second.
- **2026.10.8-b2…b13: Sensor Watch, built out on the box** (the owner uses it daily):
  exact states with exceptions, defaults by device class, HA's own health (Recorder and
  History critical; failing integrations, with ignores), the Home tile's health, a
  chip-filtered watched list with bulk follow/stop, any entity (`kind_of` by domain), band
  profiles (`profiles.py`: followers stored as pointers, sent resolved; made, edited and
  applied from the Profiles section), 255-character messages, inserting bands and checks
  on save. The page's level fields live once in `web/src/sensor-watch/levels.tsx`, shared
  by the sensor and profile editors.
- **2026.10.8-b14…b28: Sensor Watch, made whole (now Alpha):** profiles managed, imported,
  exported and shipped (`library.json`, 80; `tools/library_table.py` writes the guide's
  table, a test keeps it in step); `api.py` split (store → scans → groups → api); groups
  (`groups.py`: saved filters plus a profile or the defaults, `sync()` each minute and on
  HA's `entity_registry_updated`, left-out remembered); chip filters everywhere with minus
  words, and floor, maker, model and category; on/off as When off / When on; the
  `custom:casa-mia-sensor-watch` card (hides when clear; example rows in the card
  picker); instant updates (the card and `live.py` hear the integration's event; entity
  writes at once then every 0.2 s); a record may watch an `attribute`; a fourth kind,
  `available` (either way round); the event carries group, area and attribute; the
  integration installs and keeps up to date the **Notify on Sensor Watch** blueprint
  (`blueprint.py`: groups and notify actions filled in as dropdowns); the screenshot swap
  covers what the integration shows (`swap.py`, the app's rule); the page polls at most
  once a second (a busy loop hung Safari). Proven on the VM: the blueprint end to end.
- **2026.10.11-b6…b11:** README ordered by usefulness with maturity chips, thanks, "What
  does the future hold?"; the Sensor Watch blueprint valid on HA 2026.10 (`sequence:
  !input more`, b7); Sensor Watch's hold-off timer ran off HA's loop, so a held level
  fired no event and told nobody (the blueprint's silence) — fixed with `callback()`, plus
  better news at once, **Unavailable for** (5 min default), and timing from the entity's
  last changed (b8); guest login's **Waiting for first login** binary sensor (b9); the
  Sensor Watch card's icon and drag-to-order parts (b10); the Commander's "(live)" as a
  lease (b11, steps 1 and 2 of `docs/never-silently-stuck.md`).
- **2026-10-12 evening, the stuck-camera investigation** (all in
  `docs/never-silently-stuck.md`): a tablet showed "(live)" over a picture frozen for
  hours; a Sensor Watch Save hung silently (Safari's ~6 connections to HA used up by
  another window, refreshing it let the Save through). Cause: HA 2026.10.0's FFmpeg 9
  checks TLS, the recorder's `rtsps` certificate is self-signed, so streams HA opens itself
  fail and the camera entities flap (core #184775, fixed in 2026.10.1, which has its own
  snapshot issue #185706). Only channels HA streams itself flap (our compositor's medium
  warm-up, the advanced-camera-card's `ha` cameras); go2rtc still works. (The box has
  since moved to 2026.10.2, and those warnings are gone.) Out of it: the purpose at the
  top of CLAUDE.md (a helpful home: every problem known) and RULE FIVE (safe by
  construction: a claim of working is a lease).
- **2026-10-19, why the wall tablets show no live video** (investigated over adb; nothing
  changed on the box, tablet or repo). Found:
  - **Cause (strongly indicated, not proven on the tablet): H.265.** go2rtc's RTSP
    DESCRIBE on every stream it had registered (read-only, port 8554 on the box) showed
    H265. The tablet's Android WebView (131) generally cannot decode H.265 over WebRTC, so
    no video track arrives: the Cameras applet's live view shows 0 × 0 and "Connecting…"
    for ever. A camera with H.264 low and medium channels played those two and hung only
    on its H.265 high. Desktop browsers play H.265, which is why the Mac "works".
  - **Ruled out:** the network (the tablet sits on an IoT VLAN with no internet; TCP to
    HA 8123, go2rtc 8555 and 1984 all open, and an H.264 camera plays, so UDP gets
    through); the entity-id oddities in the registry (medium channels re-created or
    renamed around the HA 2026.10.0 update; a red herring, so **don't recreate entity
    ids**); a stale or diagnostic cards bundle (the box's `cm-cards.js` equals the
    committed one; the card has only two `console.info` lines). The Cameras page's
    Channels column leaves out the camera's own entity (the low channel) by design.
  - **Gaps:** the other cameras' codecs (go2rtc registers a stream only when HA is asked,
    so they were not listed: open a camera's live view on the tablet and list
    `/api/streams` again); the WebView's H.265 support is unconfirmed; one observed case
    of the card saying "(live)" over a frozen picture (a tablet had the lease code, the
    frame was stamped a minute old) was never caught again, so whether the lease can be
    fooled by a stalled WebRTC stream (`requestVideoFrameCallback` firing on a repeated
    frame) is open. If it recurs, sample the tablet with `adb exec-out screencap` and
    compare the main picture's pixels; renew the lease only when the frame's `rtpTimestamp`
    moves, if so.
  - **Relief that already exists, needing no code:** the Camera compositor page's **Live
    main camera** switch (system-wide, saved, cards follow within a second). Off, every
    card shows the compositor's drawn picture (about two a second). The owner was told;
    whether they switched it off is not recorded.
  - **Defects found in our code** (all in the backlog's spirit, none built): the Cameras
    live-view dialog (`app/web/src/LiveView.tsx`) picks WebRTC from HA's capabilities and
    then waits for ever, with no timeout and no MJPEG fallback (MJPEG goes over TCP 8123
    and would work); the card's live failure goes only to the tablet's console, falls back
    silently, and gives up for good after two failures until a reload (`LIVE_GIVE_UP`);
    the card gets no channel availability or codec information.
  - **Proposed next step, awaiting the owner's go:** one shared WebRTC check in
    `app/web/src/webrtc.ts` (stage timings: config, offer, answer, ICE state, first frame;
    a codec check with `RTCRtpReceiver.getCapabilities` before trying; a timeout; a plain
    verdict, such as "this device cannot play H.265"), used by the Cameras dialog (fall
    back to MJPEG and say so), the card (a pill with the verdict; the give-up lapses) and a
    report to the app's log, so Sensor Watch can see it; and the same Live main camera
    switch on the Commander page. Needs a version bump first.
  - **For the owner (UniFi Protect):** set the H.265 channels the tablets use (medium) to
    H.264 where the camera model allows it; not checked which models do.
  - **How it was done, for the next session:** the test tablet is on adb (`adb devices`);
    `adb exec-out screencap -p`, `adb logcat -d | grep chromium` (WebRTC logs there, but
    the card's `console.info` lines are not visible without DevTools: no socket is open).
    go2rtc's API is on the box's port 1984 (`/api/streams`), RTSP on 8554. A UDP STUN probe
    from the Mac proved nothing (no reply to any STUN, even from outside), so don't repeat
    it.
- **2026.10.11-b13: Sensor Watch's records pushed** (step one of the backlog's "Sensor
  Watch's records: pushed, then owned by the integration"; not yet on the box). The app
  pushes each save over `live.py`'s websocket (the integration's
  `casa_mia/sensor_watch/apply`, `push.py`): only the records changed, from the revision
  the integration has. Every record is sent on connecting, after a refusal (`resync`), and
  for profile and group saves. The answer carries the changed records' levels. The Home
  tile reads the integration's own Status and count entities (`status.summarise`).
  `tests/test_sensor_watch_push.py` runs the real feed against a stand-in HA websocket.
- **2026.10.11-b14: Sensor Watch accuracy** (the backlog's "Accuracy" item; not yet
  on the box). A numeric record or profile may carry `accuracy` {amount, percent};
  `levels.in_bands` holds the current level within it of an edge (worse only once
  surely past, better at the real edge, the start the better way), so `level_of` now
  takes the current level. The library's mains voltage profiles have ±1 %.
- **2026.10.11-b25: the band editor as a ladder** (the backlog item of 2026-10-29; not
  yet on the box). The editor holds a numeric record's bands as a ladder out from nominal
  (`app/web/src/sensor-watch/ladder.ts`: `toLadder`, `toBands`, `problemOf`, `nudge`; run
  in node by `tests/test_sensor_watch_ladder.py`, so it imports types only, and the
  levels' order and names moved there, re-exported by `common.ts`). The stored format is
  unchanged. The app's `common.py` `_ladder` refuses anything else on every save path;
  loading never runs `clean`, so old records with gaps still load, and the editor opens
  each gap as a band at `otherwise`. "Outside every band" is now **Not a number**.
- **2026.10.11-b26…b30: Sensor Watch readied for the soft launch** (2026-10-29). A row
  click opens its editor in Watched, Profiles and Groups (`opens()` in `common.ts`; Edit
  buttons gone). The page explains itself: `about.tsx`, a fold with the parts, how you
  hear and where to start, and the start steps in an empty list (the group dialog's open
  state moved up to `page.tsx` for it). Follows is now **Levels from**. Guide read end to
  end; editor, card and notifications screenshots retaken (watched list, group, library
  and blueprint kept: the owner's setup is too big to recompose). The event, the List
  service and the blueprint's text carry the value's `unit`. Seen on the box 2026-10-29
  (b31, now Beta): units in a notification, the fold's Blueprints link (`target="_top"`,
  the first link out of ingress, works), and Nominal's aligned message box.
- **2026.10.11-b16: the eye in HA's entity dialog, and editor fixes** (on the box 2026-10-27; the owner: works a treat).
  `cards/src/sensor-watch/eye.ts` patches `ha-more-info-dialog`'s `updated` and puts
  `casa-mia-watch-eye` just after the `headerTitle` span (outside the template's parts,
  so HA's redraws leave it), slot `headerActionItems`, in the `info` view only; the same
  slots from HA 2026.3 to 2026.10. It subscribes to `casa_mia/sensor_watch/entity`
  (admin; `levels.watching`). A tap leaves a note in localStorage (`app/web/src/open.ts`,
  hashed into both builds) and navigates to the app's panel (found by `config.addon`
  ending `casa_mia`); the page takes the note and opens the editor. Checked: the command
  under real HA (scratch harness), the note on the app run locally (headless Chromium).
  Seen working on the box (2026-10-27): the eye's placement and the panel hop. The blueprint lost its `source_url` (Spook kept offering an "update").
  Running the app on the Mac for UI checks: see the UI review item in the backlog.
- **2026.10.11-b15: notifications in words, and escalation** (not yet on the box).
  The blueprint's titles lead with the level as a word, and a `notify.mobile_app_…`
  action gets the phone's own severity (Android channels per level, iPhone interruption
  levels, a tag per sensor). Escalation: `escalate` {level: seconds} on a record or
  profile; `levels.escalation` works out the shown level from the real one and how long
  it has stood; `watch.py` keeps `real` beside `level` in each row, compares with the
  real one, and sets one timer per sensor for its next step. Checked under real HA in a
  scratch harness (Python 3.13, pytest-homeassistant-custom-component), not in the repo.
  Levels found at a level (start, an edited watch, Refresh state) fire the event too,
  with `initial`, held until HA has started (`async_at_started`); the blueprint raises
  the sidebar's notification again but leaves the phone alone.
- **2026.10.11-b20: the Heating Flow card, System view** (built 2026-10-28 overnight; not
  yet on the box; uncommitted for the owner to look at). The design was settled in the
  playground `docs/design/heating-flow.html` (scripts in `docs/design/heating-flow/`);
  the card is its System view ported to `cards/src/heating-flow/`: `engine.ts` (geometry,
  colour, sensor placement; pure, tested under Node), `draw.ts` (pipes drawn as one
  network: every wall, then every fill, so tees join; ends square-capped; crossings on
  top with a gap), `parts.ts`, `system.ts`, `common.ts` (options; each entity a reading,
  not current when unavailable or silent past `stale_hours`; flows and priority from the
  states), `card.ts` (fires HA's `hass-action`), `editor.ts` (ha-form, one fold per
  area; sensor lists are ordered entity pickers). Checked: card tests, and the built
  bundle rendered in a scratch harness with invented states (light, dark, faults, a tap).
  Not yet seen under real HA: the editor's folds and entity lists, and `hass-action`.
  Next: the Heat pump and Rooms views (the playground has both), which add view buttons.

## Where things stand

- **Never silently stuck (2026-10-12): go one step at a time.** The owner wants it slow and
  methodical: one agreed step, built, recorded in `docs/never-silently-stuck.md`, seen on
  the test tablet, never redone; nothing planned beyond it; analyse before code, and change
  nothing while investigating. Steps 1–2 done (the Commander's "(live)" lapses into red
  "Live lost … ago"). The doc holds the findings, the cause, and ideas (the camera ladder
  of degradation with status pills, escalation with an Escalation-handler blueprint and
  remedy tools from the Cameras applet, the goal of gathering a fault's evidence in one
  place for users). The next step is the owner's to choose; the 2026-10-19 findings above
  (H.265 on the tablets) argue for the shared WebRTC check. The test tablet is on adb and
  its Kiosk Satellite API (`/api/console`, `/api/logs`; console keeps only the first 300
  entries).
- **Paused: the owner's Sensor Watch migration** (old error/warning/task tiles into Sensor
  Watch, to prove it before its release); it stopped when Save hung. Read entity ids in the
  Companion app and edit in Safari (separate connection pools) to dodge the hang. A camera
  group now watches all 88 camera channels (Available, a task; its 0 hold-off is the
  owner's, for testing; the level is to be revisited).
- **Sensor Watch is Alpha, in daily use on the box, heading for release:** the README
  section, the guide's opening and worked examples are written, and six screenshots taken
  on the box with the swap on (b31). Still to do: the notifications shot (the blueprint's
  silence was likely the b8 timer bug: check on the box first), re-taking the page and group
  shots once the subtitle changes, confirming b31's `…` fix after an HA restart, then a
  release. Its
  backlog section "Sensor Watch (alpha)" holds what's next (stale sensors, `list` by
  label, "Watch in Sensor Watch…" from HA's dialog, templates, dependencies, counted
  availability rules, export to native HA); none of it blocks the release.
- **Sensor Watch joined the Casa Mia integration (2026.10.10-b4):** its code is
  `casa_mia/sensor_watch/`, its entities on a Sensor Watch module device; on first start
  Casa Mia moves the old integration's entities over (`migrate()`: same entity ids) and
  removes its entry, and the app deletes the old folder. Untested on a real HA until the
  owner installs it: watch the log for "Sensor Watch joined Casa Mia".
- **One look for pills, chips and all the chrome (2026.10.10-b7, b8):** pills and chips
  from `app/web/src/pills.css`; the rest from `ui.module.css` and `styles.css` (the
  browser's checkboxes, radios and sliders drawn as ours), with `Select`, `Slider`
  (`controls.tsx`) and `confirmBox`/`askBox` (`confirm.tsx`) in place of the browser's
  drop-downs and boxes (a test keeps them out). The owner's cheatsheets, an Id per style,
  link the live CSS: `docs/design/pills-and-chips.html` and `chrome.html`. b8's admin
  pages are unchecked on the box until it's installed; the cards were copied there.
- **Card picker previews:** the Over layer's showed on the VM; check on the box after a
  restart and hard refresh. The Commander's (drawn full size, shrunk) is unchecked.
- **Untested on the box:** 2FA against a real user, the reach check's fixes, Who's signed
  in. **The reach check's screenshot** is still to take: see the backlog (a swap-only
  dashboard list).
- **The owner tested the GitHub release install end to end** on the HAOS test VM. Don't
  offer to walk it again.
- **Soft launch, on hold:** the owner wants a good spell of testing and using it first
  (the backlog's Bugfest) before telling more people. The post is for HA Community → Share your Projects. Lead with the
  Tablet Layout, then the Over layer, then garnish (and now guest login). Say up front:
  needs HA OS or Supervised, it sends nothing home (the Pulls badge is GitHub's own
  count), it's one house's system made general.
- **Casa Mia is non-commercial, always** (the owner's commitment); the MIT licence stays,
  and what others do with it is on them.
- **The 2026.3 floor (b1 of 2026.10.7) is read from HA's history, not tested:** everything
  has run on 2026.10, and the test VM on 2026.9.4. The reasons are in `app/config.yaml`;
  the test is in the backlog. A reinstalled app can lose HA's update entity (no Update
  button) until the Supervisor integration is reloaded or HA restarts: HA's doing, not ours.
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
