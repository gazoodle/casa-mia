// Layer 2: edit mode's actions and dialogs (toolbars, panel options, gaps, lines, margins, header, footer, locks).
import { LAYOUT, type Panel, PANELS } from "../layout.ts";
import { compact, edgeForm, type Form, openMini, openPanelOptions, PX } from "../panel-options.ts";
import { depthOf, type Draft, type Gap, type GapLine, draftsOf, LAYERS, layerOf, panelName, placeOf, restack, type Side, SIDES, sides, stackOf, withLayer } from "../tablet.ts";
import { headerSpace } from "./common.ts";
import { ViewBase } from "./base.ts";

export const ViewEdit = (Base: ReturnType<typeof ViewBase>) =>
  class extends Base {
    /** In edit mode, the bar above the panels (outside Lit's part, as the debug label): Show
     * dimensions, on unless turned off in this browser. */
    protected cmBar(editing: boolean) {
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


    /** What was seen of each section out of edit mode, to its place in `drafts`. */
    protected cmReseen(drafts: Draft[]) {
      const was = this.cmSeenOut.naturals;
      this.cmSeenOut.naturals = Object.fromEntries(drafts.flatMap((d, i) => (d.from !== null && String(d.from) in was ? [[String(i), was[d.from]]] : [])));
    }


    /** The view's sections reordered or added to by `change` (on its drafts), saved. */
    protected cmRestack(change: (drafts: Draft[]) => Draft[]) {
      const drafts = change(draftsOf(this.cmSections));
      this.cmReseen(drafts);
      return this.cmSaveView((v) => ({ ...v, sections: restack(v.sections ?? [], drafts) }));
    }


    /** A panel's toolbar acted on (its chip, + or an arrow). */
    protected cmTool = (ev: Event) => {
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
    protected cmActions(n: number): { add?: () => void; back?: () => void; on?: () => void; remove?: () => void } {
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
    protected cmOptions(n: number, anchor: Element) {
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


    /** The line in gap g (its edge's `line`, or its panel's `line_after`), if any. */
    protected cmLineOf(g: Gap): GapLine | undefined {
      if (g.edge) return layerOf(this.cmLayout, g.edge.layer)[g.edge.place]?.line;
      return this.cmSections[g.after!]?.view_layout?.line_after;
    }


    /** `layout` and `sections` with gap g's `key` (its size, or its line) as `value` (left
     * out: none of its own). */
    protected cmGapSet(g: Gap, key: "gap" | "line", value: unknown, layout: Record<string, any>, sections: any[]): [Record<string, any>, any[]] {
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
    protected cmAllGaps(gap: number, layout: Record<string, any>, sections: any[]): [Record<string, any>, any[]] {
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
    protected cmDraft(layout: Record<string, any>, sections: any[]) {
      this.cmLayout = layout;
      this.cmSections = sections;
      this.cmLater();
    }


    /** Save `layout` and `sections` as the view's. */
    protected cmSaveAll(layout: Record<string, any>, sections: any[]) {
      return this.cmSaveView((v) => {
        const { layout: _, ...rest } = v;
        const l = compact(layout);
        return { ...rest, sections, ...(Object.keys(l).length && { layout: l }) };
      });
    }


    /** A mini box (panel-options.ts: openMini) for a setting of the view's layout or sections:
     * `next` makes them from its value, shown as it changes; Cancel puts back what was. */
    protected cmMini(anchor: Element, title: string, note: string, value: Record<string, any>, form: (v: Record<string, any>) => Form, next: (v: Record<string, any>, layout: Record<string, any>, sections: any[]) => [Record<string, any>, any[]], actions: { label: string; run: () => void }[] = []) {
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
    protected cmGapWhose(g: Gap): string {
      const where = (this.sections as unknown[]).map((_, i) => placeOf(this.cmSections[i], i));
      if (g.edge) return `Between the ${g.edge.layer > 1 ? `layer ${g.edge.layer} ` : ""}${g.edge.place} edge and its middle.`;
      return `After ${panelName(where, g.after!)}, to the next along its edge.`;
    }


    /** Gap g's box: its size, or every gap's; a line added in it. */
    protected cmGap(g: Gap, anchor: Element) {
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
    protected cmLine(g: Gap, anchor: Element) {
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
    protected cmMargin(side: Side, anchor: Element) {
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
    protected cmDepth(k: number, p: Panel, anchor: Element) {
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
    protected cmHeader(anchor: Element) {
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
    protected cmFooter(anchor: Element) {
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
    protected cmAnchor(k: number, p: Panel, end: "left" | "right") {
      const key = `anchor_${end}`;
      const was = layerOf(this.cmLayout, k)[p]?.[key] ?? (LAYOUT.panels[p] as Record<string, unknown>)[key];
      const layout = withLayer(this.cmLayout, k, (c) => ({ ...c, [p]: { ...c[p], [key]: !was } }));
      this.cmSaveAll(layout, this.cmSections);
    }

  };
