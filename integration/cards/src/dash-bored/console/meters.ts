// What a meter panel shows of a device (cards.ts, the Console's meter panel): which of its
// sensors, on which phase, in what unit and between what limits. Nothing is drawn here
// (metered.ts draws it with an era's kit), and nothing describes a model of meter: a
// sensor's device class says what it measures and its name says which phase.
// The design is docs/design/console-meter-panel.md.
import type { Hass } from "../../ha.ts";
import { scale, type Watch } from "../../sensor-watch/common.ts";

/** What can be on a chassis, in the order it stands in: the meters, then the registers. */
export const KINDS = ["voltage", "current", "power", "apparent_power", "power_factor", "frequency", "energy"] as const;
export type Kind = (typeof KINDS)[number];
/** What a card shows when it does not say. */
export const SHOWN: Kind[] = ["voltage", "current", "power", "energy"];
const ENERGY = "energy";

/** A card's own limits, by kind, in volts, amps, watts, volt-amps or hertz. Either end may be left out. */
export type Limits = Partial<Record<Kind, { min?: number; max?: number }>>;
export type Options = { show?: Kind[]; limits?: Limits };

/** A meter: its sensor, what it is lettered, its reading in `unit` (none: not answering) and
 * the ends of its scale. Where Sensor Watch watches the sensor: its `level` and what it
 * says of it, and whether it calls the sensor `stale` (its reading is then not to be believed). */
export type Meter = { id: string; kind: Kind; title: string; value?: number; unit: string; lo: number; hi: number; level?: string; message?: string; stale?: boolean };
/** What Sensor Watch says of each sensor it watches, by entity: the card follows them (panel.ts). */
export type Watches = ReadonlyMap<string, Watch>;
/** A register: an energy sensor's total, in kWh (none: not answering). */
export type Register = { id: string; name: string; kwh?: number };
/** A device's chassis. `strips` is a phase's meters, for each phase it has; `whole` is the
 * meters that are of no phase. `fault` is why there is nothing to draw. */
export type Chassis = { device: string; name: string; strips: { phase: number; meters: Meter[] }[]; whole: Meter[]; registers: Register[]; fault?: string };

// Each unit a sensor may report in, as its kind's own: volts, amps, watts, volt-amps, kWh.
const UNITS: Record<string, number> = { mV: 0.001, V: 1, kV: 1000, mA: 0.001, A: 1, W: 1, kW: 1000, MW: 1e6, VA: 1, kVA: 1000, Wh: 0.001, kWh: 1, MWh: 1000, Hz: 1 };
const BASE: Record<Kind, string> = { voltage: "V", current: "A", power: "W", apparent_power: "VA", power_factor: "", frequency: "Hz", energy: "kWh" };
// A mains voltage's scale: a nominal voltage, and the ends of the scale for readings near
// it, which hold what a supply is allowed to be and divide into round fifths.
const MAINS: [nominal: number, lo: number, hi: number][] = [[120, 105, 130], [230, 210, 260], [400, 360, 460]];
const NEAR = 0.2; // a reading is a mains voltage's when it is within this much of it
// A scale that is the same for any reading.
const FIXED: Partial<Record<Kind, [number, number]>> = { power_factor: [0, 1], frequency: [45, 65] };

/** Which phase a sensor is of, by its name or id: "L2 voltage", "supply_l2_power",
 * "Phase 2 current". None: 0, the whole meter. */
export function phase(text: string): number {
  const found = /(?:^|[^a-z0-9])(?:l|phase[ _]?)([123])(?![a-z0-9])/i.exec(text);
  return found ? Number(found[1]) : 0;
}

/** The first of 1, 2, 5, 10, 20, 50 and so on that holds `most`: a scale's top whose fifths are round numbers. */
export function step(most: number): number {
  if (!(most > 0)) return 1;
  const decade = 10 ** Math.floor(Math.log10(most));
  return [1, 2, 5, 10].map((m) => +(m * decade).toPrecision(1)).find((top) => most <= top)!;
}

/** The ends of a quantity's scale, in its own unit, for the `values` that share it. The
 * card's own limits come first, each end by itself. Without them, the ends Sensor Watch's
 * bands give (`watched`), then the kind's fixed scale or the mains band the readings are
 * in, or else from nothing (from under nothing, for a reading below it) to the first step
 * that holds them. `held` is the ends this scale had before: a stepped end never comes
 * back in while the card is on the page, so a scale does not jump as a load cycles. */
