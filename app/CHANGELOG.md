# Changelog

## 2026.11.4-b1

- Sensor Watch names its code owner (`@gazoodle`), which the catalog for HACS and Home Assistant's Marketplace looks for. Nothing else changes.

## 2026.11.3

- **Breaking:** Sensor Watch is now an integration of its own, **Sensor Watch**, beside Casa Mia's, and the app's **Sensor Watch** option is gone. Restart Home Assistant when the Repairs ask. If you had Sensor Watch switched on, Casa Mia then sets the new integration up for you and brings your records over from the app, with the same device, entities and history. If you had it off and want it, add **Sensor Watch** under Settings → Devices & services → Add integration.
- **Breaking:** Sensor Watch's page has moved from the Casa Mia panel to Home Assistant's own sidebar, as **Sensor Watch** (admins only). The Sensor Watch tile on Casa Mia's home page opens it, and so does the eye in an entity's dialog.
- **Breaking:** Sensor Watch's actions are now `casa_mia_sensor_watch.list` and `casa_mia_sensor_watch.refresh`. Change them in your automations and scripts. The old names (`casa_mia.sensor_watch_list` and `casa_mia.sensor_watch_refresh`) still work for now, with a warning in the log, and will be removed.
- **Breaking:** Going back to 2026.11.2 or earlier removes Sensor Watch's integration. Restore a backup made before this update instead.
- **Sensor Watch runs in Home Assistant and needs no Casa Mia app.** Its records, scans, groups and profiles are kept inside Home Assistant, so they are in Home Assistant's backups and Sensor Watch keeps working while the app restarts. It is also published by itself, at [gazoodle/casa-mia-sensor-watch](https://github.com/gazoodle/casa-mia-sensor-watch), for HACS and Home Assistant's Marketplace, for a house without Casa Mia. A house with both has nothing to do: the app keeps Sensor Watch up to date, and leaves it alone if a store has installed a newer version.
  - Nothing else you have made changes: the `casa_mia_sensor_watch` event, the Notify on Sensor Watch blueprint and its automations, the card (`custom:casa-mia-sensor-watch`), the eye in an entity's dialog, and device triggers made on the Sensor Watch device all carry on.
  - If Casa Mia can't hand Sensor Watch over (the app didn't answer, or the new integration isn't installed yet), a Repair says why and nothing is watched until it can. Reload the Casa Mia integration to try again. The app's copy of the records is left where it was.
  - The page's levels and values are pushed to it by Home Assistant. When Sensor Watch isn't running, or the connection to Home Assistant is lost, the page says so instead of showing old levels, and recovers by itself. The page stays in the sidebar while the integration is reloaded, and leaves it when the integration is deleted.
  - Casa Mia's home page shows the Sensor Watch tile when Sensor Watch is installed, and only when the page is opened inside Home Assistant.
  - The eye no longer needs the Casa Mia app's **Show in sidebar**.
  - Sensor Watch has its own restart Repair, like Casa Mia's other integrations.

## 2026.11.2

- **Talking to a doorbell.**
  - New: **Intercom** (in development), as the Casa Mia Intercom integration. Each doorbell has one call that every screen agrees on, with a Call sensor and an End call button. Whoever talks first answers it, and nobody else can talk until it ends. A doorbell is any device with a doorbell event and a camera, so it doesn't need UniFi Protect.
  - New: **UniFi Protect talkback** (alpha), as the Casa Mia Protect Talkback integration. It lets Home Assistant talk through UniFi Protect doorbells and cameras by patching its go2rtc, and will be removed once Home Assistant and go2rtc can do that themselves. It is set up per Protect console with an API key.
  - The Camera Commander card has a Talk button over the doorbell's live video (or use your own button, with a `fire-dom-event` tap action). Every device shows the call's state (Ringing, Answered by …, Missed), and the card hangs up when it goes out of sight. Talk has a sound-only connection of its own, so you can tap other cameras during a call, and the button stays even when the doorbell's live video has failed. "Live to …" shows once your voice is actually going out.
  - **Half duplex:** a new Talking option on the card and the Talk tile. Answering opens the call with the microphone silent, and your voice goes out only while you hold a Hold to talk button, with the visitor muted meanwhile. Lifting your finger anywhere, the browser losing focus, or locking the phone stops your voice.
  - A call hangs up by itself: in half duplex after 2 minutes without a hold (the timer stops while Hold to talk is held, and a single hold counts for at most 2 minutes), in full duplex after 10 minutes, which a touch on the answering device's screen starts again. Every device shows the time left as a pill ("Hangs up in 1:42", or "Held").
  - New card, the **Talk tile** (`custom:casa-mia-talk-tile`): Home Assistant's own tile card on a doorbell's Call sensor, whose name and icon say what a tap does on this tablet (Talk, Hang up, or Answered by whoever has the call). It answers the doorbell even when the Camera Commander is showing another camera. `button: hold` makes it the Hold to talk button. It has a visual editor, with a colour and icon for each state. Your own buttons can answer too, with `call: <the doorbell's Call sensor>`.
  - Camera Commander, Guest Login, Intercom and Protect Talkback each have their own icon and logo in Home Assistant.
  - New how-to guides for talking to a UniFi Protect doorbell, putting talk buttons on a wall tablet, and showing the doorbell on every tablet when it rings (docs/how-to/).
