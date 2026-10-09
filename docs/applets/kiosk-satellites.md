# Kiosk Satellites

The wall tablets: their versions, kept backups of their setup, and their admin pages from anywhere.

> **Maturity: Alpha.** Does its job every day in the author's house, but hasn't been tried in many others. Expect rough edges and changes. ([The levels](../README.md#maturity))

<img src="../screenshots/kiosks.webp" alt="Kiosk Satellites" width="800">

## What it's for

Look after your wall tablets from one place: see which are answering, which need an
update, and keep copies of their setup before changing it. **Open** brings a tablet's
own Kiosk Satellite admin page into Home Assistant, so you can use it away from home
without exposing the tablet's admin port to the internet.

Casa Mia works with [Kiosk Satellite](https://kiosksatellite.com); it does not install
Kiosk Satellite on your tablets or replace its fleet management.

## Switching it on

1. Install Kiosk Satellite on the tablets. Enable **Remote Administration** and set its
   password on each one. Its admin server normally uses port **2324**; see the
   [Remote API guide](https://kiosksatellite.com/docs/remote-api/) for its setup.
2. Make sure your Home Assistant box can reach each tablet's admin address. A tablet on
   an isolated network needs a route and firewall permission from the box.
3. Turn on **Kiosk Satellites** in Settings → Apps → Casa Mia → Configuration, save,
   and restart the app.
4. Open **Kiosk Satellites** in the Casa Mia panel. Press **Look now**, then **Log in**
   with the tablets' remote admin password. Repeat for tablets with another password.

Tablets are found through Home Assistant's ESPHome devices and, after logging in to
one, through the kiosks it knows. **Add a kiosk** covers tablets neither source knows.
The [Firmware server](firmware-server.md) is optional for discovery and backups, but
supplies the latest release information and a local update source.

## On the page

### Kiosks

Each row shows the tablet's name, address, version, online state and, when reported,
model, battery and Wi-Fi signal. Fleet leaders appear before their indented followers.
A version marked with an upward arrow is behind the latest release known to the
firmware server. **Look now** asks for a fresh discovery scan.

**Log in** tries the password on every tablet that answers. Casa Mia keeps a login token
for up to ten years, not the password. Logging in enables backups and update commands,
and lets **Open** enter the tablet's admin page already signed in.

- **Open** uses the page inside Casa Mia, from home or away. Home Assistant must still
  be able to reach the tablet.
- **Visit ↗** opens the tablet directly in another tab; your browser must be on a
  network that can reach it.
- **Update** appears for an online, logged-in tablet behind the known latest release.
  It asks the tablet to check its own update source and install what it finds. The
  tablet restarts when the installation completes.
- **Use firmware server** appears on an online, logged-in fleet leader when Casa Mia's
  firmware server is on. It sets the leader's update source to that server; its
  followers take the update settings from their leader.
- **Log out** forgets Casa Mia's stored login for that tablet; it changes nothing on
  the tablet itself.
- **Forget** removes the tablet and its login from this list. It returns at the next
  scan if it is still discovered.

<img src="../screenshots/kiosk-satellite.webp" alt="A tablet's own Kiosk Satellite admin page opened inside Casa Mia" width="800">

### Run everywhere

The Quick controls from each tablet's own Overview page, sent to every tablet Casa Mia
is logged in to, one after the other: **Reload page**, **Clear cache**, **Screen off**,
**Screen on**, **Start screensaver**, **Dismiss screensaver**, **Dismiss camera view**,
**Postpone screensaver**, **Check for updates**, **Restart app** and **Restart device**.
The last two ask first. The panel shows each tablet's result as it comes, and the log
has a line for each.

A tablet's own page turns some of its tiles over with its state (Screen off becomes
Screen on); here both are buttons, since one button cannot know every tablet's state.
**Show camera view** (it asks which view) and **Take snapshot** (one tablet's picture)
stay on each tablet's own page.

The buttons, their words and icons are Kiosk Satellite's own, by
[Xavier Larrea](https://kiosksatellite.com), used here with thanks.

### Backups

Casa Mia checks logged-in, online tablets on the selected schedule and keeps a new
copy only when their setup changes. The defaults are **Full config**, three copies of
that kind per tablet, checked daily.

- **What:** **Settings only** or **Full config**. Full config includes secrets, the
  Home Assistant token and the page's stored data. Treat downloaded copies as private.
- **Keep:** one to six copies of each kind per tablet. Lowering it removes older
  copies immediately.
- **Check:** every six hours, twelve hours, daily or weekly.
- **Check now:** checks every logged-in tablet that is online, and reports how many
  changed, were saved or failed.

Backups live in the app's data, so include Casa Mia in your Home Assistant backups.
Changing these choices takes effect immediately.

Click a tablet's name to open its copies, newest first, with their dates and changed
settings. **Get latest** checks just that tablet. **Download** saves a copy to your
computer. **Restore** replaces the tablet's current setup with the chosen copy after
confirmation; the tablet keeps its own identity. Take a current copy before restoring
if you may want to undo it.

<img src="../screenshots/kiosk-backups.webp" alt="A tablet's saved backups, with the changes in each copy and Download and Restore buttons" width="800">

### Add a kiosk

Type an address such as `192.0.2.50` or a hostname, with its port if it is not 2324,
then press **Add**. This adds an address to try; it does not install or configure the
tablet. Use **Log in** once it is found.

## In Home Assistant

This page uses the tablets' existing ESPHome devices for discovery. It does not add
another set of tablet entities. Use Kiosk Satellite's own Home Assistant entities for
screen controls and automations; use Casa Mia for the list, backups and proxied admin
pages.

## Troubleshooting

Look in Settings → Apps → Casa Mia → Log for lines beginning `kiosks:` or `kiosk`.

- **No tablets are found.** Check Remote Administration is enabled, a password is set,
  and the box can reach the admin port. Try **Add a kiosk** and **Look now**. A warning
  `kiosks: cannot read Home Assistant's devices` explains a discovery failure; manual
  addresses can still be tried.
- **A tablet says Not answering.** The log says `kiosk … not answering`. Check its
  power, Wi-Fi and admin address. It must answer again before backup or update
  commands can run.
- **Login is refused.** `kiosk … login refused` means the tablet rejected the password;
  use its Remote Administration password. `login failed` includes a connection or
  response error. The dialog reports results separately for each tablet.
- **No new backup appears.** An unchanged setup deliberately produces no new copy;
  the log says `unchanged since the backup`. A failure says `backup export failed`,
  with a status or `no answer`. Check the tablet is online and log in again if its
  stored token no longer works.
- **An update fails.** Look for `update check failed` or `update not started`. Check the
  tablet's own update source and the firmware server's releases. Starting an update
  is a request to the tablet, not a guarantee Android has completed its installation.
- **Open cannot load the admin page.** `admin page proxy failed` gives the connection
  error. Try **Visit ↗** from home and check the saved login.
- **Download does nothing in the Apple Home Assistant app.** Open the Casa Mia panel
  in a browser to download backups; the page warns about this limitation.
