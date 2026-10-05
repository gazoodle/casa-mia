// Camera Commander card: one commander, chosen by its Main camera select, drawn from what
// the select's `card` attribute says (the app's CameraDashboard._card): the compositor's
// picture, and over it the tap zones laid out by the same engine the compositor draws with.
// A tap on a panel camera makes it the main one; a tap on the main camera opens its live
// page (or its more-info). With `draft`, it follows the saved draft (`draft_card`, the draft
// compositor) instead of what is live. The highlight on the main camera's tile is an <img>
// marked #cm-highlight, as on the generated dashboard, so cm-streams.js pulses it (and gives the
// picture its Security look, and stops it while off screen).
// The picture is drawn exactly the size the card is shown: the card asks the compositor for
// its own size (device pixels, ?w=&h=&dpr=), and lays its taps out for the same canvas, so
// nothing is scaled, cropped or bordered on the screen. Never taller than the screen: alone
// in a Panel view it is exactly the screen below its top edge (HA's panel view sets only
// the width); in a Tablet layout tile, the tile; in a normal column, 16:9 of its width, at
// most the screen below its top edge. Measured again on every resize and rotation.
import { LitElement, css, html, nothing } from "lit";
import { fire, type Hass, navigate, register } from "./ha.ts";
import { layout, PANELS, pyRound, type Rect, type Settings } from "./layout.ts";

type Config = { type: string; entity?: string; draft?: boolean; tap_main?: "live" | "more-info" | "none" };
type Card = {
  picture: string;
  layout: Settings & { highlight?: Record<string, string | number>; debug?: { on?: boolean; colour?: string } };
  start: string;
  cameras: Record<string, { title: string; live: string }>;
};
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
// As the compositor's (compositor.py: MAX_PIXELS, MIN_SIDE, asked_size).
const MAX_PIXELS = 2560 * 1600;
const MIN_SIDE = 64;
const SETTLE_MS = 400; // a size must hold this long before a new picture is asked for
type Size = [w: number, h: number, scale: number];

/** The picture to ask for, for a box w x h CSS pixels: in device pixels, capped at
 * MAX_PIXELS (same shape; text and gaps then shrink with it), rounded to 8 so near sizes
 * share one picture. Null when too small to draw. */
export function askFor(w: number, h: number, dpr: number): Size | null {
  const k = Math.min(1, Math.sqrt(MAX_PIXELS / (w * dpr * h * dpr)));
  const [W, H] = [8 * pyRound((w * dpr * k) / 8), 8 * pyRound((h * dpr * k) / 8)];
  return Math.min(W, H) >= MIN_SIDE ? [W, H, Math.round(dpr * k * 100) / 100 || 1] : null;
}

/** Inside HA's Panel view (a single card on the page). */
function inPanel(el: Element): boolean {
  for (let n: Node | null = el; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null))
    if ((n as Element).tagName === "HUI-PANEL-VIEW") return true;
  return false;
}

/** The commanders HA knows: their Main camera selects, by name. */
export function commanders(hass: Hass): { value: string; label: string }[] {
  return Object.entries(hass.states)
    .filter(([id, st]) => id.startsWith("select.") && (st.attributes.card || st.attributes.draft_card))
    .map(([id, st]) => ({ value: id, label: String(st.attributes.friendly_name ?? id) }));
}

class CommanderCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _size: { state: true },
    _natural: { state: true },
    _room: { state: true },
    _panel: { state: true },
  };
  _natural = ""; // the picture's own size as the browser decoded it (debug)

  private debugOn(): boolean {
    const st = this._config?.entity ? this.hass?.states[this._config.entity] : undefined;
    return Boolean((st?.attributes[this._config?.draft ? "draft_card" : "card"] as Card | undefined)?.layout.debug?.on);
  }
  hass?: Hass;
  _config?: Config;
  _size: Size | null = null; // the picture asked for: this card's size, once it settles
  _box: [number, number] = [0, 0]; // this card's box now, CSS px (for the debug figures)
  _room = 0; // CSS px from its top edge to the bottom of the window: its most height
  _panel = false; // alone in a Panel view: exactly that height
  private settle = 0;
  private resize = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    this._box = [Math.round(width * 10) / 10, Math.round(height * 10) / 10];
    this.measure();
    if (this.debugOn()) this.requestUpdate();
    const size = askFor(width, height, window.devicePixelRatio || 1);
    clearTimeout(this.settle);
    if (String(size) === String(this._size)) return;
    if (!this._size) this._size = size; // the first at once; then each once it holds
    else this.settle = window.setTimeout(() => (this._size = size), SETTLE_MS);
  });

  /** Its room: from its top edge (in the page, scrolled or not) to the window's bottom. */
  private measure = () => {
    const top = this.getBoundingClientRect().top + window.scrollY;
    const room = Math.max(100, Math.floor(window.innerHeight - top));
    if (room !== this._room) this._room = room;
    const panel = inPanel(this);
    if (panel !== this._panel) this._panel = panel;
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("resize", this.measure);
    requestAnimationFrame(this.measure);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this.measure);
    this.resize.disconnect();
    clearTimeout(this.settle);
  }
  updated() {
    const box = this.renderRoot.querySelector(".box");
    if (box) this.resize.observe(box);
    // Debug: the picture's own size as decoded (a stream may never fire load)
    const img = this.renderRoot.querySelector<HTMLImageElement>(".picture");
    const natural = img?.naturalWidth ? `${img.naturalWidth} x ${img.naturalHeight}` : "";
    if (this.debugOn() && natural && natural !== this._natural) this._natural = natural;
  }

  static getConfigElement() {
    return document.createElement("casa-mia-commander-editor");
  }
  static getStubConfig(hass: Hass) {
    return { entity: commanders(hass)[0]?.value ?? "" };
  }
  setConfig(config: Config) {
    this._config = config;
  }
  getCardSize() {
    return 6;
  }
  getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  /** The main camera now: the select's option, by title; else the one at start. */
  private main(card: Card, option?: string): string {
    const found = Object.entries(card.cameras).find(([, c]) => c.title === option);
    return found ? found[0] : card.start;
  }

  render() {
    const st = this._config?.entity ? this.hass?.states[this._config.entity] : undefined;
    // As deployed, or (draft) as the Camera Dashboard page's draft was last saved.
    const card = st?.attributes[this._config?.draft ? "draft_card" : "card"] as Card | undefined;
    if (!card)
      return html`<ha-card
        ><div class="note">
          ${!this._config?.entity
            ? "Choose a commander"
            : st
              ? `${this._config.draft ? "No saved draft" : "Not deployed live yet"} for this commander`
              : `No commander at ${this._config.entity}`}
        </div></ha-card
      >`;
    if (!card.picture) return html`<ha-card><div class="note">Its picture's address is not known yet (the app has no LAN address).</div></ha-card>`;
    const main = this.main(card, st!.state);
    // Laid out for the picture asked for, as the compositor draws it (compositor.sized).
    const own = card.layout;
    const [W, H, scale] = this._size ?? [own.width, own.height, 1];
    const s = this._size ? { ...own, width: W, height: H, gap: pyRound(own.gap * scale) } : own;
    const [[w, h], mainRect, tiles] = layout(s, main);
    const at = ([x, y, rw, rh]: Rect) =>
      `left:${(x / w) * 100}%;top:${(y / h) * 100}%;width:${(rw / w) * 100}%;height:${(rh / h) * 100}%`;
    const lit = s.highlight ?? {};
    const mark = PANELS.flatMap((p) => s[p].cameras.map((e, i) => [e, tiles[p][i]] as const)).find(([e]) => e === main)?.[1];
    const fit = !this._room ? "" : this._panel ? `;height:${this._room}px` : `;max-height:${this._room}px`;
    return html`<ha-card style="aspect-ratio:${own.width}/${own.height}${fit}">
      <div class="box">
        ${this._size
          ? html`<img
              class="picture"
              src="${card.picture}?w=${W}&h=${H}&dpr=${scale}"
              alt=""
              @load=${(ev: Event) => {
                const img = ev.target as HTMLImageElement;
                this._natural = `${img.naturalWidth} x ${img.naturalHeight}`;
              }}
            />`
          : nothing}
        ${own.debug?.on
          ? html`<div class="debug" style="color:${own.debug.colour ?? "#ffd60a"}">
              card box ${this._box[0]} x ${this._box[1]} CSS px, screen ${window.devicePixelRatio}x<br />
              asked ${this._size ? `${W} x ${H} @${scale}x` : "nothing yet"}; picture ${this._natural || "not loaded"}
            </div>`
          : nothing}
        ${PANELS.flatMap((p) =>
          s[p].cameras.map((e, i) =>
            tiles[p][i][2] > 0 && e !== main
              ? html`<div class="zone" style=${at(tiles[p][i])} title=${card.cameras[e]?.title ?? e} @click=${() => this.choose(card, e)}></div>`
              : nothing,
          ),
        )}
        <div class="zone" style=${at(mainRect)} @click=${() => this.open(card, main)}></div>
        ${mark && mark[2] > 0
          ? html`<img
              class="highlight"
              src="${BLANK}#cm-highlight"
              alt=""
              style="${at(mark)};border:${lit.width}px solid ${lit.colour};box-shadow:0 0 ${lit.blur}px ${lit.colour};--cm-colour:${lit.colour};--cm-blur:${lit.blur}px;--cm-pulse:${lit.pulse}s;--cm-style:${lit.style}"
            />`
          : nothing}
      </div>
    </ha-card>`;
  }

  private choose(card: Card, camera: string) {
    this.hass?.callService("select", "select_option", { option: card.cameras[camera]?.title }, { entity_id: this._config!.entity });
  }

  private open(card: Card, camera: string) {
    const how = this._config?.tap_main ?? "live";
    if (how === "live" && card.cameras[camera]) navigate(card.cameras[camera].live);
    else if (how === "more-info") fire(this, "hass-more-info", { entityId: camera });
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    /* Exactly the space it is given (a panel view, a Tablet layout tile); given no height,
       its aspect-ratio sets one. The width must be set too: with only the height set,
       aspect-ratio would make the width (16:9 of the height), wider than the screen. */
    ha-card {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: none;
      border: none;
      box-shadow: none;
    }
    .box {
      position: absolute;
      inset: 0;
    }
    .picture {
      display: block;
      width: 100%;
      height: 100%;
    }
    .zone,
    .highlight {
      position: absolute;
      box-sizing: border-box;
    }
    .zone {
      cursor: pointer;
    }
    .highlight {
      pointer-events: none;
    }
    /* Debug: the card's own figures, 70% down the middle (the compositor's are 30% down),
       clear of the corners and the crossing. */
    .debug {
      position: absolute;
      left: 50%;
      top: 70%;
      transform: translate(-50%, -50%);
      padding: 4px 10px;
      background: #000;
      font: 13px/1.4 ui-monospace, monospace;
      text-align: center;
      white-space: nowrap;
      pointer-events: none;
    }
    .note {
      padding: 16px;
      color: var(--secondary-text-color);
    }
  `;
}

class CommanderEditor extends LitElement {
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
    const labels: Record<string, string> = { entity: "Commander", draft: "Show the draft", tap_main: "A tap on the main camera" };
    return html`<ha-form
      .hass=${this.hass}
      .data=${{ tap_main: "live", ...this._config }}
      .schema=${schema}
      .computeLabel=${(s: { name: string }) => labels[s.name]}
      .computeHelper=${(s: { name: string }) =>
        s.name === "entity"
          ? "The commanders built on the Camera Dashboard page (each one's Main camera select)."
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

customElements.define("casa-mia-commander", CommanderCard);
customElements.define("casa-mia-commander-editor", CommanderEditor);
register("casa-mia-commander", "Casa Mia Camera Commander", "One of the Camera Dashboard's commanders: tap a camera to make it the main one.");
