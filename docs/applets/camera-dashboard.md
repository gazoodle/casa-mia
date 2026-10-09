# Camera Dashboard

The camera dashboard, made from the cameras and the commanders, previewed, and deployed into Home Assistant.

> **Maturity: Alpha.** Does its job every day in the author's house, but hasn't been tried in many others. Expect rough edges and changes. ([The levels](../README.md#maturity))

*Being split: the cameras now have their own [Cameras](cameras.md) page and the commanders their [Camera Commander](camera-commander.md) page; this page keeps the dashboard, and becomes Auto Dashboards (see BACKLOG.md).*

<img src="../screenshots/camera-dashboard.webp" alt="Camera Dashboard" width="800">

<img src="../screenshots/dashboard-commander.webp" alt="Camera Dashboard" width="800">

<img src="../screenshots/dashboard-commander-loft.webp" alt="Camera Dashboard" width="800">

<img src="../screenshots/dashboard-security-look.webp" alt="Camera Dashboard" width="800">

## What it's for

> **To write:** who needs it and what it saves them.

## Switching it on

Turn on **Camera Dashboard** in the app's Configuration tab (Settings → Apps → Casa Mia → Configuration).

> **To write:** anything else it needs first.

## On the page

- Dashboard settings: its address and title, Back / Home / Help, the live cards, the wall
  tablet users
- Save draft, Deploy preview, Deploy live, YAML
- Backups

The cameras and the commanders are their own pages' ([Cameras](cameras.md),
[Camera Commander](camera-commander.md)): the draft takes their changes at once, and the
live dashboard at its next Deploy live (its commander pages' tap zones follow each
commander's layout). Both dashboards show the commanders' live pictures.

> **To write:** a paragraph for each.

## The Camera Commander card

See [Camera Commander](camera-commander.md#the-camera-commander-card).

## Troubleshooting

> **To write:** common problems, and what the log says about them.
