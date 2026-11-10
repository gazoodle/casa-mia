# Marketplace mirrors, and Sensor Watch on its own

**Status:** agreed design (2026-11-10). Phase 0 is done, and the owner agreed what its
answers change the same day; the phases are edited to match. Phases 1 to 4 were built on
2026-11-10: phase 1 in 2026.11.3-b1, phase 2 in b2, phase 3 in b3, and phase 4 as
`tools/mirror.py`, run only as a dry run. Each phase below ends with what was built and
where it differs from the plan. Nothing is published: phase 5 is the owner's, and
"Before phase 5" lists what they need to decide first.

## The goal

Casa Mia's features go out through Home Assistant's Marketplace (HACS on older Home
Assistant versions), so more people find them and can use them. An app reaches only HA OS
and Supervised users who already know about Casa Mia; a Marketplace item reaches HA
Container and Core users too, and anyone browsing the catalog. The Casa Mia app stays in
the Apps store as it is. **Sensor Watch is the first item.** Others may follow the same way.

## Decisions (owner, 2026-11-10)

Each with its reason, so nobody argues it away later.

1. **The code stays in Casa Mia.** A mirror is a generated, public repository holding one
   Marketplace item, never edited by hand. Why: the Marketplace takes one item of one type
   per repository and refuses repositories that hold HA OS apps ([structure][structure]);
   this repository holds an app and several integrations.
2. **One domain and one runtime, whichever way it was installed.** Sensor Watch becomes the
   integration `casa_mia_sensor_watch` (name agreed), and the code a HACS user gets is
   exactly the code a Casa Mia user gets. Why: a HACS install must be superseded by a Casa
   Mia install with no breakage and nothing for the user to do. The reverse direction
   (Casa Mia back to HACS alone) is not supported or tested.
3. **Sensor Watch runs entirely in Home Assistant, for every user.** Records, profiles and
   groups in HA's storage; the page an admin-only sidebar panel served by the integration;
   scans and suggestions in HA. The app does no Sensor Watch work any more: it ships the
   component and links to the panel. Why: a Casa Mia install must run the same runtime as a
   HACS one, or superseding would change it underneath the user. It also ends the
   integration's copy of the records being kept up from the app (RULE FIVE).
4. **No onus on the user.** No Discovered card to click, no Repair asking them to install
   something, no rename to make. Why: owner, 2026-11-10: anything else is an ugly UX.
5. **Released components carry the release version.** `versioning.py release` restamps
   every component changed in that release to the release version (`2026.11.3`, not
   `2026.11.3-b14`). Why: a mirror's tag must equal its manifest version
   ([integrations][integrations]), and a trailing `-bN` reads as a beta.
6. **A mirror is published by a local script, `tools/mirror.py`, which `release.py` runs as
   its last step** (confirmed by the owner, 2026-11-10). It also runs alone, to retry. A
   release publishes a mirror when it changed that item. It uses the owner's `gh` login.
   Sensor Watch's mirror is `gazoodle/casa-mia-sensor-watch`.
   Why: no token able to create repositories sits in a public repository's secrets.
7. **The `sensor_watch_enabled` app option is retired in phase 2.** A user who has it on is
   migrated with nothing to do; a user who has it off gets no entry; a new user turns Sensor
   Watch on by adding the integration, as a HACS user does. Until phase 2 it keeps its
   meaning. Why: the option only ever decided whether the app started its module, and the
   app does no Sensor Watch work any more (decision 3).
8. **The store's own Update after a supersede is accepted.** HACS and the Marketplace keep
   showing the version they installed themselves, and offer the mirror's release as an
   update over files Casa Mia already wrote (phase 0, check 3). Phase 3 tests it and the
   guide says so. Why: the only way to stop it is to write into the store's own storage.

## Sensor Watch today

As built by 2026.11.3-b2 (2026-11-10). `HANDOVER.md`'s Sensor Watch section has the detail.

