# Changelog

## 2026.10.5-b1

- Tablet Layout edit mode: every chip, sprig, padlock and dimension label answers the
  pointer (and keyboard focus) alike, with a ring and a touch of brightness, so you can see
  what can be tapped. Before, only a sprig not yet garnish did.
- Tablet Layout: garnish is `view_layout: {garnish: true}` only; the older spelling,
  `counts: false`, is no longer read.

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
