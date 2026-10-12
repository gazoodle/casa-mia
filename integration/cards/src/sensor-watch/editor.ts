// The Sensor Watch card's editor: its options, with HA's ha-form.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, haForm, withoutDefaults } from "../ha.ts";
import { COLUMNS, type Config, DEFAULTS, ICON_COLORS, LEVELS, SERVICE } from "./common.ts";

const SHOWN: Record<string, string> = { icon: "Icon", level: "Level", name: "Name", message: "Message", value: "Value (its state now)", since: "How long" };

/** The options, the groups (as Sensor Watch has them) offered by name. */
const schema = (groups: string[]) => [
  { name: "title", selector: { text: {} } },
  {
    name: "group",
    selector: {
      select: {
        mode: "dropdown",
        custom_value: true,
        options: [{ value: "", label: "Every watched sensor" }, ...groups.map((g) => ({ value: g, label: g }))],
      },
    },
  },
  { name: "levels", selector: { select: { multiple: true, mode: "list", options: LEVELS.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) })) } } },
  { name: "max", selector: { number: { min: 1, max: 100, mode: "box" } } },
  {
    name: "when_clear",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "hide", label: "Hide the card (in a Tablet Layout, its panel closes)" },
          { value: "message", label: "Say so" },
        ],
      },
    },
  },
  { name: "clear_message", selector: { text: {} } },
  // Chips to drag into order, as a tile's state content: a row shows them in this order.
  { name: "show", selector: { select: { multiple: true, reorder: true, options: COLUMNS.map((c) => ({ value: c, label: SHOWN[c] })) } } },
  { name: "icon_color", selector: { select: { mode: "dropdown", options: ICON_COLORS.map((c) => ({ value: c, label: COLOURS[c] })) } } },
];
const COLOURS: Record<string, string> = { level: "The level's colour", state: "Its state's colour, as a tile", none: "None" };
const LABELS: Record<string, string> = {
  title: "Title",
  group: "Group",
  levels: "Levels to list",
  max: "At most",
  when_clear: "When all is well",
  clear_message: "Its message",
  show: "Each row shows",
  icon_color: "Icon colour",
};
const HELP: Record<string, string> = {
  title: "Or none, and give its panel a garnish heading (it hides with the card).",
  group: "Only one group's members (from Casa Mia's Sensor Watch page), or every watched sensor.",
  show: "Drag to reorder; the name and message share a place, where the first of them is.",
};

export class SensorWatchEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true }, _ready: { state: true }, _groups: { state: true } };
  hass?: Hass;
  _config?: Config;
  _ready = false;
  _groups: string[] = [];
  private _asked = false;

  /** Sensor Watch's groups, asked once (its list service names them). */
  private async _askGroups() {
    if (this._asked || !this.hass) return;
    this._asked = true;
    try {
      const got: any = await this.hass.callWS({ type: "call_service", ...SERVICE, service_data: {}, return_response: true });
      this._groups = got?.response?.groups ?? [];
    } catch {
      // no Sensor Watch answering: typing a name still works
    }
  }

  setConfig(config: Config) {
    this._config = config;
  }

  connectedCallback() {
    super.connectedCallback();
    haForm().then(() => (this._ready = true));
  }

  render() {
    if (!this.hass || !this._config || !this._ready) return nothing;
    this._askGroups();
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ ...DEFAULTS, ...this._config }}
      .schema=${schema(this._groups)}
      .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
      .computeHelper=${(s: { name: string }) => HELP[s.name]}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        const next: Config = { ...this._config!, ...ev.detail.value };
        if (!next.group) delete next.group; // every watched sensor
        this._config = next;
        fire(this, "config-changed", { config: withoutDefaults(this._config!, DEFAULTS) });
      }}
    ></ha-form>`;
  }
}
