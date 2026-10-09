# Casa Mia documentation

- [Tablet Layout](tablet-layout.md): the view type that fits a wall tablet's screen exactly, and everything it can do.

## The applets

Each page of the Casa Mia panel in Home Assistant's sidebar.

- [Home](applets/home.md): The Casa Mia panel in Home Assistant's sidebar: your house photo across the top, then a tile for each module that's switched on, with its vital signs.
- [Settings](applets/settings.md): Settings with no other home, behind the cog by the house photo.
- [Kiosk Satellites](applets/kiosk-satellites.md): The wall tablets: their versions, kept backups of their setup, and their admin pages from anywhere.
- [Firmware server](applets/firmware-server.md): Mirrors the Kiosk Satellite firmware so the wall tablets update without the internet.
- [Kiosk mode](applets/kiosk-mode.md): What each dashboard hides, and from whom: the header, sidebar and more, through kiosk-mode.
- [Camera Dashboard](applets/camera-dashboard.md): Sets up the cameras, the Camera Commander and the camera dashboard, with previews, and deploys it.
- [Camera compositor](applets/camera-compositor.md): Draws the Camera Commander as one live picture for the dashboards and wall tablets.
- [Guest login](applets/guest-login.md): QR codes that sign guests and engineers straight into their own dashboard.
- [People](applets/people.md): Who is known to the home.
- [Phone and SMS (FONA)](applets/phone-and-sms.md): Calls and texts through the FONA GSM module: a way in that needs no internet.
- [Alarm panel](applets/alarm-panel.md): The intruder alarm as a Home Assistant alarm panel: arm away, disarm, triggered.

## Recipes

> **To write:** what you can build: PTZ presets, zoom, lights for what a camera shows, auto-motion camera switching, a doorbell intercom, a local AI (an introduction to Gang-O-Gals).

## Behind the scenes

- [Architecture](architecture.md): the charter, the design, how it's built and deployed.
- [Releases](releases.md): how a release is made.
- [Backstory](../BACKSTORY.md): why this exists.
