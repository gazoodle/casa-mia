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

The page is built from your areas. Each area that has lights, switches, covers, locks, thermostats,
media players or cameras becomes a room, and those devices are what it reports on. Entities you have hidden, and
a device's configuration and diagnostic entities, are left out. If a room is missing,
give its devices an area in Home Assistant.

If your areas are on floors, the rooms are grouped under a heading for each floor, from
the lowest up, and the areas on no floor come last under **Elsewhere**. A device is named
without its room or its kind: "Kitchen Ceiling Light" in the kitchen is "Ceiling". To
keep a device off the page, give it the label **Dash-Bored hide** (see What your house is
missing).

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

### Dimming a light, and part-opening a blind

A light that can be dimmed, or a blind that can be set to a position, has its level as a
separate press. In the report the level is underlined twice (highlighted in the red-top):
press "40 per cent" and a scale opens under the sentence. On the switchboard such a device's
tab shows its level and opens its clipping (see below), which has the same scale. That is how to
bring a light that is off on at a low level.

Over the scale is a readers' poll: a question, such as "Readers are invited to say whether
the ceiling light is too bright", and a vote each way. Each vote moves the level by 10 per
cent, which is easier than the handle on a wall tablet. The scale is for a large change.

Slide the handle, vote, or use the arrow keys, and the level is sent when you stop. The figure
beside the scale is what the device itself reports. Until it reports that it has moved,
the level you asked for is shown after an arrow, as in "40 per cent → 70". If that stays,
the device has not done as it was asked.

