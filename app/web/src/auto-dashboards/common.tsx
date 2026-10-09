import { api } from "../api";
import { DashboardIcon } from "../icons";
import type { Camera, HAEntity } from "../cameras";
import type { Commander } from "../commander";

export { Entities, THUMB_EVERY_MS, ThumbRound, plural } from "../cameras";
export type { Camera } from "../cameras";
export const { get, post, put } = api("auto-dashboards");

export const HEAD = {
  icon: <DashboardIcon />,
  title: "Auto Dashboards",
  module: "auto_dashboards",
  blurb: "Dashboards made for you: today the camera dashboard, from the cameras and the commanders, previewed and deployed.",
};

export type Store = {
  dashboard: string;
  title: string;
  home: string;
  help: string;
  nav_style: "badges" | "tiles";
  theme: string;
  placeholder: string;
  portrait_query: string;
  phone_query: string;
  wall_users: string[];
  live_card: string;
  hi_live_card: string;
  /** Each camera's live card on its page, where not the dashboard's own. */
  live_cards: Record<string, string>;
  /** The pictures' address, the cameras and the commanders: copies of their pages'. */
  compositor_host: string;
  cameras: Record<string, Camera>;
  /** In order: the dashboard's first pages. Always at least one. */
  commanders: Commander[];
};

export type View = {
  store: Store;
  problems: string[];
  error: string | null;
  changed: boolean;
  deployed: string | null;
  preview_dashboard: string;
  /** When the preview dashboard was last deployed; null when there is none. */
  previewed: string | null;
  /** When the config the last preview deploy replaced was kept; null when none is. */
  preview_backup: string | null;
  /** How many older versions of the live dashboard are kept, and the most it can be. */
  keep: number;
  max_keep: number;
  compositor: { live: boolean; host: string | null };
};

/** The live cards a camera's page can use. */
export const CARDS: [string, string][] = [
  ["picture-entity", "Picture entity (built in)"],
  ["webrtc-camera", "WebRTC camera (custom)"],
  ["advanced-camera-card", "Advanced camera card (custom)"],
];

export type HAUser = { id: string; name: string; is_active: boolean };

export type HA = {
  users?: HAUser[];
  entities?: HAEntity[];
  /** What the saved draft needs that Home Assistant seems to lack. */
  warnings?: string[];
  error: string | null;
};

export type Backup = { name: string; url_path: string; saved: string };
