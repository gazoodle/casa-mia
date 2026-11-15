// The Console: the house as a control panel, in the style of a decade. This element is
// the family's page and card. It shows one era's panel and carries the switch that
// chooses the era, as the Gazette carries its choice of paper. The choice is this
// browser's own, unless a card names its era. An era is an element built on panel.ts
// (Bakelite is console/bakelite.ts); one that is not built yet says so.
import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import type { Hass } from "../../ha.ts";
import type { Options } from "../house.ts";

export const CARD = "dash-bored-console";
const REMEMBERED = "dash-bored-era"; // this browser's choice

type Era = { id: string; name: string; decade: string; draw?: (hass: Hass, narrow: boolean, choice: TemplateResult | typeof nothing) => TemplateResult };
// The eras, in order (owner, 2026-11-14). A new one is its element, defined in index.ts,
// and its `draw` here; `choice` goes in the panel's slot for it.
export const ERAS: Era[] = [
  { id: "bakelite", name: "Bakelite", decade: "1950s", draw: (hass, narrow, choice) => html`<dash-bored-bakelite class="era" .hass=${hass} .narrow=${narrow}>${choice}</dash-bored-bakelite>` },
  { id: "nixie", name: "Nixie", decade: "1960s" },
  { id: "silverface", name: "Silverface", decade: "1970s", draw: (hass, narrow, choice) => html`<dash-bored-silverface class="era" .hass=${hass} .narrow=${narrow}>${choice}</dash-bored-silverface>` },
  { id: "bargraph", name: "Bargraph", decade: "1980s" },
  { id: "beige", name: "Beige", decade: "1990s" },
];
type Config = Options & { type?: string; era?: string };

export class Console extends LitElement {
  static properties = { hass: { attribute: false }, narrow: { type: Boolean }, _era: { state: true } };
  // The switch looks like none of the eras' own controls: it belongs to the family.
  static styles = css`
    :host { display: block; }
    .eras { position: relative; flex: none; width: 132px; height: 100px; margin-left: auto; color: #f4f0e4; font: 600 10px "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif; }
    /* The stops and the switch are named with .eras so that they outrank this reset. */
    .eras button { all: unset; position: absolute; cursor: pointer; }
    /* A rotary switch: five stops on an arc over the knob, each lettered with its decade. */
    .eras .stop { left: 50%; top: 58px; width: 24px; height: 16px; margin: -8px -12px; border-radius: 3px; text-align: center; line-height: 16px; letter-spacing: .05em; opacity: .65;
      transform: rotate(calc((var(--i) - 2) * 36deg)) translateY(-46px) rotate(calc((var(--i) - 2) * -36deg)); }
    .eras .stop.unbuilt { opacity: .4; }
    .eras .stop[aria-checked="true"] { opacity: 1; background: #111; box-shadow: 0 0 0 1px #777; }
    .eras .switch { left: 50%; top: 58px; width: 50px; height: 50px; margin: -25px; border-radius: 50%; background: radial-gradient(circle at 34% 28%, #5a5a5a, #111 70%);
      box-shadow: 0 5px 7px rgba(0,0,0,.6), 0 0 0 2px #000, 0 0 0 3.5px #8f8f86; }
    .switch span { position: absolute; inset: 0; transform: rotate(calc((var(--at) - 2) * 36deg)); transition: transform .25s; }
    .switch span::after { content: ""; position: absolute; left: 50%; top: -5px; width: 9px; height: 31px; margin-left: -4.5px; border-radius: 4.5px 4.5px 2px 2px;
      background: linear-gradient(90deg, #1a1a1a, #6a6a6a 45%, #1a1a1a); box-shadow: inset 0 4px 0 #f4f0e4, 0 1px 2px rgba(0,0,0,.6); }
    .stop:focus-visible, .switch:focus-visible { outline: 2px solid #f4f0e4; outline-offset: 2px; }
    .named { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-size: 9px; letter-spacing: .2em; text-transform: uppercase; }
    /* In Silverface the switch is of its time: a machined knob on an aluminium plate, with printed legends. */
    .eras.silverface { color: #141516; border-radius: 3px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      background: repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 3px), linear-gradient(180deg, #dfe1e3, #bfc2c5 55%, #d3d5d7);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 5px 10px rgba(0,0,0,.45); }
    .eras.silverface .stop { opacity: .7; }
    .eras.silverface .stop[aria-checked="true"] { opacity: 1; background: #141516; color: #f4f4f2; box-shadow: none; }
    .eras.silverface .switch { background: conic-gradient(from 25deg, #f4f5f6, #9a9ea2 11%, #e6e8e9 24%, #84888c 38%, #f1f2f3 51%, #9da1a5 63%, #e2e4e6 76%, #868a8e 89%, #f4f5f6);
      box-shadow: 0 6px 8px rgba(0,0,0,.4), 0 0 0 1px rgba(0,0,0,.6), 0 0 0 4px #b2b5b8, 0 0 0 5px rgba(0,0,0,.45); }
    .eras.silverface .switch span::after { top: 3px; width: 3px; height: 20px; margin-left: -1.5px; border-radius: 1px; background: #141516; box-shadow: none; }
    .eras.silverface .named { font-weight: 700; letter-spacing: .18em; }
    .unbuilt-era { box-sizing: border-box; display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; min-height: 240px; padding: 18px 22px; background: #2b2d30; color: #f4f0e4;
      font: 15px/1.4 "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif; }
    :host([panel]) .unbuilt-era { min-height: 100vh; }
    .plate { padding: 10px 16px; border-radius: 3px; background: #111; box-shadow: 0 0 0 1px #777; overflow-wrap: anywhere; }
    .plate b { display: block; font-size: 18px; letter-spacing: .2em; text-transform: uppercase; }
  `;
  hass?: Hass;
  narrow = false;
  _era = ERAS[0].id;
  private _config: Config = {};
  private _page = false;
  private _handed?: Element; // the era's element that has been told whether it is a page or a card

