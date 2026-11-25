# Auto Dashboards

Dashboards made for you: today the camera dashboard, with a live page for each camera,
previewed, and deployed into Home Assistant.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

## What it's for

A page for every camera by hand is an afternoon of YAML, and another each time a camera
is added. Auto Dashboards writes them from what you have already set up: a live page for
each camera in a commander (its stream, zoom, PTZ presets and page controls). One
dashboard adapts to whoever is looking: wall tablets and phones get each camera's medium
channel, everyone else the high one.

**It is not how you show a commander.** A commander goes on a dashboard of your own as the
[Camera Commander card](camera-commander.md#the-camera-commander-card); see
[A camera commander on your home page](../how-to/commander-on-your-home-page.md). The
card's tap on the main camera can open that camera's page here.

Until 2026.11.12-b7 this dashboard also had a page for each commander, drawn as one
picture with a tap zone over each tile. It no longer makes them. A dashboard deployed
before then keeps its commander pages until its next **Deploy live**, which removes them.

It is the start of a wider idea: dashboards built from Casa Mia's own data, rebuilt the
same way every time.

## Switching it on

Turn on **Auto Dashboards** in the app's Configuration tab (Settings → Apps → Casa Mia →
Configuration). Set up the [Cameras](cameras.md) and the
[Camera Commander](camera-commander.md) first: a camera gets a page when a commander
shows it.

Before 2026.10.4-b18 this was the Camera Dashboard, and its page held the cameras and the
commanders too.

## On the page

Your edits here are a draft: **Save draft** keeps them, **Discard** throws them away. The
cameras and the commanders are their own pages': the draft takes their changes at once.

- **Deploy preview** writes the draft to a second dashboard, `<address>-preview`, visible
  to admins only, to try it out. **Remove preview** deletes it.
- **Deploy live** writes it to the dashboard itself, keeping a copy of what it replaces.
- **YAML** shows the dashboard as it would be deployed, to copy.

The bar says whether the draft differs from what is live, and what to fix before a
deploy (**To fix before deploying**). A list of what the dashboard needs that Home
Assistant seems to lack (an entity, a custom card, the Back helper) warns, but never
stops a deploy.

### Dashboard

- **Dashboard URL** (it is created if missing) and **Title**.
- **Home** and **Help:** where those buttons go. **Navigation:** Back, Home and Help (and
  the page controls) as header badges, or as a row of tiles; tiles need an
  `input_button` helper as their **Tile entity**.
- **Theme:** for every page.
- **Live card:** the card each camera's page plays it with, for wall tablets and phones,
  and for everyone else: Home Assistant's picture entity card, or the WebRTC camera or
  Advanced camera card if you have them. **Live card per camera:** a camera's own, where
  the dashboard's would not do (one that only gives MJPEG).
- **Portrait screens** and **Phones:** media queries for the screens that get the medium
  channel and the upright layouts.
- **Wall tablets:** the Home Assistant users that are wall tablets: they get the medium
  channel.

### Backups

- **Keep older versions:** how many of the live dashboard's earlier configs are kept, one
  per deploy.
- **Restore** puts one back. **Revert draft** goes back to what is live. **Revert
  preview** puts the preview back as it was before its last deploy.

## Troubleshooting

- **Back does nothing on the dashboard:** switch on the Back button helper on the
  [Settings](settings.md) page.
- **The log** has a line for every save, deploy, restore and backup (`auto dashboards:
  deployed /… (N views)`).
