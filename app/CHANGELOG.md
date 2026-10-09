# Changelog

## 2026.10.4-b20

- Camera Commander page: the commanders are a list to pick one from; the one picked shows
  its preview, held in view, with its settings scrolling beneath it.
- Track motion: **Never takes over** lists the cameras left out as chips, added with
  **+ Add…**, in place of a tick per camera.

## 2026.10.4-b19

- App Info panel: a clearer short description of the dashboards, cameras, guest login and tablet management; the more-details link now opens the user guides.
- Camera Commander: **Track motion switches to**, a tick per camera beside Track motion's settings. A camera unticked never becomes the main camera by itself (a busy road, a tree in the wind), but the card still marks its motion with the dot and a tap still makes it the main one; its motion never holds off Go back after either. All ticked by default.

## 2026.10.4-b18

- **The Camera Dashboard is now Auto Dashboards**, the last step of its split into Cameras, Camera Commander and Auto Dashboards. Its page (now at its own address, in the Casa Mia panel as Auto Dashboards) keeps the dashboard: its settings, draft, preview, deploys, backups and YAML. Rated In development.
- The app's options keep their keys (so your settings stay as they are) under new names: **Compose camera groups is now Camera Commander** (the commanders and their compositor), **Camera Dashboard is now Auto Dashboards**. The cameras and the commanders are on with either; their pictures need Camera Commander.
- A camera's **live card** (its page's card, where the dashboard's would not do) is now a dashboard setting, **Live card per camera** on the Auto Dashboards page, not a field of the camera; the ones you had are taken over.
- Camera Commander card: the motion dot also shows on the main camera's own tile in its panel, not only on the main picture.
- Docs: an Auto Dashboards page in place of the Camera Dashboard's, and the other camera pages, the README and the architecture brought in line.

## 2026.10.4-b17

