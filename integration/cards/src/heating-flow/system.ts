// The Heating Flow card's System view: the whole installation in three areas (outside, plant
// room, house), each part drawn only when the options name it.
//
// Pipes are plumbed: every end lands on a part or tees into another pipe, and pipes others
// tee into are z: 1, so their water covers the joins. Six runs cross into the house: heating
// send and return, hot, its return loop, soft cold and hard (or plain cold, with no softener).
import { type Config, type Floor, PRIO_COLOUR, type Readings, floorsOf } from "./common.ts";
import { DEFS, Draw } from "./draw.ts";
import { type Area, type Look, type Pipe, type Sensor, esc } from "./engine.ts";
import * as part from "./parts.ts";

export const W = 1180, H = 740;
type Id = string | undefined;

/** A sensor on a pipe, if the options name one. */
const one = (k: Id, more: Omit<Sensor, "k"> = {}): Sensor[] => (k ? [{ k, ...more }] : []);
const quiet = (k: Id, f: number) => one(k, { f, show: false });
const spread = (ids: string[] | undefined, area: string): Sensor[] => (ids ?? []).map((k) => ({ k, area }));

export function system(c: Config, r: Readings, look: Look, reduced: boolean): string {
  const d = new Draw(r.data, r.flows, look, reduced);
  const src = c.source ?? {}, hp = c.heat_pump ?? {}, heating = c.heating ?? {}, dhw = c.dhw ?? {}, water = c.water ?? {};
  const Z: Area[] = [["outside", 0, 245, c.area_outside ?? "Outside", "--hf-zone-out"], ["plant", 245, 900, c.area_plant ?? "Plant room", "--hf-zone-plant"], ["house", 900, 1180, c.area_house ?? "House", "--hf-zone-house"]];
  d.areas = Z;
  const P: Pipe[] = [];
  let under = "", over = "";

  // ---- Source ----
  const ground = src.type === "borehole" || src.type === "horizontal" || !src.type, air = src.type === "air", pvt = ground && !!src.pvt;
  if (ground) {
    under += part.ground(d, 25, 440, 200, 180, src.type === "horizontal" ? "Ground loop" : "Borehole", src.ground ?? src.out);
    let U: [number, number][] = [[70, 440], [70, 600], [150, 600], [150, 440]];
    if (src.type === "horizontal") {
      U = [[70, 440], [70, 560]];
      for (let x = 82, j = 0; x <= 202; x += 12, j++) U.push([x, j % 2 ? 548 : 572]);
      U.push([206, 560], [206, 480], [150, 480], [150, 440]);
    }
    P.push({ circ: "brine", pts: U, r: src.type === "horizontal" ? 6 : 40, w: 10, flow: "brine", speed: src.pump, sensors: [...quiet(src.out, 0), ...quiet(src.ground ?? src.in, 1)] });
    P.push({ circ: "brine", pts: [[285, 330], [70, 330], [70, 440]], flow: "brine", speed: src.pump, hops: pvt ? [[205, 330, "h"], [240, 330, "h"]] : undefined, sensors: one(src.out, { at: [120, 330] }) });
    P.push({ circ: "brine", z: 1, pts: [[150, 440], [150, 385], [285, 385]], flow: "brine", speed: src.pump, sensors: [...quiet(src.ground, 0), ...one(src.in, { at: [262, 385] })] });
    if (pvt) {
      under += part.pvt(40, 62, 155, 85, src.pvt_out);
      P.push({ circ: "brine", pts: [[205, 385], [205, 127], [195, 127]], flow: "pvt", speed: src.pump, sensors: one(src.ground, { at: [205, 250] }) });
      P.push({ circ: "pvt", pts: [[195, 84], [240, 84], [240, 385]], flow: "pvt", speed: src.pump, sensors: one(src.pvt_out, { at: [240, 190] }) });
      over += part.valve(205, 385, ["w", "e", "n"], r.flows.pvt ? ["w", "n"] : ["w", "e"], "PVT valve", src.pvt_valve, [196, 372, "end"]);
    }
    // A brine pump stopped while the compressor runs is a fault: ring it.
    if (src.pump) over += part.pump(d, 150, 412, "n", src.pump, "Brine pump", [172, 426, "start"], r.flows.comp && !r.flows.brine);
  } else if (air) {
    const on = r.flows.comp;
    under += `<g class="hit" data-e="${esc(src.outdoor ?? "")}"><rect class="hl" x="30" y="230" width="200" height="190" rx="16" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/>` +
      `<circle cx="130" cy="325" r="72" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="2"/>` +
      `<g class="${on ? "spin" : ""}" style="transform-origin:130px 325px;--sd:.8s">${[0, 120, 240].map((a) => `<path d="M130 325c10 -30 40 -40 52 -30c-8 20 -30 32 -52 30z" transform="rotate(${a} 130 325)" style="fill:var(--hf-line)"/>`).join("")}</g>` +
      [0, 1, 2, 3, 4].map((j) => `<circle cx="130" cy="325" r="${20 + j * 13}" fill="none" style="stroke:var(--hf-edge)" stroke-opacity=".35"/>`).join("") +
      `<text x="130" y="222" text-anchor="middle" font-size="12" font-weight="700" class="t">Outdoor fan coil</text></g>`;
    P.push({ circ: "ref", pts: [[285, 300], [230, 300]], flow: "comp" });
    P.push({ circ: "ref", pts: [[230, 360], [285, 360]], flow: "comp" });
    if (src.outdoor) over += d.readout(130, 445, src.outdoor);
  }

  // ---- Heat pump panel ----
  const hz = hp.compressor ? r.data[hp.compressor] : undefined;
  over += `<g><rect x="285" y="170" width="235" height="280" rx="18" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/>` +
    `<text x="300" y="194" font-size="13" font-weight="700" class="t">${esc(hp.label || `${air ? "Air" : ground ? "Ground" : ""} source heat pump`)}</text>` +
    `<g class="hit" data-e="${esc(hp.priority ?? "")}"><title>Priority</title><rect class="hl" x="300" y="204" width="96" height="22" rx="11" fill="${PRIO_COLOUR[r.prio] ?? "#7a8190"}"/><text x="348" y="219" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${esc(r.prio)}</text></g>` +
    (r.alarm ? `<g class="hit" data-e="${esc(hp.alarm ?? "")}"><title>${esc(r.alarm)}</title><rect class="hl pulse" x="404" y="204" width="104" height="22" rx="11" style="fill:var(--hf-bad)"/><text x="456" y="219" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Alarm</text></g>` : "") +
    (hp.compressor ? part.compressor(d, 337, 282, 30, hp.compressor) + `<text x="337" y="330" text-anchor="middle" font-size="12" font-weight="700" class="t">${hz && !hz.stale && hz.v > 0 ? esc(d.fmt(hz)) : hz?.stale ? "— " + esc(hz.stale) : "Stopped"}</text>` : "") +
    rows(d, [["Supply", hp.supply], ["Calculated", hp.calculated], ["Return", hp.return]], 382, 258, 508) +
    `<path d="M300 344H506" style="stroke:var(--hf-line)"/>` +
    rows(d, [["Outdoor", src.outdoor], ["Power", hp.power], ["Heat", hp.heat]], 300, 368, 396) +
    rows(d, [["COP", hp.cop], ["Aux", hp.aux], ["DM", hp.degree_minutes]], 412, 368, 508) + `</g>`;

  // ---- Heating: pump and diverter, a long run to the house, a riser up to each floor and a
  // riser down the far side collecting the returns ----
  const floors = floorsOf(c).reverse(), n = floors.length; // top first
  const slots = [30, 145, 260].slice(3 - n), ys = slots.map((y) => y + 34), yr = slots.map((y) => y + 74);
  const heat = (pts: [number, number][], sensors: Sensor[], more: Partial<Pipe> = {}) => P.push({ circ: "heat", pts, flow: "heat", speed: hp.pump, sensors, ...more });
  P.push({ circ: "heat", pts: [[520, 250], [620, 250]], flow: "hp_out", speed: hp.pump, sensors: quiet(hp.supply, 0) });
  const bottom = floors[n - 1];
  heat([[620, 250], [n ? 920 : 900, 250]], [...quiet(hp.supply, 0), ...spread(heating.supply_plant, "plant"), ...quiet(heating.house_supply ?? bottom?.supply, 1)]);
  if (n && ys[0] < 250) heat([[920, 250], [920, ys[0]], [960, ys[0]]], [...quiet(heating.house_supply, 0), ...quiet(floors[0].supply, 1)], { z: 1 });
  if (n && ys[n - 1] > 250) heat([[920, 250], [920, ys[n - 1]], [960, ys[n - 1]]], [...quiet(heating.house_supply, 0), ...quiet(bottom.supply, 1)], { z: 1 });
  floors.forEach((f, i) => i > 0 && i < n - 1 && heat([[920, ys[i]], [960, ys[i]]], [...quiet(heating.house_supply, 0), ...quiet(f.supply, 1)]));
  if (n) {
    heat([[1150, yr[0]], [1165, yr[0]], [1165, 405], [900, 405]], [...quiet(floors[0].return, 0), ...quiet(heating.house_return, 1)], { z: 1 });
    floors.forEach((f, i) => i > 0 && heat([[1150, yr[i]], [1165, yr[i]]], quiet(f.return, 0)));
  }
  heat([[900, 405], [560, 405]], [...quiet(heating.house_return ?? bottom?.return, 0), ...spread(heating.return_plant, "plant")], { z: 1, r: 0 });
  P.push({ circ: "heat", z: 1, pts: [[560, 405], [520, 405]], flow: "hp_out", speed: hp.pump, sensors: quiet(hp.return, 1) });
  if (hp.pump) over += part.pump(d, 565, 250, "e", hp.pump, "Pump", [565, 283, "middle"]);
  const toDhw = r.prio === "Hot water";
  over += part.valve(620, 250, ["w", "e", "s"], ["w", toDhw ? "s" : "e"], `Diverter → ${toDhw ? "hot water" : "heating"}`, hp.priority, [620, 216, "middle"]);
  const boxes = floors.map((f, i) => floorBox(d, f, slots[i], ys[i], yr[i]));

  // ---- Hot water: the coil in and out of the tank's side, hot out of the top and along its
  // run to the house, the narrower return loop back, the immersion heater ----
  const hasDhw = dhw.enabled ?? !!(dhw.tank?.length || dhw.coil_in || dhw.hot_plant?.length);
  let tankOver = "";
  if (hasDhw) {
    P.push({ circ: "dhw", pts: [[620, 250], [620, 455], [584, 455], [584, 500], [600, 500]], flow: "coil", speed: hp.pump, hops: [[620, 405, "v"]], sensors: one(dhw.coil_in, { at: [620, 340] }) });
    const tk = dhw.tank ?? [], t = part.tank(d, 600, 470, 140, 160, tk.map((k, i) => [k, tk.length > 1 ? 0.14 + (0.72 * i) / (tk.length - 1) : 0.5]));
    under += t.under;
    // The immersion rises through the bottom (heat rises), clear of the coil's lowest turn.
    tankOver = t.over + (dhw.immersion ? part.immersion(d, 660, 636, 590, dhw.immersion) : "");
    P.push({ circ: "dhw", w: 8, r: 8, flow: "coil", speed: hp.pump, pts: [[600, 500], [688, 500], [688, 526], [624, 526], [624, 552], [688, 552], [688, 578], [624, 578], [624, 604], [600, 604]], sensors: [...quiet(dhw.coil_in, 0), ...quiet(dhw.coil_out, 1)] });
    P.push({ circ: "dhw", pts: [[600, 604], [560, 604], [560, 405]], flow: "coil", speed: hp.pump, sensors: one(dhw.coil_out, { at: [560, 560] }) });
    P.push({ circ: "hot", pts: [[670, 470], [670, 445], [1030, 445]], flow: "hot", sensors: [...quiet(tk[0], 0), ...spread(dhw.hot_plant, "plant"), ...spread(dhw.hot_house, "house")] });
    if (dhw.loop_pump || dhw.loop_house?.length || dhw.loop_plant?.length) {
      P.push({ circ: "hot", w: 7, pts: [[1030, 530], [740, 530]], flow: "recirc", sensors: [...spread(dhw.loop_house, "house"), ...spread(dhw.loop_plant, "plant")] });
      if (dhw.loop_pump) over += part.pump(d, 800, 530, "w", dhw.loop_pump, "Loop", [816, 560, "start"]);
    }
  }

  // ---- Water: mains in along the bottom; a softener teeing up from it; a storage tank and its
  // pumps; the soft cold run to the tank and the house ----
  const soft = !!water.softener, store = !!water.storage;
  under += part.stopcock(262, 712, water.meter ?? water.cold);
  if (soft) {
    under += part.softener(d, 285, 530, 60, 142, r.saltLow, water.salt, water.salt_low);
    P.push({ circ: "cold", z: 1, pts: [[262, 712], [300, 712]], flow: "mains", sensors: quiet(water.cold, 0) });
    P.push({ circ: "cold", pts: [[300, 712], [300, 672]], flow: "mains", sensors: quiet(water.cold, 0) });
    P.push({ circ: "cold", pts: [[300, 712], [1030, 712]], flow: "hard", sensors: quiet(water.cold, 0) });
  } else P.push({ circ: "cold", z: 1, pts: [[262, 712], [330, 712]], flow: "mains", sensors: quiet(water.cold, 0) });
  const from: [number, number][] = soft ? [[345, 560], [362, 560], [362, 486]] : [[330, 712], [330, 486]];
  if (store) {
    under += part.storage(d, 380, 498, 120, 202, r.flows.fill, water.storage_label || "Storage", water.inlet ?? water.level, water.level);
    P.push({ circ: "cold", pts: [...from, [440, 486], [440, 498]], flow: "fill", sensors: quiet(water.cold, 0) });
    over += part.valve(395, 486, ["w", "e"], r.flows.fill ? ["w", "e"] : [], `Inlet${r.flows.fill ? " · open" : ""}`, water.inlet, [395, 452, "middle"]);
    // The pumps sit in the water and lift into a header that leaves through the side.
    const pumps = (water.pumps ?? []).slice(0, 2), xs = pumps.length > 1 ? [405, 470] : [440];
    pumps.forEach((k, j) => {
      const on = (d.val(k) ?? 0) > 0;
      P.push({ circ: "cold", w: 8, pts: [[xs[j], 668], [xs[j], 650]], flow: on ? "soft" : undefined, speed: k, sensors: quiet(water.cold, 0) });
      over += part.pump(d, xs[j], 682, "n", k, `P${j + 1}`, [xs[j], 638, "middle"]);
    });
    P.push({ circ: "cold", z: 1, pts: [[pumps.length ? xs[0] : 440, 650], [760, 650], [760, 612], [740, 612]], flow: "soft", speed: pumps[0], sensors: [...quiet(water.cold, 0), ...one(water.cold, { at: [640, 650] })] });
  } else {
    P.push({ circ: "cold", z: 1, pts: soft ? [...from, [520, 486], [520, 650], [760, 650], [760, 612], [740, 612]] : [[330, 712], [330, 650], [760, 650], [760, 612], [740, 612]],
             flow: "soft", sensors: [...quiet(water.cold, 0), ...one(water.cold, { at: [640, 650] })] });
  }
  P.push({ circ: "cold", pts: [[760, 650], [1030, 650]], flow: "soft", speed: water.pumps?.[0], sensors: quiet(water.cold, 0) });
  const inUse = r.flows.soft, unsure = inUse ? "in use · hot or cold?" : "";
  over += part.outlets(1030, 412, 135, 318, [
    ...(hasDhw ? [{ y: 470, label: soft ? "Soft hot" : "Hot", icon: "shower" as const, on: inUse, note: unsure, e: dhw.hot_house?.at(-1) }] : []),
    ...(hasDhw && (dhw.loop_pump || dhw.loop_house?.length) ? [{ y: 530, label: "Return loop", icon: "none" as const, on: r.flows.recirc, e: dhw.loop_pump }] : []),
    { y: 650, label: soft ? "Soft cold" : "Cold", icon: "tap", on: inUse, note: unsure, e: water.pumps?.[0] ?? water.cold },
    ...(soft ? [{ y: 704, label: "Hard (kitchen)", icon: "tap" as const, on: r.flows.hard, note: water.meter ? "" : "needs a mains meter", e: water.meter }] : []),
  ]);

  const p = d.pipes(P), shadow = `style="filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.25))"`;
  return `<defs>${DEFS}${p.defs}${boxes.map((b) => b.defs).join("")}</defs>${part.zones(Z, H)}${under}<g ${shadow}>${p.body}</g>` +
    `${tankOver}${boxes.map((b) => b.box).join("")}<g ${shadow}>${boxes.map((b) => b.pipes).join("")}</g>${boxes.map((b) => b.over).join("")}${over}${p.pills}`;
}

