# Sensor Watch

Give any sensor bands of values, each with a level, so what needs doing or has gone wrong shows before the family notices.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

## What it's for

Home Assistant is great when it works; it's when it doesn't that the family gets
irritated. A sensor that has gone unavailable, a freezer creeping warm, a water softener
running out of salt: each one is in Home Assistant already, but nothing says it matters
until somebody notices. Sensor Watch gives each sensor you choose its normal range, and
a level for everything outside it:

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

### Add a sensor

Search for it by name, entity id or its device's name (every word, in any order), or
narrow the list by **area**, **label**, **integration**, **device** (only those with
sensors matching the other filters, so choosing ESPHome lists only ESPHome devices),
**device class** or kind (numeric, on/off, or text and enum). Pick one, and Sensor
Watch reads its history (30 days unless you choose otherwise) and suggests its bands:

- **Numeric sensors:** the history's spread gives the nominal band, rounded outwards to a
  tidy step, with a warning band either side and error beyond. Values far outside the
  rest (more than three standard deviations from the mean) are set aside and listed: they
  may be incidents worth a look, and the suggestion assumes they were. Change any band,
  its level and its message (the message is what a task or a warning says, such as "Top
  up the salt") before saving.
- **On/off sensors:** the state it spends most of its time in is nominal; the other is a
  warning unless you choose another level.
- **Exact states:** for a sensor whose state should be one exact thing rather than within
  a range (an alarm number that should be `0`, a washing machine that should be `idle` or
  `standby`), and for text and enum sensors, which have no range at all. List the
  nominal states; anything else gets one level and a message. Numbers compare as numbers,
  so `0` matches `0.0`. A numeric sensor offers **Bands (a range)** or **Exact states**;
  the states it has spent most of its time in are shown (an enum's own states, for an
  enum), to tick into the list.

Sensors with long-term statistics (most measurements) are read from them, which Home
Assistant keeps for good. Others are read from their state history, which Home
Assistant keeps for 10 days by default, so a 30-day ask may get less; the page says
from when.

Each sensor also has:

- **Outside every band:** the level of a value no band covers (an error by default).
- **When unavailable:** a level, or **Ignore** to have no opinion while it is.
- **Hold-off:** how long a new level must last before it counts (60 seconds by default),
  so a blip, or Home Assistant starting up, doesn't raise the alarm.

### Scan my house

Suggest bands for every sensor that isn't watched yet, at once: narrow it by area,
label, integration or device class, or scan everything. A scan reads 500 sensors a
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
