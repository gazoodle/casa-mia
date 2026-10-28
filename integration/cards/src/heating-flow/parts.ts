// The Heating Flow card's parts, as SVG text: pumps, valves, the ground, PVT, tanks,
// radiators, the compressor and the water parts. Each is a hit target for its entity.
import type { Draw } from "./draw.ts";
import { type Area, CIRCUIT, OFF, esc, ramp } from "./engine.ts";

const ROT: Record<string, number> = { e: 0, s: 90, w: 180, n: 270 };
const hit = (e: string | undefined, title: string, body: string) => `<g class="hit" data-e="${esc(e ?? "")}"><title>${esc(title)}</title>${body}</g>`;

/** A circulation pump: the standard circle and triangle, pointing the way it pumps. Running,
 * its ring turns; `warn` rings it amber (stopped when it should run). */
export function pump(d: Draw, x: number, y: number, dir: string, k: string, label: string, [lx, ly, la]: [number, number, string], warn = false) {
  const r = d.data[k], on = d.val(k) != null && d.val(k)! > 0;
  return hit(r?.e, label,
    (warn ? `<circle cx="${x}" cy="${y}" r="22" fill="none" style="stroke:var(--hf-warn)" stroke-width="3" class="pulse"/>` : "") +
    (on ? `<circle cx="${x}" cy="${y}" r="18" fill="none" style="stroke:var(--hf-run);transform-origin:${x}px ${y}px" stroke-width="2" stroke-dasharray="3 4" class="spin"/>` : "") +
    `<circle class="hl" cx="${x}" cy="${y}" r="14" style="fill:var(--hf-panel);stroke:var(--hf-edge)" stroke-width="2"/>` +
    `<path d="M-7 -11L13 0L-7 11Z" transform="translate(${x} ${y}) rotate(${ROT[dir]})" style="fill:${on ? "var(--hf-run)" : "var(--hf-off)"};stroke:var(--hf-edge)" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<text x="${lx}" y="${ly}" text-anchor="${la}" font-size="10.5" class="m halo">${esc(label)} · ${r?.stale ? "— " + esc(r.stale) : on && r?.unit ? esc(d.fmt(r)) : on ? "on" : "off"}</text>`);
}

/** A valve: a triangle per port, filled where it is open; the actuator sits on the free side. */
export function valve(x: number, y: number, dirs: string[], open: string[], label: string, e: string | undefined, lab?: [number, number, string]) {
  const tri = (dir: string) => `<path d="M0 0L12 -8L12 8Z" transform="translate(${x} ${y}) rotate(${ROT[dir]})" style="fill:${open.includes(dir) ? "var(--hf-edge)" : "var(--hf-panel)"};stroke:var(--hf-edge)" stroke-width="1.6" stroke-linejoin="round"/>`;
  const free = ["n", "s", "e", "w"].find((q) => !dirs.includes(q))!, [vx, vy] = ({ n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] } as Record<string, number[]>)[free];
  return hit(e, label,
    `<path d="M${x} ${y}L${x + vx * 13} ${y + vy * 13}" style="stroke:var(--hf-edge)" stroke-width="2"/>` +
    `<rect class="hl" x="${x + vx * 18 - 6}" y="${y + vy * 18 - 6}" width="12" height="12" rx="2" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="1.6"/>` +
    dirs.map(tri).join("") + (lab ? `<text x="${lab[0]}" y="${lab[1]}" text-anchor="${lab[2]}" font-size="10.5" class="m halo">${esc(label)}</text>` : ""));
}

export const zones = (Z: Area[], h: number) =>
  Z.map(([, a, b, label, v]) => `<rect x="${a}" y="0" width="${b - a}" height="${h}" style="fill:var(${v})"/><text x="${a + 12}" y="20" class="zl">${esc(label)}</text>`).join("") +
  Z.slice(1).map(([, a]) => `<path d="M${a} 0V${h}" style="stroke:var(--hf-line)" stroke-dasharray="2 4"/>`).join("");

