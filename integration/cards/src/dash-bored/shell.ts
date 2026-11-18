// Dash-Bored's page in the sidebar: it shows one family of dashboard, and lets this
// browser choose which. Two presses close together in its top right corner, on nothing
// that is itself pressed, open the choice. The choice is this browser's own, so a tablet
// in one room and a phone can differ. A family's element is also a dashboard card by
// itself, and a card has no choice to make.
import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import type { Hass } from "../ha.ts";

export const PAGE = "dash-bored-page";
/** The event a family fires to have the choice of family opened: for one whose page leaves no corner free to press (Aurora's bar has a button for it). */
export const CHOOSE = "dash-bored-choose";
const REMEMBERED = "dash-bored-family"; // this browser's choice
const CORNER = 120; // px: how far the corner reaches along the top and down the side
const TWICE = 450; // ms: two presses within this are one double press
// What is pressed for its own sake: a press on one of these is never half of a double press.
const PRESSED = "button, a, input, textarea, summary, dialog, [role=button], [role=slider]";

/** Whether a point is in the top right corner of a box whose right edge and top are given. */
export const cornered = (x: number, y: number, right: number, top: number) => x <= right && x > right - CORNER && y >= top && y < top + CORNER;

type Family = { id: string; name: string; beside?: string; says: string; draw(hass: Hass, narrow: boolean): TemplateResult; still: TemplateResult };
// Each family, with a small drawing of it for the choice. A new family is an entry here,
// and its element is defined in index.ts.
const FAMILIES: Family[] = [
  {
    id: "gazette", name: "The Gazette", says: "The house as a newspaper.",
    draw: (hass, narrow) => html`<dash-bored-gazette .hass=${hass} .narrow=${narrow} .panel=${true}></dash-bored-gazette>`,
    still: html`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#f3eee0"/>
      <rect x="34" y="8" width="92" height="9" fill="#1c1a17"/><path d="M10,22 h140 M10,24.5 h140" stroke="#1c1a17" stroke-width=".8"/>
      <rect x="10" y="31" width="84" height="7" fill="#1c1a17"/><rect x="10" y="41" width="62" height="7" fill="#1c1a17"/>
      <path d="M10,56 h84 M10,62 h84 M10,68 h84 M10,74 h84 M10,80 h84 M10,86 h60 M104,34 h46 M104,40 h46 M104,46 h46 M104,52 h30 M104,66 h46 M104,72 h46 M104,78 h46 M104,84 h36" stroke="#1c1a17" stroke-opacity=".55" stroke-width="2"/>
      <path d="M99,30 v60" stroke="#1c1a17" stroke-width=".6"/></svg>`,
  },
  {
    id: "console", name: "Console", says: "The house as a control panel, in the style of a decade. Bakelite is the 1950s.",
    draw: (hass, narrow) => html`<dash-bored-console .hass=${hass} .narrow=${narrow} .panel=${true}></dash-bored-console>`,
    still: html`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#66756a"/>
      <rect x="10" y="10" width="64" height="80" rx="8" fill="#2b1811"/><rect x="86" y="10" width="64" height="80" rx="8" fill="#2b1811"/>
      <rect x="18" y="17" width="48" height="30" rx="3" fill="#efe6c8"/><path d="M24,42 a18,18 0 0 1 36,0" fill="none" stroke="#2a1a10"/><path d="M42,44 L52,24" stroke="#151515" stroke-width="1.5"/>
      <circle cx="42" cy="68" r="14" fill="#161616"/><circle cx="42" cy="68" r="14" fill="none" stroke="#3a3a3a" stroke-width="3" stroke-dasharray="2 2"/><path d="M42,54 v7" stroke="#f4f0e4" stroke-width="2.5"/>
      <ellipse cx="118" cy="38" rx="15" ry="20" fill="#ff8a1e" opacity=".55"/><path d="M108,56 V32 Q108,18 118,16 Q128,18 128,32 V56 Z" fill="#cfe0e8" fill-opacity=".3" stroke="#dfe8ee"/><ellipse cx="118" cy="40" rx="4" ry="11" fill="#fff2b0"/>
      <rect x="100" y="70" width="36" height="10" rx="1.5" fill="#111" stroke="#777" stroke-width=".6"/></svg>`,
  },
  {
    id: "fridge", name: "Fridge", says: "The house as a fridge door: polaroids, magnets and sticky notes. A young family's, a pair of yuppies' or grandparents'.",
    draw: (hass, narrow) => html`<dash-bored-fridge .hass=${hass} .narrow=${narrow} .panel=${true}></dash-bored-fridge>`,
    still: html`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#efefe9"/><rect x="6" y="20" width="5" height="50" rx="2.5" fill="#9a9da2"/>
      <g transform="rotate(-3 45 40)"><rect x="24" y="16" width="42" height="48" fill="#fdfdf8" stroke="#bbb" stroke-width=".5"/><rect x="28" y="20" width="34" height="28" fill="#ffd166"/><circle cx="45" cy="15" r="5" fill="#e63946"/></g>
      <g transform="rotate(4 100 38)"><rect x="80" y="14" width="42" height="48" fill="#fdfdf8" stroke="#bbb" stroke-width=".5"/><rect x="84" y="18" width="34" height="28" fill="#27304d"/><circle cx="101" cy="13" r="5" fill="#2a9d8f"/></g>
      <rect x="128" y="18" width="26" height="26" fill="#fff48f" transform="rotate(5 141 31)"/><rect x="130" y="52" width="24" height="24" fill="#ff9db0" transform="rotate(-6 142 64)"/>
      <g><circle cx="34" cy="80" r="7" fill="#457b9d"/><circle cx="54" cy="82" r="7" fill="#b9b9b2"/><circle cx="92" cy="78" r="7" fill="#f4a261"/><circle cx="112" cy="81" r="7" fill="#9b5de5"/></g></svg>`,
  },
  {
    id: "aurora", name: "Aurora", says: "The house in the current web style: glass tiles over a sky that warms as the lights come on. A room's tile grows into a sheet of faders.",
    draw: (hass, narrow) => html`<dash-bored-aurora .hass=${hass} .narrow=${narrow} .panel=${true}></dash-bored-aurora>`,
    still: html`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#0b0d16"/>
      <circle cx="28" cy="22" r="46" fill="#5b6cf0" opacity=".45"/><circle cx="136" cy="30" r="42" fill="#22b8c8" opacity=".4"/><circle cx="92" cy="96" r="44" fill="#e0559c" opacity=".4"/><circle cx="140" cy="88" r="26" fill="#f2c14e" opacity=".5"/>
      <g fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".35" stroke-width=".6"><rect x="8" y="8" width="62" height="46" rx="8"/><rect x="8" y="60" width="62" height="12" rx="6"/><rect x="8" y="78" width="36" height="14" rx="6"/><rect x="48" y="78" width="22" height="14" rx="6"/>
        <rect x="76" y="8" width="36" height="40" rx="8"/><rect x="116" y="8" width="36" height="40" rx="8"/><rect x="76" y="52" width="36" height="40" rx="8"/><rect x="116" y="52" width="36" height="40" rx="8"/></g>
      <rect x="14" y="24" width="40" height="6" rx="3" fill="#fff"/><rect x="14" y="36" width="48" height="3" rx="1.5" fill="#fff" opacity=".6"/><rect x="14" y="42" width="34" height="3" rx="1.5" fill="#fff" opacity=".6"/>
      <circle cx="84" cy="40" r="3.5" fill="#fff"/><circle cx="94" cy="40" r="3.5" fill="#fff" opacity=".3"/><circle cx="124" cy="40" r="3.5" fill="#fff" opacity=".3"/><circle cx="84" cy="84" r="3.5" fill="#fff"/><circle cx="124" cy="84" r="3.5" fill="#fff"/></svg>`,
  },
  {
    // 4² is its texture pack (a block is sixteen texels square): said beside the name, and no part of it.
    id: "digs", name: "Digs", beside: "4²", says: "The house in section, built of square blocks: a block for each device, lit by its lamps, with the household walking about in it.",
    draw: (hass, narrow) => html`<dash-bored-digs .hass=${hass} .narrow=${narrow} .panel=${true}></dash-bored-digs>`,
    still: html`<svg viewBox="0 0 160 100" aria-hidden="true" shape-rendering="crispEdges"><rect width="160" height="100" fill="#7fb2ff"/><rect x="10" y="10" width="20" height="20" fill="#ffe45c"/>
      <rect y="80" width="160" height="10" fill="#5aa13c"/><rect y="90" width="160" height="10" fill="#7a5536"/><rect x="20" y="50" width="10" height="30" fill="#6b4a2b"/><rect x="10" y="30" width="30" height="20" fill="#3f7d2c"/>
      <rect x="60" y="30" width="90" height="50" fill="#b98a4e"/><rect x="60" y="20" width="90" height="10" fill="#9a3b2e"/><rect x="70" y="10" width="70" height="10" fill="#9a3b2e"/><rect x="60" y="50" width="90" height="5" fill="#7d5a30"/>
      <rect x="65" y="30" width="38" height="20" fill="#9c927c"/><rect x="107" y="30" width="38" height="20" fill="#5c5648"/><rect x="65" y="55" width="38" height="25" fill="#5c5648"/><rect x="107" y="55" width="38" height="25" fill="#9c927c"/>
      <rect x="80" y="30" width="10" height="10" fill="#ffe9a0"/><rect x="120" y="55" width="10" height="10" fill="#ffe9a0"/><rect x="135" y="60" width="10" height="20" fill="#9a6a34"/><rect x="122" y="66" width="6" height="14" fill="#e0913a"/></svg>`,
  },
  {
    id: "contraption", name: "Contraption", says: "A room as one absurd machine that ducks go through. Each duck is the engine of the device it is passing. So far, one room.",
    draw: (hass, narrow) => html`<dash-bored-contraption .hass=${hass} .narrow=${narrow} .panel=${true}></dash-bored-contraption>`,
    still: html`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#f3e6c4"/>
      <g fill="none" stroke="#1c2a4a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M0,52 h56 M104,52 h56" stroke-width="4" stroke="#c0703a"/><path d="M30,84 h112 M52,74 h44"/>
        <circle cx="42" cy="74" r="10" fill="#f0b830"/><path d="M42,64 v20 M32,74 h20"/><circle cx="106" cy="74" r="8" fill="#8da0b3"/><path d="M106,66 v16 M98,74 h16"/>
        <rect x="118" y="66" width="20" height="16" rx="3" fill="#e2703a"/><path d="M138,74 h10 V16 h-22 v8"/>
        <circle cx="126" cy="34" r="16" fill="#ffe14d" stroke="none" opacity=".6"/><circle cx="126" cy="34" r="10" fill="#fff8e6"/>
        <ellipse cx="78" cy="42" rx="12" ry="7" fill="#ffd21f"/><circle cx="88" cy="32" r="5.5" fill="#ffd21f"/><path d="M93,31 l7,2 l-7,2 z" fill="#ff7a1a"/>
        <ellipse cx="20" cy="45" rx="9" ry="5" fill="#ffd21f"/><circle cx="27" cy="38" r="4" fill="#ffd21f"/></g></svg>`,
  },
];

