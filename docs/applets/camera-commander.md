# Camera Commander

The commanders: each a main camera framed by panels of cameras, one live picture for the
Camera Commander card and the camera dashboard.

> **Maturity: Beta.** Complete and used every day; its features have settled. Please report what breaks in your setup. ([The levels](../README.md#maturity))

<img src="../screenshots/dashboard-commander.webp" alt="A camera commander on a dashboard: the main camera framed by every other camera" width="800">

## What it's for

A wall tablet showing a grid of camera cards plays a stream for each, and soon stutters.
A commander is drawn instead by the app's compositor as one picture: a big main camera
framed by all the others. The tablet plays a single picture, so even a modest one stays
quick. Tap a tile and it becomes the main camera; switch on Track motion and the
commander follows whatever moves.

## Switching it on

Turn on **Camera Commander** in the app's Configuration tab (Settings → Apps → Casa Mia →
Configuration); **Auto Dashboards** adds the camera dashboard. Add the cameras on the
[Cameras](cameras.md) page first.

The first time it starts, it takes the commanders from what the Camera Dashboard (now Auto Dashboards) last
deployed live (not its draft, so nothing unfinished reaches the walls), and logs
`commander: moved N commanders`.

## On the page

There is no draft: **Save** shows your changes live at once, on every Camera Commander
card. **Discard** throws away what you haven't saved. A commander with a problem (no
cameras, a bad size) is refused, with what to fix, rather than shown broken on the wall.

The commanders are a list, one open at a time with its preview drawn from your unsaved
changes. Move them up and down (the camera dashboard's pages follow), delete one, or add a
copy of the one open or a blank one. Each has:

- **Picture:** its name (its page's title on the dashboard), whether it has a dashboard
  page, the gap and margin, and **Stale after**: a camera picture older than this is
  marked Stale.
- **Main camera:** how it fits its space (Fit, Fill, Crop, Own shape, Fixed shape), its
  width and shape for the last two, and the camera it starts on.
- **Highlight** on the main camera's tile: colour, width, blur, and a pulse (Breathe or
  Ripple).
- **Track motion:** its switch, and how it behaves. **Hold:** a switch stays this long
  before motion elsewhere takes over. **Go back after:** once all motion stops, back to
  the camera chosen by hand (0: stay). **Pause after a choice:** a tap pauses tracking
  this long.
- **Panels** (left, top, right, bottom): the cameras in each, in order; its size; how its
  tiles fit; rows or columns; and whether it is shown.

**Pictures:** the **Compositor host**, the address the cards and the dashboard fetch the
pictures from. Blank: this box's own address.

## In Home Assistant

Each commander is a device: **Camera Commander** for the first, then **Camera Commander
<name>**. Each has:

- **Main camera**, a select: its options are the commander's cameras, and choosing one
  (a tap on the card, or an automation) makes it the main camera.
- **Track motion**, a switch: while it is on, a camera that sees motion becomes the main
  one.

## The Camera Commander card

In Home Assistant's Add to dashboard dialog, choose **Casa Mia Camera Commander**. Its
preview uses the first commander, so you see its layout before adding it. In a Tablet
Layout panel it takes the full width by default.

Its options (each left at its default unless you change it):

- **Commander:** which one.
- **A tap on the main camera:** opens its **more-info**, Home Assistant's camera dialog
  with live video (the default); or **its page on the camera dashboard** (more-info when
  there is no dashboard); or nothing.
- **The picture:** direct at home and through Home Assistant away (the default); always
  direct; or always through Home Assistant. **Sharpness through Home Assistant:** from
  Full to Data saver.
- **Main camera as live video:** the main camera plays as live video over the picture
  (Home Assistant's WebRTC, decoded by the tablet), when the compositor's **Live main
  camera** switch is on.
- **Picture kept running once out of sight:** seconds, so the back button finds it
  running.
- **Security look:** every picture in tinted monochrome, like a control room, with its
  tint, strength and darkness.
- **Motion dot:** a small dot pulsing on a camera's tile while its motion sensor sees
  motion, and for a while after; hover it for when. Its colour, size, pulse (0: steady),
  how long it stays after the motion, and its corner. A camera whose own motion detection
  is off (see [Cameras](cameras.md)) never shows one.

## Troubleshooting

- **Taps on the commander do nothing:** the page says so when Home Assistant has no Main
  camera select for it yet; restart Home Assistant if the integration was just updated
  (Settings → Repairs).
- **A tap on the main camera opens a dashboard page, not the camera:** the card was saved
  with "its page on the camera dashboard" chosen; choose more-info in its editor.
- **No motion dot on a camera:** check its motion detection on the [Cameras](cameras.md)
  page.
- **The log** has a line for every save (`commander: saved N commanders (changed: …)`)
  and every main camera chosen (`commander '…': main camera … (from Home Assistant)`).
