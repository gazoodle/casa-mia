# Firmware server

Mirrors the Kiosk Satellite firmware so the wall tablets update without the internet.

> **Maturity: Beta.** Complete and used every day; its features have settled. Please report what breaks in your setup. ([The levels](../README.md#maturity))

<img src="../screenshots/firmware.webp" alt="Firmware server" width="800">

## What it's for

Let Kiosk Satellite tablets fetch updates from your Home Assistant box rather than
GitHub. This is useful for tablets on a network without internet access, and avoids
each tablet downloading the same release over your internet connection.

The box still needs internet access to mirror new releases. Once downloaded, those
files can be served locally while the internet is down. This updates Kiosk Satellite,
not Casa Mia, Android or your tablet's other apps.

## Switching it on

1. Turn on **Serve tablet firmware** in Settings → Apps → Casa Mia → Configuration,
   save, and restart the app.
2. Leave port **8000** available in the app's Network section. The tablets must be able
   to reach the box on this port.
3. Open **Firmware server** in the Casa Mia panel. Press **Check now** if no release has
   downloaded yet.
4. Copy **Tablet URL**. In Kiosk Satellite, choose **Custom repository** as the update
   source and paste that address.

For a fleet leader, the [Kiosk Satellites](kiosk-satellites.md) page also offers
**Use firmware server**, which sets its update source for the fleet.

## On the page

### Tablet URL

Click the address to copy it. Give the tablets this local address, not the Integration
URL at the foot of Casa Mia's home page. The browser you use to administer Casa Mia
can be away from home; the tablets fetch the firmware directly on your home network.

### Releases

Casa Mia checks GitHub at startup and every twelve hours. **Check now** starts another
check; while one is running, the button shows **Checking…** or **Downloading…**. The
progress bar shows the bytes downloaded. The list shows the files held locally,
their sizes and dates, with the latest release marked.

**Keep older releases** is the number retained besides the latest. Lowering it deletes
extra files immediately, or at the end of a check already running. Raising it keeps
more from future releases; it does not download deleted older versions again.

A release is offered to tablets only once its universal APK is downloaded. If a new
release's download fails, Casa Mia keeps the previously downloaded firmware available.
Mirroring a release does not tell every tablet to install it: installation follows
Kiosk Satellite's update settings, or an **Update** request from the Kiosk Satellites
page.

## In Home Assistant

With the Casa Mia integration installed, the **Firmware server** device has:

- **State** and **Latest firmware** sensors;
- **Downloading firmware**, **Firmware downloaded** and **Firmware download progress**
  to follow a download;
- a **Force firmware check** button to request the same check as **Check now**.

These describe the mirror on the box, not each tablet's installation progress.

## Troubleshooting

The app's log is in Settings → Apps → Casa Mia → Log.

- **The server is Offline.** A line `cannot serve on :8000` gives the reason, such as a
  port already in use. Check the app's Network settings and other services on that port.
- **No latest release appears.** `check failed: …` means GitHub's release list could
  not be read. Check the box's internet connection and retry **Check now**.
- **A release appears on GitHub but not on the tablets.** Look for an APK download
  failure or `not offering … to tablets: not downloaded`. Wait until the release's
  files are available and run **Check now** again.
- **The tablet cannot update.** Check its Custom repository address and access to
  port 8000. The log records `tablet … checked for firmware updates` and
  `tablet … is downloading …`; no check line means the request has not reached this
  server. A download line alone does not confirm installation on Android.
- **Check now seems to do nothing.** `a firmware check is already running` means the
  current check will finish first; watch the page's progress and error message.
