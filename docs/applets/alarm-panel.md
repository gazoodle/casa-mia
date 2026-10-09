# Alarm panel

The intruder alarm as a Home Assistant alarm panel: arm away, disarm, triggered.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

## What it's for

Show a physical intruder alarm as a Home Assistant alarm panel, with **Arm away**,
**Disarm** and **Triggered** states. The physical panel's sensors supply its actual
state; Home Assistant operates a toggle through ESPHome.

The control runs in the Casa Mia integration, so it continues while the Casa Mia app
restarts. Today it is specific to the author's home and alarm wiring: the sensor,
button and enabling-switch entity names are fixed in the integration. The plan is to
make these configurable so other homes can use it with their own compatible alarm
connections. That configuration is not available yet.

## Switching it on

1. Have the compatible ESPHome connection to your alarm working first: an armed
   sensor, a triggered sensor, a toggle button and its relay-enabling switch. The
   integration must be using the entities for your wiring; enabling the app option
   alone does not create them or adapt another alarm.
2. Turn on **Alarm panel** in Settings → Apps → Casa Mia → Configuration, save, and
   restart the app.
3. In Settings → Devices & services → Casa Mia, open the integration's options and
   set **Alarm code**. Until you set it, both arming and disarming are refused.
4. Add its alarm panel entity to a dashboard and verify the sensors against the
   physical panel before testing a control.

Turning the option off removes the alarm device and entity from the Casa Mia
integration. It does not disarm or change the physical panel.

## On the page

The Home page has an **Alarm panel** tile, not a separate settings page. It reminds you
that the control runs in the integration and the code is set in its options. The tile's
**Running** label describes the enabled feature; it is not a reading of the physical
alarm's armed state or proof that its wiring is working.

<img src="../screenshots/home.webp" alt="Casa Mia's home page, including the Alarm panel tile" width="800">

## In Home Assistant

The integration adds an alarm device named after **House name**, for example *Oak Tree
alarm*, and its alarm control panel entity. It supports **Arm away** and **Disarm**,
requiring the configured numeric code for either action.

While changing state, the entity shows **Arming** or **Disarming** until the physical
sensors report the result. A triggered sensor takes priority over the armed sensor.
The control avoids pressing the toggle again when it already has the requested state.
There are no Arm home or Arm night modes in this implementation.

## Troubleshooting

This feature's setup messages are in Home Assistant's log, under the Casa Mia
integration, rather than the app's modem or module logs.

- **No alarm entity appears.** Check the app option and the Casa Mia integration.
  The integration logs `alarm panel is switched off in the app: not set up` or
  `alarm panel is switched on in the app: set up` when it loads.
- **Arming or disarming is refused.** “No alarm code is set” directs you to the
  integration's options. “Wrong alarm code” means the entered code did not match.
- **The tile is Running but the panel is not working.** Check the ESPHome entities and
  wiring. The app only reports the option; it does not test the physical alarm.
- **The entity stays Arming or Disarming.** Check whether the button operated and the
  physical state sensors updated. It waits for those sensors, not a fixed countdown.
- **It shows Disarmed when a sensor is missing.** Missing or unavailable sensors do not
  produce an explicit fault state here. Do not treat Disarmed as proof of a healthy
  connection; check the physical alarm and both source sensors.
