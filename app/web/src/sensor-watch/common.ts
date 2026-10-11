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

export type Band = { from: number | null; to: number | null; level: Level; message: string };

/** A watched sensor's record, as the app keeps it (app/.../sensor_watch/common.py). */
export type WatchRecord = {
  entity_id: string;
  kind: "numeric" | "binary" | "state";
  name: string;
  hold_off: number;
  unavailable: Level | "ignore";
  bands?: Band[];
  otherwise?: Level;
  nominal?: "on" | "off";
  other?: Level;
  message?: string;
  /** Exact states: the nominal ones. */
  states?: string[];
  /** Its name to show: its own, else Home Assistant's. */
  label?: string;
};

export type WatchView = { records: WatchRecord[]; levels: Level[]; error: string | null };

/** A sensor's level now, from the integration. */
export type Live = { entity_id: string; level: Level; value: string | null; message: string | null; since: string; name: string };
export type LevelsView = { levels: Record<string, Live>; error: string | null };

export type Candidate = {
  entity_id: string;
  name: string;
  kind: "numeric" | "binary" | "state";
  area_id: string | null;
  area: string;
  labels: string[];
  platform: string;
  device_class: string;
  unit: string;
  state: string;
  statistics: boolean;
  /** An enum sensor's states. */
  options?: string[];
  watched?: boolean;
};

export type Options = {
  areas: { id: string; name: string }[];
  labels: { id: string; name: string }[];
  platforms: string[];
  device_classes: string[];
};

export type CandidatesView = { total: number; sensors: Candidate[]; options: Options };

export type Filters = { q: string; area: string; label: string; platform: string; device_class: string; kind: string };
export const NO_FILTERS: Filters = { q: "", area: "", label: "", platform: "", device_class: "", kind: "" };

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
  source: "statistics" | "history";
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
export function kindOf(entityId: string): "numeric" | "binary" {
  return entityId.startsWith("binary_sensor.") ? "binary" : "numeric";
}

/** "10–25", "… –10", "25 –…" */
export function span(b: Band): string {
  return `${b.from ?? "…"} – ${b.to ?? "…"}`;
}

/** The nominal band(s) of a record, in words. */
export function summary(r: Pick<WatchRecord, "kind" | "bands" | "nominal" | "other" | "states">): string {
  if (r.kind === "binary") return `nominal ${r.nominal}, else ${r.other}`;
  if (r.kind === "state") return `nominal ${(r.states ?? []).join(", ") || "?"}, else ${r.other}`;
  const nominal = (r.bands ?? []).filter((b) => b.level === "nominal");
  return nominal.length ? `nominal ${nominal.map(span).join(", ")}` : "no nominal band";
}

export function query(f: Filters): string {
  return Object.entries(f)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}