- **Camera Commander card:**
  - It no longer gives up on its live main camera. Before, one failed start showed the drawn picture until the main camera changed, and two in a row stopped live video until the page was reloaded, which on a wall tablet could be weeks later. Now a channel that fails is tried again after 30 seconds, then after longer each time up to 10 minutes. Choosing another main camera and coming back tries at once.
  - When one of a camera's channels won't play on a device, the card plays another of its channels, the smaller ones first, and shows the drawn picture only when none plays. Before, a device that couldn't decode the video showed an empty main area.
  - A live video that stops is taken down after 5 seconds and the next channel or the drawn picture is shown, with "Live lost 3 min ago" and the reason in red. Before, the frozen video stayed on screen.
  - When its picture keeps failing it says so: a red "Picture failing for 3 min: retrying" over the card, until no failure has come for 15 seconds. Before, it retried every few seconds with nothing on screen.
  - The live video stops when the page is hidden or the card is out of sight, and starts again when it is back.
  - The card editor groups its settings into Main camera, Security look, Motion dot, Talking, and a collapsed Connection and performance section. Settings that don't apply are hidden, and keep their saved values.
- **Camera Commander page:**
  - New: **Arrange…** lays a commander's cameras out for you, as tiles around the main camera, over the commander's real picture. Choose the tile shape (16:9, 4:3 or square), the edges the tiles go on and the order they fill (with the same chips as a panel's cameras), then step between **Bigger main** and **Bigger tiles** before you apply it.
  - Arrange's **Tile fit**: **Best fit** keeps the tiles one size and lets each be up to 10% off the tile shape, so that they fill their edges. **Sizes vary** also lets the tiles on one edge be bigger than those on another, which often fills the whole picture. **Exact shape** keeps every tile exactly the tile shape.
  - Arrange shares the cameras for looks: opposite edges differ by at most one camera, with the spacing between tiles as even as it can be. **One row or column per edge**, on by default, keeps to one row or column of tiles on each edge; switch it off to be offered two as well.
  - Two more ways a panel can lay out its cameras: **Same size**, equal tiles grouped in the middle of the panel, and **Same size, spread**, with the spare room shared evenly between them and at both ends. The panel's **Tile shape** is square by default, or 16:9 so the cameras aren't cropped.
  - The live view says when a camera's video is in a format the browser can't play. Before, it showed nothing.
- **Screen orientation conditions:** dashboard screen conditions have an **Orientation** control (**Any**, **Portrait** or **Landscape**) alongside Home Assistant's width choices. Select both to require a matching width and orientation. It is on by default under **Screen orientation conditions** in Casa Mia's Settings; turning it off keeps saved conditions working and editable in YAML.
- **Tablet Layout:**
  - On a phone (narrower than 600 px) the view becomes Home Assistant's own sections view, in one column that scrolls, in the order top, main, left, right, bottom, with garnish cards left out. It switches back as the screen widens. Change the width, or set 0 to keep the Tablet Layout everywhere, with **Phone layout below** in the main panel's options (`narrow_below`).
  - Cards have a little room around them so their edges are not clipped by the panel.
- **Sensor Watch** no longer sends a burst of events when Home Assistant starts. Before, a watch whose entity hadn't loaded yet counted as unavailable, and each one fired "unavailable" and then "back" in the same second (hundreds of events and log lines, and Home Assistant's "logging too frequently" warning). Now each watch whose level changed during the start fires once, at its level after the start. This takes effect after the Home Assistant restart that the Repair asks for.
- The new **Augmenting Home Assistant** guide covers orientation conditions, dashboard helpers, garnish, Sensor Watch's frontend additions, Tablet Layout, the Over layer and UniFi Protect talkback, including what depends on Home Assistant's internals and may change with a Home Assistant release.
- **Fixed:**
  - Entities on an Over layer did nothing when tapped (no toggle, no more-info, no navigation), and some cards on it showed their entities as Unavailable.
  - The admin page's segmented choices wrap onto a second row on a narrow screen.