export function ground(d: Draw, x: number, y: number, w: number, h: number, label: string, e?: string) {
  const c = d.id("gc");
  return hit(e, label,
    `<clipPath id="${c}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/></clipPath>` +
    `<g clip-path="url(#${c})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#earthg)"/><rect x="${x}" y="${y}" width="${w}" height="10" style="fill:var(--hf-grass)"/>` +
    `<path d="M${x} ${y + h * 0.4}q${w * 0.25} -8 ${w * 0.5} 0t${w * 0.5} -3M${x} ${y + h * 0.72}q${w * 0.3} 8 ${w * 0.55} 0t${w * 0.45} 4" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/></g>` +
    `<rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" style="stroke:var(--hf-line)"/>` +
    `<text x="${x + w - 10}" y="${y + h - 12}" text-anchor="end" font-size="12" font-weight="700" class="lt">${esc(label)}</text>`);
}

export function pvt(x: number, y: number, w: number, h: number, e?: string) {
  const cw = (w - 12) / 2, ch = (h - 12) / 2;
  let g = `<rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.2"/>`;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      const cx = x + 4 + i * (cw + 4), cy = y + 4 + j * (ch + 4);
      g += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="3" fill="url(#cellg)"/><path d="M${cx} ${cy + ch / 2}h${cw}M${cx + cw / 2} ${cy}v${ch}" stroke="#fff" stroke-opacity=".18"/>`;
    }
  g += `<path d="M${x + 4} ${y + 4}h${w - 8}l-${w * 0.45} ${h - 8}h-${w * 0.55 - 8}z" fill="url(#sheen)"/>`;
  g += `<circle cx="${x + 10}" cy="${y - 16}" r="5" fill="#f4b400"/>` +
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M${x + 10} ${y - 24.5}v-3" transform="rotate(${a} ${x + 10} ${y - 16})" stroke="#f4b400" stroke-width="1.6" stroke-linecap="round"/>`).join("");
  return hit(e, "PVT panels", g + `<text x="${x + 24}" y="${y - 11}" font-size="12" font-weight="700" class="t">PVT panels</text>`);
}

/** A hot water tank: insulated jacket, the water shaded through its sensors (top to bottom).
 * Returns {under, over}; the coil goes between. */
export function tank(d: Draw, x: number, y: number, w: number, h: number, list: [string, number][]) {
  const i = 8, ix = x + i, iy = y + i, iw = w - 2 * i, ih = h - 2 * i, gid = d.id("tw");
  const known = list.map(([k, f]) => [f, d.val(k)] as [number, number | null]).filter((q): q is [number, number] => q[1] != null);
  const at = (f: number): number | null => {
    if (!known.length) return null;
    if (f <= known[0][0]) return known[0][1];
    for (let n = 1; n < known.length; n++)
      if (f <= known[n][0]) { const [f0, t0] = known[n - 1], [f1, t1] = known[n]; return t0 + ((t1 - t0) * (f - f0)) / (f1 - f0); }
    return known[known.length - 1][1];
  };
  const stops = Array.from({ length: 11 }, (_, n) => { const t = at(n / 10); return `<stop offset="${n / 10}" stop-color="${t == null ? OFF : ramp(t)}"/>`; }).join("");
  const under = hit(list[0]?.[0] && d.data[list[0][0]]?.e, "Hot water tank",
    `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>` +
    `<rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/>` +
    `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="24" fill="url(#${gid})"/>` +
    `<rect x="${ix + 6}" y="${iy + 12}" width="8" height="${ih - 24}" rx="4" fill="#fff" opacity=".2"/>`);
  const over = list.map(([k, f]) => {
    const r = d.data[k], cy = iy + f * ih;
    if (!r) return "";
    return hit(r.e, r.e, `<path d="M${x + w - i - 36} ${cy}l6 -4v8z" fill="#fff"/>` +
      `<text x="${x + w - i - 3}" y="${cy + 4}" text-anchor="end" font-size="11" font-weight="700" class="${r.stale ? "w" : "lt"}">${r.stale ? "—" : esc(r.v.toFixed(1) + "°")}</text>`);
  }).join("");
  return { under, over };
}

