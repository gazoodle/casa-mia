// Casa Mia Clock's editor: its options in Home Assistant's own form.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, withoutDefaults } from "../ha.ts";
import { type Config, DEFAULTS } from "./common.ts";

const LABELS: Record<string, string> = {
  clock_style: "Style",
  time_format: "Hours",
  show_seconds: "Show seconds",
  time_zone: "Time zone",
  no_background: "No background",
};
const HELP: Record<string, string> = {
  time_zone: "As your profile: this device's zone, or the server's where your profile says so (Settings, Profile).",
  no_background: "Just the time, on whatever is behind the card.",
};

/** Every time zone this browser knows, for the list. */
const zones = (): string[] => (Intl as any).supportedValuesOf?.("timeZone") ?? [];

export class ClockEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  _config?: Config;

  setConfig(config: Config) {
    this._config = config;
  }

  render() {
    if (!this.hass || !this._config) return nothing;
    const select = (options: [string, string][]) => ({ select: { mode: "dropdown", options: options.map(([value, label]) => ({ value, label })) } });
    const schema = [
      { name: "clock_style", selector: select([["digital", "Digital"], ["analog", "Analogue"]]) },
      { name: "time_format", selector: select([["auto", "As your language has it"], ["24", "24-hour"], ["12", "12-hour"]]) },
      { name: "show_seconds", selector: { boolean: {} } },
      { name: "time_zone", selector: select([["", "As your profile"], ...zones().map((z): [string, string] => [z, z])]) },
      { name: "no_background", selector: { boolean: {} } },
    ];
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ ...DEFAULTS, ...this._config }}
      .schema=${schema}
      .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
      .computeHelper=${(s: { name: string }) => HELP[s.name]}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        this._config = withoutDefaults({ ...this._config, ...ev.detail.value }, DEFAULTS);
        fire(this, "config-changed", { config: this._config });
      }}
    ></ha-form>`;
  }
}
