# Handover: Casa Mia, for agents joining the work

Where the project stands and how the work is done here, as of 2026-11-10 (`dev` at
2026.11.2-b26; 2026.11.1 released). **Read this at the start of every session**, then
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
- **Love it or Loathe it:** see "Love it or Loathe it" below. Alpha.
- **Jukebox:** see "Jukebox" below. In development.
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
  **Never takes over** (`motion_ignore`). Arrange… was removed in 2026.11.5-b4 (owner,
  2026-11-11: it didn't work); the panels are set by hand. Its code is in git before then.
- **Compositor** (`modules/compositor/`: Generator → PictureServer → Compositor; gatherer
  Cache → Fetcher → Survey → Monitor → Gatherer): draws each commander as one picture from
  go2rtc streams.
- **Auto Dashboards** (`modules/auto_dashboards/`: Base → Backups → Deploys →
  AutoDashboards): a draft built from the other pages, deployed as the camera dashboard.
  It makes a live page for each camera and no page for a commander (owner, 2026-11-23,
  b8). Why: a new user took the generated commander page (one picture with a base64 tap
  zone over each tile) for the way to show a commander. A commander goes on a dashboard
  as its card; `docs/how-to/commander-on-your-home-page.md` is the worked example.
- **Integration:** each commander is a device with a Main camera select and a Track motion
  switch (`motion.py`). The device keeps its old identifier (`DEVICE_KEYS` in
  `sensor.py`); the old `/camera-dashboard/` paths still route to `/commander/`.
- **The card** draws the motion dot in CSS (`motion.ts`). Its editor strips defaults, so a
  saved card holds only what was changed. After an app restart it starts a fresh stream by
  itself (each view carries `run`, and the app fires `casa_mia_settings_changed` 2 s after
  starting).

## Sensor Watch

Its own integration, `casa_mia_sensor_watch`, since 2026.11.3-b2 (phase 2 of
`docs/design/marketplace-mirrors.md`). It runs wholly in Home Assistant, imports nothing
from `casa_mia` and works with no app. No app option: a user adds the integration.

- **Records** (`records/`: store → scans → groups → api, no HA imports): kept in HA's
  storage (key `casa_mia_sensor_watch`), profiles (`profiles.py`; followers stored as
  pointers, sent resolved), the shipped library (`library.json`; `tools/library_table.py`
  writes the guide's table), groups (saved filters, synced on HA's registry events),
  suggestions from recorder statistics, Scan my house. `source.py` answers what the
  records ask of HA.
- **`admin.py`** starts it and serves the page: one websocket command carrying the
  records' routes (`casa_mia_sensor_watch/api`), and pushed feeds (levels, summary, one
  entity's watch). A feed outlives the watcher: it says "not running" when Sensor Watch
  stops and sends everything when it starts again. All admin-only but the one entity's
  feed, which any signed-in user may have (the gauge card is on dashboards) and which
  carries the watch's bands. `records/setup.py` offers the set-up's groups (the page's
  `wizard.tsx` makes them with the ordinary routes).
- **Watching:** `levels.py` holds the one evaluator, with no HA imports (accuracy,
  escalation); `stale.py` holds one deadline per entity with a stale rule, set from its
  last report and looked at when due (a restart re-stamps every entity, so the message
  then says only "since Home Assistant started"); `watch.py` tracks states, hold-offs and timers, fires
  `casa_mia_sensor_watch`; status, counts and problem entities; the `list`, `refresh`,
  `snooze` and `unsnooze` services; device triggers; `blueprint.py` installs and keeps up **Notify on Sensor
  Watch** (still at `blueprints/automation/casa_mia/`, so automations made from it carry
  on).
- **A failed integration is one problem** (owner, 2026-11-22; 2026.11.12-b1). Why: one
  cloud's outage took every row of every card and of Status's list, and the newer, real
  fault sorted below all of them. `rollup.py` owns HA's own rows and puts unavailable
  sensors `under` their failed integration. All that counts, lists or tells leaves those
  with `under` out, so anything new that reads `watcher.now` must do the same.
  - **Never rolled up:** critical, a bad reading, or one already said until the
    integration's row stands in for it.
  - **Only `loaded` ends a failure** (`levels.track_failures`): a retry passes through
    setup in progress.
  - **`initial` means known before,** by what `kept.py` saved (storage key
    `casa_mia_sensor_watch_kept`), not "has no row yet". Why: new failures never reached
    a phone, and old ones did at every restart.
  - **Never fire nominal for anything that isn't proved well.** What no longer stands is
    `casa_mia_sensor_watch_withdrawn`, and whatever keeps a copy of the alerts drops it on
    that (Dash-Bored's `alerts.py`).
  - **Groups:** the integration's event is fired again per group (`for_group`), so a
    group's automations still hear.
- **Snooze** (owner, 2026-11-23; 2026.11.12-b2; `snooze.py`). Why: the roll-up made one
  cloud one row, but that row still held Status at error, so a fault after it changed
  nothing anyone could see. A snoozed row is marked `snoozed` ({until, by}) and, like
  `under`, is left out by all that counts, lists or tells.
  - **One control, until a time.** No Acknowledge and no Mute. Why: either can hide a
    fault for ever, and Ignore already says "never". Heads Up's Acknowledge (looked at
    2026-11-23) leaves the banner at its severity, which is the masking this removes.
  - **Any row below critical,** a sensor's as well as an integration's; never one rolled
    up (snooze its integration).
  - **A card may leave it off** (`hide_snoozed`, owner, 2026-11-23: the line was "in my
    face" on a dashboard). Off by default; the page and Status always show it.
  - **Never out of sight:** the card's line (the card doesn't hide while there is one),
    the page's Snoozed section, the Home tile, Status's `snoozed` and `snoozed_list`.
  - **It ends by itself** (`Snooze.judge`): at its time, said as "still failing, down 16
    days" and as a change; on a worse real level (not escalation, which is time alone, or
    every snooze would wake itself); on another kind of fault (`levels.fault`; "not
    loaded" is no kind, as every reload passes through it); and once the fault has been
    gone 15 minutes, so a flapping cloud doesn't cancel it and next month's isn't hidden.
  - **Automations go quiet unedited:** `watch._fire` withholds every event for a snoozed
    key, its recovery included, and what was said is withdrawn, never said to be back.
  - **Safe by construction:** every row set passes `watch._Rows`, which has `judge` mark
    it, so no path sets a row unjudged; and a row set after its time ends the snooze even
    if the timer was lost. Kept across restarts in `kept.py`.
  - **An action** (`snooze`, `unsnooze`), called as the signed-in user, so the row says
    who. The card offers it only with its `snooze` option, off by default: a dashboard is
    often a wall tablet anyone can reach.
- **Page:** a custom panel in HA's sidebar (`panel.py`, `/sensor-watch`, in an iframe),
  built by `tools/build_web` from `app/web/src/sensor-watch/` (entry `panel.tsx`, config
  `vite.panel.config.ts`) into its `www/`. It stays through a reload and leaves when the
  entry is deleted. `ha.ts` is its transport, `live.ts` the levels feed plus values from
  HA's `subscribe_entities`, redrawn at most once a second. The band editor holds a
  numeric record's bands as a ladder out from nominal (`ladder.ts`, run in node by
  `tests/test_sensor_watch_ladder.py`); the stored format is bands, and
  `records/common.py` `_ladder` refuses anything else on save.
- **Cards:** a bundle of its own, `www/cards.js` (`integration/cards/src/sensor-watch/`,
  `vite.sensor-watch.config.ts`): `custom:casa-mia-sensor-watch` (hides when clear),
  `custom:casa-mia-sensor-watch-gauge` (its arc is the watch's bands, pushed; `gauge.ts`,
  the maths in `common.ts`), and
  the eye in HA's entity dialog (`eye.ts` patches `ha-more-info-dialog`; a tap navigates
  to `/sensor-watch?watch=<entity>&at=<ms>`, which the panel reads off HA's address).
- **Where it meets Casa Mia**, only through Home Assistant:
  - **Handover** of a user who had it in `casa_mia` (to 2026.11.3-b1):
    `casa_mia/sensor_watch.py` `hand_over` finds the old device, fetches the app's
    `GET /sensor-watch/export` and starts this integration's import flow; its
    `migrate.take_over` then moves the device and entities, ids unchanged. A failure is a
    Repair, retried when `casa_mia` reloads.
  - The old service names and `casa_mia`-domain device triggers are passed on
    (`sensor_watch.old_services`, `casa_mia/device_trigger.py`); BACKLOG has their removal.
  - The screenshot swap's rule arrives by dispatcher signal (`casa_mia_swap`, asked for
    with `casa_mia_swap_ask`).
  - The app fires `casa_mia_components_installed` after writing newer files, which is when
    it checks for its restart Repair.
  - Casa Mia's Home tile follows the summary feed over `window.parent.hassConnection`, and
    shows only when Sensor Watch answers.
- **Tests:** `tests/test_sensor_watch_*.py` (no HA), and `tests_ha/` inside a real Home
  Assistant: added by hand, the handover, the old names.

## Jukebox

Its own integration, `casa_mia_jukebox`, since 2026.11.12-b6 (plan agreed with the owner,
2026-11-22 and 23; the rest of it is in `BACKLOG.md`). Standalone as Love it or Loathe it
is: wholly in Home Assistant, nothing imported from `casa_mia`, no app option, one entry.
Guide: `docs/applets/jukebox.md`. Only announcements are built.

- **It adds no media players** (owner, 2026-11-20): every room stays the Sonos
  integration's own entity.
- **`announce`** (`__init__.py`): chime, then `media`, then `message` as speech, to the
  rooms named or the entry's. It answers with each room's result (`pure.py` has the
  words), fires `casa_mia_jukebox_announced`, and the Last announcement sensor shows it.
- **`announce.py`:** `Jukebox` holds a lock per speaker (`_turn`, 30 s to wait, then
  `too_late`). A clip is `media_player.play_media` with `announce: true` and the room's
  volume in `extra.volume`; a room's volume is its number entity (`number.py`).
- **`speaker.py` listens to the speaker itself**, on port 1443, for the length of a
  clip. Why: Home Assistant's `play_media` answers before a clip has played, and a clip
  sent during another cuts it off (measured 2026-11-23; `pure.py`'s docstring has the
  measurements). The speaker's first report is an old clip, which `pure.Watch` passes over.
- **A clip changes nothing on the entity** (measured), so nothing is saved or restored,
  and Love it or Loathe it never sees an announcement. That stops being true for S1,
  which will need snapshot and restore (BACKLOG).
- **The chime** is `www/chime.wav`, made by `tools/jukebox_chime.py`, served at
  `/casa_mia_jukebox/chime.wav`.
- **Tests:** `tests/test_jukebox.py` (pure), `tests_ha/test_jukebox.py` (the action, with
  stand-ins for the speakers). A test that holds a clip must use plain asyncio tasks and
  its `settle()`: `async_block_till_done` waits for the held clip and hangs.
- **Not seen in a real Home Assistant yet** (2026-11-23): the tests and a run of
  `speaker.py` against a real speaker (subscribing only) are all there is. Not checked:
  the config and options dialogs, the chime's address reaching a speaker, and a whole
  announcement end to end.

## Love it or Loathe it

Its own integration, `casa_mia_love_or_loathe`, since 2026.11.7-b2 (design agreed with the
owner, 2026-11-13). Standalone like Sensor Watch: wholly in Home Assistant, nothing
imported from `casa_mia`, no app option. Guide: `docs/applets/love-or-loathe.md`.