/** A radiator: columns shaded from its supply (top) to its return (bottom). */
export function radiator(d: Draw, x: number, y: number, w: number, h: number, ks: string, kr: string) {
  const gid = d.id("rg"), n = Math.max(3, Math.floor(w / 7)), cw = w / n;
  return `<g><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${y}" x2="0" y2="${y + h}"><stop offset="0" stop-color="${d.colourOf(ks)}"/><stop offset="1" stop-color="${d.colourOf(kr)}"/></linearGradient>` +
    Array.from({ length: n }, (_, j) => `<rect x="${x + j * cw}" y="${y}" width="${cw - 2}" height="${h}" rx="${(cw - 2) / 2}" fill="url(#${gid})" style="stroke:var(--hf-edge)" stroke-width=".8"/>`).join("") + `</g>`;
}

/** The compressor: an impeller turning at a speed that follows its frequency. */
export function compressor(d: Draw, x: number, y: number, r: number, k: string) {
  const v = d.val(k), on = v != null && v > 0;
  const blades = Array.from({ length: 7 }, (_, j) =>
    `<path d="M${x} ${y}q${r * 0.25} ${-r * 0.45} ${r * 0.12} ${-r * 0.72}" transform="rotate(${(j * 360) / 7} ${x} ${y})" fill="none" style="stroke:var(--hf-edge)" stroke-width="3" stroke-linecap="round"/>`).join("");
  return hit(d.data[k]?.e, "Compressor",
    `<circle class="hl" cx="${x}" cy="${y}" r="${r}" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="2.5"/>` +
    `<g class="${on ? "spin" : ""}" style="transform-origin:${x}px ${y}px;--sd:${on ? (60 / Math.max(v!, 10)).toFixed(2) : 0}s">${blades}</g>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.16}" style="fill:var(--hf-edge)"/>`);
}

/** The immersion heater: a rod in through the tank's side from its boss at x0 to x1, low down
 * (heat rises), glowing while it is on. */
export function immersion(d: Draw, x0: number, x1: number, y: number, k: string) {
  const r = d.data[k], on = (d.val(k) ?? 0) > 0;
  return hit(r?.e, `Immersion heater · ${r && on ? d.fmt(r) : "off"}`,
    `<rect x="${Math.min(x0, x1)}" y="${y - 3}" width="${Math.abs(x1 - x0)}" height="6" rx="3" fill="${on ? "#ff7a1a" : "#8a8f99"}" style="${on ? "filter:drop-shadow(0 0 4px #ff7a1a)" : ""}" class="${on ? "pulse" : ""}"/>` +
    `<rect class="hl" x="${x0 - 4}" y="${y - 7}" width="9" height="14" rx="2" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="1.4"/>`);
}

/** A reducer where a pipe W wide meets one w wide: a short taper from (x, y) in direction dir
 * (from the wide side to the narrow), its wall and water matching each pipe at its end, so the
 * thin pipe looks joined rather than pushed into the fat one. */
export function reducer(x: number, y: number, dir: string, W: number, w: number, colour: string, L = 12) {
  const [ux, uy] = ({ n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] } as Record<string, number[]>)[dir], [px, py] = [-uy, ux];
  const quad = (a: number, b: number) =>
    `M${x + px * a} ${y + py * a}L${x + ux * L + px * b} ${y + uy * L + py * b}L${x + ux * L - px * b} ${y + uy * L - py * b}L${x - px * a} ${y - py * a}Z`;
  return `<path d="${quad((W + 3) / 2, (w + 3) / 2)}" style="fill:var(--hf-edge)"/><path d="${quad(W / 2, w / 2)}" fill="${colour}"/>`;
}

