# Changelog

## 2026.10.11-b15

- Sensor Watch: a sensor found at a level other than nominal (at Home Assistant's start, when its watch is edited, or on Refresh state) now fires the event too, with `initial` true, once Home Assistant has started. Before, a problem that was there before a restart went unsaid, and the restart had cleared its notification. The Notify blueprint raises the sidebar notification again for it, but doesn't send it to a phone.
- Sensor Watch: **escalation**. A level left standing moves up: for Task, Warning and Error, set how long each may stand before it shows the next one up (each rung timed from reaching it). Better again resets it; worse on its own starts the ladder from the new level without what's shown dropping, and a restart doesn't reset it. The page says "escalated from Task (7 days ago)", the notification ends "a task for 7 days", and the event carries `escalated`, `real` and `since`. The library's salt, battery, boiler pressure, pool and hot tub water and disk space profiles come with one; re-import them from the library to get it on yours. A new battery watch (low battery, or a battery's %) escalates to a warning after a fortnight by default. Restart Home Assistant after updating to finish.
- Notify on Sensor Watch: titles lead with the level as a word ("Warning: Spa pH", "Back to nominal: Spa pH") instead of a coloured symbol.
- Notify on Sensor Watch: on a phone with the Home Assistant app, each level shows the phone's own way. On Android: a notification channel per level (set each one's sound and importance in the phone's settings once its first notification arrives), with the level's colour and icon. On an iPhone: a task arrives quietly and a critical as a critical alert (once you allow them). A sensor's next notification replaces its last, so being back replaces the alarm. Other notify actions get the plain title and text. Restart Home Assistant (or reload the Casa Mia integration) after updating to have the blueprint written again.

## 2026.10.11-b14

- Sensor Watch: bands can have an **accuracy**, how far the meter may be out (a percentage of each edge, or an amount in its unit). A reading that close to an edge holds its level: it gets worse only once the reading is surely past the edge, and better as soon as it is back inside. A mains plug reading 253.4 V against the 253 V limit no longer raises a warning, and a reading sitting on a line no longer flaps. The editor has the field, shades the margin on the chart, and says when it is wider than half a band. The library's mains voltage profiles come with ±1 %; re-import them from the library to get it on yours. Restart Home Assistant after updating to finish.

## 2026.10.11-b13

- Sensor Watch: a save reaches Home Assistant at once, carrying only what changed. The app sends the watches you changed over the connection to Home Assistant it already holds, and the integration takes them and answers with each one's level. It used to ask Home Assistant to fetch, which then fetched every watch to find what had changed (and, if that failed, waited up to 30 s). If the two ever disagree, the app sends every watch again. Restart Home Assistant after updating to finish; until then it works the old way.
- Sensor Watch: the Home tile's health follows the integration's own Status and count sensors as Home Assistant reports them, and the page's levels no longer reload in full after every change.

## 2026.10.11-b12

- Sensor Watch's Notify blueprint: Home Assistant could refuse it ("Failed to load blueprint … expected <block end>") because a piece of an older version was left after its last line. At start, several writes of the file ran at once, and a longer text's tail survived a shorter one's end. It is now written whole and one write at a time, always with the newest choices. Restart Home Assistant (or reload the Casa Mia integration) after updating, and the file is written again correctly.

## 2026.10.11-b11

- Camera Commander card: the live main camera says "(live)" only while its frames are reaching the screen. When they stop, for any reason, its caption says so in red, "Live lost 12 s ago", counting up, and "(live)" comes back with the frames. It used to stay "(live)" over a frozen picture when a stream stalled without failing.
- Camera Commander card: a live main camera that never shows a frame (or shows one and stops) also says "Live lost … ago", counted from when it started; it used to show just the camera's name.

## 2026.10.11-b10

- Sensor Watch card: each row can show the entity's icon, coloured by the level, by its state as a tile does, or not at all; and the row's parts (icon, level, name, message, value, how long) are drag-to-order chips in the card's editor, shown in that order. Existing cards look as they did.

## 2026.10.11-b9

- Guest login: each endpoint has a **Waiting for first login** binary sensor, on while it's open and no one has signed in since it opened. An Over layer or a card's visibility can use it in place of a test that Logins is 0. Restart Home Assistant to add it.

