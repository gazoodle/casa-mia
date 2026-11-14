// Dash-Bored's page in the sidebar: it shows one family of dashboard, and lets this
// browser choose which. Two presses close together in its top right corner, on nothing
// that is itself pressed, open the choice. The choice is this browser's own, so a tablet
// in one room and a phone can differ. A family's element is also a dashboard card by
// itself, and a card has no choice to make.
import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import type { Hass } from "../ha.ts";

export const PAGE = "dash-bored-page";
const REMEMBERED = "dash-bored-family"; // this browser's choice
const CORNER = 120; // px: how far the corner reaches along the top and down the side
const TWICE = 450; // ms: two presses within this are one double press
// What is pressed for its own sake: a press on one of these is never half of a double press.
const PRESSED = "button, a, input, textarea, summary, dialog, [role=button], [role=slider]";

/** Whether a point is in the top right corner of a box whose right edge and top are given. */
export const cornered = (x: number, y: number, right: number, top: number) => x <= right && x > right - CORNER && y >= top && y < top + CORNER;

type Family = { id: string; name: string; says: string; draw(hass: Hass, narrow: boolean): TemplateResult; still: TemplateResult };
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
    id: "bakelite", name: "Bakelite", says: "The house as a 1950s instrument panel.",
    draw: (hass, narrow) => html`<dash-bored-bakelite .hass=${hass} .narrow=${narrow} .panel=${true}></dash-bored-bakelite>`,
    still: html`<svg viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="#66756a"/>
      <rect x="10" y="10" width="64" height="80" rx="8" fill="#2b1811"/><rect x="86" y="10" width="64" height="80" rx="8" fill="#2b1811"/>
      <rect x="18" y="17" width="48" height="30" rx="3" fill="#efe6c8"/><path d="M24,42 a18,18 0 0 1 36,0" fill="none" stroke="#2a1a10"/><path d="M42,44 L52,24" stroke="#151515" stroke-width="1.5"/>
      <circle cx="42" cy="68" r="14" fill="#161616"/><circle cx="42" cy="68" r="14" fill="none" stroke="#3a3a3a" stroke-width="3" stroke-dasharray="2 2"/><path d="M42,54 v7" stroke="#f4f0e4" stroke-width="2.5"/>
      <ellipse cx="118" cy="38" rx="15" ry="20" fill="#ff8a1e" opacity=".55"/><path d="M108,56 V32 Q108,18 118,16 Q128,18 128,32 V56 Z" fill="#cfe0e8" fill-opacity=".3" stroke="#dfe8ee"/><ellipse cx="118" cy="40" rx="4" ry="11" fill="#fff2b0"/>
      <rect x="100" y="70" width="36" height="10" rx="1.5" fill="#111" stroke="#777" stroke-width=".6"/></svg>`,
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
    b { display: block; } span { opacity: .75; font-size: 13px; }
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
      const family = localStorage.getItem(REMEMBERED);
      if (FAMILIES.some((f) => f.id === family)) this._family = family!;
    } catch {
      // No storage here (a private window): the first family, then.
    }
    // In the capture phase: a family may stop a press from going further up than itself.
    this.addEventListener("click", this._tap, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("click", this._tap, true);
  }

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
              ${FAMILIES.map((f) => html`<button aria-current=${f.id === family.id} @click=${() => this._choose(f.id)}>${f.still}<b>${f.name}</b><span>${f.says}</span></button>`)}
            </div>
            <p>To choose again, press twice in the top right corner of the page.</p>
          </dialog>`
        : nothing}`;
  }
}