// ---- Water ------------------------------------------------------------------------------

/** The mains stopcock, where the water enters the plant room. */
export const stopcock = (x: number, y: number, e?: string) => hit(e, "Mains in",
  `<circle class="hl" cx="${x}" cy="${y}" r="9" style="fill:var(--hf-panel);stroke:var(--hf-edge)" stroke-width="2"/>` +
  `<path d="M${x - 5} ${y - 5}L${x + 5} ${y + 5}" style="stroke:var(--hf-edge)" stroke-width="2.5" stroke-linecap="round"/>` +
  `<text x="${x - 8}" y="${y + 24}" font-size="11" font-weight="700" class="t halo">Mains in</text>`);

/** The softener, one unit in its own border: the salt cabinet (its salt shown as a level) on
 * the left, the resin column on the right, where hard water rises in at the bottom and soft
 * leaves the side. When it needs salt, the border pulses amber and says so. */
export function softener(d: Draw, x: number, y: number, w: number, h: number, low: boolean, saltId?: string, lowId?: string) {
  const salt = saltId ? d.data[saltId] : undefined, lvl = Math.max(0, Math.min(1, (d.val(saltId) ?? 0) / 100));
  const cw = w - 26, sy = y + 22, sh = h - 30, rx = x + w - 20, ry = y + 10, rh = h - 10, clip = d.id("rc");
  let beads = "";
  for (let by = ry + 6; by < ry + rh - 3; by += 4.5) for (let k = 0; k < 3; k++) beads += `<circle cx="${rx + 5 + k * 5 + (Math.round(by) % 2) * 1.5}" cy="${by}" r="1.9"/>`;
  return hit(saltId ?? lowId, `Softener${salt ? ": salt " + d.fmt(salt) : ""}${low ? ", needs topping up" : ""}`,
    `<rect class="hl ${low ? "pulse" : ""}" x="${x - 7}" y="${y - 7}" width="${w + 14}" height="${h + 14}" rx="10" style="fill:var(--hf-panel2);stroke:${low ? "var(--hf-warn)" : "var(--hf-line)"}" stroke-width="${low ? 3 : 1.5}"/>` +
    `<rect x="${x}" y="${y}" width="${cw}" height="${h}" rx="8" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/>` +
    `<rect x="${x + 6}" y="${sy}" width="${cw - 12}" height="${sh}" rx="4" style="fill:var(--hf-panel2);stroke:var(--hf-line)"/>` +
    (salt ? `<rect x="${x + 6}" y="${sy + sh * (1 - lvl)}" width="${cw - 12}" height="${sh * lvl}" rx="4" fill="${low ? "var(--hf-warn)" : "#e8e2d4"}" style="stroke:var(--hf-line)"/>` +
      `<text x="${x + cw / 2}" y="${y + 15}" text-anchor="middle" font-size="10.5" font-weight="700" class="t">${esc(salt.stale ? "—" : d.fmt(salt))}</text>` : "") +
    `<clipPath id="${clip}"><rect x="${rx}" y="${ry}" width="20" height="${rh}" rx="10"/></clipPath>` +
    `<rect x="${rx}" y="${ry}" width="20" height="${rh}" rx="10" fill="url(#panelg)"/>` +
    `<g clip-path="url(#${clip})" fill="#d9a441" opacity=".75">${beads}</g>` +
    `<rect x="${rx}" y="${ry}" width="20" height="${rh}" rx="10" fill="none" style="stroke:var(--hf-edge)" stroke-width="1.5"/>` +
    `<text x="${x + w / 2}" y="${y - 14}" text-anchor="middle" font-size="11" font-weight="700" class="${low ? "w" : "t"} halo">${low ? "Top up salt" : "Softener"}</text>`);
}

