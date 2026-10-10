# Changelog

## 2026.10.7-b1

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