## 2026.10.11-b8

- Sensor Watch: a level that waited out its hold-off changed without telling anyone: no event, no notification from the blueprint, and the page and card stuck at the old level (a car's battery still in error, as unavailable, long after it was back) until something else changed. Its timer ran off Home Assistant's loop; it runs on it now.
- Sensor Watch: a better level counts at once; only a worse one waits out its hold-off. A sensor back from unavailable, or back in its band, is told the moment it is.
- Sensor Watch: unavailable has its own wait, **Unavailable for** (5 minutes by default, in each watch's editor and each profile), so a restart, a reload or a car asleep doesn't raise an error.
- Sensor Watch: the hold-off is timed from when the entity changed (its Last changed in Home Assistant's dialogs), and a level's "since" is that moment, not when its wait ended.

## 2026.10.11-b7

- Sensor Watch: the Notify on Sensor Watch blueprint works again on Home Assistant 2026.10, which refused it ("not a valid option at 'default'"): its Anything else actions run as a sequence. An automation made from it that failed to start: open it and save it again.
- Sensor Watch: the blueprint's source address points at where it lives now (it still named the old Sensor Watch integration's folder), so Home Assistant's re-import finds it.

## 2026.10.11-b6

- Garnish (Beta) and the Over layer (Alpha) have maturity levels. The README is ordered by who will find each part useful, with each part's level beside it.

## 2026.10.11-b5

- **Breaking:** the Casa Mia integrations changed. Restart Home Assistant once; a Repair asks.
- Every change made on the Casa Mia admin page reaches Home Assistant at once, whichever page it was on (a compositor switch, a renamed endpoint, a pace), not at the integration's next poll, up to 30 seconds later.
- FONA: its state, error and signal reach Home Assistant the moment they change (the modem dropping, coming back, a new signal reading), not at the next poll.
- Sensor Watch: Home Assistant's own health (the Recorder and History, integrations that fail to set up) is checked the moment Home Assistant says an integration's state changed or a component loaded, not once a minute.
- Guest login: an endpoint's **Logins** and **Last login** sensors change the moment a visitor signs in. The app's login event already reached Home Assistant at once, but only the Login event entity heard it; the sensors waited for the next poll, up to 30 seconds, so an Over layer waiting on *Logins is 0* lingered. The event now carries the new count and time, and the sensors take them straight from it.

## 2026.10.11-b4

- QR code card: with the printed card's black border on, the card has no frame of its own round it (as the markdown card's Show only text), so the border is its edge. Reload the page to use it.

## 2026.10.11-b3

- **Breaking:** the Casa Mia integrations and their cards changed. Restart Home Assistant once; a Repair asks.
- Guest login: the words on the cards can be in your guests' language. **QR codes → Words** sets each one (Join the Wi-Fi, Scan to sign in, Network, Password, the passcode note and the rest), for the printed guest card and every QR code card alike; blank is English.
- Guest card and QR code card: the network's name and password are in a fixed-pitch font, so an l and a 1, an O and a 0, can't be mistaken.
- QR code card: **Show instructions** (on to start with) can hide the steps and the name under the code. With nothing else showing (no title, no network words), the code alone fills the card, to lay out round it as you like.

## 2026.10.11-b2

- **Breaking:** the Casa Mia Guest Login integration changed. Restart Home Assistant once; a Repair asks.
- QR code card: the endpoint is picked from a list of their names (it was a list of switches); the Wi-Fi's code comes first, on the left, so a phone joins the network before it scans to sign in; and with no endpoint or page, the card shows the Wi-Fi's code alone.
- QR code card: drawn by the app as the printed guest card is (one drawing for both), with the choice of the welcome title on top, the network and password written out, a black border round the card, and a black frame round each code. A closed endpoint shows a grey tile with *Closed*.

## 2026.10.11-b1

- **Breaking:** the Casa Mia integrations and their cards changed. Restart Home Assistant once; a Repair asks.
- New card: **Casa Mia QR code**. An open guest login endpoint's QR code on a dashboard (picked by its Access switch; *Closed* while it isn't open), or any page's, with the Wi-Fi's beside it if you like, drawn by the app as on the guest card. In an Over layer with the condition *Logins is 0*, the house's tablets show the code until the guest's first scan.
- Guest login: an endpoint's **Logins** counts the sign-ins since it last opened, back to 0 each time it opens (it counted for ever). An Over layer with the condition *Logins is 0* can then cover the tablets until a stay's guest first scans in; the sign-in log keeps the full history.

