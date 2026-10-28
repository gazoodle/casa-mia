// The Heating Flow card's drawing context: the readings, what is flowing and the look, and
// pipes drawn as one plumbed network. Parts (pumps, valves, tanks...) are in parts.ts.
import { type Area, CIRCUIT, type Look, OFF, type Pipe, type Reading, capped, drawnLength, esc, geometry, mix, place, pointAt, ramp, tempAt } from "./engine.ts";

export class Draw {
  private uid = 0;
  areas: Area[] = [];
  data: Record<string, Reading>;
  flows: Record<string, boolean>;
  look: Look;
  reduced: boolean; // reduced motion: no markers ride the pipes

  constructor(data: Record<string, Reading>, flows: Record<string, boolean>, look: Look, reduced = false) {
    this.data = data;
    this.flows = flows;
    this.look = look;
    this.reduced = reduced;
  }

  id(prefix: string) {
    return prefix + this.uid++;
  }
  /** A reading, or null when it is missing or not current. */
  val(k: string | undefined): number | null {
    const d = k ? this.data[k] : undefined;
    return d && !d.stale && Number.isFinite(d.v) ? d.v : null;
  }
  fmt(d: Reading) {
    return d.text ?? d.v.toFixed(d.dp) + d.unit;
  }
  colourOf(k: string | undefined) {
    const t = this.val(k);
    return t == null ? OFF : ramp(t);
  }
  /** A fitting's colour, as its pipe would show it there (dimmed while still). */
  tint(k: string | undefined, flow: string, circ: string) {
    const c = this.look.colours === "circuit" ? (CIRCUIT[circ] ?? OFF) : this.colourOf(k);
    return this.flows[flow] ? c : mix(c, OFF, 0.35);
  }
  bgAt(x: number) {
    return `var(${(this.areas.find((a) => x < a[2]) ?? this.areas[this.areas.length - 1])?.[4] ?? "--hf-panel"})`;
  }

  /** One pipe's layers: the outline (its wall) and the fill (the water), the markers that
   * ride it while it flows, the gap cut where it crosses another, and its sensors' readouts. */
  pipe(p: Pipe) {
    const w = p.w ?? 12, pts = capped(p.rev ? p.pts.slice().reverse() : p.pts, w / 2);
    const { segs, total } = geometry(pts, p.r ?? 12);
    const sens = place(p.sensors ?? [], segs, total, p.rev, this.areas);
    const stops = sens.map((x) => [x.s, this.val(x.k)] as [number, number | null]).filter((x): x is [number, number] => x[1] != null).sort((a, b) => a[0] - b[0]);
    const flowing = !!(p.flow && this.flows[p.flow]);
    const col = (s: number) => {
      const t = tempAt(stops, s), c = this.look.colours === "circuit" ? (CIRCUIT[p.circ] ?? OFF) : t == null ? OFF : ramp(t);
      return flowing ? c : mix(c, OFF, 0.35); // still water keeps its colour, dimmed
    };

    // The colour, one straight piece at a time (each its own gradient through the sensors on
    // it), and each bend in the colour at its corner.
    let defs = "", pieces = "", d = `M${segs[0].ax} ${segs[0].ay}`;
    segs.forEach((g, i) => {
      const s0 = g.s0 + g.k0, s1 = g.s0 + g.L - g.k1;
      const x0 = g.ax + g.ux * g.k0, y0 = g.ay + g.uy * g.k0, x1 = g.bx - g.ux * g.k1, y1 = g.by - g.uy * g.k1;
      d += `L${x1} ${y1}`;
      if (s1 > s0 + 0.1) {
        const gid = this.id("pg"), at = [s0, ...stops.map((q) => q[0]).filter((s) => s > s0 && s < s1), s1];
        defs += `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}">` +
          at.map((s) => `<stop offset="${((s - s0) / (s1 - s0)).toFixed(4)}" stop-color="${col(s)}"/>`).join("") + `</linearGradient>`;
        pieces += `<path d="M${x0} ${y0}L${x1} ${y1}" style="stroke:url(#${gid})"/>`;
      }
      if (g.k1) {
        const n = segs[i + 1], q = `Q${g.bx} ${g.by} ${n.ax + n.ux * n.k0} ${n.ay + n.uy * n.k0}`;
        d += q;
        pieces += `<path d="M${x1} ${y1}${q}" style="stroke:${col(g.s0 + g.L)}"/>`;
      }
    });

    const mid = col(total / 2), s = this.look.pipes;
    const full = (wd: number, stroke: string, extra = "") => `<path d="${d}" fill="none" stroke-width="${wd}" style="stroke:${stroke}" ${extra}/>`;
    const colour = (wd: number, extra = "") => `<g fill="none" stroke-width="${wd}" ${extra}>${pieces}</g>`;
    let outline = "", fill = "";
    if (s === "outline") [outline, fill] = [full(w + 3, "var(--hf-edge)"), full(w, mid) + colour(w)];
    if (s === "glass") [outline, fill] = [full(w + 3, mid) + colour(w + 3), full(w, "var(--hf-panel)") + colour(w, 'opacity=".32"')];
    if (s === "conduit" || s === "neon")
      [outline, fill] = [full(w + 2, "var(--hf-conduit)"), colour(Math.max(3, w * 0.42), s === "neon" ? `style="filter:drop-shadow(0 0 3px ${mid})"` : "")];

    // Flow: markers ride along the pipe, faster when its pump runs faster or, with no
    // reading, faster in a narrower pipe. No flow, no markers.
    let marks = "";
    if (flowing && !this.reduced) {
      const L = drawnLength(segs), n = Math.max(1, Math.round(L / 26)), sp = this.val(p.speed);
      const v = sp != null ? 18 + Math.min(sp, 100) * 0.5 : (48 * 12) / w, dur = L / v;
      const mc = s === "glass" ? "var(--hf-edge)" : "#fff", sc = w < 12 ? ` transform="scale(${Math.max(0.6, w / 12)})"` : "";
      for (let k = 0; k < n; k++)
        marks += `<use href="#mk-${this.look.markers}"${sc} style="color:${mc}"><animateMotion dur="${dur.toFixed(2)}s" begin="-${((dur * k) / n).toFixed(2)}s" repeatCount="indefinite" rotate="auto" path="${d}"/></use>`;
    }

    const gap = (p.hops ?? []).map(([x, y, dir]) => `<path d="${dir === "h" ? `M${x - w} ${y}H${x + w}` : `M${x} ${y - w}V${y + w}`}" stroke-width="${w + 8}" style="stroke:${this.bgAt(x)}"/>`).join("");
    const pills = sens.filter((x) => x.show !== false).map((x) => { const pt = pointAt(segs, x.s); return this.readout(pt.x, pt.y, x.k, pt.horiz); }).join("");
    return { defs, gap, outline, fill, marks, pills };
  }