## 2026.11.1

- **Breaking:** the Casa Mia integration and its cards changed. Restart Home Assistant once after updating (a Repair asks), then reload the browser.
- **Breaking:** the screenshot swap works only in developer mode. Switch on **developer_mode** in the app's options to keep using it.
- **Breaking:** Tablet Layout: the last panel of an edge now fills what the others leave by default, so the edge reaches its end and its corner locks move something you can see. Before, every panel of an edge holding more than one was as long as its cards. To keep the old look, set the last panel to **As its cards**. An edge arranged centre or end is unchanged.
- **Kiosk Satellites: Remote control.** In a tablet's screen picture, **Remote control** shows its live screen and sends it your clicks, drags and keys, from home or away. It needs [droidVNC-NG](https://github.com/bk138/droidVNC-NG) installed beside Kiosk Satellite, and the VNC password entered once under **Remote control** on the page. Casa Mia logs in to the tablet for you, so your browser never sees the password. A session ends with Done, End remote control, or after 10 minutes without a touch or key. The guide [Run the whole house from your desk](https://github.com/Gazoodle/casa-mia/blob/main/docs/run-the-house-from-your-desk.md) covers the one visit each tablet needs.
  - **Back**, **Home** and **Recents** buttons stand in for Android's own (handy on an iPad, which has no Esc or Home key). To open the notifications, drag down from the top of the screen.
  - **Android Settings** opens the tablet's Settings app over the kiosk. Kiosk Satellite keeps running behind it, and **Home** brings it back.
  - **1:1** shows the screen at the tablet's own size and scrolls when it is larger than the window; **Fit** scales it to fit again. **Full window** makes the dialog fill the browser window.
  - Your pointer is shown as a dot, as droidVNC-NG sends no pointer of its own.
  - The dialog checks for a VNC server when it opens. Where there is none, **Remote control** is greyed out with the reason, and the tablet's row says so too, with when it was checked.
- **Kiosk Satellites:** each tablet's row starts with a picture of its screen. Click it for the full size, how old it is, and Refresh. It is taken when the page opens and on Refresh, never on a timer. Commands sent through a tablet's admin page are now logged at INFO.
- **People: number plates.** A person can have number plates as well as, or instead of, a phone number, and a **Gates** tick says whether their cars may open the gates. The new **Check number plate** action (`casa_mia.check_plate`) answers for a plate a camera read, for an automation that opens the gates. O and 0, I and 1, and S and 5 count as the same, since cameras misread them. The People page has a plate checker too, and a person opens by clicking anywhere on their row.
- **Screenshot swap** (developer mode):
  - The rules now live in the app's own folder. The `swap.json` in the integration's folder is converted once on the first start and then left as it is; edits to it no longer do anything.
  - A **Swap** page, opened from the developer section of Settings, adds, edits, switches off, deletes and filters the rules. Rules can match exactly as before, in any case (the replacement takes the case of the text it replaces), or by regular expression.
  - Every browser on Home Assistant now swaps its own page: Home Assistant's pages, dashboards, dialogs and Casa Mia's pages. It follows the page as it changes, and puts the real text back when a rule is changed, switched off or deleted. While a rule is being written, every browser outlines what it matches with a thin red box and shows the replacement as you type.
  - A form field whose text would be swapped is covered by the stand-in while it isn't being edited. Its value is never changed, so saving a form never saves a stand-in.
  - Editable text such as the YAML editor, charts drawn as pictures (history, energy) and text inside camera video keep their real text.
  - The app no longer swaps text on its way out, so Home Assistant's history and a dashboard deployed while the swap is on keep the real names. Pictures (QR codes, guest cards, the Camera Commander's labels) and the public guest welcome and goodbye pages are still swapped by the app.
  - Home Assistant hears of a change at once, instead of looking at the file every 5 seconds, both for the **Swap** sensor and for Sensor Watch's notifications and card.
