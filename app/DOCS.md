# Casa Mia

Placeholder documentation. This app is the long-running half of the Casa Mia house
system: the services that must keep working when Home Assistant Core restarts or the
internet is down.

## What it is for

- **FONA:** SMS and calls over the GSM board, so the gate can still be opened with the
  internet down (planned).
- **Alarm, git proxy, camera compositor:** further house services, one module each (planned).
- **Delivering the Casa Mia integrations:** on start it installs them into
  `/config/custom_components`, and each one raises its own restart Repair when it changes.

It talks to the thin `casa_mia` integration over a small local API. `GET /health` on port
8780 reports the app version and API version.

Currently only the skeleton exists: `/health` and the integration installer.

## Options

- `log_level`: `debug`, `info`, `warning` or `error` (default `info`). Log lines use Home Assistant's format, for example `2026-10-01 16:42:28.675 INFO (MainThread) [casa_mia.components] ...`.
- `count_install` (default on): see below.

## The install count

Casa Mia is free. The only payment its author gets is knowing people use it, so once per
version (after a first install or an update) the app downloads that release's notes from
GitHub. GitHub counts the download, and that number is the Downloads badge on the project
page.

- **Anonymous.** Nothing about your home, your setup or you is sent. It is an ordinary file
  download: GitHub sees your address, as it does for any download, and the author sees only
  the total.
- **Once per version.** Restarts do not count again; the notes are kept in the app's data
  folder until the next version.
- **Off with one switch.** Turn off **Count this install** in the app's Configuration tab.
  Nothing else changes.
- Builds between releases (versions ending `-bN`) have no release, so they never count.

## More

Source and design notes: <https://github.com/gazoodle/casa-mia>