export class Shell extends LitElement {
  static properties = { hass: { attribute: false }, narrow: { type: Boolean }, _family: { state: true }, _choosing: { state: true } };
  // The choice looks like none of the families: it belongs to the page, not to one of them.
  static styles = css`
    :host { display: block; }
    dialog { box-sizing: border-box; width: min(560px, calc(100vw - 24px)); padding: 18px; border: 0; border-radius: 12px; background: #24272b; color: #f1f1f1;
      font: 15px/1.4 system-ui, sans-serif; box-shadow: 0 16px 48px rgba(0,0,0,.5); }
    dialog::backdrop { background: rgba(0,0,0,.55); }
    h2 { margin: 0 0 12px; font-size: 18px; font-weight: 600; }
    .choices { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    button { all: unset; box-sizing: border-box; cursor: pointer; padding: 8px; border-radius: 8px; border: 2px solid transparent; background: #30343a; }
    button:hover, button:focus-visible { border-color: #9aa3ad; }
    button[aria-current="true"] { border-color: #6cb6ff; }
    svg { display: block; width: 100%; border-radius: 4px; margin-bottom: 8px; }
    b { display: block; } small { font-weight: 400; opacity: .6; } span { opacity: .75; font-size: 13px; }
    p { margin: 14px 0 0; opacity: .6; font-size: 13px; overflow-wrap: anywhere; }
  `;
  hass?: Hass;
  narrow = false;
  _family = FAMILIES[0].id;
  _choosing = false;
  private _last = 0; // ms: when the corner was last pressed

