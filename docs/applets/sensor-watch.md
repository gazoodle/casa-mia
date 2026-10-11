# Sensor Watch

Give any sensor bands of values, each with a level, so what needs doing or has gone wrong shows before the family notices.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

## What it's for

Home Assistant is great when it's all working. When it isn't, it's a pain, and only then
do you discover the things that have been in error for ages: a sensor unavailable since
the spring, an integration that never came back after an update, a battery long flat.

Has anyone else looked at 30 Hue bulbs and 20 Shelly switches and decided not to bother
with an automation for each one dropping out of range? Or built a dashboard panel for
the things that need attention, knowing all the while that something was missed? Sensor
Watch is for that. Tell it once what normal looks like, sensor by sensor or with a scan
of the whole house (it suggests the bands from history, and knows what a leak sensor or
a low battery means without being told), and it keeps watching, Home Assistant itself
included: its Recorder, and every integration that fails to set up.

It isn't a replacement for automations: it's a grown-up notification system that you
configure once. Automations are for taking action; Sensor Watch is the trigger that
starts them. On each change of level it fires an event, and its status, counts and List
service always say what's wrong, so you choose what happens next:

- **Tell someone:** a notification when anything becomes a task, a warning to the phone
  of whoever's home, critical to everyone.
- **Show it:** a panel of what needs attention on the wall tablets. Pair it with
  [garnish](../../README.md#garnish-for-every-dashboard), so the panel's heading
  disappears with it on a quiet day, rather than a proud *WARNINGS* over nothing.
- **Look into it:** hand the list to an AI agent (Home Assistant's AI tasks, say) to
  investigate what has gone wrong and why, before you even reach for the laptop.
- **Keep a to-do list for the house:** each task (top up the salt, change a battery, a
  filter due) added to a Home Assistant to-do list, and ticked off by itself when the
  sensor is nominal again.
- **Escalate:** a warning nobody has dealt with in a day becomes a text, through
  [Phone and SMS](phone-and-sms.md), which works even when the internet doesn't.
- **Say it with a light:** the hallway lamp glows amber while anything is a warning.
- **Put it over everything:** a critical comes up on every wall tablet, over whatever
  it's showing, with the [Over layer](../over-layer.md).
- **Brief the morning:** the voice assistant reads out the day's tasks at breakfast.
- **Watch the trends:** the counts are measurements, so Home Assistant's own history
  shows which integration falls over most often, and when.

Each sensor gets a level:

| Level | Means | Example |
|---|---|---|
| **Nominal** | All is well. | The salt is above 25%. |
| **Task** | Something to do, not a fault. | Top up the salt. |
| **Warning** | Worth a look. | The freezer is at −14 °C. |
| **Error** | Something is wrong. | The freezer is at −8 °C, or its sensor is unavailable. |
| **Critical** | Drop everything. | A leak sensor is wet. |

A sensor that goes **unavailable** is part of this, not an afterthought: by default it
counts as an error, because a sensor that has stopped reporting is often the first sign
of a broken integration or a flat battery.

## Why not Home Assistant's own features?

You could, and for one thing you should: a single freezer only needs a threshold helper.
Sensor Watch is for when there are fifty of them.

**Say it once, not fifty times.** Home Assistant often makes you repeat yourself: a
threshold helper per sensor, an alert per entity, an automation per device, the same
"unavailable" check copied for every bulb and switch. Sensor Watch lets you say it once:
what a leak sensor means is set for every leak sensor, a scan sets up a whole
integration's sensors in one go, and the Home Assistant itself checks cover every
integration.

**Finding them is half the battle.** The pieces exist, but they're scattered, and most
people never come across them:

| What you want | What already exists | Where it stops |
|---|---|---|
| A value outside a range | The [Threshold](https://www.home-assistant.io/integrations/threshold) helper | One sensor and one range each, on or off: no levels, nothing suggested, nothing in bulk. |
| Nagging until it's dealt with | The [Alert](https://www.home-assistant.io/integrations/alert/) integration | YAML only, an alert per entity. |
| Low batteries | Sbyx's [low battery blueprint](https://community.home-assistant.io/t/258664); [Battery Notes](https://codechimp.org/HA-Battery-Notes/) | Batteries only (both are excellent at that). |
| Missing or unavailable entities in your config | [Watchman](https://github.com/dummylabs/thewatchman); [Spook](https://spook.boo) | Your configuration, on demand, rather than live states. |
| Integrations that failed to set up | **Failed to set up** on Settings → Devices & services, and some Repairs | Seen only if you go and look. |
| Showing only what needs attention | [auto-entities](https://github.com/thomasloven/lovelace-auto-entities), conditional cards | A display: it doesn't know what normal is. |

**Point and click, not expert Home Assistant.** Doing all of this natively without
repeating yourself is possible, but it takes expert skills: labelling every entity, then
templates that read the labels (`label_entities`), loops with a `namespace` to pick out
the ones in trouble, the `this` trick to count them, a second template for every extra
level, and `for:` on every trigger so a blip doesn't count. Sensor Watch is mostly point
and click: scan, tick, accept, and one automation on its event.

If one of these is all you need, use it. Sensor Watch puts them in one place, configured
once: levels (a task isn't a critical), normal suggested from history, what a sensor
means known from its device class, a whole house scanned and filtered rather than one
entity at a time, Home Assistant's own health in the same picture, and one event and one
service to hang every automation on.

## Better together

Sensor Watch tells; the rest of Casa Mia shows, and only when there's something to show:

- **The integration's summary sensors** (Status, Tasks, Warnings, Errors, Critical,
  Problem) are what a dashboard keys on: a card's visibility, a badge, a colour. One
  entity says whether anything needs attention, whatever the size of the house.
- **[Tablet Layout](../tablet-layout.md):** a panel on an edge of the wall tablet's screen
  for what needs attention, sized to its cards, and hidden when they are.
- **[Garnish](../../README.md#garnish-for-every-dashboard):** the panel's heading is garnish,
  so it never holds the panel open on its own. Things go wrong, the panel and its heading
  appear; they're dealt with, and the panel goes, gap and all: no proud *WARNINGS* over
  nothing.
- **[The Over layer](../over-layer.md):** a critical comes up over whatever the tablet is
  showing, and goes when it's sorted.
- **The Home tile** in the Casa Mia panel shows the house's health at a glance: the
  worst level, the counts and the worst culprit.

## Switching it on

1. Turn on **Sensor Watch** in the app's Configuration tab (Settings → Apps → Casa Mia →
   Configuration) and save. The app restarts.
2. Add the **Casa Mia Sensor Watch** integration. Home Assistant offers it under
   **Discovered** in Settings → Devices & services; or add it from **+ Add integration**.
   It uses the Casa Mia integration's connection to the app.
3. Open **Sensor Watch** in the Casa Mia panel and choose what to watch.

## On the page

### Watched sensors

Every watched sensor, its level now and its value, with a search and a level filter so a
house with hundreds of them stays manageable. **Edit** changes a sensor's bands;
**Stop watching** removes it.

The list is live: a value or level changes on the page the moment Home Assistant has it
(the app holds a subscription, as a dashboard does). A level waits out its hold-off
first, so set it to 0 while trying a sensor out.

### Watch an entity

Any entity can be watched: a sensor, but also an `input_number` you type a reading into
(a pool's pH from a test strip), a `number`, a `switch` that should stay on, a `select`.
How it's watched follows its state: a number gets bands, `on` and `off` get on/off, and
anything else exact states.

Search for it by name, entity id or its device's name (every word, in any order), or
narrow the list by **domain**, **area**, **label**, **integration**, **device** (only
those with entities matching the other filters, so choosing ESPHome lists only ESPHome
devices), **device class** or kind (numeric, on/off, or states). Pick one, and Sensor
Watch reads its history (30 days unless you choose otherwise) and suggests its bands:

- **Numeric sensors:** the history's spread gives the nominal band, rounded outwards to a
  tidy step, with a warning band either side and error beyond. Values far outside the
  rest (more than three standard deviations from the mean) are set aside and listed: they
  may be incidents worth a look, and the suggestion assumes they were. Change any band,
  its level and its message (the message is what a task or a warning says, such as "Top
  up the salt") before saving. **+ Below** inserts a band after one, spanning the gap to
  the next; bands are kept in order of their From. A message may be up to 255
  characters, but past 80 notifications and cards may cut it short (the page shows
  the count once you pass 80). Saving refuses a From or To that isn't a number (use a
  point for decimals) and bands that overlap, and asks first when a range between two
  bands is left uncovered.
- **On/off sensors:** the state it spends most of its time in is nominal; the other is a
  warning unless you choose another level.
- **Exact states:** for a sensor whose state should be one exact thing rather than within
  a range (an alarm number that should be `0`, a washing machine that should be `idle` or
  `standby`), and for text and enum sensors, which have no range at all. List the
  nominal states; anything else gets one level and a message. Numbers compare as numbers,
  so `0` matches `0.0`. A numeric sensor offers **Bands (a range)** or **Exact states**;
  the states it has spent most of its time in are shown (an enum's own states, for an
  enum), to tick into the list.

**By what it is.** Some sensors say what they mean, so Sensor Watch sets them up by
their kind and device class rather than their history (change anything you like):

| What | Nominal | Otherwise |
|---|---|---|
| Leak, smoke, gas, carbon monoxide, safety | off | critical |
| Problem | off | error |
| Connectivity | on (connected) | error |
| Tamper | off | warning |
| Low battery (on/off) | off | task: Replace the battery |
| Door, window, garage door, opening | closed | task |
| Battery (%) | 20 and above | task below 20, warning below 5 |
| Covers (windows, blinds, garage doors) | closed | task |
| Locks | locked | task (unlocked); error when jammed |
| Updates | none waiting | task: Update available |
| Vacuums and mowers | docked, working, returning, paused | error |
| Alarm panels | disarmed, armed, arming, pending | warning; critical when triggered |

Leak, smoke, gas, carbon monoxide, safety and alarm panels have no hold-off: they count
the moment they change. Everything else waits 60 seconds by default.

Valves have no fixed meaning (a water main is usually open, a garden valve closed), so
they go by their history. A scan takes the sensors with a meaning without reading any
history, so they come through even when history can't be read.

In **Exact states**, a state can also have a level and message of its own (**+ A state
with its own level**): a lock is a task when unlocked but an error when jammed.

Sensors with long-term statistics (most measurements) are read from them, which Home
Assistant keeps for good. Others are read from their state history, which Home
Assistant keeps for 10 days by default, so a 30-day ask may get less; the page says
from when.

Each sensor also has:

- **Outside every band:** the level of a value no band covers (an error by default).
- **When unavailable:** a level, or **Ignore** to have no opinion while it is.
- **Hold-off:** how long a new level must last before it counts (60 seconds by default),
  so a blip, or Home Assistant starting up, doesn't raise the alarm.

### Profiles

A profile is a set of levels said once for many sensors: twenty plugs on the same mains
want the same bands (critical below 207 V, a warning below 216 V), not twenty slightly
different suggestions. Make one in the **Profiles** section with **+ New profile** (a
name, then its bands, on/off or exact states), or, in a sensor's editor, **Save as a new
profile** makes its levels a profile it then follows; **Follows** picks a profile for it (or its own levels again).
Editing a follower's levels changes the profile, and so every sensor that follows it,
after asking. A number can follow a bands or an exact-states profile; on/off and exact
states only their own kind.

To have many follow one at once: **Apply to…** on the profile lists the sensors of a kind
it fits, watched or not, to tick (those not watched yet start being watched); in **Scan
my house**, choose **Use the profile … for the ticked**; or, on the watched list, filter
to them and choose **Follow a profile** under it.

The **Profiles** section lists each with how many follow it: tap **N following** to see
them in the watched list. **Edit** changes its name and levels (every follower with it);
**Delete** removes it (its followers keep a copy of its levels as their own).

**From the library…** offers profiles that ship with Casa Mia, each with what it's for
and where its numbers come from: UK mains voltage (current law, 216.2–253 V, and the
ENA's 2026 proposal, 207–253 V), UK grid frequency (49.5–50.5 Hz), pool or hot tub pH
(7.2–7.8) and battery percentage. Tick the ones you want. **Export** saves all your
profiles as a JSON file to share; **Import…** takes one (yours, or someone else's). A
profile with the name of one you have replaces its levels, so its followers change
with it: the import starts those unticked, and says so.

### Scan my house

Suggest bands for everything that isn't watched yet, at once: narrow it by area,
label, integration, device or device class, or scan everything. Without a **domain**, a scan
looks at sensors, binary sensors, updates, covers, locks, valves, vacuums, mowers and alarm panels, not
every light, switch and helper; choose a domain to scan others (all your `number`s, say). A scan reads 500 sensors a
round, and the page says how many remain; **Scan the next 500** carries on where it
stopped. Tick the suggestions you want and press **Watch the ticked**: nothing is
watched until you accept it.

## In Home Assistant

The **Sensor Watch** device has:

- **Status:** the worst level now (nominal, task, warning, error or critical). Its
  attributes hold `watching` (how many sensors) and, for each level, the ten longest
  standing culprits (`task_list`, `warning_list`, `error_list`, `critical_list`: each
  with its entity, name, value, message and since when).
- **Tasks**, **Warnings**, **Errors** and **Critical:** how many sensors are at each level.
- **Problem:** on while any sensor is at warning or worse (a task alone isn't a problem).

### Home Assistant's own health

Sensor Watch also watches Home Assistant itself, counted like any watched sensor (in the
status, the counts, the problem sensor, the event and the list service), so it never
says all is well while Home Assistant is broken:

- **Recorder** and **History** not running: **critical**. Without them there is no
  history or statistics at all (Home Assistant's own History panel and graphs stop too).
  A common cause is the Recorder's database being out of reach when Home Assistant
  starts (a database on another machine that was down): the Recorder doesn't try again
  by itself, so fix the database, then restart Home Assistant.
- An **integration that has failed to set up** (setup error, retrying, migration error,
  or not loaded), for more than five minutes: **error**, named by its title and
  integration, with Home Assistant's reason. Disabled integrations don't count. When it
  recovers, the event says so (level nominal) and it leaves the list.

A discovery you told Home Assistant to **Ignore** is kept as an entry that never loads,
by design, so it never counts.

The page's **Home Assistant itself** section lists these rows, with a switch for each
kind (**The Recorder and History**, **Integrations that fail to set up**) and an
**Ignore** on each failing integration (one you know about and don't need, say); the
ignored ones are listed underneath, each with **Watch again**.

These are checked once Home Assistant has started, and each minute after. In the event
and the list service their `entity_id` is `homeassistant.recorder`,
`homeassistant.history` or `integration.<its entry id>`.

There is no entity per watched sensor: the summary, the event and the service below tell
the rest of Home Assistant which ones they are.

### The event

Each change of level (after its hold-off) fires `casa_mia_sensor_watch`, with
`entity_id`, `name`, `level`, `previous`, `value` and `message`:

```yaml
triggers:
  - trigger: event
    event_type: casa_mia_sensor_watch
    event_data:
      level: task
actions:
  - action: notify.mobile_app_ann_phone
    data:
      message: "{{ trigger.event.data.message or trigger.event.data.name }}"
```

### The List service

`casa_mia_sensor_watch.list` returns every watched sensor at the levels you ask for
(everything that isn't nominal by default), worst first, then longest standing; use it
with a response variable and loop over it in a template:

```yaml
actions:
  - action: casa_mia_sensor_watch.list
    data:
      levels: [warning, error, critical]
    response_variable: watch
  - action: notify.mobile_app_ann_phone
    data:
      message: >-
        {% for s in watch.sensors %}{{ s.name }}: {{ s.level }} ({{ s.value }})
        {% endfor %}
```

## Thanks

To **Erik Lemcke** for the [Salt Sentry](https://www.tindie.com/products/ErikLemcke/salt-sentry-water-softener-monitor/),
the little laser-ranging gadget that tells Home Assistant how much salt is left in the
water softener, and the example that gave Sensor Watch its **task** level.