- **Config:** an entry is a name, its players (many) and a delay; several entries can
  be added, a player in only one (owner, 2026-11-13: one entry manages many players,
  separate entries allow variation). A subentry per group of songs and per station
  (`config_flow.py`, HA's own add, change and delete screens). A group's device and
  select belong to its subentry; HA refuses a device shared between an entry and its
  subentries.
- **A group's feeling is state, not kind** (owner, 2026-11-13: "I love Xmas songs, just
  not in November"). Love, Loathe or Ignore, kept in the subentry's data and shown by
  its select (`select.py`) and its form; the group holds an action for loved and one for
  loathed (form sections). Any change saves the subentry, which reloads the entry.
- **Shipped lists fill the Songs box** (owner, 2026-11-13: "once used it's like you just
  typed it in yourself"). A new group's first step asks what to start from; nothing of
  the list is kept but its songs.
- **A person's groups and the `rate` action** (`rating.py`, b5): a group can belong to a
  person entity; `rate` adds the playing song to the caller's (or the named person's)
  loved or loathed group and removes it from the other. A person's loved group is the
  one set to Love, or that was before it was set to Ignore (`before` in its data).
  The thumbs card is in BACKLOG; buttons call the action for now.
- **`pure.py`** (no HA imports): folding, patterns (`title` or `title | artist`, `*`),
  `pick` (no `*` beats `*`, then love beats loathe, then group order), `with_song` and
  `without_song` for rating. Libraries are JSON in `library/`; `christmas.json` is the
  first.
- **`__init__._convert`** turns groups from b2 to b4 (never released) into today's shape
  and removes their switches; it can go once the boxes that ran those have moved on.
- **`engine/`** (a package since 2026.11.12-b4, layered as the compositor is: `base.py`
  what it is made from, its trail and storage; `volume.py` the change and its undoing;
  `stations.py` the switch and the return; `engine.py` the following of tracks; each
  extends the one below, and `common.py` holds what they share): follows `state_changed` on the players (pushed). At a new track it
  undoes the last action, then acts: volume by a percentage or mute until the next
  track, or a switch of station for some minutes. `undo` and `away` are kept in HA's
  storage, so a restart loses neither; unloading puts volumes and mutes back at once.
  It never puts back over a person's change.
  A station whose media type is `source` (`const.SOURCE`, ours) is one of the player's
  own sources by name, put on with `select_source` (`Stations._play`): a Sonos plays
  that as the favourite, with its name and picture, where an address arrives bare
  (2026.11.12-b5). `common.favourite` says which source a player is on, from its
  channel (a Sonos adds " • " and the show). The page's dialog lists `sources`.
  A volume is read with `_level`, never straight from the state: a speaker reports a
  volume late, so for `REPORT_LAG` after a change made here a report still showing the
  old volume is taken as late (2026.11.12-b3; consecutive ducked tracks halved it each
  time).
  `_back` forgets a return only once `play_media` has worked: a player not playing, not
  yet there after a restart, or refusing the call keeps `away` with `due`, and the
  return is made when it next plays (b24; before, the return was cleared first and lost).
  `afresh` judges what is playing now at every start, so at each save of a group,
  change of feeling and rating (owner, 2026-11-13: a song added to a list while it
  plays must be acted on then). Safe because unloading undoes volumes and mutes first.
- **Works against a real player** (owner, 2026-11-13, on b5).
- **Its pictures** (b8) are from the test VM, where stand-in media players
  (`custom_components/cm_demo_players`, on the VM only) give it Kitchen, Living room,
  Bedroom and Garden to watch, with the people Ann and Ben, the entry Downstairs and
  the dashboard `music-demo`. Keep them there for the next pictures.
- **Tablet Layout by itself** (b13, 2026-11-17): `integration/plugins/casa-mia-tablet-layout.js`,
  built by `tools/build_cards` from `integration/cards/src/alone.ts`, to be published as a
  dashboard plugin. `tools/mirror.py` makes its mirror (`PLUGINS`; the kinds' differences
  are in `tools/mirrors/texts.py`). Not published; what is left is in `BACKLOG.md` ("The
  layout bundle, next"). Alone it has nothing to set: garnish everywhere and the orientation
  conditions are on. With Casa Mia as well, `casa_mia/layout_resource.py` raises a Repair
  while the file is in the dashboard's resources (b16). Its version is stamped in the built
  file by `tools/component_versions.py`, as a component's is in its manifest. A change to the view, garnish or the Over layer must keep working with no
  integration answering (`own.ts`).
- **A mirror is its own home** (b12, 2026-11-17; HACS's review asked for it): a published
  component's manifest names its mirror for `documentation` and `issue_tracker`, the
  mirror's README is the whole guide, and the mirror takes its own issues
  (`docs/design/marketplace-mirrors.md`, "The mirror is its own home"). The review needs
  a release that publishes all three mirrors, then a re-request on each pull request.
- **The mirrors' READMEs** carry Casa Mia's set of badges under the title
  (`tools/mirror.py` `BADGES`: Stars, Downloads, version, Validated, Licence), and each
  release has the integration as a ZIP (`hacs.json` `zip_release`).
- **Alpha since b8** (owner, 2026-11-13): live in the owner's house, where it turned a
  loved song up and put the volume back afterwards.
- **b7 seen on the box by the owner** (2026-11-13): the thumbs card and its editor, the
  thumbs in a media player's dialog, the trail (page and Logbook), the Watching switch,
  who may rate and the notify blueprint. Notes below that say "seen outside Home
  Assistant only" are about how they were checked before that.
- **Published by itself** (b8; owner, 2026-11-13): in `components.PUBLISHED`, mirror
  `gazoodle/casa-mia-love-or-loathe`, made by `tools/mirror.py` at a release
  (`docs/design/marketplace-mirrors.md`). The dry run passes; nothing is published yet.
  So the "no downgrade" rule covers it, and its guide is the mirror's README: keep the
  guide's links and pictures ones the mirror can carry.
- **The guide's opening is the owner's own words** (2026-11-13), tidied: keep its tone.
  Under it a "Not built yet" line names what the opening promises that isn't there
  (adverts, the fade); shorten it as each lands.
- **Owner's rulings, 2026-11-13:** never give a group dates of its own (a feeling by the
  calendar is an automation's work; the guide has the YAML). The local radio station is
  a Casa Mia item, never part of this integration. Adverts are a nice-to-have, only
  where a station says so in its metadata (BACKLOG).
- **Songs played too often** (b6): a group's `repeats` (`times`, `hours`; 0 times is
  off). `pure.History` holds each entry's plays (folded title and artist, times), kept
  in the entry's storage and for 48 hours; a song heard again within ten minutes is the
  same play (two players on one station, a reload judging afresh). `engine.judge`: a
  group that names the song first (`pick`), else `pure.repeated`.
- **A person's first rating makes their group** (b6, `rating.py`): only for a person
  entity, found from the login or named in the call. A login with no person is refused,
  so a wall tablet can't make groups (the owner asked what stops it).
- **What happened** (b7; owner, 2026-11-13: "I saw the match, but not the action"):
  `trail.py` keeps each entry's last 100 lines in `hass.data` (they outlive a reload,
  not a restart), sends each to HA's Logbook (`logbook_entry`, against the Last match
  sensor) and signals the page's feed. `engine._note` writes the log line and the trail
  line together, so use it in place of `_LOGGER` for anything the owner should see.
  Every reason a match leads to no action has a line.
- **An entry's Watching switch** (b7, `switch.py`, option `enabled`): off, the engine
  starts but follows nothing; armed returns still fire. `_convert` removes the old
  per-group switches but must leave this one (it checks the unique id).
