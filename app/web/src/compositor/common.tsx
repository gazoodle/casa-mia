import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import css from "../firmware.module.css";
import pipe from "../pipeline.module.css";
import ui from "../ui.module.css";

export const { get, post } = api("compositor");

export const POLL_MS = 2000;

/** A place drawn from a channel: a picture's tile (its panel) or main area, its size, and
 * how much the channel's picture is enlarged to fill it (above 1: softer). */
export type Use = { picture: string; place: string; width: number; height: number; enlarged: number | null };

export type State = "live" | "snapshots" | "starting" | "sitting out" | "stopped";

/** One channel of a camera (low, medium, high), as the gatherer has it. */
export type Channel = {
  camera: string;
  /** The camera it is a channel of. */
  of: string;
  title: string;
  channel: string;
  state: State;
  /** Still "(Waiting …)": no picture has come yet. */
  waiting: boolean;
  source: "stream" | "snapshot";
  fps: number | null;
  /** Its stream's decoding: its share of a CPU (%), keyframes only or every frame, and
   * its keyframe interval (s). */
  cpu_pct: number | null;
  decoding: "keyframes" | "every frame" | null;
  gop_s: number | null;
  /** Its own pace: the slower of the gatherer's and its fastest user's (s). */
  pace_s: number | null;
  no_stream: string | null;
  width: number;
  height: number;
  size_from: "stream" | "still" | null;
  /** The picture held now (a frame, a snapshot): its own size. */
  picture: [number, number] | null;
  age_s: number | null;
  fetch_ms: number | null;
  missed: number;
  back_in_s: number | null;
  wanted_by: string[];
  /** Its last few surveys, newest first. */
  surveys: SurveyRecord[];
  uses: Use[];
};

/** One survey of a channel: when (epoch s), what came of it, why not its stream, how
 * long it took, and the size it gave. */
export type SurveyRecord = {
  at: number;
  outcome: "stream" | "snapshot" | "read" | "nothing";
  why: string;
  took_s: number;
  cpu_ms?: number;
  size: [number, number] | null;
};

/** The survey: a pass over every channel of every camera (its stream's first frame, or a
 * snapshot), then a sleep at its pace. */
export type Survey = {
  running: boolean;
  done: number;
  of: number;
  pace: number;
  at_once: number;
  took_s?: number;
  cpu_s?: number;
  next_in: number | null;
};

/** The cache, counted: its pictures (the cameras' and the composites'), the channels still
 * waiting, the thumbnails, and the memory it takes. */
export type Cache = { pictures: number; cameras: number; waiting: number; composites: number; thumbnails: number; bytes: number };

/** The whole compositor system, a sample every few seconds: CPU as shares of the whole
 * box (%: gathering, composing, the app in all), bytes sent a second (as bits),
 * memory (bytes: the app's, the cache's, the box's; null where the box does not say),
 * and where viewers wait: the streams open, the share of their time writes waited for
 * the network (%), the share of the time the busier compositor spent drawing (%),
 * pictures a second sent and skipped (drawn for a stream still sending the one before),
 * and the average picture sent (kB; null when none was). */
export type Sample = {
  t: number;
  gather: number;
  compose: number;
  app: number;
  out_bps: number;
  streams: number;
  waiting: number;
  drawing: number;
  sent_fps: number;
  skipped_fps: number;
  kb_picture: number | null;
  cache: number;
  rss: number | null;
  total: number | null;
  free: number | null;
};

/** The app's verdict on the whole system, judged on the last 30 s: a state to automate
 * on (go2rtc_down, streams_failing, paused, cpu_gathering, cpu_drawing, drawing_behind,
 * network, idle, fine), and in words. */
export type Verdict = { state: string; tone: "good" | "warn" | "bad"; headline: string; advice: string };

export type Monitor = { cpus: number; every_s: number; history: Sample[] };

export type Gatherer = {
  /** The whole app's share of a CPU (%), since the last look. */
  cpu_pct: number;
  /** The oldest a picture may be for its stream to decode keyframes only (s; 0: off). */
  freshness: number;
  /** The whole system's switches: live_main, cards may play the main camera live. */
  flags: { live_main: boolean };
  cache: Cache;
  health: Verdict;
  monitor: Monitor;
  paused: boolean;
  gathering: boolean;
  pace: number;
  go2rtc: boolean | null;
  streams_read: number;
  survey: Survey;
  channels: Channel[];
};

export type Picture = {
  key: string;
  commander: string;
  width: number;
  height: number;
  scale: number;
  asked: boolean;
  age_s: number;
  streams: number;
  kb: number;
  draw_ms: number;
};

/** An open stream: what it sent, and pictures a second it sent (its viewer saw) against
 * those drawn for it (the rest were drawn while it was still sending); the card's version
 * and its name for the stream ("" from an older card, or anything else). */
export type Sending = { picture: string; viewer: string; open_s: number; frames: number; kb_frame: number; kbit_s: number; waiting_pct: number; fps: number; drawn_fps: number; card: string; sid: string };

