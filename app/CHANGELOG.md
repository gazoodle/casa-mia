# Changelog

## 2026.10.1-b20

- Security look: works at its default tint. Its filter was only made when the tint, strength or darkness was changed, so a look left at its defaults (or saved before) had none, and switching it on did nothing. Such looks now use the default tint's filter.
- Security look: the dashboards use the saved draft's look, so it shows as soon as it is saved (it used the one last deployed live, and there may be none).
- Camera Dashboard: the Camera Commander's **Security look** and **Track motion** switches are on the page too (they flip Home Assistant's switches, which automations still can), and "On the previews here" is remembered in this browser.

## 2026.10.1-b19

- Commander: two more ways to show the main camera, each with a **Main width** (% of the picture, 70 to start), the four panels then sharing the room around it (their own sizes are set by it): **Own shape**, the camera at its own shape, so the panels move when a camera of another shape is shown, live (tall cameras are as high as the picture, narrower); and **Fixed shape**, a shape you set, the camera whole within it. Each camera's shape is noted from its stills when the draft is saved, so the picture and the dashboard's tap zones always agree; with Own shape the dashboard has one set of tap zones per main camera.
- Commander: with Own or Fixed shape, **Smallest panel** (8% to start) keeps every panel with cameras at least that size; a tall camera or a wide Main width makes the main camera smaller (same shape) rather than squeeze a panel out.
- Commander: **Track motion**. With the Camera Commander's new **Track motion** switch on (kept over restarts; automations can flip it, at night or while the alarm is set), a commander camera that sees motion becomes the main one: the newest motion wins, a switch holds a while before motion elsewhere takes over (that one waits its turn), all motion stopping goes back to the camera chosen by hand after a while (or stays), and choosing a camera yourself pauses tracking for a while. The times are set on the Camera Dashboard page (10, 30 and 120 seconds to start). A camera's motion sensor is found by itself: a motion binary sensor on the camera's device, else one named after it; the Cameras list shows which have one. Smart detections (person, vehicle, animal) are for later.
- Commander: a red dot on each tile whose camera sees motion, whether or not Track motion is on.
- Commander: the highlight on the main camera's tile is drawn by the dashboard, not into the picture, so a tap shows it at once; set its colour, width, blur (glow) and pulse (Breathe, the glow swelling as Gang-O-Gals' running badge does; or Ripple, a ring spreading out as the Casa Mia panel's running dot does; 0 for steady) on the Camera Dashboard page, with a sample. Steady for anyone who asked their device for less motion.
- **Security look**: every camera picture on the dashboards in monochrome, tinted, like a security control room. Set its tint, strength and darkness on the Camera Dashboard page (with a preview), deploy live, and switch it with the Camera Commander's new **Security look** switch in Home Assistant (`switch.camera_commander_security_look`, kept over restarts), by hand or by an automation at night. The browser does it (a CSS filter, applied by Keep camera pictures live, which Home Assistant tells of each change at once), so it costs the box nothing.
- Camera Dashboard: shapes (the overview's cell and strip shapes, the commander's main shape) take a ratio as well as a number: type 16:9 or 1.78, or pick from the usual shapes (4:3, 16:9, 21:9 and others), which puts the ratio itself in the box.

## 2026.10.1-b18

- Camera pictures no longer freeze or fail to appear when you go back through the camera dashboards. Home Assistant keeps the pages you leave alive, camera streams and all, and the compositor ended a device's oldest streams past 3 (browsers allow only 6 connections to one address), so coming Back three pages could show a stopped picture. The integration now loads **Keep camera pictures live**, a small script that stops the streams of pages not on screen and starts a fresh one for the page shown.
- Integration: Casa Mia's options (Settings → Devices & services → Casa Mia → Configure) switch its dashboard helpers on and off: **Keep camera pictures live** (on), **Back button helper** (`#BACK` goes back; the camera dashboards' Back buttons need it) and **Reload dashboards when they change** (wall tablets show a deployed dashboard without a reload). The last two are the box's `nav_back_helper.js` and `auto_refresh.js`, brought in unchanged; they start off, so switch each on as you remove the hand-added copy from the dashboard resources, or Back goes back twice. The integration serves them itself and loads them into every Home Assistant page: nothing is added to your configuration. The alarm code in the options is now optional to fill in.
- Camera Dashboard: its Back warning knows about the integration's Back helper, and warns when it and a hand-added `nav_back_helper.js` are both on (Back would go back twice).
- Commander: a tap on a panel camera shows at once. The moment the switch arrives, the commander shows the new camera's last still, blurred, with "Changing to <camera>…" over it, made from pictures already to hand; the sharp picture follows when its snapshot arrives. Before, nothing changed until then (a second or two).

