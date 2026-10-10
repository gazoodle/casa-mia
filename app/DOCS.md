# Casa Mia

A Home Assistant app and its integrations that take your home from smart to spectacular:
dashboards that fit every wall tablet's screen exactly, camera views for the whole house as
one live picture, guests signed in with a single scan, every Kiosk Satellite tablet managed
from one place, and phone and SMS access that works when the internet doesn't.

The full documentation, with screenshots, is on GitHub:
<https://github.com/gazoodle/casa-mia/blob/main/docs/README.md>

## Getting started

You need Home Assistant 2026.3 or later.

1. **Choose your modules** on the **Configuration** tab: give your house its name and switch
   on what you want (every module starts off). Press **Save**.
2. **Start the app** on the **Info** tab, with **Show in sidebar** on. **Casa Mia** appears in
   the sidebar.
3. **Restart Home Assistant** (Settings → System → ⋮ → Restart Home Assistant). On its first
   start the app installs its integrations into your `custom_components` folder, and Home
   Assistant only loads them after a restart. A Repair tells you whenever an update needs
   another.
4. **Add the integration:** Settings → Devices & services → Add integration → **Casa Mia**,
   then **Submit**; it finds the app by itself. Guest login and Camera Commander each have an
   integration of their own (**Casa Mia Guest Login**, **Casa Mia Camera Commander**): while
   the module is on, Casa Mia offers it under **Discovered** on the same page.
5. **Set each module up** from its page in the Casa Mia panel.

## The modules

Each one is a switch on the Configuration tab, and each says how far along it is. Leave
anything marked *In development* off unless you're curious.

| Option | What it does | Its guide |
|---|---|---|
| **Serve tablet firmware** | Mirrors the Kiosk Satellite firmware so the wall tablets update without the internet. | [Firmware server](https://github.com/gazoodle/casa-mia/blob/main/docs/applets/firmware-server.md) |
| **Camera Commander** | A main camera framed by panels of cameras, drawn as one live picture for the Camera Commander card. Also switches on the Cameras page and the camera compositor. | [Camera Commander](https://github.com/gazoodle/casa-mia/blob/main/docs/applets/camera-commander.md) |
| **Auto Dashboards** | Dashboards made for you: today the camera dashboard, previewed and deployed. | [Auto Dashboards](https://github.com/gazoodle/casa-mia/blob/main/docs/applets/auto-dashboards.md) |
| **Guest login** | QR codes that sign guests and engineers straight into their own dashboard. | [Guest login](https://github.com/gazoodle/casa-mia/blob/main/docs/applets/guest-login.md) |
| **Phone and SMS (FONA)** | Calls and texts through a FONA GSM module: a way in that needs no internet. | [Phone and SMS](https://github.com/gazoodle/casa-mia/blob/main/docs/applets/phone-and-sms.md) |
| **Kiosk Satellites** | The wall tablets: versions, backups of their setup, and their admin pages from anywhere. | [Kiosk Satellites](https://github.com/gazoodle/casa-mia/blob/main/docs/applets/kiosk-satellites.md) |
| **Alarm panel** | The intruder alarm as a Home Assistant alarm panel. | [Alarm panel](https://github.com/gazoodle/casa-mia/blob/main/docs/applets/alarm-panel.md) |

Always there, whatever is switched on: the **Tablet Layout** view type for your dashboards
([its guide](https://github.com/gazoodle/casa-mia/blob/main/docs/tablet-layout.md)), the
**Kiosk mode** page, and the dashboard helpers on the **Settings** page (the cog by the
house photo).

## Other options

- **House name:** shown over the house photo and on the guest welcome page.
- **Log level:** `debug`, `info`, `warning` or `error` (default `info`). The app logs
  everything it does at `info`, so its **Log** tab is the first place to look when
  something is wrong. Lines use Home Assistant's own format.
- **Developer mode:** shows the debugging aids in the Casa Mia panel. Leave it off.

## Network

Each port serves one module; blank a port whose module is off.

- **8000:** the firmware server (the tablets fetch Kiosk Satellite updates here).
- **8099:** the camera compositor's pictures.
- **8675:** guest login (the address the QR codes point at).

## Help

Questions, problems and ideas: <https://github.com/gazoodle/casa-mia/issues>
