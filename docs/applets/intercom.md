# Intercom

A call for each doorbell, shared by every screen in the house, so only one person talks to
the door at a time.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

## What it's for

With several tablets and phones able to talk to the front door, two people can answer at
once, and a tablet left answering keeps the door's speaker live. The intercom gives each
doorbell one call that every screen agrees on: whoever talks first answers it, everyone
else can still watch and listen but not talk, and the call ends by itself when the
answering device goes quiet.

It runs in Home Assistant, as the Casa Mia Intercom integration, so it holds for every
way of talking: the [Camera Commander](camera-commander.md) card, the Talk tile and Home
Assistant's own Talk button. A rule that only the cards followed would be ignored by the
others.

A doorbell is any device in Home Assistant with a doorbell event entity and a camera
entity, such as a UniFi Protect doorbell. The camera must be able to talk; for UniFi
Protect cameras that needs [UniFi Protect talkback](protect-talkback.md) for now.

## Switching it on

1. Turn on **Intercom** in Settings → Apps → Casa Mia → Configuration, save, and restart
   the app.
2. Casa Mia offers **Casa Mia Intercom** under Settings → Devices & services → Discovered.
   Add it; it has no settings.

Turning the option off removes the doorbells' call devices and their entities.

## In Home Assistant

Each doorbell gets a device of its own, named after it, with:

- **Call**, a sensor: **Idle**, **Ringing**, **Answered** or **Complete**. A ring that
  nobody answers for a minute completes as **Missed**; a call that ends shows **Complete**
  for 10 seconds, then **Idle**. Its attributes say who answered, how it ended, the
  duplex, whether Hold to talk is held, the camera entities it belongs to, and when it
  will hang up (`ends_at`).
- **End call**, a button that hangs up whichever device answered, from anywhere.

Talking into the doorbell's camera (a WebRTC connection that sends a microphone) answers
the call for that Home Assistant user. While it's answered, another user's microphone is
refused, though they keep the video and the visitor's voice. The same user may take the
call over from a newer page of their own. Give each tablet its own Home Assistant user so
the call says which one answered.

### When the call hangs up

The call ends when the answering page closes or loses its connection, when End call is
pressed, or when its timer runs out:

- **Full duplex** (open microphone): 10 minutes, started again by a touch anywhere on the
  answering page.
- **Half duplex** (hold to talk): 2 minutes after the last Hold to talk. The timer stops
  while the button is held, but one hold counts for at most 2 minutes, so a finger resting
  on the screen can't keep the call open.

Only the user who answered can keep the call alive; a ring while answered changes
nothing. The cards tell the integration through the `casa_mia_intercom/call` websocket
command, with one of these each time:

```json
{"type": "casa_mia_intercom/call", "entity_id": "sensor.front_door_call", "duplex": "half"}
{"type": "casa_mia_intercom/call", "entity_id": "sensor.front_door_call", "held": true}
{"type": "casa_mia_intercom/call", "entity_id": "sensor.front_door_call", "touched": true}
```

It's refused with `not_answered_here` from anyone but the user who answered,
`not_half_duplex` or `not_full_duplex` for the wrong duplex, and `not_found` for an
unknown sensor. Every device shows the countdown from the sensor's `ends_at`, so nothing
is sent each second.

## Troubleshooting

The integration logs to Home Assistant's log, under `casa_mia_intercom`: each doorbell it
found and where its rings come from, each call change (state, who answered, duplex, when
it ends), and each refused microphone.

- **No call devices.** Check the app option, and that the doorbell has an enabled event
  entity of the doorbell class and a camera entity on the same device. The log says
  "Calls for no doorbells" when it found none.
- **"Doorbell calls are unavailable" in Repairs.** The integration couldn't patch Home
  Assistant's WebRTC path (usually after a Home Assistant update), so calls aren't kept.
  The reason is in the Repair and the log. Cameras keep working.
- **Talk is refused on one device.** Another user has answered: the Call sensor says who.
  Press End call to take it back.
