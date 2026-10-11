# Changelog

## 2026.10.8-b23

- Sensor Watch: four more filters, in every search and group: **floor**, the device's **maker** and **model** ("every Shelly Plus Plug S", not "every voltage"), and **category** (primary, diagnostic or config: an ESP board's VCC reading is usually diagnostic, so a group of *primary* voltages leaves it out without a `-vcc`).

## 2026.10.8-b22

- **Breaking:** Casa Mia's cards changed. Restart Home Assistant once; a Repair asks.
- Cards: their previews in Home Assistant's card picker look as they will in use. Camera Commander shows its still picture without the "while editing" hatching; the Over layer shows a picture of what it does (a card over a veiled dashboard) and no longer puts its layer up from the picker; the Sensor Watch card shows what you have, or with nothing to list an example of a bad day, and never hides there.
- Sensor Watch page: it asks for the live levels at most once a second. With sensors whose values move many times a second (mains voltage, CPU) it fetched and redrew without pause, and Safari hung, more so with two pages open.
- Sensor Watch card: it asks even when Home Assistant has none of the integration's entities (it showed nothing, rather than saying the integration isn't set up).

## 2026.10.8-b21

- **Breaking:** the Sensor Watch integration and Casa Mia's cards changed. Restart Home Assistant once; a Repair asks.
- Sensor Watch: a change of level shows at once everywhere: the card and the page hear the integration's event the moment it decides (they waited for its entities to be written, up to a second, then asked again: one to two seconds in all); and its entities are written at once (then at most every 0.2 s while changes keep coming, so a storm is still a write a beat), for dashboards that read them.
- Sensor Watch: groups take a new entity, or one given a group's label in Home Assistant's own settings, within a couple of seconds (they hear HA's entity registry change), not at the next minute's sweep, which stays as a backstop.

## 2026.10.8-b20

- **Breaking:** the Sensor Watch integration changed (on/off watches). Restart Home Assistant once; a Repair asks. Until then it still works as before.
- Sensor Watch: its dialogs (New group, Watch an entity, Scan my house, Apply to…, the library, the editors) keep one size, so they no longer bounce as matches come and go; their contents scroll.
- Sensor Watch: an on/off watch has two plain settings, **When off** and **When on**, each its own level and message, in place of "Nominal when on" and the other state's level: so it reads as it means, inverting is just setting the two, and neither need be nominal. Watches and profiles made before read as they were, and change to the new form when next saved.

## 2026.10.8-b19

- **Breaking:** Casa Mia's cards changed (a new card). Restart Home Assistant once; a Repair asks.
- Sensor Watch: a card, **Casa Mia Sensor Watch**: what isn't nominal, worst first (all of it or one group's), each value live, a tap for its details; hidden when all is well, so in a Tablet Layout its panel (garnish heading and all) appears only when something needs looking at.
- Sensor Watch: the library adds CPU use and memory use.
- Sensor Watch: a group in the watched list folds away (▸) and opens again (▾) from its heading; remembered in this browser.

## 2026.10.8-b18

- Sensor Watch: a group can follow **the defaults, by what it is** instead of a profile: each member set up as Watch an entity would (a cover closed, a lock locked, a leak critical), passing over what has no default (the preview says which). So a group of roof windows or locks needs no profile first.
- Sensor Watch: the defaults are in the library too, as on/off and exact-states profiles (leak, smoke, gas, carbon monoxide, safety, tamper, problem, connected, low battery, door, garage door, window, opening, update; window or cover closed, lock, alarm panel, robot vacuum and mower), to Duplicate… and tweak. 74 profiles in all.
- Sensor Watch: **Duplicate…** moves into the profile editor.
- Sensor Watch: the watched list is **Grouped**: a heading per group (and Manual for those watched one by one), sorted within each; the heading stays in sight as its rows scroll. Untick the chip beside Sort for one list.

## 2026.10.8-b17

- Sensor Watch: a group shows what its filters match as you choose them (up to 200, each with its state, area and device; those it passes over say why), so you see what it takes before it takes it.
- Sensor Watch: a search word with a minus rules out what has it (`voltage -vcc`): in a group it keeps them out as new ones arrive too. Everywhere a search is.
- Sensor Watch: editing a group stops watching members its filters no longer take.
- Sensor Watch: Watch an entity, Scan my house, Apply to… and groups filter with the watched list's one-line chips instead of a column of drop-downs; a chip's menu is no longer cut off at a dialog's edge.

