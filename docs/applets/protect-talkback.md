# UniFi Protect talkback

Talk through UniFi Protect doorbells and cameras from Home Assistant.

> **Maturity: Alpha.** Does its job every day in the author's house, but hasn't been tried in many others. Expect rough edges and changes. ([The levels](../README.md#maturity))

## What it's for

Home Assistant shows UniFi Protect cameras with their sound, but can't talk back through
them: its UniFi Protect integration doesn't declare two-way audio, and go2rtc has no
UniFi talkback source yet. This module fills the gap until they do, by patching Home
Assistant's own go2rtc. When they catch up, it goes.

The patch, in the Casa Mia Protect Talkback integration:

1. Adds a talk source to each chosen camera's go2rtc stream, in the config file Home
   Assistant writes for go2rtc (go2rtc refuses such sources through its API). The source
   runs a small script, `talk.py`, while a browser sends its microphone: the script opens
   a talkback session with the Protect console and hands the audio to ffmpeg, which sends
   it to the camera's speaker.
2. Makes the chosen cameras report two-way audio, so Home Assistant's Talk button shows
   for them, and the [Intercom](intercom.md) and the Camera Commander card can talk.

Adding the first console restarts go2rtc once, so camera streams pause for a second or
two. It works only with the go2rtc Home Assistant runs itself; with `go2rtc: url:` set,
add the source to your own go2rtc's config instead. Audio is telephone quality (A-law at
8 kHz from the browser).

## Switching it on

1. On each Protect console (a UNVR, say), create an API key just for this, in its UniFi
   settings, so it can be revoked on its own.
2. Turn on **UniFi Protect talkback** in Settings → Apps → Casa Mia → Configuration, save,
   and restart the app.
3. Casa Mia offers **Casa Mia Protect Talkback** under Settings → Devices & services →
   Discovered. Add it with the console's address and its API key, then tick the cameras
   that get talkback. Only the doorbells are ticked to start with: talking through an
   indoor camera should be a deliberate choice. Add each further console with **Add
   entry**; the integration's options change the cameras.

The key is kept in a file only Home Assistant can read, so it never shows in go2rtc's
stream list. Turning the option off, or removing the last console, gives go2rtc Home
Assistant's own config back (one more restart of go2rtc).

## Troubleshooting

The integration logs to Home Assistant's log, under `casa_mia_protect_talkback`: the
cameras that get talkback, each restart of go2rtc and why, and proof that the running
go2rtc has the amended config (the first line of its config file carries a digest of what
was added, checked against the live process).

- **"Talk through UniFi Protect cameras is unavailable" in Repairs.** The patch didn't
  take, usually after a Home Assistant update changed go2rtc or the UniFi Protect
  integration. The reason is in the Repair and the log. Cameras keep working.
- **No Talk button on a camera.** Check it's ticked in the integration's options; only
  cameras with a speaker are listed.
- **Talk connects but nothing is heard at the door.** go2rtc logs `talk.py`'s errors: no
  talkback session (the key, or the camera id), or a codec Protect asked for that the
  script doesn't support.
- **The integration won't set up beside Intercom talkback.** The old Intercom talkback
  integration patches the same parts of go2rtc. Disable its entry, then reload this one.

## How-to guides

- [Talk to a UniFi Protect doorbell from Home Assistant](../how-to/talk-to-the-front-door.md)
- [Put talk buttons on a wall tablet](../how-to/talk-buttons-on-a-tablet.md)
- [Show the doorbell on every tablet when it rings](../how-to/doorbell-over-every-tablet.md)
