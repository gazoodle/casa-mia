// Tablet Layout (view type custom:casa-mia-tablet-layout, "Tablet (Casa Mia)" in HA's view editor): HA's own Sections view, so its header,
// footer, badges and section editing are HA's, locked to the screen. HA puts every view in a
// container at least the screen tall with the header padded off; this view takes exactly
// that (flex basis 0, never its content's height) and clips, so the page never scrolls.
//
// Its sections are its panels: each names its panel and layer (`view_layout: {panel: top,
// layer: 2}`; tablet.ts has the layers and stacks), or, in a view from before panel stacks,
// is one by position: main, left, top, right, bottom (edit mode adds a section for each
// panel of the first layer that has none, and names each). The layout engine (layout.ts)
// places the panels by the view's `layout:` options (those of layout.json; set on the edit
// surface, below); HA's grid places the cards in each. Sections are not dragged or
// duplicated; one is deleted (its menu) only from a stack of more than one, so a panel
// keeps a section; cards move between them as in any Sections view. A
// section's own visibility hides it, and so does having no card showing that counts (a
// heading marked `view_layout: {counts: false}` does not; panel option hide_empty: false
// keeps it); a hidden section takes no room, nor a panel with none showing. In edit mode
// every section shows, and a hidden edge too, hatched (to be shown again). A section with one card that counts showing is filled by it
// (headings above it keep their height; not in a top or bottom panel of `size: auto`, which
// is as tall as its cards instead, nor in a left or right stack of more than one, where each
// is): a Camera Commander there is in tile mode (ha.ts). Otherwise HA's grid places the
// cards, by their rows.
// In edit mode each panel has a toolbar (cmTools): its chip opens its options
// (panel-options.ts), + adds a panel after it in its edge (on main: a layer, its four edges
// a panel each), the arrows move it along; too narrow for them, the chip alone (its options
// have them too). With layers, edit mode grows outwards (tablet.ts: placePanels) and the
// view scrolls both ways. Over it, dimension lines as on a technical drawing (cmDims): each
// edge's depth, the gap and the margin, and each panel's size, all as they are out of edit
// mode; each label opens the options that set it. The bar above the panels shows or hides
// them (remembered in this browser). The view's header and footer are outlined too, each
// with its chip (cmEnds): the header's opens its options (the space above it, and HA's own
// editor), the footer's HA's own editor.
// Casa Mia's Settings page (through the integration, followed while the view shows) can
// outline each panel and the view's header and footer (identify_panels, with its CSS) and
// label the view's size, the room below its top and anything still scrolling the page
// (show_size); `debug: true` in the view's config does both.
import { css } from "lit";
import { define, type HuiCard, room, sectionsView, watchRoom } from "./ha.ts";
import { LAYOUT, type Panel, PANELS, type Rect } from "./layout.ts";
import { counts } from "./section.ts";
import { compact, edgeForm, type Form, openMini, openPanelOptions, PX } from "./panel-options.ts";
import {
  autoSized,
  cardColumns,
  cardsWidth,
  depthOf,
  type Draft,
  type Drawn,
  type Gap,
  type GapLine,
  gapLines,
  draftsOf,
  LAYERS,
  layerOf,
  panelName,
  placeOf,
  placePanels,
  PLACES,
  restack,
  type Section,
  seenOut,
  type Side,
  SIDES,
  sides,
  stackOf,
  withLayer,
} from "./tablet.ts";

const LOCK = css`
  :host {
    flex: 1 1 0 !important;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }
  .wrapper {
    max-width: none;
    min-height: 0;
    height: 100%;
    box-sizing: border-box;
    padding: 0;
  }
  /* HA's extra space above (top_margin), a margin on the wrapper: out of its height. */
  :host(:not([editing])) .wrapper.top-margin {
    height: calc(100% - var(--top-margin));
  }
  .container {
    display: block;
    position: relative;
    flex: 1 1 0;
    min-height: 0;
    padding: 0;
  }
  .content {
    display: grid;
    position: absolute;
    inset: 0;
    gap: 0;
    align-items: stretch; /* HA's: start, so a section was only as tall as its cards */
    justify-content: stretch;
  }
  .section {
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    box-sizing: border-box; /* its padding inside its room */
  }
  /* Edit mode: the panels grow to what they hold and the view scrolls, editors and all. */
  :host([editing]) {
    overflow: auto;
  }
  :host([editing]) .wrapper {
    height: auto;
    min-height: 100%;
    padding: 0 calc(var(--column-gap) / 2); /* HA's spacing back, for its editors */
  }
  :host([editing]) .container {
    flex: none;
    padding: calc(var(--row-gap) / 2) 0;
  }
  :host([editing]) .content {
    position: relative;
  }
  /* half each side of the engine's own gap track, so HA's spacing between two panels (a
   * margin, not the grid's gap: that would come between every track, and layers and stacks
   * make many) */
  :host([editing]) .section {
    overflow: visible;
    margin: calc(var(--row-gap) / 2) calc(var(--column-gap) / 2);
    /* Never too small to edit, whatever its share (its rows and columns grow to it, and the
     * view scrolls): as tall as what it holds, as wide as its least (cmTools: its chip and
     * HA's frame). Its cards' own widths count for nothing (contained), only that. */
    min-height: min-content;
    contain: inline-size;
  }
  /* A panel's section is its cell's height, so a card can fill it (FILL). */
  :host(:not([editing])) .section-container,
  :host(:not([editing])) hui-section,
  :host(:not([editing])) hui-grid-section {
    display: block;
    height: 100%;
  }
  :host(:not([editing])) hui-grid-section {
    display: flex;
  }
  /* The footer under the panels, not over them (HA's sticks it a row gap above the bottom),
   * in edit mode too; or, as HA's, floating over them (layout footer: float). */
  :host(:not([cm-footer-float])) hui-view-footer {
    position: static;
  }
  :host([cm-footer-float]:not([editing])) hui-view-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
  }
  /* Edit mode: the Tablet Layout button over the panels, and each panel's name. */
  .cm-bar {
    display: flex;
    justify-content: flex-start;
    padding: 12px 0 0 20px;
  }
  .cm-bar label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--primary-text-color);
    cursor: pointer;
  }
  .cm-bar input {
    width: 18px;
    height: 18px;
    accent-color: var(--primary-color);
  }
  :host([editing]) .section {
    position: relative;
  }
  .cm-tools {
    position: absolute;
    top: 6px;
    left: 10px;
    z-index: 2;
    display: flex;
    gap: 4px;
    max-width: calc(100% - 20px);
  }
  .cm-ends {
    position: absolute;
    inset: 0;
    z-index: 6; /* over HA's sticky footer (4) */
    pointer-events: none;
  }
  .cm-ends button {
    position: absolute;
    pointer-events: auto;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .cm-ends button.cm-line {
    transform: translate(-50%, -50%);
    font-size: 10px;
    padding: 1px 6px;
  }
  .cm-ends button.cm-lock {
    transform: translate(-50%, -50%);
    width: 26px;
    height: 26px;
    padding: 4px;
    border-radius: 50%;
    border: 1px solid var(--primary-color);
    color: var(--primary-color);
    background: var(--card-background-color, #fff);
  }
  .cm-ends button.cm-lock.on {
    color: var(--text-primary-color, #fff);
    background: var(--primary-color);
  }
  .cm-ends button.cm-lock svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  .cm-tools button,
  .cm-ends button {
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
    padding: 3px 10px;
    border: none;
    border-radius: 12px;
    color: var(--text-primary-color, #fff);
    background: var(--primary-color);
    cursor: pointer;
    white-space: nowrap;
  }
  .cm-tools .cm-chip {
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .cm-tools button:not(.cm-chip) {
    padding: 3px 8px;
  }
  .cm-tools button[disabled] {
    opacity: 0.4;
    cursor: default;
  }
  .cm-tools.cm-narrow button:not(.cm-chip) {
    display: none;
  }
  /* A hidden edge, shown in edit mode to be shown again: dimmed and hatched. */
  .section.cm-hidden > :not(.cm-tools) {
    opacity: 0.45;
  }
  .section.cm-hidden::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    border-radius: var(--ha-section-border-radius, 12px);
    background: repeating-linear-gradient(-45deg, transparent 0 8px, color-mix(in srgb, var(--primary-text-color) 18%, transparent) 8px 10px);
  }
  .cm-lines {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }
  .cm-lines svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .cm-dims {
    position: absolute;
    inset: 0;
    z-index: 5; /* over HA's sticky footer (4) */
    pointer-events: none;
    color: var(--primary-color);
  }
  .cm-dims svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .cm-dims line {
    stroke: currentColor;
    stroke-width: 1;
  }
  .cm-dims button {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    font: 11px/14px var(--ha-font-family-code, monospace);
    padding: 1px 6px;
    border: 1px solid currentColor;
    border-radius: 8px;
    color: inherit;
    background: var(--card-background-color, #fff);
    cursor: pointer;
    white-space: nowrap;
  }
  .cm-dims button.cm-size {
    transform: translate(-100%, -100%);
    border-color: transparent;
    color: var(--secondary-text-color);
    background: color-mix(in srgb, var(--card-background-color, #fff) 80%, transparent);
  }
  /* Edit mode: each panel's room outlined, in its chip's colour (the identify outline, for
   * debugging, over it when on). */
  :host([editing]) .section,
  :host([editing]) hui-view-header,
  :host([editing]) hui-view-footer {
    outline: 1px solid var(--primary-color);
    outline-offset: -1px;
  }
  :host([cm-identify]) .section,
  :host([cm-identify]) hui-view-header,
  :host([cm-identify]) hui-view-footer {
    outline: var(--cm-outline, 1px solid red);
    outline-offset: -1px;
  }
  .section.cm-off,
  .create-section-container {
    display: none;
  }
  .cm-debug {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 10;
    padding: 2px 6px;
    font: 12px monospace;
    color: #000;
    background: rgb(255 214 10 / 0.7); /* see-through enough for what is under it */
    pointer-events: none;
    white-space: pre-wrap;
    max-width: calc(100% - 16px);
  }
`;