## 2026.10.8-b16

- **Breaking:** the Sensor Watch integration changed (`list` takes `group`). Restart Home Assistant once; a Repair asks.
- Sensor Watch: **groups that keep themselves up to date**: saved filters (device class, integration, area, label, search…) and a profile. Everything matching is watched, following the profile; whatever matches later joins by itself (checked each minute); a member stopped by hand stays out until **Let them back**. A Group chip filters the watched list, and the `list` service takes `group` (its members and its own worst level). Deleting a group keeps its members watched.
- Sensor Watch: each profile has its own **Export**, to share just that one (Export all saves them all).
- Sensor Watch: **Duplicate…** on a profile starts a new one from its levels (a room temperature per floor, say).
- Sensor Watch: the library grows to 55 profiles in categories, with a search (nothing starts ticked): batteries (replaceable; rechargeable to 80, 85, 90 or 100%; a home battery at its reserve; 12 V lead-acid and LiFePO4; a LiFePO4 cell), broadband against your plan (ADSL, FTTC, fibre, Starlink), indoor air (CO₂, humidity, PM2.5, radon), freezer, fridge, hot water, boiler pressure, room temperature, Wi-Fi signal, CPU temperature and disk use; aquariums, softener salt, frost, pipes in an unheated space and soil moisture. "Battery (%)" is now "Battery, replaceable (%)".
- Sensor Watch: the library adds mains voltage and grid frequency for the US, the EU, Japan, China and Australia; UK inverter trip points (G98/G99, as a Sunsynk is set); and free chlorine for a pool (1–3 ppm) and a hot tub (3–5 ppm), and hot tub bromine (4–8 ppm).

## 2026.10.8-b15

- Sensor Watch: its app code split into layers (store, scans, api) before groups; no change in behaviour.

## 2026.10.8-b14

- Sensor Watch: a library of profiles ships with it (**From the library…**): UK mains voltage (current law, and the ENA's 2026 proposal), UK grid frequency, pool or hot tub pH, and battery percentage, each with what it's for and its source.
- Sensor Watch: profiles **Export** to a JSON file and **Import…** from one, to share them; one with the name of a profile you have replaces its levels.

## 2026.10.8-b13

- Sensor Watch: profiles are made and edited on their own: **+ New profile**, and **Edit** on each (its name and levels; Rename is gone, as Edit covers it).
- Sensor Watch: **Apply to…** on a profile ticks sensors to follow it, watched or not (those not watched start being watched); any of a kind it doesn't fit are skipped, and said so.
- Sensor Watch: a profile's **N following** shows its followers in the watched list.
- Sensor Watch: the page and the Home tile follow Home Assistant as it changes, no longer every 30 or 60 seconds: the app holds one websocket subscribed to the watched sensors (their values) and the integration's own entities (a level moved), and the page waits on it.
- Sensor Watch: leak, smoke, gas, carbon monoxide and safety sensors default to no hold-off (they count at once), as do alarm panels, now watched by default (triggered is critical).

## 2026.10.8-b12

- Sensor Watch: a message may be up to 255 characters (was 80); past 80 the page shows the count and warns that notifications and cards may cut it short.
- Sensor Watch: **+ Below** inserts a band after another, filling the gap to the next.
- Sensor Watch: saving refuses a band's From or To that isn't a number (it used to save as open), and asks first when a range between two bands is left uncovered.

## 2026.10.8-b11

- **Sensor Watch watches any entity:** **+ Watch an entity** offers everything (an
  `input_number` you type a reading into, a `number`, a switch that should stay on), each
  watched as its state suggests: a number by bands, on/off as on/off, anything else by
  exact states. A scan still looks at the usual domains unless you choose one with the new
  **Domain** filter, also a chip on the watched list.

- **Sensor Watch: profiles.** Say a set of levels once for many sensors (twenty plugs on
  the same mains want the same bands): **Save as a new profile** in a sensor's editor,
  **Follows** to pick one, **Use the profile for the ticked** in a scan, and **Follow a
  profile** for what the watched list shows. Editing a profile, from any sensor that
  follows it, changes them all. A Profiles section lists them, to rename or delete.

## 2026.10.8-b10

- **Sensor Watch:** a scan's results have **Select all** and **Select none**, with how
  many are ticked.

## 2026.10.8-b9

- **Sensor Watch:** under the watched list, **Stop watching these** (what the filters
  show) and **Stop watching all**, each asking first.

## 2026.10.8-b8

- **Sensor Watch's watched list keeps in reach however long it gets:** it scrolls in its
  own box under one toolbar: a live search, level chips with their counts (tap to filter
  by one or more), filter chips for area, label, integration, device, device class and
  kind (each a short menu, offering only what the others leave), and a sort by level or
  name. Each row is two lines.

## 2026.10.8-b7

- **Sensor Watch watches more than sensors:** covers (a window open is a task), locks
  (unlocked a task, jammed an error), valves, updates (an update waiting is a task),
  vacuums and mowers (stuck is an error).
- **Sensor Watch knows what sensors mean:** a leak, smoke or gas is critical, a lost
  connection an error, a low battery a task, a door or window open a task; these are set
  up by their device class rather than their history, and a scan takes them without
  reading any history. In exact states, a state can have a level of its own.
- **Sensor Watch:** an integration you ignore leaves the Home Assistant itself list at once,
  and its event says it is no longer watched rather than that it loaded.

## 2026.10.8-b6

- **Sensor Watch:** a scan's results are readable again (each tick took the whole row and
  pushed the sensor off to the right).