## 2026.10.1-b17

- Camera Dashboard: groups have a **Gap** (in pixels) between their pictures, like the commander. Gaps are transparent, so the dashboard's own background shows through them (dark or light with the theme); each picture's own space stays black. A composite with gaps is sent as WebP (JPEG can't be transparent): smaller than the JPEG, a little slower to make. Without gaps it stays JPEG, as before. The tap zones follow the gaps.
- Camera Dashboard: the overview's gaps between groups are transparent too, where they were white.

## 2026.10.1-b16

- Commander: when its taps can't work, the Commander section says so in red at its top: Home Assistant has no `select.camera_commander_main_camera` yet (it needs a restart after the app updates the integration), or the select is unavailable (the integration can't reach the app, or the commander has no saved cameras). Taps were silently doing nothing in that state.
- Integration: the restart Repair now says what waits for the restart: until Home Assistant restarts, nothing new in the updated integration works, including new devices and entities such as the Camera Commander's Main camera.

## 2026.10.1-b15

- Commander: the four panel editors sit two to a row, each half the section's width, instead of three to a row with a gap beside the fourth.

## 2026.10.1-b14

- Commander: taps work on the preview dashboard too. The Main camera select offered only the cameras deployed live, so with the commander only previewed it had no options, and every tap (choosing a camera, or opening the main one) did nothing. It now offers the live and the draft commander's cameras, and a choice moves both.
- Commander: Top and Bottom can each run to the view's left and right edges (the side panel then stops at them) or stop at the side panels (which then run to the edge). By default Bottom runs edge to edge and Top fits between the sides, as before.
- Commander: the main camera can be shown whole with black borders (Fit), stretched to its space (Fill) or filling it with the edges cut off (Crop).
- Commander: the current camera's frame is a single pixel; the main camera's name is at the foot of its picture, clear of the camera's own caption at the top.
- Commander: a panel's **+ Add…** offers only cameras in no panel yet, and a camera in two panels is a problem to fix before deploying.

## 2026.10.1-b13

- Camera Dashboard: new **Commander**: one landscape picture with a main camera in its natural shape, framed by four panels of cameras (bottom full width, left and right standing on it, top between them; each panel's cameras and size are set on the page, with a live preview, and the canvas size too). Choose it as the **landscape overview** (phones keep the portrait group overview). Tapping a camera in a panel makes it the main one, framed in its panel; tapping the main camera opens its live page.
- Integration: new **Camera Commander** device with a **Main camera** select (`select.camera_commander_main_camera`): the commander's taps set it, and so can automations (`select.select_option` for motion or the gates, `select.select_next` for a carousel). The app keeps the choice over restarts and shows a change at once.

## 2026.10.1-b12

- Camera Dashboard: the live view plays. It sat on "Connecting…" and timed out on a real install: the stream went through the app and the Supervisor's proxy, which holds a response until it ends, and a stream never ends. The browser now plays Home Assistant's own MJPEG stream directly, as HA's camera cards do (with the camera's short-lived access token), and the app only hands out the address.
- Camera Dashboard: the live view has a channel selector (Low, Medium, High, as the camera has them; Low first, the quickest) and says what it is showing: which entity, which channel, and that it is HA's MJPEG made from snapshots (a few pictures a second, not video).

## 2026.10.1-b11

- Camera Dashboard: the ✕ on a page control removes it every time. With an entity field's list open, pressing ✕ closed the list, the dialog's content moved, and the click was lost, so the row stayed. Lists and menus now close on the finished click instead.
- Camera Dashboard: saving drops page-control rows with no entity, so a leftover empty row no longer adds a warning.
- Camera Dashboard: the page opens with its pictures already there. Its compositor keeps the latest still of every chosen camera, fetched every minute in the background, and draws the camera pictures and the group and overview previews from those at once; before, each was fetched from Home Assistant as the page asked, so they filled in one by one. The wall tablets' composites are unchanged (fresh stills while they are viewed).
- Compose camera groups: "Needs setup" on its tile now says what it needs: a **Deploy live** from the Camera Dashboard page (with the Camera Dashboard on), or `groups.json` (without it).

## 2026.10.1-b10

