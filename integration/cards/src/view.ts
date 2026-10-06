// Tablet Layout (view type custom:casa-mia-tablet-view): HA's own Sections view, so its header,
// footer, badges and section editing are HA's, locked to the screen. HA puts every view in a
// container at least the screen tall with the header padded off; this view takes exactly
// that (flex basis 0, never its content's height) and clips, so the page never scrolls.
//
// Its sections are its panels, by position: main, left, top, right, bottom (edit mode adds
// the missing ones, empty, and names each panel; sections past five are not shown). The
// layout engine (layout.ts) places them, one item a panel, by the view's `layout:` options
// (those of layout.json; set in its settings dialog, view-settings.ts, from the Tablet
// layout button in edit mode); HA's grid places the cards in each. No adding or moving sections, so a
// section stays its panel; cards move between them as in any Sections view. A section's own
// visibility hides its panel, and so does having no card showing that counts (a heading
// marked `view_layout: {counts: false}` does not; panel option hide_empty: false keeps it);
// a hidden panel takes no room. In edit mode every panel shows. A panel with one card that
// counts showing is filled by it (headings above it keep their height; not in a top or bottom
// panel of `size: auto`, which is as tall as its cards instead): a Camera Commander
// there is in tile mode (ha.ts). Otherwise HA's grid places the cards, by their rows.
// Casa Mia's Settings page (through the integration, read each time the view shows) can
// outline each panel (identify_panels, with its CSS) and label the view's size, the room
// below its top and anything still scrolling the page (show_size); `debug: true` in the
// view's config does both.
import { css } from "lit";
import { define, type HuiCard, room, sectionsView, watchRoom } from "./ha.ts";
import { LAYOUT, layout, PANELS, type Rect, type Settings } from "./layout.ts";
import { counts } from "./section.ts";
import { compact, openSettings, type Preview } from "./view-settings.ts";