- **Who may rate** (b7; owner, 2026-11-13: "default none"): entry options `raters`
  (person entities) and `screens` (HA user ids that may name a person; a wall tablet's).
  `rating.refused` is the one check, used by the `rate` action and by the thumbs' feed
  (its `refused` words). An admin and a call with no login (an automation) may name
  any rater. `_convert` adopts the people who already own a group, once, when the
  option is absent. HA doesn't limit what a non-admin may call, so the selects and the
  Watching switch are only as private as the dashboards they are on; the guide says so.
- **The thumbs card** (b7): `integration/cards/src/love-or-loathe/`, built by
  `tools/build_cards` into the integration's own `www/cards.js`, which `cards.py`
  serves and loads into every HA page (the integration is standalone, as Sensor Watch
  is). `casa-mia-thumbs` is whole in itself (its own feed), so it can be reused in the
  entity dialog, which `dialog.ts` does for a watched media player (b7; `quiet`
  draws nothing where they could never be used). The feed, `casa_mia_love_or_loathe/song`, is any signed-in
  user's; it looks the entry up whether or not it is loaded at that instant, because
  every save reloads and the thumbs flickered. Seen outside Home Assistant only, with
  stand-ins for `ha-card`, `ha-icon` and the dialog.
- **The notify blueprint** (b6): `blueprints/notify.yaml`, written to
  `blueprints/automation/casa_mia/love_or_loathe_notify.yaml` at each start
  (`blueprint.py`), as Sensor Watch's is. A test holds it to the event's fields.
- **Its page in Casa Mia** (b6; owner, 2026-11-13: "better in Casa Mia", the same config
  with Casa Mia's UX). `app/web/src/love-or-loathe/`, route `#/love-or-loathe`, and a
  Home tile shown where the integration answers. No app Python: the page talks to the
  integration's websocket commands (`admin.py`, admins only) over the connection Home
  Assistant's own page holds (`app/web/src/home.ts`, as Sensor Watch's tile does).
  - The page keeps no copy. One feed, `casa_mia_love_or_loathe/view`, carries all it
    shows and is pushed at each change: the engine's `listen`, and HA's
    `SIGNAL_CONFIG_ENTRY_CHANGED` for every save, load and unload.
  - Changes (`save_group`, `save_station`, `remove`, `order`, `save_entry`) share the
    forms' checks (`config_flow.group_errors`, `taken`) and answer a refusal in the
    forms' own words, read from the translations.
  - **Order** is the entry option `order` (subentry ids; `engine.ordered`), since HA
    keeps subentries as made. The options form keeps it.
  - A command's subentry field is `subentry_id`: `id` is the websocket message's own.
  - Seen in headless Chromium with a stand-in for `window.hassConnection` and an
    invented view (wide and phone), not yet inside Home Assistant.
  - Not on the page: adding or deleting an entry, and browsing for a station.
- **Tests:** `tests/test_love_or_loathe.py` (matching), `tests_ha/test_love_or_loathe.py`
  (the page's commands too, through a websocket client).

## Topology

Inside `casa_mia`, wholly in Home Assistant (owner, 2026-11-18). Begun 2026.11.9-b23. The
brief, with the agreed contract and the order of building, is `docs/design/topology.md`.

- **The rules** are `casa_mia/topology/model.py`, with no Home Assistant in it: `check`
  (a save), `view` (the feed: `exits` and `broken` worked out once per change),
  `direction` (any spelling to one form, "sse"). **The glue** is `topology/__init__.py`:
  its Store, the `rev` check, the registry events that resend the feed.
- **Set up by `casa_mia`'s `async_setup`, not its entry**, so it answers while the app is
  down (the entry's first refresh fails then).
- **One invented house is the contract**, `tests/topology_cases.json`: the model
  (`tests/test_topology.py`) and the real storage and registries
  (`tests_ha/test_topology.py`) both pass it, and Dash-Bored's tests are to read it.
- **A save tells every page before it answers**, so a page's own feed has the new rev
  before its save's result.
- **The editor** is the admin page `app/web/src/topology/` (2026.11.9-b24), talking to
  Home Assistant through `homeConnection` as Love it or Loathe it's does; the Home page
  follows the same feed for its tile. A save sends the whole record, rebuilt from the
  feed (`savedOf`), so what is broken is dropped by the next save: it couldn't be saved.
  Room and floor names come from Home Assistant's registry lists, listed again on its
  registry events. Mermaid 12 is loaded only for the picture and has ELK built in (no
  `@mermaid-js/layout-elk`); it adds ~5 MB of chunks to the committed build, of which a
  flowchart fetches only its own.
- Next: Digs (step 3), then the guide, maturity and README (step 6).

## Dash-Bored

Its own integration, `casa_mia_dash_bored`, since 2026.11.8-b1 (2026-11-13; name and
sidebar label agreed with the owner). Standalone like Sensor Watch: nothing imported from
`casa_mia`, no app option, no entities. In development. Guide: `docs/applets/dash-bored.md`.

- **Every family gets every capability** (owner, 2026-11-17). When a capability is built
  for one family, add its row to the table in `docs/design/dash-bored-survey.md` and a
  backlog entry for each family that lacks it, in the same piece of work. Before calling
  a family done, read its column. Why: the Gazette had the weather and who is at home,
  and Aurora and the Console were built without either although both are in `House`,
  which every family is given. Nobody noticed until Aurora was compared with other
  dashboards. `tests/test_dash_bored_parity.py` enforces what it can read from the
  sources (the fields of `House`, a device's optional fields, the feeds): what a family
  lacks is in its `OWED` with the reason. The table still has cells marked `?`.
- **A card for one room** (2026.11.9-b19; owner, 2026-11-18: any family should be usable
  on an ordinary page that is about one room). `room.ts` `roomCard(Family, tag)` makes a
  family's `-room` card: it tells the family's element `rooms: [room]` and that it is
  `_alone` (`family.ts`). Each family's `render` then draws the one room without the
  house's furniture, and follows no feed that is about the whole house. The Fridge,
  Aurora, Digs (`digs/world.ts` `cutout`) and Contraption have one; the Console's is
  older (`console/cards.ts`). Their editor is `editor.ts`, which the Console's part cards
  use too. A new family gets one by a branch on `_alone` and a row in `ROOMS` in
  `index.ts`.
  - **The Gazette has none, and is not to** (owner, 2026-11-18). Why: a newspaper is an
    overview and does not fit a page about one room, and its rooms have their own
    headings already. It may be given sections after Topology (BACKLOG).
  - Seen on the test VM's house at 480 and 360 px, by loading the local build into its
    page (nothing copied there). Not seen: Home Assistant's own card picker and editor
    (no picker draws on a headless page), the dark theme, a tablet.
- **The forecast is `Family`'s** (2026.11.9-b15): `_outlook()`, called from a family's
  `_surveyed`, follows Home Assistant's `weather/subscribe_forecast` and fills `_days`.
  The Gazette and the Console use it; the Fridge and Aurora are to.
- **The Console's weather** (2026.11.9-b15; the owner agreed the 1950s mock-up,
  `docs/design/dash-bored/console-weather.html`, and approved the rest on 2026-11-17).
  An era's kit gives `barometer` and `calendar`. Bakelite's are its own
  (`console/bakelite/weather.ts`: a barometer and a desk calendar). The other four eras
  share `console/weather.ts`, dressed by each stylesheet. Its `WEATHER` styles are listed
  after the era's own, so an era overrides them under `.panel`. The Outside air meter is
  not to change (owner, 2026-11-17).
- **Why it exists** (owner, 2026-11-13): dashboards that write themselves from the house,
  in styles people enjoy using; "it must not look cheap". The looks were tried first as
  working mock-ups on an invented house, in `docs/design/dash-bored/` (`index.html` is the
  gallery; `house.js` the house). The owner chose three families to build out: Gazette,
  Bakelite and Fridge, in that order, for the family first and the community after.
  Movement (a watch movement in three.js) is a showpiece, not built.
  Contraption is the sixth family, begun (see below). Its brief,
  with what is decided, measured, dropped and left to do, and which mock-up shows each
  thing, is `docs/design/dash-bored-contraption.md`. Read it before building any of it.
- **Contraption is the sixth family, begun** (2026.11.9-b18; the owner asked on 2026-11-18
  for the renderer, the tiles there are and one room, and has not seen the build).
  `contraption.ts` on `family.ts`, with `contraption/`:
  - A tile is written as SVG with named parts (`data-p`), in `light.ts`, `group.ts`,
    `carriers.ts` and `devices.ts` (the stand-in crate, where each kind's own tile is to
    go). `tile.ts` states the two rules a drawing must keep for the bitmaps: everything
    that moves is inside a named part, and a named element has no transform of its own.
  - `sprites.ts` measures a drawing on an unseen bench in the page and makes the atlas;
    `stage.ts` places it. A bitmap is never turned as it is drawn: `data-ring` says how a
    part is turned ahead of time (`kit.ts` `ringOf`). A bitmap whose words or colour change
    is made again in its slot (`rebake`), through one queue in `run.ts`, so that it never
    lands in an atlas that is being replaced. Such a drawing carries its device's id, which
    is what stops it sharing a bitmap with one that looks the same.
  - `run.ts` is the machine (cells, ducks, covers, the goose), with no Home Assistant in
    it. `layout.ts` is the rule and has the node test, with every tile's edge rule.
  - **A network of loops** (2026.11.9-b20; owner, 2026-11-18, who found the first build
    "too conveyor belt-ish" and then asked for loops "engineered to be clean"). The rule:
    every way in, way out and tunnel carries one duck a period. `flow.ts` is that, with
    no drawing in it, and its node test runs 200 periods. A tile's `io` may name several
    ways ("B>RLT") and a tile may have a hole (`pit`); `layout.ts` `links` throws on a
    layout that does not join up or balance. A change to the layout rule must keep that
    test and `links` passing: they are what "clean" means. `points.ts` has the
    redirector (spares queue up a ramp; on the shaft a board goes through it), the
    roundabout collector, a wing's end and the dumb waiter's foot and top; `climbs.ts`
    the escalator, slide, lift and cutlery; `underground.ts` the tunnels: tubes placed
    to keep apart (`placed`), timed so a duck keeps the sheet's pace (`Way.lead`), and
    the dumb waiter's return, which forks and wanders the empty places (`wander`; a
    tunnel may have several ways, taken in turn, `flow.ts` `beats`). Turns are taken by `tile.ts` `dealt`, in the flow and
    in the tiles alike. Seen on the harness in WebKit (13 and 19 devices) and put on the
    test VM; not seen on the owner's house or the iPad. A device may stand upright where the stream goes
    down or up two rows (2026.11.9-b22: `light.ts` `UPRIGHT`, `devices.ts`; the upright
    light drives have not been looked at). `shows.ts` (b22) has the poop the bot shovels to a compost
    bin and the gantry's tongs: they draw, and never touch the flow. What is left is in
    BACKLOG.
  - The page keeps one `Dev` for each device and changes it in place (`_told`), so a tile
    holds its own. The machine is built once for a survey, never for a state.
  - **My choices, to be told to the owner:** the room is the area with "kitchen" in its
    name, else the first, or a card's `rooms`; lights switched together are a Home
    Assistant light group, whose own entity then has no tile; a guarded device, a camera
    or an alarm opens Home Assistant's dialog, since where they go is not designed; a tile
    is drawn to fit the width but no smaller than 140 px, and the sheet is then scrolled
    sideways (the second family with a box that scrolls, sideways only).
  - Seen on a throw-away harness with an invented kitchen (Chromium and WebKit; 1366, 1024
    and 390 px; all three skins; a press on a light, a lock and a dead device; a device
    coming back; the connection lost): 60 frames a second in both. **Not seen:** the
    owner's kitchen, an iPad, inside Home Assistant, the test VM, the card picker. What
    is owed is in BACKLOG ("Contraption, the sixth family").
- **Digs is the fifth family** (2026.11.9-b16; name agreed with the owner 2026-11-18, who
  asked for it for his grandson and has not yet seen the build). The house in section,
  built of square blocks in the style of block-building games, after
  `docs/design/dash-bored/digs.html`. `digs.ts` on `family.ts`, with `digs/`:
  - `world.ts` lays the house out as a grid of blocks, and works out the light
    (`shades`). It has no page in it and its own test. The world is built once for a
    `Survey` (by its identity, in `_surveyed`), never for a state: a block must not move
    because a light was switched. A floor is a storey, in the survey's order (lowest
    first, unless the house's `floor_order` says otherwise: then the first named is the
    ground). A room is three blocks high and as wide as its devices need: lamps and
    windows share the ceiling, blocks and doors the floor. An area out of doors by its
    name (`OUTDOORS`, English) is in the garden.
  - `textures.ts` is the texture pack 4² (a block is sixteen texels square; the name is
    shown beside "Digs" in the chooser, `beside` in `shell.ts`, and is no part of the
    name) and the lettering, three texels by five, as pictures. Everything is our own
    and made in code: no name, texture, creature or font from any game, because
    Dash-Bored is published. A new block is a row in `PAINTS`.
  - **A big house, or one not sorted into floors** (owner, 2026-11-18: his has
    outbuildings, three floors and very many lights, and most of its areas are on no
    floor yet). All in `world.ts`:
    - Over `MANY` (8) lights a room has one chandelier (`LAMPS` + the room's id in
      `slots`), and over `MANY` switches, or with scenes of its own, a chest (`CHEST`).
      Either opens the room's list (`digs/chest.ts`): every device's block with its name,
      and the room's scenes. Up to `MANY` lamps are a block each, two deep.
    - Rooms on no floor are a building of their own, wrapped into up to three storeys
      (`wrapped`). One that is an outbuilding by its name (`OUTBUILDING`, English) is a
      building by itself. **Not built:** a setting that says which floors are which
      building (BACKLOG); it is no use until the areas have floors.
    - A storey is as wide as its own rooms, and at least as wide as any over it; the
      roof covers what has nothing above. Three storeys have one row of sky and no
      pitched roof, so the world is 16 rows and a block 48 px on a 768 px screen.
    - A board in the garden counts `house.gaps` (`floorless`, `loose`). A room's name is
      a button for its lights (`_lights`, now in `family.ts` and shared with the Fridge).
      The bar holds `house.scenes` only. The map (`.map`, 3 px a block, drawn from the
      two canvases in `updated`) is shown while the world is wider than the screen.
    - Measured on an invented house of 33 rooms, 29 of them on no floor: 112 blocks
      wide, 5.3 screens of a 1024 px tablet at 48 px. Before these changes a like house
      had 32 px blocks and one storey.
  - **The first press chooses, the next switches** (owner, 2026-11-18: the blocks can't
    all be lettered, and finding out what one is must not change the house). `_sel` is
    the chosen device, or `ROOM` and a room's id for its name; it lapses `CHOSEN` (8 s)
    after the last press (`_point`), so that a block chosen long ago does not switch at
    one press beside one that takes two. The chosen block has a tag: a white edge and
    its name, over the dark. A guarded block's crack comes after the choosing, so
    unlocking is three presses. One press still does it where nothing is in doubt or
    nothing changes: a scene, the level's stack, a chandelier or chest, a camera, an
    alarm, and a block in a room's list (`named` in `_press`). Choosing a thermostat
    brings its stack up without switching it.
  - **The imp's prank** (2026.11.9-b18; owner, 2026-11-18: "a bit more crazy", for his
    grandson). `digs/prank.ts`: `plan` (no page in it, tested) picks a free place on a
    room's floor or the grass among the columns on the screen, where the imp runs to,
    and the blocks broken, never a device's, a sign's or a post's. `Prank` runs it as
    dates coming due through the element's `_after`: the first after 20 s, then 3 to 6
    minutes apart. **It is a show only**, as Aurora's decorations are: no press, no
    device hidden, nothing called. None in the card picker, while a room's list is open,
    or where less movement is asked for. The imp, the crate and the bot are our own
    drawings (the crate is a red bundle of sticks with a paper band lettered TNT, drawn
    from nothing; the owner asked on 2026-11-18 about a game's own TNT block with a
    credit, and its maker's terms do not allow its textures in other software). **Not
    built:** a way to turn it off. Seen on the harness in WebKit; `el._prank._begin()`
    in the console starts one at once.
    **The board "Follow the imp"** (2026.11.11-b10; owner, 2026-11-20): `world.chase`,
    two blocks after the forecast's signs, with free grass beside it. `Prank.chase` gives
    `GOES` (5) pranks `SOON` (3 s) apart, anywhere in the house; the last goes down at
    `chase.x + 2`, and `blown` hides the board from the bang until the bot has gone, which
    ends the chase. One wait for the next prank at a time (`_next`, a turn number), so the
    press can bring it forward. `spot` stays on the last crate between goes, so the view
    doesn't swing back to someone in between. `boards(world)` is every board's blocks, for
    the prank and the shading. Tested with a clock of the test's own (`digs.test.ts`).
  - **The household walks all over, and the view follows them** (2026.11.10-b1; owner,
    2026-11-20). `digs/walk.ts`: `route` is a breadth-first search over the blocks (floor
    rows, ladders, and since then a doorway in each end wall of the ground storey);
    `corners` cuts a way into straight legs, each one CSS transition (`--ms`), so Lit
    draws once a leg, not once a frame. `Walks` keeps each walker; `sync` in `willUpdate`
    (only when the house or world is new) walks a newcomer in from x = -1 and one who has
    gone off it. Each stays 10–40 s where they get to (since b4; at 20–90 s nobody walked 60% of the time, measured on the VM). Most trips end in `_lived`'s rooms; out of doors only by day and dry.
    `digs/follow.ts` `Tour`: after `IDLE` (1 min since 2026.11.10-b3) with no
    `pointerdown`, `wheel` or `keydown` (capture listeners on the element), a
    `requestAnimationFrame` loop eases `.scroll` toward the walker (or `Prank.spot`) and
    stops itself when there is nothing to catch up with; `updated` kicks it again. It goes
    over to whoever sets off while the one followed stands (`setOff`), and `pick` never
    swaps a still walker for another still one: in b1 it did, and the view sat on someone
    standing while others walked. The tip says "Following …" while touring. A prank
    starting (`Prank` host `began`) turns the tour on at once, touched or not (`Tour.imp`,
    owner 2026-11-20). `_household` walks every person in the survey who is `about`
    (walk.ts): at home, or not to be placed at all (`unknown`, `unavailable`); away or in
    a zone, out (owner, 2026-11-20, 2026.11.11-b3; it replaced b2's whole household when
    nobody was home, because an empty house should look empty). On the page
    only. The view pans sideways only: the page fits the world's height. Options for all
    of it are in BACKLOG.
  - **Ages from Casa Mia's People** (2026.11.11-b6; owner, 2026-11-20). The integration's
    `household.py` asks `casa_mia.people` at start, when the action registers, on
    `casa_mia_people_changed` (People's `on_change`, fired by `__main__` after every
    `_commit`) and at 00:00:05, and feeds `casa_mia_dash_bored/household`: per person
    entity only a band (`baby` under 2, `toddler` under 5, `child` under 13) and
    `birthday`, never the date or age. Digs' `_shape` picks a `BUILDS` entry
    (`textures.ts`: grown 32 texels tall, child 24, toddler 20, drawn at the same texel
    size, never scaled); a toddler walks at 1.5× (`pace`); a birthday adds the `hat`.
    A baby (b7) sits or crawls (`sitting`, `crawling` in the same seven-frame strip),
    at pace 2.5, on `graph(world, true)`: floors only, no rung, no cell `out`, so it keeps
    to its floor indoors; it is placed and removed, never walked in or out.
  - A figure is a strip of seven frames (`textures.ts` `person`: standing front-on, four
    of a side-on stride, two of a climb from behind) drawn in `.who::before`, which flips
    for `.left` so that the name does not; `.walking` and `.climbing` step through it.
  - **A light is drawn by its name** (`world.ts` `lamp`, English, since b5): a standing
    lamp (`standing`, a shape of its own laid out from the right like a door, two blocks
    tall on the floor), a spotlight, a strip, or a pendant; out of doors always a lantern
    on a post. Only the standing lamp changes the layout. A lit one has `.lamp`, its kind
    and `--lit` (its level) for its pool of light.
  - **A camera is a picture on the wall** (owner, 2026-11-18: "artistic licence", since
    one camera's block was like another's). Its slot is `PICTURE` (3) blocks wide and two
    tall (`Slot.w`), on a post out of doors. `digs/shots.ts` draws its `picture` into a
    canvas of 44 by 22 texels when the address changes, cut to fill, over its name. No
    still is the camera block in the frame; a still that fails is the cracked grey block
    and a line in the console (the address without its token). Not in a room's list,
    where it is the plain camera block. A room of many cameras is three blocks wide for
    each: nothing gathers them.
  - Each device is a real button over one canvas of the blocks, with a second canvas of
    the dark over them (a pixel to a block). A block's size is a multiple of 8 px (half
    texels) from 16 to 64, fitted to the screen's height as the page, and 32 px as a card.
  - **Agreed with the owner on 2026-11-18:** a house wider than the screen is walked
    along sideways (`.scroll`, the one family with a box that scrolls: sideways only);
    a heart is lost for each unlocked door, each Sensor Watch alert and each device not
    answering; a thermostat is a stove and a switch a lever (one whose `device_class`
    is `outlet` is a machine: `Device` does not say which switches are appliances); the
    forecast is signs in the garden; and a signpost in the garden fires `CHOOSE`.
  - My choices, told to the owner: a camera or an alarm opens Home Assistant's dialog;
    every guarded kind cracks, not only a lock; a device not answering is a cracked grey
    block that takes no press; the level's stack is at the screen's right edge and is
    there only for a device whose level can be set; a fault is said in plain type so
    that it wraps.
  - Seen on a throw-away harness with an invented house (Chromium and WebKit; 1344,
    1024 and 390 px; day, night, rain and snow; as a card; the small house and the big
    one), where each kind of press made the right call. **Not seen:** inside Home Assistant, the test VM, the owner's
    house, a tablet, the card picker, a real finger's sideways scroll, a house of three
    storeys or of thirty rooms. What is owed is in BACKLOG ("Digs, the fifth family").
