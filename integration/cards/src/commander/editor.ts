// The Camera Commander card's editor.
import { LitElement, css, html, nothing } from "lit";
import { fire, type Hass, LOOK, withoutDefaults as stripDefaults } from "../ha.ts";
import { type Config, LEAVE_AFTER, commanders } from "./common.ts";
import { MOTION } from "./motion.ts";
import { DUPLEX_CHOICES } from "./talk-rules.ts";

/** Each option's default: shown in the form, and never saved (so a default changed later
 * reaches every card that was left at it). */
const DEFAULTS: Record<string, unknown> = {
  tap_main: "more-info",
  route: "auto",
  away_sharpness: "balanced",
  live_main: true,
  talk_button: true,
  main_controls: false,
  sound_button: false,
  screen_button: false,
  duplex: "full",
  leave_after: LEAVE_AFTER,
  security_look: false,
  look_tint: LOOK.tint,
  look_strength: LOOK.strength,
  look_darkness: LOOK.darkness,
  ...MOTION,
};

/** The config as saved: the options left at their default dropped. */
export function withoutDefaults(config: Config): Config {
  return stripDefaults(config, DEFAULTS);
}

export class CommanderEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  _config?: Config;

  setConfig(config: Config) {
    this._config = config;
  }

  render() {
    if (!this.hass || !this._config) return nothing;
    const data = { ...DEFAULTS, ...this._config };
    const schema = [
      { name: "entity", selector: { select: { mode: "dropdown", options: commanders(this.hass) } } },
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
      { name: "talk_button", selector: { boolean: {} } },
      {
        name: "duplex",
        selector: {
          select: {
            mode: "list",
            options: DUPLEX_CHOICES,
          },
        },
      },
      { name: "security_look", selector: { boolean: {} } },
      { name: "look_tint", selector: { color_rgb: {} } },
      { name: "look_strength", selector: { number: { min: 0.5, max: 10, step: 0.5, mode: "slider" } } },
      { name: "look_darkness", selector: { number: { min: 0, max: 90, step: 1, mode: "slider", unit_of_measurement: "%" } } },
      { name: "leave_after", selector: { number: { min: 0, max: 120, step: 1, mode: "slider", unit_of_measurement: "s" } } },
      { name: "motion_dot", selector: { boolean: {} } },
      { name: "motion_colour", selector: { color_rgb: {} } },
      { name: "motion_size", selector: { number: { min: 4, max: 40, step: 1, mode: "slider", unit_of_measurement: "px" } } },
      { name: "motion_pulse", selector: { number: { min: 0, max: 5, step: 0.1, mode: "slider", unit_of_measurement: "s" } } },
      { name: "motion_linger", selector: { number: { min: 0, max: 300, step: 1, mode: "slider", unit_of_measurement: "s" } } },
      {
        name: "motion_corner",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "top-right", label: "Top right" },
              { value: "top-left", label: "Top left" },
              { value: "bottom-right", label: "Bottom right" },
              { value: "bottom-left", label: "Bottom left" },
            ],
          },
        },
      },
      {
        name: "tap_main",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "more-info", label: "Opens its more-info (live video)" },
              { value: "live", label: "Opens its page on the camera dashboard" },
              { value: "full", label: "Shows it full screen, with its controls" },
              { value: "none", label: "Nothing" },
            ],
          },
        },
      },
      { name: "main_controls", selector: { boolean: {} } },
      { name: "sound_button", selector: { boolean: {} } },
      { name: "screen_button", selector: { boolean: {} } },
    ];
    const labels: Record<string, string> = {
      entity: "Commander",
      tap_main: "A tap on the main camera",
      route: "The picture",
      away_sharpness: "Sharpness through Home Assistant",
      live_main: "Main camera as live video",
      talk_button: "Talk button",
      main_controls: "Its controls over the main camera",
      sound_button: "Sound button",
      screen_button: "Full screen button",
      duplex: "Mode",
      leave_after: "Picture kept running once out of sight",
      security_look: "Apply security look",
      look_tint: "Tint",
      look_strength: "Strength",
      look_darkness: "Darkness",
      motion_dot: "Show motion dot",
      motion_colour: "Colour",
      motion_size: "Size",
      motion_pulse: "Pulse",
      motion_linger: "Keep after motion",
      motion_corner: "Corner",
    };
    const fields = (...names: string[]) => schema.filter((field) => names.includes(field.name));
    const form = (schema: object[], className = "") => html`<ha-form
      class=${className}
      .hass=${this.hass}
      .data=${data}
      .schema=${schema}
      .computeLabel=${(s: { name: string }) => labels[s.name]}
      .computeHelper=${(s: { name: string }) =>
        s.name === "entity"
          ? "The commanders built on the Camera Commander page (each one's Main camera select)."
          : s.name === "security_look"
            ? "The pictures in monochrome, tinted, like a security control room: the picture, the main camera's live video and its caption (not the highlight)."
          : s.name === "route"
            ? "At home: this page reached Home Assistant over http at a home address (a private IP, a .local name). Through Home Assistant works anywhere you can sign in, at a little cost to Home Assistant."
            : s.name === "away_sharpness"
            ? "How sharp the picture is when it comes through Home Assistant (away from home): a 2x screen at Full is four times the bytes of Light. Direct at home it is always the screen's own."
            : s.name === "live_main"
            ? "The main camera plays as live video over the picture, through Home Assistant's WebRTC (this device decodes it; the box does not). Needs the Camera compositor's Live main camera switch on; a video that does not start gives way to the drawn picture."
            : s.name === "main_controls"
            ? "The main camera's page controls (a gate, a light) over it, as on its full screen: the edge, size and background set for it on the Cameras page, the wide or tall edge by the main camera's own shape."
            : s.name === "sound_button"
            ? "A Sound button with the main camera's controls (on its full screen, and over it when its controls are), to hear the camera. It goes back to off when the main camera changes, and the camera is not heard while you talk (the visitor is heard through Talk)."
            : s.name === "screen_button"
            ? "A Full screen button over the main camera: the whole commander takes the screen, with the browser's bars and Home Assistant's header gone. Tap it again to go back. It is not shown where the browser can't do it (Safari on an iPhone), and it has to be tapped again after the page reloads."
            : s.name === "talk_button"
            ? "A Talk button over a doorbell's live video (a camera with a Casa Mia Intercom call sensor, on an https page). Turn it off to use your own buttons: a tap_action of fire-dom-event with casa_mia_commander: {talk: toggle} does the same."
            : s.name === "motion_dot"
            ? "A small dot on a camera's tile while its motion sensor sees motion (the sensor Track motion uses), and for a while after; hover it for when."
            : s.name === "motion_pulse"
            ? "Seconds each pulse takes; 0: a steady dot."
            : s.name === "motion_linger"
            ? "Seconds the dot stays once the motion has stopped, so a short one is not missed. 0: it goes at once."
            : s.name === "leave_after"
            ? "Seconds the picture goes on once the card is out of sight (another page in Home Assistant, scrolled away), so coming back (the back button) finds it running; then it stops, and the box sends nothing more. 0: at once. Closing the app always stops it at once."
            : undefined}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        this._config = withoutDefaults({ ...this._config, ...ev.detail.value });
        fire(this, "config-changed", { config: this._config });
      }}
    ></ha-form>`;

    return html`
      <section aria-labelledby="main-heading">
        <h3 id="main-heading">Main camera</h3>
        ${form(fields("entity", "live_main", "tap_main", "main_controls", "sound_button", "screen_button"))}
      </section>
      <section aria-labelledby="security-heading">
        <h3 id="security-heading">Security look</h3>
        ${form(fields("security_look"))}
        ${data.security_look ? html`<div class="details">
          ${form(fields("look_tint"), "colour")}
          ${form(fields("look_strength", "look_darkness"), "adjustments")}
        </div>` : nothing}
      </section>
      <section aria-labelledby="motion-heading">
        <h3 id="motion-heading">Motion dot</h3>
        ${form(fields("motion_dot"))}
        ${data.motion_dot ? html`<div class="details">
          ${form(fields("motion_colour"), "colour")}
          ${form(fields("motion_size", "motion_pulse", "motion_linger", "motion_corner"), "adjustments")}
        </div>` : nothing}
      </section>
      <section aria-labelledby="talk-heading">
        <h3 id="talk-heading">Talking</h3>
        ${form(fields("talk_button", "duplex"))}
      </section>
      <section>
        ${form([{
          type: "expandable", name: "", flatten: true,
          title: "Connection and performance",
          schema: fields("route", ...(data.route === "direct" ? [] : ["away_sharpness"]), "leave_after"),
        }])}
      </section>`;
  }

  static styles = css`
    :host { display: block; }
    section { padding: 16px 0; }
    section + section { border-top: 1px solid var(--divider-color); }
    h3 { margin: 0 0 12px; font-size: var(--ha-font-size-m, 16px); }
    .details { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 16px; margin-top: 16px; }
    .colour { flex: 0 0 96px; width: 96px; }
    .adjustments { flex: 1 1 220px; min-width: 0; }
  `;
}