- **Integration** (`integration/custom_components/casa_mia_sensor_watch/`): everything.
  The records, profiles, library, groups, suggestions and scans (`records/`, in Home
  Assistant's storage), the watcher and levels, Home Assistant's own health checks, the
  services, device triggers, blueprint, websocket commands, the panel and its own card
  bundle. It imports nothing from `casa_mia`.
- **App:** nothing of Sensor Watch runs there. `GET /sensor-watch/export` still hands over
  the records file of an install from before 2026.11.3, and the Home tile shows Sensor
  Watch's summary from Home Assistant.
- **`casa_mia`:** `sensor_watch.py` (the handover and the old service names) and
  `device_trigger.py` (a forwarder for triggers saved under its domain).
- **Sources:** the page in `app/web/src/sensor-watch/`, the card and eye in
  `integration/cards/src/sensor-watch/`. Both are built into the component's `www/`.
- **Tests:** `tests/test_sensor_watch_*.py`, and `tests_ha/` inside a real Home Assistant.
- **History:** built 2026-10-11 as an app module plus its own child integration,
  `casa_mia_sensor_watch`; that joined `casa_mia` in 2026.10.10-b4 ("one device, so one
  integration"). It left again, to stand alone, in 2026.11.3-b2.

## Where to start

Read this doc, then the Sensor Watch sections of `HANDOVER.md` and `BACKLOG.md`, and
`docs/applets/sensor-watch.md` (what it does, for users). Then phase 0.

Rules that bite here: bump first (RULE ZERO) for every build touching `app/` or
`integration/`; files under 800 lines (RULE THREE); push, never poll (RULE FOUR); Sensor
Watch is in daily use on the live box and deploys have no staging, so try each phase's
migration on the owner's test HA first (ask for it; never the live box without a go-ahead) and keep the old data
until the new is proven.

## Phases

### Phase 0: check the assumptions (no code; done 2026-11-10)

The four questions, each answered from source below:

- How HA finds a device trigger's code: by the `domain` in the trigger's config, or by the
  device's config entry. This decides the device-trigger shim in phase 2.
- Whether one integration can create another domain's config entry without a user step
  (`hass.config_entries.flow.async_init(..., context={"source": SOURCE_IMPORT})` or
  similar), and what HA shows when it does.
- What HACS does to `custom_components/<domain>/` on **Remove** (expected: deletes it) and
  how it treats a folder whose files changed under it.
- How a sidebar panel registered by a custom integration is served and restricted to admins
  (`panel_custom`, `async_register_built_in_panel`, `require_admin`).

#### The answers

Read from Home Assistant core at tag `2026.11.1` (the latest release, 2026-11-09), from
`2026.3.0` (Casa Mia's floor) where the two could differ, and from HACS at tag `2.0.5` (its
latest release, 2025-01-28). "Core" paths are under `homeassistant/`, "HACS" paths under
`custom_components/hacs/`. The Marketplace is a core integration
(`components/marketplace/`) that first shipped in 2026.11 (it is not in `2026.10.0`) and
takes over a HACS install's entry, entities and devices (`marketplace/migration.py`), so
check 3 has two answers: HACS before 2026.11, the Marketplace from then on.

**1. Device triggers: the code is found by the `domain` in the trigger's config.**

- Attaching loads `<domain>.device_trigger` from `config[CONF_DOMAIN]` and calls its
  `async_attach_trigger` (core `components/device_automation/trigger.py:71-74`; the loader
  is `device_automation/__init__.py:181-207`).
- Validating loads the same platform the same way (`device_automation/helpers.py:94-96`),
  and refuses a device id that isn't in the registry ("Unknown device",
  `helpers.py:98-104`).
- The device's config entry is looked at in only two places. One is the list of triggers
  the automation editor offers for a device, which asks the domains of the device's config
  entry and of its entities (`__init__.py:254-285`). The other is validation, and only when
  the platform defines `async_validate_trigger_config`: the device must then have a config
  entry of the trigger's domain, or the trigger is refused with "Device … has no config
  entry from domain …" (`helpers.py:132-141`). A platform that defines only `TRIGGER_SCHEMA`
  returns before that check (`helpers.py:113-117`). `2026.3.0` has the same order.
- `casa_mia/device_trigger.py` defines only `TRIGGER_SCHEMA` (line 37).

What this means for phase 2: a stored trigger with `domain: casa_mia` keeps reaching
`casa_mia/device_trigger.py` after the device belongs to `casa_mia_sensor_watch`. The shim
is that file, kept, forwarding `async_attach_trigger` and `async_get_trigger_capabilities`
to the new domain's platform (`async_get_device_automation_platform` is public,
`__init__.py:86`), and returning nothing from `async_get_triggers` (HA no longer asks
`casa_mia` for that device anyway, and new automations get the new domain). Two conditions:
the shim must never gain an `async_validate_trigger_config`, and the device must keep its
id through the move.