- **Published by itself** (2026.11.9-b1; owner, 2026-11-15): in `components.PUBLISHED`,
  mirror `gazoodle/casa-mia-dash-bored`, made by `tools/mirror.py` at a release
  (`docs/design/marketplace-mirrors.md`). The dry run passes; nothing is published yet.
  So the "no downgrade" rule covers it, and its guide is the mirror's README: keep the
  guide's links and pictures ones the mirror can carry.
- **The Gazette's agent's column is written by a model** (2026.11.9-b14;
  `docs/design/dash-bored-column.md`). The integration's `column.py` follows ZenOS's Kata
  cabinet (found by the label `zen_kata_cabinet`) and, on each newer `zen_summary`, makes
  one `ai_task.generate_data` call with the model in `input_text.zenos_ai_task_entity`.
  `katas.py` picks the Katas and writes the brief. The column is kept in a Store and fed
  as `casa_mia_dash_bored/column`; `column.ts` turns it into the desk. It is read-only
  towards ZenOS (owner, 2026-11-15). On the test VM's local model one call took 61 s
  (2026-11-17), inside the 120 s limit. The test VM runs ZenOS, with its summarisers on a
  local model on the owner's network.
- **The Fridge is the third family** (2026.11.8-b37; the owner asked for it on 2026-11-15
  and it was built while he slept, so he has not seen it). `fridge.ts` on `family.ts`;
  `fridge/magnets.ts` draws the button magnets (a picture for each kind) and the novelty
  ones, `fridge/skins.ts` is the three households as data (young family, yuppies,
  grandparents; a fourth is another entry there and a block in `fridge/styles.ts`).
  Everything is turned by `tilt(id)`, the same each time. A guarded device takes two
  presses to unlock, open or sound, as in the Gazette, not the Console's rule. It does
  not hold to the Console's rule that controls never move for their lettering.
  Bakelite is the 1950s of a family of control panels, the **Console**, a decade each
  to the 1990s: Bakelite, Nixie, Silverface, Bargraph, Beige (names agreed with the
  owner, 2026-11-14). `console/host.ts` is the family's element and its era switch
  (`ERAS`); an era is an element on `console/panel.ts`, shown in the host with the
  switch in its `era` slot. Silverface (1970s) is built to the design agreed that day (`console/silverface.ts`
  with `console/silverface/`); it takes `tv`, `wheels` and `swing` from Bakelite's kit,
  where the markup is the same and only the stylesheet differs. Why: they are the same panel in different skins, as
  the Gazette's papers are. Bargraph (1980s, 2026.11.9-b2: `console/bargraph.ts` with
  `console/bargraph/`) is built to the mock-up the owner chose from on 2026-11-15
  (`docs/design/dash-bored/bargraph.html`). Its levels are faders: a kit's control with
  the class `slide` is slid, not cranked, by `_dial` in `console/panel.ts`, which moves
  the level by how far the finger went along the element's height. Its needle is a layer
  of its own over a still face, and it has no CSS filter: the pattern for the other eras
  if the iPad's sluggishness (reported 2026-11-15, not yet measured) is the meters. Seen
  on a throw-away harness with an invented house, in WebKit and Chromium, and on the
  test VM; it has no screenshot in the guide. Nixie (1960s, 2026.11.9-b3:
  `console/nixie.ts` with `console/nixie/`) is built the same way, from
  `docs/design/dash-bored/nixie.html`. What the rectangular eras share is in the Console's
  own files: `console/needle.ts` (the layered needle meter: Nixie's two top meters and
  Bargraph's), `console/scope.ts` (the oscilloscope recorder, made with an era's `label`
  and `push`: Nixie's and Silverface's), `BEATS` in `console/kit.ts`, and `panel` and
  `plate` in `console/figures.ts` (a display's fixed cells, and a knob's plate taken apart).
  Beige (1990s, 2026.11.9-b4: `console/beige.ts` with `console/beige/`) completes the five,
  from `docs/design/dash-bored/beige.html`. `console/figures.ts` also has what Bargraph's
  fluorescent displays and Beige's LCDs share: the figures of seven bars (`figs`, with
  the stylesheet fragment `FIGURES`, whose sizes are whole pixels: the owner saw bars of
  different sizes when they were fractions of the type size), the meter that is a display
  and the alarm's code as figures with keys (`keyed`). Beige's chart is `scope.ts`'s
  oscilloscope dressed by its stylesheet, through the class names on the scope's parts. Bakelite is completed first and keeps its name.
  - **The meter panel** (2026.11.9-b23, asked 2026-11-18; plan in
    `docs/design/console-meter-panel.md`): `dash-bored-console-meters`, a fifth view,
    `meters`. It is for ordinary dashboards and is not on the Console's page. A chassis
    for each device in `devices`: `console/meters.ts` (no Lit, tested in node) says what
    is on it from each sensor's device class and the phase in its name, with the limits
    of each scale; `console/metered.ts` draws it, and holds `register`, which every era's
    kit now has (its figures; Bakelite's is `counter`). It reads no house: `_shown` in
    `family.ts` says when to draw again. Each meter's sensor is followed with Sensor
    Watch's own `follow` (`_consult` in `panel.ts`; the feeds are in the family's `_feeds`,
    so leaving the page stops them): its bands give the scale, its level a `jewel` under
    the meter, and a watch that Sensor Watch can no longer give is kept and said to be
    lapsed (`_lapsed`). A chassis's works are laid out at their natural width and
    zoomed to fit (b24: `fit` in `meters.ts` chooses the form and the zoom, `sized` in
    `metered.ts` applies them, and `_fit` in `panel.ts` watches each chassis's width). That
    is a stopgap the owner chose on 2026-11-18 to get the card working on a phone; BACKLOG
    has sizing every control properly. Steps 1 and 2 of the plan are built. Steps 3 and 4 (zones on the
    scales, a picture for the guide) are in BACKLOG. Seen in all five eras in a scratch harness
    with a fake Home Assistant, not yet in a real one. The owner agreed the name
    (2026-11-18).
  - **Part cards** (2026.11.9-b5, names agreed with the owner 2026-11-16):
    `dash-bored-console-instrument`, `-room` and `-lamps` (`console/cards.ts`). Each is
    the host without its switch, telling the era's element a `view` (`Config` in
    `panel.ts`). The element gets its options as a `.config` property in the host's
    template, before it is on the page, so that each view follows only the feeds it shows.
    One entity is surveyed alone by `entity` in `house.ts` (it is shown even if it is
    hidden or in no room). A room uses the existing `rooms` option, and the lamps read no
    house at all (`_reads` in `family.ts`). Their layout and `backing: false` are in
    `console/views.ts`, which each era takes before its own styles. Checked on the test VM
    in all five eras, in Chromium and WebKit, on the light and dark themes. The editors'
    entity and room pickers could not be seen there: no picker drew on that headless page,
    even a plain one, so they are unchecked in HA's own card editor.
  - **In HA's card picker a family draws a specimen** (2026.11.9-b8; owner, 2026-11-16:
    the previews were "too big to be useful"). Each whole-house card was 3,200 to 7,500 px
    tall there. `picked` in `family.ts` sees that the element is in `hui-card-picker` (HA
    tells a card nothing), `survey` then cuts the house to one room and four devices
    (`specimen` in `house.ts`, by the internal `sample` option), no feed is followed, and
    the element is a 400 px window. The Console host tells its era's element `sample`.
    The part cards are left whole: they are small. Bakelite's own card is no longer
    registered for the picker; its element stays for dashboards that have it. Measured in
    the test VM's picker (Chromium): 400 px each. Not checked in WebKit.
  - **A panel's controls never move for their lettering** (owner, 2026-11-15: "it's
    drilled into the panel"; true of the Console's eras, perhaps not of other families).
    Each hangs from the top of its row with a fixed height and room for a two-line
    plate; a display has fixed cells (`panel` in `silverface/kit.ts`). Check a change
    by measuring, not by eye: record every control's box, change a label, compare.
  - **Test the Console in WebKit as well as Chromium.** Why: on 2026-11-15 a camera's
    screen (an aspect ratio with a picture as tall as its box, in a column flexbox) grew
    without end in WebKit only, and a cover folded to nothing still took taps there, so
    on the owner's iPad a guarded switch could not be thrown. Playwright's WebKit is in
    `~/Library/Caches/ms-playwright/webkit-2359` (pass its `pw_run.sh` as the executable).
  - **A family's page is scrolled by the document, never by a box of its own**
    (2026.11.9-b6; `PAGE` in `family.ts`). Why: on the owner's iPad a family one screen
    tall with `overflow-y: auto` stopped for over a second at a time while scrolling.
    Don't give the Console's rooms `content-visibility: auto`: it was tried the same day,
    and each room swapping its stand-in height for its real one moved the page under
    the owner's finger (Safari on iOS does not hold the page steady).
    A full-page screenshot's time is not a paint time: most of it is compressing the
    picture, which depends on what is drawn. Headless WebKit never showed the stutter;
    it was found on the iPad with a test page of switches (the Console, 100 invented
    rooms), which is the way to look for the next one.
