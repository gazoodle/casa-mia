# Changelog

## 2026.10.3-b15

- Cards: the Commander and the Tablet layout now size themselves by one shared rule. Alone in a Panel view, a card is exactly the screen below its top edge, so nothing scrolls. In a Tablet layout tile it fills the tile. Anywhere else (a column, say) it takes its own shape from its width, but is never taller than the screen. Scrolling no longer changes its size, and on a phone the toolbars coming and going are allowed for.
- Tablet layout card: a Shape setting (default 16:10), for when it isn't the whole screen. The editor hides it on a Panel view.
- Fixed: a Camera Commander inside a Tablet layout on a Panel view took the screen's height instead of its tile's.

## 2026.10.3-b14

- Camera Commander card: never taller than the screen. On its own in a Panel view it is exactly the screen below its top edge, re-measured on every resize and rotation (HA's Panel view sets only the width). In a Tablet layout tile it fills the tile. In an ordinary column it is 16:9 of its width, but never taller than the screen.
- Camera compositor: tiles could show stills from hours ago, marked Stale, after a picture was asked for at more than one size. Each camera now keeps only its newest still.

## 2026.10.3-b13

- Camera Commander card: on a panel view (or anywhere the card is given a height) it was as wide as 16:9 of that height, so it ran off the side of a wider or narrower screen and was cut off. It now fills exactly the space it's given.

## 2026.10.3-b12

- Camera Dashboard: new Debug options for each commander. When on, the whole picture is dimmed (20% by default) and an L is drawn in each corner plus both diagonals, so the picture's true edges show. The picture's ID (name, size in pixels, scale) and the time it was drawn go 30% down the middle. You can set the dim level, the corner L length, the line width and the line colour. Camera Commander cards add their own figures 70% down: the card's size, what it asked for, and the picture's size as the browser decoded it.
- Camera compositor: a size test page at `http://<box>:8099/size-test` (8098 for the draft). It shows a commander filling the browser window, asked for at exactly the window's size the way the card asks, with the window size, the size asked for and the size that came back. Resize the window (in Safari, Develop → Enter Responsive Design Mode) to test the whole path. The Live and Draft panels on the Camera compositor page link to it, opening a new window.

## 2026.10.3-b11

- Camera compositor page: Restart stops both engines (live and draft) and starts them again. Flush cache on each panel forgets every still and picture, then fetches and draws only what is asked for. A bin at the start of each camera still's row forgets just that still, which is fetched again next round.
- Integration: new Camera compositor device with Restart, Flush live cache and Flush preview cache buttons, for automations too.

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
