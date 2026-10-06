# Changelog

## 2026.10.3-b46

- Camera compositor: the survey. From the app's start, a pass over every channel of every camera, two at a time: each one's stream opened for its first frame (15 s at most), kept as its picture in the cache, and its size (a snapshot where it cannot be streamed); then a pause (60 s by default, 10 s to 1 h, on the Camera compositor page and as the integration's Survey pause) and another pass. A channel being read anyway is passed over. Paused with the gatherer; a purge or a new camera starts a pass at once. It replaces the one-off size probes and the 60 s kept snapshots, so every channel's picture and size come from its stream, and the page shows the pass as it goes.

## 2026.10.3-b45

- Camera compositor: reading the cameras' sizes from their streams no longer stops part-way. A stream that sent data but never a picture kept its probe waiting for ever; two such and the survey stopped for good (15 of 24 cameras were left with their snapshot sizes, 640 x 360 for every UniFi Protect channel). A probe now gives up after 15 s without a video frame, says why in the log and on the Camera compositor page, and is tried again in 10 minutes; a stream being read that stops giving pictures counts as lost and is read again.

## 2026.10.3-b44

- Camera compositor: the paces are settable, each on its own: the gatherer's (each channel fetched every 15 s down to continuous, again as soon as it answers) and each generator's (drawings every 15 s down to 8 a second). Sliders on the Camera compositor page; kept across restarts (compositor_pace.json in the app's config); a new pace is taken up at once. The page and the log give the actual paces, not "every 2 s".
- Integration: the camera compositor's pipeline for automations: switches for the gatherer and the live and preview generators and servers (on: running, off: paused), numbers for the three paces (seconds), and a Purge cache button. The Flush live cache and Flush preview cache buttons are gone (the cache is one, shared): delete them from Home Assistant if they linger as unavailable.

## 2026.10.3-b43

- Camera compositor: the server never draws. A picture it is asked for and has none of (or an old one) is asked of the generator and waited for; while the generator is paused, nothing new appears: a purged composite stays gone (an open commander's stream holds, a single picture is refused), and a drawing finished after the pause is dropped.
- Camera compositor: a snapshot that is not its channel's size (UniFi Protect gives every channel one 640 x 360 snapshot) is never kept as that channel's picture, nor asked for again: the channel shows its stream's frames only (the high channel showed a 640 x 360 snapshot). The cache shows each picture's own size, and the channel's when they differ.

## 2026.10.3-b42

- Camera compositor page: the cache holds the composites too (each picture the generators drew, with its thumbnail, live view and purge), beside the camera channels' pictures; a list view (small thumbnails) besides the tiles, sorted by name or newest first, the choice kept in the browser. The gatherer's channels are sorted by camera, then high, medium, low; each size says whether it is the stream's or the snapshot's; and a ↗ opens a live view of the channel's stream (the Camera Dashboard page's live view, shared). Each generator's picture has a ↗ to its live view.
- Camera compositor: a paused gatherer fetches nothing at all (the kept stills were still fetched, and a purge refilled the cache at once). Every camera's channels are sized from their streams once (cameras in no commander included), so their real sizes show: a UniFi Protect camera gives every channel the same snapshot. At most two streams are read at once for it (the limit was not shared).

## 2026.10.3-b41

- Camera compositor page: its pipeline, as it runs. A strip of the four stages (gatherer, cache, the live and preview generators, the live and preview servers), each with its state and a Pause or Run; the gatherer's channels (state, size and whether its stream's, rate, who wants it, misses); the cache as thumbnails, each with its age, source and the places drawn from it (red where enlarged), a bin to purge it and a tap for a live view; each generator's pictures (draw time, size); each server's viewers (rate, time spent waiting to send). Purge all replaces the per-engine Flush cache.
- Camera compositor: thumbnails are made once per picture and size and shared (the Camera Dashboard's and the page's).

## 2026.10.3-b40

- Camera compositor, a pipeline whose stages never wait on each other: the gatherer fetches each channel wanted in a loop of its own (its stream's newest frame, converted once and only when a new one has come, else a snapshot), so a slow or dead camera holds up only itself; each compositor draws on its own timer from whatever the cache holds; the server always sends the latest picture. After a main camera switch, the sharp picture is drawn as soon as its channel's first new picture comes.
- Camera compositor: every channel has a picture from the start, white with "(Waiting …)", so the first picture is drawn at once; a purge brings them back.
- Camera compositor: each channel's size (its stream's, else its snapshot's) is kept across restarts (camera_sizes.json in the app's config), so the right channel is chosen from the first picture and a stream already sized is not read again for it; a change is logged and kept.
- Camera compositor: pause and run the gatherer, and each compositor's drawing and serving, on their own (the admin API; the page to come). A purge keeps the channels' sizes.
- Camera compositor: a missed fetch counts against a channel only while others answer, so an outage of Home Assistant costs each channel one miss at most.

## 2026.10.3-b39

- Camera compositor: one gatherer for the live and the preview compositors. Each camera channel is fetched, or its stream read and decoded, once for both, into one cache both draw from (before, each compositor fetched and decoded its own, so a channel both used cost twice). Each compositor says every round what its pictures are drawn from; a channel nobody has wanted for a minute is no longer fetched or read. Both run on the gatherer's one loop.
- Camera compositor: a viewer's stream opening and ending is logged at debug, not info (the log was busy with them).
- The app's image keeps PyAV in a layer of its own, so an update no longer downloads it again.

## 2026.10.3-b38

- Camera compositor: each channel in use is read from its own stream, through Home Assistant's go2rtc (the app asks HA for each camera as its live view would, then reads go2rtc's restream on the host), so the picture is the camera's real video at its real size, not HA's snapshot (UniFi Protect gives every channel the same 640 x 360 snapshot). The other channels of each camera in use are read once for their true size, so the right one is chosen. A camera HA cannot stream, or whose stream is lost, keeps its snapshots (a lost stream is read again after 30 s). Readers stop once nobody watches. The Compositor page shows where each channel's picture comes from (its stream and frame rate, or snapshots, with the reason).
- Camera compositor: the log no longer repeats which channel each tile is drawn from on every round (a panel's cameras were mistaken for one another).
- Guest login: signs guests in through Home Assistant at 127.0.0.1, as the app is on the host's network since b37 (the name it used before only resolves on the Supervisor's network); likely why logins failed on b37.

