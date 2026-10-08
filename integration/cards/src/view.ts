// Tablet Layout (view type custom:casa-mia-tablet-layout, "Tablet (Casa Mia)" in HA's view editor): HA's own Sections view, so its header,
// footer, badges and section editing are HA's, locked to the screen. HA puts every view in a
// container at least the screen tall with the header padded off; this view takes exactly
// that (flex basis 0, never its content's height) and clips, so the page never scrolls.
//
// Its sections are its panels, by position: main, left, top, right, bottom (edit mode adds
// the missing ones, empty, and names each panel; sections past five are not shown). The
// layout engine (layout.ts) places them, one item a panel, by the view's `layout:` options
// (those of layout.json; set in its settings dialog, view-settings.ts, from the Tablet
// layout button in edit mode); HA's grid places the cards in each. No adding, moving,
// duplicating or deleting sections (a panel's menu offers only Edit), so a section stays its panel; cards move between them as in any Sections view. A section's own
// visibility hides its panel, and so does having no card showing that counts (a heading
// marked `view_layout: {counts: false}` does not; panel option hide_empty: false keeps it);
// a hidden panel takes no room. In edit mode every panel shows. A panel with one card that
// counts showing is filled by it (headings above it keep their height; not in a top or bottom
// panel of `size: auto`, which is as tall as its cards instead): a Camera Commander
// there is in tile mode (ha.ts). Otherwise HA's grid places the cards, by their rows.
// Casa Mia's Settings page (through the integration, followed while the view shows) can
// outline each panel and the view's header and footer (identify_panels, with its CSS) and
// label the view's size, the room below its top and anything still scrolling the page
// (show_size); `debug: true` in the view's config does both.
import { css } from "lit";
import { define, type HuiCard, room, sectionsView, watchRoom } from "./ha.ts";
import { LAYOUT, layout, PANELS } from "./layout.ts";
import { counts } from "./section.ts";
import { autoSized, placePanels, PLACES, seenOut, settingsOf } from "./tablet.ts";
import { compact, openSettings, type Preview } from "./view-settings.ts";

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
  /* The footer under the panels, not over them: HA's sticks it a row gap above the bottom. */
  :host(:not([editing])) hui-view-footer {
    position: static;
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
      const [w, shown] = this.cmSeenOut.shown ?? this.cmArea();
      // Less a change to the space above the header (edit mode leaves HA's in place).
      const h = this.cmSeenOut.top === undefined ? shown : shown + this.cmSeenOut.top - headerSpace(l);
      const s = settingsOf(compact(l), w, h, (p) => p === "main" || !l[p]?.hidden, (p) => this.cmNatural(p));
      const [, main, tiles] = layout(s, "main");
      return { width: w, height: h, rects: { main, ...Object.fromEntries(PANELS.flatMap((p) => (tiles[p][0] ? [[p, tiles[p][0]]] : []))) } };
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

    /** How tall a panel's cards are (for size: auto), watching them for changes. In edit mode
     * as last measured out of it: there its cards carry HA's editors, which took the main
     * panel's room a step at a time. */
    private cmNatural(p: string): number {
      if (this.lovelace?.editMode && p in this.cmSeenOut.naturals) return this.cmSeenOut.naturals[p];
      const section = this.sections[PLACES.indexOf(p as (typeof PLACES)[number])];
      const grid = section?.querySelector("hui-grid-section")?.shadowRoot?.querySelector(".container");
      if (grid) this.cmSeen.observe(grid); // its cards come and go, or change height
      const h = cardsHeight(section);
      if (!this.lovelace?.editMode) this.cmSeenOut.naturals[p] = h;
      return h;
    }

    /** Each section to its panel's place: a 5 x 5 grid (panel, gap, middle, gap, panel each
     * way) sized by the engine; in edit mode each row at least that tall. */
    private cmPlace() {
      const root = this.shadowRoot as ShadowRoot | null;
      const grid = root?.querySelector(".content") as HTMLElement | null;
      if (!grid) return;
      const editing = !!this.lovelace?.editMode;
      this.cmBar(editing);
      // The room above the header (HA's padding, its row gap), before measuring; in edit mode
      // too, so the header stands where it will.
      const header = root!.querySelector("hui-view-header") as HTMLElement | null;
      const space = this.cmLayout.header_space === undefined ? undefined : headerSpace(this.cmLayout);
      header?.style.setProperty("padding-top", space === undefined ? "" : `${space}px`);
      // Edit mode sizes the panels as they show out of it: its header and footer are taller
      // (their editors), and the view scrolls, so its own room only letterboxed them.
      const [aw, ah] = editing && this.cmSeenOut.shown ? this.cmSeenOut.shown : this.cmArea();
      if (!editing) {
        this.cmSeenOut.shown = [aw, ah];
        this.cmSeenOut.top = header && !header.hidden ? headerSpace(this.cmLayout) : undefined;
      }
      const showing = (p: string) => {
        const section = this.sections[PLACES.indexOf(p as (typeof PLACES)[number])];
        if (!section || section.hidden) return false;
        if (editing || this.cmLayout[p]?.hide_empty === false) return true;
        // Hide when empty, as the Section card: some card that counts is showing.
        return counting(section).length > 0;
      };
      const counting = (section: any): HuiCard[] => (section._cards ?? []).filter((c: HuiCard) => counts(c.config ?? { type: "" }) && !c.hidden);
      const shown = PLACES.filter(showing);
      const naturals = Object.fromEntries(PANELS.filter((p) => autoSized(this.cmLayout, p)).map((p) => [p, this.cmNatural(p)]));
      const placed = placePanels(this.cmLayout, [aw, ah], editing, shown, naturals);
      grid.style.inset = editing ? "" : `${placed.inset}px`;
      grid.style.gridTemplateColumns = placed.columns;
      grid.style.gridTemplateRows = placed.rows;
      const boxes = [...root!.querySelectorAll<HTMLElement>(".content > .section")];
      boxes.forEach((box, n) => {
        const place = PLACES[n];
        const at = place ? placed.places[place] : null;
        // Off only when it is not to show: one that shows but is no size yet (size: auto,
        // its cards not laid out) must stay laid out, or it measures 0 for ever.
        box.classList.toggle("cm-off", !at);
        let name = box.querySelector(":scope > .cm-name");
        if (!editing) name?.remove();
        else if (!name && NAMES[n]) {
          name = document.createElement("div");
          name.className = "cm-name";
          name.textContent = NAMES[n];
          box.append(name); // after Lit's part in the box, so Lit leaves it alone
        }
        this.cmFill(this.sections[n], editing || autoSized(this.cmLayout, place) ? [] : counting(this.sections[n]));
        if (!at) return;
        Object.assign(box.style, {
          gridColumn: at.column,
          gridRow: at.row,
          width: at.width === undefined ? "" : `${at.width}px`,
          height: at.height === undefined ? "" : `${at.height}px`,
          justifySelf: at.centred ? "center" : "",
          alignSelf: at.centred ? "center" : "",
        });
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
  define("casa-mia-tablet-layout", TabletView as unknown as CustomElementConstructor);
  // Its first name, for views made before 2026.10.3-b26. ponytail: drop once none is left.
  define("casa-mia-tablet-view", class extends (TabletView as any) {} as unknown as CustomElementConstructor);
});

// A panel's section menu in edit mode (HA's hui-section-edit-mode): Edit only, and no drag
// handle (sections stay where they are, see updated). Duplicate
// would add a sixth section no panel shows; Delete would move every later panel along by
// one (sections are panels by position).
const MENU = new CSSStyleSheet();
MENU.replaceSync(`.handle, ha-dropdown-item[value="duplicate"], ha-dropdown-item[value="delete"], wa-divider { display: none; }`);
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
