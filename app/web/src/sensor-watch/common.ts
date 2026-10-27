/** Sensor Watch's types, API and level helpers, shared by its page and dialogs. */

import { api } from "../api";

export const swApi = api("sensor-watch");

export const LEVELS = ["nominal", "task", "warning", "error", "critical"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_NAMES: Record<Level, string> = {
  nominal: "Nominal",
  task: "Task",
  warning: "Warning",
  error: "Error",
  critical: "Critical",
};

/** One state of an on/off watch: its level and message. */
export type Side = { level: Level; message: string };

/** An exact state with a level and message of its own (a lock's "jammed"). */
export type StateLevel = { state: string; level: Level; message: string };

export type Band = { from: number | null; to: number | null; level: Level; message: string };
/** How far a meter may be out: a percentage of each edge, or an amount in its unit. */
export type Accuracy = { amount: number; percent: boolean };

/** The doubt either side of an edge (levels.py in_bands holds a level within it). */
export const margin = (edge: number, a?: Accuracy) => (!a ? 0 : a.percent ? (Math.abs(edge) * a.amount) / 100 : a.amount);

/** A watched sensor's record, as the app keeps it (app/.../sensor_watch/common.py). */
export type WatchRecord = {
  entity_id: string;
  kind: "numeric" | "binary" | "state" | "available";
  name: string;
  hold_off: number;
  /** Seconds unavailable before that counts (an availability watch uses hold_off). */
  unavailable_hold?: number;
  unavailable: Level | "ignore";
  bands?: Band[];
  otherwise?: Level;
  /** On/off: what each state means (either may be nominal, or neither). */
  off?: Side;
  on?: Side;
  /** Available: its level (and message) whatever its state; `unavailable` and `message`
   * when it's unavailable or gone. */
  available?: Side;
  /** Exact states: anything else's level and message. */
  other?: Level;
  message?: string;
  /** Exact states: the nominal ones. */
  states?: string[];
  /** Exact states: those with a level of their own. */
  exceptions?: StateLevel[];
  /** Its name to show: its own, else Home Assistant's. */
  label?: string;
  /** Watch this attribute's value instead of the state (a climate's current_temperature). */
  attribute?: string;
  /** Kept, with its group, but not watched (listed apart, greyed). */
  disabled?: boolean;
  /** Numeric: the state is a date, read as the days until it (a reminder due). */
  days_until?: boolean;
  /** Each level's seconds before it shows the next one up (task, warning, error). */
  escalate?: Partial<Record<Level, number>>;
  /** Numeric: how far the meter may be out (a level holds that close to an edge). */
  accuracy?: Accuracy;
  /** The profile it follows (its levels then come from there). */
  profile?: string;
  /** The group it joined by (groups.py), if any. */
  group?: string;
  /** What Home Assistant says of it, for the filters (sent with the list). */
  meta?: {
    name?: string;
    area_id?: string | null;
    area?: string;
    floor_id?: string | null;
    floor?: string;
    manufacturer?: string;
    model?: string;
    category?: string;
    labels?: string[];
    platform?: string;
    device_id?: string | null;
    device?: string;
    device_class?: string;
    kind?: string;
    domain?: string;
  };
};

/** Home Assistant's own health, as set on the page: the Recorder and History, failing
 * integrations, and those ignored (entry id -> its name). */
export type SystemSettings = { core: boolean; integrations: boolean; ignore: Record<string, string> };

/** A named set of levels many sensors follow (app/.../sensor_watch/profiles.py). */
export type Profile = Omit<WatchRecord, "entity_id" | "label" | "meta" | "profile"> & { id: string; followers: number };

/** What a sensor of each kind may follow (profiles.py FITS). */
export const FITS: Record<string, string[]> = {
  numeric: ["numeric", "state", "available"],
  binary: ["binary", "available"],
  state: ["state", "available"],
};
/** Each kind (a profile's mode) in a word or two. */
export const MODE_NAMES: Record<WatchRecord["kind"], string> = { numeric: "bands", binary: "on/off", state: "exact states", available: "available" };

/** A record's levels alone: what a profile holds, or a record of its own. */
export function levelsOf(r: Partial<WatchRecord>): Partial<WatchRecord> {
  const { entity_id: _e, label: _l, meta: _m, profile: _p, name: _n, attribute: _a, disabled: _d, ...levels } = r as WatchRecord;
  return levels;
}

/** A group: saved filters and a profile; what matches is watched, new arrivals too. */
export type Group = {
  id: string;
  name: string;
  filters: Partial<Filters>;
  profile: string;
  /** Members stopped by hand: not pulled back. */
  left: string[];
  members: number;
};

export type WatchView = {
  records: WatchRecord[];
  profiles: Profile[];
  groups: Group[];
  system: SystemSettings;
  levels: Level[];
  /** Label id -> its name. */
  labels?: Record<string, string>;
  error: string | null;
};

/** A sensor's level now, from the integration. */
/** A sensor's level now; escalated (a ladder's step), also the level its reading gives (`real`), since `since`. */
export type Live = { entity_id: string; level: Level; value: string | null; message: string | null; since: string; name: string; real?: Level; escalated?: boolean };
/** `rev`: the app's revision of the levels; asked with ?after=rev, it answers when they change. */
export type LevelsView = { levels: Record<string, Live>; error: string | null; rev: number };

export type Candidate = {
  entity_id: string;
  name: string;
  kind: "numeric" | "binary" | "state";
  area_id: string | null;
  area: string;
  device_id?: string | null;
  device?: string;
  domain?: string;
  labels: string[];
  platform: string;
  device_class: string;
  unit: string;
  state: string;
  statistics: boolean;
  /** An enum sensor's states. */
  options?: string[];
  /** Its attributes worth watching, with their values now. */
  attributes?: Record<string, string>;
  /** Its state is a date or timestamp (bands read it as days until it). */
  dated?: boolean;
  watched?: boolean;
  /** Set up by what it is (defaults.py), so a group following the defaults takes it. */
  has_default?: boolean;
};

export type Options = {
  areas: { id: string; name: string }[];
  /** Devices with sensors matching the other filters. */
  devices: { id: string; name: string }[];
  labels: { id: string; name: string }[];
  platforms: string[];
  /** Every domain with an entity; a scan without one looks at the usual few. */
  domains: string[];
  device_classes: string[];
  floors?: { id: string; name: string }[];
  manufacturers?: string[];
  models?: string[];
  /** primary, diagnostic or config: what an entity is for. */
  categories?: string[];
};

export type CandidatesView = { total: number; sensors: Candidate[]; options: Options };

export type Filters = {
  q: string;
  domain: string;
  area: string;
  floor?: string;
  label: string;
  platform: string;
  manufacturer?: string;
  model?: string;
  device: string;
  device_class: string;
  category?: string;
  kind: string;
  profile?: string;
  group?: string;
};
export const NO_FILTERS: Filters = {
  q: "",
  domain: "",
  area: "",
  floor: "",
  label: "",
  platform: "",
  manufacturer: "",
  model: "",
  device: "",
  device_class: "",
  category: "",
  kind: "",
  profile: "",
  group: "",
};

export type Suggestion = {
  count?: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  outliers?: number[];
  outlier_count?: number;
  bands?: Band[];
  nominal?: "on" | "off";
  share?: number;
  states?: string[];
  /** Time in each state, for on/off and exact states. */
  seconds?: Record<string, number>;
};

export type Suggested = {
  sensor: Candidate;
  source: "statistics" | "history" | "default";
  /** Set up by what it is (its kind and device class), not by its history. */
  default?: boolean;
  first: string | null;
  points?: [number, number][];
  suggestion: Suggestion | null;
  record: Omit<WatchRecord, "entity_id">;
  /** Why there's no history to suggest from, when HA couldn't give it. */
  problem?: string | null;
};

export type ScanView = {
  found: Suggested[];
  skipped: number;
  matched: number;
  remaining: number;
  next: [string, string] | null;
  problem?: string | null;
};

/** A sensor's kind from its entity id, known before anything is asked of HA. */
export function kindOf(entityId: string): "numeric" | "binary" | "state" {
  // A first guess until Home Assistant answers (history.py kind_of, ON_OFF and NUMBERS).
  const domain = entityId.split(".")[0];
  if (["binary_sensor", "update", "switch", "input_boolean", "fan", "light", "siren", "remote", "automation", "script", "humidifier"].includes(domain))
    return "binary";
  return ["sensor", "input_number", "number", "counter"].includes(domain) ? "numeric" : "state";
}

/** "10–25", "… –10", "25 –…" */
export function span(b: Band): string {
  return `${b.from ?? "…"} – ${b.to ?? "…"}`;
}

/** The nominal band(s) of a record, in words. */
export function summary(r: Pick<WatchRecord, "kind" | "bands" | "off" | "on" | "other" | "states" | "available" | "unavailable" | "days_until">): string {
  if (r.kind === "available") return `available ${r.available?.level ?? "?"}, unavailable ${r.unavailable}`;
  if (r.kind === "binary") return `off ${r.off?.level ?? "?"}, on ${r.on?.level ?? "?"}`;
  if (r.kind === "state") return `nominal ${(r.states ?? []).join(", ") || "?"}, else ${r.other}`;
  const nominal = (r.bands ?? []).filter((b) => b.level === "nominal");
  const days = r.days_until ? " days until it" : "";
  return nominal.length ? `nominal ${nominal.map(span).join(", ")}${days}` : `no nominal band${days}`;
}

/** Does `hay` (lower case) pass a search? Every word is in it, in any order, and no word
 * with a minus ("-vcc", taken whole) is: the app's scans.matches, for the page's lists. */
export function searched(hay: string, q: string): boolean {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const unwanted = terms.filter((t) => t.startsWith("-") && t.length > 1).map((t) => t.slice(1));
  const want = terms.filter((t) => !t.startsWith("-")).flatMap((t) => t.match(/[a-z0-9]+/g) ?? []);
  return want.every((w) => hay.includes(w)) && !unwanted.some((w) => hay.includes(w));
}

export function query(f: Filters): string {
  return Object.entries(f)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

/** A date watch's value as people read it: days (from the integration) or the date. */
export function dueValue(value: string): string {
  if (/^-?\d+(\.\d+)?$/.test(value)) return `${value} days`;
  const t = Date.parse(value);
  return Number.isNaN(t) ? value : new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Days of history to read (a scan, the editor's chart): a few, a week or two, up to a year. */
export const DAYS = [1, 2, 3, 7, 14, 30, 60, 90, 180, 365];

export const dayText = (d: number) => `${d} day${d === 1 ? "" : "s"}`;
