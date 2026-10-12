// Sensor Watch, in Casa Mia's integration: its event on each change of level, its list
// service, and its own entities (status, counts, problem; on casa_mia's platform, their
// translation keys sensor_watch_*). Its own integration, casa_mia_sensor_watch, until
// 2026.10.10-b3.
export const EVENT = "casa_mia_sensor_watch";
export const SERVICE = { domain: "casa_mia", service: "sensor_watch_list" };
export function own(e: { platform?: string; translation_key?: string }): boolean {
  return e.platform === "casa_mia" && (e.translation_key ?? "").startsWith("sensor_watch_");
}

// The Sensor Watch card's options, and what it reads: Sensor Watch's
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
  /** What each row shows, in this order; all but the icon by default. */
  show?: Column[];
  /** The icon's colour: the row's level, the entity's own state colour (as a tile), or none. */
  icon_color?: IconColor;
};

export const ICON_COLORS = ["level", "state", "none"] as const;
export type IconColor = (typeof ICON_COLORS)[number];

/** A row's parts; a card shows them in the order of its `show`. */
export const COLUMNS = ["icon", "level", "name", "message", "value", "since"] as const;
export type Column = (typeof COLUMNS)[number];

export const DEFAULTS = { levels: [...LEVELS] as Level[], max: 20, when_clear: "hide", clear_message: "All well.", show: COLUMNS.filter((c) => c !== "icon") as Column[], icon_color: "level" } as const;

/** The row's parts in order, the name and message as one (`what`, where the first of
 * them is), each once. */
export function parts(show: readonly Column[]): (Column | "what")[] {
  const out = show.map((c) => (c === "name" || c === "message" ? "what" : c));
  return out.filter((c, i) => out.indexOf(c) === i);
}

const WIDTH: Record<Column | "what", string> = { icon: "24px", level: "72px", what: "minmax(0, 1fr)", name: "", message: "", value: "auto", since: "auto" };

/** The row's grid columns for what it shows, in its order. */
export function columns(show: readonly Column[]): string {
  return parts(show)
    .map((p) => WIDTH[p])
    .join(" ");
}

const INACTIVE = ["off", "closed", "locked", "idle", "standby", "docked", "not_home", "unavailable", "unknown"];

/** An entity's state colour as a tile draws it, from HA's theme variables: its device
 * class's and domain's for this state, then active or inactive. */
// ponytail: HA's own stateColorCss isn't reachable from a card; this follows its variable
// names for the common cases. Use HA's helper if the frontend ever exposes it.
export function stateColor(entityId: string, state: string, deviceClass?: string): string {
  const domain = entityId.split(".")[0];
  const kind = INACTIVE.includes(state) ? "inactive" : "active";
  const names = [...(deviceClass ? [`--state-${domain}-${deviceClass}-${state}-color`] : []), `--state-${domain}-${state}-color`, `--state-${domain}-${kind}-color`];
  const last = kind === "inactive" ? "var(--state-inactive-color)" : "var(--state-icon-color)";
  return names.reduceRight((inner, n) => `var(${n}, ${inner})`, last);
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
