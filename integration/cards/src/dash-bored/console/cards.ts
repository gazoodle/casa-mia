// The cards that show part of the Console, each in an era of its own choosing or the one
// this browser last chose on the Console: one instrument (an entity's control), one room's
// chassis, Sensor Watch's warning lamps, and a meter panel (a chassis for each electricity
// meter: meters.ts). Each is the Console (host.ts) without its
// switch, telling its era's element which view to draw (panel.ts). Their editor is
// Home Assistant's ha-form (editor.ts).
import type { Hass } from "../../ha.ts";
import { editor as form } from "../editor.ts";
import { roomy } from "../room.ts";
import { Console, ERAS, type Config } from "./host.ts";
import { KINDS, SHOWN, metered } from "./meters.ts";
import type { Config as Told } from "./panel.ts";

export const INSTRUMENT = "dash-bored-console-instrument";
export const ROOM = "dash-bored-console-room";
export const LAMPS = "dash-bored-console-lamps";
export const METERS = "dash-bored-console-meters";

// What an instrument can be: a device the panel has a control for, a scene, or a sensor it has a meter for.
const DEVICES = ["light", "switch", "cover", "lock", "climate", "media_player", "camera", "fan", "valve", "vacuum", "lawn_mower", "water_heater", "humidifier", "siren", "alarm_control_panel", "scene"];
// Left empty (the field can be cleared), the era is the one last chosen on the Console.
const ERA = { name: "era", selector: { select: { mode: "dropdown", options: ERAS.map((e) => ({ value: e.id, label: `${e.name}, the ${e.decade}` })) } } };
// What a meter panel can show, as its editor words it.
const WORDS: Record<string, string> = { voltage: "Voltage", current: "Current", power: "Power", apparent_power: "Apparent power", power_factor: "Power factor", frequency: "Frequency", energy: "Energy registers" };
const SCHEMAS: Record<string, object[]> = {
  [INSTRUMENT]: [
    { name: "entity", required: true, selector: { entity: { filter: [{ domain: DEVICES }, { domain: "sensor", device_class: ["temperature", "humidity", "power"] }] } } },
    ERA,
    { name: "backing", default: true, selector: { boolean: {} } },
  ],
  [ROOM]: [{ name: "room", required: true, selector: { area: {} } }, ERA],
  [LAMPS]: [ERA],
  [METERS]: [
    { name: "devices", required: true, selector: { device: { multiple: true, entity: [{ domain: "sensor", device_class: [...KINDS] }] } } },
    ERA,
    { name: "show", selector: { select: { multiple: true, options: KINDS.map((k) => ({ value: k, label: WORDS[k] })) } } },
    { name: "limits", selector: { object: {} } },
  ],
};
const LABELS: Record<string, string> = { entity: "Entity", room: "Room", era: "Era", backing: "On the era's panel", devices: "Meters", show: "Show", limits: "Limits" };
const HELP: Record<string, string> = {
  entity: "A light, switch, cover, lock, thermostat, player, fan, camera, alarm or scene, or a temperature, humidity or power sensor.",
  era: "Left empty, the card is in the era last chosen on the Console in this browser, and follows its switch.",
  backing: "Off, the instrument stands on the dashboard's own card, lettered in its colours.",
  devices: "Each device that is an electricity meter: one with sensors for voltage, current, power or energy. A chassis is drawn for each.",
  show: `Left empty: ${SHOWN.map((k) => WORDS[k].toLowerCase()).join(", ")}. A sensor is of a phase when its name has L1, L2 or L3 in it.`,
  limits: "The ends of a scale, in volts, amps, watts, volt-amps or hertz, for example  voltage: {min: 200, max: 260}  and  current: {max: 32}. Left out, a scale is chosen from the readings.",
};

/** One of the three cards: the Console with no switch, and a view of its own. */
class Part extends Console {
  protected get _switched() {
    return false;
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 6, min_columns: 3 };
  }
}

export class Instrument extends Part {
  static getConfigElement() {
    return document.createElement(`${INSTRUMENT}-editor`);
  }

  /** A dimmable light, if there is one, so that a new card shows a knob at once. */
  static getStubConfig(hass: Hass) {
    const ids = Object.keys(hass.states);
    return { entity: ids.find((id) => id.startsWith("light.") && (hass.states[id].attributes.supported_color_modes ?? []).some((m: string) => m !== "onoff")) ?? ids.find((id) => DEVICES.includes(id.split(".")[0])) ?? "" };
  }

  protected _tell(config: Config): Told {
    return { entity: config.entity, backing: config.backing, view: "instrument" };
  }

  getGridOptions() {
    return { columns: 3, min_columns: 3 };
  }
}

export class RoomCard extends Part {
  static getConfigElement() {
    return document.createElement(`${ROOM}-editor`);
  }

  static getStubConfig(hass: Hass) {
    return { room: roomy(hass) };
  }

  // The survey keeps that room alone (house.ts `rooms`).
  protected _tell(config: Config): Told {
    return { rooms: config.room ? [config.room] : [], view: "room" };
  }
}

export class Lamps extends Part {
  static getConfigElement() {
    return document.createElement(`${LAMPS}-editor`);
  }

  protected _tell(): Told {
    return { view: "lamps" };
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }
}

export class MeterPanel extends Part {
  static getConfigElement() {
    return document.createElement(`${METERS}-editor`);
  }

  /** The first device that measures voltage and current, so that a new card shows a meter at once. */
  static getStubConfig(hass: Hass) {
    return { devices: metered(hass).slice(0, 1) };
  }

  protected _tell(config: Config): Told {
    return { devices: config.devices, show: config.show, limits: config.limits, view: "meters" };
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 3 };
  }
}

/** Each card's editor: the one editor (editor.ts), with that card's schema. The panel
 * behind an instrument is its default, so only its absence is written down. */
export const editor = (card: string) => form(SCHEMAS[card], LABELS, HELP, { backing: true });