export function limits(kind: Kind, values: number[], own: { min?: number; max?: number } = {}, held?: [number, number], watched?: [number, number]): [number, number] {
  const most = Math.max(0, ...values);
  const least = Math.min(0, ...values);
  const mains = kind === "voltage" && values.length ? MAINS.find(([nominal]) => values.every((v) => Math.abs(v - nominal) < nominal * NEAR)) : undefined;
  const band = watched ?? FIXED[kind] ?? (mains && [mains[1], mains[2]]);
  let [lo, hi] = band ?? [least < 0 ? -step(-least) : 0, step(most)];
  if (!band && held) [lo, hi] = [Math.min(lo, held[0]), Math.max(hi, held[1])];
  lo = own.min ?? lo;
  hi = own.max ?? hi;
  return hi > lo ? [lo, hi] : [lo, lo + 1]; // a min at or over the max: still a scale
}

type Sensor = { id: string; kind: Kind; phase: number; name: string; value?: number; factor?: number };

/** A device's sensors of the kinds shown, each read in its kind's own unit. One that is
 * not answering, or reports in a unit that is not its kind's, has no value. */
function sensors(hass: Hass, device: string, named: string, show: readonly Kind[]): Sensor[] {
  const found: Sensor[] = [];
  for (const [id, entry] of Object.entries<any>(hass.entities ?? {})) {
    const state = hass.states[id];
    if (entry.device_id !== device || !id.startsWith("sensor.") || entry.hidden || !state) continue;
    const kind = state.attributes.device_class as Kind;
    if (!show.includes(kind)) continue;

    // A sensor is named by what it adds to its device's name: "Supply L1 voltage" is "L1 voltage".
    const full = String(state.attributes.friendly_name ?? id);
    const name = (full.toLowerCase().startsWith(named.toLowerCase()) ? full.slice(named.length) : full).trim() || kind;
    const unit = state.attributes.unit_of_measurement ?? "";
    // A power factor is a fraction, or a percentage of one.
    const factor = kind === "power_factor" ? (unit === "%" ? 0.01 : 1) : UNITS[unit];
    const read = state.state === "" ? NaN : Number(state.state);
    // (Twelve figures: a conversion leaves floating point's dust, which a register would show.)
    found.push({ id, kind, phase: phase(`${name} ${id}`), name, factor, value: Number.isFinite(read) && factor !== undefined ? +(read * factor).toPrecision(12) : undefined });
  }
  return found.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.phase - b.phase || a.id.localeCompare(b.id));
}

/** A reading as a meter is lettered with it: three figures. */
const figure = (n: number) => String(+n.toPrecision(3));

/** The ends Sensor Watch's bands give the scale these sensors share, in the kind's own
 * unit: its gauge's ends for each (`scale`), where they differ wide enough for all, and
 * then moved out until the scale is five round steps, since a needle's has figures along it.
 * None where no sensor of them is watched by bands on its state. */
function banded(sharing: Sensor[], watches: Watches): [number, number] | undefined {
  const ends = sharing.flatMap((s) => {
    const w = watches.get(s.id);
    if (!w?.watched || !w.bands?.length || w.attribute || w.days_until || s.factor === undefined) return [];
    const [lo, hi] = scale(w.bands);
    return [[lo * s.factor, hi * s.factor]];
  });
  if (!ends.length) return undefined;
  const [lo, hi] = [Math.min(...ends.map((e) => e[0])), Math.max(...ends.map((e) => e[1]))];
  for (let fifth = step((hi - lo) / 5); ; fifth = step(fifth * 1.5)) {
    const from = Math.floor(lo / fifth) * fifth;
    if (from + 5 * fifth >= hi) return [+from.toPrecision(12), +(from + 5 * fifth).toPrecision(12)];
  }
}

/** One device's chassis. `held` is the card's memory of each scale's ends (see `limits`),
 * kept by the card for as long as it is on the page. `watches` is what Sensor Watch has
 * said of the sensors, where it is installed. */
