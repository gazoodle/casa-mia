# Never silently stuck

The rule: **nothing on screen looks live, or working, unless it is.** When something
stops, the screen says so, and for how long.

How we get there: one step at a time. Each step is written here before it starts, done,
then recorded here with what changed and what was seen. A step that's done is never done
again; a change to it is a new step. Nothing beyond the current step is planned.

How each step is built: by construction, not by catching failures. A claim of "live" is a
lease that lapses by itself; only proof that it is working (a frame on screen, an answer
received) renews it. Any failure, foreseen or not, stops the renewing, so the claim
lapses. No flag that says "live" is ever stored, so nothing can leave one set.

## What started it (2026-10-12)

- A wall tablet's Camera Commander showed its main camera as **"(live)"** with the
  picture frozen for over 50 minutes; the camera's own clock in the frame said so. The
  live stream had started, delivered a few seconds, and stopped. The WebRTC connection
  stayed "connected", so the card never noticed.
- Behind it: after a Home Assistant restart, the camera recorder refused most cameras'
  medium channels (the ones the tablets play live). Home Assistant logged hundreds of
  stream errors; nothing surfaced them.
- The card's earlier live failures that day went only to the browser's console, which
  nobody sees on a wall tablet.
- Separately, a Sensor Watch Save hung with no message: the browser's connections to Home
  Assistant were all held by another window (a camera card retrying dead cameras), so the
  Save waited in the browser's queue. Refreshing the other window let it through.

## Steps

### Step 1: the Commander's "(live)" tells the truth

- **What:** the live main camera's caption shows "(live)" only while frames are arriving.
  When they stop, it reads **"Live lost {time} ago"** in red, counting up. When frames
  come back, "(live)" returns. Nothing else changes.
- **How (by construction):** live is worked out, never stored: a frame shown on screen
  within the last few seconds. The only thing that records a frame is the browser's
  callback for each frame actually presented (`requestVideoFrameCallback`). A tick tied
  to the card's time on screen redraws the caption from that time.
- **Status:** built in 2026.10.11-b11 and copied to the box (cards only); waiting to be
  seen on the test tablet.
- **What changed:** `integration/cards/src/commander/card.ts`: the caption is drawn from
  `frameAt`, the time the browser last put one of the live video's frames on screen
  (`requestVideoFrameCallback`); a once-a-second beat, started when the card joins the
  page and stopped when it leaves, redraws it and attaches the frame counting to whichever
  `<video>` is there now. `common.ts`: `LIVE_LEASE_MS` (5 s) and `liveClaim`, which turns
  `frameAt` into live, lost ("12 s"), or nothing before the first frame. The old
  `_playing` flag no longer touches the caption (it still fades the video in).
- **Checked:** the claim's arithmetic (`live.test.ts`, in the cards' `npm test`); the
  stall itself can't be simulated honestly, so the guarantee is the construction: a
  browser without the per-frame callback, or a stream that stalls anywhere, renews
  nothing, and the caption lapses.
- **Seen on the tablet (2026-10-12, after Reload and Clear Cache):** failed. The main
  camera showed the same frozen 19:32:47 frame captioned with just the camera's name: no "(live)",
  but no "Live lost" either. The console had no live failure, so the session had
  "started": go2rtc handed over one stale frame from the dead source, before the card's
  first beat had attached its frame counting, so no frame was ever counted, and "no frame
  yet" was a third state that said nothing. A stall could stay in it for ever, against
  the rule (the default must be "not working"). Fixed in step 2.

### Step 2: no state a stall can stay in

- **What:** a live session that never shows a frame, or shows one and stops, says "Live
  lost … ago" too, counted from its start. Nothing else changes.
- **How (by construction):** `liveClaim(startedAt, frameAt, now)`: live only on a frame
  within the lease; with no frame, nothing for the lease's length from the start (a
  stream takes a moment), then lost since the start; with no start known, lost. Frame
  counting is attached when the session starts (`watch()` from `followLive`), so its
  first frame is counted; the beat still re-attaches to a replaced `<video>`, as a new
  start.
- **Status:** built in 2026.10.11-b11 and copied to the box (cards only); waiting to be
  seen on the test tablet.
- **Checked:** `live.test.ts`: recent frame live, old frame lost, no frame a moment's
  grace then lost since the start, no start and no frame lost.
- **Seen on the tablet (2026-10-12):** passed. The frozen main camera now reads "Live
  lost … ago" in red, counting up. The problem is clear on the tablet, at the tablet.

## Findings (investigation, not fixes)

What Casa Mia made of the stuck camera, 2026-10-12, with the tablet showing "Live lost":

- **The compositor:** health "fine", nothing sitting out. True of the drawn picture,
  whose channels still work; it never sees the tablet's live main camera (Home Assistant
  to the tablet directly), and its stream warm-up drops every refusal unlogged.
- **The Commander (app and integration):** nothing. The card tells only its own screen.
- **Sensor Watch:** watches 263 entities, no cameras. 23 medium and 8 low camera channels
  were unavailable, the stuck camera's medium channel among them; it didn't know.
- **Home Assistant:** the entities said `unavailable` and its log held hundreds of stream
  errors; nobody was told.
- **The camera's medium channel** is enabled, on the same device as its low and high
  channels, and unavailable. Its entity id doesn't follow its siblings' pattern (created
  later), so the camera was likely re-adopted or renamed in the recorder at some point.
- **Two parts see the same fact and neither says it:** the Cameras page's live view
  leaves out a channel with no access token (an unavailable camera has none), so it lists
  low and high with no word about medium; the Commander card is given all three channels
  with no word of their availability and plays medium, which fits the main area best.

