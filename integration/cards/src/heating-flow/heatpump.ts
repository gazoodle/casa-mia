// The Heating Flow card's Heat pump view: a cutaway of the refrigerant cycle as the textbook
// diagrams draw it. The source on the left, through the evaporator; the compressor, condenser
// and expansion valve in the middle; the load on the right, through the condenser.
import { type Config, type Readings, hasDhw } from "./common.ts";
import { DEFS, Draw } from "./draw.ts";
import { type Area, CIRCUIT, type Look, type Pipe, esc } from "./engine.ts";
import * as part from "./parts.ts";
import { one, quiet, rows } from "./system.ts";

export const W = 1000, H = 630;

export function heatPump(c: Config, r: Readings, look: Look): string {
  const d = new Draw(r.data, r.flows, look);
  const src = c.source ?? {}, hp = c.heat_pump ?? {}, ref = hp.refrigerant ?? {}, heating = c.heating ?? {}, dhw = c.dhw ?? {};
  const air = src.type === "air", ground = !air && src.type !== "none", defrost = r.prio === "Defrost", run = r.flows.comp;
  const Z: Area[] = [["outside", 0, 230, air ? c.area_outside ?? "Outside" : "Source", "--hf-zone-out"], ["plant", 230, 770, hp.label || "Heat pump", "--hf-zone-plant"], ["house", 770, 1000, "Load", "--hf-zone-house"]];
  d.areas = Z;
  const P: Pipe[] = [];
  let under = `<rect x="250" y="62" width="500" height="555" rx="28" style="fill:var(--hf-panel);stroke:var(--hf-line)" opacity=".55"/>`, over = "";

  // ---- Source, through the evaporator ----
  if (ground) {
    under += part.ground(d, 20, 470, 190, 150, src.type === "horizontal" ? "Ground loop" : "Borehole", src.ground ?? src.out);
    const brine = (pts: [number, number][], sensors: Pipe["sensors"], more: Partial<Pipe> = {}) => P.push({ circ: "brine", pts, flow: "brine", speed: src.pump, sensors, ...more });
    brine([[150, 470], [150, 595], [70, 595], [70, 470]], [...quiet(src.out, 0), ...quiet(src.ground, 1)], { r: 40, w: 10 });
    brine([[70, 470], [70, 250], [290, 250]], [...quiet(src.ground, 0), ...one(src.in, { at: [200, 250] })]);
    brine([[290, 440], [150, 440], [150, 470]], one(src.out, { at: [220, 440] }));
    brine([[290, 250], [370, 250], [370, 290], [310, 290], [310, 330], [370, 330], [370, 370], [310, 370], [310, 410], [370, 410], [370, 440], [290, 440]],
      [...quiet(src.in, 0), ...quiet(src.out, 1)], { w: 9, r: 9 });
    // A brine pump stopped while the compressor runs is a fault: ring it.
    if (src.pump) over += part.pump(d, 70, 360, "n", src.pump, "Brine pump", [92, 364, "start"], run && !r.flows.brine);
  } else if (air) {
    under += `<g class="hit" data-e="${esc(src.outdoor ?? "")}"><rect class="hl" x="20" y="200" width="190" height="290" rx="16" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/>` +
      `<circle cx="115" cy="345" r="70" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="2"/>` +
      `<g class="${run ? "spin" : ""}" style="transform-origin:115px 345px;--sd:.8s">${[0, 120, 240].map((a) => `<path d="M115 345c10 -30 40 -40 52 -30c-8 20 -30 32 -52 30z" transform="rotate(${a} 115 345)" style="fill:var(--hf-line)"/>`).join("")}</g>` +
      `<text x="115" y="190" text-anchor="middle" font-size="12" font-weight="700" class="t">Outdoor fan</text></g>`;
    if (src.outdoor) over += d.readout(115, 460, src.outdoor);
    if (run) over += [270, 330, 390, 450].map((y) => `<path d="M190 ${y}H385" fill="none" stroke="${CIRCUIT.cold}" stroke-width="3" stroke-dasharray="6 8" class="dash" style="--d:.5s" opacity=".8"/>`).join("");
  }
  under += part.vessel(d, 290, 200, 100, 280, ref.suction, ref.evaporating, "Evaporator", ref.evaporating, run);

  // ---- Refrigerant: suction gas, compressor, hot gas, condenser, liquid, expansion. In
  // defrost the cycle runs backwards ----
  const gas = (pts: [number, number][], k: string | undefined) => P.push({ circ: "ref", pts, flow: "comp", speed: hp.compressor, rev: defrost, sensors: quiet(k, 0) });
  gas([[340, 200], [340, 110], [456, 110]], ref.suction);
  gas([[544, 110], [700, 110], [700, 200]], ref.hot_gas);
  gas([[700, 480], [700, 560], [524, 560]], ref.liquid);
  gas([[476, 560], [340, 560], [340, 480]], ref.evaporating);
  const hz = hp.compressor ? r.data[hp.compressor] : undefined, oil = hp.oil ? r.data[hp.oil] : undefined;
  over += part.compressor(d, 500, 110, 44, hp.compressor) +
    `<text x="500" y="52" text-anchor="middle" font-size="12" font-weight="700" class="t">Compressor · ${hz?.stale ? "— " + esc(hz.stale) : hz && run ? esc(d.fmt(hz)) : run ? "running" : "stopped"}` +
    (oil ? `<tspan class="hit ${oil.stale ? "w" : "m"}" data-e="${esc(oil.e)}" font-weight="400"> · oil ${esc(oil.stale ? "— " + oil.stale : d.fmt(oil))}</tspan>` : "") + `</text>`;
  over += part.valve(500, 560, ["w", "e"], ["w", "e"], "Expansion valve", undefined, [500, 598, "middle"]);
  if (air && ref.reversing_valve)
    over += `<g class="hit" data-e="${esc(ref.reversing_valve)}"><title>Reversing valve</title><rect class="hl" x="603" y="97" width="34" height="26" rx="4" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="1.6"/>` +
      `<path d="M610 104l20 12M610 116l20 -12" style="stroke:${defrost ? CIRCUIT.cold : "var(--hf-edge)"}" stroke-width="2"/>` +
      `<text x="620" y="88" text-anchor="middle" font-size="10.5" class="m halo">Reversing valve · ${defrost ? "defrost" : "heating"}</text></g>`;
  under += part.vessel(d, 650, 200, 100, 280, ref.hot_gas, ref.liquid, "Condenser", ref.condensing, run);
  if (ref.suction) over += part.callout(d, 115, 92, 140, "Suction gas", ref.suction, "low pressure", [340, 150]);
  if (ref.hot_gas) over += part.callout(d, 540, 140, 150, "Hot gas", ref.hot_gas, "high pressure", [700, 170]);
  if (ref.liquid) over += part.callout(d, 535, 490, 150, "Liquid", ref.liquid, "high pressure", [620, 560]);

  // ---- Load: through the condenser, the heating pump, the diverter ----
  const load = (pts: [number, number][], flow: string, sensors: Pipe["sensors"], more: Partial<Pipe> = {}) => P.push({ circ: "heat", pts, flow, speed: hp.pump, sensors, ...more });
  load([[750, 460], [670, 460], [670, 420], [730, 420], [730, 380], [670, 380], [670, 340], [730, 340], [730, 300], [670, 300], [670, 260], [750, 260]], "hp_out",
    [...quiet(hp.return, 0), ...quiet(hp.supply, 1)], { w: 9, r: 9 });
  load([[750, 260], [850, 260]], "hp_out", one(hp.supply, { at: [775, 260] }));
  load([[850, 260], [880, 260]], "heat", quiet(hp.supply, 0));
  // The return from the heating flows only while heating; below where the coil's return tees
  // in, it flows for either.
  load([[880, 300], [870, 300], [870, 440]], "heat", [...quiet(heating.house_return, 0), ...quiet(hp.return, 1)]);
  load([[870, 440], [870, 460], [750, 460]], "hp_out", [...quiet(hp.return, 0), ...one(hp.return, { at: [800, 460] })], { z: 1 });
  const tank = hasDhw(c);
  if (tank) {
    P.push({ circ: "dhw", pts: [[850, 260], [850, 390], [880, 390]], flow: "coil", speed: hp.pump, hops: [[870, 390, "h"]], sensors: quiet(dhw.coil_in ?? hp.supply, 0) });
    P.push({ circ: "dhw", pts: [[880, 440], [870, 440]], flow: "coil", speed: hp.pump, sensors: quiet(dhw.coil_out, 0) });
  }
  if (hp.pump) over += part.pump(d, 815, 260, "e", hp.pump, "Heating pump", [815, 232, "middle"]);
  over += part.valve(850, 260, ["w", "e", "s"], ["w", r.prio === "Hot water" ? "s" : "e"], "Diverter", hp.priority);
  const box = (y: number, title: string, list: [string, string | undefined][]) => {
    const n = list.filter(([, k]) => k).length;
    return `<g><rect x="880" y="${y}" width="110" height="${26 + n * 22}" rx="10" fill="url(#panelg)" style="stroke:var(--hf-line)"/>` +
      `<text x="890" y="${y + 18}" font-size="12" font-weight="700" class="t">${esc(title)}</text>` + rows(d, list, 890, y + 40, 982) + `</g>`;
  };
  over += box(200, "Heating", [["Supply", heating.house_supply], ["Target", hp.calculated], ["Return", heating.house_return], ["DM", hp.degree_minutes]]);
  if (tank) over += box(360, "Hot water", [["Top", dhw.tank?.[0]], ["Coil in", dhw.coil_in], ["Coil out", dhw.coil_out]]);

  const p = d.pipes(P);
  return `<defs>${DEFS}${p.defs}</defs>${part.zones(Z, H)}${under}` +
    `<g style="filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.25))">${p.body}</g>${over}${p.pills}`;
}
