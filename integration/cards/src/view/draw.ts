// Layer 3: edit mode's drawing (dimension lines, gap lines, marks, panel toolbars).
import { LAYOUT, type Panel, type Rect } from "../layout.ts";
import { depthOf, type Drawn, type Gap, gapLines, LAYERS, layerOf, panelName, placeOf, placePanels, type Side, sides, stackOf } from "../tablet.ts";
import { headerSpace, ROW, LOCKED, UNLOCKED } from "./common.ts";
import { ViewEdit } from "./edit.ts";

export const ViewDraw = (Base: ReturnType<typeof ViewEdit>) =>
  class extends Base {
    /** Where the grid's lines are now on the page, px from its corner (its tracks as laid
     * out: exact out of edit mode, grown in it), so a gap's band is found by its lines. */
    protected cmTracks(grid: HTMLElement): [number[], number[]] {
      const cs = getComputedStyle(grid);
      const at = (tracks: string) => tracks.split(" ").reduce((out, t) => [...out, out[out.length - 1] + (parseFloat(t) || 0)], [0]);
      return [at(cs.gridTemplateColumns), at(cs.gridTemplateRows)];
    }


    /** Gap g's rect on the page now (px in the grid): its band between its grid lines, and in
     * edit mode the panels' own spacing either side of it (`edit`, their margin), as seen. */
    protected cmGapRect(g: Gap, [xs, ys]: [number[], number[]], edit: number): Rect {
      const [x0, x1, y0, y1] = [xs[g.column[0] - 1], xs[g.column[1] - 1], ys[g.row[0] - 1], ys[g.row[1] - 1]];
      return g.across ? [x0, y0 - edit, x1 - x0, y1 - y0 + 2 * edit] : [x0 - edit, y0, x1 - x0 + 2 * edit, y1 - y0];
    }


    /** The lines in the gaps (tablet.ts: gapLines), drawn over the panels, live and in edit
     * mode, where each gap is now on the page. They take no room. */
    protected cmLines(grid: HTMLElement, gaps: Gap[], tracks: [number[], number[]], edit: number): Drawn[] {
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
    protected cmMark = (ev: Event) => {
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
    protected cmOverlay(grid: HTMLElement, name: string): HTMLElement {
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
    protected cmDims(grid: HTMLElement, show: boolean, where: ReturnType<typeof placeOf>[], real: ReturnType<typeof placePanels>, gaps: Gap[], tracks: [number[], number[]], edit: number) {
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
    protected cmEditMarks(grid: HTMLElement, editing: boolean, where: ReturnType<typeof placeOf>[], drawn: Drawn[]) {
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
    protected cmTools(box: HTMLElement, show: boolean, where: ReturnType<typeof placeOf>[], n: number) {
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
      // And its least height: HA's frame round one row (its Add card button), so a panel
      // squeezed to fit (an empty view fits the screen) never clips it.
      const tall = cs ? ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"].reduce((t, k) => t + (parseFloat(cs[k as "paddingTop"]) || 0), 0) : 0;
      box.style.minHeight = `${Math.ceil(row + tall)}px`;
    }

  };
