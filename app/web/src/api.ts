/** The modules' admin APIs (/api/<module>/). Relative URLs: they resolve against
 * <base href> (ingress). */

export class ApiError extends Error {}

async function send<T>(module: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`api/${module}/${path}`, {
    method,
    cache: "no-store",
    // A file (a photo) goes as it is; anything else as JSON.
    headers: body === undefined || body instanceof Blob ? undefined : { "Content-Type": "application/json" },
    body: body === undefined || body instanceof Blob ? body : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error ?? `The app answered ${response.status}.`);
  return data as T;
}

export function api(module: string) {
  return {
    get: <T>(path: string) => send<T>(module, "GET", path),
    post: <T>(path: string, body?: unknown) => send<T>(module, "POST", path, body ?? {}),
    put: <T>(path: string, body: unknown) => send<T>(module, "PUT", path, body),
    del: <T>(path: string) => send<T>(module, "DELETE", path),
  };
}

/** Guest login's API. */
export const { get, post, put, del } = api("guest");

/** How a page frames the house photo: zoom (1 = cover) and the point it centres on, in %. */
export type Frame = { zoom: number; x: number; y: number };

export type HeaderView = { house: string; custom: boolean; stamp: number; home: Frame; welcome: Frame };

export type Person = {
  id: string;
  name: string;
  /** +447700900123 */
  phone: string;
  call: boolean;
  text: boolean;
  /** HA person id, if linked. */
  person: string | null;
};

export type PeopleView = { people: Person[]; error: string | null };

export type HAPerson = { id: string; name: string; user_id: string | null };

export type NumberCheck = { allowed: boolean; number: string | null; who: string | null; reason: string | null };

export type FirmwareFile = { name: string; size: number; modified: string };

export type FirmwareStatus = {
  state?: string;
  latest: string | null;
  last_check: string | null;
  error: string | null;
  checking: boolean;
  downloading: boolean;
  downloaded_percent: number | null;
  total_bytes: number | null;
  url: string;
  keep: number;
  max_keep: number;
  files: FirmwareFile[];
};

export type Login = {
  name: string;
  username: string;
  user_id: string | null;
  display: string | null;
  endpoints: number;
};

export type Endpoint = {
  id: string;
  label: string;
  dashboard: string;
  type: "guest" | "engineer";
  account: string | null;
  slug: string | null;
  legacy: boolean;
  title: string | null;
  message: string | null;
  delay: number | null;
  /** Show the house info (Wi-Fi, house rules) and wait for Continue. */
  info: boolean;
  /** Closing it signs out everyone its login let in. */
  end_sessions: boolean;
  /** Closing it gives it a new secret address. */
  rotate: boolean;
  enabled?: boolean;
  until?: number | null;
  logins?: number;
  last_login?: string | null;
  url: string;
};

export type GuestConfig = {
  logins: Login[];
  default_login: string;
  welcome: { title: string; message: string; delay: number };
  qr_host: string;
  qr_host_effective: string;
  house_info: HouseInfo;
  goodbye: { title: string; message: string; url: string };
  wifi: Wifi;
  /** Every name the box answers to (QR host, LAN IP, .local name). */
  hosts: string[];
  port: number;
  endpoints: Endpoint[];
};

export type HAUser = { id: string; name: string; username: string | null; is_admin: boolean; is_active: boolean };
export type HADashboard = { path: string; dashboard: string; view: string };
export type Wifi = { ssid: string; password: string; security: "WPA" | "WEP" | "nopass"; hidden: boolean };
/** The house rules, shown before signing in by endpoints with `info` on. */
export type HouseInfo = { text: string };
/** What one login's Home Assistant user can get to (GET api/guest/reach). */
export type Reach = {
  name: string;
  user: { name: string | null; is_admin: boolean; local_only: boolean; found: boolean };
  endpoints: { id: string; label: string }[];
  dashboards: {
    /** None: the default dashboard (Overview), which can't be made admin-only. */
    id: string | null;
    url_path: string | null;
    editable: boolean;
    title: string;
    path: string;
    sidebar: boolean;
    landing: string[];
    hides_header: boolean;
    hides_sidebar: boolean;
    views: { title: string; path: string; tab: boolean }[];
  }[];
  flags: { level: "bad" | "warn" | "note"; text: string; fix?: ReachFix }[];
};
/** A fix the app can make for a reach flag: sent back as it came (POST reach/fix). */
export type ReachFix = { action: string; label?: string; login?: string; dashboard?: string | null; dashboard_id?: string };
export type HAChoices = { users: HAUser[]; dashboards: HADashboard[]; error: string | null };

export type Kiosk = {
  id: string;
  name: string;
  address: string;
  ip: string | null;
  version: string | null;
  /** Leads a fleet (several kiosks can each lead their own). */
  leader: boolean;
  /** The kiosk it follows, if any: Kiosk Satellite gives the leader's name here. */
  follows: string | null;
  model: string;
  battery: number | null;
  charging: boolean | null;
  rssi: number | null;
  online: boolean;
  last_seen: string | null;
  source: string;
  logged_in: boolean;
  behind: boolean;
  lan_url: string | null;
  /** How many backups of the chosen kind the app keeps for it, and the newest's time. */
  backups: number;
  last_backup: string | null;
  /** When its backup was last checked, and why the last check failed (if it did). */
  checked: string | null;
  backup_error: string | null;
};

/** One kept backup; `changes` are the keys that differ from the one before (null for the oldest). */
export type KioskBackup = { name: string; kind: KioskKind; at: string; size: number; changes: string[] | null };

export type KioskKind = "settings" | "config";

export type KiosksView = {
  kiosks: Kiosk[];
  addresses: string[];
  latest: string | null;
  /** The firmware server's address for the tablets; null when it is off. */
  firmware_url: string | null;
  last_scan: string | null;
  ha_error: string | null;
  kinds: Record<KioskKind, string>;
  backup: { kind: KioskKind; keep: number; every_hours: number };
  max_keep: number;
  every_hours: number[];
  results?: Record<string, string>;
  /** The last Run everywhere: its command, and each kiosk's result as it came. */
  everywhere: EverywhereRun | null;
};

export type EverywhereRun = {
  command: string;
  started: string;
  running: boolean;
  total: number;
  results: { name: string; ok: boolean; error: string | null }[];
};
