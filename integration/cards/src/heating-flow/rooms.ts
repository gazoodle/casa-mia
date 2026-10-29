// The Heating Flow card's Rooms view: each floor's manifold, then a tile per room with its
// temperature, its target, its loop's actuator and the loop itself (or its radiator). A room
// heating but well below its target is ringed amber.
import { type Config, type Floor, type Readings, floorsOf } from "./common.ts";
import { DEFS, Draw } from "./draw.ts";
import { type Area, type Look, type Pipe, esc } from "./engine.ts";
import * as part from "./parts.ts";
import { quiet } from "./system.ts";

export const W = 1000, H = 630;

export function rooms(c: Config, r: Readings, look: Look): string {
  const d = new Draw(r.data, r.flows, look);
  d.areas = [["house", 0, W, "", "--hf-zone-house"]] as Area[];
  const floors = floorsOf(c).reverse(), bandH = Math.min(205, 620 / Math.max(1, floors.length)); // top first
  const P: Pipe[] = [];
  let out = "";
  floors.forEach((f, i) => (out += floor(d, r, f, 10 + i * bandH, bandH - 14, P, c.heat_pump?.pump)));
  if (!floors.length) out += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="14" class="m">No floors set: add them in the card's options.</text>`;

  const p = d.pipes(P);
  return `<defs>${DEFS}${p.defs}</defs><rect width="${W}" height="${H}" style="fill:var(--hf-zone-house)"/>${out}${p.body}${p.pills}`;
}

/** One floor's band: the manifold card, then its rooms. */
function floor(d: Draw, r: Readings, f: Floor, y0: number, h: number, P: Pipe[], pump: string | undefined) {
  const ufh = f.emitters !== "rad", loops = f.loops ?? [], rms = f.rooms ?? [], rets = f.loop_returns ?? [];
  const open = loops.filter((k) => (d.val(k) ?? 0) > 0).length, m = Math.max(loops.length, rms.length);

  let out = `<g class="hit" data-e="${esc(f.supply ?? "")}"><rect class="hl" x="12" y="${y0}" width="166" height="${h}" rx="14" fill="url(#panelg)" style="stroke:var(--hf-line)"/>` +
    `<text x="26" y="${y0 + 24}" font-size="14" font-weight="700" class="t">${esc(f.name ?? "Floor")}</text>` +
    `<text x="26" y="${y0 + 42}" font-size="11" class="m">${ufh ? "Underfloor" : "Radiators"}${ufh && f.mixed ? " · mixed" : ""}</text>` +
    (f.supply ? `<text x="26" y="${y0 + 74}" font-size="11.5" class="m">Supply</text>` : "") +
    (f.return ? `<text x="26" y="${y0 + 102}" font-size="11.5" class="m">Return</text>` : "") +
    `<text x="26" y="${y0 + h - 14}" font-size="11" class="m">${loops.length ? (ufh ? `${open} of ${loops.length} loops open` : `${open} of ${loops.length} open`) : m ? `${m} rooms` : "No rooms set"}</text></g>`;
  if (f.supply) out += d.readout(140, y0 + 70, f.supply);
  if (f.return) out += d.readout(140, y0 + 98, f.return);

  // A tile per room, room j on loop j.
  const tw = (800 - (m - 1) * 10) / m;
  for (let j = 0; j < m; j++) {
    const x = 190 + j * (tw + 10), act = loops[j], id = rms[j], ret = rets[j] ?? f.return;
    const t = id ? r.data[id] : undefined, room = id ? r.rooms[id] : undefined, target = room?.target ?? null;
    const isOpen = act ? (d.val(act) ?? 0) > 0 : true, flowing = isOpen && r.flows.heat;
    const temp = id ? d.val(id) : null, cold = flowing && temp != null && target != null && temp < target - 1;
    const label = room?.name ?? (act ? act.replace(/^[^.]+\./, "") : `Room ${j + 1}`);
    out += `<g class="hit" data-e="${esc(id ?? act ?? "")}"><rect class="hl" x="${x}" y="${y0}" width="${tw}" height="${h}" rx="14" fill="url(#panelg)" style="stroke:${cold ? "var(--hf-warn)" : "var(--hf-line)"}" stroke-width="${cold ? 2.5 : 1}"/>` +
      `<text x="${x + 12}" y="${y0 + 22}" font-size="12.5" font-weight="700" class="t">${esc(label)}</text>` +
      (t ? `<text x="${x + 12}" y="${y0 + 54}" font-size="${t.stale ? 14 : 24}" font-weight="700" class="${t.stale ? "w" : "t"}">${esc(t.stale ? "— " + t.stale : d.fmt(t))}</text>` : "") +
      (target != null && temp != null ? `<text x="${x + 12}" y="${y0 + 72}" font-size="11" class="${cold ? "w" : "m"}">${cold ? `${(target - temp).toFixed(1)}° below ${target.toFixed(1)}°` : `target ${target.toFixed(1)}°`}</text>` : "") + `</g>`;
    if (act) {
      const a = r.data[act], txt = a?.stale ? "—" : a?.unit === "%" ? d.fmt(a) : isOpen ? "Open" : "Closed";
      out += `<g class="hit" data-e="${esc(act)}"><title>${esc(act)}</title><rect class="hl" x="${x + tw - 62}" y="${y0 + 9}" width="50" height="18" rx="9" style="fill:${isOpen ? "var(--hf-run)" : "var(--hf-panel2)"};stroke:${a?.stale ? "var(--hf-warn)" : isOpen ? "var(--hf-run)" : "var(--hf-line)"}"/>` +
        `<text x="${x + tw - 37}" y="${y0 + 22}" text-anchor="middle" font-size="10.5" font-weight="700" style="fill:${isOpen ? "#fff" : "var(--hf-muted)"}">${esc(txt)}</text></g>`;
    }

    // The loop under the floor, from the manifold's supply to this loop's return; or a radiator.
    const gx0 = x + 14, gx1 = x + tw - 14, gy0 = y0 + 88, gy1 = y0 + h - 14;
    if (gy1 - gy0 < 10) continue;
    if (ufh) {
      const n = Math.max(2, Math.floor((gy1 - gy0) / 15) + 1), pts: [number, number][] = [[gx0, gy0]];
      for (let k = 0; k < n; k++) {
        const y = gy0 + (k * (gy1 - gy0)) / (n - 1);
        if (k) pts.push([k % 2 ? gx1 : gx0 + 10, y]); // drop to the next row where the last one ended
        pts.push([k % 2 ? gx0 + 10 : gx1, y]);
      }
      // A closed loop stands at its own return temperature; an open one runs from supply to return.
      P.push({ circ: "heat", w: 6, r: 7, pts, flow: act ?? "heat", speed: pump, sensors: [...(isOpen ? quiet(f.supply, 0) : []), ...quiet(ret, 1)] });
    } else out += part.radiator(d, gx0, gy0, Math.min(120, gx1 - gx0), gy1 - gy0, f.supply ?? "", ret ?? "");
  }
  return out;
}
