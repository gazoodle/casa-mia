// The Heating Flow card's editor: every option in HA's ha-form, one fold per area, so nobody
// writes YAML. Sensors along a run are an ordered list of entities, in the order the water
// passes them; the card spaces them along the run.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, haForm, withoutDefaults } from "../ha.ts";
import { type Config, DEFAULTS } from "./common.ts";

const entity = (name: string, domain?: string[]) => ({ name, selector: { entity: domain ? { filter: { domain } } : {} } });
const entities = (name: string) => ({ name, selector: { entity: { multiple: true, reorder: true } } });
const pick = (name: string, options: [string, string][]) => ({ name, selector: { select: { mode: "dropdown", options: options.map(([value, label]) => ({ value, label })) } } });
const flag = (name: string) => ({ name, selector: { boolean: {} } });
const text = (name: string) => ({ name, selector: { text: {} } });
const fold = (name: string | undefined, title: string, schema: object[], icon: string) => ({ type: "expandable", ...(name ? { name } : {}), title, icon, schema });
const ON_OFF = ["binary_sensor", "switch", "input_boolean", "valve", "sensor"];

const floor = (n: number, title: string) =>
  fold(`floor_${n}`, title, [
    text("name"),
    pick("emitters", [["ufh", "Underfloor"], ["rad", "Radiators"]]),
    flag("mixed"),
    entity("supply", ["sensor"]),
    entity("return", ["sensor"]),
    entities("loops"),
    entities("rooms"),
    entities("loop_returns"),
  ], "mdi:floor-plan");

const SCHEMA = [
  text("title"),
  pick("view", [["system", "System"], ["heat_pump", "Heat pump"], ["rooms", "Rooms"]]),
  fold(undefined, "Look", [
    pick("pipes", [["outline", "Outline"], ["glass", "Glass"], ["conduit", "Conduit"], ["neon", "Neon"]]),
    pick("markers", [["chev", "Chevrons"], ["arrow", "Arrows"], ["bub", "Bubbles"]]),
    pick("colours", [["temp", "By temperature"], ["circuit", "By circuit"]]),
    pick("readouts", [["pill", "Pills on the pipe"], ["text", "Text beside the pipe"]]),
    flag("animations"),
    text("area_outside"),
    text("area_plant"),
    text("area_house"),
  ], "mdi:palette"),
  fold("source", "Source", [
    pick("type", [["borehole", "Borehole"], ["horizontal", "Horizontal ground loop"], ["air", "Air"], ["none", "None"]]),
    entity("outdoor", ["sensor"]),
    entity("pump"),
    entity("out", ["sensor"]),
    entity("ground", ["sensor"]),
    entity("in", ["sensor"]),
    flag("pvt"),
    entity("pvt_out", ["sensor"]),
    entity("pvt_valve", ON_OFF),
  ], "mdi:earth"),
  fold("heat_pump", "Heat pump", [
    text("label"),
    entity("priority"),
    entity("compressor"),
    entity("supply", ["sensor"]),
    entity("calculated", ["sensor"]),
    entity("return", ["sensor"]),
    entity("pump"),
    entity("power", ["sensor"]),
    entity("heat", ["sensor"]),
    entity("cop", ["sensor"]),
    entity("aux", ["sensor"]),
    entity("degree_minutes", ["sensor"]),
    entity("alarm"),
    entity("oil", ["sensor"]),
    fold("refrigerant", "Refrigerant", [
      entity("suction", ["sensor"]),
      entity("hot_gas", ["sensor"]),
      entity("liquid", ["sensor"]),
      entity("evaporating", ["sensor"]),
      entity("condensing", ["sensor"]),
      entity("reversing_valve", ON_OFF),
    ], "mdi:snowflake-thermometer"),
  ], "mdi:heat-pump"),
  fold("heating", "Heating runs", [entities("supply_plant"), entities("return_plant"), entity("house_supply", ["sensor"]), entity("house_return", ["sensor"])], "mdi:pipe"),
  floor(1, "Lowest floor"),
  floor(2, "Next floor up"),
  floor(3, "Top floor"),
  fold("dhw", "Hot water", [
    flag("enabled"),
    entity("coil_in", ["sensor"]),
    entity("coil_out", ["sensor"]),
    entities("tank"),
    entities("hot_plant"),
    entities("hot_house"),
    entity("loop_pump", ON_OFF),
    entities("loop_house"),
    entities("loop_plant"),
    entity("immersion"),
  ], "mdi:water-boiler"),
  fold("water", "Water", [
    flag("softener"),
    entity("salt", ["sensor"]),
    entity("salt_low", ON_OFF),
    flag("storage"),
    text("storage_label"),
    entity("inlet", ON_OFF),
    entity("level", ["sensor"]),
    entities("pumps"),
    entity("meter", ["sensor"]),
    entity("cold", ["sensor"]),
  ], "mdi:water"),
  fold(undefined, "Tap, hold and double tap", [
    { name: "tap_action", selector: { ui_action: { default_action: "more-info" } } },
    { name: "hold_action", selector: { ui_action: { default_action: "none" } } },
    { name: "double_tap_action", selector: { ui_action: { default_action: "none" } } },
  ], "mdi:gesture-tap"),
];

