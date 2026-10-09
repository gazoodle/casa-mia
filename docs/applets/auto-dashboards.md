# Auto Dashboards

Dashboards made for you: today the camera dashboard, from the cameras and the commanders,
previewed, and deployed into Home Assistant.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

<img src="../screenshots/dashboard-commander.webp" alt="The camera dashboard: a commander's page, every camera around the main one" width="800">

## What it's for

A camera dashboard by hand is an afternoon of YAML, and another each time a camera is
added. Auto Dashboards writes it from what you have already set up: a page for each
commander (its picture, with a tap zone over each tile), then a live page for each camera
(its stream, zoom, PTZ presets and page controls). One dashboard adapts to whoever is
looking: wall tablets and phones get each camera's medium channel, everyone else the high
one.

It is the start of a wider idea: dashboards built from Casa Mia's own data, rebuilt the
same way every time.

## Switching it on

Turn on **Auto Dashboards** in the app's Configuration tab (Settings → Apps → Casa Mia →
Configuration), and **Camera Commander** too for the commanders' pictures. Set up the
[Cameras](cameras.md) and the [Camera Commander](camera-commander.md) first.

Before 2026.10.4-b18 this was the Camera Dashboard, and its page held the cameras and the
commanders too.

## On the page

Your edits here are a draft: **Save draft** keeps them, **Discard** throws them away. The
cameras and the commanders are their own pages': the draft takes their changes at once.

- **Deploy preview** writes the draft to a second dashboard, `<address>-preview`, visible
  to admins only, to try it out. **Remove preview** deletes it.
- **Deploy live** writes it to the dashboard itself, keeping a copy of what it replaces.
  The commanders' pictures are live on both at once (Camera Commander); a commander's
  layout change reaches a dashboard's tap zones at its next deploy.
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
- **A tap on a commander does nothing:** see [Camera Commander](camera-commander.md#troubleshooting).
- **The log** has a line for every save, deploy, restore and backup (`auto dashboards:
  deployed /… (N views, composites from …)`).