/** Into each section's grid (HA's hui-grid-section, its own shadow root): its Add card
 * button never narrower than tall (edit mode); with one card that
 * counts showing (cm-fill on the grid and that card), the cards in a column, the others
 * (headings) their own height and that card all the rest. */
const FILL = new CSSStyleSheet();
FILL.replaceSync(`
  .add { min-width: var(--row-height, 56px); } /* edit mode: HA's Add card button never narrower than tall */
  :host([cm-fill]) ha-sortable { display: contents; }
  :host([cm-fill]) .container { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; margin: 0; }
  :host([cm-fill]) .card { flex: none; }
  :host([cm-fill]) .card:has(> [cm-fill]) { flex: 1 1 0; min-height: 0; }
  [cm-fill], [cm-fill] > * { display: block; height: 100%; }
`);

/** Each element above `el` (through shadow roots) taller than the window: what still
 * scrolls the page. Debug only. */
function tooTall(el: Element, tall: number): string {
  const out: string[] = [];
  for (let n: Node | null = el; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null)) {
    const h = (n as Element).getBoundingClientRect?.().height ?? 0;
    if (h > tall + 1) out.push(`${(n as Element).tagName.toLowerCase()} ${Math.round(h)}`);
  }
  return out.length ? `\ntoo tall: ${out.join("\n")}` : "";
}

/** The app's settings for this view (its Settings page, through the integration), now and
 * at each change; none without the integration. Returns the unsubscribe. */
function watchAppSettings(hass: any, got: (s: Record<string, any>) => void): () => void {
  let unsub: (() => void) | undefined;
  let gone = false;
  hass.connection
    .subscribeMessage((s: any) => got(s?.tablet_view ?? {}), { type: "casa_mia/settings/subscribe" })
    .then((u: () => void) => (gone ? u() : (unsub = u)))
    .catch(() => got({}));
  return () => {
    gone = true;
    unsub?.();
  };
}

/** The space above the view's header, px (header_space; HA's own row gap by default). */
const headerSpace = (config: Record<string, any>) => Math.max(0, Number(config.header_space ?? LAYOUT.main.header_space.default) || 0);

/** HA's card grid row and its gap, px (its theme's --ha-section-grid-row-height, -row-gap):
 * a section's row_span is that many. */
const [ROW, ROW_GAP] = [56, 8];

const DIMS = "casa-mia-tablet-dimensions"; // localStorage: "off" hides the dimension lines
// mdi lock, lock-open: an edge's end to its side (anchored), or not.
const LOCKED =
  "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z";
const UNLOCKED =
  "M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z";

/** How tall a section's cards are, laid out at its width (HA's grid in the section). */
function cardsHeight(section: any): number {
  const grid = section?.querySelector("hui-grid-section") as HTMLElement | null;
  return (grid?.shadowRoot?.querySelector(".container") as HTMLElement | null)?.offsetHeight ?? 0;
}

