// The Sensor Watch card's options, and what it reads: the casa_mia_sensor_watch
// integration's `list` service (worst first, then longest standing).
export const TYPE = "custom:casa-mia-sensor-watch";
export const LEVELS = ["task", "warning", "error", "critical"] as const;
export type Level = "nominal" | (typeof LEVELS)[number];

export type Config = {
  type: string;
  title?: string;
  /** A group's name (as on the Sensor Watch page): only its members. */
  group?: string;
  /** The levels to list; all but nominal by default. */
  levels?: Level[];
  /** At most this many rows. */
  max?: number;
  /** With nothing to list: hide (and let its panel close), or say so. */
  when_clear?: "hide" | "message";
  clear_message?: string;
  /** What each row shows; all of it by default. */
  show?: Column[];
};

/** A row's parts, in order. */
export const COLUMNS = ["level", "name", "message", "value", "since"] as const;
export type Column = (typeof COLUMNS)[number];

export const DEFAULTS = { levels: [...LEVELS] as Level[], max: 20, when_clear: "hide", clear_message: "All well.", show: [...COLUMNS] as Column[] } as const;

/** The row's grid columns for what it shows (the name and message share one). */
export function columns(show: readonly Column[]): string {
  const has = (c: Column) => show.includes(c);
  return [has("level") && "72px", (has("name") || has("message")) && "minmax(0, 1fr)", has("value") && "auto", has("since") && "auto"].filter(Boolean).join(" ");
}

/** One row of the `list` service's answer. */
/** A row as the list service gives it; `attribute`: the attribute watched, not the state. */
export type Row = { entity_id: string; name: string; level: Level; value: string | null; message: string | null; since: string; attribute?: string; days_until?: boolean };

/** A due date as people read it ("25 Oct"), or the days the integration gave. */
export function due(state: string | undefined, days: string | null): string {
  const t = state ? Date.parse(state) : NaN;
  if (!Number.isNaN(t)) return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return days ? `${days} days` : "";
}

/** "4 min", "3 h", "2 d": how long since `iso`. */
export function since(iso: string, now: number): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}
