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

export const W = 1180, H = 770;
type Id = string | undefined;

/** A sensor on a pipe, if the options name one. */
const one = (k: Id, more: Omit<Sensor, "k"> = {}): Sensor[] => (k ? [{ k, ...more }] : []);
const quiet = (k: Id, f: number) => one(k, { f, show: false });
const spread = (ids: string[] | undefined, area: string): Sensor[] => (ids ?? []).map((k) => ({ k, area }));

export function system(c: Config, r: Readings, look: Look): string {
  const d = new Draw(r.data, r.flows, look);
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
    P.push({ circ: "brine", pts: [[285, 200], [70, 200], [70, 440]], flow: "brine", speed: src.pump, hops: pvt ? [[180, 200, "h"], [215, 200, "h"]] : undefined, sensors: one(src.out, { at: [120, 200] }) });
    P.push({ circ: "brine", z: 1, pts: [[150, 440], [150, 255], [285, 255]], flow: "brine", speed: src.pump, sensors: [...quiet(src.ground, 0), ...one(src.in, { at: [262, 255] })] });
    if (pvt) {
      // Four panels, narrow enough that both PVT pipes keep well clear of the area's edge.
      under += part.pvt(35, 62, 120, 85, src.pvt_out);
      P.push({ circ: "brine", pts: [[180, 255], [180, 127], [155, 127]], flow: "pvt", speed: src.pump, sensors: one(src.ground, { at: [180, 226] }) });
      P.push({ circ: "pvt", pts: [[155, 84], [215, 84], [215, 255]], flow: "pvt", speed: src.pump, sensors: one(src.pvt_out, { at: [215, 160] }) });
      over += part.valve(180, 255, ["w", "e", "n"], r.flows.pvt ? ["w", "n"] : ["w", "e"], "PVT valve", src.pvt_valve, [192, 278, "start"]);
    }
    // A brine pump stopped while the compressor runs is a fault: ring it.
    if (src.pump) over += part.pump(d, 150, 412, "n", src.pump, "Brine pump", [172, 426, "start"], r.flows.comp && !r.flows.brine);
  } else if (air) {
    const on = r.flows.comp;
    under += `<g class="hit" data-e="${esc(src.outdoor ?? "")}" transform="translate(0 -130)"><rect class="hl" x="30" y="230" width="200" height="190" rx="16" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/>` +
      `<circle cx="130" cy="325" r="72" style="fill:var(--hf-panel2);stroke:var(--hf-edge)" stroke-width="2"/>` +
      `<g class="${on ? "spin" : ""}" style="transform-origin:130px 325px;--sd:.8s">${[0, 120, 240].map((a) => `<path d="M130 325c10 -30 40 -40 52 -30c-8 20 -30 32 -52 30z" transform="rotate(${a} 130 325)" style="fill:var(--hf-line)"/>`).join("")}</g>` +
      [0, 1, 2, 3, 4].map((j) => `<circle cx="130" cy="325" r="${20 + j * 13}" fill="none" style="stroke:var(--hf-edge)" stroke-opacity=".35"/>`).join("") +
      `<text x="130" y="222" text-anchor="middle" font-size="12" font-weight="700" class="t">Outdoor fan coil</text></g>`;
    P.push({ circ: "ref", pts: [[285, 170], [230, 170]], flow: "comp" });
    P.push({ circ: "ref", pts: [[230, 230], [285, 230]], flow: "comp" });
    if (src.outdoor) over += d.readout(130, 315, src.outdoor);
  }

  // ---- Heat pump panel, top left (drawn at y 170, lifted to 40) ----
  const hz = hp.compressor ? r.data[hp.compressor] : undefined;
  over += `<g transform="translate(0 -130)"><rect x="285" y="170" width="235" height="280" rx="18" fill="url(#panelg)" style="stroke:var(--hf-edge)" stroke-width="1.5"/>` +
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
  // The send leaves at the panel's supply height; the return runs below every floor box and
  // climbs into the panel's side. It is split where the coil's return tees in (XR), so the
  // climb is one pipe with rounded bends.
  const YS = 120, YR = 368, XD = 625, XR = 595;
  P.push({ circ: "heat", pts: [[520, YS], [XD, YS]], flow: "hp_out", speed: hp.pump, sensors: quiet(hp.supply, 0) });
  const bottom = floors[n - 1];
  heat([[XD, YS], [n ? 920 : 900, YS]], [...quiet(hp.supply, 0), ...spread(heating.supply_plant, "plant"), ...quiet(heating.house_supply ?? bottom?.supply, 1)]);
  // A riser from the send to the furthest floor each way; the floors between tee off it.
  const ends = [0, n - 1].filter((i, j, a) => n && a.indexOf(i) === j && ys[i] !== YS);
  ends.forEach((i) => heat([[920, YS], [920, ys[i]], [960, ys[i]]], [...quiet(heating.house_supply, 0), ...quiet(floors[i].supply, 1)], { z: 1 }));
  floors.forEach((f, i) => !ends.includes(i) && heat([[920, ys[i]], [960, ys[i]]], [...quiet(heating.house_supply, 0), ...quiet(f.supply, 1)]));
  if (n) {
    heat([[1150, yr[0]], [1165, yr[0]], [1165, YR], [900, YR]], [...quiet(floors[0].return, 0), ...quiet(heating.house_return, 1)], { z: 1 });
    floors.forEach((f, i) => i > 0 && heat([[1150, yr[i]], [1165, yr[i]]], quiet(f.return, 0)));
  }
  heat([[900, YR], [XR, YR]], [...quiet(heating.house_return ?? bottom?.return, 0), ...spread(heating.return_plant, "plant")], { z: 1, r: 0 });
  P.push({ circ: "heat", z: 1, pts: [[XR, YR], [560, YR], [560, 290], [520, 290]], flow: "hp_out", speed: hp.pump, sensors: quiet(hp.return, 1) });
  if (hp.pump) over += part.pump(d, 565, YS, "e", hp.pump, "Pump", [565, YS + 33, "middle"]);
  const toDhw = r.prio === "Hot water";
  over += part.valve(XD, YS, ["w", "e", "s"], ["w", toDhw ? "s" : "e"], `Diverter → ${toDhw ? "hot water" : "heating"}`, hp.priority, [XD, YS - 34, "middle"]);
  const boxes = floors.map((f, i) => floorBox(d, f, slots[i], ys[i], yr[i]));

  // ---- Hot water: a tall tank (660–800 × 440–690) with the coil in its bottom half, in and
  // out of its left side; the coil's return climbs to tee into the heating return. Hot leaves
  // the top, the return loop comes back in low and rises past its pump into the tank's side,
  // the immersion comes in through the side about 28% up (the bottom sensor sits below it) ----
  const hasDhw = dhw.enabled ?? !!(dhw.tank?.length || dhw.coil_in || dhw.hot_plant?.length);
  let tankOver = "";
  if (hasDhw) {
    P.push({ circ: "dhw", pts: [[XD, YS], [XD, 545], [660, 545]], flow: "coil", speed: hp.pump, hops: [[XD, YR, "v"]], sensors: one(dhw.coil_in, { at: [XD, 250] }) });
    const tk = dhw.tank ?? [], t = part.tank(d, 660, 440, 140, 250, tk.map((k, i) => [k, tk.length > 1 ? 0.14 + (0.72 * i) / (tk.length - 1) : 0.5]));
    under += t.under;
    tankOver = t.over + (dhw.immersion ? part.immersion(d, 800, 762, 620, dhw.immersion) : "") +
      part.reducer(654, 545, "e", 12, 8, d.tint(dhw.coil_in, "coil", "dhw")) + part.reducer(654, 645, "e", 12, 8, d.tint(dhw.coil_out, "coil", "dhw"));
    P.push({ circ: "dhw", w: 8, r: 8, flow: "coil", speed: hp.pump, pts: [[660, 545], [748, 545], [748, 570], [684, 570], [684, 595], [748, 595], [748, 620], [684, 620], [684, 645], [660, 645]], sensors: [...quiet(dhw.coil_in, 0), ...quiet(dhw.coil_out, 1)] });
    P.push({ circ: "dhw", pts: [[660, 645], [XR, 645], [XR, YR]], flow: "coil", speed: hp.pump, sensors: one(dhw.coil_out, { at: [XR, 500] }) });
    P.push({ circ: "hot", pts: [[730, 440], [730, 412], [1030, 412]], flow: "hot", sensors: [...quiet(tk[0], 0), ...spread(dhw.hot_plant, "plant"), ...spread(dhw.hot_house, "house")] });
    if (dhw.loop_pump || dhw.loop_house?.length || dhw.loop_plant?.length) {
      // The plant sensors take the drop below the pump, then the stub into the tank, so the
      // pump has room of its own; any more spread along the plant room's stretch.
      const slots: [number, number][] = [[870, 592], [835, 500]];
      const plant = (dhw.loop_plant ?? []).map((k, i): Sensor => (i < slots.length ? { k, at: slots[i] } : { k, area: "plant" }));
      P.push({ circ: "hot", w: 7, pts: [[1030, 620], [870, 620], [870, 500], [800, 500]], flow: "recirc", sensors: [...spread(dhw.loop_house, "house"), ...plant] });
      if (dhw.loop_pump) over += part.pump(d, 870, 548, "n", dhw.loop_pump, "Loop", [890, 552, "start"]);
    }
  }

  // ---- Water: two clear lines along the bottom, soft (or plain) cold at YC and hard mains at
  // YM. Hard rises into the softener's resin column; soft fills the storage tank, whose pumps
  // lift into a header that runs to the house and tees up into the hot tank's bottom at XC ----
  const soft = !!water.softener, store = !!water.storage;
  const YC = 708, YM = 742, XC = 700, toTank: [number, number][] = [[XC, YC], [XC, 690]];
  under += part.stopcock(262, YM, water.meter ?? water.cold);
  if (soft) {
    under += part.softener(d, 285, 540, 60, 150, r.saltLow, water.salt, water.salt_low);
    P.push({ circ: "cold", z: 1, pts: [[262, YM], [335, YM]], flow: "mains", sensors: quiet(water.cold, 0) });
    P.push({ circ: "cold", pts: [[335, YM], [335, 690]], flow: "mains", sensors: quiet(water.cold, 0) });
    P.push({ circ: "cold", pts: [[335, YM], [1030, YM]], flow: "hard", sensors: quiet(water.cold, 0) });
  } else P.push({ circ: "cold", z: 1, pts: [[262, YM], [330, YM]], flow: "mains", sensors: quiet(water.cold, 0) });
  const from: [number, number][] = soft ? [[345, 580], [362, 580], [362, 468]] : [[330, YM], [330, 468]];
  if (store) {
    under += part.storage(d, 375, 480, 180, 240, r.flows.fill, water.storage_label || "Storage", water.inlet ?? water.level, water.level);
    P.push({ circ: "cold", pts: [...from, [465, 468], [465, 480]], flow: "fill", sensors: quiet(water.cold, 0) });
    over += part.valve(410, 468, ["w", "e"], r.flows.fill ? ["w", "e"] : [], `Inlet${r.flows.fill ? " · open" : ""}`, water.inlet, [410, 434, "middle"]);
    // The pumps sit in the water, clear of the floor: the first one's riser bends into the
    // header (no open end), the second tees in.
    const pumps = (water.pumps ?? []).slice(0, 2), xs = pumps.length > 1 ? [420, 510] : [465];
    pumps.forEach((k, j) => {
      if (j) P.push({ circ: "cold", pts: [[xs[j], 678], [xs[j], 664]], flow: (d.val(k) ?? 0) > 0 ? "soft" : undefined, speed: k, sensors: quiet(water.cold, 0) });
      over += part.pump(d, xs[j], 692, "n", k, `P${j + 1}`, [xs[j], 650, "middle"]);
    });
    P.push({ circ: "cold", z: 1, pts: [[xs[0], 678], [xs[0], 664], [565, 664], [565, YC], ...toTank], flow: "soft", speed: pumps[0], sensors: [...quiet(water.cold, 0), ...one(water.cold, { at: [640, YC] })] });
  } else {
    P.push({ circ: "cold", z: 1, pts: soft ? [...from, [565, 468], [565, YC], ...toTank] : [[330, YM], [330, YC], ...toTank],
             flow: "soft", sensors: [...quiet(water.cold, 0), ...one(water.cold, { at: [640, YC] })] });
  }
  P.push({ circ: "cold", pts: [[XC, YC], [1030, YC]], flow: "soft", speed: water.pumps?.[0], sensors: quiet(water.cold, 0) });
  const inUse = r.flows.soft, unsure = inUse ? "in use · hot or cold?" : "";
  over += part.outlets(1030, 380, 135, 382, [
    ...(hasDhw ? [{ y: 412, label: soft ? "Soft hot" : "Hot", icon: "shower" as const, on: inUse, note: unsure, e: dhw.hot_house?.at(-1) }] : []),
    ...(hasDhw && (dhw.loop_pump || dhw.loop_house?.length) ? [{ y: 620, label: "Return loop", icon: "none" as const, on: r.flows.recirc, e: dhw.loop_pump }] : []),
    { y: YC, label: soft ? "Soft cold" : "Cold", icon: "tap", on: inUse, note: unsure, e: water.pumps?.[0] ?? water.cold },
    ...(soft ? [{ y: YM, label: "Hard (kitchen)", icon: "tap" as const, on: r.flows.hard, note: water.meter ? "" : "needs a mains meter", e: water.meter }] : []),
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
  // Reducers where the risers (12) meet the manifold's pipes (6).
  over += part.reducer(954, ys, "e", 12, 6, d.tint(f.supply, "heat", "heat")) + part.reducer(1156, yr, "w", 12, 6, d.tint(f.return, "heat", "heat"));
  if (f.supply) over += d.readout(x0 + 24, ys, f.supply);
  if (f.return) over += d.readout(1120, yr, f.return);
  const p = d.pipes(P);
  return { defs: p.defs, box, pipes: p.body, over };
}
