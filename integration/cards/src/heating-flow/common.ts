// The Heating Flow card's options, and what it reads from Home Assistant: each configured
// entity as a reading (not current when unavailable, or silent for too long), what is
// flowing, and the heat pump's priority and alarm.
import type { Look, Reading } from "./engine.ts";

type Id = string;
export type Floor = { name?: string; emitters?: "ufh" | "rad"; mixed?: boolean; supply?: Id; return?: Id; loops?: Id[] };
export type Config = {
  type: string;
  title?: string;
  pipes?: Look["pipes"];
  markers?: Look["markers"];
  colours?: Look["colours"];
  readouts?: Look["readouts"];
  area_outside?: string;
  area_plant?: string;
  area_house?: string;
  tap_action?: object;
  hold_action?: object;
  double_tap_action?: object;
  source?: { type?: "borehole" | "horizontal" | "air" | "none"; pump?: Id; out?: Id; ground?: Id; in?: Id; pvt?: boolean; pvt_out?: Id; pvt_valve?: Id; outdoor?: Id };
  heat_pump?: { label?: string; priority?: Id; compressor?: Id; supply?: Id; calculated?: Id; return?: Id; power?: Id; heat?: Id; cop?: Id; aux?: Id; degree_minutes?: Id; alarm?: Id; pump?: Id };
  heating?: { supply_plant?: Id[]; return_plant?: Id[]; house_supply?: Id; house_return?: Id };
  floor_1?: Floor;
  floor_2?: Floor;
  floor_3?: Floor;
  dhw?: { enabled?: boolean; coil_in?: Id; coil_out?: Id; tank?: Id[]; hot_plant?: Id[]; hot_house?: Id[]; loop_pump?: Id; loop_house?: Id[]; loop_plant?: Id[]; immersion?: Id };
  water?: { softener?: boolean; salt?: Id; salt_low?: Id; storage?: boolean; storage_label?: string; inlet?: Id; level?: Id; pumps?: Id[]; meter?: Id; cold?: Id };
};

export const DEFAULTS = { pipes: "outline", markers: "chev", colours: "temp", readouts: "pill", area_outside: "Outside", area_plant: "Plant room", area_house: "House" } as const;

/** The floors configured, from the bottom up (floor_1 is the lowest). */
export const floorsOf = (c: Config): Floor[] => [c.floor_1, c.floor_2, c.floor_3].filter((f): f is Floor => !!f && !!(f.name || f.supply || f.return || f.loops?.length));

/** Every entity the options name. */
export function entitiesOf(c: Config): Id[] {
  const out: Id[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string" && /^[a-z_]+\.[a-z0-9_]+$/.test(v)) out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => !k.endsWith("_action") && walk(x));
  };
  walk({ ...c, type: undefined });
  return [...new Set(out)];
}

/** How long ago, briefly: "23 min", "5 h", "3 days". */
export function ago(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60e3));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
}

const ON = new Set(["on", "open", "opening", "true", "home", "heat", "heating", "running"]);
const OFF = new Set(["off", "closed", "closing", "false", "idle", "standby"]);

type St = { state: string; attributes: Record<string, any>; last_changed?: string; last_updated?: string; last_reported?: string };

/** One entity as a reading. Unavailable, unknown or missing is not current, and says for how
 * long. Silence alone is not: HA stamps a state only when it changes, so a steady sensor (a
 * pump idle all night) is quiet and right. Sensor Watch judges silence; the card doesn't. */
export function reading(st: St | undefined, id: Id, precision: number | undefined, now: number): Reading {
  if (!st) return { v: NaN, unit: "", dp: 0, e: id, stale: "missing" };
  const unit0: string = st.attributes?.unit_of_measurement ?? "";
  const unit = /^°[CF]$/.test(unit0) ? "°" : unit0 === "%" ? "%" : unit0 ? ` ${unit0}` : "";
  const since = Date.parse(st.last_changed ?? st.last_updated ?? "");
  const age = Number.isFinite(since) ? now - since : 0;
  const lapsed = st.state === "unavailable" || st.state === "unknown";
  const n = parseFloat(st.state), s = st.state.toLowerCase();
  const v = Number.isFinite(n) ? n : ON.has(s) ? 1 : OFF.has(s) ? 0 : NaN;
  // HA's display precision, or as many decimals as the state itself has.
  const r: Reading = { v, unit, dp: precision ?? (st.state.split(".")[1]?.length ?? 0), e: id };
  if (!Number.isFinite(n)) r.text = st.state;
  if (lapsed) r.stale = ago(age);
  return r;
}

