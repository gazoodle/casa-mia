# Casa Mia

<p align="center">
<img src="https://img.shields.io/github/stars/gazoodle/casa-mia?style=for-the-badge&label=Stars&color=d6a102" alt="Stars">
<a href="https://github.com/gazoodle/casa-mia/releases"><img src="https://img.shields.io/github/downloads/gazoodle/casa-mia/total?style=for-the-badge&label=Downloads&color=e8604c" alt="Downloads"></a>
<a href="https://github.com/gazoodle/casa-mia/releases/latest"><img src="https://shields.io/github/v/release/gazoodle/casa-mia?style=for-the-badge&color=5da3a6" alt="version"></a>
<a href="https://github.com/gazoodle/casa-mia/actions/workflows/release.yml"><img src="https://img.shields.io/github/actions/workflow/status/gazoodle/casa-mia/release.yml?style=for-the-badge&label=Build&color=3fbf5f" alt="Build"></a>
</p>

## What is it?

It's a collection of useful functionality that I've gathered and written over years of being
an HA enthusiast. It was getting to the point where it was unmanageable as there were many
little pieces, some in source control, others tucked into community notes; so I thought
Claude and I could pull them together and clean them up.

During that process I realised that there was quite a bit of stuff that other people might
find useful too, so ... this project got created.

## What's in here?

### Kiosk Satellite Firmware

