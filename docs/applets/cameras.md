# Cameras

The house's cameras, chosen from Home Assistant: their names, streams and controls, for
the commanders and the camera dashboard.

> **Maturity: Alpha.** Does its job every day in the author's house, but hasn't been tried in many others. Expect rough edges and changes. ([The levels](../README.md#maturity))

## What it's for

Every camera feature in Casa Mia starts from one list of cameras. You add each camera once
here, give it the name it shows everywhere, and say which of its streams to use; Camera
Commander and Auto Dashboards read it from here. It draws nothing itself.

## Switching it on

It is on whenever **Camera Commander** or **Auto Dashboards** is on in the app's
Configuration tab (Settings → Apps → Casa Mia → Configuration). The thumbnails need
Camera Commander.

The first time it starts, it takes the cameras from the Camera Dashboard (now Auto Dashboards), where they were
kept before, and logs `cameras: moved N cameras`.

## On the page

Every change is saved at once: there is no Save button.

- **+ Add cameras:** pick from Home Assistant's cameras. A camera with low, medium and
  high resolution channels (UniFi Protect's, for example) is added as one camera, its
  channels filled in.
- **Each row:** the camera's thumbnail, title and entity; its channels; its motion
  sensor; and its extras (zoom, PTZ presets, page controls).
- **Edit:**
  - **Title:** its name on the commander's tile and its page.
  - **Medium channel:** for the wall tablets and phones. **High channel:** for everyone
    else. Blank: the camera itself.
  - **Zoom:** a number entity, shown on its page.
  - **PTZ presets** and **page controls** (a gate, a light): shown on its page.
- **Remove:** it also leaves every commander that shows it.

### Motion

The **Motion** column shows the camera's motion sensor: a motion binary sensor on the
camera's own device, else one named after the camera. Track motion and the Camera
Commander card's motion dot use the same one.

Many cameras can switch their own motion detection off (UniFi Protect's **Motion**
switch, a Kiosk Satellite tablet's **Screensaver motion detection**). While it is off the
camera's motion sensor never turns on, so the camera takes no part in Track motion or the
motion dot. The page warns above the list, naming those cameras, and each one's Motion
column has the switch, to turn it back on from here.

### The live view

Tap a camera's thumbnail to watch it live:

- a button for each of its channels (camera, low, medium, high), through Home
  Assistant's WebRTC where it offers it, else its MJPEG stream; the size it arrives at is
  shown under the picture;
- its **motion sensor**, followed live: a dot that pulses red while it sees motion, and
  since when;
- its **motion detection switch**, to flip while you watch.

## Troubleshooting

- **No thumbnails:** they come from the compositor; switch on **Camera Commander**.
- **A camera never sees motion:** check the warning above the list; its motion detection
  may be off. Otherwise the camera may have no motion sensor Casa Mia can find (the
  Motion column says none).
- **The log** has a line for every save (`cameras: saved N (added …; removed …;
  changed …)`) and every live view (`cameras: live view of …`).