- **Sensor Watch: Home Assistant itself on the page.** A new section lists what it counts
  beside the sensors (the Recorder and History, failing integrations), with a switch for
  each, and an Ignore for any failing integration (Watch again undoes it). Discoveries
  Home Assistant was told to ignore no longer count as failing integrations: they are
  never loaded, by design.
- **Kiosk Satellites:** the latest release, at the top of the page, is a chip that opens
  its release notes on GitHub (↗); each tablet's own version chip is back as it was.

## 2026.10.8-b5

- **Sensor Watch: a Device filter,** listing only the devices with sensors that match the
  other filters (choose ESPHome, and only ESPHome devices are listed); the search matches
  device names too.

- **Kiosk Satellites:** a tablet with a newer release waiting shows both versions on its
  chip (`2026.8.40 → 2026.8.49 ↗`); a tap opens that release's notes on GitHub.

## 2026.10.8-b4

- **Sensor Watch: exact states.** A sensor whose state should be one exact thing (an alarm
  number that should be 0, a washer that should be idle or standby) lists its nominal
  states, and anything else gets a level and a message. Text and enum sensors can now be
  watched this way too; a numeric sensor offers bands or exact states.
- **Sensor Watch's tile on Home shows overall health:** its chip is the worst level now
  (Nominal in green up to Critical in red), with the count at each level and the worst
  culprit named; it asks the integration once a minute, and says when the integration
  isn't added yet.
- **Sensor Watch's search** matches every word, anywhere, in any order, ignoring case
  and punctuation: "tank top" finds "Tank - Top", "Top of tank" and "Topup Tank".

## 2026.10.8-b3

- **Sensor Watch watches Home Assistant itself:** the Recorder or History not running is
  critical, and an integration that has failed to set up for five minutes (an error,
  retrying, not loaded) is an error, named, with Home Assistant's reason. They count in
  the status, the counts, the problem sensor, the event and the list service, so it no
  longer says all is well while Home Assistant is broken.

## 2026.10.8-b2

- **Sensor Watch:** **Watch it** works again (it waited for history that never came).
  An on/off sensor now has a **Nominal when on** tick and a level for the other state;
  every setting has its help, and the name defaults to Home Assistant's. When Home
  Assistant isn't running its Recorder or History integration, the page says so loudly
  (a serious fault in Home Assistant: no history, statistics or suggestions); sensors
  can still be set up by hand meanwhile.

## 2026.10.8-b1

- **New: Sensor Watch** (in development). Give any sensor bands of values, each with a
  level: nominal, task, warning, error or critical (and on/off sensors a nominal state);
  unavailable counts too. Bands are suggested from the sensor's history, outliers set
  aside for a look, and **Scan my house** suggests them for every sensor, filtered by
  area, label, integration or device class, 500 a round. A new integration, **Casa Mia
  Sensor Watch**, watches them: a status with the culprits, a count per level, a problem
  sensor, an event on each change and a `list` service for templates. Switch it on in the
  app's Configuration tab; see the guide.

## 2026.10.7

