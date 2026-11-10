# Show the doorbell on every tablet when it rings

This guide brings the doorbell up over whatever each wall tablet is showing as soon as it
rings, and keeps it there until the call is over. It uses an
[Over layer](../over-layer.md) whose visibility follows the doorbell's Call sensor from
the [Intercom](../applets/intercom.md), here `sensor.front_door_call`.

## 1. Choose what comes up

Make a card with what you want to see at the door: a
[Camera Commander](../applets/camera-commander.md) card whose commander shows the
doorbell, and a [Talk tile](talk-buttons-on-a-tablet.md) under it, in a vertical stack.
Check it works on a normal view first.

## 2. Make it an Over layer

Follow [Adding one](../over-layer.md#adding-one) on the Over layer page to put that card
in an Over layer on each tablet's dashboard.

## 3. Show it while there is a call

On the Over layer card's **Visibility** tab, add a state condition on the Call sensor.
In YAML:

```yaml
visibility:
  - condition: state
    entity: sensor.front_door_call
    state:
      - ringing
      - answered
```

The sensor is **Ringing** from the press until someone answers, or for a minute if nobody
does, and **Answered** for the whole call. Both are covered, so the layer stays up while
someone is talking. When the call ends, the sensor shows **Complete** for 10 seconds and
then **Idle**, and the layer goes.

Add `complete` to the list if you'd like those 10 seconds on screen too: the Talk tile
then shows who answered, or that the ring was missed.

## 4. Try it

Ring the doorbell. Every tablet with the layer should show it at once, because the Call
sensor changes as the ring arrives. Answer on one tablet: the others keep the layer up,
with their Talk tiles saying **Answered by …**. Hang up, and the layer goes from all of
them.

If a tablet doesn't show it, check that you're not in edit mode on it (an Over layer
waits while editing), and see [the Over layer's troubleshooting](../over-layer.md#troubleshooting).