## 2026.10.3-b37

- The app runs on the host's network, so it can reach Home Assistant's go2rtc (which restreams each camera on the host's localhost only): the way to come for the compositor to draw from the cameras' streams themselves. The compositor logs at start whether go2rtc is reachable, and shows it in its status. The app's ports are now the host's own (they were already published as the same numbers).

## 2026.10.3-b36

- Camera Dashboard page: a camera's live view plays the channel's own stream through Home Assistant's WebRTC, as HA's camera cards do, so the resolution shown is the stream's; a camera HA does not play by WebRTC keeps the MJPEG stream (made from snapshots). The note under the picture says which.

## 2026.10.3-b35

- Camera Dashboard page: a camera's live view shows the chosen channel's resolution, as its pictures arrive (and if it changes).

## 2026.10.3-b34

- Camera compositor: each place in a commander's picture (a tile, the main area) is drawn from the smallest of its camera's channels (low, medium, high) whose still is at least its size, so a picture is only ever made smaller: the main view of a large screen now comes from the high channel when medium would have been enlarged. Stills are fetched at the channel's own size and shrunk once, by the compositor, to exactly the place (Home Assistant no longer scales them first). Each channel's size is learned from its first still, and logged. The Compositor page's table is now per channel: its size, age, fetch time, and the places drawn from it, in red where one is enlarged.

## 2026.10.3-b33

- Commanders and the Tablet Layout: a panel's size can be in px as well as %, with its new Size in option (`unit: px`), so a panel stays the same size on any screen. A px panel takes at most 45% of the view, so a small screen still has a main panel; a commander drawn for a high-density screen grows it as it does the gap. Switching the unit in an editor keeps the panel's size.

## 2026.10.3-b32

- Tablet Layout: in edit mode the panels keep the sizes they have out of it, and the view scrolls to the header's and footer's editors; a top or bottom panel of size auto keeps its height too. The main panel was squeezed into a thin strip when the header or footer held something, shrank a step at a time on entering edit mode (the auto panels grew with HA's editors), and stepped back on leaving it.

## 2026.10.3-b31

- Camera Commander: through Home Assistant (away from home) the picture is asked for at no more than 1.5x the pixels a side by default, not the screen's own 2x or 3x, for about half the bytes; the card's new Sharpness through Home Assistant option offers Full, Balanced (1.5x), Light (1x) and Data saver (0.75x). Direct at home it is unchanged.

## 2026.10.3-b30

- Camera compositor: measures where the time goes. Its status shows each picture's size and drawing time, the last round's fetch time, and each open stream's frames, kB a frame, kbit/s and the share of time spent waiting for the network; the log records each stream's opening and the same figures at its end. Pictures through Home Assistant log their kbit/s and waiting too.
- Settings page: a change to the Tablet Layout debugging options shows on open Tablet Layouts within a few seconds (it waited for the integration's next poll and the view's next showing).

## 2026.10.3-b29

- Tablet Layout: the panels fit between the view's header and footer. The footer sat a row gap up from the bottom, over the panels, and a header or footer that changed height (a card loading, badges shown or hidden) left the panels at the old size until the next resize.
- Tablet Layout: Identify sections panels also outlines the view's header and footer.
- Tablet Layout: Space above the header, in the Tablet Layout dialog's middle options (Home Assistant's own is 24 px).

## 2026.10.3-b28

- The dashboard helpers (Reload dashboards when they change, Back button helper, Keep camera pictures live) are switched on the Casa Mia panel's Settings page (the cog by the house photo), no longer in the integration's options, which keep only the alarm code. Your current choices carry over on their own: the app takes them from the integration the first time it hears from it after this update. A change reaches Home Assistant within a minute (the integration reloads to load or drop the script); open pages get it at their next reload.

## 2026.10.3-b27

- The Camera Commander card works away from home. At home its picture still comes straight from the compositor; away (or with Home Assistant opened over HTTPS, where the browser blocks an http:// picture) it comes through Home Assistant, behind its login, for any signed-in user. Home is told by how the page reached Home Assistant (plain http at a home address), which the companion app already picks by the Wi-Fi it is on. The card's new "The picture" option can force either route. Needs a Home Assistant restart after updating, for the integration's new picture route.

## 2026.10.3-b26

- The Tablet Layout is "Tablet (Casa Mia)" in Home Assistant's View type list, in keeping with the others there, and its YAML type is now `custom:casa-mia-tablet-layout`. A view with the old `custom:casa-mia-tablet-view` still works; to move it to the new name, pick Tablet (Casa Mia) in its view editor (or change the YAML).

## 2026.10.3-b25

- The Tablet Layout (what was called the Tablet view) is in Home Assistant's view editor: Edit view (or Add view) → View type → Tablet Layout (Casa Mia), so a view no longer starts as YAML. A Sections view changes to it, and back, with its sections kept. Its YAML type stays `custom:casa-mia-tablet-view`.

- The old Tablet layout card is gone: the Tablet Layout view type does its job better, its panels edited as Home Assistant's own sections. A dashboard still using `custom:casa-mia-tablet-layout` shows Home Assistant's card error; move its cards into a Tablet Layout.

- Layout: a Margin option (px, 0 by default), room left clear all round the whole area, like the gap at its edges. A commander's picture gets it (clear, so the dashboard's background shows, and its tap zones follow); so does the Tablet Layout (in its Tablet layout dialog; edit mode keeps Home Assistant's own spacing instead).

## 2026.10.3-b24

- New app option, Developer mode (Configuration tab, with the feature switches): it shows the debugging aids in the Casa Mia panel, the Settings page's developer options and a commander's Debug options on the Camera Dashboard page. Off, the tablets get none of the Settings page's aids, whatever is saved there.
- Settings: the Tablet view's aids are now plainly a developer option, Tablet view debugging, with a warning that they show on every Tablet view until switched off.

## 2026.10.3-b23

- New Settings page (the cog by the house photo's pencil) for settings with no other home. First, the Tablet view's setup aids, for every Tablet view: Identify sections panels (an outline round each panel, its CSS editable, `1px solid red` by default) and Show the view size (the size label, now see-through so what is under it shows). The integration hands them to the cards (needs a Home Assistant restart after this update); a tablet picks up a change at its next view change or reload. A view's own `debug: true` still turns both on.

## 2026.10.3-b22

- New page, Kiosk mode: kiosk-mode's settings for each dashboard without the YAML. The dashboards with kiosk mode are listed (add one, or remove it); each opens as a grid of kiosk-mode's options (hide the header, the sidebar, menus, more-info parts and more, in groups) by who they apply to: everyone, non-admins, admins, and columns of named users. Anything else (mobile settings, entity settings, templates) goes in a YAML box that takes kiosk-mode's README examples as they are, and is checked as YAML before it can be saved. The page says when kiosk-mode itself is not installed, and which dashboards it cannot apply to (those Home Assistant makes, and YAML dashboards).

## 2026.10.3-b21

- Tablet view: a settings dialog for its layout (the Tablet layout button in edit mode): a live map of the screen with each panel where it lands, the panel or the middle picked on it, and the options with their help (the same as the Commander's), `size: auto` included; the view behind follows as they change. Cancel puts it back; Save writes the view's `layout:`. In edit mode each panel is named, and the panel sections it adds start empty.

## 2026.10.3-b20

- Tablet view: edit mode has Home Assistant's own spacing again (around and between the panels), with the panels in proportion across the width.
- Tablet view: a top or bottom panel can be `size: auto`, as tall as its cards (and following them as they show or hide).

## 2026.10.3-b19

- Tablet view: its sections are its panels (main, left, top, right, bottom), placed by the layout engine from the view's `layout:` options; edit mode adds any missing, and sections can no longer be added or moved there (cards still move between them). A panel hides when no card that counts is showing (as the Section card), and a panel with one such card is filled by it (a Camera Commander there fills the panel). In edit mode the panels grow to their editors and the view scrolls. `debug: true` also outlines each section in red.

## 2026.10.3-b18

- Tablet view (first step): a new dashboard view type, `custom:casa-mia-tablet-view`. It is Home Assistant's Sections view locked to the screen below the header, so the page never scrolls, Safari's toolbars included; in edit mode it scrolls inside itself. `debug: true` shows its size.

## 2026.10.3-b17

- Cards: alone in a Panel view, the Camera Commander and the Tablet layout are given the whole space (from the sidebar's edge to the screen's right, from the header's foot to the screen's bottom) and only fill it. A Commander card is always the full width of its space. On a phone it could come out narrower, when its shape was capped to fit the screen's height.
- Camera Commander card: its debug figures now show how it is sizing itself (screen, tile, column or preview), what holds it, and the space it has.

## 2026.10.3-b16

- Cards: if the Casa Mia cards fail to load with a page (seen once on a wall tablet, which then showed red errors until reloaded), the page loads them once more after 5 seconds, and HA replaces the errors with the cards. Each failure writes a "CASA-MIA CARDS" line to the browser console with its reason. This needs the "Keep camera pictures live" helper on, which it is by default.

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