  static getStubConfig() {
    return {};
  }

  setConfig(config: Config) {
    this._config = { ...config };
    this._handed = undefined;
    this._recall();
  }

  getCardSize() {
    return 12;
  }

  getGridOptions() {
    return { columns: "full" };
  }

  /** Set when the element is Dash-Bored's page, not a card. */
  set panel(_panel: unknown) {
    this._page = true;
    this.toggleAttribute("panel", true);
    this.requestUpdate();
  }

  connectedCallback() {
    super.connectedCallback();
    this._recall();
  }

  /** Which era: the card's own, else the one this browser last chose. */
  private _recall() {
    let era = this._config.era;
    try {
      era ??= localStorage.getItem(REMEMBERED) ?? undefined;
    } catch {
      // No storage here (a private window): the first era, then.
    }
    if (ERAS.some((e) => e.id === era)) this._era = era!;
  }

  private _turn(era: string) {
    this._era = era;
    try {
      localStorage.setItem(REMEMBERED, era);
    } catch {
      // Not remembered, that is all.
    }
  }

  /** An era's element is a page or a card as this one is: it is told once, when it is first drawn. */
  protected updated() {
    const era = this.renderRoot.querySelector<Element & { setConfig(config: Config): void }>(".era");
    if (!era || era === this._handed) return;
    this._handed = era;
    if (this._page) era.toggleAttribute("panel", true);
    else era.setConfig(this._config);
  }

  render() {
    if (!this.hass) return nothing;
    const at = Math.max(0, ERAS.findIndex((e) => e.id === this._era));
    const era = ERAS[at];
    // A card that names its era has no switch: it is that era's panel and no other.
    const choice = (slot: string) =>
      this._config.era
        ? nothing
        : html`<div slot=${slot} class="eras ${era.draw ? era.id : ""}" role="radiogroup" aria-label="The Console's era" style="--at: ${at}">
            ${ERAS.map((e, i) => html`<button class="stop ${e.draw ? "" : "unbuilt"}" role="radio" aria-checked=${i === at} aria-label="${e.name}, the ${e.decade}${e.draw ? "" : ": not built yet"}" style="--i: ${i}" @click=${() => this._turn(e.id)}>${e.decade.slice(2, 4)}</button>`)}
            <button class="switch" aria-label="The next era" @click=${() => this._turn(ERAS[(at + 1) % ERAS.length].id)}><span></span></button>
            <span class="named">${era.name}</span>
          </div>`;
    if (era.draw) return era.draw(this.hass, this.narrow, choice("era"));
    return html`<div class="unbuilt-era">
      <div class="plate"><b>${era.name}</b>The Console of the ${era.decade} is not built yet. Turn the switch to another era.</div>
      ${choice("")}
    </div>`;
  }
}
