# Camera Commander: detections and their clips

Specified 2026-11-27 with the owner; not built. This is the plan to build from. Where it
says "decided", the owner decided it; don't reopen it. Where it says "not known", stop and
ask instead of guessing.

## What it is

Two things on the Commander card's main camera:

1. **A detection chip** beside the main camera's name while its camera reports something
   (a person, a vehicle with its number plate, an animal, a package, a doorbell ring, a
   sound). It goes a short while after the detection.
2. **A clips dialog** for the main camera: thumbnails of its recorded detections, newest
   first, a day at a time, each playing its clip in place. It opens from the detection
   chip, and from the main camera's name, which is how it is reached when nothing is
   being detected (decided).

It is for UniFi Protect, the only camera system the owner has. The chip works from Home
Assistant's event entities, whatever made them. The dialog needs a media source, and only
Protect's is handled; a camera without one has no dialog and its name takes no press.

**Not in this work:** choosing the main camera by kind of detection (BACKLOG, "every
detection a camera has"), anything on the tiles (the motion dot stays as it is), a
timeline strip, an "all cameras" view, face names (Home Assistant doesn't have them), and
other brands' media sources.

## Rules for whoever builds it

- **Public surfaces only.** The card uses `hass.states`, and the websocket commands
  `media_source/browse_media`, `media_source/resolve_media` and `auth/sign_path`. No
  Python of ours imports `homeassistant.components.unifiprotect` or touches its
  `runtime_data`. Why: Dash-Bored did that for thumbnails and it was taken out in
  2026.11.12-b25 after review (the comment in `casa_mia_dash_bored/image.py`).
- **No polls, no timers that fetch** (RULE FOUR). The chip follows `hass.states`, which
  Home Assistant pushes. The dialog fetches when it is opened and when the user asks for
  more. The only timer is the one that takes a lingering chip away, as `Motion` has.
- **Sizes are fixed CSS px.** The chip is the style guide's `cm-chip` through
  `integration/cards/src/pills.ts`. Thumbnails are one fixed size. Nothing is worked out
  from the place it is in.
- **No browser controls:** the dialog is a native `<dialog>` as Dash-Bored's is
  (`dash-bored/clipping.ts`), with the shared chrome's look. No `alert`, `confirm`,
  `prompt` or `<select>`. A native `<video controls>` is allowed: it is the player.
- **Nothing fails silently.** Every fetch that fails is said in the dialog, with the
  reason, and logged with `console.warn`. An empty list says it is empty; it never stands
  for a failure.
- **No real data** in code, tests, fixtures or the changelog: invented camera names, and
  plates such as `AB12 CDE` only if plainly made up.
- The usual: RULE ZERO (bump first, one build per step below), tokensave for exploring,
  files under the limit (new files, don't grow `card.ts`, which is at 508 lines), British
  English, `tools/build_cards` after source changes, `tools/component_versions.py
  --update`, and the changelog lines.
- **Stop after each step** and tell the owner what to look at on the box. The test VM has
  stand-in cameras and no Protect, so nothing here can be seen working there; say so, and
  don't report a step as seen working.

## What was measured (2026-11-27, read-only, Home Assistant 2026.11.3 with real Protect consoles)

Event entities (domain `event`, platform `unifiprotect`, on the camera's device):

| Registry `translation_key` | `event_type` values seen or in the source | Extra attributes |
|---|---|---|
| `smart_detection` | `person`, `vehicle`, `animal`, `license_plate`, `face`, `package`, and any new kind as a snake_case word | `event_id` |
| `vehicle` | `detected` | `event_id`, `license_plate` (not always), `confidence`, `attributes` (colour, vehicle type) |
| `package` | `detected` | `event_id` |
| `sound_detection` | `smoke`, `co`, `siren`, `baby_cry`, `speaking`, `bark`, `car_alarm`, `car_horn`, `glass_break` | `event_id` |
| `motion_detection` | `motion` | `event_id` |
| `doorbell` | `ring` | `event_id` |
| `nfc` | `scanned` | `full_name`, `nfc_id` |
| `fingerprint` | `identified`, `not_identified` | `full_name` |

- An event entity's state is the time it last fired. It has no "on": a detection is
  current for a while after that time, and no longer.
- `event_id` is in the live state and **not** in recorded history, so history can't lead
  to thumbnails or clips. Don't use history for this.
- `face` fires with no name. Don't show or invent one.

The media library (`media-source://unifiprotect`):

- The root's children are the consoles (`<nvr>:browse`); a console's children are an
  "all cameras" folder (`<nvr>:browse:all`) and one folder per camera
  (`<nvr>:browse:<protect camera id>`). With one console the root may give the cameras
  straight away: handle a root child that isn't a console. Not seen.
- A camera folder's `thumbnail` is `/api/camera_proxy/<camera entity id>…`: that entity
  id is the only public link from a folder to Home Assistant's camera.
- Kinds are folders under the camera: `smart` (objects), `ring`, `audio`, `motion`, `all`.
- `<camera folder>:<kind>:range:<year>:<month>:<day>` (numbers unpadded) lists that day,
  **oldest first**. `…:recent:<days>` lists newest first for any number of days.
- Each item: `media_content_id` (`…:<nvr>:event:<event id>`), `thumbnail`
  (`/api/unifiprotect/thumbnail/<nvr>/<event id>?width=185&height=185`, unsigned),
  `can_play`, and a title of the form `<date> <time> <length> <what>`, where `<what>` is
  `Ring Event`, `Motion Event`, `Object Detection - <names>` or `Audio Detection -
  <names>`. `<names>` is such as `Person`, `Vehicle` or `Black Suv: AB12 CDE`. The date
  and time are in the server's locale: never parse them.
- An event still going on is not listed.
- A camera's object detections for a day came back in 0.05 to 0.3 s.
- **The limit.** Protect's integration asks the console for at most its "max media"
  option (1,000 unless changed) events in the span and kind asked for, across all the
  console's cameras, and only then keeps the one camera's. A busy console passed 1,000
  events of all kinds in 24 hours; its object detections alone were about 500 a day.
  Hence: one kind and one day per fetch (decided), never the `all` kind.
- A thumbnail is a 360 × 360 JPEG of about 56 kB, cropped on what was detected, back in
  0.05 to 0.2 s. The address signed by `auth/sign_path` loads with no login, so it works
  in an `<img>`.
- `media_source/resolve_media` on an item gives a signed `/api/unifiprotect/video/…`
  address, `video/mp4`. One clip was about 17 MB, first byte after 0.7 s. The server
  ignores `Range` (answers 200 with the whole file). **Not known:** whether Safari, the
  iOS app or the wall tablets' WebView play it from that address.

## Step 1: the integration tells the card each camera's event entities

**Built in 2026.11.14-b22.** The tracker turned out to be refreshed only at the app's
reports, not on registry changes; its `refresh` now runs on Home Assistant's entity
registry events too (event and binary sensor entities), and the select redraws when
what it found changes (`MotionTracker.found`).

File: `integration/custom_components/casa_mia_commander/select.py`, with the finding in a
new small module beside `motion.py` (read how `tracker` finds motion sensors and is kept
current on registry changes, and do the same; don't add a second mechanism).

- The Main camera select gains an attribute `detections`:
  `{<camera entity id>: {<event entity id>: <translation_key or "">}}`, for every enabled
  `event` entity on the same device as the camera, any platform. Add `"detections"` to
  `_unrecorded_attributes`.
- A camera with none has no key. No Protect-specific code here: it is the entity
  registry only.
- Tests in `tests_ha`: a device with a camera and two event entities gives both; a
  disabled one is left out; an event entity added later appears without a reload.

## Step 2: the detection chip

**Built in 2026.11.14-b24, with one change (owner, 2026-11-27):** the card's name could
not cover the picture's exactly (Pillow and a browser set text differently, and two
backgrounds at 55% show where they differ), so the picture leaves the main camera's name
and clock out when the card asks (`?main=card`, read by `asked_size` as `Size[5]`; `main`
was already passed by the integration's proxy), and the card always draws the name, with
the clock (`caption-clock.ts`) while the main camera isn't live video. The caption is now
drawn over the tap zones and outside the Security look's filter, so its chips take the
pointer. It also ended the name drawn twice while live was lost.

New file `integration/cards/src/commander/detect.ts` (pure, with `detect.test.ts`), used
from `card.ts` and `full.ts` where the main camera's caption is drawn.

- `KINDS`: one table, `event_type` → `{ icon, label, tone }`, for the values in the table
  above. `detected` takes its kind from the entity's key (`vehicle`, `package`). An
  `event_type` not in the table is shown with a generic icon and the word itself with
  `_` as spaces: never dropped. `motion` is left out: the motion dot already says it.
- `detected(hass, entities, linger, now)` → the detections to show for one camera, each
  `{ kind, text, since }`, newest first. One is current while `now - state time <
  linger`. `text` is the label, or the plate when `license_plate` is there, or
  `full_name` for a fingerprint or NFC event. Two entities reporting the same `event_id`
  are one detection, and the one with a plate wins.
- `linger` is the card's existing `motion_linger` option (10 s). No new option.
- A class like `Motion` owns the timer that redraws when the next chip is due to go, and
  is stopped where `motion.stop()` is.
- Drawn as `cm-chip`s in the main camera's caption, after the name, at most three, then
  `+n`. Its tooltip says what and since when, as the dot's does.
- **The main camera's name.** Today the compositor draws it in the picture and the card
  draws `.caption` (in `live.ts`) over it only while live. From this step the card draws
  the caption whenever the commander's `main_style` is not `none`, in the same place, so
  the chips have somewhere to sit and step 3 has something to press. Check on the box
  that the card's name covers the picture's exactly at each `main_style`; if it can't,
  stop and ask (the alternative is the compositor leaving the main name out, which is a
  change to the app).
- With `main_style: none` there is no name: the chips are drawn alone in the caption's
  place.
- Tests: the table's kinds, an unknown kind, a plate, lingering and going, the same
  `event_id` twice, no entities.

## Step 3: the clips dialog

**Built in 2026.11.14-b27.** Two things the plan didn't say, decided in building it: the
name and chips are offered only for a camera whose entity is `unifiprotect`'s (so a house
without Protect never browses its media library), and until the folders are known, or
while the lookup has failed, they are offered, the dialog saying the failure and looking
again. For a camera with no folder, a chip passes its press to the main picture's tap, as
the motion dot does. Thumbnails are signed for a day (`auth/sign_path` gives 30 s
unless asked), as Home Assistant signs a resolved clip, so lazily loaded ones still load.

New files `integration/cards/src/commander/clips.ts` (the fetching, pure but for
`hass.callWS`, with `clips.test.ts` against a mocked `callWS`) and `clips-dialog.ts` (a
Lit element holding the `<dialog>`).

**Opening.** A press on the main camera's name or on a detection chip opens it for the
main camera. Both get their own tap area: a press there must not also be the main
picture's tap (`this.open`). Extend `tests/test_commander_tap_areas.py` to the name and
chips. When the camera has no folder (below), the name and chips take no press and the
main picture's tap is unchanged.

**Finding the camera's folder** (`folderOf`): browse the root, then each console, once
per page load, and keep `{device id: camera folder id}` by reading the entity id out of
each folder's `thumbnail` and looking up its device in `hass.entities`. The commander's
camera may be another channel of the same camera, so match on the device, never on the
entity id or the name. A failure is not kept: the next opening tries again.

**The list.**

- Kind chips along the top, one chosen at a time (decided: no merged list, since items
  carry no time that can be sorted on): **Detections** (`smart`, the default),
  **Doorbell** (`ring`, only when the camera has a `doorbell` event entity), **Sounds**
  (`audio`), **Motion** (`motion`).
- Fetch today's day folder for the kind, reverse it (it comes oldest first), and show it
  under the day's date as a heading. "Today" is the date in `hass.config.time_zone`, not
  the browser's.
- A button **Earlier** at the foot fetches the day before and adds it under its own
  heading. No scrolling that fetches by itself. **Replaced in b30** (owner, 2026-11-27,
  below): the end of the list fetches by itself.
- Each item is a tile: the thumbnail at a fixed 120 × 120 CSS px, and under it the
  title's `<what>` with its `Object Detection - ` or `Audio Detection - ` removed, and
  the rest of the title (date, time, length) as Protect wrote it. The kind's icon from
  `KINDS` when `<what>` starts with a known label; otherwise none. A test holds the
  title forms above, so a change in Protect's wording fails a test and not the user.
- Thumbnails: sign each address with `auth/sign_path` when its day is fetched, and use
  `<img loading="lazy">`. A thumbnail that fails shows the kind's icon in its place.
- A day with no items says "Nothing recorded" under its heading.
- **The limit, said:** after showing a day, browse the console's `all` cameras folder for
  the same kind and day, once; when its title contains `TRUNCATED`, show a callout: the
  console had more events that day than Protect's integration lists (its "max media"
  option), so this list may be incomplete. This check failing is logged, not shown.

**Playing.** A press on a tile resolves it and plays it in a `<video controls autoplay
playsinline>` at the top of the dialog, the list staying below.

- While waiting, the tile says it is loading.
- On the video's `error` event, fall back once: fetch the address, show how much has
  arrived, and play it from a blob address, revoked when another clip is chosen or the
  dialog closes (`try/finally` or the element's `disconnectedCallback`).
- If that fails too, say so in the dialog with the reason.
- Closing the dialog stops the video and aborts any fetch (`AbortController`).

**Tests:** `folderOf` by device across two consoles and with a camera on another channel;
a day reversed; Earlier adding a day; the title forms; a browse that fails shown and not
kept; the truncation callout; no folder, no press.

## After use on the box (owner, 2026-11-27; built in 2026.11.14-b30)

- **Guests don't get the recordings.** `isGuest` (`guest-goodbye.ts`, by the guest-login
  endpoints' Access switches, as the goodbye reads them; never an administrator; until
  the user and entities are known, a guest) turns the name's and chips' press into the
  main picture's. The card's limit only: Home Assistant has no permission on its media
  library, so its own Media browser still serves any signed-in user.
- **A chip says there is something to watch.** While no detection is current, a muted
  chip at rest shows the latest detection (motion left out) and when, in Home
  Assistant's time zone (`clips.ts: whenSaid`), or "Recordings" with none known. From
  the event entities' pushed states, so nothing is fetched. A count ("14 today") was
  turned down: it needs a list fetched per camera, and is cut short on a busy day. Every
  chip opens the dialog on its kind (`KINDS` `shelf`).
- **A restart loses Protect's times (found on the box 2026-11-27, fixed in b35).** Home
  Assistant restores an event entity's time from the state it saved as it stopped.
  Protect's entities fed by its events websocket (ring, smart detection, motion, package,
  sound) go unavailable first, as that websocket closes, so they come back unknown with
  their event kept and no time; the vehicle, NFC and fingerprint entities keep theirs.
  The chip then named a day-old vehicle over people seen since. The integration's
  `fired.py` records each fire (time, event id, type) in HA's storage, and the select's
  `fired` attribute gives the card the time of each entity whose state has none, where its
  restored event is the one recorded (by event id; by type for a record from the
  recorder, which keeps no event id). An entity with no record is looked up once in the
  recorder. Fixed upstream in Home Assistant 2026.12.0 (core PR #192994: Protect closed
  its websocket before its state callbacks); `fired.py` goes once that is the oldest
  supported (backlog).
- **The dialog keeps one size**, the room: the screen less 16 px each side and clear of
  an iPhone's status bar, home bar and notch (`env(safe-area-inset-*)`; b35, where its
  header sat under the clock), up to 1280 px. The preview is at the camera's shape (the
  card's `shapeOf`, as `--shape`), so its picture fills it (Protect's thumbnail is a
  square crop, so the still before Play has bands at its sides). Landscape and at least
  700 px wide: the list (412 px) on the left, the preview on the right at its column's
  width, anchored to the top, and the dialog's height worked out from its width and
  shape, plus 150 px for the header and the lines under the picture, up to the room's.
  (b33: at the screen's height, a big monitor showed the picture between tall black
  bands; a height taken from its contents instead left it one header high on a Mac, not
  reproduced in Chromium or WebKit.) Otherwise the dialog fills the room's height too,
  the preview (at most 480 px tall, narrower and centred beyond that) above the list.
  The preview starts on the newest clip's picture, played at a press. Tiles (96 px,
  three across a phone) or rows, kept in this device's `localStorage`.
- **The list fetches by itself** (owner: "that's what happens when we use things live"),
  reversing "no scrolling that fetches by itself": the day before whenever the end of
  the list is within 300 px of view, one day at a time, until `EMPTY_STOP` (7) empty days
  in a row; then **Look further back**. A failed day stops it, with **Try again**. A run
  of empty days is one line.

## What the owner checks on the box

- Step 2: the card's name sits exactly over the picture's; a chip appears on a person
  and on a vehicle with its plate, and goes.
- Step 3: the list for a busy and a quiet camera; a clip plays on a Mac in Chrome, on a
  wall tablet, in Safari and in the iOS app (the fallback is for the last two); the
  dialog on a phone.

## Open, for the owner

- The words on screen: "Detections", "Doorbell", "Sounds", "Motion", "Look further back".
- ~~Whether guests' logins should be able to open the dialog.~~ Decided 2026-11-27: no
  (above).
