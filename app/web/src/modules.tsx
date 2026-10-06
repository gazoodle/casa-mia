/** What the admin panel knows about each module: its name, the option that switches it
 * on, a line about it, and which facts from its /health to show on its tile. A module the
 * app reports but this list lacks still gets a plain tile. */

import type { ReactNode } from "react";
import type { ModuleHealth } from "./health";
import { ago, megabytes } from "./format";
import { CameraGridIcon, CameraIcon, FirmwareIcon, GuestIcon, KioskModeIcon, PeopleIcon, PhoneIcon, ShieldIcon, TabletIcon } from "./icons";

export type Fact = [label: string, value: string | undefined];

export type ModuleInfo = {
  title: string;
  /** The app option (Configuration tab) that switches it on. */
  option: string;
  blurb: string;
  icon: ReactNode;
  facts: (h: ModuleHealth) => Fact[];
  /** 0-100 while something is in progress, else undefined. */
  progress?: (h: ModuleHealth) => number | undefined;
};

type Endpoint = { enabled?: boolean; logins?: number; last_login?: string | null };

const SIGNAL: Record<string, string> = { excellent: "excellent", good: "good", ok: "OK", bad: "bad", terrible: "terrible" };

/** "3 min ago · Alex (+447700900123)" */
function last(at: unknown, from: unknown): string {
  const when = ago(at);
  return when ? `${when} · ${from ?? "?"}` : "none since start";
}

export const MODULES: Record<string, ModuleInfo> = {
  alarm: {
    title: "Alarm panel",
    option: "Alarm panel",
    blurb: "The intruder alarm as a Home Assistant alarm panel: arm away, disarm, triggered.",
    icon: <ShieldIcon />,
    facts: () => [
      ["Runs in", "the integration, so it stays up while the app restarts"],
      ["Code", "set in the integration's options"],
    ],
  },
  fona: {
    title: "Phone and SMS",
    option: "Phone and SMS (FONA)",
    blurb: "Calls and texts through the FONA GSM module: a way in that needs no internet.",
    icon: <PhoneIcon />,
    facts: (h) => [
      ["Signal", h.rssi_dbm != null ? `${h.rssi_dbm} dBm${h.signal ? `, ${SIGNAL[h.signal as string]}` : ""}` : "not read yet"],
      ["Last call", last(h.last_call, h.last_call_from)],
      ["Last text", last(h.last_text, h.last_text_from)],
    ],
  },
  people: {
    title: "People",
    option: "People",
    blurb: "Who is known to the home.",
    icon: <PeopleIcon />,
    facts: (h) => [
      ["People", String(h.people ?? 0)],
      ["May call", String(h.callers ?? 0)],
      ["May text", String(h.texters ?? 0)],
    ],
  },
  gitproxy: {
    title: "Firmware server",
    option: "Serve tablet firmware",
    blurb: "Mirrors the Kiosk Satellite firmware so the wall tablets update without the internet.",
    icon: <FirmwareIcon />,
    facts: (h) => [
      ["Latest", (h.latest as string | null) ?? "none yet"],
      ["GitHub check", ago(h.last_check) ?? "not yet"],
      [
        "Tablet check",
        h.last_tablet_check ? `${ago(h.last_tablet_check)} (${h.last_tablet})` : "none since start",
      ],
      [
        "Download",
        h.downloading
          ? `${h.downloaded_percent ?? 0}% of ${megabytes(h.total_bytes) ?? "?"}`
          : undefined,
      ],
    ],
    progress: (h) => (h.downloading ? Number(h.downloaded_percent ?? 0) : undefined),
  },
  kiosks: {
    title: "Kiosk Satellites",
    option: "Kiosk Satellites",
    blurb: "The wall tablets: their versions, kept backups of their setup, and their admin pages from anywhere.",
    icon: <TabletIcon />,
    facts: (h) => [
      ["Kiosks", `${h.kiosks ?? 0} (${h.online ?? 0} online)`],
      ["Behind latest", h.latest ? `${h.behind ?? 0} (latest ${h.latest})` : undefined],
      ["Need login", h.need_login ? String(h.need_login) : undefined],
      ["Backed up", h.kiosks ? `${h.backed_up ?? 0} of ${h.kiosks}` : undefined],
      ["Last look", ago(h.last_scan) ?? "not yet"],
    ],
  },
  compositor: {
    title: "Camera compositor",
    option: "Compose camera groups",
    blurb: "Draws the Camera Commander as one live picture for the dashboards and wall tablets.",
    icon: <CameraGridIcon />,
    facts: (h) => [
      ["Cameras", String(h.cameras ?? 0)],
      ["Live streams", String(h.streams ?? 0)],
      ["Needs", (h.needs as string | null) ?? undefined],
    ],
  },
  camera_dashboard: {
    title: "Camera Dashboard",
    option: "Camera Dashboard",
    blurb: "Sets up the cameras, the Camera Commander and the camera dashboard, with previews, and deploys it.",
    icon: <CameraIcon />,
    facts: (h) => [
      ["Cameras", String(h.cameras ?? 0)],
      ["Deployed", ago(h.deployed) ?? "never"],
      ["Draft", h.changed ? "differs from live" : "same as live"],
    ],
  },
  kiosk_mode: {
    title: "Kiosk mode",
    option: "Kiosk mode",
    blurb: "What each dashboard hides, and from whom: the header, sidebar and more, through kiosk-mode.",
    icon: <KioskModeIcon />,
    facts: (h) => [
      ["kiosk-mode", h.installed ? "installed" : h.state === "unconfigured" ? "not found" : undefined],
      ["Dashboards", h.dashboards != null ? String(h.dashboards) : undefined],
      ["On", (h.names as string[] | undefined)?.join(", ") || undefined],
    ],
  },
  guest_login: {
    title: "Guest login",
    option: "Guest login",
    blurb: "QR codes that sign guests and engineers straight into their own dashboard.",
    icon: <GuestIcon />,
    facts: (h) => {
      const endpoints = Object.values((h.endpoints ?? {}) as Record<string, Endpoint>);
      const open = endpoints.filter((e) => e.enabled).length;
      const logins = endpoints.reduce((sum, e) => sum + (e.logins ?? 0), 0);
      const last = endpoints
        .map((e) => e.last_login ?? "")
        .sort()
        .at(-1);
      return [
        ["Open", `${open} of ${endpoints.length}`],
        ["Logins", String(logins)],
        ["Last login", ago(last) ?? "none yet"],
      ];
    },
  },
};