/** The storage tank: a tall vessel of soft water, its level if it has a sensor. While its
 * inlet is open it says "Filling" and the inlet pours. */
export function storage(d: Draw, x: number, y: number, w: number, h: number, filling: boolean, label: string, e?: string, levelId?: string) {
  const c = CIRCUIT.cold, lvl = d.val(levelId), fr = lvl == null ? 1 : Math.max(0, Math.min(1, lvl / 100));
  const wy = y + 30 + (h - 37) * (1 - fr);
  let g = `<rect class="hl" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.8"/>` +
    `<rect x="${x + 7}" y="${wy}" width="${w - 14}" height="${y + h - 7 - wy}" rx="6" fill="${c}" opacity=".22"/>` +
    `<text x="${x + w / 2}" y="${y + 52}" text-anchor="middle" font-size="11" font-weight="700" class="t">${esc(label)}</text>` +
    `<text x="${x + w / 2}" y="${y + 67}" text-anchor="middle" font-size="10.5" class="m">${lvl == null ? "level: no sensor" : `level ${esc(d.fmt(d.data[levelId!]))}`}</text>`;
  if (filling) {
    g += Array.from({ length: 5 }, (_, j) => `<circle cx="${x + w * 0.5 + (j % 2) * 4}" cy="${y + 14}" r="2" fill="${c}" class="drip" style="animation-delay:-${(j * 0.14).toFixed(2)}s"/>`).join("");
    g += `<rect x="${x + w / 2 - 28}" y="${y + 76}" width="56" height="18" rx="9" fill="${c}"/><text x="${x + w / 2}" y="${y + 89}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff">Filling</text>`;
  }
  return hit(e, `${label}${filling ? ": filling" : ""}`, g);
}

export type Outlet = { y: number; label: string; icon: "shower" | "tap" | "none"; on: boolean; note?: string; e?: string };

/** The outlets in the house, one row per kind of water, each animating while it is in use. */
export function outlets(x: number, y: number, w: number, h: number, rows: Outlet[]) {
  const drops = (cx: number, cy: number, n: number, on: boolean) =>
    Array.from({ length: n }, (_, j) => `<circle cx="${cx + ((j % 3) - 1) * 4}" cy="${cy}" r="1.8" fill="${CIRCUIT.cold}" class="${on ? "drip" : ""}" style="animation-delay:-${(j * 0.23).toFixed(2)}s" opacity="${on ? 1 : 0.25}"/>`).join("");
  const icon = (ix: number, iy: number, kind: string, on: boolean) =>
    kind === "none" ? "" : kind === "shower"
      ? `<path d="M${ix} ${iy - 12}v6h8M${ix + 2} ${iy}a10 5 0 0 1 20 0z" fill="none" style="stroke:var(--hf-edge);fill:var(--hf-panel2)" stroke-width="2.5" stroke-linejoin="round"/>${drops(ix + 12, iy + 10, 6, on)}`
      : `<path d="M${ix} ${iy - 6}h14a6 6 0 0 1 6 6v3M${ix + 6} ${iy - 6}v-5m-4 0h8" fill="none" style="stroke:var(--hf-edge)" stroke-width="3" stroke-linecap="round"/>${drops(ix + 20, iy + 12, 3, on)}`;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#panelg)" style="stroke:var(--hf-line)"/>` +
    `<text x="${x + 12}" y="${y + 18}" font-size="12" font-weight="700" class="t">Taps &amp; showers</text>` +
    rows.map((r) => hit(r.e, r.label,
      `<text x="${x + 12}" y="${r.y + 4}" font-size="11" class="${r.on ? "t" : "m"}" font-weight="${r.on ? 700 : 400}">${esc(r.label)}</text>` +
      icon(x + w - 40, r.y, r.icon, r.on) + (r.note ? `<text x="${x + 12}" y="${r.y + 18}" font-size="9.5" class="m">${esc(r.note)}</text>` : ""))).join("") + `</g>`;
}
