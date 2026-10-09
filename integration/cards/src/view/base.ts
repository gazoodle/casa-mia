// Layer 1: HA's Sections view with the Tablet Layout's state, lifecycle and sizing (each panel's cards, columns, fill).
import { type HuiCard, room, TABLET, watchRoom } from "../ha.ts";
import { fills } from "../garnish.ts";
import { autoSized, cardColumns, cardsWidth, type Gap, layerOf, placeOf, PLACES, type Section, seenOut, sides } from "../tablet.ts";
import { tooTall, watchAppSettings, ROW, ROW_GAP, DIMS, cardsHeight } from "./common.ts";
import { LOCK, FILL } from "./styles.ts";

export const ViewBase = (Base: any) =>
  class extends Base {
    static styles = [Base.styles, LOCK];

    protected cmDebug = false; // debug: true in the view's config
    protected cmApp: Record<string, any> = {}; // the app's settings, watchAppSettings
    protected cmUnwatch?: () => void; // while the view shows
    protected cmLayout: Record<string, any> = {};

    protected cmBoxes: [number, number, number, number][] = []; // each layer's room, as last placed
    protected cmGapsNow: Gap[] = []; // the gaps, as last placed
    protected cmSections: any[] = []; // the view's sections' config
    protected cmColumns = 4; // the view's max_columns (HA's default)
    protected cmLabel?: HTMLElement;

    protected cmStop?: () => void;

    protected cmFrame = 0;

    protected cmAdding = false;

    /** Out of edit mode: the panels' area, the space above the header then (none: no
     * header), and the size: auto panels' heights. */
    protected get cmSeenOut() {
      return seenOut(location.pathname.split("/")[1], this.index);
    }

    protected cmSeen = new ResizeObserver(() => this.cmLater());


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
    protected cmHolder?: HTMLElement | null;


    connectedCallback() {
      super.connectedCallback();
      TABLET.shown++;
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
      TABLET.shown--;
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
    protected cmMarks() {
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


    protected cmLater = () => {
      cancelAnimationFrame(this.cmFrame);
      this.cmFrame = requestAnimationFrame(() => this.cmPlace());
    };


    /** In edit mode, a section for each panel of the first layer that has none yet. */
    protected cmComplete() {
      const config = this.lovelace.config;
      const have: any[] = config.views[this.index].sections ?? [];
      const missing = PLACES.filter((p) => !have.some((s, n) => placeOf(s, n)?.layer === 1 && placeOf(s, n)?.place === p));
      if (this.isStrategy || this.cmAdding || !missing.length) return;
      this.cmAdding = true;
      const added = missing.map((p) => ({ type: "grid", cards: [], view_layout: { panel: p } }));
      this.cmSaveView((v) => ({ ...v, sections: [...(v.sections ?? []), ...added] })).finally(() => (this.cmAdding = false));
    }


    /** Save this view's config, changed by `change`. */
    protected cmSaveView(change: (view: any) => any): Promise<unknown> {
      const config = this.lovelace.config;
      const views = config.views.map((v: any, i: number) => (i === this.index ? change(v) : v));
      return Promise.resolve(this.lovelace.saveConfig({ ...config, views }));
    }


    /** Whether the dimension lines show (this browser's choice; on by default). */
    protected get cmDimsOn(): boolean {
      try {
        return localStorage.getItem(DIMS) !== "off";
      } catch {
        return true;
      }
    }

    protected set cmDimsOn(on: boolean) {
      try {
        localStorage.setItem(DIMS, on ? "on" : "off");
      } catch {
        // not kept: on again next time
      }
    }


    /** What sets a section's length along its stack (tablet.ts: Section): a top or bottom
     * one's Width (column_span) of the view's columns, a left or right one's row_span, else
     * its view_layout's length (fill, cards); whether it is held to the end, and its own gap
     * after it. */
    protected cmLock(config: any, place: string): Partial<Section> {
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
    protected cmArea(): [number, number] {
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
    protected cmCardColumns(n: number, place: string): number {
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
    protected cmCards(n: number, at: { layer: number; place: string }, width: number): Partial<Section> {
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
    protected cmNatural(n: number): number {
      const key = String(n);
      if (this.lovelace?.editMode && key in this.cmSeenOut.naturals) return this.cmSeenOut.naturals[key];
      const section = this.sections[n];
      const grid = section?.querySelector("hui-grid-section")?.shadowRoot?.querySelector(".container");
      if (grid) this.cmSeen.observe(grid); // its cards come and go, or change height
      const h = cardsHeight(section);
      if (!this.lovelace?.editMode) this.cmSeenOut.naturals[key] = h;
      return h;
    }


    /** How many card columns section n's grid has when its cards size it (else HA's own,
     * 12 a Width): a top or bottom one as wide as its cards in a stack of more than one
     * showing, its own; every one in a left or right panel of size: auto, the widest's. */
    protected cmGridColumns(n: number, sections: (Section | null)[]): number | null {
      const s = sections[n]!;
      const peers = sections.flatMap((t, i) => (t?.shows && t.layer === s.layer && t.place === s.place ? [i] : []));
      const columns = (i: number) => this.cmCardColumns(i, s.place);
      if (s.place === "top" || s.place === "bottom") return s.share === undefined && s.size !== "fill" && peers.length > 1 ? columns(n) || null : null;
      if (s.place === "main" || !autoSized(layerOf(this.cmLayout, s.layer), s.place)) return null;
      return Math.max(0, ...peers.map(columns)) || null;
    }


    /** A section's grid in `columns` card columns (null: HA's own). */
    protected cmGrid(section: any, columns: number | null) {
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


    /** A section with one card that counts showing, of a kind that fills (fills()): it fills it (FILL). */
    protected cmFill(section: any, cards: HuiCard[]) {
      const grid = section?.querySelector("hui-grid-section") as HTMLElement | null;
      if (!grid?.shadowRoot) return;
      const sheets = grid.shadowRoot.adoptedStyleSheets;
      if (!sheets.includes(FILL)) grid.shadowRoot.adoptedStyleSheets = [...sheets, FILL];
      const fill = cards.length === 1 && fills(cards[0].config ?? { type: "" }) ? cards[0] : null;
      grid.toggleAttribute("cm-fill", !!fill);
      for (const c of section._cards ?? []) (c as HTMLElement).toggleAttribute("cm-fill", c === fill);
    }


    /** The debug label: this view's size, the room below its top, and how far the page
     * still scrolls (should be 0 x 0). */
    protected cmShow() {
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

    /** Lay the panels out: the top layer's (view.ts); the layers below ask through cmLater. */
    protected cmPlace(): void {}
  };
