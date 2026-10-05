// Tablet layout card: a whole screen, never more. Four panels (left, top, right, bottom) of
// cards around a main card, laid out by the Camera Commander's own engine (layout.ts), with
// its options (app/src/casa_mia/layout.json): sizes, lines, fit, anchors, the main card's fit
// and shape. Exactly as tall as the screen below its top edge: nothing scrolls, cards are
// fitted (Fill: stretched to their tile; otherwise whole, shrunk to fit when too big).
// A panel can have visibility conditions, and with Hide when empty (on unless switched off)
// a panel with no card showing takes no room.
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { type CardConfig, fire, type Hass, helper, type HuiCard, huiCard, label, mainSchema, panelSchema, register, shown } from "./ha.ts";
import { LAYOUT, layout, PANELS, type Panel, type Rect, type Settings, STACKS } from "./layout.ts";
import { describe, mountStack } from "./section.ts";

type PanelConfig = {
  size?: number;
  fit?: string;
  lines?: number;
  anchor_left?: boolean;
  anchor_right?: boolean;
  hidden?: boolean;
  hide_empty?: boolean;
  visibility?: object[];
  cards?: CardConfig[];
};
type Config = { type: string; main?: CardConfig; gap?: number; main_fit?: string; main_width?: number; main_ratio?: string; panel_min?: number } & Partial<
  Record<Panel, PanelConfig>
>;
type Place = "main" | Panel;
type Item = { place: Place; el: HuiCard };

/** Something that shows nothing: a panel's visibility is read off hui-card holding one. */
class Probe extends HTMLElement {
  setConfig() {}
}
customElements.define("casa-mia-probe", Probe);

/** Inside one of HA's dialogs (the card editor's preview), not on the dashboard. */
function inDialog(el: Element): boolean {
  for (let n: Node | null = el; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null))
    if ((n as Element).tagName?.startsWith("HUI-DIALOG") || (n as Element).tagName === "HA-DIALOG") return true;
  return false;
}

class TabletLayout extends LitElement {
  static properties = { hass: { attribute: false }, preview: { type: Boolean }, _items: { state: true } };
  hass?: Hass;
  preview = false;
  _config?: Config;
  _items: Item[] = [];
  private probes: Partial<Record<Panel, HuiCard>> = {};
  private frame = 0;
  private resize = new ResizeObserver(() => this.schedule());