**2. Another domain's config entry: yes, with no user step, and HA shows nothing.**

- `hass.config_entries.flow.async_init(domain, context={"source": …}, data=…)` takes any
  domain and doesn't check who calls it (core `config_entries.py:1626-1712`). The flow's
  first step is named after the source (`config_entries.py:1995`), so `SOURCE_IMPORT` runs
  the target's `async_step_import`, which it must define.
- When that step returns `async_create_entry`, no discovery event fires and nothing is told
  to the pages watching for flows: both happen only for a flow still in progress
  (`config_entries.py:1696-1710`). The entry appears under Settings > Devices & services
  with no notification and no Discovered card.
- Core does this itself: the Marketplace creates its own entry at start with
  `SOURCE_SYSTEM` (`components/marketplace/__init__.py:116-119`,
  `marketplace/config_flow.py:64-68`).
- With `"single_config_entry": true` in the target's manifest, a call when an entry exists
  returns an abort, `single_instance_allowed`, before the flow starts
  (`config_entries.py:1650-1667`). That makes the call repeatable, and covers a HACS user
  who already has the entry.
- The target must be known to the loader. The list of custom components is scanned once
  and cached (core `loader.py:388-416`); for a folder written after the scan, `async_init`
  raises `UnknownHandler` and logs "Cannot find integration" (`config_entries.py:4424-4430`).
  The app writes both components and both wait for the same restart, so this shouldn't
  happen, but the call must catch it, log a warning and try again at the next start.
- **The entry is set up inside the call** (`config_entries.py:1962` calls `async_add`, which
  awaits `async_setup`, `2378-2389`). And an entity can change platform only while it isn't
  loaded (`helpers/entity_registry.py:2327-2328`). So `casa_mia` can't move the entities
  after creating the entry (the new entry would already have made its own, with `_2`
  entity ids) or before (there is no entry id yet). The move has to run in
  `casa_mia_sensor_watch`'s own `async_setup_entry`, before it forwards its platforms. This
  is what b4's `migrate()` did the other way, and what the Marketplace does to take over
  HACS (`marketplace/__init__.py:186`, `marketplace/migration.py:156-213`).
- Moving the device differs by version: `2026.11.1` has a device belong to one config entry
  and moves it with `async_update_device(new_config_entry_id=…)`; `add_config_entry_id`
  with `remove_config_entry_id` still moves it but is deprecated
  (`helpers/device_registry.py:3978-3989`). `2026.3.0` has no `new_config_entry_id`.

**3. Remove deletes the folder in HACS; the Marketplace refuses while the integration is
set up. Neither notices files that changed.**

- HACS 2.0.5: Remove calls `uninstall()` (HACS `websocket/repository.py:254-271`), which
  deletes the whole `custom_components/<domain>/` folder (`repositories/base.py:758-819`,
  `repositories/integration.py:36-38`). The only guard is against deleting
  `custom_components` itself (`utils/path.py:13-41`). It doesn't look for config entries:
  the entry stays, and fails to load after the next restart.
- Marketplace 2026.11.1: uninstalling an integration whose domain has any config entry is
  refused: "… is still set up, and without its files that setup would fail to load. Delete
  it under Settings > Devices & services before uninstalling it." (core
  `components/marketplace/websocket/repository.py:350-363`, `strings.json:247-249`). With
  no entry it deletes the folder as HACS does (`marketplace/repositories/base.py:989-1064`)
  and raises a restart Repair if the code was loaded (`repositories/integration.py:244-262`).