- Camera Dashboard: entity fields (page controls; a camera's medium, high and zoom; the tile entity) work as in Home Assistant: type part of an entity id or name, such as `switch.` or `gate`, and pick from the matching entities, each word narrowing the list; arrow keys, Enter and Esc work. Camera channels list only cameras, zoom only numbers. This replaces the browser's own suggestion list, which on Safari could swallow the click on a control's ✕.

## 2026.10.1-b9

- Camera Dashboard: each camera has a small picture beside it in the Cameras list, and in a group's **+ Add…** menu; the overview's **+ Add…** menu shows each group as its cameras' pictures on the group's grid. The pictures are fetched again every 5 minutes, not live. **+ Add…** is now a menu rather than a drop-down list (a list can't show pictures): arrow keys, Enter and Esc work as before.
- Camera Dashboard: click a camera's picture or name in the Cameras list to watch it live in a popup (Home Assistant's MJPEG stream, through the app, so it works remotely too): smooth for cameras that make MJPEG, a few frames a second for the others. Each live view is logged when it opens and closes.
- Every dialog in the panel: Enter now presses the main button (Save, Add...) as intended; it did nothing.

## 2026.10.1-b8

- New **Camera Dashboard** option and panel page: one place for the cameras (chosen from Home Assistant's list, each with its medium and high channels, zoom, PTZ presets and page controls), the groups the compositor tiles them into, the overview's layout (landscape and portrait), and the camera dashboard itself (its address, Back / Home / Help, wall tablet users, live cards). Edits are a draft with live previews of every composite; **Deploy preview** puts the dashboard on `/dashboard-cameras-preview` with the draft composites, **Deploy live** replaces the real one and makes the draft what the wall tablets see. Each deploy keeps the dashboard it replaces (Backups, with Restore), YAML shows it for copy and paste, and the page warns about entities, users and custom cards Home Assistant seems to lack. On first start it takes over an existing `groups.json` / `entities.json` (and the old generator's `dashboard_config.json`, if copied into the app's config folder) and rebuilds today's dashboard exactly. Previews are served on port 8098.
- Compose camera groups: while the Camera Dashboard is on, the live composites come from its last live deploy, so editing never disturbs the wall tablets; they change without an app restart.

## 2026.10.1-b7

- The panel and the guest welcome page go back to the deep green colours: calmer than the terracotta. The new icon and logo stay.
- Kiosk Satellites: in the Home Assistant app on iPhone, iPad or Mac, Download now says the app can't save downloads and to open the panel in a browser (it failed with NSURLErrorDomain -999). Safari, Chrome and the Android app download as before.

## 2026.10.1-b6

- An open panel reloads itself when the app is updated, so it never keeps showing the old version's pages. (Pages already open from b5 or earlier need one manual reload to pick this up.)
- Kiosk Satellites: downloading a kept copy of a tablet's setup works in Safari and the Home Assistant app on Apple devices (it was cancelled, NSURLErrorDomain -999), and a failed download now says so.

## 2026.10.1-b5

- The alarm panel's device is named after your house (House name option): for example "Villa Rosa alarm", so a new install's entity is `alarm_control_panel.villa_rosa_alarm`. Renaming the house renames the device at once (the integration reloads); HA keeps entity ids it has already made.
- The back link on every panel page names your house instead of Casa Mia.
- New **Count this install** option (on by default): once per version the app downloads that release's notes from GitHub, so the project's download count shows how many homes use it. Anonymous, and explained in the app's Documentation tab; switch it off and nothing else changes.

## 2026.10.1-b4

- When the app installs its integration for the first time, Home Assistant shows a notification asking for a restart (there is no Repair for it yet, as the integration is not loaded until then), and where to add Casa Mia afterwards.

## 2026.10.1-b3

- **Renamed to Casa Mia.** This is a new app and a new integration (`casa_mia`) to Home Assistant: an earlier build under its working name does not update to it, so install this one, set it up afresh, then remove the old app and its integration. The FONA event is now `casa_mia_fona`, the guest login event `casa_mia_guest_login`, the text service `casa_mia.send_sms`, and QR codes are saved under `/media/casa-mia/`.
- New **House name** option: shown over the house photo on the panel's home page and on the guest welcome page, whose default title is now "Welcome to <house name>".
- Guest login: the "Printed QR code" tick is now **Legacy QR code (ha-auto-guest-login)**, for QR codes made for that app.
- New icon and logo (a house with a heart), in the app store, on the integration and in the sidebar; the panel and the guest welcome page take their colours from it (terracotta, cream and garden green), in dark and light.
- Integration 2026.10.1-b3.

## 2026.10.1-b2

- New **Alarm panel** option (default off): the alarm panel can now be switched off like every other feature, and has a tile in the panel. **Switch it on after this update if you use the alarm.**
- Integration: a feature switched off in the app no longer has a device in Home Assistant. Its device and entities are removed (guest endpoints included), and come back when it is switched on again; the integration reloads by itself when a feature is switched on or off.
- The app's log says at start which features are on and which are off, and whether the alarm panel is switched on.
- Integration 2026.10.1-b2 (restart Home Assistant when asked).

## 2026.10.1-b1

- Versions now follow Home Assistant's style: YYYY.M.R for releases, YYYY.M.R-bN for the test builds before one.
- The integration's version is now the app version it last changed in (from its next change; it stays 0.5.2 until then), so it still only asks for a restart when it really changed.
- The Network section of the app's Configuration tab now says which feature each port belongs to, so the ports of features that are off can be blanked.
- Preparing for a public release: private details (addresses, names) removed from the code and docs; the camera layout shipped with the app is now an example.

## 0.1.42

- Kiosk Satellites: Export and Import are replaced by backups the app keeps itself.
  - Choose what (settings only or full config), how many to keep per tablet (1 to 6) and how often to check (6 hours, 12 hours, daily or weekly; daily by default).
  - Each check takes the tablet's setup into the app's data and keeps it only if something changed, apart from the export time. The log names the keys that changed, so other noise can be left out too.
  - Each row shows how many backups a tablet has and when it last changed. Click a tablet to see its backups, newest first, with what changed in each; **Get latest** takes one now, and each can be downloaded or restored to the tablet.
  - **Update** appears on a tablet behind the latest release: it installs the release from the firmware server, as the tablet's own Updates button does.
  - Fixed: a kiosk opened in the panel could stick at "Reconnecting...". Through Home Assistant its websocket reconnected with the kiosk's path added twice, and the kiosk refused it.
  - The kiosk page in the panel no longer has the New tab and On the LAN links; Visit on the list does that.

## 0.1.41

- Kiosk Satellites: followers are now listed indented under their leader. A kiosk names its leader by name, not by id, so no follower was ever matched and all of them were listed at the top level.

## 0.1.40

- House photo editor: Cancel now undoes everything, the photo included. Choosing a photo or **Use the original** only previews it; the change is saved with Save, together with the framing. Before, the photo change was saved at once and Cancel kept it.

## 0.1.39

- Kiosk Satellites:
  - Fixed: commands from a kiosk's admin page opened in the panel reached the tablet with their first letter missing ("estartApp"). The app no longer edits the page's scripts; a small script on the page redirects its requests instead.
  - Leaders are listed first, each with the kiosks that follow it indented beneath; several leaders are fine.
  - **Visit ↗** opens a kiosk's admin page directly in a new browser tab, for use at home.
  - **Log out** forgets the app's long-lived login for one tablet (nothing changes on the tablet).
  - Hover tips on every action. Export is tablet to you, Import is you to tablet, and the dialogs now say so.
  - The app looks for new kiosks when it starts and when you press Look now, no longer every 10 minutes. Known kiosks are still checked every minute.
- Green buttons use whichever text colour reads best: white on the darker green of the light theme, dark on the lighter green of the dark theme.

## 0.1.38

- New module, Kiosk Satellites (switch on **Kiosk Satellites** in Configuration). It finds the wall tablets through Home Assistant's ESPHome devices and through each other, and shows each one's version (flagged when behind the firmware server's latest), IP, battery and Wi-Fi.
  - **Log in** once with the kiosks' remote-admin password; the app keeps a long-lived login for each kiosk, never the password.
  - **Export** downloads a kiosk's settings or full config and keeps the latest copy in the app's data, so Home Assistant backups include it. **Import** applies an export file, or the kept copy.
  - **Open** shows the kiosk's own admin page inside the panel, logged in, through Home Assistant, so it works away from home too. A direct link for use at home is next to it.

## 0.1.37

- House photo editor: a Reset button for the home page and for the welcome page puts back that page's last saved framing, so you can try a change and undo it.
- New default framing for the photo the app comes with: home page zoom 1.0, centred left to right, 49% down; welcome page zoom 1.35, 21% across, 89% down. A framing you have already saved is kept.

## 0.1.36

- The house photo is now a setting. The pencil on the home page's photo opens an editor: upload your own photo (or go back to the original), and set the zoom and framing for the home page and for the guest welcome page, with a live preview. Saved in the app's config folder; nothing is rebuilt.

## 0.1.35

- Firmware server: the release list the tablets read only names releases whose APKs are on disk. GitHub listed 2026.10.3 before its files were attached, and tablets were being offered an update they could not download.
- Guest login: the log no longer shows the printed QR codes' secret dashboard ids (at start-up and in refusals); it shows `/guest-dashboards/<printed QR id>` instead.

## 0.1.34

- Phones: the People table shows Name, Call and Text above the ticks, with the number under each name; text boxes no longer make iPhones zoom in; long tile values wrap instead of widening the page; an area's button sits under its description.
- Long errors (URLs, file paths) wrap inside their tile or banner instead of running out of it, on every screen; tile labels such as "Last call" no longer break in two beside a long value.

## 0.1.33

- Guest login devices are named "Guest: <label>" (or "Engineer: <label>"), so they stand apart from the house's own devices. Existing entity ids are not changed.
- Phone and SMS: the signal gets a quality word as well as dBm (excellent, good, OK, bad, terrible, from the usual GSM bands: -73 dBm or better is excellent, -93 is still OK, below -109 is terrible), on the tile and as a new Signal quality sensor (integration 0.5.2).

## 0.1.32

- Wording: People is everyone known to the home; the FONA option is **Phone and SMS**, a way to reach the house without the internet.
- The Phone and SMS tile (and the integration's State sensor) shows who last called and texted, with the time; intrusions show the number and why.
- Logging: every call and text is logged with who, the number and the message; texts sent and their result too. Raw serial traffic moved to debug. Every change made on the admin page and every request from the integration is logged. The start line is boxed, so each restart stands out.
- Dialogs: Tab and Shift+Tab move through every field and button, Enter saves, Esc cancels. (Enter used to press Cancel.)
- People: the Call and Text headings line up with their ticks.

## 0.1.31

- New: **People** page in the Casa Mia panel: everyone known to the home; today one phone number each (type it as you would dial it), with a Call and a Text tick and an optional link to a Home Assistant person. A "Check a number" box shows what the line would do. Saved in `people.json` in the app's config folder.
- New: **Phone and SMS (FONA)** option. The app talks to the FONA's Arduino itself (found by its stable USB id, reconnects on its own, probes a quiet line), answers PING with "PONG from App", checks each call and text against People, and passes it to Home Assistant as authorised or intrusion. Off until you switch it on.
- Integration 0.5.0: a FONA device with State, Signal, Reset and Call and Text events (authorised or intrusion), the `casa_mia.send_sms` service, and "PONG from Integration".

## 0.1.30

- The app logs its version when it starts.

## 0.1.29

- Firmware server: the tablet URL is just `http://<host>:8000`; Kiosk Satellite does not need `/releases.json` on the end.
- Firmware server: each tablet's update check and APK download is logged (with the tablet's address), and the tile shows when a tablet last checked.

## 0.1.28

- Firmware server page in the Casa Mia panel: the tablets' URL (with copy), Check now, how many older releases to keep, and the firmware files on disk with dates and sizes.

## 0.1.27

- Integration 0.4.0: the house alarm moves in from the separate `casa_mia_alarm` integration, as a "Casa Mia alarm" panel (arm away, disarm, triggered) driven by the alarm panel's sensors and toggle button. Its code is set in the Casa Mia integration's options; until it is set the panel refuses to arm or disarm (the old one fell back to a default). A wrong code is now reported instead of silently ignored, and arming while the alarm is triggered no longer presses the toggle (which would have disarmed it).

## 0.1.26

- Fix: Try it failed ("server dropped the connection") when it moved to the box's .local name: that name resolves to IPv6 first, and the app's ports only answer on IPv4. It now keeps the IP for the guest page and only sends the browser to Home Assistant under the other name; the guest server accepts only names the box really has.

## 0.1.25

- The landing dashboard picker leaves out admin-only dashboards: guests and engineers are never administrators, so they could not open them.
- A "Try it" button beside each endpoint's QR code opens its address in a new tab and runs the whole sign-in, as a scan would. When that address is the one your browser uses for Home Assistant, it opens under the box's other name (its IP or its .local name), so the trial login never replaces your own.

## 0.1.24

- Remove the welcome page preview's "Open in new tab" button: a tab outside Home Assistant's ingress cannot load it. The Preview window stays.

## 0.1.23

- Fix: the welcome page preview's "Open in new tab" said unauthorised. The tab now opens a self-contained copy of the page (photo included) instead of going back through Home Assistant's ingress.

## 0.1.22

- The guest welcome page has the admin panel's look: the house photo fading into the page, a card with the title and message, and follows the phone's light or dark setting.
- The app logs the exact URL to set the Casa Mia integration up with, and the admin panel shows it with a copy button. The integration's setup form (0.3.2) fills it in by itself when it finds the app.
- Guest login Settings has a Preview: the welcome page with the values you are editing, in a phone-sized window or a new browser tab.

## 0.1.21

- Fix: Add login → Existing Home Assistant user listed no users (the username was read from the wrong place in HA's user list).

## 0.1.20

- Guest login page in the admin panel: logins (HA users, created or linked, with a credential test) and endpoints (landing dashboard picked from every dashboard and view in HA), each endpoint's QR code to download or save into HA's media folder, on/off and timed opening. Changes apply at once, with no app restart.
- Guest login config moves from the app options into `guest-login.json` in the app's config folder; the `guest_*` options are gone except the on/off switch. Re-enter logins and endpoints in the new page.

## 0.1.19

- Casa Mia admin panel (Open web UI, and in the sidebar): a tile per switched-on module with its live state; says what to switch on when nothing is.

## 0.1.18

- The integration (0.3.1) removes the device and entities of a guest endpoint that no longer exists (renamed or deleted), so nothing stale is left behind. `login` is now a reserved endpoint id.

## 0.1.17

- Guest login endpoints keep their on/off state (and any timed opening) across app restarts and updates; the state is kept in the app's data folder.

## 0.1.16

- The guest welcome page has a configurable delay, title and message, app-wide (`guest_welcome_*`) and per endpoint (`delay`, `title`, `message`).
- Help text on every guest login option, including each field of the Add account and Add endpoint dialogs (what the label, ID, slug and account are for).

## 0.1.15

- Guest login logs every request it refuses (unknown or switched-off endpoint, with the client address) and, in each case, what to change to fix it, including a ready-to-paste `guest_endpoints` entry. It also reports its configuration at start and says exactly why a login failed. The page itself still reveals nothing.

## 0.1.14

- Guest login endpoints are now the `guest_endpoints` app option (edited in the Configuration tab) instead of a file in the config folder; `guest_default_account` sets the default account.

## 0.1.13

- Add the `guest-login` module: guest and engineer QR endpoints that log a visitor into Home Assistant, each off until enabled (`guest_login_enabled` option, accounts in `guest_accounts`). The integration (0.3.0) adds a "Guest login" device with a child device per endpoint: access switch, last login, login count and a login event.

## 0.1.12

- Keep Pillow's own debug output out of the log, even at `log_level: debug`.

## 0.1.11

- Add the `compositor` module: tiles Home Assistant camera stills into one image per camera group and serves them on port 8099 (`compositor_enabled` option, config in the app's config folder).
- The house `groups.json` and `entities.json` ship in the app and are copied into its config folder when missing (never overwritten).
- Start through `run.sh` so the app receives `SUPERVISOR_TOKEN`.

## 0.1.10

- The integration gives each module its own device (starting with "Firmware server").
- gitproxy reports download progress (downloading, bytes, percent); the integration shows it (integration 0.2.4).

## 0.1.9

- Add the `gitproxy` module: mirrors the Kiosk Satellite firmware and serves it to the tablets on port 8000, with an on/off option (integration 0.2.1 shows its state and latest version, and has a Force Check button).

## 0.1.8

- Fix a translation error in the Casa Mia integration's setup dialog (integration 0.1.1).

## 0.1.7

- Colour log lines by level, as Home Assistant does (set `NO_COLOR` to turn it off).

## 0.1.6

- Log in Home Assistant's format (timestamp with milliseconds, level, thread, logger name).

## 0.1.5

- Fix the integration install failing to find the bundled components (the container's environment variables do not reach the app under s6).

## 0.1.4

- Fix the build reusing a cached, stale source clone, which left the integrations out of the image.

## 0.1.3

- Add a placeholder Documentation tab.

## 0.1.2

- Add this changelog, shown in the Supervisor's update dialog.

## 0.1.1

- Install the bundled Home Assistant integrations into `/config/custom_components` on start, and let each one raise its own "restart required" Repair.
- `/health` now reports the local API version.

## 0.1.0

- First skeleton: `/health` endpoint and icon.
