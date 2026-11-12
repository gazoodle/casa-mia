// Sensor Watch's integration (casa_mia_sensor_watch): its event on each change of level,
// its list service, and its own entities (status, counts, problem).
export const DOMAIN = "casa_mia_sensor_watch";
export const EVENT = DOMAIN;
export const SERVICE = { domain: DOMAIN, service: "list" };
/** This file's version (the ?v= the integration loads it with; none in development), and
 * the command that says which one the integration serves now (its _ws_cards). */
export const VERSION = new URL(import.meta.url).searchParams.get("v") || "dev";
export const CARDS_VERSION = `${DOMAIN}/cards`;
export function own(e: { platform?: string }): boolean {
  return e.platform === DOMAIN;
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

// The eye in an entity's dialog (eye.ts) and the gauge card (gauge.ts): one entity's
// watch, from the integration's websocket subscription (levels.watching), and a tap to
// its editor on the page.
export const ENTITY = `${DOMAIN}/entity`;
/** A numeric watch's band: from `from` up to (not at) `to`; null: no end that side. */
export type Band = { from: number | null; to: number | null; level: Level };
/** Not watched; or watched, with its level once judged, and what its record reads. */
export type Watch = {
  watched: boolean;
  level?: Level;
  message?: string;
  escalated?: boolean;
  real?: Level;
  since?: string;
  /** Its level is for having stopped reporting (or changing), not for its reading. */
  stale?: boolean;
  kind?: "numeric" | "binary" | "state" | "available";
  bands?: Band[];
  /** The level of a number in none of the bands. */
  otherwise?: Level;
  attribute?: string;
  days_until?: boolean;
  disabled?: boolean;
};

/** One entity's watch, now and at each change of its level or its record. `heard` is
 * given the watch, or why there is none to give (Sensor Watch has stopped, or isn't in
 * this Home Assistant). Returns what stops it. */
export function follow(conn: any, entityId: string, heard: (watch: Watch | undefined, why?: string) => void): () => void {
  const off: Promise<() => void> = conn.subscribeMessage((w: Watch | { error: string }) => ("error" in w ? heard(undefined, w.error) : heard(w)), {
    type: ENTITY,
    entity_id: entityId,
  });
  off.catch((err: any) => {
    // No Sensor Watch here (not set up, or one from before this command): expected.
    if (err?.code !== "unknown_command" && err?.code !== "not_running") console.warn(`CASA-MIA CARDS: can't ask Sensor Watch about ${entityId} (${err?.message ?? err})`);
    heard(undefined, err?.code === "unknown_command" ? "Sensor Watch isn't set up in Home Assistant" : (err?.message ?? String(err)));
  });
  return () => void off.then((stop) => stop()).catch(() => {});
}

/** Sensor Watch's page in Home Assistant's sidebar (the integration's panel.py). */
export const PANEL = "sensor-watch";
/** Its address with an entity's watch asked for (new or not); `at` makes each ask a new
 * one, so the same entity asked twice opens twice. */
export const watchPath = (entityId: string, at: number) => `/${PANEL}?watch=${encodeURIComponent(entityId)}&at=${at}`;

/** Each level's colour, in HA's theme: the card's rows, the eye, the Status sensor's icon. */
export const LEVEL_COLOR: Record<Level, string> = {
  nominal: "var(--success-color, #43a047)",
  task: "var(--info-color, #039be5)",
  warning: "var(--warning-color, #ffa600)",
  error: "var(--error-color, #db4437)",
  critical: "var(--error-color, #db4437)",
};

/** The Status sensor's icon colour (its level's), or none for any other entity: HA colours
 * no sensor by its state, so ours is told (level-colour.ts). */
export function levelColour(stateObj: { entity_id: string; state: string } | undefined, entities: Record<string, any> | undefined): string | undefined {
  const e = stateObj && entities?.[stateObj.entity_id];
  if (e?.platform !== DOMAIN || e?.translation_key !== "status") return undefined;
  return LEVEL_COLOR[stateObj!.state as Level];
}

// --- the gauge card (gauge.ts): one watched number on an arc of its record's bands -------
export const GAUGE = "custom:casa-mia-sensor-watch-gauge";
export type GaugeConfig = {
  type: string;
  entity?: string;
  /** Instead of the entity's own name. */
  name?: string;
  /** The arc's ends; from the bands when not given (scale). */
  min?: number;
  max?: number;
};

/** The number a watch reads from its entity, as the integration does (levels.reading):
 * the state, or its `attribute`; with `days_until`, the days from `now` until that date.
 * Undefined when there is no number to place (unavailable, or text). */
export function reading(st: { state: string; attributes?: Record<string, any> } | undefined, watch: Pick<Watch, "attribute" | "days_until">, now: number): number | undefined {
  if (!st) return undefined;
  const raw = watch.attribute ? st.attributes?.[watch.attribute] : st.state;
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (watch.days_until) {
    const when = Date.parse(String(raw));
    return Number.isNaN(when) ? undefined : (when - now) / 86400e3;
  }
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

/** The arc's ends. The card's own `min` and `max` come first. Without them: 0 to 100 for
 * a percentage; else the bands' outermost edges, pushed out by half their span on a side
 * where a band has no end (it goes on for ever, so some of it is shown), or by half the
 * edge itself when there is only one edge. */
export function scale(bands: readonly Band[], o: { min?: number; max?: number; unit?: string } = {}): [number, number] {
  const edges = bands.flatMap((b) => [b.from, b.to]).filter((e): e is number => e !== null);
  let [lo, hi] = [0, 100];
  if (o.unit !== "%" && edges.length) {
    lo = Math.min(...edges);
    hi = Math.max(...edges);
    const pad = (hi - lo) / 2 || Math.abs(lo) / 2 || 1;
    const open = (side: "from" | "to") => hi === lo || bands.some((b) => b[side] === null);
    if (open("from")) lo -= pad;
    if (open("to")) hi += pad;
  }
  lo = o.min ?? lo;
  hi = o.max ?? hi;
  return hi > lo ? [lo, hi] : [lo, lo + 1]; // a min at or over the max: still an arc
}

/** How far along the arc a value is, 0 (its left end) to 1; one off either end stays there. */
export function along(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** Each band's part of the arc, in the record's order (where two overlap the later one
 * counts, and is drawn over the earlier); those wholly off the arc are left out. */
export function arcs(bands: readonly Band[], ends: readonly [number, number]): { from: number; to: number; level: Level }[] {
  return bands.map((b) => ({ from: along(b.from ?? ends[0], ends), to: along(b.to ?? ends[1], ends), level: b.level })).filter((a) => a.to > a.from);
}

// The half circle, in the SVG's own units: its centre, and the middle of its stroke.
export const DIAL = { cx: 100, cy: 100, r: 80 };

/** The SVG path of the half circle from `from` to `to` of the way along it (left to right,
 * over the top). */
export function arcPath(from: number, to: number): string {
  const at = (f: number) => {
    const a = Math.PI * (1 - f);
    return `${(DIAL.cx + DIAL.r * Math.cos(a)).toFixed(1)} ${(DIAL.cy - DIAL.r * Math.sin(a)).toFixed(1)}`;
  };
  return `M ${at(from)} A ${DIAL.r} ${DIAL.r} 0 0 1 ${at(to)}`;
}

/** A number for a label: no more than four figures, and none of floating point's dust. */
export const tidy = (n: number) => String(Number(n.toPrecision(4)));

/** A time as a lapsed claim says it: "14:02", with the day once it's another one. */
export function clock(at: number, now: number): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return new Date(now).toDateString() === d.toDateString() ? time : `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${time}`;
}