- **Sensor Watch scored (2026-10-12):** a group of every camera (domain camera,
  following "Available (a task after an hour)") took 88 cameras; the 31 dead channels,
  the stuck camera's medium among them, were listed at once. Casa Mia now knows.
- **To visit later:** the level the dead cameras count at (task, from that profile). Its
  hold-off of 0 (the name says an hour) was the owner's, for testing.

- **The cause, found (2026-10-12):** since Home Assistant 2026.10.0 (installed 10 Oct,
  08:10 UTC) its stream component uses FFmpeg 9, which checks TLS certificates by default;
  the recorder's `rtsps` certificate is self-signed, so every stream Home Assistant opens
  itself fails ("Error opening stream (I/O error, rtsps://…)") and the camera entity flips
  unavailable for a moment, then retries with a back-off growing 10 s at a time. Known
  upstream: core issues #184775 and #185433; fixed in 2026.10.1 (PRs #184877, #184930:
  TLS check skipped for UniFi Protect, a `verify_ssl` option added). 2026.10.1 has an open
  issue of its own (#185706: snapshots fail with HTTP 503, cameras unavailable; maybe
  Protect rate-limiting), which matters to the compositor's snapshots.
- **Only channels Home Assistant is asked to stream itself flap:** 21 of 23 medium
  channels first flapped in the same minute after the update (the compositor's warm-up
  asks Home Assistant for their HLS every 90 s); the 8 dead low channels are exactly the
  advanced-camera-card's cameras played through Home Assistant. High channels, and
  channels read only through go2rtc, never flapped; go2rtc still gave frames.
- **It took an evening to find,** by hand: the recorder's history API, logbook, entity
  registry, the app's and Home Assistant's logs, the tablet over adb and Kiosk Satellite's
  API, and upstream issues. None of it was gathered or summarised anywhere.
- **The box stays on 2026.10.0 for now,** on purpose: a live fault to test against.

## Ideas (not plans)

Written down so they aren't lost; none is a step until it's chosen as the next one.

- **The goal this points at (the owner, 2026-10-12):** anyone using Casa Mia knows at
  once that one of their streams has a problem, and that we tried to fix it and failed.
  The evidence is gathered and summarised *somewhere*, *somehow*, because (a) users don't
  have the skills to chase this down and (b) nobody should have to rediscover it: the next
  time, go straight to it. What this evening's chase needed in one place: each channel's
  state history (when it first failed, how it flaps), the errors Home Assistant logged for
  it, what Casa Mia tried and what came of it, what changed just before (an update), and
  known upstream issues.

- **The camera ladder: always degrade, never die** (agreed with the owner, 2026-10-12).
  Get the best picture however we can, best first:
  1. Live, the channel that fits the main area best (WebRTC).
  2. Live, another channel: down the resolutions. A channel Home Assistant says is
     unavailable is never chosen; one that stalls loses its lease and is marked bad, a
     mark that itself lapses so it is tried again later.
  3. The compositor's drawn picture from streams (its low frame rate), from any channel
     still giving frames, high included.
  4. The compositor from snapshots, from any channel that answers.
  5. The last picture we have, static, with a 2 px blur on the picture (not on the pills).
  6. Never had a picture: blank, the only time it is.
  Every rung is a lease. The status is a row of separate pills, each one fact: the
  resolution or rung (HIGH), (MED), (LOW), (STATIC); a time, e.g. (19:32) for when a
  static picture was taken; a problem, e.g. (LIVE LOST 4 MIN AGO), (STALE). So the same
  view on two devices (the Mac plays high, a tablet medium) never puzzles.
- **Escalation, and acting on it** (discussed with the owner, 2026-10-12). Sensor Watch
  watches and escalates; it doesn't act, and it is the only one that can know when to
  escalate. The parts:
  - **Escalation times on a profile** (any profile, nothing camera-specific): e.g. task
    after 5 minutes (time to settle), then warning, error and critical after further
    times. The level is worked out from how long the watch has been bad, never stored;
    recovery resets it. This is the backlog's Escalation item, with its algorithm.
  - **An Escalation handler blueprint**, generic: choose a watch (or a group); give
    actions for reaching each level (task, warning, error, critical) and for recovery.
    Boilerplate actions: reload an integration, restart a device, call a script, run an
    action, press a button. Runs one at a time (`mode: queued`), so when the first
    reload fixes them all, the rest find them back.
  - **Remedy tools from the applets**: the Cameras applet (through the commander
    integration, probably) offers what helps a camera recover, for any provider (reload
    its integration, restart it through whatever restart the device offers, re-open its
    stream). The camera itself may be the fault, not the provider.
  - **The record** is Home Assistant's own logbook and history, enriched where we can
    ("Barn medium: warning, unavailable for 15 min").
  - The owner is the last resort; that's what Sensor Watch is for.
- **Tiles follow the same ladder** for getting their picture (they are never live on the
  device); with no room for pills, a small (!) or warning triangle shows a problem. A tile
  chosen as the main camera shows its pills in full.

- The drawn picture (MJPEG) frozen without a sign: the same lease, renewed by frames
  arriving.
- Live failures said on screen and to the app's log, not only to the browser's console.
- Casa Mia pages: no request waits forever; Save says "Not saved" and keeps the edits.
- The compositor's stream warm-up: report its failures instead of dropping them.
- Sensor Watch watching Casa Mia's own parts (the compositor's health, camera
  availability), so a stuck system raises a notification.