## 2026.10.10

- **Breaking:** the Casa Mia integration and its cards changed. Restart Home Assistant once; a Repair asks.
- **Breaking:** Sensor Watch is now part of the Casa Mia integration, not an integration of its own: one device, so one integration. Restart Home Assistant once; Casa Mia moves the old integration's entities onto itself (same entity ids, history kept) and removes it, and the app removes its files. Its list service is now `casa_mia.sensor_watch_list` (was `casa_mia_sensor_watch.list`): rename it in any template or script that calls it. The event (`casa_mia_sensor_watch`), the blueprint and the card carry on as they were.
- No more of the browser's own boxes and drop-downs: every "Are you sure?" (29 of them, on every delete and stop) is now our own dialog with the action named on its button, red when it deletes; Sensor Watch's "Save as a new profile" asks for the name in our own dialog; a band that isn't a number says so under the bands; and every drop-down (19) opens our own menu, with the keyboard as before (arrows, Enter, Escape, typing to jump).
- Every page's chrome has one look, shown in `docs/design/chrome.html`: checkboxes are small switches, radios our own dot, sliders ours (a white lozenge on a filled track; the hold-off and days of history are now stepped sliders, not number boxes); every button, field and switch answers hover and keyboard focus with the same ring; one way to fold (a solid triangle that turns), one menu, one kind of callout, help line and empty box; lists to choose from in a dialog look like Kiosk mode's (bold name, its address dimmed); the Tablet Layout's panel options and its "Remove layer?" are the same dialog in Home Assistant's colours.
- Every pill and chip, in the admin page, the cards and the Tablet Layout editor, now has one look: a status pill (a state) or a chip (something to press), in small uppercase, a chip outlined until pressed and filled when it is, with the Tablet Layout's ring (in the accent, HA's theme colour in the cards) on hover and keyboard focus. Before, there were some thirty hand-made variants in several sizes, weights and shapes. The Tablet Layout's panel, header, footer and line chips keep their look in the new size; its padlocks and sprigs are round chips (the sprig no longer dimmed when off); the Sensor Watch card's levels are tinted pills (critical filled); Sensor Watch's "N following" and Enable are chips.
- Sensor Watch: the header's count of watches with no level yet is a status pill, centred beside the Refresh state button.
- Sensor Watch: a watch whose entity was unavailable when Home Assistant started (a car asleep) got no level until its hold-off had passed after it came back, and again after each change meanwhile, so it showed `…` for as long as its hold-off (ten minutes for a car), and saving it did nothing. Its first real reading now gives it a level at once; the hold-off is for changes from a level it has. The page's header counts any watches with no level yet.
- Sensor Watch: **Refresh state** judges every watch afresh, as at Home Assistant's start, for when a level looks stuck: a button on the page (top right), a button on the Sensor Watch device in Home Assistant, and the `casa_mia.sensor_watch_refresh` action.
- Sensor Watch: a watch's **Follows** also offers the library's profiles that might suit the sensor, best first (by what it is, its unit and its name's words). Choosing one takes it into your profiles and follows it in one go; one you already have by that name is used as it is.
- Sensor Watch: the library adds **Electric cars**, by what each maker advises for everyday charging: an 80% daily limit (Tesla, Volkswagen, Skoda, Audi, Hyundai, Kia, BMW, Mercedes, GM's Equinox EV), a 90% one (Polestar, Ford's Mustang Mach-E), and LFP packs (happy at 100%: a Standard Range Tesla, BYD). Above the daily limit is a trip charge, a warning if it sits there.
- The app's store page and description mention Sensor Watch.
- Sensor Watch: a disabled watch's status pill is an **Enable** chip, which watches it again as it was (its levels or profile, its group).
- Sensor Watch watches **dates**: a date or timestamp is read as the days until it (negative once it's passed), banded in days, and judged again every ten minutes, so a reminder comes due on time though its state doesn't change. A `date` entity starts this way, and the library adds **Reminder due (days)**: a task in the fortnight before, a warning in its week, an error once it's passed, critical a month after. Made for a spa's reminders (the [Gecko integration](https://github.com/gazoodle/gecko-home-assistant)'s Rinse filter, Clean filter, Change water and the rest); the guide has the worked example. The page and the card show the due date.
- Dependencies: vite 8.3.3 and @vitejs/plugin-react 6.1.2 for the admin page (rebuilt); the release and stats workflows on actions/upload-artifact 7, actions/download-artifact 8 and docker/setup-buildx-action 4. Dependabot now proposes its updates to `dev`, so they ship with a release.

## 2026.10.9

- Sensor Watch: in the first minute after the machine started, the page listed no entities to watch (a cache stamped 0 looked fresh, as `time.monotonic()` counts from boot). The guest login audit had the same start.
- Camera Commander: its health reading describes the commanders once, so its two views of them can't disagree.

- **Breaking:** Casa Mia's integration and cards changed, and there's a new one, Casa Mia Sensor Watch. Restart Home Assistant once after updating; a Repair asks.
- **New: Sensor Watch** (Alpha). Tell it once what normal looks like, for every sensor in the house, and it tells you only when something isn't. Each watched entity gets a level: nominal, a task (top up the salt), a warning, an error or critical. Switch it on in the app's Configuration tab, then add the **Casa Mia Sensor Watch** integration (Settings → Devices & services, under Discovered). The guide starts with half an hour to a watched house.
  - **Any entity, watched as it suggests:** a number by bands (suggested from its history or statistics, outliers set aside), on/off with a level and message for each state, exact states (with states of their own level: a lock jammed), **Available** (only whether it's there, either way round), or one of its **attributes** (a thermostat's `current_temperature`, not its mode). A hold-off stops a blip counting; unavailable counts too.
  - **What things mean, built in:** leaks, smoke, gas and carbon monoxide critical at once; doors, windows, covers, locks, updates, low batteries, vacuums and alarm panels set up by what they are.
  - **Groups that keep themselves up to date:** saved filters and a profile (or the defaults, by what each thing is). Everything matching is watched, a new plug joins by itself, one stopped by hand stays out. The dialog previews what it takes.
  - **Profiles,** said once for many sensors: made, edited, duplicated, applied in bulk, and shared (Export and Import… as a file). **A library of 80**, each with where its numbers come from: mains voltage and frequency for the UK (today's law and the ENA's 2026 proposal), the US, the EU, Japan, China and Australia; UK inverter trips (G98/G99); batteries; broadband against your plan; pool and hot tub chemistry; indoor air; freezers, heating and hot water; the garden; computers; availability; a security light on too long.
  - **The page:** every watch with its live level and value under one toolbar: a search (a word with a minus rules out: `voltage -vcc`), level chips with counts, filter chips (domain, area, floor, label, integration, maker, model, device, device class, category, kind, profile, group), grouped under folding headings, with a status pill on each row. **Scan my house** suggests levels for everything not yet watched. A watch can be **Disabled** without losing it.
  - **Home Assistant itself:** the Recorder or History not running is critical; an integration that fails to set up is an error (Ignore for any you don't care about).
  - **Telling you:** a status, a count per level and a problem sensor; an event on each change of level (with its message, value, area and group); a `list` service; the **Casa Mia Sensor Watch** card (what needs looking at, worst first, values live, hidden when all is well, so a Tablet Layout panel appears only when needed); and a blueprint, **Notify on Sensor Watch** (your phone and Home Assistant's notifications, at a level or worse, colour-coded, cleared when it's back).
- **Cards in the card picker** look as they will in use: the Camera Commander's picture without the editing hatch, the Over layer as a picture of what it does (it no longer puts its layer up from the picker), and the Sensor Watch card as an example of a bad day.
- **Kiosk Satellites:** a tablet with a newer release waiting shows both versions on its chip (`2026.8.40 → 2026.8.49 ↗`), and the latest release at the top of the page is a chip; each opens that release's notes on GitHub.
- **Docs:** Sensor Watch in the README and its guide, with worked examples, a table of every library profile, and screenshots.

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