A garage door or a gate has no scale, for the reason given under
[What a press will never do](#what-a-press-will-never-do).

### Photographs

A camera that can tell what it has seen gets its picture in the paper. When one of its
detections fires, Dash-Bored takes a still from the camera at that moment and the Gazette
prints it with a headline for ten minutes. Pressing the photograph opens the camera.

Each camera has one story at a time: the most pressing thing it saw in the last ten
minutes. If a camera reports an animal just after a person, the person stays.

A column called **Thirty minutes ago** (**Rewind** in the red-top) lists the latest ten
sightings of the last half hour, newest first, each with its time, its camera and a small
photograph. Pressing one opens the camera.

These detections take a photograph: somebody at the doorbell, a person, a vehicle, an
animal, and a smoke or carbon monoxide alarm heard by the camera. A doorbell story is near
the top of the page, a person is above the lights that are left on, and a vehicle or an
animal is lower down. Plain motion takes no photograph, because in a house with several
cameras it would fill the paper.

It works with any camera whose detections are binary sensors or event entities on the
same device as the camera entity, which is how UniFi Protect and Frigate set theirs up. The sort of detection is told
from English words in the detection's name.

If you run the Casa Mia app with Camera Commander, Dash-Bored first asks it for the
picture. Camera Commander is already fetching the cameras that its commanders show, at
their streams' full size, so a picture it has from the last five seconds is used and the
camera is not asked again. A camera that no commander being watched shows has no picture
that new, and is asked directly. Home Assistant's log says where each photograph came
from.

A UniFi Protect camera gets one thing more. Protect makes its own thumbnail of each
detection, choosing the frame itself. The sighting is printed at once with the photograph
taken at that moment, and Protect's thumbnail replaces it when Protect has it, within 15
seconds. If Protect has none, the first photograph stays.

Each such camera gets one new entity on its device, an image called **Last sighting**. It
holds the latest photograph and the sort of sighting, and you can use it on any other
dashboard. Its state is when the photograph last changed, and its `seen` attribute is when
the camera saw it. Things to know:

- The photographs are kept in memory: up to 40 sightings from the last half hour. After
  Home Assistant restarts there are none until the next detection.
- Two detections on one camera within five seconds share one photograph.
- If the camera does not answer, the story is printed without a photograph, and the reason
  is in Home Assistant's log.
- A camera added later gets its entity when Dash-Bored is next reloaded.
- The label **Dash-Bored hide** on the camera, its device or its area keeps its sightings
  off the page.

### What your house is missing

**Corrections and clarifications** lists what Home Assistant has not been told about the
house and the page needs. It is not shown when nothing is missing.

| It lists | What to do |
|---|---|
| Devices in no area | Give the device an area, or hide it. Until then it is not on the page. |
| Suspected plumbing | Things that by their names are settings or indicators, not devices in a room: a status LED, a relay, a screensaver switch. A guess from the name, in English only. See below. |
| Devices sharing a name | Two devices in one room whose names shorten to the same thing. Rename one. |
| Rooms on no floor | Only in a house that has floors. Give the area a floor. |
| Rooms without a thermometer | Set the area's temperature sensor, or put its thermostat in the area. |

Each line is a count that opens into a list. Press a device to open its dialog, or a room
to open its area's settings.

Home Assistant already has a way to say that an entity is a setting: its category,
configuration or diagnostic. Dash-Bored leaves those out, and so do Home Assistant's own
automatic dashboards. An integration sets the category, and it can't be changed in Home
Assistant's settings, so the suspected plumbing is grouped by integration:

- **ESPHome:** add `entity_category: config` (or `diagnostic`) to the light or switch in
  the device's YAML.
- **KNX:** add `entity_category: config` to the entity in the KNX YAML.
- **Anything else:** give it the label **Dash-Bored hide**, which Dash-Bored makes when it
  is set up. The label works on an entity, on a device (all its entities) and on an area
  (everything in it), and takes them off Dash-Bored's pages only. Hiding the entity in
  Home Assistant takes it off every dashboard.

### What a press will never do

A lock, a garage door or a gate is never operated by a press on a sentence or on the
switchboard, because a stray touch must not unlock the house. Pressing one opens its
clipping, where unlocking or opening takes two presses: the button changes to **Press
again to confirm** for a few seconds. Locking and closing take one. A device that is not
answering opens its clipping too. The **Lock it** button under an unlocked door does lock
it.

### Thermostats, media players and cameras

These are devices in their rooms too, but a press on one in a sentence or on the
switchboard switches nothing: it opens the device's clipping, so that a stray touch
doesn't stop the heating or the music.

- **A thermostat** is told with its target, as in "the thermostat is set to 21°". The
  target is a level like a light's: its poll asks whether it is set too warm, and each
  vote moves it half a degree. Its clipping gives its own reading, and has a button that
  turns it off or on. A thermostat that holds a range, not a single target, is told as
  "at work" and has no scale.
- **A media player** is told with its volume, as in "the player is playing at 40 per
  cent". Its poll asks whether it is too loud, in steps of five. Its clipping says what is
  playing, and its button pauses or plays.
- **A camera** is on the switchboard, and in the report only if it stops answering. Its
  clipping shows its latest picture; **Home Assistant's own page** has the live view.

### A device's clipping

Every device has a story of its own, laid over the page like a cutting. It opens from the
tab beside the device's button on the switchboard, and from a line about the device in
the late news.

The clipping says how the device stands and since when, and has a button that puts it the
other way. A light that can be dimmed or a blind that takes a position has its poll and
scale there. Under those is **The record**: a band for the last 24 hours, inked where the
device was on, open or locked, and its latest changes with their times. The record comes
from Home Assistant's history when the clipping is opened, and goes on as things happen.
Home Assistant's history keeps a blind's positions but not a light's brightness, so a
light's record is of when it was lit, and shows a dimming only if it happens while the
clipping is open.

**Home Assistant's own page** at the foot opens Home Assistant's dialog for the device,
for its settings. Escape, **Fold away** or a press outside the clipping closes it.

### Two papers

The names in the line under the masthead choose the paper. The **Broadsheet** is sober
and the **Red-top** is not, and both are written from the same stories. Each browser
remembers its own choice.

### Personal

A column of announcements about the household, each with its time, newest first:

- **Comings and goings.** Each person's latest move: arrived home, left the house, or
  arrived at one of your zones. It is read from Home Assistant's person entities, so it
  needs people with a device tracker.
- **Songs.** With [Love it or Loathe it](love-or-loathe.md), each song somebody loves or
  loathes: "Ann wishes it known that “Night Train” by The Sleepers is greatly to their
  liking". A rating taken away is not announced.

An announcement stays for twelve hours and the column holds the latest eight. It is left
out while there is nothing to announce. A person with the label **Dash-Bored hide** is
left out of it.

Songs are kept in memory, so a restart of Home Assistant empties them. After a restart
Home Assistant also gives every person's state the time of the restart, so each is
announced as having arrived or left then.

The page is in the sidebar for every user, guests included, so this column tells anyone
who can open it who is at home.

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

The same page is a card, **Casa Mia Dash-Bored Gazette**. It wants room, so put it in a view of
type **Panel (single card)**.

```yaml
type: custom:dash-bored-gazette
style: tabloid            # optional: broadsheet or tabloid; fixes the paper for this card
power: sensor.house_power # optional: a whole-house power sensor, in W or kW
weather: weather.home     # optional: which weather entity gives the outside temperature
```

On a phone, or in a narrow column, the paper is a single column.

## Not built yet

- Choosing which rooms and devices appear, and their order.
- Changing the wording, and other languages. The text is English only.
- More styles. The Gazette is the first.
