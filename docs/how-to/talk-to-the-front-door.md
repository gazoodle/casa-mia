# Talk to a UniFi Protect doorbell from Home Assistant

This guide takes you from a UniFi Protect doorbell that Home Assistant can only watch to
one you can answer from any tablet or phone, with only one person talking at a time. It
uses two Casa Mia modules: [UniFi Protect talkback](../applets/protect-talkback.md),
which lets Home Assistant talk through the doorbell, and the
[Intercom](../applets/intercom.md), which keeps one call per doorbell.

You need:

- The doorbell already in Home Assistant through its UniFi Protect integration, with its
  camera and its doorbell event entity.
- Home Assistant's own go2rtc (the default; not `go2rtc: url:`).
- An https address for Home Assistant on every device you'll talk from. Browsers only
  give a microphone to secure pages, so `http://homeassistant.local:8123` won't do.
- A Home Assistant user for each wall tablet, so the call can say which one answered.

## 1. Make an API key on the Protect console

On the console that records the doorbell (a UNVR or Cloud Key), open its UniFi settings
and create an API key just for Home Assistant's talkback. Keeping it separate means you
can revoke it without breaking anything else. If your cameras are spread over several
consoles, make one on each.

## 2. Switch the two modules on

In Settings → Apps → Casa Mia → Configuration, turn on **UniFi Protect talkback** and
**Intercom**, save, and restart the app. If Home Assistant asks for a restart under
Settings → Repairs, do it: that loads the two integrations the app has just installed.

## 3. Add UniFi Protect talkback

Under Settings → Devices & services → Discovered, add **Casa Mia Protect Talkback**.
Give it the console's address (as you'd type it in a browser, without `https://`) and the
API key, then tick the cameras that get talkback. Only the doorbells are ticked to start
with. Camera streams pause for a second or two while go2rtc restarts with the talk source.

Each further console is added with **Add entry** on the integration's page.

## 4. Add the Intercom

Still under Discovered, add **Casa Mia Intercom**. It has no settings: it finds every
device with a doorbell event and a camera, and gives each a device of its own with a
**Call** sensor and an **End call** button. Note the Call sensor's entity id (for example
`sensor.front_door_call`); the dashboards use it.

## 5. Try it from Home Assistant's own Talk button

Home Assistant's own Talk button is a Labs feature in 2026.11: turn it on under
Settings → System → Labs. Then open the doorbell's camera from its device page, on an
https address. The more-info dialog now has the Talk button. Press it, allow the
microphone, and speak: you should be heard at the door. The Call sensor goes to
**Answered**, and its **Answered by** attribute names your user.

While you're talking, open the same camera as a different user on another device and
press Talk there. It's refused, and the other device keeps the picture and the visitor's
voice. Hang up on the first device and the call goes to **Complete**, then **Idle**.

If you hear nothing at the door, see the troubleshooting on the
[UniFi Protect talkback](../applets/protect-talkback.md#troubleshooting) page.

## 6. Answer from your dashboards

The [Camera Commander](../applets/camera-commander.md) card shows a Talk button over a
doorbell's live video. To put Answer and Hold to talk buttons on a wall tablet, follow
[Put talk buttons on a wall tablet](talk-buttons-on-a-tablet.md). To have the doorbell
come up over every tablet when it rings, follow
[Show the doorbell on every tablet when it rings](doorbell-over-every-tablet.md).