  /** Pipes as one plumbed network: every outline, then every fill, so where pipes meet the
   * water joins and the walls don't cross it. Pipes others tee into (z: 1) fill last. A pipe
   * that crosses another (hops) goes on top, whole, with its gap cut first. */
  pipes(list: Pipe[]) {
    const r = list.map((p) => ({ p, ...this.pipe(p) }));
    const net = r.filter((x) => !x.p.hops).sort((a, b) => (a.p.z ?? 0) - (b.p.z ?? 0)), over = r.filter((x) => x.p.hops);
    const body = net.map((x) => x.outline).join("") + net.map((x) => x.fill).join("") + net.map((x) => x.marks).join("") +
      over.map((x) => x.gap + x.outline + x.fill + x.marks).join("");
    return { defs: r.map((x) => x.defs).join(""), body, pills: r.map((x) => x.pills).join("") };
  }

  /** A reading on a pipe: a pill on it, or text beside it. One not current shows its age,
   * always as a pill. */
  readout(x: number, y: number, k: string, horiz = true) {
    const d = this.data[k];
    if (!d) return "";
    const txt = d.stale ? `— ${d.stale}` : this.fmt(d);
    const ring = d.stale ? "var(--hf-warn)" : d.unit === "°" && this.look.colours === "temp" ? ramp(d.v) : "var(--hf-line)";
    const tip = `<title>${esc(d.e)}${d.stale ? `: not current for ${esc(d.stale)}` : ""}</title>`;
    if (this.look.readouts === "pill" || d.stale) {
      const w = Math.max(46, txt.length * 6.6 + 14);
      return `<g class="hit" data-e="${esc(d.e)}">${tip}<rect class="hl" x="${x - w / 2}" y="${y - 10}" width="${w}" height="20" rx="10" style="fill:var(--hf-panel);stroke:${ring}" stroke-width="2"/>` +
        `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" class="${d.stale ? "w" : "t"}">${esc(txt)}</text></g>`;
    }
    const [tx, ty, a] = horiz ? [x, y - 11, "middle"] : [x + 11, y + 4, "start"];
    return `<g class="hit" data-e="${esc(d.e)}">${tip}<text x="${tx}" y="${ty}" text-anchor="${a}" font-size="12" font-weight="700" class="t halo">${esc(txt)}</text></g>`;
  }

  /** A labelled reading in a panel: label left, value right-aligned at xr. */
  row(x: number, y: number, label: string, k: string, xr: number) {
    const d = this.data[k];
    if (!d) return "";
    return `<g class="hit" data-e="${esc(d.e)}"><rect class="hl" x="${x - 4}" y="${y - 13}" width="${xr - x + 8}" height="18" rx="4" fill="transparent"/>` +
      `<text x="${x}" y="${y}" font-size="11.5" class="m">${esc(label)}</text>` +
      `<text x="${xr}" y="${y}" text-anchor="end" font-size="12" font-weight="700" class="${d.stale ? "w" : "t"}">${esc(d.stale ? "— " + d.stale : this.fmt(d))}</text></g>`;
  }
}

/** The shared <defs>: flow markers and the parts' gradients. */
export const DEFS = `
  <path id="mk-chev" d="M-3 -4L2 0L-3 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path id="mk-arrow" d="M-6 0H3M0 -3L3.5 0L0 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle id="mk-bub" r="2.1" fill="currentColor"/>
  <linearGradient id="panelg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hf-panel)"/><stop offset="1" style="stop-color:var(--hf-panel2)"/></linearGradient>
  <linearGradient id="earthg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hf-earth1)"/><stop offset=".55" style="stop-color:var(--hf-earth2)"/><stop offset="1" style="stop-color:var(--hf-earth3)"/></linearGradient>
  <linearGradient id="cellg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a78c4"/><stop offset="1" stop-color="#1f3f7a"/></linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
