// The cards that show part of the Console, each in an era of its own choosing or the one
// this browser last chose on the Console: one instrument (an entity's control), one room's
// chassis, and Sensor Watch's warning lamps. Each is the Console (host.ts) without its
// switch, telling its era's element which view to draw (panel.ts). Their editor is
// Home Assistant's ha-form.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, haForm } from "../../ha.ts";
import { Console, ERAS, type Config } from "./host.ts";
import type { Config as Told } from "./panel.ts";

export const INSTRUMENT = "dash-bored-console-instrument";
export const ROOM = "dash-bored-console-room";
export const LAMPS = "dash-bored-console-lamps";

// What an instrument can be: a device the panel has a control for, a scene, or a sensor it has a meter for.
const DEVICES = ["light", "switch", "cover", "lock", "climate", "media_player", "camera", "fan", "valve", "vacuum", "lawn_mower", "water_heater", "humidifier", "siren", "alarm_control_panel", "scene"];
// Left empty (the field can be cleared), the era is the one last chosen on the Console.
const ERA = { name: "era", selector: { select: { mode: "dropdown", options: ERAS.map((e) => ({ value: e.id, label: `${e.name}, the ${e.decade}` })) } } };
const SCHEMAS: Record<string, object[]> = {
  [INSTRUMENT]: [
    { name: "entity", required: true, selector: { entity: { filter: [{ domain: DEVICES }, { domain: "sensor", device_class: ["temperature", "humidity", "power"] }] } } },
    ERA,
    { name: "backing", default: true, selector: { boolean: {} } },
  ],
  [ROOM]: [{ name: "room", required: true, selector: { area: {} } }, ERA],
  [LAMPS]: [ERA],
};
const LABELS: Record<string, string> = { entity: "Entity", room: "Room", era: "Era", backing: "On the era's panel" };
const HELP: Record<string, string> = {
  entity: "A light, switch, cover, lock, thermostat, player, fan, camera, alarm or scene, or a temperature, humidity or power sensor.",
  era: "Left empty, the card is in the era last chosen on the Console in this browser, and follows its switch.",
  backing: "Off, the instrument stands on the dashboard's own card, lettered in its colours.",
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
    return { room: Object.keys(hass.areas ?? {})[0] ?? "" };
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

/** The editor for each of the three, by its schema. */
export class PartEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true }, _ready: { state: true } };
  hass?: Hass;
  _config?: Config;
  _ready = false;
  protected schema: object[] = [];

  setConfig(config: Config) {
    this._config = config;
  }

  connectedCallback() {
    super.connectedCallback();
    haForm().then(() => (this._ready = true));
  }

  render() {
    if (!this.hass || !this._config || !this._ready) return nothing;
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ backing: true, ...this._config }}
      .schema=${this.schema}
      .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
      .computeHelper=${(s: { name: string }) => HELP[s.name]}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        // An emptied field is no option at all, and the panel behind an instrument is its
        // default, so only its absence is written down.
        const config = Object.fromEntries(Object.entries(ev.detail.value).filter(([k, v]) => v !== undefined && v !== null && v !== "" && !(k === "backing" && v === true))) as Config;
        this._config = config;
        fire(this, "config-changed", { config });
      }}
    ></ha-form>`;
  }
}

/** Each card's editor: the one editor, with that card's schema. */
export const editor = (card: string) =>
  class extends PartEditor {
    protected schema = SCHEMAS[card];
  };