sectionsView().then((Base: any) => {
  class TabletView extends Base {
    static styles = [Base.styles, LOCK];
    private cmDebug = false; // debug: true in the view's config
    private cmApp: Record<string, any> = {}; // the app's settings, watchAppSettings
    private cmUnwatch?: () => void; // while the view shows
    private cmLayout: Record<string, any> = {};
    private cmBoxes: [number, number, number, number][] = []; // each layer's room, as last placed
    private cmGapsNow: Gap[] = []; // the gaps, as last placed
    private cmSections: any[] = []; // the view's sections' config
    private cmColumns = 4; // the view's max_columns (HA's default)
    private cmLabel?: HTMLElement;
    private cmStop?: () => void;
    private cmFrame = 0;
    private cmAdding = false;
    /** Out of edit mode: the panels' area, the space above the header then (none: no
     * header), and the size: auto panels' heights. */
    private get cmSeenOut() {
      return seenOut(location.pathname.split("/")[1], this.index);
    }
    private cmSeen = new ResizeObserver(() => this.cmLater());

    setConfig(config: any) {
      super.setConfig(config);
      this.cmDebug = !!config.debug;
      this.cmMarks();
      this.cmLayout = config.layout ?? {};
      this.cmSections = config.sections ?? [];
      this.cmColumns = Number(config.max_columns) || 4;
    }

    /** HA's page (html, 100vh tall) and its view container (hui-view's parent, at least
     * 100vh): Safari's 100vh is the screen without its toolbars, so the page scrolled by
     * them. While this view shows, both are the visible screen instead (100dvh); the next
     * view gets HA's back. */
    private cmHolder?: HTMLElement | null;

    connectedCallback() {
      super.connectedCallback();
      this.cmHolder = (this as unknown as HTMLElement).parentElement?.parentElement;
      this.cmHolder?.style.setProperty("min-height", "100dvh");
      document.documentElement.style.setProperty("height", "100dvh");
      this.cmSeen.observe(this as unknown as Element);
      this.cmStop = watchRoom(() => this.cmLater());
      this.addEventListener("section-visibility-changed", this.cmLater);
      this.addEventListener("card-visibility-changed", this.cmLater);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.cmHolder?.style.removeProperty("min-height");
      document.documentElement.style.removeProperty("height");
      this.cmSeen.disconnect();
      this.cmStop?.();
      this.removeEventListener("section-visibility-changed", this.cmLater);
      this.removeEventListener("card-visibility-changed", this.cmLater);
      cancelAnimationFrame(this.cmFrame);
      this.cmUnwatch?.();
      this.cmUnwatch = undefined; // watched again next time it shows
    }

    /** The panels' outline, on and its CSS, from the view's config and the app's settings. */
    private cmMarks() {
      this.toggleAttribute("cm-identify", this.cmDebug || !!this.cmApp.identify_panels);
      (this as unknown as HTMLElement).style.setProperty("--cm-outline", this.cmApp.identify_outline || "1px solid red");
    }

    updated(changed: Map<string, unknown>) {
      super.updated?.(changed);
      const editing = !!this.lovelace?.editMode;
      this.toggleAttribute("editing", editing);
      // Sections stay where they are: HA turns their dragging on in edit mode, this off.
      const sortable = this.shadowRoot?.querySelector(".container > ha-sortable");
      if (sortable) sortable.disabled = true;
      if (editing) this.cmComplete();
      if (!this.cmUnwatch && this.hass) {
        this.cmUnwatch = watchAppSettings(this.hass, (s) => {
          this.cmApp = s;
          this.cmMarks();
          this.cmLater();
        });
      }
      this.cmLater();
    }

    private cmLater = () => {
      cancelAnimationFrame(this.cmFrame);
      this.cmFrame = requestAnimationFrame(() => this.cmPlace());
    };

    /** In edit mode, a section for each panel of the first layer that has none yet. */
    private cmComplete() {
      const config = this.lovelace.config;
      const have: any[] = config.views[this.index].sections ?? [];
      const missing = PLACES.filter((p) => !have.some((s, n) => placeOf(s, n)?.layer === 1 && placeOf(s, n)?.place === p));
      if (this.isStrategy || this.cmAdding || !missing.length) return;
      this.cmAdding = true;
      const added = missing.map((p) => ({ type: "grid", cards: [], view_layout: { panel: p } }));
      this.cmSaveView((v) => ({ ...v, sections: [...(v.sections ?? []), ...added] })).finally(() => (this.cmAdding = false));
    }

    /** Save this view's config, changed by `change`. */
    private cmSaveView(change: (view: any) => any): Promise<unknown> {
      const config = this.lovelace.config;
      const views = config.views.map((v: any, i: number) => (i === this.index ? change(v) : v));
      return Promise.resolve(this.lovelace.saveConfig({ ...config, views }));
    }

    /** In edit mode, the bar above the panels (outside Lit's part, as the debug label): Show
     * dimensions, on unless turned off in this browser. */
    private cmBar(editing: boolean) {
      const root = this.shadowRoot as ShadowRoot | null;
      let bar = root?.querySelector(".cm-bar");
      if (!editing || this.isStrategy) return bar?.remove();
      if (bar || !root) return;
      bar = document.createElement("div");
      bar.className = "cm-bar";
      bar.innerHTML = `<label><input type="checkbox" ${this.cmDimsOn ? "checked" : ""}>Show dimensions</label>`;
      bar.querySelector("input")!.addEventListener("change", (ev) => {
        this.cmDimsOn = (ev.target as HTMLInputElement).checked;
        this.cmLater();
      });
      root.prepend(bar);
    }

    /** Whether the dimension lines show (this browser's choice; on by default). */
    private get cmDimsOn(): boolean {
      try {
        return localStorage.getItem(DIMS) !== "off";
      } catch {
        return true;
      }
    }
    private set cmDimsOn(on: boolean) {
      try {
        localStorage.setItem(DIMS, on ? "on" : "off");
      } catch {
        // not kept: on again next time
      }
    }

    /** What was seen of each section out of edit mode, to its place in `drafts`. */
    private cmReseen(drafts: Draft[]) {
      const was = this.cmSeenOut.naturals;
      this.cmSeenOut.naturals = Object.fromEntries(drafts.flatMap((d, i) => (d.from !== null && String(d.from) in was ? [[String(i), was[d.from]]] : [])));
    }

    /** The view's sections reordered or added to by `change` (on its drafts), saved. */
    private cmRestack(change: (drafts: Draft[]) => Draft[]) {
      const drafts = change(draftsOf(this.cmSections));
      this.cmReseen(drafts);
      return this.cmSaveView((v) => ({ ...v, sections: restack(v.sections ?? [], drafts) }));
    }

    /** A panel's toolbar acted on (its chip, + or an arrow). */
    private cmTool = (ev: Event) => {
      const button = (ev.target as Element).closest("button");
      const tools = button?.closest(".cm-tools") as HTMLElement | null;
      if (!button || !tools) return;
      ev.stopPropagation();
      const n = Number(tools.dataset.n);
      const act = this.cmActions(n)[button.dataset.act as "add" | "back" | "on"];
      if (button.dataset.act === "options") this.cmOptions(n, button);
      else act?.();
    };

    /** What section n's toolbar can do: add a panel after it, move it back or on along its
     * edge (none at its start or end); main's, add a layer (up to LAYERS) or remove the
     * innermost (asked first when its panels hold cards). Saved at once. */
    private cmActions(n: number): { add?: () => void; back?: () => void; on?: () => void; remove?: () => void } {
      const at = placeOf(this.cmSections[n], n);
      if (!at) return {};
      if (at.place === "main") {
        const depth = depthOf(draftsOf(this.cmSections));
        const edges = ["top", "left", "right", "bottom"] as const;
        return {
          ...(depth < LAYERS && {
            add: () => this.cmRestack((ds) => [...ds, ...edges.map((place) => ({ from: null, layer: depth + 1, place }))]),
          }),
          ...(depth > 1 && {
            remove: () => {
              const gone = (d: Draft) => d.place !== "main" && d.layer === depth;
              const full = draftsOf(this.cmSections).some((d) => gone(d) && this.cmSections[d.from!]?.cards?.length);
              if (full && !confirm(`Remove layer ${depth}? Its panels' cards go with it.`)) return;
              this.cmRestack((ds) => ds.filter((d) => !gone(d)));
            },
          }),
        };
      }
      const move = (by: number) => {
        const drafts = draftsOf(this.cmSections);
        const i = drafts.findIndex((d) => d.from === n);
        const stack = stackOf(drafts, i);
        const j = stack[stack.indexOf(i) + by];
        return j === undefined
          ? undefined
          : () =>
              this.cmRestack((ds) => {
                const next = [...ds];
                [next[i], next[j]] = [next[j], next[i]];
                return next;
              });
      };
      return {
        add: () =>
          this.cmRestack((ds) => {
            const i = ds.findIndex((d) => d.from === n);
            return [...ds.slice(0, i + 1), { from: null, ...at }, ...ds.slice(i + 1)];
          }),
        back: move(-1),
        on: move(1),
      };
    }

    /** Section n's options, by its chip (panel-options.ts). */
    private cmOptions(n: number, anchor: Element) {
      const at = placeOf(this.cmSections[n], n);
      if (!at) return;
      const where = (this.sections as unknown[]).map((_, i) => placeOf(this.cmSections[i], i));
      const box = this.shadowRoot?.querySelectorAll(".content > .section")[n];
      const [layout, sections] = [this.cmLayout, this.cmSections];
      const show = (l: Record<string, any>, section: Record<string, any>) => {
        this.cmLayout = l;
        this.cmSections = sections.map((s, i) => (i === n ? section : s));
        this.cmLater();
      };
      openPanelOptions({
        hass: this.hass,
        anchor,
        name: panelName(where, n),
        ...at,
        count: at.place === "main" ? depthOf(where) : stackOf(where, n).length,
        columns: this.cmColumns,
        layout,
        section: sections[n] ?? {},
        room: () => {
          const b = this.cmBoxes[at.layer - 1];
          return b && [b[2], b[3]];
        },
        actions: this.cmActions(n),
        edit: () => (box?.querySelector("hui-section-edit-mode") as any)?._editSection?.(),
        apply: show,
        save: (l, section) =>
          this.cmSaveView((v) => {
            const { layout: _, ...rest } = v;
            const all = (v.sections ?? []).map((s: any, i: number) => (i === n ? section : s));
            return { ...rest, sections: all, ...(Object.keys(l).length && { layout: l }) };
          }),
      });
    }

    /** What sets a section's length along its stack (tablet.ts: Section): a top or bottom
     * one's Width (column_span) of the view's columns, a left or right one's row_span, else
     * its view_layout's length (fill, cards); whether it is held to the end, and its own gap
     * after it. */
    private cmLock(config: any, place: string): Partial<Section> {
      if (place === "main") return {};
      const across = place === "top" || place === "bottom";
      const vl = config?.view_layout ?? {};
      const how: Partial<Section> = {
        ...((vl.length === "fill" || vl.length === "cards") && { size: vl.length }),
        ...(vl.hold === "end" && { hold: true }),
        ...(vl.gap_after !== undefined && vl.gap_after !== null && vl.gap_after !== "" && { gapAfter: Math.max(0, Number(vl.gap_after) || 0) }),
      };
      if (across && config?.column_span) return { ...how, share: Math.min(Number(config.column_span), this.cmColumns) / this.cmColumns };
      if (!across && config?.row_span) return { ...how, length: Number(config.row_span) * (ROW + ROW_GAP) - ROW_GAP };
      return how;
    }

    /** The panels' area: the container, the room between the view's header and footer; in
     * edit mode it grows, so then what it would be (for a view opened in edit mode, until it
     * is seen out of it). The header and footer are watched, as their cards and badges come
     * and go or change height. */
    private cmArea(): [number, number] {
      const root = this.shadowRoot as ShadowRoot;
      const ends = [...root.querySelectorAll<HTMLElement>("hui-view-header, hui-view-footer")];
      ends.forEach((e) => this.cmSeen.observe(e));
      const area = root.querySelector(".container") as HTMLElement | null;
      if (!this.lovelace?.editMode && area) return [this.clientWidth, area.clientHeight];
      const pad = area ? parseFloat(getComputedStyle(area).paddingTop) + parseFloat(getComputedStyle(area).paddingBottom) : 0;
      const bar = (root.querySelector(".cm-bar") as HTMLElement | null)?.offsetHeight ?? 0;
      return [this.clientWidth, this.clientHeight - bar - pad - ends.reduce((n, e) => n + e.offsetHeight, 0)];
    }

    /** Section n's cards' columns (HA's grid options), side by side in a top or bottom
     * panel, else the widest. */
    private cmCardColumns(n: number, place: string): number {
      const cards: HuiCard[] = (this.sections[n]?._cards ?? []).filter((c: HuiCard) => !c.hidden);
      return cardColumns(
        cards.map((c: any) => c.getGridOptions?.() ?? {}),
        place === "top" || place === "bottom",
      );
    }

    /** Section n's cards' size (tablet.ts: Section), in a view `width` wide: how wide in a
     * top or bottom panel, and how tall in one of size: auto; how tall in a left or right
     * stack, and how wide in one of size: auto. Empty, at least one Width and one row. Its
     * padding is round them. */
    private cmCards(n: number, at: { layer: number; place: string }, width: number): Partial<Section> {
      if (at.place === "main") return {};
      const across = at.place === "top" || at.place === "bottom";
      const auto = autoSized(layerOf(this.cmLayout, at.layer), at.place);
      // Empty (no card showing), it keeps a size: one Width wide, one of HA's card rows tall.
      const columns = this.cmCardColumns(n, at.place);
      const [pt, pr, pb, pl] = sides(this.cmSections[n]?.view_layout?.padding); // round its cards
      const wide = () => ({ wide: cardsWidth(columns || 12, width, this.cmColumns) + pl + pr });
      const tall = () => ({ tall: (columns ? this.cmNatural(n) : Math.max(ROW, this.cmNatural(n))) + pt + pb });
      return across ? { ...wide(), ...(auto && tall()) } : { ...tall(), ...(auto && wide()) };
    }

    /** How tall section n's cards are (for size: auto, and a left or right stack), watching
     * them for changes. In edit mode as last measured out of it: there its cards carry HA's
     * editors, which took the main panel's room a step at a time. */
    private cmNatural(n: number): number {
      const key = String(n);
      if (this.lovelace?.editMode && key in this.cmSeenOut.naturals) return this.cmSeenOut.naturals[key];
      const section = this.sections[n];
      const grid = section?.querySelector("hui-grid-section")?.shadowRoot?.querySelector(".container");
      if (grid) this.cmSeen.observe(grid); // its cards come and go, or change height
      const h = cardsHeight(section);
      if (!this.lovelace?.editMode) this.cmSeenOut.naturals[key] = h;
      return h;
    }

    /** Each section to its place in the grid (tablet.ts: placePanels, panel, gap, middle, gap,
     * panel each way and each layer, the stacks split along) sized by the engine; in edit mode
     * each row at least that tall. */
    private cmPlace() {
      const root = this.shadowRoot as ShadowRoot | null;
      const grid = root?.querySelector(".content") as HTMLElement | null;
      if (!grid) return;
      const editing = !!this.lovelace?.editMode;
      this.cmBar(editing);
      this.toggleAttribute("cm-footer-float", this.cmLayout.footer === "float");
      // The room above the header (HA's padding, its row gap), before measuring; in edit mode
      // too, so the header stands where it will.
      const header = root!.querySelector("hui-view-header") as HTMLElement | null;
      const space = this.cmLayout.header_space === undefined ? undefined : headerSpace(this.cmLayout);
      header?.style.setProperty("padding-top", space === undefined ? "" : `${space}px`);
      // Edit mode sizes the panels as they show out of it: its header and footer are taller
      // (their editors), and the view scrolls, so its own room only letterboxed them.
      const seen = this.cmSeenOut;
      // Less a change to the space above the header since (edit mode leaves HA's in place).
      const [aw, ah] = editing && seen.shown ? [seen.shown[0], seen.shown[1] + (seen.top === undefined ? 0 : seen.top - headerSpace(this.cmLayout))] : this.cmArea();
      if (!editing) {
        this.cmSeenOut.shown = [aw, ah];
        this.cmSeenOut.top = header && !header.hidden ? headerSpace(this.cmLayout) : undefined;
      }
      // An empty view (its main panel without a card) fits the screen in edit mode, no
      // scrolling (a first look, and screenshots): laid out in the room edit mode has, its
      // panels' sizes still as out of edit mode (`real`).
      const mainAt = (this.cmSections as any[]).findIndex((sc, n) => placeOf(sc, n)?.place === "main");
      const fit = editing && !(this.cmSections[mainAt]?.cards?.length > 0);
      const [fw, fh] = fit ? this.cmArea() : [aw, ah];
      const counting = (section: any): HuiCard[] => (section?._cards ?? []).filter((c: HuiCard) => counts(c.config ?? { type: "" }) && !c.hidden);
      const where = (this.sections as unknown[]).map((_, n) => placeOf(this.cmSections[n], n));
      // How tall its cards are sizes it: a top or bottom of size: auto, a left or right in a
      // stack, unless filling (so no card fills it).
      const measured = (n: number) => {
        const w = where[n]!;
        if (w.place === "top" || w.place === "bottom") return autoSized(layerOf(this.cmLayout, w.layer), w.place);
        return w.place !== "main" && stackOf(where, n).length > 1 && this.cmSections[n]?.view_layout?.length !== "fill";
      };
      const sections = where.map((w, n): Section | null => {
        if (!w) return null;
        const section = this.sections[n];
        // Hide when empty, as the Section card: some card that counts is showing.
        const shows =
          !!section && !section.hidden && (editing || layerOf(this.cmLayout, w.layer)[w.place]?.hide_empty === false || counting(section).length > 0);
        return { ...w, shows, ...this.cmLock(this.cmSections[n], w.place), ...this.cmCards(n, w, aw) };
      });
      const placed = placePanels(this.cmLayout, [fw, fh], editing, sections, this.cmColumns, fit);
      this.cmBoxes = placed.boxes;
      // As out of edit mode, for the dimension lines.
      const real = editing ? placePanels(this.cmLayout, [aw, ah], false, sections, this.cmColumns) : placed;
      const inset = placed.inset.map((v) => `${v}px`).join(" ");
      const margined = placed.inset.some(Boolean);
      grid.style.inset = editing ? "" : inset;
      // Edit mode: the margin round the grid (its small sides are taken from its canvas), and
      // the grid grown outwards with layers, so the view scrolls rather than the panels
      // being squeezed.
      grid.style.margin = editing && margined ? inset : "";
      grid.style.width = editing && !fit && (placed.canvas[0] !== fw || margined) ? `${placed.canvas[0]}px` : ""; // fitting: the room less its margin
      grid.style.height = fit ? `${placed.canvas[1]}px` : ""; // its rows shares of it
      grid.style.gridTemplateColumns = placed.columns;
      grid.style.gridTemplateRows = placed.rows;
      const boxes = [...root!.querySelectorAll<HTMLElement>(".content > .section")];
      boxes.forEach((box, n) => {
        const at = placed.places[n] ?? null;
        // Off only when it is not to show: one that shows but is no size yet (size: auto,
        // its cards not laid out) must stay laid out, or it measures 0 for ever.
        box.classList.toggle("cm-off", !at);
        box.classList.toggle("cm-hidden", editing && !!at && !!where[n] && !!layerOf(this.cmLayout, where[n]!.layer)[where[n]!.place]?.hidden);
        this.cmTools(box, editing && !!at, where, n);
        // Delete in its menu (MENU) while its stack has another.
        const stacked = !!where[n] && where[n]!.place !== "main" && stackOf(where, n).length > 1;
        box.querySelector("hui-section-edit-mode")?.toggleAttribute("cm-deletable", editing && stacked);
        this.cmFill(this.sections[n], editing || !where[n] || measured(n) ? [] : counting(this.sections[n]));
        this.cmGrid(this.sections[n], at && sections[n] ? this.cmGridColumns(n, sections) : null);
        if (!at) return;
        const pad = where[n] ? sides(this.cmSections[n]?.view_layout?.padding) : [0, 0, 0, 0];
        Object.assign(box.style, {
          padding: pad.some(Boolean) ? pad.map((v) => `${v}px`).join(" ") : "",
          gridColumn: at.column,
          gridRow: at.row,
          width: at.width === undefined ? "" : `${at.width}px`,
          height: at.height === undefined ? "" : `${at.height}px`,
          justifySelf: at.centred ? "center" : "",
          alignSelf: at.centred ? "center" : "",
        });
      });
      if (fit) {
        // What still scrolls (whatever round it the room missed): taken from the grid.
        const over = this.scrollHeight - this.clientHeight;
        if (over > 0) grid.style.height = `${Math.max(0, placed.canvas[1] - over)}px`;
      }
      this.cmGapsNow = placed.gaps;
      const tracks = this.cmTracks(grid);
      const first = boxes.find((b) => !b.classList.contains("cm-off"));
      const edit = editing && first ? parseFloat(getComputedStyle(first).marginTop) || 0 : 0; // the panels' own spacing in edit mode
      const drawn = this.cmLines(grid, placed.gaps, tracks, edit);
      this.cmDims(grid, editing && this.cmDimsOn, where, real, placed.gaps, tracks, edit);
      this.cmEditMarks(grid, editing, where, drawn);
      this.cmShow();
    }

    /** Where the grid's lines are now on the page, px from its corner (its tracks as laid
     * out: exact out of edit mode, grown in it), so a gap's band is found by its lines. */
    private cmTracks(grid: HTMLElement): [number[], number[]] {
      const cs = getComputedStyle(grid);
      const at = (tracks: string) => tracks.split(" ").reduce((out, t) => [...out, out[out.length - 1] + (parseFloat(t) || 0)], [0]);
      return [at(cs.gridTemplateColumns), at(cs.gridTemplateRows)];
    }

    /** Gap g's rect on the page now (px in the grid): its band between its grid lines, and in
     * edit mode the panels' own spacing either side of it (`edit`, their margin), as seen. */
    private cmGapRect(g: Gap, [xs, ys]: [number[], number[]], edit: number): Rect {
      const [x0, x1, y0, y1] = [xs[g.column[0] - 1], xs[g.column[1] - 1], ys[g.row[0] - 1], ys[g.row[1] - 1]];
      return g.across ? [x0, y0 - edit, x1 - x0, y1 - y0 + 2 * edit] : [x0 - edit, y0, x1 - x0 + 2 * edit, y1 - y0];
    }

    /** The line in gap g (its edge's `line`, or its panel's `line_after`), if any. */
    private cmLineOf(g: Gap): GapLine | undefined {
      if (g.edge) return layerOf(this.cmLayout, g.edge.layer)[g.edge.place]?.line;
      return this.cmSections[g.after!]?.view_layout?.line_after;
    }

    /** `layout` and `sections` with gap g's `key` (its size, or its line) as `value` (left
     * out: none of its own). */
    private cmGapSet(g: Gap, key: "gap" | "line", value: unknown, layout: Record<string, any>, sections: any[]): [Record<string, any>, any[]] {
      if (g.edge) {
        const { layer, place } = g.edge;
        return [
          withLayer(layout, layer, (c) => {
            const { [key]: _, ...e } = c[place] ?? {};
            return { ...c, [place]: { ...e, ...(value !== undefined && { [key]: value }) } };
          }),
          sections,
        ];
      }
      const own = key === "gap" ? "gap_after" : "line_after";
      return [
        layout,
        sections.map((sc, i) => {
          if (i !== g.after) return sc;
          const { view_layout: was = {}, ...rest } = sc ?? {};
          const { [own]: _, ...vl } = was;
          const view_layout = { ...vl, ...(value !== undefined && { [own]: value }) };
          return { ...rest, ...(Object.keys(view_layout).length && { view_layout }) };
        }),
      ];
    }

    /** Every gap `gap` px: the view's, none of their own (edges', on every layer, panels'). */
    private cmAllGaps(gap: number, layout: Record<string, any>, sections: any[]): [Record<string, any>, any[]] {
      const clear = (c: Record<string, any>): Record<string, any> => {
        const out = { ...c };
        for (const p of PANELS)
          if (out[p]) {
            const { gap: _, ...e } = out[p];
            out[p] = e;
          }
        if (out.inner) out.inner = clear(out.inner);
        return out;
      };
      return [
        { ...clear(layout), gap },
        sections.map((sc) => {
          if (!sc?.view_layout?.gap_after && sc?.view_layout?.gap_after !== 0) return sc;
          const { gap_after: _, ...vl } = sc.view_layout;
          const { view_layout: _v, ...rest } = sc;
          return { ...rest, ...(Object.keys(vl).length && { view_layout: vl }) };
        }),
      ];
    }

    /** Show `layout` and `sections` on the view (not saved). */
    private cmDraft(layout: Record<string, any>, sections: any[]) {
      this.cmLayout = layout;
      this.cmSections = sections;
      this.cmLater();
    }

    /** Save `layout` and `sections` as the view's. */
    private cmSaveAll(layout: Record<string, any>, sections: any[]) {
      return this.cmSaveView((v) => {
        const { layout: _, ...rest } = v;
        const l = compact(layout);
        return { ...rest, sections, ...(Object.keys(l).length && { layout: l }) };
      });
    }

    /** A mini box (panel-options.ts: openMini) for a setting of the view's layout or sections:
     * `next` makes them from its value, shown as it changes; Cancel puts back what was. */
    private cmMini(anchor: Element, title: string, note: string, value: Record<string, any>, form: (v: Record<string, any>) => Form, next: (v: Record<string, any>, layout: Record<string, any>, sections: any[]) => [Record<string, any>, any[]], actions: { label: string; run: () => void }[] = []) {
      const [layout, sections] = [this.cmLayout, this.cmSections];
      openMini({
        hass: this.hass,
        anchor,
        title,
        note,
        value,
        form,
        actions,
        apply: (v) => this.cmDraft(...(v === value ? ([layout, sections] as [Record<string, any>, any[]]) : next(v, layout, sections))),
        save: (v) => this.cmSaveAll(...next(v, layout, sections)),
      });
    }

    /** Whose gap g is, in words. */
    private cmGapWhose(g: Gap): string {
      const where = (this.sections as unknown[]).map((_, i) => placeOf(this.cmSections[i], i));
      if (g.edge) return `Between the ${g.edge.layer > 1 ? `layer ${g.edge.layer} ` : ""}${g.edge.place} edge and its middle.`;
      return `After ${panelName(where, g.after!)}, to the next along its edge.`;
    }

    /** Gap g's box: its size, or every gap's; a line added in it. */
    private cmGap(g: Gap, anchor: Element) {
      const line = this.cmLineOf(g);
      this.cmMini(
        anchor,
        "Gap",
        this.cmGapWhose(g),
        { gap: g.size, all: false },
        (v) => ({
          schema: [
            { name: "gap", selector: PX(0, 200) },
            { name: "all", selector: { boolean: {} } },
          ],
          data: v,
          labels: { gap: ["Gap", ""], all: ["Apply to all", "Every gap in the view, on every layer, this size."] },
          change: (x) => x,
        }),
        (v, layout, sections) => {
          const gap = Math.max(0, Number(v.gap) || 0);
          return v.all ? this.cmAllGaps(gap, layout, sections) : this.cmGapSet(g, "gap", gap, layout, sections);
        },
        line ? [] : [{ label: "+ Add a line", run: () => this.cmSaveAll(...this.cmGapSet(g, "line", {}, this.cmLayout, this.cmSections)) }],
      );
    }

    /** Gap g's line's box: its width, colour, style, knock and ends; or removed. */
    private cmLine(g: Gap, anchor: Element) {
      const value = { width: 1, color: [0, 0, 0], style: "solid", knock: 0, extend_start: 0, extend_end: 0, ...this.cmLineOf(g) };
      this.cmMini(
        anchor,
        "Line",
        `In the gap: ${this.cmGapWhose(g).toLowerCase()}`,
        value,
        (v) => ({
          schema: [
            { name: "width", selector: PX(0, 40) },
            { name: "color", selector: { color_rgb: {} } },
            {
              name: "style",
              selector: { select: { mode: "dropdown", options: ["solid", "dashed", "dotted", "double"].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) })) } },
            },
            { name: "knock", selector: PX(-200, 200) },
            { name: "extend_start", selector: PX(-400, 400) },
            { name: "extend_end", selector: PX(-400, 400) },
          ],
          data: v,
          labels: {
            width: ["Width", ""],
            color: ["Colour", ""],
            style: ["Style", ""],
            knock: ["Knock", "px across from the middle of the gap."],
            extend_start: ["Past its start", "px beyond the top or left end; less than none, stops short of it."],
            extend_end: ["Past its end", "px beyond the bottom or right end; less than none, stops short of it."],
          },
          change: (x) => x,
        }),
        (v, layout, sections) => this.cmGapSet(g, "line", v, layout, sections),
        [{ label: "Remove line", run: () => this.cmSaveAll(...this.cmGapSet(g, "line", undefined, this.cmLayout, this.cmSections)) }],
      );
    }

    /** The margin's box, for one side: its size, or every side's. */
    private cmMargin(side: Side, anchor: Element) {
      const m = sides(this.cmLayout.margin);
      this.cmMini(
        anchor,
        `Margin, ${side}`,
        side === "top" ? "Below the header." : side === "bottom" ? "Above the footer." : `Against the screen's ${side}.`,
        { margin: m[SIDES.indexOf(side)], all: false },
        (v) => ({
          schema: [
            { name: "margin", selector: PX(0, 400) },
            { name: "all", selector: { boolean: {} } },
          ],
          data: v,
          labels: { margin: ["Margin", ""], all: ["Apply to all", "Every side this size."] },
          change: (x) => x,
        }),
        (v, layout, sections) => {
          const px = Math.max(0, Number(v.margin) || 0);
          if (v.all) return [{ ...layout, margin: px }, sections];
          const each = Object.fromEntries(SIDES.map((sd, i) => [sd, sd === side ? px : m[i]]));
          return [{ ...layout, margin: each }, sections];
        },
      );
    }

    /** Edge p of layer k's depth's box: as tall or wide as its cards, or its size. */
    private cmDepth(k: number, p: Panel, anchor: Element) {
      const room = () => {
        const b = this.cmBoxes[k - 1];
        return b && ([b[2], b[3]] as [number, number]);
      };
      this.cmMini(
        anchor,
        `${k > 1 ? `Layer ${k} ` : ""}${p[0].toUpperCase()}${p.slice(1)} edge`,
        p === "top" || p === "bottom" ? "How tall it is." : "How wide it is.",
        this.cmLayout,
        (l) => edgeForm(l, k, p, room, ["auto", "size", "unit"]),
        (l, _layout, sections) => [l, sections],
      );
    }

    /** The header's box: the space above it; HA's own editor for the rest. */
    private cmHeader(anchor: Element) {
      const header = this.shadowRoot?.querySelector("hui-view-header") as any;
      this.cmMini(
        anchor,
        "Header",
        "The view's header: its title and badges.",
        { header_space: headerSpace(this.cmLayout) },
        (v) => ({ schema: [{ name: "header_space", selector: PX(0, 200) }], data: v, labels: { header_space: ["Space above it", ""] }, change: (x) => x }),
        (v, layout, sections) => [{ ...layout, header_space: Math.max(0, Number(v.header_space) || 0) }, sections],
        [{ label: "Layout, badges and more (HA's own)…", run: () => header?._configure?.() }],
      );
    }

    /** The footer's box: under the panels, taking room, or floating over them (HA's own
     * way); HA's own editor for the rest. */
    private cmFooter(anchor: Element) {
      const footer = this.shadowRoot?.querySelector("hui-view-footer") as any;
      this.cmMini(
        anchor,
        "Footer",
        "The view's footer.",
        { footer: this.cmLayout.footer === "float" ? "float" : "space" },
        (v) => ({
          schema: [
            {
              name: "footer",
              selector: {
                select: {
                  mode: "list",
                  options: [
                    { value: "space", label: "Take space: under the panels" },
                    { value: "float", label: "Float: over the bottom of the panels (HA's own)" },
                  ],
                },
              },
            },
          ],
          data: v,
          labels: { footer: ["Where", ""] },
          change: (x) => x,
        }),
        (v, layout, sections) => {
          const { footer: _, ...rest } = layout;
          return [{ ...rest, ...(v.footer === "float" && { footer: "float" }) }, sections];
        },
        [{ label: "Its cards and more (HA's own)…", run: () => footer?._configure?.() }],
      );
    }

    /** Edge p of layer k's end, to the side of its layer's room or not (anchor_left, _right):
     * turned over and saved. */
    private cmAnchor(k: number, p: Panel, end: "left" | "right") {
      const key = `anchor_${end}`;
      const was = layerOf(this.cmLayout, k)[p]?.[key] ?? (LAYOUT.panels[p] as Record<string, unknown>)[key];
      const layout = withLayer(this.cmLayout, k, (c) => ({ ...c, [p]: { ...c[p], [key]: !was } }));
      this.cmSaveAll(layout, this.cmSections);
    }

    /** The lines in the gaps (tablet.ts: gapLines), drawn over the panels, live and in edit
     * mode, where each gap is now on the page. They take no room. */
    private cmLines(grid: HTMLElement, gaps: Gap[], tracks: [number[], number[]], edit: number): Drawn[] {
      let layer = grid.querySelector(":scope > .cm-lines") as HTMLElement | null;
      const drawn = gapLines(gaps, (g) => this.cmLineOf(g), (g) => this.cmGapRect(g, tracks, edit));
      if (!drawn.length) {
        layer?.remove();
        return drawn;
      }
      if (!layer) {
        layer = document.createElement("div");
        layer.className = "cm-lines";
        grid.append(layer); // after Lit's part, so Lit leaves it alone; absolute, so no cell
      }
      const svg = drawn
        .map((l) => {
          const w = l.width;
          const dash = l.style === "dashed" ? ` stroke-dasharray="${3 * w} ${2 * w}"` : l.style === "dotted" ? ` stroke-dasharray="0 ${2 * w}" stroke-linecap="round"` : "";
          if (l.style !== "double") return `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${l.color}" stroke-width="${w}"${dash}/>`;
          // Two thin lines, a third of its width each, a third apart.
          const t = Math.max(1, w / 3);
          const [dx, dy] = l.y1 === l.y2 ? [0, t] : [t, 0];
          return [-1, 1]
            .map((k) => `<line x1="${l.x1 + k * dx}" y1="${l.y1 + k * dy}" x2="${l.x2 + k * dx}" y2="${l.y2 + k * dy}" stroke="${l.color}" stroke-width="${t}"/>`)
            .join("");
        })
        .join("");
      const html = `<svg>${svg}</svg>`;
      if (layer.dataset.html !== html) [layer.innerHTML, layer.dataset.html] = [html, html];
      return drawn;
    }

    /** A click on the edit surface's marks (dimension labels, chips, locks): what it opens. */
    private cmMark = (ev: Event) => {
      const b = (ev.target as Element).closest("button");
      if (!b) return;
      ev.stopPropagation();
      const d = b.dataset;
      const gap = () => this.cmGapsNow.find((g) => g.id === d.gap || g.id === d.line);
      if (d.gap) gap() && this.cmGap(gap()!, b);
      else if (d.line) gap() && this.cmLine(gap()!, b);
      else if (d.margin) this.cmMargin(d.margin as Side, b);
      else if (d.depth) this.cmDepth(Number(d.depth.split(".")[0]), d.depth.split(".")[1] as Panel, b);
      else if (d.lock) this.cmAnchor(Number(d.lock.split(".")[0]), d.lock.split(".")[1] as Panel, d.lock.split(".")[2] as "left" | "right");
      else if (d.end === "header" || d.n === "header") this.cmHeader(b);
      else if (d.end === "footer") this.cmFooter(b);
      else if (d.n) this.cmOptions(Number(d.n), b);
    };

    /** An overlay of the grid's (absolute, so no cell; after Lit's part, so Lit leaves it
     * alone), its clicks the marks'. */
    private cmOverlay(grid: HTMLElement, name: string): HTMLElement {
      let o = grid.querySelector(`:scope > .${name}`) as HTMLElement | null;
      if (!o) {
        o = document.createElement("div");
        o.className = name;
        o.addEventListener("click", this.cmMark);
        grid.append(o);
      }
      return o;
    }

    /** The dimension lines over the panels in edit mode (none out of it): each edge's depth
     * 92% along it, each gap across it, the margin each side, each panel's padding, and its
     * size in its corner; sizes as out of edit mode (`real`), where the panels are now on
     * the page. Each label opens the box that sets it. */
    private cmDims(grid: HTMLElement, show: boolean, where: ReturnType<typeof placeOf>[], real: ReturnType<typeof placePanels>, gaps: Gap[], tracks: [number[], number[]], edit: number) {
      if (!show) return grid.querySelector(":scope > .cm-dims")?.remove();
      const dims = this.cmOverlay(grid, "cm-dims");
      const g = grid.getBoundingClientRect();
      const boxes = [...grid.querySelectorAll<HTMLElement>(":scope > .section")];
      const on = (n: number) => {
        const r = boxes[n]?.getBoundingClientRect();
        return r && r.width > 0 ? { l: r.left - g.left, t: r.top - g.top, r: r.right - g.left, b: r.bottom - g.top } : null;
      };
      const lines: string[] = [];
      const labels: string[] = [];
      const [TICK, ARROW] = [5, 7];
      /** A dimension from (x1, y1) to (x2, y2), running `down` (else across): a tick across each
       * end, arrowheads while there is room for them, and its label (`data`: what it opens) on
       * it in the middle when there is room for the label clear of them too, else beside it. */
      const dim = (x1: number, y1: number, x2: number, y2: number, text: string, data: string, down: boolean) => {
        const [tx, ty] = down ? [TICK, 0] : [0, TICK];
        const length = Math.abs(down ? y2 - y1 : x2 - x1);
        const arrows = length >= 2 * ARROW + 2 ? ` marker-start="url(#cm-arrow)" marker-end="url(#cm-arrow)"` : "";
        lines.push(
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${arrows}/>`,
          `<line x1="${x1 - tx}" y1="${y1 - ty}" x2="${x1 + tx}" y2="${y1 + ty}"/>`,
          `<line x1="${x2 - tx}" y1="${y2 - ty}" x2="${x2 + tx}" y2="${y2 + ty}"/>`,
        );
        const [w, h] = [text.length * 6.6 + 14, 16]; // its label, about
        const fits = length >= (down ? h : w) + 2 * ARROW + 6;
        const [mx, my] = [(x1 + x2) / 2, (y1 + y2) / 2];
        const [lx, ly] = fits ? [mx, my] : down ? [mx + TICK + 4 + w / 2, my] : [mx, my - TICK - 4 - h / 2];
        labels.push(`<button ${data} style="left:${lx}px;top:${ly}px">${text}</button>`);
      };
      const px = (v: number) => `${Math.round(v)} px`;
      const along = (a: number, b: number, f: number) => Math.round(a + f * (b - a));
      // Each edge's depth, 92% along it (clear of the panels' sizes in their corners).
      const edges = new Map<string, number[]>();
      where.forEach((w, n) => {
        if (w && w.place !== "main" && real.places[n] && on(n)) edges.set(`${w.layer}.${w.place}`, [...(edges.get(`${w.layer}.${w.place}`) ?? []), n]);
      });
      for (const [key, ns] of edges) {
        const [layer, place] = key.split(".");
        const c = layerOf(this.cmLayout, Number(layer))[place] ?? {};
        const across = place === "top" || place === "bottom";
        const depth = Math.max(...ns.map((n) => real.places[n]!.rect[across ? 3 : 2]));
        const set = c.size === "auto" ? "auto" : c.unit === "px" ? "" : `${c.size ?? LAYOUT.panels[place as "top"].size}%`;
        const text = set ? `${set} · ${px(depth)}` : px(depth);
        const u = ns.map(on).reduce((a, r) => ({ l: Math.min(a!.l, r!.l), t: Math.min(a!.t, r!.t), r: Math.max(a!.r, r!.r), b: Math.max(a!.b, r!.b) }))!;
        const tip = `title="How ${across ? "tall" : "wide"} the ${Number(layer) > 1 ? `layer ${layer} ` : ""}${place} edge is: as its cards, or a size"`;
        if (across) dim(along(u.l, u.r, 0.92), u.t, along(u.l, u.r, 0.92), u.b, text, `data-depth="${key}" ${tip}`, true);
        else dim(u.l, along(u.t, u.b, 0.92), u.r, along(u.t, u.b, 0.92), text, `data-depth="${key}" ${tip}`, false);
      }
      // Each gap, across it, 30% along.
      for (const gp of gaps) {
        const [x, y, w, h] = this.cmGapRect(gp, tracks, edit);
        const data = `data-gap="${gp.id}" title="This gap: its size, or every gap's; or add a line in it"`;
        if (gp.across) dim(along(x, x + w, 0.3), y, along(x, x + w, 0.3), y + h, `gap ${gp.size}`, data, true);
        else dim(x, along(y, y + h, 0.3), x + w, along(y, y + h, 0.3), `gap ${gp.size}`, data, false);
      }
      // The margin, round the grid (in edit mode, outside it), each side, 30% along.
      const [mt, mr, mb, ml] = real.inset;
      const [gw, gh] = [g.width, g.height];
      const margin = (side: string, where: string) => `data-margin="${side}" title="The margin ${where}: this side, or every side"`;
      dim(along(0, gw, 0.3), -mt, along(0, gw, 0.3), 0, `margin ${mt}`, margin("top", "below the header"), true);
      dim(along(0, gw, 0.3), gh, along(0, gw, 0.3), gh + mb, `margin ${mb}`, margin("bottom", "above the footer"), true);
      dim(-ml, along(0, gh, 0.3), 0, along(0, gh, 0.3), `margin ${ml}`, margin("left", "against the screen's left"), false);
      dim(gw, along(0, gh, 0.3), gw + mr, along(0, gh, 0.3), `margin ${mr}`, margin("right", "against the screen's right"), false);
      // Each panel's padding, inside it, a side at a time.
      real.places.forEach((p, n) => {
        const r = p && on(n);
        if (!r) return;
        const [pt, pr, pb, pl] = sides(this.cmSections[n]?.view_layout?.padding);
        const data = `data-n="${n}" title="Its padding, round its cards: in its options"`;
        if (pt) dim(along(r.l, r.r, 0.5), r.t, along(r.l, r.r, 0.5), r.t + pt, `pad ${pt}`, data, true);
        if (pb) dim(along(r.l, r.r, 0.5), r.b - pb, along(r.l, r.r, 0.5), r.b, `pad ${pb}`, data, true);
        if (pl) dim(r.l, along(r.t, r.b, 0.5), r.l + pl, along(r.t, r.b, 0.5), `pad ${pl}`, data, false);
        if (pr) dim(r.r - pr, along(r.t, r.b, 0.5), r.r, along(r.t, r.b, 0.5), `pad ${pr}`, data, false);
      });
      // The space above the header, 92% along it.
      const header = (grid.getRootNode() as ShadowRoot).querySelector("hui-view-header") as HTMLElement | null;
      const h = header?.getBoundingClientRect();
      if (h && h.height > 0) {
        const space = headerSpace(this.cmLayout);
        const x = Math.round(h.left - g.left + 0.92 * h.width);
        dim(x, h.top - g.top, x, h.top - g.top + space, `space ${space}`, `data-n="header" title="The space above the header"`, true);
      }
      // Each panel's size, in its bottom right corner.
      real.places.forEach((p, n) => {
        const r = p && on(n);
        if (r) labels.push(`<button class="cm-size" data-n="${n}" title="Its size on the screen, out of edit mode; its options" style="left:${r.r - 6}px;top:${r.b - 6}px">${Math.round(p.rect[2])} × ${Math.round(p.rect[3])}</button>`);
      });
      const html =
        `<svg><defs><marker id="cm-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
        `<path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>${lines.join("")}</svg>${labels.join("")}`;
      if (dims.dataset.html !== html) [dims.innerHTML, dims.dataset.html] = [html, html];
    }

    /** The edit surface's marks (none out of edit mode): the header's and footer's chips, a
     * LINE chip on each line, and a lock at each end of the top and bottom edges, level with
     * them: that end to its layer's side (anchored) or not. */
    private cmEditMarks(grid: HTMLElement, editing: boolean, where: ReturnType<typeof placeOf>[], drawn: Drawn[]) {
      if (!editing) return grid.querySelector(":scope > .cm-ends")?.remove();
      const marks = this.cmOverlay(grid, "cm-ends");
      const root = grid.getRootNode() as ShadowRoot;
      const g = grid.getBoundingClientRect();
      const out: string[] = [];
      for (const end of ["header", "footer"]) {
        const r = root.querySelector(`hui-view-${end}`)?.getBoundingClientRect();
        const tip = end === "header" ? "The header: the space above it, and HA's own editor for the rest" : "The footer: take space under the panels or float over them, and HA's own editor";
        if (r && r.height > 0)
          out.push(`<button class="cm-chip" data-end="${end}" title="${tip}" style="left:${Math.round(r.left - g.left + 10)}px;top:${Math.round(r.top - g.top + 6)}px">${end}</button>`);
      }
      for (const l of drawn) {
        const [x, y] = [Math.round((l.x1 + l.x2) / 2), Math.round((l.y1 + l.y2) / 2)];
        out.push(`<button class="cm-line" data-line="${l.id}" title="This line: its width, colour, style, knock and ends, or remove it" style="left:${x}px;top:${y}px">line</button>`);
      }
      const boxes = [...grid.querySelectorAll<HTMLElement>(":scope > .section")];
      const on = (n: number) => {
        const r = boxes[n]?.getBoundingClientRect();
        return r && r.width > 0 && !boxes[n].classList.contains("cm-off") ? { l: r.left - g.left, t: r.top - g.top, r: r.right - g.left, b: r.bottom - g.top } : null;
      };
      const union = (ns: number[]) =>
        ns.map(on).reduce<ReturnType<typeof on>>((a, r) => (!r ? a : !a ? r : { l: Math.min(a.l, r.l), t: Math.min(a.t, r.t), r: Math.max(a.r, r.r), b: Math.max(a.b, r.b) }), null);
      const depth = Math.max(1, ...where.map((w) => (w && w.place !== "main" ? w.layer : 1)));
      for (let k = 1; k <= depth; k++) {
        for (const p of ["top", "bottom"] as const) {
          const edge = union(where.flatMap((w, n) => (w && w.layer === k && w.place === p ? [n] : [])));
          if (!edge) continue;
          const y = Math.round((edge.t + edge.b) / 2);
          for (const end of ["left", "right"] as const) {
            const key = `anchor_${end}`;
            const on = !!(layerOf(this.cmLayout, k)[p]?.[key] ?? (LAYOUT.panels[p] as Record<string, unknown>)[key]);
            const x = Math.round(end === "left" ? edge.l : edge.r);
            const label = `${k > 1 ? `Layer ${k} ` : ""}${p} edge to the ${end} side: ${on ? "on" : "off"}`;
            const tip = `${k > 1 ? `Layer ${k}'s ` : "The "}${p} edge ${on ? "runs" : "stops short of the side panel; click to run it"} to the ${end} side${on ? ", over the side panel; click to stop it short" : ""}`;
            out.push(`<button class="cm-lock ${on ? "on" : ""}" data-lock="${k}.${p}.${end}" aria-label="${label}" title="${tip}" style="left:${x}px;top:${y}px"><svg viewBox="0 0 24 24"><path d="${on ? LOCKED : UNLOCKED}"/></svg></button>`);
          }
        }
      }
      const html = out.join("");
      if (marks.dataset.html !== html) [marks.innerHTML, marks.dataset.html] = [html, html];
    }

    /** Section n's toolbar in its box (edit mode): its chip, + and its arrows while its edge
     * has another, or the chip alone when they do not fit. */
    private cmTools(box: HTMLElement, show: boolean, where: ReturnType<typeof placeOf>[], n: number) {
      let tools = box.querySelector(":scope > .cm-tools") as HTMLElement | null;
      if (!show || !where[n]) {
        box.style.minWidth = ""; // out of edit mode, its share alone
        return tools?.remove();
      }
      if (!tools) {
        tools = document.createElement("div");
        tools.className = "cm-tools";
        tools.addEventListener("click", this.cmTool);
        box.append(tools); // after Lit's part in the box, so Lit leaves it alone
      }
      const w = where[n]!;
      const stack = stackOf(where, n);
      const i = stack.indexOf(n);
      const across = w.place === "top" || w.place === "bottom";
      const depth = depthOf(where);
      const hidden = w.place !== "main" && layerOf(this.cmLayout, w.layer)[w.place]?.hidden;
      const name = w.place === "main" && depth > 1 ? `Main · ${depth} layers` : `${panelName(where, n)}${hidden ? " · hidden" : ""}`;
      const tip =
        w.place === "main"
          ? "The main panel: its padding, and the main panel's shape; add or remove a layer"
          : `${panelName(where, n)}: its own options, and its whole edge's`;
      const [back, on] = across ? ["left", "right"] : ["up", "down"];
      const html =
        `<button class="cm-chip" data-act="options" title="${tip}">${name}</button>` +
        (w.place === "main"
          ? depth < LAYERS
            ? `<button data-act="add" aria-label="Add a layer" title="Add a layer inside this one: its four edges, a panel each">+</button>`
            : ""
          : `<button data-act="add" aria-label="Add a panel" title="Add a panel after this one, in its edge">+</button>` +
            (stack.length > 1
              ? `<button data-act="back" aria-label="Move earlier" title="Move it ${back}, along its edge" ${i === 0 ? "disabled" : ""}>${across ? "←" : "↑"}</button>` +
                `<button data-act="on" aria-label="Move later" title="Move it ${on}, along its edge" ${i === stack.length - 1 ? "disabled" : ""}>${across ? "→" : "↓"}</button>`
              : ""));
      if (tools.dataset.html !== html) [tools.innerHTML, tools.dataset.html] = [html, html];
      tools.dataset.n = String(n);
      // What shares the top of HA's frame with it: its own actions (the menu), on the right.
      const frame = box.querySelector("hui-section-edit-mode") as HTMLElement | null;
      const theirs = (frame?.shadowRoot?.querySelector(".section-actions") as HTMLElement | null)?.offsetWidth ?? 0;
      const clear = 10 + 8 + theirs; // its left, a space, theirs
      tools.classList.remove("cm-narrow");
      tools.classList.toggle("cm-narrow", tools.scrollWidth > box.clientWidth - clear);
      // The panel's least width (its columns grow to it, and the view scrolls): its chip clear
      // of HA's actions, or HA's frame round its Add card button, square, if more.
      const chip = (tools.querySelector(".cm-chip") as HTMLElement | null)?.offsetWidth ?? 0;
      const wrapper = frame?.shadowRoot?.querySelector(".section-wrapper") as HTMLElement | null;
      const cs = wrapper && getComputedStyle(wrapper);
      const round = cs ? ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"].reduce((t, k) => t + (parseFloat(cs[k as "paddingLeft"]) || 0), 0) : 0;
      const row = parseFloat(getComputedStyle(box).getPropertyValue("--row-height")) || ROW;
      box.style.minWidth = `${Math.ceil(Math.max(chip + clear, row + round))}px`;
    }

    /** How many card columns section n's grid has when its cards size it (else HA's own,
     * 12 a Width): a top or bottom one as wide as its cards in a stack of more than one
     * showing, its own; every one in a left or right panel of size: auto, the widest's. */
    private cmGridColumns(n: number, sections: (Section | null)[]): number | null {
      const s = sections[n]!;
      const peers = sections.flatMap((t, i) => (t?.shows && t.layer === s.layer && t.place === s.place ? [i] : []));
      const columns = (i: number) => this.cmCardColumns(i, s.place);
      if (s.place === "top" || s.place === "bottom") return s.share === undefined && s.size !== "fill" && peers.length > 1 ? columns(n) || null : null;
      if (s.place === "main" || !autoSized(layerOf(this.cmLayout, s.layer), s.place)) return null;
      return Math.max(0, ...peers.map(columns)) || null;
    }

    /** A section's grid in `columns` card columns (null: HA's own). */
    private cmGrid(section: any, columns: number | null) {
      const grid = section?.querySelector("hui-grid-section") as HTMLElement | null;
      if (!grid) return;
      if (columns === null) {
        grid.style.removeProperty("--base-column-count");
        grid.style.removeProperty("--column-span");
      } else {
        grid.style.setProperty("--base-column-count", String(columns));
        grid.style.setProperty("--column-span", "1");
      }
    }

    /** A section with one card that counts showing: that card fills it (FILL). */
    private cmFill(section: any, cards: HuiCard[]) {
      const grid = section?.querySelector("hui-grid-section") as HTMLElement | null;
      if (!grid?.shadowRoot) return;
      const sheets = grid.shadowRoot.adoptedStyleSheets;
      if (!sheets.includes(FILL)) grid.shadowRoot.adoptedStyleSheets = [...sheets, FILL];
      const fill = cards.length === 1 ? cards[0] : null;
      grid.toggleAttribute("cm-fill", !!fill);
      for (const c of section._cards ?? []) (c as HTMLElement).toggleAttribute("cm-fill", c === fill);
    }

    /** The debug label: this view's size, the room below its top, and how far the page
     * still scrolls (should be 0 x 0). */
    private cmShow() {
      if (!this.cmDebug && !this.cmApp.show_size) return this.cmLabel?.remove();
      if (!this.cmLabel?.isConnected) {
        this.cmLabel = document.createElement("div");
        this.cmLabel.className = "cm-debug";
        this.shadowRoot?.prepend(this.cmLabel); // before Lit's part, so Lit leaves it alone
      }
      const r = this.getBoundingClientRect();
      const page = document.documentElement;
      this.cmLabel.textContent =
        `view ${Math.round(r.width)} x ${Math.round(r.height)}, room ${room(this as unknown as Element)}\n` +
        `page scrolls ${page.scrollWidth - page.clientWidth} x ${page.scrollHeight - page.clientHeight}` +
        tooTall(this as unknown as Element, page.clientHeight);
    }
  }
  define("casa-mia-tablet-layout", TabletView as unknown as CustomElementConstructor);
  // Its first name, for views made before 2026.10.3-b26. ponytail: drop once none is left.
  define("casa-mia-tablet-view", class extends (TabletView as any) {} as unknown as CustomElementConstructor);
});

