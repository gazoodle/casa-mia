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

- A wall tablet's Camera Commander showed its main camera as **"(live)"** over a picture
  frozen for over 50 minutes. The stream had delivered a few seconds and stopped; the
  WebRTC connection stayed "connected", so the card never noticed.
- Behind it, after a Home Assistant restart, the camera recorder refused most cameras'
  medium channels (the ones the tablets play live). HA logged hundreds of stream errors;
  nothing surfaced them. The card's own live failures went only to the browser's console,
  which nobody sees on a wall tablet.
- Separately, a Sensor Watch Save hung with no message: another window (a camera card
  retrying dead cameras) held all the browser's connections to HA, so the Save waited in
  the queue.

## Steps

### Step 1: the Commander's "(live)" tells the truth (2026.10.11-b11)

- **What:** "(live)" only while frames arrive; when they stop, **"Live lost {time} ago"**
  in red, counting up; "(live)" again when they return.
- **How:** live is worked out, never stored: a frame presented within `LIVE_LEASE_MS`
  (5 s), recorded only by the browser's `requestVideoFrameCallback`. A once-a-second beat,
  tied to the card's time on the page, redraws the caption (`commander/card.ts`;
  `liveClaim` in `common.ts`; `live.test.ts`). A stall can't be simulated honestly, so the
  guarantee is the construction.
- **Seen on the tablet (2026-10-12): failed.** go2rtc handed over one stale frame before
  the beat had attached its frame counting, so no frame was counted, and "no frame yet"
  was a third state that said nothing and could last for ever.

### Step 2: no state a stall can stay in (2026.10.11-b11)

- **What:** a session that never shows a frame, or shows one and stops, says "Live lost …
  ago" too, counted from its start.
- **How:** `liveClaim(startedAt, frameAt, now)`: live only on a frame within the lease;
  with no frame, a lease's grace from the start, then lost since the start; with no start,
  lost. Frame counting attaches when the session starts (`watch()` from `followLive`).
- **Seen on the tablet (2026-10-12): passed.** The frozen camera reads "Live lost … ago"
  in red, counting up.

## Findings (investigation, not fixes)

- **Nothing in Casa Mia knew** about the stuck camera: the compositor was "fine" (its own
  channels worked; it never sees the tablet's live stream, and its warm-up dropped every
  refusal unlogged); the Commander told only its own screen; Sensor Watch watched no
  cameras. HA's entities said `unavailable`, and nobody was told.
- **Two parts saw the same fact and neither said it:** the Cameras page's live view left
  out a channel with no access token without a word; the Commander card was given all
  three channels with no word of their availability, and played the dead medium one.
- **Sensor Watch scored:** a group of every camera (Available) listed the 31 dead
  channels at once. Its 0 hold-off is the owner's, for testing; its level is to be
  revisited.
- **The cause:** HA 2026.10.0's stream component (FFmpeg 9) checks TLS certificates, and
  the recorder's `rtsps` certificate is self-signed, so every stream HA opens itself fails
  and its camera entity flaps unavailable (core #184775, fixed in 2026.10.1). Only channels
  HA streams itself flapped (the compositor's medium warm-up, the advanced-camera-card's
  cameras); go2rtc kept giving frames. The box has since moved past it.
- **It took an evening to find**, by hand, across the recorder's history, logbook,
  registry, both logs, the tablet over adb, Kiosk Satellite's API and upstream issues.
  None of it was gathered anywhere.

## Ideas (not plans)

None is a step until it's chosen as the next one.

- **The goal (the owner, 2026-10-12):** anyone using Casa Mia knows at once that a stream
  has a problem, and that we tried to fix it and failed. The evidence is gathered and
  summarised in one place, because users can't chase this down and nobody should
  rediscover it: each channel's state history, the errors HA logged for it, what Casa Mia
  tried and what came of it, what changed just before (an update), and known upstream
  issues.
- **The camera ladder: always degrade, never die** (agreed with the owner, 2026-10-12).
  The best picture however we can, best first:
  1. Live, the channel that fits the main area best (WebRTC).
  2. Live, another channel, down the resolutions. A channel HA says is unavailable is
     never chosen; one that stalls loses its lease and is marked bad, a mark that itself
     lapses so it is tried again later.
  3. The compositor's drawn picture from streams, from any channel still giving frames.
  4. The compositor from snapshots, from any channel that answers.
  5. The last picture we have, static, with a 2 px blur on the picture (not the pills).
  6. Never had a picture: blank, the only time it is.
  Every rung is a lease. The status is a row of pills, one fact each: the rung (HIGH),
  (MED), (LOW), (STATIC); a time, e.g. (19:32) for a static picture; a problem, e.g.
  (LIVE LOST 4 MIN AGO), (STALE). Tiles follow the same ladder (never live), with a small
  (!) for a problem; a tile chosen as main shows its pills in full.
- **Escalation, and acting on it** (discussed 2026-10-12). Sensor Watch watches and
  escalates but doesn't act. Escalation times on a profile are built (2026.10.11-b15).
  Still ideas:
  - **An Escalation handler blueprint:** choose a watch or group; actions for each level
    and for recovery (reload an integration, restart a device, call a script, press a
    button), `mode: queued`, so when the first reload fixes them all the rest find them
    back.
  - **Remedy tools from the applets:** the Cameras applet offers what helps a camera
    recover, for any provider (reload its integration, restart the device, re-open its
    stream).
  - **The record** is HA's own logbook and history, enriched where we can ("Barn medium:
    warning, unavailable for 15 min"). The owner is the last resort.
- The drawn picture (MJPEG) frozen without a sign: the same lease, renewed by frames
  arriving.
- Live failures said on screen and to the app's log, not only the browser's console.
- Casa Mia pages: no request waits for ever; Save says "Not saved" and keeps the edits.
- The compositor's stream warm-up reports its failures instead of dropping them.
- Sensor Watch watching Casa Mia's own parts (the compositor's health), so a stuck system
  raises a notification.