- **Rooms stand in rows chosen by `pack.ts`** (2026.11.9-b9; owner, 2026-11-16: the
  Console had "too much open space" on his house). `rows` takes how tall each room is at
  each width and the number of columns, and gives each a width and a row for the least
  height, order kept. Each family tells it its own sizes: the Console's exact ones in
  `console/balance.ts` (`laid`), the Fridge's estimates in `fridge/rows.ts`. The columns
  come from the element's width (`_resized` in `family.ts`, a ResizeObserver), and the
  rows are kept until the rooms or the columns change. The grid itself is CSS, once for
  all five eras in `console/views.ts` (it was copied in each era's stylesheet), and in
  `fridge/styles.ts`, where the rows are left ragged on purpose.
  - **Small rooms stack, floors run on, and nothing is stretched** (owner, 2026-11-16:
    floors may share a row, with a separator; and the test VM "must look great", since
    his video is shot there). A row is columns (`bays` in `pack.ts`), and a column holds
    up to three small rooms (`STACK`), never across a floor (`apart`). A floor's plate is
    in a lane over the row it begins in, and each bay is placed by its own grid row and
    column, so a floor begins wherever the one before ends, with `.bar` to its left (brass
    in Bakelite; a plain line in the other four eras, to be decided with him). On the
    Console a chassis keeps its own height, and `racks` in `balance.ts` fits a blanking
    plate (`.blank`, the era's chassis with a vent) under a bay with 96 px or more to
    spare. Why: stretched to its row, a room of two switches was a tenth full. The plate
    is where the back pocket's sensors are to go.
  - Measured on the owner's house at 1024 px before the change: Console 25,655 px tall
    and about 30% controls, Fridge 31,274 px. Sorting rooms by height within a floor was
    simulated and saved 2% to 4% more, so the order is kept (his call was that rooms
    could move within a floor; he asked for guidance, and that was it).
  - The survey (`house.ts`) keeps one camera for each device, and gives each scene to its
    room (by area, or by its name beginning with the room's), its floor (by name) or the
    house. `scenes(house)` is all of them, for a family that lists them (the Gazette).
    A new family that reads `house.scenes` alone shows only the house's and the floors'.
  - A room's scenes on the Console are `console/selector.ts`, the same in every era and
    not in the kits. Its pointer is the scene last set (a scene's state is that time).
  - What's left is in BACKLOG. Checked on a throw-away harness with an invented house of
    22 rooms, in all five eras, at 390 and 1024 px, in Chromium and WebKit: no control
    outside its chassis. Bakelite also seen on the test VM (the bundle copied to its
    share; 2,918 px before the stacks and plates, 2,605 after). Not seen on the owner's
    house or a tablet, and the Fridge not on the VM.
- **Aurora is the fourth family** (2026.11.9-b9; the owner asked for it on 2026-11-16).
  `aurora.ts` on `family.ts`, after `docs/design/dash-bored/aurora.html`. In `aurora/`:
  `bento.ts` packs tiles into screens, `pages.ts` says what the screens are, `words.ts`
  is what it says (the hero's sentence, the power's line) and `styles.ts` the look.
  - **It is screens, each full** (owner, 2026-11-16: the first build had "loads of space
    around"; he expected none free, as in the mock-up). `bento` puts each tile where it
    first fits at the size it wants, then grows the tiles into the cells left. Tall
    tiles can box a free cell in (about one screen in fifty): that screen is laid out
    again with every tile one row tall, which can't. A sweep of 12,600 cases left no
    cell free. Sizes come from the survey alone (how many devices a room has), never
    from how the house stands: a tile must not move because a light was switched.
    `_lay` works the screens out again only when the survey or the element's size change.
  - **The grid is chosen for the tiles, not for the window** (owner, 2026-11-16, of a
    Mac's window: "soo bad"). A window that could hold 8×6 cells gave seven tiles 48
    cells to share, and they grew into empty slabs. `fitted` in `pages.ts` now picks,
    per screen, the grid with the fewest cells to spare and cells near 1.3:1; small
    sets next to each other share a screen while they fit one (`FULL`); and a tile's
    contents are enlarged with its cell by CSS `zoom` (`zoom`, at most 1.6). Test any
    change at 2560×1300 as well as at a tablet's and a phone's size.
  - **Skins are varieties of colour** (owner, 2026-11-16, after HA Dial's themes), built
    2026.11.9-b12 as data in `aurora/skins.ts`: a skin is the sky's three hues, how far
    each turns as lights come on, the warm light's hue, a strength and the rooms' glow
    hues, given to the stylesheet as custom properties (`paint`). A skin must change no
    size or place. Chosen from the bar, kept in the browser, or named by a card's
    `style`. **Not built:** the choice being open to automation (BACKLOG).
  - **Season and holiday skins** (owner, 2026-11-16: "be creative"), built
    2026.11.9-b12: nine in `SEASONAL` (`skins.ts`), each with decorations of the same
    name in `DECORS` (`aurora/seasons.ts`); the drawings are in `aurora/art.ts`, by
    hand, and `aurora/season-styles.ts` moves them. **A decoration never moves a tile
    or takes a press:** it drifts over the page, runs along the foot either side of the
    bar, stands in the greeting's top right corner (at the foot it stood on the
    sentence), or is along the top. `almanac` picks the skin for a date. Seen on
    the test VM in Chromium and WebKit at 1340 px, light theme. **Fireworks and Halloween
    are always dark** (`Skin.dark`; owner, 2026-11-17), because on a light page they came
    out pastel. **Not seen:** Home Assistant's dark theme, a phone, a tablet's frame rate
    with 26 flakes falling.
  - **What drifts is a simulation** (owner, 2026-11-17: leaves "flutter side to side",
    look irregular, "settle on the ground", a robot collects them and a blower the
    snow; then piles on tile tops, knocked off by a hover), built 2026.11.9-b13.
    `aurora/drift.ts` is the model, with no page in it and its own test: each thing is
    a van der Pol oscillator (it keeps swinging) and the wind is one Lorenz system (it
    never repeats). A new thing that drifts is a row in `MOVES`. `aurora/drifting.ts`
    places the drawings each frame. Owner's rulings, all 2026-11-17:
    - **Artistic licence over physics:** each thing takes its own share of the wind,
      some against it, and has its own speed, because everything going one way at once
      "looks odd".
    - **Ledges:** things land on the tops of the showing screen's tiles, the bar and
      the ground. The bar hides the foot of the page, which is why it is one. Ledges
      are measured when Aurora draws itself and by a ResizeObserver, not each frame. A
      tile within 56 px of the page's top is no ledge: the machine could not stand there.
    - **Heaps, not a blizzard:** a thing lies about for some seconds and then joins its
      ledge's heap, one path however much is in it (`outline`), so at most `PILE`
      things lie about.
    - **Shaking:** a hover, a press, or a ledge that is gone (a swipe) drops what was
      on it.
    - **The machine flies** to each ledge with something on it, every 5 to 8 minutes.
    - **Not built:** things lying on a room's sheet or on buttons. The sheet is a modal
      dialog in the browser's top layer, so it would need a layer of its own inside it.
    Fireworks still burst by CSS alone. Seen on the test VM at 60 frames a second in
    Chromium and WebKit on a Mac. **Not seen:** a tablet's frame rate, a phone, a real
    swipe, a machine's whole visit at its own time.
  - **The device controls are a layer of their own**, `aurora/controls.ts`
    (`Controls extends Family`), which `Aurora` extends: split out verbatim on
    2026-11-17 when `aurora.ts` reached 569 lines.
  - **A set of rooms is not a floor** (owner, 2026-11-16: "arbitrary splits" was to stop
    floor or area being built in; the other way is not yet specified). `splits` in
    `pages.ts` is the one place that knows a set is a floor today. A set takes no more
    screens than the fewest it can (`fewest`).
  - **The way round** (owner, 2026-11-16): a tab at the left and the right edge that
    names its neighbour, and a bar that floats at the foot with a drop shadow, which
    also has the search and a button for the choice of family. That button fires
    `CHOOSE` (`shell.ts`), since a full screen leaves the shell's corner no free place
    to press. The screens stand side by side in a box the browser snaps sideways
    (`.pages`); no script moves them. `updated` puts the pager back in place only when
    the layout changed, or it would fight a swipe.
  - **A tile that has the room holds the room's controls** (`holds` in `pages.ts`, by
    the tile's size in px, down to 170 px tall each): my addition, after the first
    packed screens had big tiles that were mostly empty glass. Its columns must stay the
    sheet's (`.controls`), which is what `holds` counts by.
  - **Where it leaves the mock-up, for a tablet's sake** (my choices, told to the owner):
    the sky is gradients moved by transform, with no blur filter; a tile has no
    `backdrop-filter` (only the sky is behind it); and the tile grows into the sheet by
    an animation of the dialog's transform, since a view transition can't be styled from
    a shadow root.
  - A guarded device's dot opens the sheet, where its key takes two presses; a camera or
    an alarm opens Home Assistant's dialog, with the sheet shut first (a modal dialog is
    over anything Home Assistant opens). The ring is the first thermostat in the house's
    order of rooms: the owner has not said which it should be.
  - The power's line is asked from history once per sensor and then grows by what is
    pushed, a point at most every 30 s (`thinned`, `GAP`).
  - Shared with the Fridge: `_after` and `_instead` are now in `family.ts`; `STANDS` and
    `AGAIN` are exported from `fridge.ts`, and `picture` from `fridge/magnets.ts` (the
    white line pictures, coloured by Aurora's stylesheet).
  - **What the browsers taught:** a `<dialog>` given a class with `position: relative`
    is placed from the top of the document, not of the screen (`.sheet` is fixed by
    name). Headless WebKit paints no `backdrop-filter`, so anything that needs the blur
    to be read can't be judged there: the sheet, the bar and the edge tabs are nearly
    opaque by themselves. A dot's class must not be a device's kind: `climate` is also
    the thermostat tile's class (a light's dot is `lamp`).
  - Seen on a throw-away harness with an invented house (Chromium and WebKit; tablet,
    desktop and phone sizes; 8 and 48 rooms; light and dark), and on the test VM's page
    in Home Assistant (2026-11-16, both browsers, wide and phone, light theme,
    hand-copied `cards.js`). **Not seen:** a finger's swipe on any real device, the
    dark theme in Home Assistant, the card and the card picker since the screens, an
    iPad or a wall tablet. On the VM there were no alerts (Sensor Watch was not loaded
    there that day), no scenes and no power sensor: those three were seen on the harness
    only.
- **Casa Mia's own data on every family** (owner, 2026-11-16: every view is to take what
  Casa Mia and its other integrations have, where they are installed). Dash-Bored still
  stands alone: each source is found through Home Assistant by name, lands in `House`
  (`house.ts`), and the families draw from that. Three steps, agreed in this order:
  - **Cameras, built for the Console and the Gazette** (2026.11.9-b11). The app's
    cameras ride `/health` (`cameras.py` `for_pages`, as `modules.cameras.list`; each
    PTZ preset is the call that goes to it, built once with the dashboard's by
    `preset_data`). `casa_mia/cameras/subscribe` feeds them to any user (`_follow` in
    the integration's `__init__.py`, shared with the settings feed). `family.ts`
    follows it only where `casa_mia` is among `hass.config.components`; a Casa Mia too
    old to have the feed is said once in the console and is no fault on the page
    (`newer` in `_follow`). **A camera Casa Mia lists replaces the one found** (owner,
    2026-11-16): its title, and a `Device`'s `zoom`, `presets` and `controls`. The
    entity kept is still the photographed stream where there is one, since sightings
    are told by that entity (`rank` in `survey`), then Casa Mia's. A control that is a
    kind a room shows is a `Device` (guarded as any); another is only pressed
    (`pressing` in `stories.ts`: the page is no dashboard, so Lovelace's toggle action
    is not there to use). On the Console (`_lenses` in `panel.ts`) a zoom is a knob, a
    button or script a knife switch, a device a dolly, and the presets a selector with
    a head line (`presets` in `balance.ts`'s `Load`); the controls stand in the order
    `tall` counts them, so change the two together. Seen on a throw-away harness with
    an invented house (Chromium and WebKit, 1024 and 390 px, Bakelite and Bargraph: no
    control outside its chassis, and each press made the right call). **Not seen:** a
    real PTZ camera, the feed from a real app, the test VM, Nixie, Silverface or
    Beige, a tablet.
  - **Aurora, built 2026.11.9-b12:** a camera's picture behind its room's tile, a tile
    of every camera on the home screen, and on the room's sheet the picture with its
    presets, zoom and controls (`aurora/cameras.ts`). A still is not live: it says what
    the camera last saw, or when the still was fetched (`shot`). The sightings feed is
    followed by `_watch` and `_sighted` in `family.ts`; the Console and the Fridge
    still have their own copies of both, to be moved onto it in a refactor commit.
    Seen on the test VM (Chromium and WebKit, 2560, 1340 and 390 px). **Not seen:** a
    sighting (the VM's cameras report none), presets, zoom or controls (the VM has no
    Casa Mia app), a real camera.
  - **A device's choices** (2026.11.9-b12): `Device.choices` holds every setting that
    is a choice from a list, from one table in `choices.ts` (a new one is a row).
    Only Aurora's sheet shows them (`aurora/settings.ts`).
  - **Not built:** the Fridge (it shows the title only), the Console's
    one-entity card, and steps 2 (Guest Login) and 3 (Sensor Watch's bands). BACKLOG
    has them.
- **The page and the families** (2026.11.8-b23). The sidebar's page (`panel_custom`, not in
  a frame, for every user) is `dash-bored-page` (`shell.ts`). It shows one family's
  element and holds the choice between them: two presses within `TWICE` in its top right
  corner, on nothing in `PRESSED`, open a dialog; the choice is in the browser's storage
  (`dash-bored-family`). Since 2026.11.9-b20 a browser with nothing stored is shown the
  dialog first, and every family has a thing of its own on the page (never on a card)
  that fires `CHOOSE`: the Gazette's ear, the Console's maker's plate (`host.ts`), the
  Fridge's takeaway menu, Aurora's bar button, Digs' signboard, Contraption's lever. A new
  family needs one, and says it in its entry's `back`, which the dialog's last line lists.
  The dialog is three families across in landscape and two in portrait.
  A new family is an entry in `FAMILIES` there, an element defined
  in `index.ts`, and a class on `family.ts`, which holds what they all need: the house
  (`survey`/`read`, with `_surveyed` and `_moved` to override), the settings feed,
  `_follow` for a feed, `_call`, `_ask`, `_fault` and `_lost`. Each family's element is
  also a dashboard card.
- **Bakelite is the second family, begun** (owner, 2026-11-14: Bakelite now, the
  newspapers' work to the backlog). `console/panel.ts` is the panel, the same in every era; an era is a kit to the shape
  in `console/kit.ts` and a stylesheet (`console/bakelite.ts` with `console/bakelite/`),
  after `docs/design/dash-bored/bakelite.html`.
  It has lights, switches, covers, the guarded kinds (a guard is shut only at rest; two
  presses leave rest and one returns, `_guarded`; owner, 2026-11-15) and alarms (`_alarm`: thumbwheels for a code in digits,
  which is held only in `_code` and never logged); what's left is in BACKLOG. Knobs
  are cranked round their middle (`bearing`). Sensor Watch's alerts are pilot lamps
  along the top (`_alerts`, straight from the feed, so in seconds). A meter is lit only
  while the connection is up. Since b30 every kind is on it: `_dial` works in a device's
  own span (per cent or degrees), a camera is a `tv` that shows its last sighting for
  half an hour (`_seen`), and Chart opens a room's day (`console/plot.ts`, drawn by the era's `recorder`). Needles
  swing by a CSS easing and waver smoothly by a CSS animation (owner, 2026-11-14: smooth, not in steps, and each
  meter's period from a prime so that none are in step: `BEATS` in kit.ts).
  A chassis is one to three widths across (`console/balance.ts`, `widths`): its sizes
  are a model of `styles.ts`, so change the two together.
  Seen on the test VM at desktop and phone widths, and by the owner on an iPad
  (2026-11-14), not yet on a wall tablet.
- **Gazette is the first family.** Its element is
  `dash-bored-gazette` (`integration/cards/src/dash-bored/`, its own `www/cards.js`).
  Three layers, kept apart on purpose:
  - `house.ts`: `survey` reads the registries (areas, shown entities) once per registry
    change; `read` reads only those entities' states.
  - `stories.ts`: what is worth saying, ranked. No wording.
  - `voices.ts`: each paper as **data** (text with `{placeholders}`, pools of headlines).
    The owner wants the jokes and sentences configurable later (2026-11-13): keep voices
    as data so that stays possible. Nothing configures them yet.
  - `styles.ts` is the look; a new paper is a voice and a block of CSS.
- **A big house** (2026.11.8-b2, found on the owner's own). Over 30 devices (`BIG` in `gazette.ts`) the report is by
  exception, a room's many lit lights are one pressable count (`MANY`), and the
  switchboard goes across the foot in columns. Floors are the crossheads. Test any
  change to the page at that size as well as on four rooms.
- **What the house is missing** (owner's idea, 2026-11-13; b3 and b4): `survey` also
  returns `gaps` (no area, suspected plumbing, shared names, no floor, no thermometer),
  shown as Corrections and clarifications. Suspected plumbing is a guess from English
  names (`PLUMBING` in `house.ts`), grouped by integration, because an entity's category
  is set at its source (ESPHome and KNX YAML). The label **Dash-Bored hide**
  (`HIDE_LABEL` in `const.py`, id `HIDE` in `house.ts`; a tests_ha test ties the two) is
  for the rest. The page changes nothing in the registries: the owner was told so.
- **A light in no area still counts** (2026.11.9-b8; found when ZenOS's summary said 8
  lights were on and the Gazette 7). `survey` keeps such lights as `strays`: on no room's
  card, but in `lights(house)`, which the Gazette's lights story (and its turn-off button)
  and the Fridge's notepad count with. A card of chosen floors or rooms leaves them out.
  Other kinds in no area (a lock, a cover) are still in no story.
- **Guarded devices** (my ruling for a live house, told to the owner): a lock, or a cover
  whose class is garage, gate or door, is never operated by a press on a sentence or a
  chip; that opens Home Assistant's dialog. The story's own remedy button may lock.
- **Sensor Watch's alerts come through `alerts.py`, not straight to the page.** Home
  Assistant lets only admins subscribe to a custom bus event, and a wall tablet's login
  is not one. `alerts.py` listens for `casa_mia_sensor_watch`, keeps the latest per
  sensor for this run (Sensor Watch says them all again at each start), and feeds any
  signed-in page (`casa_mia_dash_bored/alerts`). It drops an alert on
  `casa_mia_sensor_watch_withdrawn` (not a recovery, so no story). The two integrations
  name each other's events and nothing else.
- **Seen on the test VM** (2026-11-13, Home Assistant 2026.11.1): set up through its
  flow, the page in the sidebar at tablet and phone widths, and Sensor Watch's real alerts
  from the invented house as breaking news, ranked. **Not seen:** rooms and devices from
  real areas (the VM's lights and locks have no areas), a press reaching a real device,
  Safari, a wall tablet. Its folder is still on the VM, copied by hand.
- **Photographs** (owner's idea, 2026-11-13; 2026.11.8-b6, option 2 of three: a still
  at the moment of detection, any brand). `image.py` gives each device with a camera and
  a detection worth a photograph one image entity, "Last sighting", joined to the
  camera's device the way a helper's entity is (`device_entry`; device info with another
  integration's identifiers makes a second device in current Home Assistant). `kind_of`
  tells the sort from English words in the detection's translation key or name. The
  page finds the entities by platform (`OURS` in `house.ts`); `SEEN` in `stories.ts`
  ranks them. The still goes through `image.still`, which tests replace: the test Home
  Assistant can't import the camera integration (no turbojpeg). **Not seen:** any of it
  on a real camera. **With the app** (owner's idea, 2026-11-13; 2026.11.8-b7): the
  compositor's cache is asked first, through Home Assistant only, since Dash-Bored
  stands alone: `Cache.recent` → the read `/compositor/picture` (`compositor/api.py`
  `picture`) → the service `casa_mia.camera_picture` → `image.cached`, which falls
  back to `from_camera`. The cache is new only for cameras a watched commander shows,
  and UniFi Protect's own snapshot is 640 x 360 (the cache's `keep` says so), which is
  the gain. **UniFi Protect's thumbnail** (2026.11.8-b8): a Protect detection's state
  carries `event_id`; `protect_thumbnail` fetches that event's thumbnail through
  Protect's own config entry (`runtime_data.api`, as its view does: another
  integration's insides, so any failure leaves the first photograph). It follows in a
  background task, never awaited; the entity's state is then the photograph's time and
  `seen` the sighting's. Not known: how soon Protect has a thumbnail, its size, and
  whether it beats the compositor's frame. The log gives both sizes. **The half hour's log** (2026.11.8-b9, from the box's log: sightings come many to the
  minute, and "animal" a moment after "person" took the person's photograph away):
  every sighting is its own item with its own photograph in `sightings.py` (`Log`, 30
  minutes, 40 at most), fed to the pages by the `sightings` websocket command and served
  at `/api/casa_mia_dash_bored/photo/<id>` (no sign-in: the id is random). The page no
  longer reads sightings from the image entities, only which cameras there are
  (`sighted` in `house.ts`); `stories` tells one per camera, and the column Thirty
  minutes ago lists the rest. Protect names its event on the camera's **event entity**,
  not on the detection sensor, so event entities are triggers too, their kind told by
  `event_type` at each firing (`BY_EVENT`). The box's core log is read at
  `/api/hassio/core/logs`. Still unknown: how often the owner's cameras report a person
  (is ten minutes right?) and how fast a still comes back. Not done: cameras added after set-up.
- **The masthead's font** (2026.11.8-b8, the owner's iPhone; changed in b13): Manufacturing
  Consent, a textura (the English blackletter of a Victorian nameplate; UnifrakturCook
  before it was a Fraktur, the German kind, which the owner questioned 2026-11-14), is
  bundled in `www/fonts` with its licence and given to the document by `masthead()` in
  `gazette.ts` (a shadow root can't declare a font). Never name a generic family such
  as `fantasy` in a stack: each platform maps it to something different.
- **Brand** (2026.11.8-b5): a bored face on a tile, drawn by `tools/brand_children.py`.
- **Levels** (2026.11.8-b10): `read` marks a device `dims` (a light with a colour mode
  beyond on/off, a cover with SET_POSITION; never a guarded one). `clause` in `voices.ts`
  gives a device's wording in three pieces so the level is its own press; a voice's
  `percent` says a level and is every clause's `{level}`. One scale is open at a time
  (`_scale` in `gazette.ts`), a native range input inside the room's paragraph (so it
  stays in its column) or in the device's clipping. `_ask` sends one call when the
  level has been still for `SETTLE`: an arrow key reports a change at every step. Over
  the scale is a readers' poll (owner's idea, 2026-11-13, to sit beside the scale, not
  replace it): a voice's `polls` by kind, each vote `VOTE` per cent from `want`. The
  figure is the device's own, and `want` shows beside it until the device's state
  changes. A story can carry a gentler remedy too (`Story.vote`, an entry's `vote`,
  2026.11.8-b21): the lights' stories dim the lit lights that are brighter than `DIMMED`.
- **The clipping** (2026.11.8-b11): one device's story in a native `<dialog>`, in
  place of Home Assistant's dialog (`clipping.ts` draws it; `_open` in `gazette.ts` is
  the one that is open). It opens from the tab beside every chip, from a late-news line
  about a device, and from a press on a guarded or unanswering device. `record.ts`
  asks `history/history_during_period` once on opening (no admin needed;
  `significant_changes_only: false`, or a cover's changes of position are left out;
  Home Assistant does not record a light's brightness at all, found on the VM); the page's own
  `hass` updates add to the record after that. `standing` in `house.ts` reads a state
  for both `read` and the record. `flip` in `stories.ts` is the one call that puts a
  device the other way. Unlocking, or opening a guarded cover, takes two presses
  (`_flip`, armed for `ARMED`); my ruling again, and no looser than Home Assistant's
  dialog, which does it in one. A voice's `acts` and `clipping` are its words.
  Cameras, photographs and the gaps' entities still open Home Assistant's dialog.
  Its edges are torn and it carries scraps of the neighbouring stories (owner, 2026-11-14,
  so it feels less like a computer's dialog): `ragged` gives a clip-path worked out from
  the device's id, so it never changes between draws, and `scraps` are the paper's own
  other stories. The shadow is a `drop-shadow` on the dialog, since a clip-path cuts a
  box's own shadow off.
- **Thermostats, media players and cameras** (2026.11.8-b14) are kinds like the first
  four. Each kind's ways are tables: `ON`, `LEVEL`, `DIMS` and `span` in `house.ts`
  (a thermostat's level is its target in degrees, a player's its volume), `FLIP` and
  `SET` in `stories.ts`. A device carries its `span` (ends, step, and what a vote moves
  it by), so the scale and poll need know nothing of kinds. A new kind is a row in each
  table, its words in each voice (`kind.on`, `.off`, `.plain` if it has a level, a poll,
  two `acts`) and, in `gazette.ts`, whether a press opens its clipping (`OPENS`: my
  ruling for heating and music, as for locks) and whether it is news (`UNREMARKABLE`,
  `reportable`). A thermostat is still the source of its room's temperature and target.
  **The rest** (2026.11.8-b15, built while the owner slept, so these rulings are mine
  and are his to overturn): fan and humidifier toggle like a light; water heater is a
  thermostat by another name (`DEGREES`); valve and siren are guarded
  (`GUARDED_KINDS`: two presses to open or sound, and a valve's position is told, not
  set); vacuum and lawn mower open their clipping; an alarm panel has no `acts`, so no
  button, because the page is every user's and has no keypad. `phase` is a state
  between on and off that a voice words (`PHASES`: a robot docked, returning, paused or
  in error; an alarm arming, pending or triggered). A triggered alarm is the story
  `triggered`, rank 110. Not kinds: `input_boolean`, `remote`, `button`, `script`.
- **The Personal column** (owner's idea, 2026-11-14; 2026.11.8-b14): `personal` in
  `stories.ts` joins each person's latest move (`House.people`, read from the person
  entities, which are in `watched`) with the songs rated, for twelve hours. The songs
  come by a third feed: Love it or Loathe it fires `casa_mia_love_or_loathe_rated`
  (`rating.py` `told`), Dash-Bored's `personal.py` keeps the latest 20 for this run and
  feeds them (`casa_mia_dash_bored/personal`). `feed.py` `follow` is the subscription
  all four feeds make (`alerts.py` and `sightings.py` moved to it in 2026.11.8-b17). A voice's `personal` words it. Known: after a restart every person's
  `last_changed` is the restart's time, so each "arrives" then. The owner was told the
  column shows guests who is at home.
- **The house's settings** (2026.11.8-b19; owner, 2026-11-14: they must serve every
  family of dashboard, not the Gazette alone). The config entry's options
  (`config_flow.py` `DashBoredOptions`: `floor_order`, `room_order`) are fed whole to
  every page by `settings.py` (`casa_mia_dash_bored/settings`), at subscribing and at
  each save, with no reload. `survey` in `house.ts` does the ordering, so a later
  family gets it for nothing; a card's `floors` and `rooms` show only those and come
  before the house's. A setting of one family (a masthead's name) is not to go in
  `settings.py`'s house settings without a section of its own. Leaving out is still
  the hide label only: a second way to hide was not added. Seen on the VM: an order
  saved through the options flow's API reordering an open page at once, and cleared
  again. Not seen: the dialog itself in a browser (its fields and their wording), a
  card with `floors` or `rooms`.
- **The weather column** (owner, 2026-11-14: "All papers cover that too"; in
  2026.11.8-b19). `House.outside` now has the sky and whether its entity gives a daily
  forecast; the page follows Home Assistant's own `weather/subscribe_forecast`
  (`_outlook` in `gazette.ts`, pushed, any user's) and `days` in `house.ts` keeps the
  first four. A voice's `skies` words Home Assistant's fifteen conditions and
  `forecast` the rest. Seen on the VM with the demo's weather, in all three papers.
  Not seen: an entity with no daily forecast, the forecast failing.
- **The third paper, Rolling news** (asked 2026-11-13; 2026.11.8-b18): the voice
  `rolling` ("The Thermostat") in `voices.ts` and the block `[data-style="rolling"]` in
  `styles.ts`. It needed one thing the page did not have, a ticker of the headlines:
  a voice's `ticker` is its label, and empty in a paper without one. Its clipping is a
  card (the torn outline is switched off in CSS, the scraps hidden). Its colour is blue (`--site`; owner, 2026-11-14: red was "too similar to the red-top"),
  and red (`--flash`) is kept there for what is wrong. The wording did
  prove to be all data: no code names a paper. The owner saw the Gazette on a wall
  tablet on 2026-11-14 ("It looks fantastic"), before this paper. Split in 2026.11.8-b20 (a
  refactor, code moved as it was): each voice is `voices/<name>.ts` to the shape in
  `voices/voice.ts`, with `voices.ts` keeping the functions and `VOICES`; and the page
  is three layers, `gazette/page.ts` (state, `hass`, the feeds) under `gazette/acts.ts`
  (what a press does) under `gazette.ts` (`render`). Members shared between layers
  are `protected`. A new feed goes in page.ts, a new press in acts.ts.
- **A photograph's clipping, and the Amusements column** (owner's ideas, 2026-11-14;
  2026.11.8-b16). A press on a photograph (a story's, the archive's, a camera
  clipping's still) opens it as a clipping (`photograph` in `clipping.ts`, `_shot` in
  the page); "See the camera as it is now" goes on to Home Assistant's dialog.
  `zoom.ts` does the pinch, drag, wheel and double tap itself, because Home
  Assistant's page turns the browser's zoom off; `zoomed` is the tested arithmetic.
  The column: `playing.py` keeps the last 30 titles the media players began and feeds
  them (`casa_mia_dash_bored/playing`); `billing` in `stories.ts` makes the lines and
  `verdicts` is each person's latest word on a song, which the Personal column now
  uses too (`personal.py` feeds `clear`). **Lesson:** `async_track_state_change_filtered`
  by domain does not report an entity's first state, so what was playing at start-up
  was missed, and a test that set the state twice hid it; the feed listens to
  `EVENT_STATE_CHANGED` with an `event_filter`. My rulings: the enlarged photograph
  is in colour in both papers (it is for looking closely), and nothing is rated from
  the page.
- **Seen on the test VM, 2026-11-14** (it now has Home Assistant's demo devices in rooms
  on four floors, and a dimmable Pendant and a Blind as template helpers): floors as
  crossheads, votes and the scale moving a light and a blind, a clipping's record from
  real history growing by push, Escape closing it, and the demo garage door staying
  closed after one press and opening on the second (a sprinkler valve the same), a vote
  moving a fan's speed and a water heater's target, a vacuum started and sent home, the
  alarm's clipping with no button, the big-house report with every kind (42 devices), a vote moving a thermostat's target
  and a player's volume, a player pausing, a camera's picture, and two songs rated through
  Love it or Loathe it's action reaching the Personal column. **Not seen:** a humidifier or a siren (the demo's are in no registry), an alarm
  sounding, a person
  truly coming or going (the VM's people have no trackers; their states were set by hand), a real dimmer, blind
  or lock, touch on a tablet, Safari, a history failure (the path is written, not run).
  **b16, seen:** the column filled from what was playing at start-up, four speakers on
  one line, a rating and its taking away changing the line and the Personal column at
  once, a camera's still opened large, zoomed by the wheel, dragged, reset by a double
  click, and its link opening Home Assistant's dialog, at desktop and phone widths.
  **b16, not seen:** a pinch by real fingers (only the arithmetic is tested, and the
  wheel in a browser), a sighting's photograph opened (the VM had no sighting; it is
  the same code as a camera's still), a television's programme.
- **Not done:** publishing by itself, other languages. BACKLOG has the list.
- **Tests:** `src/dash-bored/stories.test.ts` (house, ranking, every voice tells every
  story), `tests_ha/test_dash_bored.py` (set-up, the panel, the alerts feed).

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

- **A home address is not proof of reach** (2026-11-12). A guest network's firewall passed
  Home Assistant's port and not the compositor's 8099, so the Commander's direct picture
  was never answered: no error, a blank card. Since 2026.11.6-b4 no frame in 10 s is a
  failure (`common.ts` `NO_FRAME_MS`), and on `route: auto` a direct address that never
  showed a frame is given up for Home Assistant's route until the app restarts
  (`givesUpDirect`). To diagnose one: both logs name every stream's client address, and
  Home Assistant's log gives a signed-in user's address.

- **No filter or opacity on an SVG `<g>` of many shapes** (2026-11-12). The browser draws
  such a group off screen first, and the wall tablets' GPU (Mali-G52, WebView under Vulkan)
  then paints square black blocks beside its shapes. Heating Flow's pipe shadow and resin
  beads did this until 2026.11.6-b2; `views.test.ts` now refuses either on a `<g>`. A filter
  or opacity on one shape is fine. To measure on a tablet: Kiosk Satellite's Remote API
  (port 2324, over `adb forward`) has `evalJs` and `loadUrl`, so a change can be tried on
  the page in place, or a built bundle shown from the Mac over `adb reverse`; junk is the
  count of pure black pixels in `adb exec-out screencap`.
- **Codex shares this checkout.** Before bumping, check `git status`: don't bump over
  Codex's uncommitted bump; stage only your own files when it has work in progress.
- **Confirm a feature before building** when the owner says so: restate it with your
  choices, and wait. They review UI on the box before the next iteration; change nothing
  while they look.
- **Rename labels, not keys.** Option keys, store keys and device identifiers outlive their
  names. Likewise **don't recreate entity ids** (a red herring in 2026-10-19's camera hunt).
- **The restart Repair** reads the loaded version at import, so an entry reload can't clear
  it; it can need a page reload to appear.
- **A page open across an update runs the old cards** until it is reloaded (custom elements
  are defined once). `connection.ts` `offerReload` shows HA's toast; with `unattended`
  (Dash-Bored passes `Shell.shown > 0`) it also reloads by itself after a minute with no
  touch (2026.11.11-b10, after a wall tablet ran b5 for hours after b7 was installed).
  Dash-Bored's `Family.update` catches a drawing error and shows it in a red `.broken` box
  instead of leaving the page blank.
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

- **2026-11-13: Dash-Bored started** (2026.11.8-b1): seventeen mock-ups, then the Gazette
  as a real integration. b2 to b4 the same day made it fit the owner's house and added
  the report on what the house is missing. See its section above.
- **2026-11-13: Love it or Loathe it built** (2026.11.7-b2, reworked to b5 the same day as
  the owner used it; its page in Casa Mia in b6). See its section above. Left for later in
  BACKLOG: the page's song rows and "who would take this", the thumbs card, the fade,
  and the house's own radio station as one of its stations.
- **2026-11-11: the Camera Commander's Responsive layout is specified, not built**
  (`docs/design/commander-responsive-layout.md`, agreed by the owner): a second mode
  beside today's (now called Fixed), in which the layout is worked out for each size from
  the camera list and a few limits. Read the spec before touching the commander's layout;
  its order of work starts with a draggable stage on the editor, for Fixed.
  - **Step 1, the stage, is built in 2026.11.5-b5** (not committed, not on the box):
    `app/web/src/commander/stage.tsx` lays the commander out in the browser with the
    cards' `layout.ts` and the page's thumbnails, at a size dragged by a corner handle;
    `integration/cards/src/measure.ts` gives the facts under it. Seen in headless
    Chromium against a mocked API with an invented commander (the handover's "UI checks
    without the box" recipe; the API's addresses end in a slash, so mock with a regex).
    Not seen with real cameras, by touch on an iPad, or in Safari.
  - **Step 2, the solver, is built in 2026.11.5-b6**: `responsive()` in
    `modules/compositor/responsive.py` and `integration/cards/src/responsive.ts`, whole
    numbers only, checked against `tests/responsive_cases.json` (write it again with
    `PYTHONPATH=app/src:tests .venv/bin/python tests/test_responsive_cases.py`). Its
    options and defaults are `layout.json`'s `responsive`. Nothing calls it yet. Building
    it changed seven points of the spec, which the owner agreed; they are listed there
    and hold over the text above them.
  - **Step 3, drawing it, is built in 2026.11.5-b7** (not committed). A commander has
    `mode` (`fixed` or `responsive`) and `responsive` (its `cameras` and limits); both
    modes' settings are kept. **`placed(cmd, main)`** (`compositor/drawing.py`, and
    `integration/cards/src/placed.ts`) says where everything is in either mode, and the
    picture, the channel choice, the camera dashboard's zones, the card and the page's
    stage all read it: use it, not `commander_layout`, for anything new. Nothing on the
    page sets the mode yet (step 4), so it was seen only on the stage against a mocked
    API with `mode` set by hand, and in tests. The card over a Responsive picture has not
    been seen in a browser.
  - **Step 4, the editor, is built in 2026.11.5-b8** (not committed):
    `app/web/src/commander/responsive.tsx` (the cameras, the limits, the edges as chips,
    Reset to defaults), the Layout switch in `editor.tsx`, and the stage saying which
    limits gave way and which cameras have no room. Driven in headless Chromium against
    a mocked API: switch, slider, edges, reset, save, and back to Fixed. Not seen with
    real cameras. Step 5 is what a tap on "+n more" does.
  - **2026.11.5-b9** (owner, 2026-11-11, after seeing b8 on the test tablet): a cell
    where two edges meet is the *later* edge's (`_cells` and its twin), so spare cells
    are in the picture's corner, not between the strips. The owner turned down corners
    as items in the edge list (YAGNI). The stage lists the sizes on screens now
    (`drawnAt` in `stage.tsx`, from the compositor's status, read once on opening).
  - **2026.11.5-b10** (not committed): each commander's `labels` (options once, in
    `labels.json`, not `layout.json`, which Sensor Watch's cards bundle): font, sizes, colours, bar/pill/none, and where
    the card's Talk chips go. `compositor/labels.py` draws the names; the card and the
    stage draw theirs from `cards/src/labels.ts`. The three DejaVu fonts live once, in
    `casa_mia/www/fonts` (the compositor reads them from the bundled component, the
    card from HA, the page from `api/compositor/font/<file>`). Seen in headless
    Chromium against a mocked API; **the card's caption and Talk chips are not seen in
    a browser**, and nothing is seen on the box. Lesson: b9's "On screens now" asked
    for `status` where the status is the API's root, and the mock had the same wrong
    address, so it passed; check a mocked address against the app's own routes.
  - **2026.11.5-b11** (not committed; the owner's notes on b10): pills have rounded
    ends and one height for their size (`labels.py` `name`, the card's `.caption.pill`,
    the stage's CSS); `talk_status_x/_y` and `talk_buttons_x/_y` nudge the Talk chips
    (`labels.ts` `nudge`); and the stage had an older `.main span` rule holding the
    main name at 14 px. Lesson: measure each setting in the browser at more than one
    value; b10's check only looked at one.
    Also in b11: the stage names the camera cropped the most (`lostBy`, `shapeName` in
    `measure.ts`), says when Show whole changes nothing, and lays the compositor's
    picture of the main camera's medium or high channel over its thumbnail.
  - **Looked into and not a fault (2026-11-11):** the owner saw no change between Crop
    to fill and Show whole with one camera as the main one. Read from the live box's
    state: that camera's recorded shape matches every one of its channels, so the
    recorded shape is right. The stage shows the commander's main camera *at start*, not the one now
    chosen on a tablet, so a 16:9 start camera shows no change; the stage now says so
    by name. Not seen failing on a tablet. Also in b11: the stage takes its first
    camera when none is set at start (empty main area since b5), and the Camera
    compositor page's sections fold (`compositor/fold.tsx`, kept per browser).
  - **2026.11.5-b12** (not committed): a commander's `main_keep` (one of nine places,
    the Over layer's anchor names; `labels.json` `picture`) is where a cropped main
    camera is cropped about: `labels.py` `keep` (Pillow's centering), `labels.ts`
    `keepPosition` (object-position) for the card's live video and the stage. One
    value for all modes, tiles stay centred; per-camera alignment was talked of and
    left (owner, 2026-11-11). "Re-lay out for its shape" is now "Fit the layout to
    it", which changes `layout.json` and so Sensor Watch's card bundle and version.
    `NinePoint` is new chrome (`controls.tsx`), not yet on the chrome cheat sheet.
  - **2026.11.5-b13** (not committed; the owner's phone showed tiles on all four
    sides and "+6 more" top right): the solver's fallback no longer keeps edges that
    found no fit (both engines; `STRIP` and the "phone's strip" cases in
    `tests/test_responsive_cases.py`), and a Responsive card in a column under 500 px
    takes the room below it (`columnHeight` in `commander/common.ts`). Still open: at
    a boundary the same CSS space lays out differently at 1x and 3x (the "phone's
    strip, 3x" case fits where 1x gives way), as the arithmetic is in device pixels.
  - **2026.11.5-b14** (not committed): the stage's sharper main picture asked for the
    medium channel, whose cache entry is the "(Waiting …)" placeholder unless a watched
    commander has fetched it. It now asks `thumb/<camera>?largest=1` (`cache.largest`:
    the biggest channel that has really come, else 404 and the thumbnail stays).
- **Camera Commander's guide (2026-11-12, docs only):** reworked for Responsive: Fixed or
  Responsive?, four worked examples, and eight pictures, all taken on the test VM. The
  VM's invented house now has 26 Generic Cameras, each a still served from its own
  `www/cams` (the Swap's AI-generated stand-in pictures and names, by the owner's word),
  three commanders (Whole house, Front of house, Doorbells) and views for them on its
  House dashboard, with Live main camera off there (a still has no live video). The
  Camera Commander integration had to be accepted under Discovered once the module had
  commanders. The scripts that made it were scratch files and are gone; the steps are in
  the saved note on the test VM.
- **Sensor Watch's guide (2026-11-12, docs only):** its first picture is retaken from the
  test VM (the card and four gauges, nothing else), and **How it works** near the top is
  a Mermaid diagram written to match `watch.py` `_consider` (better at once, worse after
  the hold-off, unavailable's longer wait, Stale at once, escalation). Rendered with
  Mermaid 10.9 to check it parses; not yet seen on GitHub.
- **2026.11.5-b3** (2026-11-11; **both seen working by the owner on the live box that day**): two
  Camera Commander faults on the owner's Mac.
  - **Safari over https showed no tiles.** HA's service worker handles every GET on HA's
    address, and Safari drops an endless stream that comes through a worker (shown with a
    stand-in page with no HA or Casa Mia code). The card, when its `<img>` stream fails
    on a page a worker controls, takes the picture as frames over a WebSocket
    (`pictures.py` `.ws`, `base.ts` `followPicture`). A hard refresh does not skip the
    worker in Safari: don't suggest it.
  - **The HA app for the Mac has no WebRTC.** `liveBy` picks WebRTC, else HLS
    (`webrtc.ts` `playHLS`, HA's `camera/stream`), else the drawn main camera; Talk needs
    WebRTC. HLS needs an explicit `play()`, a frame callback asked for before it loads
    is dropped, and its first frame took 8.5 s from cold (measured in Safari).
- **2026.11.5-b1** (2026-11-11; b2 is a refactor of the cards' reload offer; committed for the
  owner to try on the live box, where none of it has run yet): Sensor Watch gets Stale, the
  gauge card, the set-up (Set up…, four steps), Needs attention, More filters, the
  editor's Over time block. **A released bug fixed:** since 2026.11.2-b27 `Watcher._held`
  was both the hold-off's method and a dict, so a level that had to wait out its hold-off
  never counted (2026.11.2 to 2026.11.4); the dict is `_unsaid` now. No test had let a
  hold-off's timer fire inside a real HA; `tests_ha` does now. Screenshots of the page,
  group, set-up and gauge are from the test VM's invented house; the editor's is still
  to retake on a box with a month of statistics.
- **2026.11.3** (2026-11-10): released, and Sensor Watch's mirror published for the first
  time (phase 5, step 5).
- **2026-11-10:** phase 4, no build. `tools/mirror.py` generates a published component's
  own repository (the mirror) and publishes it; `release.py` runs it as step 7. Only its
  dry run has been run. Nothing is published and no mirror exists.
- **2026.11.3-b3** (2026-11-10): phase 3. A release gives its version to the components
  its builds changed; the app never puts a published component (`components.PUBLISHED`)
  back to an older version than the one in HA's config.
- **2026.11.3-b2** (2026-11-10): phase 2. Sensor Watch is its own integration; the app's
  option is retired, and a user who had it on is handed over with the same device,
  entities and records. `tests_ha/` and `.venv-ha` added for tests inside a real HA.
- **2026.11.3-b1** (2026-11-10): phase 1. Sensor Watch runs wholly in HA: records in HA's
  storage (imported once from the app), the page a sidebar panel over websocket commands
  and pushed feeds, the app's module gone.
- **2026-11-10:** agreed with the owner: Sensor Watch becomes its own integration
  (`casa_mia_sensor_watch`), running wholly in HA, published to the Marketplace through a
  generated mirror. Design, decisions and phases in `docs/design/marketplace-mirrors.md`;
  nothing built yet. Phase 0 answered the same day from HA 2026.11.1 and HACS 2.0.5.
- **2026.11.2-b27** (2026-11-10): Tablet Layout adds a small inset inside each panel's
  clipping boundary and includes it when sizing panels to their cards.
- **2026.11.2-b26** (2026-11-10): Commander card motion controls use a single column so
  Home Assistant's sliders and values have room in the editor.
- **2026.11.2-b25** (2026-11-10): orientation setup guarded once per page: a second
  bundle load had added duplicate controls and query clauses; a retry-load test covers it.
  Commander card editor grouped, with compact colours and conditional settings that retain
  their values while hidden; connection settings start collapsed.
- **2026.11.2-b24** (2026-11-10): screen conditions gain Any / Portrait / Landscape,
  default-on in Settings (`dashboards.screen_orientation`); `cards/src/screen-condition.ts`
  augments HA's shared editor. `docs/augmenting-home-assistant.md` collects the HA patches.
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

- **Next: Sensor Watch's testers and clean installs** (phase 5, steps 6 to 8 of
  `docs/design/marketplace-mirrors.md`). Casa Mia 2026.11.3 was released on 2026-11-10,
  and Sensor Watch is published by itself at `gazoodle/casa-mia-sensor-watch` (2026.11.3;
  HACS's action and hassfest pass; 2026.11.4 added its code owner). Its catalog
  submission is hacs/default#13883 (2026-11-11; reviews take months). Until then testers
  add it as a custom repository; the test VM installed and updated it that way from the
  Marketplace on 2026-11-11.
  Love it or Loathe it is published the same way at `gazoodle/casa-mia-love-or-loathe`
  (2026.11.7, released 2026-11-13); its catalog submission is hacs/default#14085.
  2026.11.8-b38 made songs played too often the entry's strike (owner, 2026-11-15: "a
  repetition is a strike", whatever a group says of the song), with a Repeats switch;
  `__init__._repeats_to_entry` moves 2026.11.7's group settings once. **Screenshots to
  take again on the test VM once it runs b38:** the page (`love-or-loathe.webp`,
  `-detail`: a Settings button, the Songs played too often row, no "Heard too often"
  group), the Settings dialog's strike (the guide's section has no picture yet), and
  the Activity page (`love-or-loathe-logbook.webp`, uncommitted: its return line now
  names the station), which then goes into the guide under "What happened".
  The live box handed Sensor Watch over correctly on a b3 build. Installing
  2026.11.2 or earlier now removes Sensor Watch's folder: restore a backup instead.
- **The test VM** (Home Assistant 2026.11.1 on 2026-11-11) has Sensor Watch's
  2026.11.5-b1 files copied over the Marketplace's 2026.11.4, and **an invented house the
  owner asked to keep** (2026-11-11): 16 template helpers (leak, smoke and problem
  sensors, batteries, a hot water temperature, four plug voltages), and what the set-up
  made from them (nine groups, 25 watched, the library's UK mains voltage profile, one
  notify automation). The docs' screenshots come from it: don't clear it. Left there
  earlier and not checked since: the stable app installed and stopped, and a test
  automation (`cm_old_trigger`) using the old device trigger.
  Since 2026-11-16 it also runs ZenOS-AI 2026.11.1 Beta 1, installed clean (persona
  Juniper, invented household, Claude agent with only the DojoTools exposed, summaries
  on the local Ollama model), so Dash-Bored's agent column has real Katas to show.
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
- **Sensor Watch's roll-up (2026.11.12-b1) has run on the box since 2026-11-22:** a
  failed cloud's sensors as one row and one notification.
- **Sensor Watch's Snooze (2026.11.12-b2) is built, not yet run on the box.** Seen in a
  local Home Assistant with an invented house: the card, the page at desk and phone
  widths, both actions. After it is installed and Home Assistant restarted, snooze the
  failed integration from the page: Status should drop to the next worst, the card keep
  its "1 snoozed" line, and the sidebar's notification go. Not yet seen: the Home tile's
  Snoozed line, Dash-Bored's alert leaving, a wall tablet.
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