// A section's frame and menu in edit mode (HA's hui-section-edit-mode): the frame fills the
// panel's room; its menu: Edit, and Delete while its
// stack has another (cm-deletable, set by the view), so a panel keeps a section; no drag
// handle (sections stay where they are, see updated; a panel's toolbar orders a
// stack) and no Duplicate.
const MENU = new CSSStyleSheet();
MENU.replaceSync(
  `.handle, ha-dropdown-item[value="duplicate"], :host(:not([cm-deletable])) ha-dropdown-item[value="delete"], :host(:not([cm-deletable])) wa-divider { display: none; }
  /* Its frame fills the panel's room, as the panel does out of edit mode (not only its cards' height). */
  :host { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
  .section-wrapper { flex: 1 1 auto; box-sizing: border-box; }`,
);
customElements.whenDefined("hui-section-edit-mode").then(() => {
  const proto = (customElements.get("hui-section-edit-mode") as any).prototype;
  const first = proto.firstUpdated;
  proto.firstUpdated = function (this: any, ...args: unknown[]) {
    first?.apply(this, args);
    for (let n: Node | null = this; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null))
      if (TYPES.some((t) => (n as Element).tagName === t.slice("custom:".length).toUpperCase())) {
        const root = this.shadowRoot as ShadowRoot | null;
        if (root && !root.adoptedStyleSheets.includes(MENU)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, MENU];
        return;
      }
  };
});