- Kiosk Satellites page: **Run everywhere**, a panel of Kiosk Satellite's own Quick controls (its words, icons and colours, by Xavier Larrea, credited on the page and in the docs): Reload page, Clear cache, Screen off and on, Start and Dismiss screensaver, Dismiss camera view, Postpone screensaver, Check for updates, Restart app and Restart device. Each is sent to every tablet the app is logged in to, one after the other; the panel shows each tablet's result as it comes, and the log a line each. The restarts ask first.
- Docs: new pages for **Cameras** and **Camera Commander** (with the Camera Commander card's options, the motion dot and the tap on the main camera), the Camera Dashboard and Camera compositor pages brought up to date with the split, Run everywhere on the Kiosk Satellites page, and the README. Camera Commander is rated Beta, Cameras Alpha.

## 2026.10.4-b16

- Cameras page: each camera's **own motion detection switch** is found with its motion sensor (a switch on the camera's device named for motion: UniFi Protect's Motion, a Kiosk Satellite tablet's Screensaver motion detection). While it is off the camera's motion sensor never turns on, so the camera takes no part in Track motion or the card's motion dot: the page now says so, above the camera list (naming the cameras) and in each one's Motion column, and a camera's live view shows the switch's state live beside its motion sensor. Both have the switch itself, to turn the camera's motion detection on or off from the page (only a camera's own motion switch, through Home Assistant).

## 2026.10.4-b15

- Cameras page: a camera's live view shows its **motion sensor** under the picture: a dot that pulses red while it sees motion, and since when, followed live from Home Assistant (no polling). The motion column of the camera list shows the sensor's name over its entity id, wrapping in its column instead of running into Extras.
- A Casa Mia update that needs Home Assistant restarted now also posts a **notification** (the bell), which shows at once; the Repair (Settings → Repairs) could wait for a reload of the page before it showed. Dismissed, it stays dismissed until the next update; it goes by itself once Home Assistant has restarted.

## 2026.10.4-b14

- User documentation: completed the Kiosk Satellites, Firmware server, Kiosk Mode, People, Phone and SMS, Alarm panel, Home and Settings guides, including setup, page controls, Home Assistant entities and troubleshooting. Clarified that Kiosk Mode is installed separately and that the alarm panel is currently specific to one home's setup, with configurable behaviour planned.
- Python tests: the full suite now runs with eight workers by default, with the same commands recorded for Claude and Codex. Replaced fixed waits with events, a controlled expiry clock and shared shutdown checks; fixed the FONA reconnect assertion race. Fifteen complete benchmark runs passed all 264 tests, with the eight-worker median about three seconds. No tests are excluded as slow.
- Camera compositor: completed gatherer tasks are released, so restarting the engine no longer leaves tasks from the old event loop to break its next shutdown.

## 2026.10.4-b13

- Camera Commander card: **motion is a pulsing dot the card draws** on a camera's tile (the main camera's too) while its motion sensor sees motion, and for a while after (10 s by default). It shows the moment the sensor changes, with nothing for the compositor to draw: the old red dot drawn into the picture appeared only at the next redraw, so it was rarely seen. Hover the dot for when the motion was seen; a tap on it is a tap on its tile. New card options: the dot on or off, its colour, size, pulse (0: steady), how long it stays after the motion, and its corner.
- The motion sensors are the ones Track motion uses, found by the integration (each commander's select now has a `motion` attribute: camera to sensor). The compositor no longer draws motion, and the integration no longer sends it to the app.
- The card editor no longer saves options left at their default, so a later change of a default reaches every card left at it. Cards saved before keep what they have: a card whose main camera still opens the dashboard page has "its page on the camera dashboard" saved; choose more-info in its editor.

## 2026.10.4-b12

- The draft compositor has retired, now that commanders are saved straight to live. One compositor draws everything: the cards, both dashboards (the preview dashboard shows the live pictures too), the Camera Commander page's preview and the Cameras page's thumbnails. Port 8098 is gone (the app's Network settings no longer list it).
- Camera Commander card: **Show the draft** is gone; a card saved with it on shows the live commander. A tap on the main camera now opens its **more-info** (Home Assistant's camera dialog, with live video) by default; "its page on the camera dashboard" is still a choice, and falls back to more-info when there is no dashboard.
- Fixed: an update to the integration could leave Home Assistant running the old code with no Restart Repair. If the integration's entry was reloaded after the app installed the new files (a module switched on or off, for example), it took the new version as the one loaded and dropped the Repair. It now keeps the version its code was loaded with. (Seen with b11: restart Home Assistant by hand once.)
- The integration's Preview generator and Preview server switches and its Preview generator pace are removed, from Home Assistant's entity list too.

## 2026.10.4-b11

- New **Camera Commander** page in the Casa Mia panel: the commanders, moved off the Camera Dashboard page. **Save shows them live at once**, on every Camera Commander card: no draft, no Deploy live. The page's preview draws the commander you are editing; the pictures' address (Compositor host) is set here too. The first start moves your commanders from what was last deployed live (not the draft, so nothing unfinished reaches the walls), leaving the old files as they were.
- A commander with a problem (no cameras, a bad size) is refused on Save, with what to fix, rather than shown broken on the wall tablets.
- The Camera Dashboard page keeps the dashboard: its settings, preview, Deploy live, backups and YAML. It shows the Cameras and Camera Commander pages' changes in its draft at once; the live dashboard (its tap zones follow each commander's layout) takes them at its next Deploy live.
- The integration finds the commanders on Camera Commander now; its Camera Commander devices and entities stay as they are.
- Second step of splitting the Camera Dashboard into Cameras, Camera Commander and Auto Dashboards. Next: the draft compositor and the card's Show the draft option retire.

## 2026.10.4-b10

- New **Cameras** page in the Casa Mia panel: the house's cameras, their titles, channels, zoom, PTZ presets and page controls, now kept on their own (`cameras.json`) as the source the commanders and the dashboard read. Every change is saved at once. The first start moves your cameras from the Camera Dashboard, leaving its file as it was. The Camera Dashboard page keeps the commanders and the dashboard; it is now at its own address, with a new icon. A camera changed or removed on the Cameras page reaches the commanders' preview at once, and the live dashboard at its next Deploy live. The first step of splitting the Camera Dashboard into Cameras, Camera Commander and Auto Dashboards.

## 2026.10.4-b9

- Under the hood: the Camera Dashboard module is split into a package of small parts, along the lines of the coming split into Cameras, Camera Commander and Auto Dashboards (RULE THREE: no source file over 800 lines). No change in behaviour.

## 2026.10.4-b8

- Every module now says how far along it is: Skeleton, In development, Alpha, Beta or Released, with what that means. It shows on the module's page and tile in the Casa Mia panel, at the start of its option in the Configuration tab, and on its docs page, so you know what to expect before switching it on. The ratings are kept in one list.

## 2026.10.4-b7

- Under the hood: the Tablet Layout view, the Camera Commander card and the admin UI's Camera Dashboard and Camera compositor pages are each split into a folder of small parts (RULE THREE: no source file over 800 lines). No change in behaviour.

## 2026.10.4-b6

- Camera Commander: in a Tablet Layout it now defaults to the full width of its panel (elsewhere still half, Home Assistant's default), so it no longer needs switching to full width after placing it, and its preview in the card editor fills the preview area instead of half of it. A width set in the Layout tab still wins.
- Tablet Layout edit mode: in an empty view (fitted to the screen), a short top or bottom panel no longer clips its toolbar and Add card button; each panel keeps room for them.

## 2026.10.4-b5

- Camera Commander: the Add to dashboard card picker now shows a picture preview using the first available commander.
- Removed the obsolete Casa Mia Section card; use Home Assistant sections in Tablet Layout instead. The Tablet Layout guide explains how to move existing cards.

## 2026.10.4-b4

- Tablet Layout: only cards made to fill a panel (Camera Commander, picture cards, maps, iframes, advanced-camera-card, WebRTC Camera) fill it when they're alone. A lone tile or button keeps its own size, as two of them always did, so a garnish heading over one tile no longer stretches the tile. `view_layout: {fill: true}` or `{fill: false}` overrules it. Saved as `view_layout: {garnish: true}`; the older `counts: false` still works. The Section card editor says Garnish too.

## 2026.10.4-b3

- Tablet Layout: **Garnish.** In edit mode each card in a panel has a small sprig on its bottom-right corner: tap it to make the card garnish, adornment (a heading, say) that never holds its panel open, so the panel hides when only garnish is left. Garnish shows as a filled sprig, a dashed outline and a dimmed card; the sprig's tooltip says what each means. A panel holding only garnish is hatched in edit mode, as it never shows outside it.

## 2026.10.4-b2

## 2026.10.4-b1

- A page left open through an update (the old cards still running in it, so new features seem missing) now says so: after Home Assistant restarts, Home Assistant's own toast reads "Casa Mia updated to …: reload to use it", with a Reload button.
- Wall tablets reload themselves after an update: the integration tells the app which cards Home Assistant serves, and when that changes (Home Assistant restarted after an update), Kiosk Satellites asks every tablet it is logged in to to reload, so nobody has to touch them. The first of the modules "working together" (a new README section).
- Under the hood: Kiosk Satellites split into a package (`modules/kiosks/`), as RULE THREE asks; no change in behaviour.

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