- Changed files: neither reads the folder. The installed version is what the store wrote
  to its own storage when it last installed (HACS `utils/data.py:293-301`; Marketplace
  `utils/data.py:402`), and an update is offered by comparing that with the latest release
  (HACS `repositories/base.py:410-428`). The Marketplace's one check of the disk is at
  start: a folder that is gone is marked not installed, and logged
  (`marketplace/utils/data.py:305-330`).
- An update replaces the folder whole, whatever is in it: HACS copies it to a backup and
  deletes it (`utils/backup.py:59-72`, `repositories/base.py:954-956`); the Marketplace
  moves it into a backup, writes the new one, and puts the old one back if the result
  wouldn't load (`marketplace/utils/backup.py:98-121`, `repositories/base.py:1269-1325`,
  `repositories/integration.py:97-125`).

What this means: after Casa Mia has superseded a HACS or Marketplace install, the store
still shows the version it installed itself. When the mirror publishes the release Casa Mia
already brought, the store offers it as an update; installing it rewrites the same files
and asks for a restart. With a `-bN` build from the app on disk, that update is a downgrade
until the app next starts and writes its own copy back.

**4. The panel: a static path for the bundle, `panel_custom` to register it, and admin-only
is enforced by the websocket commands, not by the panel.**

- Serving: `hass.http.async_register_static_paths([StaticPathConfig(url, path)])` (core
  `components/http/server.py:77-83`, `434-464`), as `casa_mia` does for `cm-cards.js`. These
  are plain GET routes with no login check; only views check `requires_auth`
  (`helpers/http.py:62`, `136`). The bundle can be fetched by anyone who can reach HA, so it
  holds no secrets.
- Registering: `panel_custom.async_register_panel(hass, frontend_url_path,
  webcomponent_name, sidebar_title, sidebar_icon, module_url=…, embed_iframe=…,
  require_admin=True)` (`components/panel_custom/__init__.py:80-145`), which calls
  `frontend.async_register_built_in_panel(component_name="custom", …)`
  (`components/frontend/__init__.py:246-283`). Registering a path twice raises
  `ValueError` (`frontend/__init__.py:275-279`), so the entry's unload removes it with
  `frontend.async_remove_panel` (`287-298`).
- `require_admin=True` leaves the panel out of the list a non-admin user's page is given
  (`frontend/__init__.py:755-775`). That hides it and nothing more, and an admin can turn it
  off for any panel with HA's own `frontend/update_panel` command (`871-900`; in `2026.3.0`
  too). What restricts the data is `@websocket_api.require_admin` on each command behind the
  page, which raises `Unauthorized` (`components/websocket_api/decorators.py:54-69`). The
  Marketplace does both (`marketplace/__init__.py:99-106`,
  `marketplace/websocket/repository.py:321`).
- The floor: `2026.3.0`'s `async_register_panel` takes the same arguments apart from
  `handle_safe_area`, which is newer. Passing it would break 2026.3.
- Not checked, because they are in the frontend's repository and not core: what a
  non-admin sees at the panel's address, and how `embed_iframe` hands `hass` to the page.
  Both belong to phase 1, step 4.

#### What the answers changed (agreed by the owner, 2026-11-10; the phases below say the same)

1. **Phase 2, the migration:** `casa_mia` creates the entry (an import flow, with
   `single_config_entry`), but the entities and the device are moved by
   `casa_mia_sensor_watch` in its own setup, not by `casa_mia`. The standalone component
   then knows the string `casa_mia` and the old unique ids, with no import.
2. **Phase 2, the device move** needs one call on 2026.11 and another on the floor, or the
   deprecated pair on both.
3. **Phase 2, the shim** is `casa_mia/device_trigger.py` kept as a forwarder, with only
   `TRIGGER_SCHEMA`.
4. **Phase 3:** the store's stale version and its Update after a supersede (check 3) are
   not covered by "No downgrade", which only guards the app's side. Add to the supersede
   tests: press Update in the store afterwards. The owner accepted the offered update
   (decision 8).
5. **The known trap** applies to HACS only (see below).
6. **Phase 1, steps 2 and 4:** `require_admin` on every command, never the panel's flag
   alone; don't pass `handle_safe_area`.

### Phase 1: Sensor Watch runs in HA, still inside `casa_mia`

