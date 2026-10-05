# Changelog

## 2026.10.3-b10

- Camera compositor: when no camera answers at all (Home Assistant restarting, or out of reach), no camera is counted as missing. Before, every camera could be sidelined together for 10 minutes, and the pictures stayed half empty.
- Camera Commander: a width or height saved before 2026.10.3-b7 is ignored, so a commander squashed by an old setting is back to 1920 × 1080. The card asks for its own size.
- Camera Commander: the borders beside a main camera kept whole (Fit, Fixed shape, Own shape) are now see-through like the gaps, so the dashboard's background shows there instead of black bars.

## 2026.10.3-b9

- Camera compositor: a draft picture's first frame (previews, Show the draft cards) no longer marks every camera Stale when its stills are only seconds old. The stills kept for the Camera Dashboard page now record when they were fetched.

## 2026.10.3-b8

- The Camera compositor tile now opens a status page showing what the live and draft compositors are serving: each picture drawn (at its own size and at each size a card asked for), its age and open streams; the devices watching; and each camera still with its age, Stale and sitting-out marks. It refreshes every 2 seconds.

## 2026.10.3-b7

- Camera Commander card: the commander is drawn at exactly the card's size, in the screen's own pixels, and in its shape, so nothing is stretched, cropped or bordered on the tablet. Text, bars and gaps keep their size on any screen. Sizes are capped at about 4 megapixels, and tablets of the same size share one picture. A new size is drawn at once from the stills already gathered.
- Camera Dashboard: the commander's Width and Height settings are gone, since the card sets its own size. The preview and the generated dashboard keep a fixed size (1920 × 1080 by default).

## 2026.10.3-b6

- Camera Commander card: new "Show the draft" option, so the card follows the commander as saved on the Camera Dashboard page (Save draft) without deploying it live. Use it for trying out changes on a test page.

## 2026.10.3-b5

- New Lovelace cards, installed with the integration (first version, for testing):
  - **Casa Mia tablet layout** fills the screen exactly, with nothing to scroll. Panels of cards on the left, top, right and bottom sit around a main card, using the same layout options as a Camera Commander. A panel can have visibility conditions, and an empty one takes no room.
  - **Casa Mia Camera Commander** shows any commander on any dashboard. Tap a camera to make it the main one, or tap the main camera to open its live page.
  - **Casa Mia section** is a section's grid of cards that hides while none of its counting cards is showing, so a "Warnings" heading needs no condition of its own.
- Camera Dashboard: the commander layout options now share their names, help and defaults with the tablet layout card.

## 2026.10.3-b4

- Camera Dashboard: the Revert draft and Revert preview buttons sit on one line.

## 2026.10.3-b3

- Camera Dashboard: the preview dashboard keeps just one earlier version, and a single Revert preview button puts it back (press again to undo), like Revert draft. This removes the long list of preview backups at the bottom of the page.
- Camera Dashboard: new "Keep older versions" setting (0 to 5, default 3) for how many earlier versions of the live dashboard each deploy keeps; lowering it deletes the extras. It was a fixed 20 before, and the extra ones are removed when the app starts.

## 2026.10.3-b2

- Kiosk Satellite 2026.10.8 and later work through Home Assistant on their own, so the app no longer patches their admin page for them; older ones still get the patch.

## 2026.10.3-b1

- Admin UI build tools updated: Vite 8 and the React plugin 6. The panel looks and works the same.
- Admin UI type-checked with TypeScript 7.

## 2026.10.2

- Screenshot swap: the Kiosk Satellite page (proxied) shows the stand-ins in its text too, as it is drawn; its form fields keep the real values.
- Screenshot swap: a dashboard deployed while it is on shows the stand-in names on its camera pages too (their addresses keep the real ones).
- Adding the Casa Mia integration fills in the app's address again: it had stopped finding the app on current Home Assistant (a function it uses had moved), so the field came up empty. Leaving the field empty now also means the app found here.
- The integration setup dialog no longer shows a made-up example address, and a pasted address with a trailing full stop or spaces is accepted.
- The panel's Copy buttons now work in the Home Assistant companion app and say whether the copy worked (they did nothing there before).

## 2026.10.1

- First public release. See the README for what Casa Mia does and how to set it up.