- **Home Assistant 2026.3 or later** is now enough (it was 2026.9): the oldest release with
  everything the Tablet Layout and garnish use from HA's dashboards.

## 2026.10.6

- **Breaking:** Casa Mia now needs Home Assistant 2026.9 or later, and the update isn't
  offered to an older one. Update Home Assistant first.

After updating, restart Home Assistant when the Repair asks: the integration has changed.

### New features

- **Guest login, made for holiday lets and visiting engineers.** Everything below is on
  the Guest login page and explained in its guide, which now also says how far a
  visitor's session can be narrowed and why it works the way it does.
  - **A passcode on an endpoint:** after the scan, the visitor types a code you gave them
    (with the booking, say) before they're signed in. It never expires: change it between
    guests. All digits gives them a number pad.
  - **Two-factor sign-in:** a login whose user has an authenticator app now asks the
    visitor for its code after the scan, instead of failing. Such a login shows a **2FA**
    badge.
  - **Sign its visitors out when it closes:** a new option on each endpoint. Closing it, by
    hand, from an automation or when its time runs out, signs out everyone its login let
    in. Endpoints sharing a login sign out when the last of them closes. On for new
    endpoints; existing ones work as before until you tick it.
  - **A goodbye:** a guest whose page is open when their endpoint closes is taken to a
    goodbye page (your house photo, with a title and message you set) or to an address you
    choose, a few seconds before being signed out.
  - **House rules** before signing in, for endpoints with *Show the house info first*;
    the guest presses **Continue**. A new **Photo height** setting moves the welcome card
    higher or lower, so the rules can be read at once.
  - **Engineer endpoints** get a plain *Maintenance access* page that signs in at once.
  - **New secret address each time it closes**, for an engineer's code handed out per
    visit, so an old code is no good.
  - **Who's signed in** and **Sign everyone out** on each login.
  - **What each login can reach:** a check that lists the dashboards each login's user can
    open and flags what's probably open by mistake, with buttons to fix it (*Local only*,
    *Hide them for this user*, *Admin only*). Each asks before it changes Home Assistant.
  - **A sign-in log** of every scan and what came of it, and every sign-out: the phone's
    address, browser and, when a device tracker knows the address, its person. Filter it,
    or download it as CSV. It survives restarts, and you choose how long it's kept.
    Passcodes, codes and secret addresses are never recorded.
  - **QR codes:** a printable **guest card** with your Wi-Fi's code beside an endpoint's
    (*1. Join the Wi-Fi*, *2. Scan to sign in*), your **Wi-Fi**'s own code, and a code for
    any dashboard or view.

### Improvements

- **No more install count:** the app no longer fetches anything from GitHub to be counted,
  and the **Count this install** option is gone. Casa Mia sends nothing to anyone for
  counting; the project page's Pulls badge comes from GitHub's own figures.
- A page's buttons beside its title move below it on a narrow screen, instead of
  squeezing the title.
- The Over layer's guide says how far along it is: Alpha.

### Bug fixes

- **No more blank Camera Commander pictures after an app update:** every card showing a
  commander's picture starts a fresh stream within a second or two of the app restarting.
  Before, it often stayed blank until the page was reloaded.
- Dialogs no longer open a drop-down list by themselves when they open (Safari and the
  Home Assistant app), where it then got in the way of the next click.

## 2026.10.5

- **New card: the Over layer.** One card, or a whole panel of them, shown over your
  dashboard while its Visibility conditions hold: the alarm's disarm panel over every wall
  tablet while the alarm is set, a look-but-don't-touch screen for a visiting engineer, a
  warning that floats up until it's dealt with. Its backdrop dims or blurs what's beneath
  and can take every tap, so the dashboard can be seen but not touched.
  - Covers the view (sidebar and header still usable) or the whole window.
  - Floats where you place it (nine positions, with offsets from the edges), fills the
    screen, or scrolls with the page. Floated in a corner with taps passing through, it
    makes a pop-over that goes away once you act on it.
  - **Show its whole panel:** in place of a card of its own, it lifts the panel it's in,
    headings and all; that panel stays out of its usual place.
  - Its card is picked and edited with Home Assistant's own editors; while you edit the
    dashboard it's an ordinary card with a badge.
  - The way out is for admins only: a small pulsing lid over Home Assistant's edit button
    (hover over it, or tap it, then tap the button), or `?edit=1` on the dashboard's
    address. Everyone else gets the wall.
