# Run the whole house from your desk

Every wall tablet's screen, seen and driven from the [Kiosk Satellites](applets/kiosk-satellites.md)
page, wherever Casa Mia reaches: at home, or from another continent through Home Assistant.
Touch it, open Android's Settings or Kiosk Satellite's, press Back or Home, reboot it to its
dashboard. No ladder, and no taking a tablet off the wall.

It takes one visit to each tablet, at the same time as everything else you do there. From
then on, anything that needs a finger on the screen can be done from your desk.

## What you need

- Kiosk Satellite on each tablet, already working with Casa Mia (see
  [Kiosk Satellites](applets/kiosk-satellites.md#switching-it-on)).
- [droidVNC-NG](https://github.com/bk138/droidVNC-NG), a free VNC server for Android. Take
  its APK from its GitHub releases (the tablets need no Play Store).
- A computer with `adb` ([Android's platform tools](https://developer.android.com/tools/releases/platform-tools))
  on the tablets' network.
- One VNC password for all the tablets, and an *access key*: a random string droidVNC-NG
  takes as proof that a command comes from you. Keep both to yourself.

## At the tablet: the only part that needs you there

1. Turn on Developer options (Settings → About tablet → tap **Build number** seven times).
2. In Developer options, turn on **Wireless debugging**. Tick **Always allow on this
   network** when it asks.
3. Choose **Pair device with pairing code**. Write down the address and the *pairing* port
   it shows, and the code.
4. Back on the Wireless debugging page, write down the address and port at the top. This
   is the *debugging* port, a different one. Mixing up the two ports is the most common
   slip.
5. Still in Developer options, under **Quick settings developer tiles**, add **Wireless
   debugging**. After a reboot, that tile is the way back in (see below).

Then, from your computer (the addresses here are examples):

```sh
adb pair 192.0.2.50:41234 123456     # the pairing port, and the code
adb connect 192.0.2.50:37865         # the debugging port
```

`.local` names and Android's own discovery don't cross from one subnet to another, so use
the address the tablet shows.

## From your desk: everything else

Every step below is an `adb` command; with several tablets, put them in a small script and
run it once per tablet. `P` is droidVNC-NG's package name.

```sh
P=net.christianbeier.droidvnc_ng
T=192.0.2.50:37865                                # the tablet

adb -s $T install -r droidvnc-ng-<version>.apk
adb -s $T shell cmd appops set $P PROJECT_MEDIA allow                 # may capture the screen
adb -s $T shell pm grant $P android.permission.POST_NOTIFICATIONS    # before its first start
adb -s $T shell locksettings set-disabled true                        # no lock screen
```

**Touch.** droidVNC-NG's touch is an accessibility service. Add it to the list of those
switched on, rather than replacing the list, or you switch off whatever else is there:

```sh
cur=$(adb -s $T shell settings get secure enabled_accessibility_services | tr -d '\r')
case "$cur" in
  *$P/.InputService*) new=$cur ;;                 # there already
  null|"") new=$P/.InputService ;;
  *) new=$P/.InputService:$cur ;;
esac
adb -s $T shell settings put secure enabled_accessibility_services "$new"
adb -s $T shell settings put secure accessibility_enabled 1
```

**Its settings.** droidVNC-NG reads a `defaults.json` at its first start. Scaling 1.0 sends
the screen at its own size; `startOnBoot` brings it back after a reboot:

```json
{
  "port": 5900,
  "password": "<your VNC password>",
  "accessKey": "<your access key>",
  "viewOnly": false,
  "showPointers": false,
  "fileTransfer": false,
  "startOnBoot": true,
  "startOnBootDelay": 0,
  "scaling": 1.0
}
```

```sh
adb -s $T shell mkdir -p /sdcard/Android/data/$P/files
adb -s $T push defaults.json /sdcard/Android/data/$P/files/defaults.json
```

**Android 15 and later** blanks Developer options, Wireless debugging and notifications in
every screen share, so you would see a black page exactly where you most need to look. One
switch lifts that. It is read when a capture starts, so set it before starting droidVNC-NG
(or restart it after). Notifications then show in the share too, which on a wall tablet is
what you want.

```sh
adb -s $T shell settings put global disable_screen_share_protections_for_apps_and_notifications 1
```

**Start it**, with your access key:

```sh
adb -s $T shell am start-foreground-service -n $P/.MainService \
  -a $P.ACTION_START --es $P.EXTRA_ACCESS_KEY "<your access key>"
```

(`ACTION_STOP`, the same way, stops it.)

**Quiet it.** droidVNC-NG chimes on every connection. Its notification channel exists only
once it has started, so then set it to **Silent**: Settings → Apps → droidVNC-NG →
Notifications. You can do that from your desk too, through the remote control.

**Lenovo Tab M9 and other MediaTek tablets:** turn off DuraSpeed, then reboot. It can stop
Kiosk Satellite's dashboard starting, and the reboot clears Android's mark against it.

```sh
adb -s $T shell settings put global setting.duraspeed.enabled 0
adb -s $T reboot
```

Finally, type the VNC password once under **Remote control** on the Kiosk Satellites page.

## After a reboot

The pairing survives a reboot, but Wireless debugging is switched off and comes back on a
new port. droidVNC-NG starts by itself, so you can still see the screen:

1. Open the remote control, press **Recents** (so a swipe from the top reaches Android's
   shade, not the dashboard's pull-to-refresh), and swipe down from the very top edge.
2. Tap the **Wireless debugging** tile, and **Allow** if it asks.
3. Find the new port: the Wireless debugging page shows it, or scan the tablet's ports
   30000–49999. Then `adb connect` to it.

## What it can't do

- **VNC encrypts only the password exchange.** Keep it on your own network: never forward
  port 5900 through your router. From away, your browser reaches Casa Mia through Home
  Assistant's own HTTPS, and only Casa Mia talks VNC to the tablet.
- **Android 16** lets an app refuse accessibility services; one that does can't be touched
  remotely.
- If droidVNC-NG's touch service gets switched off on the tablet, only a visit turns it on
  again.