- **Sensor Watch:**
  - Watching something new offers **Watch them all as a group…**, for one of many alike (every tablet's CPU). It opens a new group with filters to match those like it.
  - When some of a group's matches have no built-in levels and would be passed over, the group dialog says so, and how to give them levels.
  - A new library profile, **Wall tablet CPU use (%)**, for Kiosk Satellite's CPU sensor. It catches a tablet stuck flat out for 15 minutes (a warning above 75%, an error above 90%).
  - The eye in an entity's Home Assistant dialog shows the watch's message when you point at it, not only its level.
  - A profile's **Make it** waits for a name and bands that make sense, and says which is missing when you point at it.
- **Heating Flow card:** the colour scale goes down to −15 °C, for ground-source brine (indigo at −10 and off-black at −15, where everything below −5 used to be the same blue). A new card takes the full width by default, in the Tablet Layout too.
- **Tablet Layout** edit mode adds up to two layers, not four, as an edge's stack and corner locks now do what a third layer was for. A view that already has three or four still shows them.
- **Fixed:**
  - The Back button helper (`#BACK`) sometimes didn't start when a page first loaded, usually just after an update, so Back did nothing until the page was reloaded. The same fault could stop **Reload dashboards when they change**, **Enable garnish on all section dashboards** and the offer to reload after an update. On the page a visit began on, `#BACK` now stays in Home Assistant instead of leaving it.
  - When a Casa Mia page couldn't load, it said "Loading…" for ever. It now says "This page couldn't load", with the reason.
  - A dialog opened from another closed both when a button in it was pressed, and a Save's message could show under a dialog's blurred backdrop.
  - A card on an Over layer was drawn in a serif font instead of Home Assistant's.
  - In the Home Assistant app on a Mac, the Casa Mia panel's messages ran the full height of the window.
  - In Tablet Layout edit mode, a short panel is now tall enough for Home Assistant's Add card button.
  - On a phone, a dialog's buttons wrap onto the next line when there are too many for one.

## 2026.10.11

- **Breaking:** the Casa Mia integrations and their cards changed. Restart Home Assistant once after updating (a Repair asks), then reload the browser.
- **New card: Heating Flow** (`custom:casa-mia-heating-flow`): the heating and hot water as a live diagram, set up entirely in the card editor. Three views, as tabs: **System** (the source, heat pump, diverter, up to three floors of underfloor loops or radiators, the hot water tank, return loop, softener and storage tank), **Heat pump** (a cutaway of the refrigerant cycle, with compressor oil temperature), and **Rooms** (a tile per room with its temperature, target and loop). Colour is temperature, moving chevrons are flow, and a part whose sensor is unavailable says so, with how long. **Enable animations** off (or reduced motion) gives a still picture, for a low-powered tablet. Kudos to slipx06, whose [Sunsynk Power Flow Card](https://github.com/slipx06/sunsynk-power-flow-card) inspired it.
- **Sensor Watch is now Beta.** In daily use, and it has already caught a real fault.
  - **It explains itself on its page:** **How Sensor Watch works**, a fold at the top, says what levels, a watch, a profile and a group are for, how a level reaches you and where to start. With nothing watched, the list shows the three steps to start. The Groups and Profiles sections say when to use each, and a sensor's **Follows** is now **Levels from**.
  - **Bands as a ladder built out from Nominal:** the nominal window in the middle, and each band above or below it with only its far edge ("Warning up to 24", "Critical above 26"), so no edge is typed twice and no value can fall between two bands. Each band out from nominal must be worse than the one inside it. Moving a nominal edge offers to move the bands beyond it by the same amount, or the whole ladder. A watch saved before with a gap between bands opens with the gap as a band at its old level, so it behaves as before. "Outside every band" is now **Not a number**.
  - **Click a row** in the Watched sensors, Profiles or Groups list to open its editor; the Edit buttons are gone.
  - **An eye in Home Assistant's entity dialog**, for admins: a tap watches the entity, or opens its watch; once watched, it shows the level in its colour, live. It needs the app in the sidebar.
  - **Device triggers:** + Add trigger → Device → Sensor Watch offers "reached a level, or worse", "escalated" and "back to nominal", each narrowed to a group if you like. No YAML needed.
  - **Escalation:** a level left standing moves up after a time you set for each of Task, Warning and Error ("escalated from Task (7 days ago)"). A new battery watch escalates to a warning after a fortnight.
  - **Accuracy:** how far a meter may be out, so a reading that close to an edge holds its level instead of flapping. The library's mains voltage profiles come with ±1 %.
  - The library's salt, battery, boiler pressure, pool and hot tub water, disk space and mains voltage profiles gained escalation or accuracy. Take them from the library again to get them on yours.
  - **Unavailable for** (5 minutes by default) has its own wait, so a restart, a reload or a car asleep doesn't raise an error. A better level counts at once; only a worse one waits out its hold-off, which is timed from when the entity changed.
  - The **Status** sensor's icon takes its level's colour on every card. **Problem** stays red for a warning, as Home Assistant colours it.
  - Values are rounded as Home Assistant shows them, everywhere (49.95, not 49.9500007629395), and the event and the List service carry the sensor's `unit`.
  - A sensor found at a level other than nominal (at Home Assistant's start, or when its watch is edited) now fires the event too, with `initial` true, so a problem from before a restart is raised again.
  - A new group asks for its members' levels when none of them has built-in ones (a pressure, most numbers), instead of passing them all over in grey. **New profile…** makes one there and then, and the button says how many will join.
  - The Sensor Watch card can show each row's icon, coloured by its level, and its parts (icon, level, name, message, value, how long) are drag-to-order chips in its editor. Existing cards look as they did.
  - Sensor Watch's own entities can't be watched; that would judge itself.
  - A save reaches Home Assistant at once, carrying only what changed, and Home Assistant's own health is checked the moment an integration's state changes rather than once a minute.
  - The editor's chart labels its top and bottom values the right way up, and sums up outliers ("31 low, down to 216.1 V").
  - **Fixed:** a level that waited out its hold-off changed without telling anyone (no event, no notification, the page and card stuck) until something else changed.
- **Notify on Sensor Watch** (the blueprint):
  - Titles lead with the level as a word ("Warning: Spa pH", "Back to nominal: Spa pH"), and the value carries its unit ("(56.58 Mbit/s)").
  - On a phone with the Home Assistant app, each level shows the phone's own way: on Android a notification channel per level, with its colour and icon; on an iPhone a task arrives quietly and a critical as a critical alert. A sensor's next notification replaces its last.
  - **Fixed:** Home Assistant 2026.10 refused it ("not a valid option at 'default'"). An automation made from it that failed to start: open it and save it again.
  - **Fixed:** Home Assistant could refuse the file ("expected <block end>") when several writes of it ran at once. It's now written whole, one write at a time.
  - Spook and Home Assistant's re-import no longer offer an "update" that would put back an older copy: the integration keeps it up to date itself.
- **New card: QR code.** An open guest login endpoint's QR code on a dashboard, or any page's, with the Wi-Fi's code first, drawn by the app as the printed guest card is. **Show instructions** can hide the steps for a bare code; a closed endpoint shows a grey *Closed* tile; the network's name and password are in a fixed-pitch font, so an l and a 1 can't be mistaken. In an Over layer with the condition *Logins is 0*, the tablets show the code until the guest's first scan.
- **Guest login:**
  - An endpoint's **Logins** counts the sign-ins since it last opened (it counted for ever), and a new **Waiting for first login** binary sensor is on while it's open and no one has signed in. **Logins** and **Last login** change the moment a visitor signs in, not up to 30 seconds later.
  - **QR codes → Words** puts the cards in your guests' language.
- **Camera Commander card:** the live main camera says "(live)" only while its frames reach the screen. When they stop, its caption says "Live lost 12 s ago" in red, counting up. It used to stay "(live)" over a frozen picture.
- Every change on the Casa Mia admin page, and FONA's state, error and signal, reach Home Assistant at once rather than at the next 30-second poll.
- **Docs:** Garnish (Beta) and the Over layer (Alpha) have maturity levels, and the README is ordered by who will find each part useful. Sensor Watch's guide has new screenshots.

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
