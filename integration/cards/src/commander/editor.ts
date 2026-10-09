// The Camera Commander card's editor.
import { LitElement, html, nothing } from "lit";
import { fire, type Hass, LOOK } from "../ha.ts";
import { Config, LEAVE_AFTER, commanders } from "./common.ts";

export class CommanderEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  _config?: Config;

  setConfig(config: Config) {
    this._config = config;
  }

  render() {
    if (!this.hass || !this._config) return nothing;
    const schema = [
      { name: "entity", selector: { select: { mode: "dropdown", options: commanders(this.hass) } } },
      { name: "draft", selector: { boolean: {} } },
      {
        name: "route",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "auto", label: "Direct at home, through Home Assistant away" },
              { value: "direct", label: "Always direct (the box's LAN address)" },
              { value: "ha", label: "Always through Home Assistant" },
            ],
          },
        },
      },
      {
        name: "away_sharpness",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "full", label: "Full (the screen's own)" },
              { value: "balanced", label: "Balanced (1.5x)" },
              { value: "light", label: "Light (1x)" },
              { value: "saver", label: "Data saver (0.75x)" },
            ],
          },
        },
      },
      { name: "live_main", selector: { boolean: {} } },
      { name: "security_look", selector: { boolean: {} } },
      { name: "look_tint", selector: { color_rgb: {} } },
      { name: "look_strength", selector: { number: { min: 0.5, max: 10, step: 0.5, mode: "slider" } } },
      { name: "look_darkness", selector: { number: { min: 0, max: 90, step: 1, mode: "slider", unit_of_measurement: "%" } } },
      { name: "leave_after", selector: { number: { min: 0, max: 120, step: 1, mode: "slider", unit_of_measurement: "s" } } },
      {
        name: "tap_main",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "live", label: "Opens its live page" },
              { value: "more-info", label: "Opens its more-info" },
              { value: "none", label: "Nothing" },
            ],
          },
        },
      },
    ];
    const labels: Record<string, string> = {
      entity: "Commander",
      draft: "Show the draft",
      tap_main: "A tap on the main camera",
      route: "The picture",
      away_sharpness: "Sharpness through Home Assistant",
      live_main: "Main camera as live video",
      leave_after: "Picture kept running once out of sight",
      security_look: "Security look",
      look_tint: "Security look: tint",
      look_strength: "Security look: strength",
      look_darkness: "Security look: darker",
    };
    return html`<ha-form
      .hass=${this.hass}
      .data=${{
        tap_main: "live",
        route: "auto",
        away_sharpness: "balanced",
        live_main: true,
        leave_after: LEAVE_AFTER,
        security_look: false,
        look_tint: LOOK.tint,
        look_strength: LOOK.strength,
        look_darkness: LOOK.darkness,
        ...this._config,
      }}
      .schema=${schema}
      .computeLabel=${(s: { name: string }) => labels[s.name]}
      .computeHelper=${(s: { name: string }) =>
        s.name === "entity"
          ? "The commanders built on the Camera Dashboard page (each one's Main camera select)."
          : s.name === "security_look"
            ? "The pictures in monochrome, tinted, like a security control room: the picture, the main camera's live video and its caption (not the highlight)."
          : s.name === "route"
            ? "At home: this page reached Home Assistant over http at a home address (a private IP, a .local name). Through Home Assistant works anywhere you can sign in, at a little cost to Home Assistant."
            : s.name === "away_sharpness"
            ? "How sharp the picture is when it comes through Home Assistant (away from home): a 2x screen at Full is four times the bytes of Light. Direct at home it is always the screen's own."
            : s.name === "live_main"
            ? "The main camera plays as live video over the picture, through Home Assistant's WebRTC (this device decodes it; the box does not). Needs the Camera compositor's Live main camera switch on; a video that does not start gives way to the drawn picture."
            : s.name === "leave_after"
            ? "Seconds the picture goes on once the card is out of sight (another page in Home Assistant, scrolled away), so coming back (the back button) finds it running; then it stops, and the box sends nothing more. 0: at once. Closing the app always stops it at once."
            : s.name === "draft"
            ? "As saved on the Camera Dashboard page (Save draft), before it is deployed live: for trying changes out. Off: as deployed live."
            : undefined}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        this._config = ev.detail.value;
        fire(this, "config-changed", { config: this._config });
      }}
    ></ha-form>`;
  }
}