const rows = (d: Draw, list: [string, Id][], x: number, y: number, xr: number) =>
  list.filter(([, k]) => k).map(([label, k], i) => d.row(x, y + i * 22, label, k!, xr)).join("");

/** One floor: its manifold (underfloor loops, each with its actuator) or its radiators. The
 * send comes in on the left, the return leaves on the right. */
function floorBox(d: Draw, f: Floor, y0: number, ys: number, yr: number) {
  const ufh = f.emitters !== "rad", mixed = ufh && !!f.mixed, loops = f.loops ?? [];
  const open = loops.filter((k) => (d.val(k) ?? 0) > 0).length, x0 = mixed ? 982 : 966;
  const box = `<g class="hit" data-e="${esc(f.supply ?? "")}"><rect class="hl" x="960" y="${y0}" width="190" height="100" rx="12" fill="url(#panelg)" style="stroke:var(--hf-line)"/>` +
    `<text x="972" y="${y0 + 18}" font-size="12" font-weight="700" class="t">${esc(f.name ?? "Floor")}</text>` +
    `<text x="1140" y="${y0 + 18}" text-anchor="end" font-size="10.5" class="m">${ufh ? "Underfloor" : "Radiators"}${mixed ? " · mixed" : ""}</text>` +
    `<text x="972" y="${y0 + 93}" font-size="10.5" class="m">${ufh ? (loops.length ? `${open} of ${loops.length} loops open` : "") : "Radiators"}</text></g>`;
  const P: Pipe[] = [
    { circ: "heat", w: 6, r: 0, z: 1, pts: [[960, ys], [1120, ys]], flow: "heat", sensors: quiet(f.supply, 0) },
    { circ: "heat", w: 6, r: 0, z: 1, pts: [[x0 + 50, yr], [1150, yr]], flow: "heat", sensors: quiet(f.return, 1) },
  ];
  let over = "";
  if (ufh)
    loops.slice(0, 6).forEach((k, j) => {
      const x = x0 + 56 + j * 15, isOpen = (d.val(k) ?? 0) > 0;
      P.push({ circ: "heat", w: 5, r: 0, pts: [[x, ys], [x, yr]], flow: k, sensors: isOpen ? [...quiet(f.supply, 0), ...quiet(f.return, 1)] : [] });
      over += `<g class="hit" data-e="${esc(k)}"><title>${esc(k)}: ${isOpen ? "open" : "closed"}</title><circle class="hl" cx="${x}" cy="${ys + 11}" r="4.5" style="fill:${isOpen ? "var(--hf-run)" : "var(--hf-panel)"};stroke:var(--hf-edge)" stroke-width="1.5"/></g>`;
    });
  else for (let j = 0; j < 3; j++) over += part.radiator(d, x0 + 54 + j * 30, ys + 7, 24, yr - ys - 20, f.supply ?? "", f.return ?? "");
  if (mixed) over += part.valve(974, ys, ["w", "e", "n"], ["w", "e", "n"], "Mixing valve", undefined);
  if (f.supply) over += d.readout(x0 + 24, ys, f.supply);
  if (f.return) over += d.readout(1120, yr, f.return);
  const p = d.pipes(P);
  return { defs: p.defs, box, pipes: p.body, over };
}