- **Garnish on every Sections dashboard:** a new switch on the Settings page, **Enable
  garnish on all section dashboards** (off by default). Home Assistant already hides a
  section whose cards are all hidden; with this on, a section left with only garnish (a
  heading, say) hides too, on any Sections dashboard.
- **Tablet Layout edit mode:** every chip, sprig, padlock and dimension label now lights up
  under the pointer, so you can see what can be tapped.

## 2026.10.4

- **Breaking:** Guest login and Camera Commander have their own integrations now, **Casa
  Mia Guest Login** and **Casa Mia Camera Commander**. What to do: restart Home Assistant;
  under Settings → Devices & services → Casa Mia, delete the old **Guest login** device, each
  **Guest: …** and **Engineer: …** device and each **Camera Commander** device (do this
  first, or the new entities get ids ending `_2`); then add the two new integrations, which
  Casa Mia offers under **Discovered** while their module is on.
- **Breaking:** the `casa_mia.enable_for` action is now `casa_mia_guest_login.enable_for`.
  What to do: change it in your automations and scripts.

### Cameras, Camera Commander and Auto Dashboards

- **The Camera Dashboard is split in three**, each with its own page in the Casa Mia panel:
  **Cameras** (the house's cameras, their channels and controls), **Camera Commander** (the
  commanders) and **Auto Dashboards** (the generated camera dashboard). Your settings keep
  their keys under new names: *Compose camera groups* is now **Camera Commander**, *Camera
  Dashboard* is now **Auto Dashboards**. Your cameras and commanders move over by themselves
  on the first start.
- **Camera Commander page:** pick a commander from a list; its preview stays in view while
  its settings scroll beneath. **Save shows it live at once** on every Camera Commander
  card: no draft, no deploy. A commander with a problem (no cameras, a bad size) is refused
  on Save, with what to fix.
- **Track motion: Never takes over.** Pick the cameras (a busy road, a tree in the wind)
  that mark their motion on the card but never become the main camera by themselves.
- **Cameras page:** each camera's motion sensor, and its own motion detection switch (UniFi
  Protect's Motion, say). While that switch is off the camera never sees motion, and the
  page says so, with the switch to turn it back on. A camera's live view follows both.
- **Camera Commander card:**
  - motion is a pulsing dot the card draws on a camera's tile (the main camera's too) the
    moment its sensor sees motion, with options for its colour, size, pulse, how long it
    stays and its corner;
  - a tap on the main camera opens Home Assistant's camera dialog by default;
  - in a Tablet Layout it takes its panel's full width, and the card picker shows a preview;
  - *Show the draft* is gone: a card saved with it shows the live commander;
  - the editor saves only what you change, so a card follows later changes of a default.
    Cards saved before keep what they have: if a tap on the main camera still opens the
    dashboard page, choose more-info in its editor.
- **Camera compositor:** one compositor now draws everything, the cards, the dashboards and
  the pages' previews. Port 8098 and the integration's preview switches are gone. Its page
  names each viewer that is a wall tablet, from Kiosk Satellites.
- **Auto Dashboards:** a camera's live card is now a dashboard setting, **Live card per
  camera**.

### Tablet Layout

- **Garnish:** in edit mode, tap the sprig on a card's corner to make it garnish (a heading,
  say): it dresses its panel but never holds it open, so the panel hides when only garnish
  is left.
- Only cards made to fill a panel (Camera Commander, pictures, maps, iframes, camera cards)
  fill it when alone; a lone tile or button keeps its own size. `view_layout: {fill: true}`
  or `{fill: false}` overrules it.
- Edit mode: a short top or bottom panel keeps room for its toolbar and Add card button.
- The Casa Mia Section card is removed: use Home Assistant's own sections in a Tablet
  Layout. The guide says how to move a view that used it.

### Kiosk Satellites

- **Run everywhere:** Kiosk Satellite's own Quick controls (reload, clear cache, screen off
  and on, screensaver, check for updates, restarts), sent to every tablet in turn, with each
  tablet's result as it comes. Words, icons and colours by Xavier Larrea, the author of
  Kiosk Satellite.

### Working together

- **Pages keep up with updates:** a page left open through an update offers a **Reload** in
  Home Assistant's own toast once Home Assistant has restarted.