const PLACES = ["main", ...PANELS] as const;
const NAMES = ["Main", "Left", "Top", "Right", "Bottom"];
const GEAR =
  "M3,3H11V11H3V3M13,3H21V11H13V3M3,13H11V21H3V13M18,13H16V16H13V18H16V21H18V18H21V16H18V13Z"; // mdi view-grid-plus

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
  }
  /* Edit mode: the panels grow to what they hold and the view scrolls, editors and all. */
  :host([editing]) {
    overflow: auto;
  }
  :host([editing]) .wrapper {
    height: auto;
    min-height: 100%;
    padding: 0 var(--column-gap); /* HA's spacing back, for its editors */
  }
  :host([editing]) .container {
    flex: none;
    padding: var(--row-gap) 0;
  }
  :host([editing]) .content {
    position: relative;
    /* half each side of the engine's own gap track, so HA's spacing between two panels */
    gap: calc(var(--row-gap) / 2) calc(var(--column-gap) / 2);
  }
  :host([editing]) .section {
    overflow: visible;
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
  /* Edit mode: the Tablet Layout button over the panels, and each panel's name. */
  .cm-bar {
    display: flex;
    justify-content: center;
    padding: 12px 0 0;
  }
  .cm-bar button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 20px;
    border-radius: 20px;
    border: 1px solid var(--primary-color);
    background: none;
    color: var(--primary-color);
    cursor: pointer;
  }
  .cm-bar svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
  :host([editing]) .section {
    position: relative;
  }
  .cm-name {
    position: absolute;
    top: 8px;
    left: 12px;
    z-index: 2;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-primary-color, #fff);
    background: var(--primary-color);
    pointer-events: none;
  }
  :host([cm-identify]) .section {
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

/** Into each section's grid (HA's hui-grid-section, its own shadow root): with one card that
 * counts showing (cm-fill on the grid and that card), the cards in a column, the others
 * (headings) their own height and that card all the rest. */
const FILL = new CSSStyleSheet();
FILL.replaceSync(`
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

/** The engine's settings for a `layout:` config at this size: each panel one item while its
 * section shows (it fills its panel), the main one too. A top or bottom panel of `size:
 * auto` is as tall as its cards (`natural`, px), given to the engine as its share. */
export function settingsOf(
  config: Record<string, any>,
  width: number,
  height: number,
  showing: (place: string) => boolean,
  natural: (place: string) => number = () => 0,
): Settings {
  const s: Record<string, unknown> = { width, height, aspects: {} };
  for (const [k, o] of Object.entries(LAYOUT.main)) s[k] = config[k] ?? (o as { default: unknown }).default;
  for (const p of PANELS) {
    const pc = config[p] ?? {};
    const size = autoSized(config, p) ? (height > 0 ? (natural(p) / height) * 100 : 0) : pc.size;
    s[p] = { ...LAYOUT.panels[p], ...pc, ...(size !== undefined && { size }), fit: "cover", lines: 1, cameras: !pc.hidden && showing(p) ? [p] : [] };
  }
  return s as Settings;
}

/** The app's settings for this view (its Settings page, through the integration); none
 * without the integration. */
async function appSettings(hass: any): Promise<Record<string, any>> {
  try {
    return (await hass.callWS({ type: "casa_mia/settings" }))?.tablet_view ?? {};
  } catch {
    return {};
  }
}

/** A top or bottom panel sized to its cards. */
const autoSized = (config: Record<string, any>, p: string) => (p === "top" || p === "bottom") && config[p]?.size === "auto";

/** How tall a section's cards are, laid out at its width (HA's grid in the section). */
function cardsHeight(section: any): number {
  const grid = section?.querySelector("hui-grid-section") as HTMLElement | null;
  return (grid?.shadowRoot?.querySelector(".container") as HTMLElement | null)?.offsetHeight ?? 0;
}

sectionsView().then((Base: any) => {
  class TabletView extends Base {
    static styles = [Base.styles, LOCK];
    private cmDebug = false; // debug: true in the view's config
    private cmApp: Record<string, any> = {}; // the app's settings, appSettings
    private cmAsked = false; // since the view last showed
    private cmLayout: Record<string, any> = {};
    private cmLabel?: HTMLElement;
    private cmStop?: () => void;
    private cmFrame = 0;
    private cmAdding = false;
    private cmShown?: [number, number]; // the panels' area, out of edit mode
    private cmSeen = new ResizeObserver(() => this.cmLater());

    setConfig(config: any) {
      super.setConfig(config);
      this.cmDebug = !!config.debug;
      this.cmMarks();
      this.cmLayout = config.layout ?? {};
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
      this.cmAsked = false; // asked again next time it shows
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
      if (!this.cmAsked && this.hass) {
        this.cmAsked = true;
        appSettings(this.hass).then((s) => {
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

    /** In edit mode, a section for each panel the view has none for yet. */
    private cmComplete() {
      const config = this.lovelace.config;
      const view = config.views[this.index];
      const have = view.sections?.length ?? 0;
      if (this.isStrategy || this.cmAdding || have >= PLACES.length) return;
      this.cmAdding = true;
      const added = PLACES.slice(have).map(() => ({ type: "grid", cards: [] }));
      this.cmSaveView((v) => ({ ...v, sections: [...(v.sections ?? []), ...added] })).finally(() => (this.cmAdding = false));
    }

    /** Save this view's config, changed by `change`. */
    private cmSaveView(change: (view: any) => any): Promise<unknown> {
      const config = this.lovelace.config;
      const views = config.views.map((v: any, i: number) => (i === this.index ? change(v) : v));
      return Promise.resolve(this.lovelace.saveConfig({ ...config, views }));
    }

    /** In edit mode, the Tablet Layout button above the panels (outside Lit's part, as the
     * debug label). */
    private cmBar(editing: boolean) {
      const root = this.shadowRoot as ShadowRoot | null;
      let bar = root?.querySelector(".cm-bar");
      if (!editing || this.isStrategy) return bar?.remove();
      if (bar || !root) return;
      bar = document.createElement("div");
      bar.className = "cm-bar";
      bar.innerHTML = `<button type="button"><svg viewBox="0 0 24 24"><path d="${GEAR}"/></svg>Tablet Layout</button>`;
      bar.querySelector("button")!.addEventListener("click", () => this.cmSettings());
      root.prepend(bar);
    }

    private cmSettings() {
      openSettings({
        hass: this.hass,
        layout: this.cmLayout,
        preview: (l) => this.cmPreview(l),
        apply: (l) => {
          this.cmLayout = l;
          this.cmLater();
        },
        save: (l) =>
          this.cmSaveView((v) => {
            const { layout: _, ...rest } = v;
            return Object.keys(l).length ? { ...rest, layout: l } : rest;
          }),
      });
    }

    /** Where each panel lands for `l` on this screen, every panel that is not hidden shown
     * (for the dialog's map). */
    private cmPreview(l: Record<string, any>): Preview {
      // The screen it shows on: as last seen out of edit mode (edit mode's own is shorter).
      const [w, h] = this.cmShown ?? this.cmArea();
      const s = settingsOf(compact(l), w, h, (p) => p === "main" || !l[p]?.hidden, (p) => this.cmNatural(p));
      const [, main, tiles] = layout(s, "main");
      return { width: w, height: h, rects: { main, ...Object.fromEntries(PANELS.flatMap((p) => (tiles[p][0] ? [[p, tiles[p][0]]] : []))) } };
    }

    /** The panels' area: the container, which in edit mode grows, so then what it would be. */
    private cmArea(): [number, number] {
      const root = this.shadowRoot as ShadowRoot;
      const tall = (sel: string) => (root.querySelector(sel) as HTMLElement | null)?.offsetHeight ?? 0;
      const area = root.querySelector(".container") as HTMLElement | null;
      const h = this.lovelace?.editMode || !area ? this.clientHeight - tall(".cm-bar") - tall("hui-view-header") - tall("hui-view-footer") : area.clientHeight;
      return [this.clientWidth, h];
    }

    /** How tall a panel's cards are (for size: auto), watching them for changes. */
    private cmNatural(p: string): number {
      const section = this.sections[PLACES.indexOf(p as (typeof PLACES)[number])];
      const grid = section?.querySelector("hui-grid-section")?.shadowRoot?.querySelector(".container");
      if (grid) this.cmSeen.observe(grid); // its cards come and go, or change height
      return cardsHeight(section);
    }

    /** Each section to its panel's place: a 5 x 5 grid (panel, gap, middle, gap, panel each
     * way) sized by the engine; in edit mode each row at least that tall. */
    private cmPlace() {
      const root = this.shadowRoot as ShadowRoot | null;
      const grid = root?.querySelector(".content") as HTMLElement | null;
      if (!grid) return;
      const editing = !!this.lovelace?.editMode;
      this.cmBar(editing);
      const [aw, ah] = this.cmArea();
      if (!editing) this.cmShown = [aw, ah];
      // The margin is the grid's inset (none in edit mode, which has HA's own spacing), so
      // the engine lays out inside it.
      const m = editing ? 0 : Math.max(0, Math.min(Math.trunc(Number(this.cmLayout.margin ?? 0)), Math.floor((Math.min(aw, ah) - 1) / 2)));
      grid.style.inset = editing ? "" : `${m}px`;
      const [w, h] = [aw - 2 * m, ah - 2 * m];
      const showing = (p: string) => {
        const section = this.sections[PLACES.indexOf(p as (typeof PLACES)[number])];
        if (!section || section.hidden) return false;
        if (editing || this.cmLayout[p]?.hide_empty === false) return true;
        // Hide when empty, as the Section card: some card that counts is showing.
        return counting(section).length > 0;
      };
      const counting = (section: any): HuiCard[] => (section._cards ?? []).filter((c: HuiCard) => counts(c.config ?? { type: "" }) && !c.hidden);
      const s = { ...settingsOf(this.cmLayout, w, h, showing, (p) => this.cmNatural(p)), margin: 0 };
      const [, main, tiles] = layout(s, showing("main") ? "main" : null);
      const at = (p: (typeof PANELS)[number]) => tiles[p][0] ?? [0, 0, 0, 0];
      const [l, t, r, b] = [at("left")[2], at("top")[3], at("right")[2], at("bottom")[3]];
      const gap = s.gap;
      const xs = [0, l, l && l + gap, w - (r && r + gap), w - r, w]; // column lines
      const ys = [0, t, t && t + gap, h - (b && b + gap), h - b, h]; // row lines
      // Exact pixels; in edit mode, with HA's gaps between them, columns in proportion and
      // rows at least that tall.
      const tracks = (lines: number[], unit: (size: number) => string) => lines.slice(1).map((v, i) => unit(v - lines[i])).join(" ");
      grid.style.gridTemplateColumns = tracks(xs, (n) => (editing ? `minmax(0, ${n}fr)` : `${n}px`));
      grid.style.gridTemplateRows = tracks(ys, (n) => (editing ? `minmax(${n}px, auto)` : `${n}px`));
      const span = (lines: number[], from: number, size: number) => `${lines.indexOf(from) + 1} / ${lines.lastIndexOf(from + size) + 1}`;
      const boxes = [...root!.querySelectorAll<HTMLElement>(".content > .section")];
      boxes.forEach((box, n) => {
        const place = PLACES[n];
        const rect: Rect | undefined = place === "main" ? (showing("main") ? main : undefined) : tiles[place]?.[0];
        // Off only when it is not to show: one that shows but is no size yet (size: auto,
        // its cards not laid out) must stay laid out, or it measures 0 for ever.
        box.classList.toggle("cm-off", !rect);
        let name = box.querySelector(":scope > .cm-name");
        if (!editing) name?.remove();
        else if (!name && NAMES[n]) {
          name = document.createElement("div");
          name.className = "cm-name";
          name.textContent = NAMES[n];
          box.append(name); // after Lit's part in the box, so Lit leaves it alone
        }
        this.cmFill(this.sections[n], editing || autoSized(this.cmLayout, place) ? [] : counting(this.sections[n]));
        if (!rect) return;
        if (place === "main") {
          // The middle cell; a main with a shape of its own (fit: fixed) is centred in it.
          const shaped = rect[2] < xs[3] - xs[2] || rect[3] < ys[3] - ys[2];
          Object.assign(box.style, {
            gridColumn: "3 / 4",
            gridRow: "3 / 4",
            width: shaped ? `${rect[2]}px` : "",
            height: shaped && !editing ? `${rect[3]}px` : "",
            justifySelf: shaped ? "center" : "",
            alignSelf: shaped ? "center" : "",
          });
        } else Object.assign(box.style, { gridColumn: span(xs, rect[0], rect[2]), gridRow: span(ys, rect[1], rect[3]) });
      });
      this.cmShow();
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
  define("casa-mia-tablet-view", TabletView as unknown as CustomElementConstructor);
});

// HA's view editor (Edit view, and Add view) lists only its own types; Tablet Layout joins
// them, as layout-card's do (it patches the same method). Its dialog keeps a Sections view's
// sections from going to another type (it would lose them, so Save is off); this view is a
// Sections view, so to the dialog it is one.
const TYPE = "custom:casa-mia-tablet-view";
customElements.whenDefined("hui-view-editor").then(() => {
  const proto = (customElements.get("hui-view-editor") as any).prototype;
  const first = proto.firstUpdated;
  proto.firstUpdated = function (this: any, ...args: unknown[]) {
    first?.apply(this, args);
    const schema = this._schema;
    if (typeof schema !== "function") return;
    this._schema = (...a: unknown[]) =>
      schema(...a).map((f: any) => {
        const options = f.name === "type" ? f.selector?.select?.options : undefined;
        if (!options || options.some((o: any) => o.value === TYPE)) return f;
        return { ...f, selector: { select: { ...f.selector.select, options: [...options, { value: TYPE, label: "Tablet Layout (Casa Mia)" }] } } };
      });
    this.requestUpdate();
  };
});
customElements.whenDefined("hui-dialog-edit-view").then(() => {
  const proto = (customElements.get("hui-dialog-edit-view") as any).prototype;
  const type = Object.getOwnPropertyDescriptor(proto, "_type");
  if (!type?.get) return;
  Object.defineProperty(proto, "_type", {
    ...type,
    get(this: any) {
      return this._config?.type === TYPE ? "sections" : type.get!.call(this);
    },
  });
});