A firmware server for the wonderful [Kiosk Satellite](https://kiosksatellite.com) system. I've got a bunch of wall tablets
around and this is, by far, the best solution to getting HA up on them, but my ones came 
with a bunch of nonsense pre-installed, so I deleted that, then had to put them on a LAN
with no internet access so they didn't download it all again ... but then I couldn't update
the kiosk software. [Xavier](https://github.com/jxlarrea) kindly added a feature to allow me to download the releases on
a machine that did have internet access and then the tablets could get it from there. This
used to run on my workstation; it now runs in this app. Painless now.

### Kiosk Satellite Manager

I've got a few tablets, and remembering to download the settings and configuration after I make
changes was the one thing that I thought I could automate ... I was right, this part of the system
keeps the settings in the app, which then gets backed up by HA and ... well it's all good from 
here now.

It also opens the tablet web view up over the HA ingress system, so you can view your wall
tablet control page when you're not at home. Nice!

### Alarm panel

I've got a KNX system with a couple of sensors and switches, but I wanted a nice alarm panel
with a code; you'd think that would be easy ... it's really not. My first go fell back to a
default code if you hadn't set one, silently ignored a wrong code, and (my favourite) arming
it while it was going off pressed the toggle, which disarmed it. This one refuses to do
anything until you've set a code, tells you when the code is wrong, and leaves a triggered
alarm well alone. It lives in the integration, so it keeps working while the app restarts.

### Phone and SMS (FONA)

What happens when the internet goes down and you're on the wrong side of the gate? An Arduino
with an Adafruit FONA GSM board on the end of a USB cable, that's what. Ring the house or text
it, and if your number is on the list, Home Assistant gets an "authorised" event and your
automations do the rest (mine open the gates). Anyone else is an intrusion, which you can
also do something about. Text it PING and every layer answers PONG, so you can tell exactly
where things stopped working, and Home Assistant can text back through it too. It has to be
bulletproof, so it copes with the Arduino resetting, the USB port moving and the line
dropping, and it says so in the log when it does. The Arduino sketch and how I built mine
are on their way into this repo, so you can make your own.

### People

The list of who's allowed to call and text the house, one phone number each, ticked for
calls, texts or both, and optionally linked to a Home Assistant person. Type the number the
way you'd dial it; it works out the rest. There's a box to check a number too, so you can
see what would happen before someone tries it for real.

### Guest login

QR codes that sign a guest straight into their own dashboard, no password typing on a
stranger's phone. This started life as [ha-auto-guest-login](https://github.com/cnorick/ha-auto-guest-login),
which I used for years (thank you!), then rewrote with a nicer front end: each code is an
endpoint you can switch on and off (from an automation, say, when guests arrive and leave),
there's a welcome page with a photo of your house while they're being signed in, and it
works for the engineer who needs to see the heating dashboard too. If you've already printed
QR cards for ha-auto-guest-login, tick **Legacy QR code** and they keep working.

### Camera compositor

The wall tablets show the cameras, and a dozen video streams on a small tablet is a good way
to make it cry. The compositor tiles each group of cameras into one live picture, so a
tablet only ever plays one stream per view. You describe the groups and the layout, and it
does the rest. And it's lightning fast, so those not-so-powerful tablets remain nice and
snappy.

## Thanks

- [Xavier Larrea (jxlarrea)](https://github.com/jxlarrea), for [Kiosk Satellite](https://kiosksatellite.com),
  and for adding the custom update source that made the firmware server possible.
- [Nathan Orick (cnorick)](https://github.com/cnorick), for [ha-auto-guest-login](https://github.com/cnorick/ha-auto-guest-login),
  which guest login grew out of.
- [Dermot Duffy (dermotduffy)](https://github.com/dermotduffy), for the [Advanced Camera Card](https://github.com/dermotduffy/advanced-camera-card),
  which the camera dashboards are built on.
- [Adafruit](https://www.adafruit.com), for the FONA GSM board and its Arduino library, the
  heart of the phone and SMS line.
- The [Home Assistant](https://www.home-assistant.io) project and its community, for the
  platform all of this plugs into.

## Licence

[MIT](LICENSE), © 2026 Gazoodle. Use it, change it, share it; just keep the notice.

## Under the hood

Everything custom one home needs from Home Assistant, in one repo: an HA **app**, an
**integration**, device firmware, generators and provisioning tools. It is the embryonic form
of a **deterministically built HA config**: the box's behaviour is derived from this repo, not
accreted by clicking in the UI.

It is built for one real house and offered as-is to anyone who wants the same: every module is
switched off until you enable it, so take the parts you need. Your house's name is an app
option (`house_name`), shown wherever the UI names the house.

**Status:** the app, the integration, the delivery loop (`tools/deploy`, app update, integration
pushed into `/config/custom_components`, "restart required" Repair) and the modules marked ✅
below run on a live box. This file is the charter; unscheduled work is in
[BACKLOG.md](BACKLOG.md), and the open questions at the bottom are turned into decisions as we go.

## Why

Custom pieces built one at a time each re-solve the same things:

- A GSM board that is the way in when the internet is down (FONA).
- A camera compositor and its adaptive dashboard.
- An alarm panel, a firmware mirror for the wall tablets, and other ideas.
- Arduino firmware for FONA, an ESPHome generator, a tablet provisioner, a KNX project.
- Third-party apps that may no longer maintained: `ha-auto-guest-login`
  (MIT, last update 2025) is taken over and rewritten as a module.

**Out of scope by design:** other projects (public, shared or someone else's, such as
`advanced-camera-card`) do not live here. Nothing in this repo may be a dependency of them;
this repo may consume their published releases.

Everything in the house is one system built from one master project: ESPHome devices, KNX,
FONA, tablets, cameras and the HA config are all generated or deployed from the same sources.

Each one re-solves deployment, auth, health reporting and config. This project solves
those once, and each piece becomes a **module** that plugs in.

## Goals

1. **Mission-critical things stay up.** FONA (home access with the internet down) is the
   first citizen: reconnects by itself, reports when it goes quiet, never depends on a
   fragile device path.
2. **Edit on the local dev system, live in under a minute.** No GitHub credentials on the HA box.
3. **Add a module cheaply.** A new capability is a folder, not a new project.
4. **Small backups.** No caches or downloaded models inside the app's backed-up data.
5. **Observable.** Every module reports health as entities and as HA Repairs.

## Non-goals (for now)

- Publishing to HACS or the official app store.
- Replacing Music Assistant, UniFi Protect or other maintained integrations. KNX the same:
  we generate and consume the KNX project and control it through HA, not replace the stack.
- Supporting installs other than HA OS on one primary box.

## Modules (initial scope)

Details of each are to be taken from the existing code, not rewritten from memory. Every
module is a candidate for the public release (the Public column); each is off until enabled.

| Module | What it does | Mission-critical | Source to learn from | Public | Completed? |
|---|---|---|---|---|---|
| `fona` | Phone and SMS: calls and texts over the Arduino/GSM board, checked against `people` in the app, then one HA event each (authorised or intrusion); HA automations decide what happens and reply. PING answered by every layer. Built in app 0.1.31 / integration 0.5.0, awaiting cut-over. The Arduino sketch and build plan are to be published with it | **Yes** | The earlier `fona_sms` custom component, the `FonaForHA` Arduino sketch | Candidate | ⬜ |
| `people` | Everyone known to the home. Today one phone number each with Call and Text ticks, optionally linked to an HA person. Always on; People page in the panel. Built in app 0.1.31 | No | An earlier allowlist (a to-do list plus a pyscript, replaced) | Candidate | ⬜ |
| `alarm` | Intruder alarm panel (arm away, disarm, triggered) in the integration only, driven by the panel's ESPHome sensors and toggle button; code in the integration's options; `alarm_enabled` app option (default off) switches it on. **Complete (integration 0.4.0, app 0.1.27).** The sensor and switch entity ids are fixed in `alarm.py` today; they must become options before release | Likely | An earlier alarm-panel custom component | Candidate | ✅ |
| Firmware Server (`gitproxy`) | Mirrors the Kiosk Satellite firmware and serves it to the tablets on port 8000 (`gitproxy_enabled` app option, default off); the integration shows its state and latest version. **Built (app 0.1.10).** Includes a Force check button and download progress, on its own "Firmware server" device. | Yes (deployment path) | `tablet-provision/fake_git_host.py` | Candidate | ✅ |
| `compositor` | Camera compositing and the adaptive dashboard. App module built (app 0.1.11): serves each Camera Commander's picture on port 8099 from the Camera Dashboard's live config, `compositor_enabled` option (default off) | No | composite-test server | Candidate | ✅ |
| `camera_dashboard` | Camera Dashboard: one source (`camera-dashboard.json`, the draft, and `camera-dashboard-live.json`, what was deployed) for the cameras, the Camera Commanders (one or more, each a page), and the camera dashboard. Admin page with previews (a second compositor on 8098 draws the draft), deploys the dashboard into HA over the websocket (storage mode: preview to `<dashboard>-preview`, live to the dashboard, keeping what it replaces), `camera_dashboard_enabled` option (default off). Was `dashboard-gen` | No | `tablet-provision/composite-test/gen_dashboard.py`, `discover_entities.py` | Candidate | ✅ |
| `knx` | KNX project (ETS export) consumed to generate HA entities/config and drive control | Likely | KNX project (TBD) | Candidate | ⬜ |
| `knx-bms` | A Raspberry Pi KNX machine: BMS programming control over the KNX bus, like logic modules but with better programming. First job: bring the Hue lights into the BMS, out of HA (backlog) | TBD | The Pi's existing code (to be located) | Candidate | ⬜ |
| `esphome-gen` | Python generator that deterministically builds the ESPHome YAML for every Shelly and other ESP device in the automation system | No (devices it configures may be) | The current ESPHome generator script | Candidate | ⬜ |
| `radio` | Local radio station (Docker stack, on a NAS today); may move onto HA | No | Docker compose/config on the NAS (TBD) | Candidate | ⬜ |
| `tablet-provision` | Provisions wall tablets | No | `tablet-provision` repo | Candidate | ⬜ |
| `guest-login` | Guests and engineers scan a QR code, are signed into HA and land on their own dashboard; replaces `cnorick/ha-auto-guest-login`. Endpoints (one per QR code, printed `?d=` codes kept working) are off until opened, by switch, timed opening or automation, and remember their state across restarts. Admin page: logins (HA users, linked or created, with a credential test) and endpoints (landing dashboard picked from HA), QR codes in the printed-card style to download or save to HA media, Try it, welcome page with preview. Config in `guest-login.json`, applied live. **Complete (app 0.1.26).** Follow-ups in BACKLOG | No | `ha-auto-guest-login` (MIT), as a description of the HA login flow only | Candidate | ✅ |
| `qr` | QR code generator for any HA path, so new cards are easy to build (backlog; inspect later whether `guest-login`'s QR rendering already covers it) | No | Shares rendering with `guest-login` | Candidate | ⬜ |
| `navback` | Lovelace helper (JavaScript dashboard resource): a link ending in `#BACK` takes the browser back a page, so dashboard Back buttons work from any view (backlog) | No | `nav_back_helper.js` (v0.0.2, a hand-installed dashboard resource) | Candidate | ⬜ |
| `auto-refresh` | Lovelace helper (JavaScript dashboard resource): reloads an open dashboard when its config is saved, unless it is being edited, so wall tablets pick up changes on their own (backlog) | No | `auto_refresh.js` (v0.0.5, a hand-installed dashboard resource) | Candidate | ⬜ |
| `kiosks` | Kiosk Satellites: finds the wall tablets (HA's ESPHome devices, manufacturer `kiosk_satellite`, then each kiosk's own `fleet` list; addresses added by hand; tablets seen by the firmware server), shows version (against the firmware server's latest), online state, battery and Wi-Fi; one shared remote-admin password gives the app a 10-year token per kiosk (password never kept); backs up each tablet's settings or full config on a timer (daily by default) into `/data/kiosks/<id>/` (so in HA backups), keeping a copy only when it changed materially and the last 1 to 6, each restorable; an Update button for tablets behind the latest release; opens each kiosk's own admin page in the panel through ingress (`/kiosk/<id>/`, the app logs in for the page, sends its absolute `/api/` requests under the kiosk's path with a small script added to the page, leaving their scripts untouched, and tunnels its websocket). `kiosks_enabled` option, default off. **Built (app 0.1.38), backups 0.1.42; complete, follow-ups in BACKLOG.** | No | Kiosk Satellite's Remote API (kiosksatellite.com/docs/remote-api) | Candidate | ✅ |
| `ingress` | Shared token-gated HTTP front (streaming pass-through, `requires_auth` handling) | Shared | An earlier app's ingress gate | Candidate | ⬜ |

Non-module content (not run by the app): `firmware/fona/` (Arduino Mega sketch, the other
half of the FONA protocol below, versioned with the host code), generators, and provisioner.
The camera compositor and its host live here too. `advanced-camera-card` is a third-party
project, not ours: out of scope, consumed as an upstream dependency at most.

**Direction of travel:** HA config (dashboards, helpers, ESPHome, KNX entities) is *generated*
from sources in this repo by tools, and the generated output is reproducible byte-for-byte.
Hand-edited live config is the thing to eliminate.

## Architecture (proposed)

```
 Mac (dev)                         Home Assistant OS
 ┌──────────────┐  fake git   ┌──────────────────────────────────┐
 │ repo + tests │───────────▶│ Supervisor ─▶ Casa Mia app        │
 └──────────────┘             │   modules: fona alarm gitproxy... │
                              │   ▲ local API + SUPERVISOR_TOKEN  │
                              │   ▼                               │
                              │ Core ─▶ casa_mia integration      │
                              │   thin: entities, services, UI    │
                              └──────────────────────────────────┘
```

**Placement rule:** anything long-running, I/O-heavy, network-facing or that must survive a
Core restart lives in the **app**. The **integration** is thin: config flow, entities,
services, events, Repairs. They talk over a small versioned local API.

**FONA lives in the app** (owns the serial port, reconnect loop with backoff, handles the
Arduino resetting when the port opens, by-id device path) and exposes sensors and events
to the integration. Rationale: Core restarts and updates should not drop the board.

**FONA layers and the PING trace.** A text of exactly `PING` is answered by every layer, so a
broken one can be found from afar:

| Layer | Answers PING | Then |
|---|---|---|
| Arduino (`FonaForHA`) | "PONG from Arduino", to anyone | prints `TEXT:`/`RING:` on serial |
| App `fona` | "PONG from App" (plus the name if known), to anyone | checks `people`; fires `casa_mia_fona` (authorised or intrusion). Silent to strangers from here on |
| Integration | "PONG from Integration", authorised only | `event.fona_call` / `event.fona_text` (types `authorised`, `intrusion`) |
| HA automation | "PONG from Automation", authorised only | decides the action (for example, calls open the gates; texts go to a conversation agent) and replies with `casa_mia.send_sms` |

The event carries `kind` (call/text), `authorised`, `number` (+44...), `who`, `message` and
`reason` (for intrusions: unknown number, number withheld, not allowed to call/text).

**Module contract (draft):** each module has `start()`, `stop()`, `health()`, a config
schema, and registers its entities and routes. One module failing must not stop the others.

**Shared services:** config and secrets loading, logging (Home Assistant's own line format,
`casa_mia/log.py`), health aggregation (heartbeat
plus "last heard" per module), the ingress/token gate, and the version handshake between
app and integration.

## Repository layout

Exists now unless marked *planned*:

```
casa-mia/
  app/                     # the HA app: config.yaml, Dockerfile, CHANGELOG.md, DOCS.md, icon.png
    src/casa_mia/          # __main__, server (/health), components (the integration installer)
      modules/             # planned: fona, gitproxy, compositor, guest-login, ... (alarm is integration-only)
  integration/
    custom_components/casa_mia/     # config flow, coordinator, sensor, restart notice, repairs, brand/
    versions.lock.json     # per-component version + content digest (see Versioning)
  branding/                # the icon and logo masters (PNG); the sized copies are committed
  tools/                   # setup (venv), fake_git_host.py, versioning.py, sync_app_version.py,
                           #   component_versions.py, deploy; planned: mock serial
  tests/
  firmware/fona/           # planned: Arduino sketch for the FONA board
  generators/              # planned: esphome (Shelly + other ESP devices), knx, HA config
  provisioning/tablet/     # planned: tablet provisioner
  pyproject.toml           # the one source of the app version; ruff, pytest config
  repository.yaml          # makes the repo an HA app repository
  README.md  BACKLOG.md  CLAUDE.md  AGENTS.md
```

## Versioning

See [Releases and CI](docs/releases.md) for GitHub checks, GHCR images, stable installation,
and making a release (`tools/release.py`). Public releases are `YYYY.M.R`, the month unpadded as Home Assistant's own (2027.1.1).

**Rule Zero: bump the version first.** The Supervisor offers an app update only when `version`
in `app/config.yaml` changes. So before any change to `app/` or `integration/`, from a clean
repo: run `tools/versioning.py bump` (it sets `pyproject.toml`, the one source, and
`app/config.yaml`, and adds a `## <version>` heading to `app/CHANGELOG.md`), then write the
changelog lines (a test fails without the heading; the Supervisor shows the file in the update
dialog). If it is forgotten, `tools/fake_git_host.py` bumps the build itself, commits it, and
shouts. That is a failure of the rule, not a feature.

**Version numbers follow Home Assistant:** a release is `YYYY.M.R` (2026.10.1, the first release
of October 2026). The private builds deployed on the way to it are `YYYY.M.R-bN` (2026.10.1-b1,
-b2, ...), one per deploy. The Supervisor orders them correctly: b9 before b10, every build
before its release. To release, run `tools/release.py`: a step-by-step walkthrough (run on `dev`, where work is done: checks, `tools/versioning.py release`, a review of the notes, a pull request from `dev` into `main`, then merge and tag after your OK) that `.github/workflows/release.yml` takes from there. See [Releases and CI](docs/releases.md). The next bump starts the next release's builds.

**Each integration component's version is the app version it last changed in.** After changing
a component, `tools/component_versions.py --update` stamps its `manifest.json` with the current
app version (`2026.10.1-b3`) and records a digest of its files; a test fails on files changed
since then. So a component's version only moves when its files do: an app update that leaves it
alone does not ask for a restart, and its number still says which app build it came with.

**Integration delivery is push (no HACS):** on start the app mirrors every bundled
component into `/config/custom_components` and writes a marker. Each component's
`restart_notice.py` raises its own "restart required" Repair only if its loaded version differs
from the installed one. App and integration also check an API number in `/health` and surface a
mismatch as a Repair.

## Develop and deploy

Three loops, fastest first:

1. **Unit loop (Mac, seconds):** pytest with fakes; FONA gets a mock serial device
   that can reset, vanish and reappear.
2. **Dev loop (Mac to the real box, under a minute):** `tools/setup` builds `.venv` on Python 3.11
   (matching the HA image, and isolated from Homebrew upgrades); `.venv/bin/ruff`, `pyright` and
   `pytest` are the checks. `.venv/bin/python tools/fake_git_host.py` serves the committed work
   over `git://<mac>:9419/casa-mia#app-dev`. Add that URL under
   Settings, Apps, App store, Repositories; the Supervisor then sees each new version. `tools/deploy`
   does the rest: over SSH it runs `ha store reload`, `ha apps update` and shows the app's log
   (`CM_HA_SSH` sets the login, default `hassio@homeassistant.local`).
3. **Release (tagged `YYYY.M.R`):** see Versioning. Tags mark known-good versions for rollback.

**No staging environment: work goes straight to the live box** (`homeassistant.local:8123`).

**Cut-over from old integrations** (FONA first): the old integration stays
installed and untouched while the new module is built. To test, stop the old integration and
run the new module. If the new code is incomplete, switch it off with its flag (every module has
an enable option in the app's options) and restore the old integration. When the new module is
proven, retire the old integration. The same pattern applies to anything else we replace.

**Known traps** (each cost real time):
- Since HA OS 17, clicking Rebuild after editing can leave old layers running. Bump the version
  and update instead (Rule Zero).
- The Dockerfile clones the repo inside the build (the Supervisor only sends `app/`), and Docker
  cached that clone forever. The clone step now references `BUILD_VERSION`, so every version
  re-clones.
- s6-overlay gives the app a clean environment: image `ENV` and `SUPERVISOR_TOKEN` do not reach
  a plain `CMD`. Use code defaults, or a `run.sh` with `#!/usr/bin/with-contenv bash`.
- A colon inside an unquoted YAML value in `config.yaml` makes the Supervisor silently skip the
  app. A test now parses the manifests.

**Rollback:** public releases retain versioned GHCR images and `stable-<version>` delivery tags.
See [Releases and CI](docs/releases.md) for rollback; Supervisor downgrades may require reinstall or restore.

## Facts learned on a live system

- **App ports answer on IPv4 only.** Ports the app publishes (8000 firmware, 8099 compositor, 8675 guest login) are dropped over IPv6, while HA itself (8123, host network) answers on both. `homeassistant.local` can resolve to IPv6 first, so `http://homeassistant.local:<app port>` fails with a dropped connection; use the box's IPv4 address for anything on an app port, as printed QR codes should.
- Keep backups small: no model files or caches in app data.
  **Mechanism:** an app's `config.yaml` can declare `backup_exclude`, a list of globs relative to
  the app's `/data` (ESPHome uses `backup_exclude: ['*/*/']`). This app sets it for
  anything regenerable (caches, build output, downloaded files), and may set `backup: cold`
  if a consistent snapshot of its state needs the app stopped. Only the app author can set it;
  users cannot exclude per app from the UI. Put cache/state in separate subfolders of `/data`
  (e.g. `/data/cache/`) so one glob covers them. Test: make a partial backup of only the app and
  check its size.
- FONA board: Arduino Mega 2560, USB serial 115200. Use the **by-id** path
  (`/dev/serial/by-id/usb-Arduino__www.arduino.cc__0042_<serial>-if00`), not `ttyACM0`.
  Known failure: when the port moved, the read loop died silently and the sensors went stale.
- Protocol: board sends `TEXT:` `RING:` `RSSI:` `INFO:`; host sends `SEND:` `START` `ERASEALL` `RSSI` `RESET`.
- The app's hostname is `<hash>-casa-mia` (container `app_<hash>_casa_mia`), and
  `GET http://<hash>-casa-mia:8780/health` returns status and version. The hash comes from the
  repository URL the store entry was added with, so it changes if that URL does. The integration
  must not hard-code it: discover it from the Supervisor (open question 7) or take it from config.
- The `homeassistant_config` map mounts HA's `/config` at **`/homeassistant`** inside the app.

## Testing

- Unit tests per module with fakes (15 today: health, installer, restart notice, version and
  changelog guards, manifests, version bumping). Integration tests with
  `pytest-homeassistant-custom-component`, which needs Python 3.13+, so a second venv or a newer
  base image first (pyright excludes `integration/` for the same reason).
- A **fire drill** checklist: unplug the internet, text the FONA's number, confirm the
  outcome SMS. Also: pull and replug the FONA, restart Core, reboot the box, and confirm the
  module recovers on its own.

## Experiment: where do ESPHome builds run?

Generating the YAML is cheap and stays in this repo either way. Compiling ~100 devices is the
slow part: on small boxes it takes too long, so builds may need to run off-box.

**Result (an N150 mini PC, 2026-10-01):** build performance is acceptable, so no external build
machine. The generator's output target is `/config/esphome` (ESPHome app). Its build cache lives
in that app's `/data`, measured at **531 MB** (508 MB toolchain `cache`, 24 MB `build` for one
device; `build` grows per device). The ESPHome app's manifest sets `backup_exclude: ['*/*/']`,
which should drop those folders from backups. **Unverified:** make a partial backup of only the
ESPHome app and check its size; if it is large, exclude the app from backups instead. The YAML
in `/config/esphome` is in the Core backup and is regenerated from this repo anyway.
ESPHome's `secrets.yaml` is `<<: !include ../secrets.yaml`.

## Existing solutions considered

- HA's [app communication](https://developers.home-assistant.io/docs/apps/communication/) and
  [Supervisor development](https://developers.home-assistant.io/docs/supervisor/development/) docs: we use these.
- [python-supervisor-client](https://github.com/home-assistant-libs/python-supervisor-client): candidate for the app's Supervisor calls.
- `cnorick/ha-auto-guest-login`: works but is unmaintained and warns on current Supervisors;
  taken over as the `guest-login` module (see BACKLOG.md).
- HACS and a private app repository with a token in the URL: **not used**. HACS cannot read
  private repos by default, and putting a token on the HA box is what the fake git host avoids.

## Open questions for the design session

Resolved: **fake git host** (`tools/fake_git_host.py`; serving the app and the
tablet proxy from one host is still open), **one-path integration delivery** (push, decided
above).

1. ~~Where is the boundary with other projects?~~ Settled: nothing here depends on them (see Why).
2. ~~Does the alarm module need to survive Core being down?~~ No: today it is only a panel over HA entities, so it lives in the integration and does not need the app.
3. How are secrets (tokens, phone numbers, keys, the guest Wi-Fi password) stored and kept out
   of git and out of backups?
4. What is "deterministic" here: generated files committed, or generated at deploy? Where does
   the ESPHome/KNX/tablet tooling's output land, and how is drift from live HA detected?
5. Which existing separate repos (tablet-provision, compositor) move in, and with history?
6. `radio`: its own HA app wrapping the existing Docker image (likely) or stay on the NAS? Needs
   its storage location and backup exclusions decided.
7. HA version support policy.
8. How does the integration find the app's hostname (it changes with the repository URL):
   config, or discovery through the Supervisor?
9. How are module health and "last heard" surfaced so a silent failure pages someone?
10. What is the module enable flag's shape (one boolean option per module in the app's options, default off for modules that replace a live integration)?

## Footnote

🦶 🎵