Several builds; the app keeps working throughout. New code in `casa_mia/sensor_watch/`
imports nothing from the rest of `casa_mia` (`..`), so phase 2 is a move. Keep the
existing imports from `..` only until phase 2 removes them.

1. **Storage.** Records, profiles and groups in `helpers.storage.Store`, key
   `casa_mia_sensor_watch` from the start (so phase 2 moves no data). A one-time import from
   the app (`/sensor-watch/records`, or a new full export route) keeps the app's file until
   the import is confirmed, and logs what it took. Moves with it: the checks in `common.py`,
   `profiles.py`, `groups.py` (group sync on HA's registry events, no timer), `defaults.py`
   and `library.json`. The watcher reads its own store; `_ws_apply`, the revision in
   `/health` and the fetch go.
2. **The page's API as websocket commands** (admin only), replacing `api.py`'s routes; its
   long poll becomes a subscription.
3. **Reads ported:** `history.py`, `scans.py`, `suggest.py` and `status.py` go from the `HA`
   client to in-process calls (recorder statistics and history in the executor, registries
   directly). `live.py`'s job (the levels for the page) is the watcher's own state now.
4. **The page as a panel:** a new Vite entry from `app/web/src/sensor-watch`, with the shared
   chrome (`ui.tsx`, `controls.tsx`, `confirm.tsx`, `pills.css`) bundled; served and
   registered by the integration, admin only, talking to HA's websocket. Casa Mia's admin
   page links to it (`App.tsx`'s route becomes the link; `open.ts` lands on the panel). One
   page, never two.
5. **The app's module retired:** `modules/sensor_watch/` deleted, `__main__.py`'s wiring and
   routes gone. The Home tile reads Sensor Watch's status from HA. The
   `sensor_watch_enabled` option keeps its meaning until phase 2 (decision 7): the app tells
   the integration whether it is on.

**Built in 2026.11.3-b1**, as one build rather than several, and tried on the test VM
(a 2026.10.11 install updated to it). Where it differs:

- The page's API is one websocket command carrying the records' routes
  (`casa_mia_sensor_watch/api`), beside the pushed feeds, not a command per route.
- A failed import is a Repair and nothing is watched until it succeeds; it doesn't stop
  `casa_mia` setting up.
- `npm run dev` can't show the Sensor Watch page, which talks to Home Assistant's websocket.
- `open.ts`'s note in the browser's storage went: the eye's tap carries the entity in the
  panel's address.

### Phase 2: its own integration, `casa_mia_sensor_watch`

One build. The component moves to `integration/custom_components/casa_mia_sensor_watch/`,
taken off `RETIRED`.

- **Standalone:** its own config flow (one entry, no fields), device, entities (sensor,
  binary_sensor, button), services (`casa_mia_sensor_watch.list`, refresh), device triggers,
  websocket commands, panel, blueprint, `brand/`, translations, and its own identical copies
  of `restart_notice.py` and `repairs.py` (`tests/test_restart_notice.py`). It imports
  nothing from `casa_mia`. The event name stays `casa_mia_sensor_watch`.
- **Card and eye** move into the component's own `www/` bundle, served and registered by it
  as `casa_mia` does with `cm-cards.js` (`async_register_static_paths`, `add_extra_js_url`);
  `cm-cards.js` drops them, since an element name can be registered only once.
- **Migration, in two halves** (phase 0, check 2). `casa_mia`, at setup, creates the
  `casa_mia_sensor_watch` entry without a user step (an import flow; the manifest has
  `single_config_entry`), and only for a user who had Sensor Watch on (decision 7).
  `casa_mia_sensor_watch`, in its own setup and before it forwards its platforms, moves the
  entities across keeping their entity ids and history (as `migrate()` did in b4, the other
  way), and the device, which keeps its id. It knows the string `casa_mia` and the old
  unique ids, and imports nothing. Logged; repeatable if interrupted.
- **Nothing breaks for Casa Mia users:** `casa_mia.sensor_watch_list` stays as an alias in
  `casa_mia`, forwarding and logging a deprecation warning; automations with Sensor Watch
  device triggers stored as `domain: casa_mia` keep working through a small shim:
  `casa_mia/device_trigger.py` stays, with only `TRIGGER_SCHEMA`, and forwards to the new
  domain's platform (phase 0, check 1). The `sensor_watch_enabled` option goes (decision 7).
- **The screenshot swap:** with Casa Mia present, it reaches Sensor Watch through HA (an
  event, or a documented `hass.data` key), never an import; without Casa Mia there is none.
- **Docs and rules:** `CLAUDE.md`'s component list and "a module with one device lives in
  `casa_mia`" rule, `docs/architecture.md` ("Integration delivery is push (no HACS)"), the
  user guide and the changelog.
- **Tests:** the integration's tests under `pytest-homeassistant-custom-component` on
  Python 3.13 (the venv is 3.11 and pyright skips `integration/`), in a new CI job. Adding a
  required check to `main`'s ruleset is a remote change: ask the owner.

**Built in 2026.11.3-b2.** Where it differs:

- **The swap** reaches Sensor Watch by dispatcher signal (`casa_mia_swap`, asked for with
  `casa_mia_swap_ask`), since a rule is a function and can't travel in a bus event.
- **A failed handover** is a Repair, retried when `casa_mia` reloads, as in phase 1. One
  edge: if the app can't be reached and the user then adds Sensor Watch by hand, the
  device moves, and `casa_mia` no longer offers the app's old records. The app keeps its
  file.
- **The app tells the integrations when it has written newer files**
  (`casa_mia_components_installed`), so Sensor Watch checks for its restart Repair without
  `casa_mia`'s coordinator. Nobody fires it for an install from HACS.
- **The panel** stays in the sidebar through a reload and leaves when the entry is deleted.
  Removing it under an open page broke Home Assistant's own page in b1.
- **The card bundle** (`www/cards.js`) has no "reload to update" toast, and
  `tools/dev_cards` doesn't serve it.
- **The Home tile** shows when Sensor Watch answers, last under "Running here", and only
  when Casa Mia's page is open inside Home Assistant.
- **The device move** uses `async_update_device(new_config_entry_id=…)` where Home Assistant
  has it, and add-then-remove where it doesn't. Tested on Home Assistant 2026.10.4 and
  2026.2.3; 2026.3.0 itself was not.
- **The tests** need Python 3.14, not 3.13 (the current
  `pytest-homeassistant-custom-component` runs Home Assistant 2026.10.4), and Home
  Assistant's frontend package, because the panel depends on it. They are in `tests_ha/`,
  with a venv of their own (`.venv-ha`) and a CI job, "Python / tests in Home Assistant".
  It is not yet a required check on `main`: that is the owner's to add.

**Tried on the test VM** (Home Assistant 2026.9.4, 2026-11-10), from both starting points:
2026.11.3-b1, with its records already in Home Assistant, and the 2026.11.2 release, with
its records still in the app. Each time the device, the entity ids, the records and the
List service's answer were the same afterwards, and an automation with the old
`casa_mia` device trigger still fired.

### Phase 3: versions and the supersede

- **Restamp at release** (decision 5): `versioning.py release` restamps each component
  changed since the last release, and updates `integration/versions.lock.json` (the digest
  leaves the manifest version out).
- **No downgrade:** `install_component` (`app/src/casa_mia/components.py`) writes a component
  only when its version is at least the one on disk; otherwise it logs a warning and leaves
  the folder alone. Same version, same files: nothing written, no restart Repair.
- **The supersede, tested:** a HACS-installed Sensor Watch, then Casa Mia installed, with
  the HACS copy at the same version, an older one and a newer one. Records, entity ids,
  history, automations and the card all carry on, and the user does nothing. Then press
  Update in the store (decision 8): the same files are written again and nothing is lost.

**Built in 2026.11.3-b3.** Where it differs:

- **No downgrade covers published components only**, not every component as the line
  above says. They are listed once, in `components.PUBLISHED` (today Sensor Watch). Why:
  only a store can put a newer copy in Home Assistant's config, and the rule applied to
  the rest would stop the documented rollback (installing an earlier app,
  `docs/releases.md`) from taking `casa_mia` and its children back with the app. The owner
  was away when this was decided; widening it is one line.
- **Rolling back to 2026.11.2 or earlier removes Sensor Watch's folder**, because those
  versions list `casa_mia_sensor_watch` as retired. `docs/releases.md` says to restore a
  backup instead.
- **The restamp** gives the release's version to a component whose version is one of that
  release's builds, and leaves the rest. `release.py` commits and restores the manifests
  and the lock with the other release files.
- **The supersede was tried on the test VM** (Home Assistant 2026.9.4) by editing the
  installed copy's version, since there is no mirror to install from and no HACS on the VM:
  - Same version: nothing written, no restart asked.
  - Newer copy (2026.12.1): left alone, with a warning in the app's log.
  - Older copy (2026.11.2): replaced, and Sensor Watch raised its restart Repair within
    seconds. After the restart the device, entity ids, records and List answer were the
    same, the old device trigger still fired, and the page and card loaded.
  - The store's Update (the folder replaced whole with the same files): "current", no
    restart asked, nothing lost.
  A real install from HACS and from the Marketplace is still to be done, in phase 5.

### Phase 4: the mirror

`tools/mirror.py` (decision 6), run by `release.py` after its publish step, and alone to
retry. For each mirrored component whose manifest version equals the release version:

1. Wait for the Casa Mia Release workflow to succeed (`gh run watch`, a progress line at
   least every 30 seconds), so a mirror never gets ahead of an app that failed to build.
2. Generate the mirror's tree from the release tag: the component as it is (compiled
   assets included), a README, `hacs.json` (`homeassistant` at Casa Mia's minimum, 2026.3
   today), the licence and attribution, and the mirror's own workflow running the HACS
   action (`category: integration`) and hassfest, no checks ignored.
3. Create the mirror with `gh repo create` if it is missing (issues off; the manifest's
   `issue_tracker` and `documentation` point at Casa Mia), then commit and push.
4. Wait for the mirror's validation to pass; only then tag and `gh release create`, with
   the source commit in the notes.
5. Retries: a tag already holding the same tree is success; one holding a different tree
   stops and says so. The summary names each mirror and whether it published; never "all
   done" when only some were.

Build it with a dry run (generate and validate, publish nothing) and run that before any
publishing. A fork running `release.py` skips this step unless it names its own mirror
owner. The README comes from `docs/applets/sensor-watch.md`: what it does, what it needs,
installing, and that it is part of Casa Mia.

**Built as `tools/mirror.py`** (no app build: it changes nothing a box installs), with
`release.py` running it as step 7 and `docs/releases.md` describing it. Only the dry run
has been run: `tools/mirror.py --dry-run` generated the mirror from `HEAD` (48 files), its
own checks passed and so did hassfest, in docker. Where it differs:

- **Issues stay on in the mirror.** HACS's validation fails a repository with issues off
  (its `issues` check, HACS 2.0.5), and the plan wants no check ignored. The mirror has an
  issue form that allows no blank issue and offers one link, to Casa Mia's issues.
- **The repository's description and topics** are set at every publish, because HACS
  checks for both. The description is the guide's first paragraph.
- **The README** is the guide from its top to the end of its first section, with every
  link and picture pointed at Casa Mia on GitHub at the release's tag, then generated
  sections for installing and for its place in Casa Mia. An anchor always points into the
  whole guide, even when its section came along.
- **A component's guide** is found by name: `docs/applets/` plus the mirror's name without
  `casa-mia-`.
- **A fork** is an origin that isn't the repository named in the component's
  `issue_tracker`. It publishes no mirror unless `CM_MIRROR_OWNER` is set.
- **It asks before publishing**, as every other step of `release.py` does.
- **Retries compare git trees:** the generated files are committed on the mirror's own
  history, and git says whether that is new, already pushed, or already tagged. A test
  runs this against a local repository; nothing has run against GitHub.
- **Waiting for a workflow** is `gh run watch`, after looking for the run for up to two
  minutes (a run just started isn't listed at once).
- **hassfest runs before the push** when docker is running, as well as in the mirror's
  workflow. Its image is amd64 only, so it is emulated on an Apple silicon Mac.

### Before phase 5 (found while building; the owner's to decide)

- **HACS's `brands` check: settled, nothing to do.** HACS 2.0.5 passed only a domain
  listed in the `home-assistant/brands` repository, but HACS's `main` accepts the
  integration's own `brand/icon.png` since 2026-02-28 (hacs/integration#5128), and the
  mirror carries Sensor Watch's `brand/` folder. The mirror's workflow uses
  `hacs/action@main`. Its first run (step 5) is the proof.
- **Issues on, with a link to Casa Mia: agreed** (owner, 2026-11-10). Why: HACS's
  validation fails a repository with issues off.
- **"No downgrade" covers published components only: agreed** (owner, 2026-11-10). Why:
  only the app installs the others, so a newer copy of one means the app was rolled
  back, and `casa_mia` must match the app it talks to.
- **The guide says "It isn't published there yet."** Remove that sentence in the release
  that first publishes the mirror: its README links to that section at the release's tag.
- **"Python / tests in Home Assistant"** isn't a required check on `main` yet.
- **Not yet run anywhere:** the publishing half of `tools/mirror.py` against GitHub, the
  new CI job, and Home Assistant 2026.3.0 itself (the floor).

### Phase 5: first publication (the owner's call)

Creating the mirror, the first publication and the catalog submission are remote actions:
ask first. In order (written 2026-11-10; none of it is done):

1. **Settle the list above.** Whatever it changes goes into `dev` before the release. The
   guide's "It isn't published there yet." is removed then too, because the mirror's
   README links to the guide as it is at the release's tag.
2. **Push `dev`.** The "Python / tests in Home Assistant" job runs on GitHub for the first
   time. When it has passed, add it to `main`'s required checks and correct the number of
   checks in `CLAUDE.md`.
3. **Install the build on the live box** and see Sensor Watch handed over there: its own
   integration set up, with the same device, entities and records, and no Repair left.
   **Done 2026-11-10** with 2026.11.3-b3 on Home Assistant 2026.11.1: the entry was made
   by the import, the device and every entity moved to it, the records, profiles and
   groups came over, and no Repair was left. That was read from the config share's
   storage files; the log wasn't seen.
4. **Run `tools/mirror.py --dry-run`** on the commit to be released.
5. **Release with `tools/release.py`.** Its step 7 asks, then creates the mirror (public
   from that moment), pushes the generated files and waits for the mirror's own
   validation. That is the first time HACS's action sees it. If a check fails, nothing is
   tagged and no version is published: fix the cause and run `tools/mirror.py <version>`
   to carry on.
6. **Testers add the mirror as a custom repository**, by its URL. It is in no catalog, so
   nobody else is offered it.
7. **The runs on a clean Home Assistant, before advertising:** a fresh install, setup,
   restart and removal, through HACS on a supported older version and through the
   Marketplace on 2026.11 or later. Using 2026.3 for the older one, if HACS still supports
   it, also tries the floor. The update can't be tried until a second version is
   published, so it waits for the next release that changes Sensor Watch. Then add the
   Casa Mia app to the same machine and check each case in the guide's "With HACS or the
   Marketplace" (phase 3's supersede).
8. **The catalog:** a separate submission to `hacs/default` ([catalog][catalog]), with no
   promise of acceptance.

## Known trap

**Remove in HACS deletes the folder** (confirmed in phase 0, check 3). After Casa Mia has
superseded a HACS install, removing Sensor Watch in HACS takes the component away until the
app next starts and installs it again. The guide says so; nothing is built for it. On Home
Assistant 2026.11 and later the Marketplace refuses the removal while Sensor Watch is set
up, so the trap is HACS's only.

## Open (owner)

- Later items: which dashboard features (the Tablet Layout, Over layer, garnish) form one
  plugin mirror. The earlier notes on that bundle are in `BACKLOG.md`.

## References

- [Repository structure][structure]
- [Publishing an integration][integrations]
- [Releases and updates](https://contributors.home-assistant.io/marketplace/guides/releases/)
- [Catalog submission][catalog]

[structure]: https://contributors.home-assistant.io/marketplace/reference/repository-structure/
[integrations]: https://contributors.home-assistant.io/marketplace/guides/integrations/
[catalog]: https://contributors.home-assistant.io/marketplace/guides/catalog/