- **Wall tablets reload themselves:** when Home Assistant starts serving new cards, Kiosk
  Satellites asks every tablet it looks after to reload.

### Updates and the integration

- An update that needs Home Assistant restarted also posts a notification (the bell), which
  shows at once; the Repair could wait for a page reload.
- Fixed: an update could leave Home Assistant running the old integration with no Restart
  Repair, if the integration reloaded in between (a module switched on or off).
- Devices Casa Mia no longer provides can be deleted from it.

### Every module

- Each module says how far along it is (Skeleton, In development, Alpha, Beta or Released),
  on its page, its tile, its option and its guide, so you know what to expect before
  switching it on.
- The documentation is complete: the app's Documentation tab, and a guide for every module,
  with screenshots.

## 2026.10.3

A big one: 86 builds and 146 commits in five days, with more than 170 changes. Here are the highlights.

**Tablet Layout, a new view type.** Pick **Tablet (Casa Mia)** as a view's type and it fits the screen exactly, on any tablet, phone or desktop, with no scrolling. It is Home Assistant's own Sections view, so every card, editor and visibility condition works as before; its sections become panels round a main area.
- Panels in stacks, layers inside layers (up to four), edges as big as their cards, and panels that appear and close up as cards show and hide.
- Spacing like HTML's box model: margins, gaps and padding, with optional lines in the gaps.
- Edit mode is a technical drawing: every panel, gap, margin and size measured, and every chip and label clickable to change it.
- The full guide is in [docs/tablet-layout.md](https://github.com/gazoodle/casa-mia/blob/main/docs/tablet-layout.md).

**Camera Commander card.**
- The main camera plays as live video over the picture, labelled "(live)".
- It works away from home, through Home Assistant's login.
- It is drawn at exactly the card's size, in the screen's own pixels.
- The Security look is now the card's own option, and reaches the live video too.
- It streams only while it is on screen, and recovers by itself after a restart or a failed stream.

**Camera compositor, rebuilt as a pipeline.**
- A gatherer, a cache, generators and servers, each paused, run and paced on its own.
- One gatherer serves both the live and preview compositors. Each camera is read from its real stream through Home Assistant's go2rtc, decoding only the keyframes it needs.
- A survey learns every channel's size and whether it streams.
- A health verdict, with graphs of CPU, memory, network and bottleneck on its page and as a sensor to automate on.
- Streams come back by themselves after Home Assistant or go2rtc restarts.

**Integration.** Switches, numbers and buttons to run the compositor's pipeline from automations, a compositor health sensor, and a Swap sensor for screenshot layouts.

**Admin pages.**
- A Settings page.
- A Kiosk mode page, which edits kiosk-mode's settings for each dashboard without YAML.
- A Developer mode option.
- A much richer Camera compositor page.

**Fixes.** Kiosk Satellite's Open logs in again. The screenshot swap covers the camera pictures and never touches addresses.

**Under the hood.**
- The compositor (3,600 lines) and guest login are split into packages.
- A new rule keeps every source file under 800 lines.
- The app's image keeps PyAV in a layer of its own, so updates are smaller.

**When upgrading, check:**
- The old **Tablet layout card** is gone: use the Tablet Layout view type. Its YAML type, `custom:casa-mia-tablet-layout`, now names the view.
- The **Security look** switches on the Camera Dashboard are gone. Set it on each Camera Commander card, and update any automations that flipped those switches.
- A **Camera Commander card** without its own width is now half width, like Home Assistant's cards. Set the width in its Layout tab if you want it wider.
- The **dashboard helpers** have moved from the integration's options to the Casa Mia panel's Settings page.

## 2026.10.2

- Screenshot swap: the Kiosk Satellite page (proxied) shows the stand-ins in its text too, as it is drawn; its form fields keep the real values.
- Screenshot swap: a dashboard deployed while it is on shows the stand-in names on its camera pages too (their addresses keep the real ones).
- Adding the Casa Mia integration fills in the app's address again: it had stopped finding the app on current Home Assistant (a function it uses had moved), so the field came up empty. Leaving the field empty now also means the app found here.
- The integration setup dialog no longer shows a made-up example address, and a pasted address with a trailing full stop or spaces is accepted.
- The panel's Copy buttons now work in the Home Assistant companion app and say whether the copy worked (they did nothing there before).

## 2026.10.1

- First public release. See the README for what Casa Mia does and how to set it up.
