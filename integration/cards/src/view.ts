// Tablet view (view type custom:casa-mia-tablet-view): HA's own Sections view, so its header,
// footer, badges and section editing are HA's, locked to the screen. HA puts every view in a
// container at least the screen tall with the header padded off; this view takes exactly
// that (flex basis 0, never its content's height) and clips, so the page never scrolls.
//
// Its sections are its panels, by position: main, left, top, right, bottom (edit mode adds
// the missing ones, headed with their names; sections past five are not shown). The layout
// engine (layout.ts) places them, one item a panel, by the view's `layout:` options (those
// of layout.json); HA's grid places the cards in each. No adding or moving sections, so a
// section stays its panel; cards move between them as in any Sections view. A section's own
// visibility hides its panel, and so does having no card showing that counts (a heading
// marked `view_layout: {counts: false}` does not; panel option hide_empty: false keeps it);
// a hidden panel takes no room. In edit mode every panel shows. A panel with one card that
// counts showing is filled by it (headings above it keep their height): a Camera Commander
// there is in tile mode (ha.ts). Otherwise HA's grid places the cards, by their rows.
// `debug: true` in the view's config shows its size and anything still scrolling the page.
import { css } from "lit";
import { define, type HuiCard, room, sectionsView, watchRoom } from "./ha.ts";
import { LAYOUT, layout, PANELS, type Rect, type Settings } from "./layout.ts";
import { counts } from "./section.ts";

const PLACES = ["main", ...PANELS] as const;

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
  }
  :host([editing]) .container {
    flex: none;
  }
  :host([editing]) .content {
    position: relative;
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
  :host([cm-debug]) .section {
    outline: 1px solid red;
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
    background: #ffd60a;
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
 * section shows (it fills its panel), the main one too. */
export function settingsOf(config: Record<string, any>, width: number, height: number, showing: (place: string) => boolean): Settings {
  const s: Record<string, unknown> = { width, height, aspects: {} };
  for (const [k, o] of Object.entries(LAYOUT.main)) s[k] = config[k] ?? (o as { default: unknown }).default;
  for (const p of PANELS) {
    const pc = config[p] ?? {};
    s[p] = { ...LAYOUT.panels[p], ...pc, fit: "cover", lines: 1, cameras: !pc.hidden && showing(p) ? [p] : [] };
  }
  return s as Settings;
}

sectionsView().then((Base: any) => {
  class TabletView extends Base {
    static styles = [Base.styles, LOCK];
    private cmDebug = false;
    private cmLayout: Record<string, any> = {};
    private cmLabel?: HTMLElement;
    private cmStop?: () => void;
    private cmFrame = 0;
    private cmAdding = false;
    private cmSeen = new ResizeObserver(() => this.cmLater());

    setConfig(config: any) {
      super.setConfig(config);
      this.cmDebug = !!config.debug;
      this.toggleAttribute("cm-debug", this.cmDebug);
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
    }

    updated(changed: Map<string, unknown>) {
      super.updated?.(changed);
      const editing = !!this.lovelace?.editMode;
      this.toggleAttribute("editing", editing);
      // Sections stay where they are: HA turns their dragging on in edit mode, this off.
      const sortable = this.shadowRoot?.querySelector(".container > ha-sortable");
      if (sortable) sortable.disabled = true;
      if (editing) this.cmComplete();
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
      const added = PLACES.slice(have).map((p) => ({
        type: "grid",
        cards: [{ type: "heading", heading: p[0].toUpperCase() + p.slice(1) }],
      }));
      const views = config.views.map((v: any, i: number) => (i === this.index ? { ...v, sections: [...(v.sections ?? []), ...added] } : v));
      Promise.resolve(this.lovelace.saveConfig({ ...config, views })).finally(() => (this.cmAdding = false));
    }

    /** Each section to its panel's place: a 5 x 5 grid (panel, gap, middle, gap, panel each
     * way) sized by the engine; in edit mode each row at least that tall. */
    private cmPlace() {
      const root = this.shadowRoot as ShadowRoot | null;
      const grid = root?.querySelector(".content") as HTMLElement | null;
      if (!grid) return;
      const tall = (sel: string) => (root!.querySelector(sel) as HTMLElement | null)?.offsetHeight ?? 0;
      const editing = !!this.lovelace?.editMode;
      // The panels' area: the container, which in edit mode grows, so then what it would be.
      const area = root!.querySelector(".container") as HTMLElement;
      const w = this.clientWidth;
      const h = editing ? this.clientHeight - tall("hui-view-header") - tall("hui-view-footer") : area.clientHeight;
      const showing = (p: string) => {
        const section = this.sections[PLACES.indexOf(p as (typeof PLACES)[number])];
        if (!section || section.hidden) return false;
        if (editing || this.cmLayout[p]?.hide_empty === false) return true;
        // Hide when empty, as the Section card: some card that counts is showing.
        return counting(section).length > 0;
      };
      const counting = (section: any): HuiCard[] => (section._cards ?? []).filter((c: HuiCard) => counts(c.config ?? { type: "" }) && !c.hidden);
      const s = settingsOf(this.cmLayout, w, h, showing);
      const [, main, tiles] = layout(s, showing("main") ? "main" : null);
      const at = (p: (typeof PANELS)[number]) => tiles[p][0] ?? [0, 0, 0, 0];
      const [l, t, r, b] = [at("left")[2], at("top")[3], at("right")[2], at("bottom")[3]];
      const gap = s.gap;
      const xs = [0, l, l && l + gap, w - (r && r + gap), w - r, w]; // column lines
      const ys = [0, t, t && t + gap, h - (b && b + gap), h - b, h]; // row lines
      const tracks = (lines: number[], grow: boolean) =>
        lines.slice(1).map((v, i) => `${grow ? "minmax(" : ""}${v - lines[i]}px${grow ? ", auto)" : ""}`).join(" ");
      grid.style.gridTemplateColumns = tracks(xs, false);
      grid.style.gridTemplateRows = tracks(ys, editing);
      const span = (lines: number[], from: number, size: number) => `${lines.indexOf(from) + 1} / ${lines.lastIndexOf(from + size) + 1}`;
      const boxes = [...root!.querySelectorAll<HTMLElement>(".content > .section")];
      boxes.forEach((box, n) => {
        const place = PLACES[n];
        const rect: Rect | undefined = place === "main" ? (showing("main") ? main : undefined) : tiles[place]?.[0];
        box.classList.toggle("cm-off", !rect || rect[2] <= 0 || rect[3] <= 0);
        this.cmFill(this.sections[n], editing ? [] : counting(this.sections[n]));
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
      if (!this.cmDebug) return this.cmLabel?.remove();
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