// HA's view editor (Edit view, and Add view) lists only its own types; Tablet Layout joins
// them, as layout-card's do (it patches the same method). Its dialog keeps a Sections view's
// sections from going to another type (it would lose them, so Save is off); this view is a
// Sections view, so to the dialog it is one. Of the Sections view's own options it offers
// two (dense section placement means nothing where the layout places the panels):
//   max_columns: the most a panel's Width (its section's column_span, in the section's
//     settings) may be; a panel's cards are laid out in 12 x its Width columns, so cards at
//     full width line up that many across;
//   top_margin: HA's extra space above the view (the theme's
//     --ha-view-sections-extra-top-margin, 80 px), taken from the panels' height.
const TYPE = "custom:casa-mia-tablet-layout";
const TYPES = [TYPE, "custom:casa-mia-tablet-view"]; // and its first name
customElements.whenDefined("hui-view-editor").then(() => {
  const proto = (customElements.get("hui-view-editor") as any).prototype;
  const first = proto.firstUpdated;
  proto.firstUpdated = function (this: any, ...args: unknown[]) {
    first?.apply(this, args);
    const schema = this._schema;
    if (typeof schema !== "function") return;
    this._schema = (...a: unknown[]) =>
      schema(...a).map((f: any) => {
        if (f.name === "section_specifics" && TYPES.includes(this._config?.type))
          return { ...f, visible: undefined, schema: f.schema.filter((o: any) => o.name !== "dense_section_placement") };
        const options = f.name === "type" ? f.selector?.select?.options : undefined;
        if (!options || options.some((o: any) => o.value === TYPE)) return f;
        return { ...f, selector: { select: { ...f.selector.select, options: [...options, { value: TYPE, label: "Tablet (Casa Mia)" }] } } };
      });
    this.requestUpdate();
  };
  // A view without max_columns shows HA's default (DEFAULT_MAX_COLUMNS), not an empty field
  // (HA writes it into a new Sections view; a Tablet Layout has none). Saved only on a change.
  const config = Object.getOwnPropertyDescriptor(proto, "config");
  if (config?.set)
    Object.defineProperty(proto, "config", {
      ...config,
      set(this: any, c: any) {
        config.set!.call(this, TYPES.includes(c?.type) && c.max_columns === undefined ? { ...c, max_columns: 4 } : c);
      },
    });
  // HA's drops the Sections options from a view of any other type: this one keeps its two.
  const changed = proto._valueChanged;
  proto._valueChanged = function (this: any, ev: CustomEvent) {
    const config = ev.detail?.value;
    if (!TYPES.includes(config?.type)) return changed.call(this, ev);
    const kept = new Proxy(config, { deleteProperty: (t, k) => k === "max_columns" || k === "top_margin" || Reflect.deleteProperty(t, k) });
    return changed.call(this, new CustomEvent(ev.type, { detail: { value: kept } }));
  };
});
customElements.whenDefined("hui-dialog-edit-view").then(() => {
  const proto = (customElements.get("hui-dialog-edit-view") as any).prototype;
  const type = Object.getOwnPropertyDescriptor(proto, "_type");
  if (!type?.get) return;
  Object.defineProperty(proto, "_type", {
    ...type,
    get(this: any) {
      return TYPES.includes(this._config?.type) ? "sections" : type.get!.call(this);
    },
  });
});
