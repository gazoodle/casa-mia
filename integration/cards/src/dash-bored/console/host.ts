// The Console: the house as a control panel, in the style of a decade. This element is
// the family's page and card. It shows one era's panel and carries the switch that
// chooses the era, as the Gazette carries its choice of paper. The choice is this
// browser's own, unless a card names its era. An era is an element built on panel.ts
// (Bakelite is console/bakelite.ts); one that is not built yet says so. The cards that
// show less of the panel (cards.ts) are this element too, without the switch.
import { LitElement, css, html, nothing } from "lit";
import { html as tagged, unsafeStatic } from "lit/static-html.js";
import { fire, type Hass } from "../../ha.ts";
import { picked } from "../family.ts";
import { CHOOSE } from "../shell.ts";
import type { Config as Told } from "./panel.ts";

export const CARD = "dash-bored-console";
const REMEMBERED = "dash-bored-era"; // this browser's choice

type Era = { id: string; name: string; decade: string; tag?: string };
// The eras, in order (owner, 2026-11-14). A new one is its element, defined in index.ts,
// and named by its `tag` here.
export const ERAS: Era[] = [
  { id: "bakelite", name: "Bakelite", decade: "1950s", tag: "dash-bored-bakelite" },
  { id: "nixie", name: "Nixie", decade: "1960s", tag: "dash-bored-nixie" },
  { id: "silverface", name: "Silverface", decade: "1970s", tag: "dash-bored-silverface" },
  { id: "bargraph", name: "Bargraph", decade: "1980s", tag: "dash-bored-bargraph" },
  { id: "beige", name: "Beige", decade: "1990s", tag: "dash-bored-beige" },
];
export type Config = Told & { era?: string; room?: string };

export class Console extends LitElement {
  static properties = { hass: { attribute: false }, narrow: { type: Boolean }, _era: { state: true } };
  // The switch looks like none of the eras' own controls: it belongs to the family.
  static styles = css`
    :host { display: block; }
    /* In the card picker, a window on the top of the specimen (family.ts PAGE). */
    :host([sample]) { max-height: 400px; overflow: hidden; }
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
    /* On Beige's pale panel the lettering is dark, but for the stop that is chosen, which is on black. */
    .eras.beige { color: #3a362c; }
    .eras.beige .stop[aria-checked="true"] { color: #f4f0e4; }
    .unbuilt-era { box-sizing: border-box; display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; min-height: 240px; padding: 18px 22px; background: #2b2d30; color: #f4f0e4;
      font: 15px/1.4 "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif; }
    :host([panel]) .unbuilt-era { min-height: 100vh; }
    /* The maker's plate, with a screw at each end: it opens the choice of family (shell.ts), on the page only. */
    .own { flex: none; display: flex; flex-direction: column; align-items: center; gap: 10px; margin-left: auto; }
    .maker { all: unset; flex: none; box-sizing: border-box; cursor: pointer; padding: 8px 22px; border-radius: 3px; text-align: center; color: #f4f0e4; font: 600 9px/1.5 "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif; letter-spacing: .2em; text-transform: uppercase;
      background: radial-gradient(circle at 9px 50%, #8f8f86 0 3px, transparent 3.5px), radial-gradient(circle at calc(100% - 9px) 50%, #8f8f86 0 3px, transparent 3.5px), #111; box-shadow: 0 0 0 1px #777, 0 3px 5px rgba(0,0,0,.5); }
    .maker b { display: block; font-size: 12px; } .maker i { display: block; font-style: normal; opacity: .65; }
    .maker:hover i, .maker:focus-visible i { opacity: 1; } .maker:focus-visible { outline: 2px solid #f4f0e4; outline-offset: 2px; }
    .plate { padding: 10px 16px; border-radius: 3px; background: #111; box-shadow: 0 0 0 1px #777; overflow-wrap: anywhere; }
    .plate b { display: block; font-size: 18px; letter-spacing: .2em; text-transform: uppercase; }
  `;
  hass?: Hass;
  narrow = false;
  _era = ERAS[0].id;
  protected _config: Config = {};
  // What the era's element is told, made once for each config: a new object at every
  // drawing would have it read the house again each time.
  private _told: Told = {};
  private _page = false;

  static getStubConfig(_hass?: Hass): Config {
    return {};
  }

  setConfig(config: Config) {
    this._config = { ...config };
    this._told = this._tell(this._config);
    this._recall();
    this.requestUpdate();
  }

  /** What the era's element is told: the card's options, and in Home Assistant's card
   * picker to draw a specimen of the house, not all of it (family.ts `picked`). A card that
   * shows less of the panel says which part, and is small enough there as it is. */
  protected _tell(config: Config): Told {
    return picked(this) ? { ...config, sample: true } : config;
  }

  /** Whether the card carries the switch that chooses the era: the whole panel does, unless its card names one. */
  protected get _switched() {
    return !this._config.era;
  }

  getCardSize() {
    return 12;
  }

  getGridOptions(): { columns: number | "full"; min_columns?: number } {
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
    // The picker gives a card its options before it puts it on the page.
    if (picked(this)) this._told = this._tell(this._config);
    this.toggleAttribute("sample", this._told.sample === true);
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

  render() {
    if (!this.hass) return nothing;
    const at = Math.max(0, ERAS.findIndex((e) => e.id === this._era));
    const era = ERAS[at];
    // A card that names its era has no switch: it is that era's panel and no other.
    const choice = (slot: string) =>
      !this._switched
        ? nothing
        : html`<div slot=${slot} class="eras ${era.tag ? era.id : ""}" role="radiogroup" aria-label="The Console's era" style="--at: ${at}">
            ${ERAS.map((e, i) => html`<button class="stop ${e.tag ? "" : "unbuilt"}" role="radio" aria-checked=${i === at} aria-label="${e.name}, the ${e.decade}${e.tag ? "" : ": not built yet"}" style="--i: ${i}" @click=${() => this._turn(e.id)}>${e.decade.slice(2, 4)}</button>`)}
            <button class="switch" aria-label="The next era" @click=${() => this._turn(ERAS[(at + 1) % ERAS.length].id)}><span></span></button>
            <span class="named">${era.name}</span>
          </div>`;
    // The family's own: the switch, and on the page the maker's plate under it, which opens the choice of family.
    const own = (slot: string) =>
      this._page
        ? html`<div slot=${slot} class="own">${choice("")}<button class="maker" aria-label="Choose another style of Dash-Bored" @click=${() => fire(this, CHOOSE)}><b>Dash-Bored</b>Instrument Co.<i>Other models ▸</i></button></div>`
        : choice(slot);
    // The era's element is told its options first, before it is on the page, so that it
    // follows only the feeds its view shows; and whether it is the page or a card.
    if (era.tag) {
      const tag = unsafeStatic(era.tag);
      return tagged`<${tag} class="era" .config=${this._told} .hass=${this.hass} .narrow=${this.narrow} ?panel=${this._page}>${own("era")}</${tag}>`;
    }
    return html`<div class="unbuilt-era">
      <div class="plate"><b>${era.name}</b>The Console of the ${era.decade} is not built yet. Turn the switch to another era.</div>
      ${own("")}
    </div>`;
  }
}
