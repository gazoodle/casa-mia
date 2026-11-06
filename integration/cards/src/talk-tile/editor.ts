// The Talk tile's editor: HA's ha-form with HA's own selectors, so it reads as HA's tile
// editor does. What is left empty or at its default is left out of the YAML (common.ts:
// cleaned), so the editor and YAML round-trip.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { callSensors, commanders } from "../commander/common.ts";
import { type Config, DEFAULTS, HOLD_LOOKS, ICONS, LOOKS, cleaned } from "./common.ts";

const LOOK_NAMES = { talk: "Talk", ringing: "Ringing", hang_up: "Hang up", answered_elsewhere: "Answered elsewhere", hold: "Hold to talk", live: "Live" };
const TAP = { action: "fire-dom-event" }; // shown as the default; the card adds casa_mia_commander

const choices = (options: { value: string; label: string }[]) => ({ select: { mode: "list", options } });

/** Hold to talk takes no taps (the card reports the finger), so it has no Interactions,
 * and its own per-state keys; duplex is for an Answer tile only. */
const schema = (hass: Hass, hold: boolean) => [
  { name: "entity", required: true, selector: { entity: { include_entities: callSensors(hass) } } },
  { name: "commander", selector: { select: { mode: "dropdown", options: commanders(hass) } } },
  {
    name: "button",
    selector: choices([
      { value: "answer", label: "Answer: answers the call, and hangs up" },
      { value: "hold", label: "Hold to talk: your voice goes out only while held, on the device that answered in half duplex" },
    ]),
  },
  ...(hold
    ? []
    : [
        {
          name: "duplex",
          selector: choices([
            { value: "full", label: "Full duplex: your voice goes out as soon as you answer" },
            { value: "half", label: "Half duplex: answering opens the call silent, for a Hold to talk tile" },
          ]),
        },
      ]),
  {
    type: "grid",
    name: "",
    schema: [
      { name: "name", selector: { text: {} } },
      { name: "icon", selector: { icon: {} } },
    ],
  },
  { name: "color", selector: { ui_color: {} } },
  { type: "expandable", name: "colors", title: "Colour for each state", schema: (hold ? HOLD_LOOKS : LOOKS).map((name) => ({ name, selector: { ui_color: {} } })) },
  {
    type: "expandable",
    name: "icons",
    title: "Icon for each state",
    schema: (hold ? HOLD_LOOKS : LOOKS).map((name) => ({ name, selector: { icon: { placeholder: ICONS[name] } } })),
  },
  {
    type: "expandable",
    name: "",
    title: "Layout",
    flatten: true,
    schema: [
      { name: "vertical", selector: { boolean: {} } },
      { name: "hide_state", selector: { boolean: {} } },
      {
        name: "features_position",
        selector: { select: { mode: "dropdown", options: [{ value: "bottom", label: "Bottom" }, { value: "inline", label: "Inline" }] } },
      },
    ],
  },
  ...(hold
    ? []
    : [
  {
    type: "expandable",
    name: "",
    title: "Interactions",
    flatten: true,
    schema: [
      { name: "tap_action", selector: { ui_action: { default_action: TAP } } },
      { name: "icon_tap_action", selector: { ui_action: { default_action: TAP } } },
    ],
  },
      ]),
];

const LABELS: Record<string, string> = {
  entity: "Call sensor",
  commander: "Commander",
  button: "Button",
  duplex: "Talking",
  name: "Name",
  icon: "Icon",
  color: "Colour",
  vertical: "Vertical",
  hide_state: "Hide state",
  features_position: "Features position",
  tap_action: "Tap action",
  icon_tap_action: "Icon tap action",
  ...LOOK_NAMES,
};
const HELP: Record<string, string> = {
  entity: "The doorbell's Intercom talkback call sensor.",
  commander: "Only that Commander card talks. Empty: every Commander card on the page showing the doorbell.",
  name: 'Replaces "Talk", "Answer" or "Hold to talk". "Hang up", "Answered by …" and "Live" always show, as they say what is happening.',
  icon: "Empty: an icon for each state (below). Set: this one in every state.",
  color: "One colour in every state. Empty: the tile's own colouring, or a colour for each state (below).",
  tap_action: "Empty: Talk on or off for the doorbell's Commander card.",
  icon_tap_action: "Empty: the same as the tap action.",
};

export class TalkTileEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  _config?: Config;

  setConfig(config: Config) {
    this._config = config;
  }

  render() {
    if (!this.hass || !this._config) return nothing;
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ ...DEFAULTS, ...this._config }}
      .schema=${schema(this.hass, this._config.button === "hold")}
      .computeLabel=${(s: { name: string; title?: string }) => LABELS[s.name] ?? s.title}
      .computeHelper=${(s: { name: string }) => HELP[s.name]}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        this._config = cleaned(ev.detail.value);
        fire(this, "config-changed", { config: this._config });
      }}
    ></ha-form>`;
  }
}
