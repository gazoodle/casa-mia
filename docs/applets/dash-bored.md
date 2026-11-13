# Dash-Bored

A dashboard that writes itself from the house Home Assistant already knows, in a style
you might enjoy looking at. The first style is the Gazette, which shows the house as a
newspaper.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

Dash-Bored is an integration of its own. It needs neither the Casa Mia app nor the Casa
Mia integration.

## Setting it up

Add **Dash-Bored** under **Settings → Devices & services → Add integration**. There is
nothing to fill in. A **Dash-Bored** entry appears in the sidebar for every user.

The page is built from your areas. Each area that has lights, switches, covers or locks
becomes a room, and those devices are what it reports on. Entities you have hidden, and
a device's configuration and diagnostic entities, are left out. If a room is missing,
give its devices an area in Home Assistant.

If your areas are on floors, the rooms are grouped under a heading for each floor, from
the lowest up, and the areas on no floor come last under **Elsewhere**. A device is named
without its room or its kind: "Kitchen Ceiling Light" in the kitchen is "Ceiling". The
page has no filter of its own yet, so a switch you don't want on it has to be hidden in
Home Assistant (the entity's settings, **Visible**).

## The Gazette

The page works out what is worth saying about the house and puts the most important
thing at the top:

| Story | When |
|---|---|
| A Sensor Watch alert | A watched sensor is above its normal level. The worst ones lead. |
| A door found unlocked | Any lock that is unlocked. |
| Devices not answering | Any shown device that is unavailable, with since when. |
| A sensor back to normal | For ten minutes after a Sensor Watch alert clears. |
| An appliance at work | A switch that is the only one on its device, where that device also has a power sensor reading 1 kW or more. |
| Lights left on | Any lights on. "Ablaze" when it is seven or more and at least half of them. |
| A cold room | A room more than 0.8° below its thermostat's target. |
| Power in use | Only if the card names a power sensor (see below). |
| The weather | The outside temperature, from a weather entity. |

Under the main story is a report on every room. Each underlined fact is a switch: press
"the counter light is out" and the light comes on. **The switchboard** at the side has
every device as a plain button, and **Notices** has your scenes.

A house with more than 30 devices is reported differently, because a sentence for each
device would run to many screens. The report then covers only what is on, open, unlocked
or not answering, and ends with a count of the rooms where nothing is. A room with more
than three lights lit has them as one fact, such as "five lights are lit"; press it and
those lights go out. More than three switches running in a room are given as a count,
which can't be pressed. The switchboard
still has every device, and is set in columns across the foot of the page.

Some stories have a button that puts them right, such as **Lock it** or **Lights out**.

### What your house is missing

**Corrections and clarifications** lists what Home Assistant has not been told about the
house and the page needs. It is not shown when nothing is missing.

| It lists | What to do |
|---|---|
| Devices in no area | Give the device an area, or hide it. Until then it is not on the page. |
| Devices sharing a name | Two devices in one room whose names shorten to the same thing. Rename one. |
| Rooms on no floor | Only in a house that has floors. Give the area a floor. |
| Rooms without a thermometer | Set the area's temperature sensor, or put its thermostat in the area. |

Each line is a count that opens into a list. Press a device to open its dialog, or a room
to open its area's settings.

### What a press will never do

A lock, a garage door or a gate is never operated by a press on a sentence or on the
switchboard, because a stray touch must not unlock the house. Pressing one opens Home
Assistant's own dialog. The same happens for a device that is not answering. The
**Lock it** button under an unlocked door does lock it.

### Two papers

The names in the line under the masthead choose the paper. The **Broadsheet** is sober
and the **Red-top** is not, and both are written from the same stories. Each browser
remembers its own choice.

### Sensor Watch

If you use [Sensor Watch](sensor-watch.md), a sensor that goes above its normal level is
breaking news: a banner across the top with the message you gave that sensor, and the
story placed by its level. A page opened later is still told of every alert that holds.
Dash-Bored works without Sensor Watch; there is then no breaking news.

### When something is wrong with the page itself

- If the connection to Home Assistant is lost, a red line says so and since when. What
  is shown below it is how things stood at that time.
- If Home Assistant refuses an action, a red line says which and why.

## As a dashboard card

The same page is a card, **Dash-Bored Gazette**. It wants room, so put it in a view of
type **Panel (single card)**.

```yaml
type: custom:dash-bored-gazette
style: tabloid            # optional: broadsheet or tabloid; fixes the paper for this card
power: sensor.house_power # optional: a whole-house power sensor, in W or kW
weather: weather.home     # optional: which weather entity gives the outside temperature
```

On a phone, or in a narrow column, the paper is a single column.

## Not built yet

- Dimming a light or part-opening a blind from the page.
- A detail view and history of Dash-Bored's own: for now the lock and garage door use
  Home Assistant's dialog.
- Thermostats, media players and cameras as devices in a room.
- Choosing which rooms and devices appear, and their order.
- Changing the wording, and other languages. The text is English only.
- More styles. The Gazette is the first.
