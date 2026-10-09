/** Run everywhere: Kiosk Satellite's own Quick controls (its Overview's buttons, with its
 * words, icons and colours), each sent by the app to every tablet it is logged in to, one
 * after the other. The tiles that turn over on a tablet (Screen off / on, Start / Dismiss
 * screensaver) are both here, as a button cannot know every tablet's state; Show camera
 * view (it asks which view) and Take snapshot (one tablet's picture) are left to each
 * tablet's own page. */

import { useEffect } from "react";
import type { EverywhereRun } from "./api";
import { ago } from "./format";
import css from "./kiosks.module.css";

// Kiosk Satellite's icon discs: its four accents (light theme).
const DISC = { d1: "#56814f", d2: "#44686c", d3: "#9c742a", d4: "#a9501f" };

type Control = { command: string; label: string; disc: keyof typeof DISC; icon: string; confirm?: string };

// Each icon's SVG contents, as Kiosk Satellite draws them (24 grid, stroked, round ends).
const CONTROLS: Control[] = [
  { command: "reload", label: "Reload page", disc: "d1", icon: '<path d="M21 4v6h-6"/><path d="M20.5 15a9 9 0 1 1-2.1-9.4L21 10"/>' },
  { command: "clearWebCache", label: "Clear cache", disc: "d2", icon: '<path d="M4 7h16M9.5 7V4h5v3M6.5 7l1 13.5h9l1-13.5"/><path d="M10 11v6M14 11v6"/>' },
  { command: "screenOff", label: "Screen off", disc: "d3", icon: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M4 20 20 4"/>' },
  {
    command: "screenOn",
    label: "Screen on",
    disc: "d3",
    icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/>',
  },
  { command: "startScreensaver", label: "Start screensaver", disc: "d4", icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' },
  { command: "stopScreensaver", label: "Dismiss screensaver", disc: "d4", icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/><path d="M4 20 20 4"/>' },
  { command: "hideCameraView", label: "Dismiss camera view", disc: "d2", icon: '<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="m15.5 10.5 5.5-3v9l-5.5-3"/><path d="M4 20 20 4"/>' },
  { command: "postponeScreensaver", label: "Postpone screensaver", disc: "d3", icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
  { command: "checkUpdateNow", label: "Check for updates", disc: "d1", icon: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>' },
  {
    command: "restartApp",
    label: "Restart app",
    disc: "d3",
    icon: '<path d="M12 3v8"/><path d="M6.3 6.6a8 8 0 1 0 11.4 0"/>',
    confirm: "Restart Kiosk Satellite on every tablet?",
  },
  {
    command: "rebootDevice",
    label: "Restart device",
    disc: "d4",
    icon: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v4.5h-4.5"/><path d="M12 8v4.5l3 1.8"/>',
    confirm: "Restart every tablet? Kiosk Satellite comes back when each one boots.",
  },
];

const label = (command: string) => CONTROLS.find((c) => c.command === command)?.label ?? command;

export function Everywhere({
  run,
  tablets,
  onRun,
  reload,
}: {
  run: EverywhereRun | null;
  /** The tablets the app is logged in to: the ones a run reaches. */
  tablets: number;
  onRun: (command: string) => void;
  /** Ask for the view again: each second while a run is going. */
  reload: () => void;
}) {
  useEffect(() => {
    if (!run?.running) return;
    const timer = setInterval(reload, 1000);
    return () => clearInterval(timer);
  }, [run?.running, reload]);
  const press = (c: Control) => {
    if (c.confirm && !confirm(c.confirm)) return;
    onRun(c.command);
  };
  return (
    <>
      <div className={css.tiles}>
        {CONTROLS.map((c) => (
          <button key={c.command} className={css.tile} disabled={!tablets || !!run?.running} onClick={() => press(c)}>
            <span className={css.disc} style={{ background: DISC[c.disc] }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: c.icon }}
              />
            </span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      {run && (
        <div className={css.run}>
          <strong>
            {label(run.command)}: {run.results.filter((r) => r.ok).length} of {run.total} done
            {run.running ? ", running…" : ""}
          </strong>{" "}
          <span className={css.runWhen}>started {ago(run.started)}</span>
          <ul>
            {run.results.map((r) => (
              <li key={r.name} className={r.ok ? undefined : css.runFailed}>
                {r.ok ? "✓" : "✗"} {r.name}
                {r.error && `: ${r.error}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className={css.credit}>
        These buttons, their words and icons are Kiosk Satellite's own Quick controls, by Xavier Larrea (
        <a href="https://kiosksatellite.com" target="_blank" rel="noopener noreferrer">
          kiosksatellite.com
        </a>
        ), sent here to every tablet in turn.
      </p>
    </>
  );
}
