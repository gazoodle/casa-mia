# Phone and SMS (FONA)

Calls and texts through the FONA GSM module: a way in that needs no internet.

> **Maturity: Alpha.** Does its job every day in the author's house, but hasn't been tried in many others. Expect rough edges and changes. ([The levels](../README.md#maturity))

## What it's for

Reach Home Assistant by calling or texting a GSM module connected to the box over USB.
The phone path needs mobile coverage, but no internet connection. Home Assistant and
the Casa Mia app must still be running locally.

The Arduino hangs up a call and reports its number. Casa Mia checks calls and texts
against [People](people.md), then passes each to Home Assistant as **Authorised** or
**Intrusion**. Your automations decide what happens next; a permitted call does not
open a gate or operate anything by itself.

## Switching it on

This needs DIY hardware: an Arduino running the compatible FonaForHA sketch, an
Adafruit FONA GSM module, a working SIM and suitable power and antenna. It is not a
service you can enable using only the app; the build guide is still to come.

1. Connect the Arduino by USB to the Home Assistant box. Casa Mia looks for a single
   Arduino under its stable `/dev/serial/by-id/` address. There is no port picker yet.
2. Add the permitted numbers on **People**, including their Call and Text permissions.
3. Turn on **Phone and SMS (FONA)** in Settings → Apps → Casa Mia → Configuration,
   save, and restart the app.
4. Install the Casa Mia integration for its events, sensors, Reset button and Send text
   action. Wait for the Phone and SMS tile to show **Connected**.
5. Test a call and an exact `PING` text from a permitted number before relying on your
   automations.

## On the page

There is no separate Phone and SMS page yet. Its tile on [Home](home.md) shows:

- **Connected**, **Starting** or **Offline**, with an error when one is reported;
- **Signal**, in dBm and a quality description, or “not read yet”;
- **Last call** and **Last text**, with when they arrived and who sent them, or the
  intrusion reason. “None since start” means no event since this app started.

<img src="../screenshots/home.webp" alt="Casa Mia's home page, including the Phone and SMS status tile" width="800">

The app queues outgoing texts until the modem is ready. Queued is not the same as sent:
the log records the modem's success or failure separately.

## In Home Assistant

The **FONA** device provides **State**, **Signal** and **Signal quality** sensors,
**Call** and **Text** event entities, and a **Reset** button. Event types are
`authorised` or `intrusion`, with the number, known person's name, text message when
applicable, and refusal reason. Only let an automation perform a permitted action
when the event is authorised.

The raw event is `casa_mia_fona`, with `kind` (`call` or `text`) and an `authorised`
boolean. You can use it in an automation as well as the event entities.

**Send text** (`casa_mia.send_sms`) sends a message of one to 160 characters. For example:

```yaml
action: casa_mia.send_sms
data:
  number: "07700 900123"
  message: "The Barn lights are off."
```

### Testing with PING

Send exactly `PING`, in capitals. Each reply proves another part of the path:

- **PONG from Arduino:** the hardware received the text.
- **PONG from App:** the app received it; a known person's name is included.
- **PONG from Integration:** an authorised PING reached Home Assistant's integration.

The Arduino and app can reply to PING from an unauthorised number too. That does not
make the number authorised: its event is still an intrusion, and the integration
replies only to an authorised PING. Any further action or reply is up to your automation.

## Troubleshooting

Use Settings → Apps → Casa Mia → Log. It records calls, texts, authorisation verdicts
and outgoing message results. These include private names, numbers and messages;
remove them before sharing the log.

- **Offline: no Arduino in /dev/serial/by-id.** Check USB power, cable and whether the
  box can see the device. More than one matching Arduino is also refused; the log
  lists what it found. The app retries automatically, backing off up to a minute.
- **The port opens but Starting never becomes Connected.** `FONA modem not found;
  retrying in …` means the Arduino answered but its modem did not. Check the modem's
  wiring and power. `FONA ready` marks a successful start.
- **The connection drops.** `FONA offline: lost …` gives a serial error; `no answer to
  ALIVE?` means the Arduino stopped responding. Casa Mia reopens the port and retries.
- **PING gets the Arduino reply only.** Check the app's USB connection and state.
  **App reply but no Integration reply:** use People's number checker, then check
  the integration and Home Assistant's log for `PING from … not answered`.
- **A text is queued but not delivered.** Look for `FONA: text to … sent`, `failed`, or
  `FONA gave no OK/FAILED for …`. Check the signal, SIM and modem; a timeout gives no
  delivery confirmation. A Reset can restart the modem, but is not a delivery receipt.
- **A call or text is an intrusion.** Check the number and its permission on People.
  Withheld or unknown numbers are refused. A PONG reply alone does not prove permission.