/** The heat pump's priority, from whatever its controller calls it. */
export function priorityOf(state: string | undefined): string {
  const s = (state ?? "").toLowerCase();
  if (!s || s === "unavailable" || s === "unknown") return "Unknown";
  if (/water|dhw|hot/.test(s)) return "Hot water";
  if (/defrost/.test(s)) return "Defrost";
  if (/cool/.test(s)) return "Cooling";
  if (/heat/.test(s)) return "Heating";
  if (/off|idle|stand|none/.test(s)) return "Off";
  return state!;
}
export const PRIO_COLOUR: Record<string, string> = { Heating: "#e5443a", "Hot water": "#a652d6", Off: "#7a8190", Defrost: "#2f86e0", Cooling: "#2fbfd0" };

const QUIET_ALARM = /^(|0|ok|none|off|no alarm|no alarms|normal|false|unavailable|unknown)$/i;

export type Readings = {
  data: Record<string, Reading>;
  flows: Record<string, boolean>;
  prio: string;
  alarm: string | null;
  saltLow: boolean;
};

/** Everything the card shows, from the states. */
export function readAll(hass: { states: Record<string, St>; entities?: Record<string, any> }, c: Config, now = Date.now()): Readings {
  const data: Record<string, Reading> = {};
  for (const id of entitiesOf(c)) data[id] = reading(hass.states[id], id, hass.entities?.[id]?.display_precision, now);
  const val = (id?: Id) => (id && data[id] && !data[id].stale && Number.isFinite(data[id].v) ? data[id].v : null);
  const runs = (id?: Id) => (val(id) ?? 0) > 0;

  const hp = c.heat_pump ?? {}, src = c.source ?? {}, dhw = c.dhw ?? {}, water = c.water ?? {};
  const prio = priorityOf(hp.priority ? hass.states[hp.priority]?.state : undefined);
  const comp = hp.compressor ? runs(hp.compressor) : prio !== "Off" && prio !== "Unknown";
  const heatPump = (id?: Id) => (id ? runs(id) : true); // no pump entity: assume it runs with its priority
  const heat = (prio === "Heating" || prio === "Defrost") && heatPump(hp.pump);
  const coil = prio === "Hot water" && heatPump(hp.pump);
  const brine = src.type !== "air" && src.type !== "none" && (src.pump ? runs(src.pump) : comp);
  const pvt = brine && !!src.pvt && runs(src.pvt_valve);
  const loop = runs(dhw.loop_pump);
  const storagePumps = (water.pumps ?? []).some(runs);
  const fill = !!water.storage && runs(water.inlet);
  const meter = runs(water.meter);
  const soft = water.storage ? storagePumps : meter;
  const flows: Record<string, boolean> = {
    // Hot flows while the loop runs, and while soft water is in use: the soft cold that
    // refills the tank's bottom pushes hot out of its top.
    comp, heat, coil, hp_out: heat || coil, brine, pvt, hot: loop || soft, recirc: loop, soft, fill,
    mains: fill || meter, hard: !!water.storage && meter && !fill,
  };
  for (const f of floorsOf(c)) for (const id of f.loops ?? []) flows[id] = heat && runs(id);

  const alarmState = hp.alarm ? hass.states[hp.alarm]?.state : undefined;
  const alarm = alarmState && !QUIET_ALARM.test(alarmState.trim()) ? alarmState : null;
  const saltLow = !!water.softener && runs(water.salt_low);
  return { data, flows, prio, alarm, saltLow };
}
