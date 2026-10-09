# Home

The Casa Mia panel in Home Assistant's sidebar: your house photo across the top, then a tile for each module that's switched on, with its vital signs.

<img src="../screenshots/home.webp" alt="Home" width="800">

## What it's for

See what Casa Mia is doing, then open the part you need. The home page brings together
the modules' current state, useful facts and errors, with your house photo above them.
It is the app's control panel, separate from the dashboards you show on wall tablets.

## Switching it on

Start the Casa Mia app and use **Open web UI** on its Info tab, or its entry in Home
Assistant's sidebar when **Show in sidebar** is enabled. The home page itself needs no
module switch. Features with an app option are enabled in Settings → Apps → Casa Mia
→ Configuration; save and restart the app after changing those options.

## On the page

### House photo and name

The name above the photo comes from **House name** in the app's Configuration tab.
Press **✎** to change the photo. **Choose photo…** selects one from your device;
**Use the original** returns to Casa Mia's bundled picture.

The **Home page** and **Welcome page** controls frame the same photo separately, so it
can fit both the wide header and a visitor's phone. Adjust its zoom and position;
**Reset** returns that framing to the last saved values. **Save** applies your changes,
including the chosen photo, while **Cancel** leaves the saved photo and framing alone.
The welcome preview shows the framing used by [Guest login](guest-login.md).

The cog beside the pencil opens [Settings](settings.md).

### Running here

Each enabled feature has a tile. People and Kiosk mode are always available; other
features appear when their app options are enabled. A tile shows the module's state,
its maturity and relevant facts, such as tablet versions or the last phone event.
**Open →** takes you to its page. Phone and SMS and Alarm panel have status tiles but
no separate pages yet.

**Starting**, **Offline** or **Needs setup** tells you to inspect that tile's message
and the feature's documentation. “Running here” groups enabled features, including
ones with a problem; it does not mean every device they use is healthy.

### Footer

**Integration URL** is the address the Casa Mia integration uses to reach the app.
Copy it into the integration's setup if automatic discovery fails. It is an internal
connection address, not the URL to give a visitor or a tablet.

The footer also shows the app version and which features are switched off. This helps
when checking an update or reporting a problem.

## In Home Assistant

With the Casa Mia integration installed, its **Casa Mia app** device has an **App
version** sensor. Individual modules provide their own devices and entities where
applicable; the links on this page lead to their guides.

## Troubleshooting

- **Can't reach the Casa Mia app.** The banner says it is showing the last reported
  state. Check the app is running, then reload the page. Last known facts do not prove
  the devices are still online.
- **A feature is missing.** Check its Configuration option and restart the app after
  saving. The footer lists switched-off features. People and Kiosk mode have no
  enable switches.
- **The integration cannot connect.** Copy Integration URL into the integration's
  setup. The app also prints that address in its log; it must be reachable from Home
  Assistant, not necessarily from your browser.
- **A photo cannot be uploaded.** The editor reports an unreadable image or a photo
  over 30 MB. Try a smaller JPEG or PNG. Successful changes are logged as
  `house photo replaced`, `house photo framing on the … page`, or
  `house photo back to the bundled one` in the app's log.
- **The integration reports that a restart is required after an update.** Restart
  Home Assistant to load the installed integration. The app and already-open pages
  can otherwise be running different versions.
