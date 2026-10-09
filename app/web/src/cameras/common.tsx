/** The cameras: the house's cameras as a source of data for the rest of Casa Mia (the
 * commanders, the dashboard). Their types, API and the contexts their fields share. */

import { createContext } from "react";
import { api } from "../api";
import { CameraIcon } from "../icons";

export const { get, put } = api("cameras");

export const HEAD = {
  icon: <CameraIcon />,
  title: "Cameras",
  module: "cameras",
  blurb: "The house's cameras: their names, streams and controls, for the commanders and the dashboard.",
};

export type Control = { entity: string; name?: string; icon?: string };

export type Preset = string | { preset: string; label?: string };

export type Ptz = { action: string; data: Record<string, string>; presets: Preset[] };

export type Camera = {
  title: string;
  medium?: string;
  high?: string;
  zoom?: string;
  live?: string;
  ptz?: Ptz;
  controls?: Control[];
};

export type Cameras = Record<string, Camera>;

export type HACamera = { entity: string; name: string; device_id: string | null; medium?: string; high?: string; zoom?: string };

export type HAEntity = { entity: string; name: string; state?: string };

/** What the Cameras page asks Home Assistant for. */
export type HA = {
  cameras?: HACamera[];
  entities?: HAEntity[];
  /** Each camera's motion sensor (for the commanders' Track motion), where it has one. */
  motion?: Record<string, string>;
  error: string | null;
};

export const CARDS: [string, string][] = [
  ["picture-entity", "Picture entity (built in)"],
  ["webrtc-camera", "WebRTC camera (custom)"],
  ["advanced-camera-card", "Advanced camera card (custom)"],
];

/** How often the camera thumbnails are fetched again. */
export const THUMB_EVERY_MS = 5 * 60_000;

/** Which round of thumbnails to show: bumped every THUMB_EVERY_MS. */
export const ThumbRound = createContext(0);

/** Home Assistant's entities, for the entity fields. */
export const Entities = createContext<HAEntity[]>([]);

export const DEFAULT_PTZ: Ptz = { action: "unifiprotect.ptz_goto_preset", data: {}, presets: [] };

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