export type Engine = {
  state: string;
  port: number;
  drawing?: boolean;
  generator_paused?: boolean;
  /** Seconds between its drawings. */
  pace?: number;
  server_paused?: boolean;
  error?: string | null;
  needs?: string | null;
  stale_s?: number;
  pictures?: Picture[];
  devices?: Record<string, number>;
  sending?: Sending[];
  /** Its size test page on the LAN (the box's address known), for a new window. */
  size_test?: string | null;
};

export type Status = { gatherer: Gatherer; live: Engine; draft: Engine | null };

export const ENGINES = [
  ["live", "Live", "The dashboards and the wall tablets (Camera Commander cards)."],
  ["draft", "Preview", "The Camera Dashboard page's previews, and cards with Show the draft."],
] as const;

export type Act = (path: string, done: string, body?: unknown) => Promise<boolean>;

/** Pause or run one stage. */
export function PauseButton({ paused, path, name, busy, act }: { paused: boolean; path: string; name: string; busy: boolean; act: Act }) {
  return (
    <button
      className={paused ? ui.primary : ui.button}
      disabled={busy}
      onClick={() => act(`${path}/${paused ? "run" : "pause"}`, `${name} ${paused ? "running" : "paused"}`)}
    >
      {paused ? "Run" : "Pause"}
    </button>
  );
}

export const gb = (bytes: number) => `${(bytes / 1e9).toFixed(1)} GB`;

/** 850 kbit/s, 12.3 Mbit/s */
export const bits = (bps: number) => (bps < 1e6 ? `${Math.round(bps / 1000)} kbit/s` : `${(bps / 1e6).toFixed(1)} Mbit/s`);

/** The paces to choose from, seconds between: the gatherer's down to continuous (0), a
 * generator's down to 8 a second. */
export const GATHER_STEPS = [0, 0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 15];

export const DRAW_STEPS = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 15];

export const SURVEY_STEPS = [10, 15, 30, 60, 120, 300, 600, 1800, 3600];

/** 0: continuous; 0.25: 4 a second; 2: every 2 s. */
export function paceText(seconds: number): string {
  if (seconds === 0) return "continuous";
  if (seconds < 1) return `${Math.round(1 / seconds)} a second`;
  return seconds < 60 ? `every ${seconds} s` : `every ${seconds / 60} min`;
}

/** A pace, set on the box a moment after the slider stops moving. */
export function PaceSlider({
  which,
  label = "Pace",
  value,
  steps,
  text = paceText,
  act,
}: {
  which: string;
  label?: string;
  value: number;
  steps: number[];
  /** The readout of a step (a pace by default). */
  text?: (step: number) => string;
  act: Act;
}) {
  const [held, setHeld] = useState<number>(); // the step under the finger, until set
  const sent = useRef<number>(undefined); // the step last sent
  const nearest = steps.reduce((best, s, i) => (Math.abs(s - value) < Math.abs(steps[best] - value) ? i : best), 0);
  // Held until the box says the new pace (the page's refresh would snap it back).
  useEffect(() => {
    if (held != null && steps[held] === value) setHeld(undefined);
  }, [value, held, steps]);
  const at = held ?? nearest;
  /** Sent on release only: a finger lifted, a pointer let go, an arrow key let go. */
  const release = () => {
    if (held == null || steps[held] === value || sent.current === held) return;
    sent.current = held;
    act("pace", `${label}: ${text(steps[held])}`, { which, seconds: steps[held] }).then((done) => {
      if (!done) setHeld(undefined); // refused: back to what the box has
    });
  };
  return (
    <label className={pipe.pace}>
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={at}
        onChange={(e) => {
          sent.current = undefined;
          setHeld(Number(e.target.value));
        }}
        onPointerUp={release}
        onKeyUp={release}
        onBlur={release}
      />
      <strong>{text(steps[at])}</strong>
    </label>
  );
}

export function StateBadge({ state }: { state: State }) {
  return <span className={`${pipe.state} ${pipe[state.replace(" ", "_")] ?? ""}`}>{state}</span>;
}

/** Each heading a label, or a label and its hover text. */
export function Table({ head, children }: { head: (string | [string, string])[]; children: React.ReactNode }) {
  return (
    <div className={css.listing}>
      <table>
        <thead>
          <tr>
            {head.map((h) => {
              const [label, tip] = typeof h === "string" ? [h] : h;
              return (
                <th key={label} title={tip}>
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Who wants a channel: a compositor, by the store it serves. */
export const owner = (store: string) => (store.includes("live") ? "Live" : "Preview");

export const plural = (n: number, what: string) => `${n} ${what}${n === 1 ? "" : "s"}`;

/** 12.3 MB */
export const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** 40 ms, 1.2 s */
export const ms = (n: number) => (n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`);

/** 3.2 s, 4 min 10 s */
export function seconds(s: number): string {
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${Math.round(s % 60)} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
