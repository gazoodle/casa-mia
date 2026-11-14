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
  `casa_mia_sensor_watch`; status, counts and problem entities; the `list` and `refresh`
  services; device triggers; `blueprint.py` installs and keeps up **Notify on Sensor
  Watch** (still at `blueprints/automation/casa_mia/`, so automations made from it carry
  on).
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
- **`engine.py`:** follows `state_changed` on the players (pushed). At a new track it
  undoes the last action, then acts: volume by a percentage or mute until the next
  track, or a switch of station for some minutes. `undo` and `away` are kept in HA's
  storage, so a restart loses neither; unloading puts volumes and mutes back at once.
  It never puts back over a person's change.
  `afresh` judges what is playing now at every start, so at each save of a group,
  change of feeling and rating (owner, 2026-11-13: a song added to a list while it
  plays must be acted on then). Safe because unloading undoes volumes and mutes first.
- **Works against a real player** (owner, 2026-11-13, on b5).
- **Its pictures** (b8) are from the test VM, where stand-in media players
  (`custom_components/cm_demo_players`, on the VM only) give it Kitchen, Living room,
  Bedroom and Garden to watch, with the people Ann and Ben, the entry Downstairs and
  the dashboard `music-demo`. Keep them there for the next pictures.
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

## Dash-Bored

Its own integration, `casa_mia_dash_bored`, since 2026.11.8-b1 (2026-11-13; name and
sidebar label agreed with the owner). Standalone like Sensor Watch: nothing imported from
`casa_mia`, no app option, no entities. In development. Guide: `docs/applets/dash-bored.md`.

- **Why it exists** (owner, 2026-11-13): dashboards that write themselves from the house,
  in styles people enjoy using; "it must not look cheap". The looks were tried first as
  working mock-ups on an invented house, in `docs/design/dash-bored/` (`index.html` is the
  gallery; `house.js` the house). The owner chose three families to build out: Gazette,
  Bakelite and Fridge, in that order, for the family first and the community after.
  Movement (a watch movement in three.js) and Contraption are the showpieces, not built.
- **The page and the families** (2026.11.8-b23). The sidebar's page (`panel_custom`, not in
  a frame, for every user) is `dash-bored-page` (`shell.ts`). It shows one family's
  element and holds the choice between them: two presses within `TWICE` in its top right
  corner, on nothing in `PRESSED`, open a dialog; the choice is in the browser's storage
  (`dash-bored-family`). A new family is an entry in `FAMILIES` there, an element defined
  in `index.ts`, and a class on `family.ts`, which holds what they all need: the house
  (`survey`/`read`, with `_surveyed` and `_moved` to override), the settings feed,
  `_follow` for a feed, `_call`, `_ask`, `_fault` and `_lost`. Each family's element is
  also a dashboard card.
- **Bakelite is the second family, begun** (owner, 2026-11-14: Bakelite now, the
  newspapers' work to the backlog). `bakelite.ts` on `bakelite/kit.ts` (each control drawn
  once, as a function) and `bakelite/styles.ts`, after `docs/design/dash-bored/bakelite.html`.
  Its first panel has lights and switches (`SHOWN`); what's left is in BACKLOG. Needles
  move by a CSS easing, not the mock-up's frame loop (a `ponytail:` note in its styles).
  Seen on the test VM at desktop and phone widths, not on a tablet.
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
- **Guarded devices** (my ruling for a live house, told to the owner): a lock, or a cover
  whose class is garage, gate or door, is never operated by a press on a sentence or a
  chip; that opens Home Assistant's dialog. The story's own remedy button may lock.
- **Sensor Watch's alerts come through `alerts.py`, not straight to the page.** Home
  Assistant lets only admins subscribe to a custom bus event, and a wall tablet's login
  is not one. `alerts.py` listens for `casa_mia_sensor_watch`, keeps the latest per
  sensor for this run (Sensor Watch says them all again at each start), and feeds any
  signed-in page (`casa_mia_dash_bored/alerts`). The two integrations name each other's
  event and nothing else.
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
  For the next build: `_reload` starts the reload with `eager_start=False`, so a page
  change's trail line comes before the restart it causes; the return line names the
  station ("Switched back to radio://harbour-fm" today, when Harbour FM is a station);
  the guide gets `docs/screenshots/love-or-loathe-logbook.webp` (taken 2026-11-13).
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
