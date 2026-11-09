# Put talk buttons on a wall tablet

This guide adds buttons to answer the door and hang up, using Casa Mia's Talk tile. It
also sets up phones to answer in half duplex (hold to talk) while the wall tablets
answer in full duplex (open microphone). It assumes you've followed
[Talk to a UniFi Protect doorbell](talk-to-the-front-door.md), so the doorbell has a
Call sensor, here `sensor.front_door_call`.

## Why a Talk tile and not an ordinary button

An ordinary tile can't tell whether this tablet is the one talking. The Talk tile can: it
reads the Call sensor and this device's Home Assistant user, and says **Talk**, **Hang
up** or **Answered by …** accordingly, so a tap always does what the tile says.

The microphone belongs to a [Camera Commander](../applets/camera-commander.md) card,
which must be on the same dashboard view. The Talk tile only tells it what to do, so the
doorbell doesn't need to be the commander's main camera.

## 1. Add the Commander card

If the view doesn't have one yet, add a **Camera Commander** card for the commander that
shows the doorbell. In its options, turn the **Talk button** off if you only want the
tiles, and leave **Talking** at full duplex for a wall tablet.

## 2. Add the Talk tile

Edit the dashboard, **Add card**, and choose **Casa Mia Talk tile**. Set its entity to the
Call sensor. In YAML:

```yaml
type: custom:casa-mia-talk-tile
entity: sensor.front_door_call
colors:
  ringing: amber
  hang_up: red
```

Ring the doorbell to check it: the tile turns amber and says **Talk**. Tap it to answer;
it says **Hang up** until you do.

## 3. Hold to talk on the phones

On a phone, a call left answered by mistake would send your voice to the door without
your knowing. Half duplex avoids that: answering only lets you hear the visitor, and your
voice goes out while you hold a second button. Add both tiles:

```yaml
- type: custom:casa-mia-talk-tile
  entity: sensor.front_door_call
  duplex: half
- type: custom:casa-mia-talk-tile
  entity: sensor.front_door_call
  button: hold
```

The first says **Answer**. The second is the **Hold to talk** button: it stays greyed out
until this device has answered in half duplex, and says **Live** while your voice is
going out. In half duplex the call hangs up 2 minutes after you last let go of it.

## 4. Show each set to the right devices

One dashboard can serve both. Put the full duplex tile in one card and the half duplex
pair in another, and use each card's **Visibility** tab with Home Assistant's **User**
condition: the wall tablets' users see the first, the phone users the second. The
Commander card's own **Talking** option follows the same idea if you use its Talk button.

## If a tap does nothing

- The view has no Commander card, or its page isn't on an https address. The browser's
  console says which.
- Another user has answered: the tile says **Answered by …**. Press the doorbell's **End
  call** button in Home Assistant to take the call back.
