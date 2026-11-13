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

## The Gazette

The page works out what is worth saying about the house and puts the most important
thing at the top:

| Story | When |
|---|---|
| A Sensor Watch alert | A watched sensor is above its normal level. The worst ones lead. |
| A door found unlocked | Any lock that is unlocked. |
| Devices not answering | Any shown device that is unavailable, with since when. |
| A sensor back to normal | For ten minutes after a Sensor Watch alert clears. |
| An appliance at work | A switch whose device also has a power sensor reading 1 kW or more. |
| Lights left on | Any lights on. "Ablaze" when it is seven or more and at least half of them. |
| A cold room | A room more than 0.8° below its thermostat's target. |
| Power in use | Only if the card names a power sensor (see below). |
| The weather | The outside temperature, from a weather entity. |

Under the main story is a report on every room. Each underlined fact is a switch: press
"the counter light is out" and the light comes on. **The switchboard** at the side has
every device as a plain button, and **Notices** has your scenes.

Some stories have a button that puts them right, such as **Lock it** or **Lights out**.

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