  static getConfigElement() {
    return document.createElement("casa-mia-tablet-layout-editor");
  }
  static getStubConfig() {
    return {
      main: { type: "markdown", content: "## Main\nA Camera Commander card goes well here." },
      left: { cards: [{ type: "markdown", content: "Left" }] },
      bottom: { cards: [{ type: "markdown", content: "Bottom" }] },
    };
  }
  setConfig(config: Config) {
    this._config = config;
    const wanted: [Place, CardConfig][] = [
      ...(config.main ? [["main", config.main] as [Place, CardConfig]] : []),
      ...PANELS.flatMap((p) => (config[p]?.cards ?? []).map((c): [Place, CardConfig] => [p, c])),
    ];
    Promise.all(wanted.map(([, c]) => huiCard(c, this.hass, this.preview))).then(async (els) => {
      const probes: Partial<Record<Panel, HuiCard>> = {};
      for (const p of PANELS)
        if (config[p]?.visibility?.length) probes[p] = await huiCard({ type: "custom:casa-mia-probe", visibility: config[p]!.visibility }, this.hass, this.preview);
      if (this._config !== config) return;
      this.probes = probes;
      this._items = els.map((el, i) => ({ place: wanted[i][0], el }));
    });
  }
  getCardSize() {
    return 12;
  }
  getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  connectedCallback() {
    super.connectedCallback();
    this.renderRoot.addEventListener("card-visibility-changed", this.changed);
    window.addEventListener("resize", this.later);
    this.resize.observe(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.renderRoot.removeEventListener("card-visibility-changed", this.changed);
    window.removeEventListener("resize", this.later);
    this.resize.disconnect();
    cancelAnimationFrame(this.frame);
  }
  private changed = (ev: Event) => {
    ev.stopPropagation();
    this.schedule();
  };
  private later = () => this.schedule();
  private schedule() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.place());
  }

  updated(changed: PropertyValues) {
    for (const el of [...this._items.map((i) => i.el), ...Object.values(this.probes)]) {
      if (changed.has("hass")) el.hass = this.hass;
      if (changed.has("preview")) el.preview = this.preview;
    }
    if (changed.has("_items")) for (const inner of this.renderRoot.querySelectorAll(".inner")) this.resize.observe(inner);
    this.schedule();
  }

  /** The layout's settings at this size, for the cards showing now. */
  private settings(width: number, height: number): Settings {
    const c = this._config!;
    const s: Record<string, unknown> = { width, height, aspects: {} };
    for (const k of Object.keys(LAYOUT.main)) s[k] = (c as Record<string, unknown>)[k] ?? (LAYOUT.main as Record<string, { default: unknown }>)[k].default;
    for (const p of PANELS) {
      const pc = c[p] ?? {};
      const on = !pc.hidden && (!this.probes[p] || shown(this.probes[p]!));
      const keys = on ? this._items.flatMap((it, i) => (it.place === p && shown(it.el) ? [String(i)] : [])) : [];
      const keep = on && !keys.length && pc.hide_empty === false && (pc.cards?.length ?? 0) > 0;
      s[p] = { ...LAYOUT.panels[p], ...pc, cameras: keep ? [`${p}-empty`] : keys };
    }
    return s as Settings;
  }

  /** Lay every card out: measure what needs measuring, run the engine, place the tiles. */
  private place() {
    const view = this.renderRoot.querySelector<HTMLElement>(".view");
    if (!view || !this._config) return;
    const width = this.clientWidth;
    let height = Math.floor(window.innerHeight - this.getBoundingClientRect().top);
    if (height < 200 || inDialog(this)) height = Math.round((width * 10) / 16);
    view.style.height = `${height}px`;
    if (!width) return;
    const s = this.settings(width, height);
    const mainIndex = this._items.findIndex((it) => it.place === "main");
    const mainKey = mainIndex >= 0 && shown(this._items[mainIndex].el) ? String(mainIndex) : null;
    const inner = (i: number) => this._items[i].el.parentElement as HTMLElement;
    const natural = (pairs: [number, number][]) => {
      for (const [i, w] of pairs) Object.assign(inner(i).style, { width: `${w}px`, height: "auto" });
      return pairs.map(([i]) => inner(i).offsetHeight || 1);
    };

    // Shapes, where the engine wants them: each card in a panel that stacks (at its column's
    // width, or an equal share of its row), and the main card when it keeps its own shape.
    const [, first, even] = layout({ ...s, ...Object.fromEntries(PANELS.map((p) => [p, { ...s[p], fit: "cover" }])) } as Settings, mainKey);
    const wants: [number, number][] = [];
    for (const p of PANELS)
      if (STACKS.includes(s[p].fit ?? ""))
        s[p].cameras.forEach((k, n) => Number.isInteger(Number(k)) && wants.push([Number(k), even[p][n][2]]));
    if (mainKey && s.main_fit === "own") wants.push([Number(mainKey), first[2]]);
    natural(wants).forEach((nh, n) => (s.aspects![String(wants[n][0])] = wants[n][1] / nh));

    // Where each card goes, then how it fits there.
    const [, mainRect, tiles] = layout(s, mainKey);
    const rects = new Map<number, [Rect, boolean]>(); // card -> its tile, stretched to it
    const stretch = (fit: string | undefined) => fit === "cover" || fit === "fill" || fit === "crop";
    for (const p of PANELS) s[p].cameras.forEach((k, n) => Number.isInteger(Number(k)) && rects.set(Number(k), [tiles[p][n], stretch(s[p].fit)]));
    if (mainKey) rects.set(Number(mainKey), [mainRect, stretch(s.main_fit)]);
    const whole = [...rects].filter(([, [, st]]) => !st);
    const heights = natural(whole.map(([i, [r]]) => [i, r[2]]));
    const sized = new Map(whole.map(([i], n) => [i, heights[n]]));
    this._items.forEach((_, i) => {
      const tile = inner(i).parentElement as HTMLElement;
      const at = rects.get(i);
      tile.hidden = !at || at[0][2] <= 0 || at[0][3] <= 0;
      if (tile.hidden) return;
      const [[x, y, w, h], st] = at!;
      Object.assign(tile.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      const box = inner(i);
      box.classList.toggle("stretch", st);
      if (st) Object.assign(box.style, { width: `${w}px`, height: `${h}px`, left: "0", top: "0", transform: "" });
      else {
        const nh = sized.get(i)!;
        const k = Math.min(1, h / nh);
        Object.assign(box.style, { width: `${w}px`, height: "auto", left: `${(w - w * k) / 2}px`, top: `${(h - nh * k) / 2}px`, transform: k < 1 ? `scale(${k})` : "" });
      }
    });
  }

  render() {
    if (!this._config) return nothing;
    return html`<div class="view">
      ${this._items.map((it) => html`<div class="tile ${it.place}" hidden><div class="inner">${it.el}</div></div>`)}
    </div>`;
  }

  static styles = css`
    :host {
      display: block;
    }
    .view {
      position: relative;
      overflow: hidden;
      width: 100%;
    }
    .tile {
      position: absolute;
      overflow: hidden;
    }
    .tile[hidden] {
      display: none;
    }
    .inner {
      position: absolute;
      transform-origin: 0 0;
    }
    .inner.stretch > * {
      height: 100%;
    }
  `;
}