const LABELS: Record<string, string> = {
  title: "Title", view: "Opens on", pipes: "Pipes", markers: "Flow markers", colours: "Colours", readouts: "Readings", animations: "Enable animations",
  area_outside: "Outside area's name", area_plant: "Plant area's name", area_house: "House area's name",
  label: "Heat pump's name", storage_label: "Storage tank's name",
  type: "Kind", outdoor: "Outdoor temperature", pump: "Pump (speed or on/off)", out: "Out to the ground", ground: "Back from the ground",
  in: "Into the heat pump", pvt: "PVT panels", pvt_out: "PVT out", pvt_valve: "PVT valve (open: through the panels)",
  priority: "Priority (heating, hot water, off…)", compressor: "Compressor (frequency or on/off)", supply: "Supply", calculated: "Calculated supply",
  return: "Return", power: "Power in", heat: "Heat out", cop: "COP", aux: "Aux heater", degree_minutes: "Degree minutes", alarm: "Alarm",
  supply_plant: "Supply sensors in the plant room", return_plant: "Return sensors in the plant room",
  house_supply: "Supply arriving at the house", house_return: "Return leaving the house",
  name: "Name", emitters: "Emitters", mixed: "Mixed down (its own mixing valve)", loops: "Loop actuators", rooms: "Rooms", loop_returns: "Loop returns",
  suction: "Suction gas", hot_gas: "Hot gas", liquid: "Liquid", evaporating: "Evaporating", condensing: "Condensing", reversing_valve: "Reversing valve (on: defrost)", oil: "Compressor oil temperature",
  enabled: "Hot water tank", coil_in: "Coil in", coil_out: "Coil out", tank: "Tank sensors (top first)",
  hot_plant: "Hot sensors in the plant room", hot_house: "Hot sensors in the house", loop_pump: "Return loop pump",
  loop_house: "Return loop sensors in the house", loop_plant: "Return loop sensors in the plant room", immersion: "Immersion heater (power or on/off)",
  softener: "Softener", salt: "Salt level", salt_low: "Needs salt", storage: "Storage tank", inlet: "Storage inlet (open: filling)",
  level: "Storage level", pumps: "Storage pumps (one or two)", meter: "Mains flow meter", cold: "Mains temperature",
  tap_action: "Tap", hold_action: "Hold", double_tap_action: "Double tap",
};
const HELP: Record<string, string> = {
  animations: "Off: a still picture, with the flow markers standing on the pipes that flow. For low-powered tablets.",
  supply_plant: "In the order the water passes them; the card spaces them along the run.",
  return_plant: "In the order the water passes them, from the house back to the heat pump.",
  view: "The tab the card shows first.",
  loops: "One per underfloor loop or radiator valve, open when on.",
  rooms: "A thermostat (or temperature sensor) per room, in the same order as the loops: room 1 is on loop 1.",
  loop_returns: "Each loop's return temperature, in the same order. Without one, the floor's return.",
  hot_plant: "Along the hot run from the tank, in order.",
  loop_house: "Along the return loop from its far end, in order.",
  meter: "With a storage tank, a flow while it isn't filling is the hard tap.",
  priority: "Its state decides the diverter and which circuits flow.",
};

export class HeatingFlowEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true }, _ready: { state: true } };
  hass?: Hass;
  _config?: Config;
  _ready = false;

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
      .data=${{ ...DEFAULTS, ...this._config }}
      .schema=${SCHEMA}
      .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
      .computeHelper=${(s: { name: string }) => HELP[s.name]}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        this._config = { ...this._config!, ...ev.detail.value };
        fire(this, "config-changed", { config: withoutDefaults(this._config!, DEFAULTS) });
      }}
    ></ha-form>`;
  }
}
