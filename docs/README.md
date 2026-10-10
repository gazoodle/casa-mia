# Casa Mia documentation

- [Tablet Layout](tablet-layout.md): the view type that fits a wall tablet's screen exactly, and everything it can do.
- [Over layer](over-layer.md): one card over the whole dashboard while its conditions hold; what's beneath can be seen, not touched.

## The applets

Each page of the Casa Mia panel in Home Assistant's sidebar.

- [Home](applets/home.md): The Casa Mia panel in Home Assistant's sidebar: your house photo across the top, then a tile for each module that's switched on, with its vital signs.
- [Settings](applets/settings.md): Settings with no other home, behind the cog by the house photo.
- [Kiosk Satellites](applets/kiosk-satellites.md): The wall tablets: their versions, kept backups of their setup, and their admin pages from anywhere.
- [Firmware server](applets/firmware-server.md): Mirrors the Kiosk Satellite firmware so the wall tablets update without the internet.
- [Kiosk mode](applets/kiosk-mode.md): What each dashboard hides, and from whom: the header, sidebar and more, through kiosk-mode.
- [Cameras](applets/cameras.md): The house's cameras, chosen from Home Assistant: their names, streams and controls, for the commanders and the camera dashboard.
- [Camera Commander](applets/camera-commander.md): The commanders, each a main camera framed by panels of cameras, one live picture for the card and the dashboard; and the Camera Commander card.
- [Auto Dashboards](applets/auto-dashboards.md): Dashboards made for you: today the camera dashboard, from the cameras and the commanders, previewed and deployed into Home Assistant.
- [Camera compositor](applets/camera-compositor.md): Draws the Camera Commander as one live picture for the dashboards and wall tablets.
- [Guest login](applets/guest-login.md): QR codes that sign guests and engineers straight into their own dashboard.
- [People](applets/people.md): Who is known to the home.
- [Phone and SMS (FONA)](applets/phone-and-sms.md): Calls and texts through the FONA GSM module: a way in that needs no internet.
- [Alarm panel](applets/alarm-panel.md): The intruder alarm as a Home Assistant alarm panel: arm away, disarm, triggered.

## Maturity

Each module's page says how far along it is, as do its option in the app's Configuration
tab and its page in the Casa Mia panel. Check a module's level before you switch it on.

<!-- maturity -->
- **Skeleton:** Started, but it doesn't do its job yet. Leave it off.
- **In development:** Being built: parts work, it changes often, and an update may break it. For the curious.
- **Alpha:** Does its job every day in the author's house, but hasn't been tried in many others. Expect rough edges and changes.
- **Beta:** Complete and used every day; its features have settled. Please report what breaks in your setup.
- **Released:** Settled and dependable. Changes are announced, and existing setups keep working.
<!-- /maturity -->

## Recipes

Coming soon: what you can build with Casa Mia, step by step.

## Behind the scenes

- [Architecture](architecture.md): the charter, the design, how it's built and deployed.
- [Releases](releases.md): how a release is made.
- [Backstory](../BACKSTORY.md): why this exists.