// --- the editor: the layout's options (ha-form, from layout.json), then a tab a panel ----

const TABS: [Place | "layout", string][] = [
  ["layout", "Layout"],
  ["main", "Main"],
  ["left", "Left"],
  ["top", "Top"],
  ["right", "Right"],
  ["bottom", "Bottom"],
];

class TabletLayoutEditor extends LitElement {
  static properties = { hass: { attribute: false }, lovelace: { attribute: false }, _config: { state: true }, _tab: { state: true } };
  hass?: Hass;
  lovelace?: unknown;
  _config?: Config;
  _tab: Place | "layout" = "layout";
  private mounted = "";

  setConfig(config: Config) {
    this._config = config;
  }

  private save(config: Config) {
    this._config = config;
    fire(this, "config-changed", { config });
  }

  updated() {
    const host = this.renderRoot.querySelector<HTMLElement>(".stack");
    if (!host || this.mounted === this._tab) return;
    this.mounted = this._tab;
    const place = this._tab as Place;
    const cards = place === "main" ? (this._config!.main ? [this._config!.main] : []) : (this._config![place]?.cards ?? []);
    mountStack(host, this.hass, this.lovelace, cards, (next) => {
      if (place === "main") {
        const { main: _, ...rest } = this._config!;
        this.save(next[0] ? { ...rest, main: next[0] } : (rest as Config));
      } else this.save({ ...this._config!, [place]: { ...this._config![place], cards: next } });
    });
  }

  private form(schema: object[], data: object, onChange: (v: Record<string, any>) => void) {
    return html`<ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${schema}
      .computeLabel=${label}
      .computeHelper=${helper}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        onChange(ev.detail.value);
      }}
    ></ha-form>`;
  }

  private body() {
    const c = this._config!;
    if (this._tab === "layout") {
      const data = Object.fromEntries(Object.entries(LAYOUT.main).map(([k, o]) => [k, (c as Record<string, unknown>)[k] ?? o.default]));
      return this.form(mainSchema(String(data.main_fit)), data, (v) => this.save({ ...c, ...v }));
    }
    if (this._tab === "main")
      return html`<p class="help">The card between the panels (one; a Camera Commander suits it). Its fit is on the Layout tab.</p>
        <div class="stack"></div>`;
    const p = this._tab;
    const { cards, ...opts } = c[p] ?? {};
    const data = { ...LAYOUT.panels[p], hide_empty: true, ...opts };
    const schema = [...panelSchema(p), { name: "visibility", selector: { object: {} } }];
    return html`${this.form(schema, data, (v) => this.save({ ...c, [p]: { ...v, cards } }))}
      <p class="help">${(cards ?? []).length} cards${(cards ?? []).length ? `: ${(cards ?? []).map(describe).join(", ")}` : ""}.</p>
      <div class="stack"></div>`;
  }

  render() {
    if (!this._config) return nothing;
    return html`<div class="tabs">
        ${TABS.map(
          ([t, name]) => html`<button class=${t === this._tab ? "on" : ""} @click=${() => ((this._tab = t), (this.mounted = ""))}>${name}</button>`,
        )}
      </div>
      ${this.body()}`;
  }

  static styles = css`
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 16px;
    }
    button {
      font: inherit;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid var(--divider-color);
      background: none;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    button.on {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--text-primary-color);
    }
    .help {
      color: var(--secondary-text-color);
    }
  `;
}

customElements.define("casa-mia-tablet-layout", TabletLayout);
customElements.define("casa-mia-tablet-layout-editor", TabletLayoutEditor);
register(
  "casa-mia-tablet-layout",
  "Casa Mia tablet layout",
  "A whole screen and never more: panels of cards around a main card, fitted with no scroll bars and no gaps.",
);