export function chassis(hass: Hass, device: string, options: Options, held: Map<string, [number, number]>, watches: Watches = new Map()): Chassis {
  const entry = hass.devices?.[device];
  if (!entry) return { device, name: "", strips: [], whole: [], registers: [], fault: "This device is not in Home Assistant" };
  const name = String(entry.name_by_user || entry.name || device);
  const show = options.show?.length ? options.show : SHOWN;
  const all = sensors(hass, device, name, show);
  const blank = { device, name, strips: [], whole: [], registers: [] };
  if (!all.length) return { ...blank, fault: `${name} has no ${show.join(", ").replace(/_/g, " ")} sensor to show` };

  // A quantity's phases share a scale; the whole meter's reading of it has its own.
  const metered = all.filter((s) => s.kind !== ENERGY);
  const meters = (of: Sensor[]): Meter[] => of.map((s) => {
    const sharing = metered.filter((o) => o.kind === s.kind && !o.phase === !s.phase);
    const key = `${device} ${s.kind} ${s.phase ? "phase" : "whole"}`;
    const ends = limits(s.kind, sharing.flatMap((o) => (o.value === undefined ? [] : [o.value])), options.limits?.[s.kind], held.get(key), banded(sharing, watches));
    held.set(key, ends);

    // Watts and volt-amps are shown in thousands once the scale reaches a thousand.
    const kilo = (s.kind === "power" || s.kind === "apparent_power") && Math.max(-ends[0], ends[1]) >= 1000;
    const by = kilo ? 1000 : 1;
    const unit = `${kilo ? "k" : ""}${BASE[s.kind]}`;
    const value = s.value === undefined ? undefined : s.value / by;
    // A phase's meter is lettered with its phase, and one of several of a kind with its name.
    const alone = sharing.length === 1 && !s.phase;
    const who = s.phase ? `L${s.phase}` : alone ? "" : s.name;
    const reads = value === undefined ? "not answering" : `${figure(value)} ${unit}`.trim();
    const watch = watches.get(s.id);
    const told = watch?.watched && !watch.disabled ? { level: watch.level, message: watch.message, stale: watch.stale } : {};
    return { id: s.id, kind: s.kind, title: who ? `${who}${value === undefined ? ":" : ""} ${reads}` : reads, value, unit, lo: ends[0] / by, hi: ends[1] / by, ...told };
  });

  const phases = [...new Set(metered.map((s) => s.phase))].filter(Boolean);
  return {
    ...blank,
    strips: phases.map((p) => ({ phase: p, meters: meters(metered.filter((s) => s.phase === p)) })),
    whole: meters(metered.filter((s) => !s.phase)),
    registers: all.filter((s) => s.kind === ENERGY).map((s) => ({ id: s.id, name: s.name, kwh: s.value })),
  };
}

/** The devices that have a meter's sensors: for a new card, which shows the first. */
export function metered(hass: Hass): string[] {
  const has = new Map<string, Set<string>>();
  for (const [id, entry] of Object.entries<any>(hass.entities ?? {})) {
    const kind = hass.states[id]?.attributes.device_class;
    if (entry.device_id && id.startsWith("sensor.") && (kind === "voltage" || kind === "current")) has.set(entry.device_id, (has.get(entry.device_id) ?? new Set()).add(kind));
  }
  return [...has].filter(([, kinds]) => kinds.size === 2).map(([device]) => device);
}

// --- how a chassis fits the width it has -------------------------------------------------
// A stopgap (owner, 2026-11-18; BACKLOG has doing it properly): the works are laid out at
// their natural width and the whole of them zoomed to fit, since not every control can be
// drawn at any size yet.
export const CELL = 150; // px: a meter's natural width
export const GAP = 10; // px: between two meters side by side
const SMALLEST = 0.6; // below this zoom the lettering can't be read, so the form changes
const LARGEST = 1.6; // above this a meter is coarse
const ABREAST = 0.75; // the whole meter's strip stays beside the phases down to this zoom

/** How wide `count` meters side by side are, at their natural size. */
export const abreast = (count: number) => count * CELL + Math.max(0, count - 1) * GAP;

export type Fit = { form: "wide" | "under" | "column"; width: number; zoom: number };

/** The form a chassis takes in `available` px, the width it is laid out at, and the zoom
 * that then fits it. `wide` is its natural width with everything abreast. `under`, for a
 * meter with phases, is its width with the whole meter's strip under the phases': that
 * form is taken when everything abreast would be too small. When that is too small as
 * well (or there is no such form), the meters stand in one column, never larger than life. */
export function fit(available: number, wide: number, under?: number): Fit {
  const zoom = (width: number, most = LARGEST) => +Math.min(most, available / width).toFixed(3);
  if (available >= wide * (under ? ABREAST : SMALLEST)) return { form: "wide", width: wide, zoom: zoom(wide) };
  if (under && available >= under * SMALLEST) return { form: "under", width: under, zoom: zoom(under) };
  return { form: "column", width: CELL, zoom: Math.max(SMALLEST, zoom(CELL, 1)) };
}