  /** Home Assistant sets this on its page's element. Nothing in it is used. */
  set panel(_panel: unknown) {}

  connectedCallback() {
    super.connectedCallback();
    try {
      // Bakelite was a family of its own before it was the Console's first era: a browser that chose it has the Console.
      const family = localStorage.getItem(REMEMBERED)?.replace(/^bakelite$/, "console");
      if (FAMILIES.some((f) => f.id === family)) this._family = family!;
    } catch {
      // No storage here (a private window): the first family, then.
    }
    // In the capture phase: a family may stop a press from going further up than itself.
    this.addEventListener("click", this._tap, true);
    this.addEventListener(CHOOSE, this._asked);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("click", this._tap, true);
    this.removeEventListener(CHOOSE, this._asked);
  }

  private _asked = () => (this._choosing = true);

  private _tap = (event: MouseEvent) => {
    const box = this.getBoundingClientRect();
    const pressed = event.composedPath().some((el) => el instanceof Element && el.matches(PRESSED));
    // The corner of what is on screen: the page's own top, or the window's when it has scrolled past.
    if (pressed || !cornered(event.clientX, event.clientY, box.right, Math.max(0, box.top))) return void (this._last = 0);
    if (event.timeStamp - this._last < TWICE) this._choosing = true;
    this._last = this._choosing ? 0 : event.timeStamp;
  };

  private _choose(family: string) {
    this._family = family;
    this._choosing = false;
    try {
      localStorage.setItem(REMEMBERED, family);
    } catch {
      // Not remembered, that is all.
    }
  }

  /** A dialog is modal only when opened by its method, not by being drawn. */
  protected updated() {
    const choice = this.renderRoot.querySelector("dialog");
    if (choice && !choice.open) choice.showModal();
  }

  render() {
    if (!this.hass) return nothing;
    const family = FAMILIES.find((f) => f.id === this._family)!;
    return html`${family.draw(this.hass, this.narrow)}
      ${this._choosing
        ? html`<dialog @close=${() => (this._choosing = false)} @click=${(e: Event) => e.target === e.currentTarget && (this._choosing = false)}>
            <h2>Dash-Bored</h2>
            <div class="choices">
              ${FAMILIES.map((f) => html`<button aria-current=${f.id === family.id} @click=${() => this._choose(f.id)}>${f.still}<b>${f.name}${f.beside ? html` <small>${f.beside}</small>` : nothing}</b><span>${f.says}</span></button>`)}
            </div>
            <p>To choose again, press twice in the top right corner of the page.</p>
          </dialog>`
        : nothing}`;
  }
}
