// Layer 4: the Tablet Layout view, laying its panels out (cmPlace), defined on HA's Sections view.
import { define, type HuiCard, sectionsView } from "../ha.ts";
import { counts } from "../garnish.ts";
import { holdsPanelLayer } from "../over-layer/common.ts";
import { autoSized, layerOf, placeOf, placePanels, type Section, sides, stackOf } from "../tablet.ts";
import { headerSpace } from "./common.ts";
import { ViewBase } from "./base.ts";
import { ViewEdit } from "./edit.ts";
import { ViewDraw } from "./draw.ts";

sectionsView().then((Base: any) => {
  class TabletView extends ViewDraw(ViewEdit(ViewBase(Base))) {
    /** Each section to its place in the grid (tablet.ts: placePanels, panel, gap, middle, gap,
     * panel each way and each layer, the stacks split along) sized by the engine; in edit mode
     * each row at least that tall. */
    protected cmPlace() {
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
        // Hide when empty, as the Section card: some card that counts is showing; never, out
        // of edit mode, a panel whose Over layer shows it whole (its cards are on the layer).
        const shows =
          !!section &&
          !section.hidden &&
          (editing ||
            layerOf(this.cmLayout, w.layer)[w.place]?.hide_empty === false ||
            (counting(section).length > 0 && !holdsPanelLayer(this.cmSections[n]?.cards)));
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
        // Garnish only (cards, none of them content), or shown whole by its Over layer: hatched,
        // as it never shows here out of edit mode.
        const cards: any[] = this.cmSections[n]?.cards ?? [];
        box.classList.toggle("cm-garnish-only", editing && !!at && !!where[n] && cards.length > 0 && (!cards.some(counts) || holdsPanelLayer(cards)));
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

  }
  define("casa-mia-tablet-layout", TabletView as unknown as CustomElementConstructor);
  // Its first name, for views made before 2026.10.3-b26. ponytail: drop once none is left.
  define("casa-mia-tablet-view", class extends (TabletView as any) {} as unknown as CustomElementConstructor);
});
