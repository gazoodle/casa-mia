# Marketplace mirrors, and Sensor Watch on its own

**Status:** agreed design, ready to build (2026-11-10). Nothing in it is built yet. Start at
"Where to start" below; the phases are in order, and each ends in a working build.

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
   its last step** (proposed 2026-11-10; taken as agreed when the owner asked for this doc to
   be made ready; confirm with the owner before phase 4). It also runs alone, to retry. A
   release publishes a mirror when it changed that item. It uses the owner's `gh` login.
   Why: no token able to create repositories sits in a public repository's secrets.

## Sensor Watch today

The parts and their sizes (2026-11-10):

- **App** (`app/src/casa_mia/modules/sensor_watch/`, about 3,000 lines): records in
  `sensor-watch.json`, profiles, the library (`library.json`), groups synced on HA's
  registry events, suggestions from recorder statistics, Scan my house, and `live.py`,
  which holds a websocket to HA and pushes each save to the integration. It reads HA through
  the app's `HA` client (`app/src/casa_mia/ha.py`) and imports nothing else from the app.
  Started in `__main__.py` while `sensor_watch_enabled` is on; serves `/api/sensor-watch/`
  and `/sensor-watch/records`.
- **Integration** (`integration/custom_components/casa_mia/sensor_watch/`, about 1,500
  lines): the watcher (`watch.py`), the levels, the blueprint, HA's own health checks
  (`system.py`), the `casa_mia.sensor_watch_list` and refresh services, and two websocket
  commands. It takes its records from the app: the revision from `/health` through Casa
  Mia's coordinator, the records from `/sensor-watch/records`, changes pushed over
  `_ws_apply`. Its entities are made by `casa_mia`'s sensor, binary_sensor and button
  platforms; its device triggers are in `casa_mia/device_trigger.py`; it follows the
  screenshot swap (`casa_mia/swap_rules`).
- **Page** (`app/web/src/sensor-watch/`, about 3,200 lines): talks REST to the app. Routed in
  `App.tsx` (`#/sensor-watch`); the eye's jump to the editor goes through `open.ts`.
- **Cards** (`integration/cards/src/sensor-watch/`): the card and the eye, in `cm-cards.js`.
- **Tests:** about 2,300 lines (`tests/test_sensor_watch_*.py`, `tests/sensor_watch_fakes.py`).
- **History:** built 2026-10-11 as an app module plus its own child integration,
  `casa_mia_sensor_watch`; that joined `casa_mia` in 2026.10.10-b4 ("one device, so one
  integration"), whose `migrate()` moved the entities across. The domain is in
  `components.py` `RETIRED`, so the app deletes that folder at every start.

## Where to start

Read this doc, then the Sensor Watch sections of `HANDOVER.md` and `BACKLOG.md`, and
`docs/applets/sensor-watch.md` (what it does, for users). Then phase 0.

Rules that bite here: bump first (RULE ZERO) for every build touching `app/` or
`integration/`; files under 800 lines (RULE THREE); push, never poll (RULE FOUR); Sensor
Watch is in daily use on the live box and deploys have no staging, so try each phase's
migration on the owner's test HA first (ask for it; never the live box without a go-ahead) and keep the old data
until the new is proven.

## Phases

### Phase 0: check the assumptions (no code)

Answer each with evidence from HA's or HACS's source, and write the answers into this doc:

- How HA finds a device trigger's code: by the `domain` in the trigger's config, or by the
  device's config entry. This decides the device-trigger shim in phase 2.
- Whether one integration can create another domain's config entry without a user step
  (`hass.config_entries.flow.async_init(..., context={"source": SOURCE_IMPORT})` or
  similar), and what HA shows when it does.
- What HACS does to `custom_components/<domain>/` on **Remove** (expected: deletes it) and
  how it treats a folder whose files changed under it.
- How a sidebar panel registered by a custom integration is served and restricted to admins
  (`panel_custom`, `async_register_built_in_panel`, `require_admin`).

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
   routes gone. The Home tile reads Sensor Watch's status from HA. Decide with the owner what
   the `sensor_watch_enabled` option means now (likely: nothing; the integration is set up or
   not).

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
- **Migration, run by `casa_mia` at setup, once:** create the `casa_mia_sensor_watch` entry
  without a user step (phase 0), move the entities across keeping their entity ids and
  history (as `migrate()` did in b4, the other way), and the device. Logged; repeatable if
  interrupted.
- **Nothing breaks for Casa Mia users:** `casa_mia.sensor_watch_list` stays as an alias in
  `casa_mia`, forwarding and logging a deprecation warning; automations with Sensor Watch
  device triggers stored as `domain: casa_mia` keep working through a small shim in
  `casa_mia` (how, from phase 0).
- **The screenshot swap:** with Casa Mia present, it reaches Sensor Watch through HA (an
  event, or a documented `hass.data` key), never an import; without Casa Mia there is none.
- **Docs and rules:** `CLAUDE.md`'s component list and "a module with one device lives in
  `casa_mia`" rule, `docs/architecture.md` ("Integration delivery is push (no HACS)"), the
  user guide and the changelog.
- **Tests:** the integration's tests under `pytest-homeassistant-custom-component` on
  Python 3.13 (the venv is 3.11 and pyright skips `integration/`), in a new CI job. Adding a
  required check to `main`'s ruleset is a remote change: ask the owner.

### Phase 3: versions and the supersede

- **Restamp at release** (decision 5): `versioning.py release` restamps each component
  changed since the last release, and updates `integration/versions.lock.json` (the digest
  leaves the manifest version out).
- **No downgrade:** `install_component` (`app/src/casa_mia/components.py`) writes a component
  only when its version is at least the one on disk; otherwise it logs a warning and leaves
  the folder alone. Same version, same files: nothing written, no restart Repair.
- **The supersede, tested:** a HACS-installed Sensor Watch, then Casa Mia installed, with
  the HACS copy at the same version, an older one and a newer one. Records, entity ids,
  history, automations and the card all carry on, and the user does nothing.

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

### Phase 5: first publication (the owner's call)

Creating the mirror, the first publication and the catalog submission are remote actions:
ask first. Start as a custom repository for testers. Before advertising: a fresh install,
setup, update, restart and removal on a clean HA, through HACS on a supported older version
and the Marketplace on 2026.11 or later; then phase 3's supersede on the same machine. The
catalog listing is a separate submission to `hacs/default` ([catalog][catalog]), with no
promise of acceptance.

## Known trap

**Remove in HACS deletes the folder** (to be confirmed in phase 0). After Casa Mia has
superseded a HACS install, removing Sensor Watch in HACS takes the component away until the
app next starts and installs it again. The guide says so; nothing is built for it.

## Open (owner)

- Phase 1, step 5: what `sensor_watch_enabled` means once the app does no Sensor Watch work.
- Phase 4: confirm the local-script decision before it is built.
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
