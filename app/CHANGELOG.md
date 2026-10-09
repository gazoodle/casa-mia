# Changelog

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
