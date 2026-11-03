# Casa Mia documentation

- [Tablet Layout](tablet-layout.md): the view type that fits a wall tablet's screen exactly, and everything it can do.
- [Over layer](over-layer.md): one card over the whole dashboard while its conditions hold; what's beneath can be seen, not touched.
- [Heating Flow card](heating-flow.md): the heating and hot water as a live diagram, where colour is temperature and moving markers are flow.
- [Run the whole house from your desk](run-the-house-from-your-desk.md): one visit to each wall tablet, then its screen seen and driven from anywhere.

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
- [Sensor Watch](applets/sensor-watch.md): Tell it once what normal looks like, for every sensor in the house, and it tells you only when something isn't.
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

## Working together

Each module works on its own, but they live in one app and one integration, so they know
about each other:

- **Pages that keep up with updates.** After an update, a page that was open all along is
  still running the old cards, so a new feature looks missing until someone refreshes. The
  integration knows which cards it now serves, and every page checks after Home Assistant
  restarts: an out-of-date one offers a **Reload** in Home Assistant's own toast.
- **Wall tablets that reload themselves.** Nobody is there to press Reload on a wall
  tablet, so when Home Assistant starts serving new cards, the Kiosk Satellites module asks
  every tablet it looks after to reload.
- **The compositor knows its viewers.** On the Camera compositor page, each stream sent to
  a wall tablet shows the tablet's name from Kiosk Satellites beside its address, so a slow
  or stuck one is easy to place.
- **What needs attention, and only then.** Sensor Watch's status, counts and problem sensor
  can drive a panel on a Tablet Layout edge, and garnish stops that panel's heading holding
  it open, so on a quiet day the panel isn't there. A critical can come up over everything
  with the Over layer, and the Home tile shows the house's health.

Ideas that haven't been started yet are in the [backlog](../BACKLOG.md). Got one of your
own? [Open an issue](https://github.com/gazoodle/casa-mia/issues).

## Recipes

Coming soon: what you can build with Casa Mia, step by step.

## Behind the scenes

- [Architecture](architecture.md): the charter, the design, how it's built and deployed.
- [Releases](releases.md): how a release is made.
- [Backstory](../BACKSTORY.md): why this exists.
