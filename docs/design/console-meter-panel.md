# The Console's meter panel

A plan, for the owner's approval (asked 2026-11-18). A fourth card that shows part of the
Console: one chassis for each electricity meter, drawn with the era's own meters. It is for
ordinary dashboards. The Dash-Bored pages do not use it: they are busy enough.

The mock-up it was agreed from was drawn with the real Silverface and Bakelite kits and is
not in the repo, because it showed a real house's readings.

## What the user does

They add the card, choose one or more devices, and get a panel. Nothing describes a model
of meter: the card works out what to draw from each sensor's device class and name.

```yaml
type: custom:dash-bored-console-meters
devices:
  - 0123456789abcdef0123456789abcdef   # chosen in the editor, not typed
era: silverface                         # left out: the era last chosen on the Console
show: [voltage, current, power]         # the default
limits:
  voltage: { min: 200, max: 260 }
  current: { max: 32 }
```

The card takes devices, not a model. Meters read through an ESPHome board report the
board as their model, so a model filter would not find them.

## What goes on a chassis

| Device class | Drawn as | Shown unless asked |
|---|---|---|
| voltage, current, power | the era's meter | yes |
| apparent_power, power_factor, frequency | the era's meter | no (`show` adds them) |
| energy | a register: the era's figures | yes |

- A sensor belongs to a phase when its entity id or name has `l1`, `l2`, `l3` or
  `phase 1` to `phase 3` as a word. One with none belongs to the whole meter.
- The unit of layout is a strip: one phase's meters, in the order of the table.
- **A meter with no phases** is one strip laid along the chassis, with its registers after
  it.
- **A meter with phases** has a strip for each phase standing side by side, so that the
  three voltmeters are in a row, and a strip for the whole meter (total power, registers)
  beside them.
- **Fitting the card** (2026.11.9-b24, a stopgap the owner chose on 2026-11-18): the works
  are laid out at their natural width and the whole of them zoomed to the chassis's width,
  between 0.6 and 1.6. A meter with phases puts the whole meter's strip under the phases
  when everything abreast would be under 0.75. When no form fits at 0.6, the meters stand
  in one column, which is the only time the panel is tall and thin. Doing it properly,
  with every control drawn at the size its place gives it, is in BACKLOG.
- Several devices on one card are several chassis, side by side where there is room.
- A register shows kWh with one decimal place. Wh and MWh are converted.

## Limits

Each quantity on a chassis has one scale, shared by its phases, so that the needles can be
compared. The whole meter's power has a scale of its own. The limits come from the first
of these that has them:

1. **The card's `limits`**, by device class. Either end may be left out.
2. **Sensor Watch's bands**, for a watched sensor: the ends its own gauge card uses
   (`scale` in `sensor-watch/common.ts`), moved out until the scale is five round steps,
   because a needle's scale has figures along it. Where the phases' bands differ, the
   scale covers all of them.
3. **A default for the class.** Voltage: a scale round whichever of 120, 230 and 400 V it is near.
   Power factor: 0 to 1. Frequency: 45 to 65 Hz. Current and power: from nothing to the
   first step of a ladder that holds the reading. That step only ever rises while the card
   is on the page, so a scale does not jump back and forth as a load cycles.

## Sensor Watch

The card works with no Sensor Watch. Where it is installed, the card follows each shown
sensor's watch (`casa_mia_sensor_watch/entity`, pushed, open to any signed-in user):

- its bands set the limits, as above;
- its level, when not nominal, lights the era's warning lamp (`jewel`) under that meter,
  with Sensor Watch's message as the lamp's title;
- its bands are drawn on the meter's scale as coloured zones (the last step: it changes
  `meter` in all five eras, which today draw a fixed red last fifth);
- a sensor Sensor Watch calls stale has its meter unlit.

The two integrations stay separate. Dash-Bored's bundle uses Sensor Watch's pure helpers
from the shared card sources and its websocket command; nothing is imported at run time.

## Nothing fails silently

- No connection to Home Assistant: every meter unlit and the panel's existing warning,
  with since when.
- A sensor that is unavailable or not a number: its meter unlit, lettered "not answering".
- Sensor Watch stops answering after it gave bands: the scales stay as last heard, and the
  chassis says so with since when. The bands are a lease, not a fact.
- A device with nothing the card can show, or a device that is gone: the chassis says which.

## How it is built

- `console/meters.ts`: no drawing and no Lit. Which sensors a device has, their phase, the
  strips, the unit conversions and the limits. Tested in node (`meters.test.ts`).
- `console/metered.ts`: draws a chassis from that with an era's kit, as `weather.ts` draws
  the weather for every era.
- `console/kit.ts`: the kit gains `register`. Bakelite's is its counter wheels without the
  press buttons. The later eras' is the figure display each already has (`nixies`,
  `readout`, `figs`).
- `console/panel.ts`: a fifth view, `meters`, which reads no rooms. It is at 607 lines of
  800, so only the view's few lines go there.
- `console/cards.ts`, `index.ts`: the card, its editor (Home Assistant's device selector,
  with several allowed) and its entry in the card picker.
- `console/views.ts`: where the strips stand, by container width, the same in every era.

## Order of work

Each step is usable by itself and gets its changelog lines.

1. The card with the default limits and the card's own limits, in all five eras, with
   registers. Usable on a dashboard at once. **Built in 2026.11.9-b23.**
2. Sensor Watch: limits from bands, the warning lamp, stale and lapsed. **Built in 2026.11.9-b23.**
3. Zones on the scales, in all five eras.
4. The guide: a section in `docs/applets/dash-bored.md` under "As a dashboard card", with
   every option, the limits' order and a picture from the test VM's invented house (it
   needs stand-in meters there first). The guide says the card is in daily use in the
   author's own house, once it is.

## Not planned

- A description for each model of meter. The device classes already say enough.
- Sensor Watch's groups as what chooses a panel's sensors. A group holds only what is
  watched, and nobody watches a kWh total.
- A dashboard strategy that adds a card for every meter by itself. Several devices on one
  card covers it.
- Limits for one sensor alone. They are by quantity, so that the phases share a scale.

## Agreed

- The name (owner, 2026-11-18), following the other three: `dash-bored-console-meters`,
  "Casa Mia Dash-Bored Console meter panel" in the card picker.
