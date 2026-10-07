/** Camera compositor: its pipeline, as it runs now, polled while open. Gatherer (every
 * camera channel: its state, size, source and who wants it) → cache (each picture kept,
 * with a thumbnail; click for a live preview) → generators (live and preview: the
 * pictures drawn) → servers (live and preview: who is watching, and how fast it goes).
 * Each stage pauses and runs on its own; the cache purges whole or a picture at a time;
 * Restart restarts both engines. */

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { BinIcon, CameraGridIcon } from "./icons";
import { AreaHead, Empty, Shell } from "./page";
import { Graphlet } from "./Graphlet";
import { LiveView } from "./LiveView";
import { Dialog, Segmented, Toasts, type Toast } from "./ui";
import css from "./firmware.module.css";
import guest from "./guest.module.css";
import pipe from "./pipeline.module.css";
import ui from "./ui.module.css";

const { get, post } = api("compositor");
const POLL_MS = 2000;

/** A place drawn from a channel: a picture's tile (its panel) or main area, its size, and
 * how much the channel's picture is enlarged to fill it (above 1: softer). */
type Use = { picture: string; place: string; width: number; height: number; enlarged: number | null };
type State = "live" | "snapshots" | "starting" | "sitting out" | "stopped";
/** One channel of a camera (low, medium, high), as the gatherer has it. */
type Channel = {
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
type SurveyRecord = {
  at: number;
  outcome: "stream" | "snapshot" | "read" | "nothing";
  why: string;
  took_s: number;
  cpu_ms?: number;
  size: [number, number] | null;
};
/** The survey: a pass over every channel of every camera (its stream's first frame, or a
 * snapshot), then a sleep at its pace. */
type Survey = {
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
type Cache = { pictures: number; cameras: number; waiting: number; composites: number; thumbnails: number; bytes: number };
/** The whole compositor system, a sample every few seconds: CPU as shares of the whole
 * box (%: gathering, composing, the app in all), bytes sent a second (as bits), and
 * memory (bytes: the app's, the cache's, the box's; null where the box does not say). */
type Sample = {
  t: number;
  gather: number;
  compose: number;
  app: number;
  out_bps: number;
  cache: number;
  rss: number | null;
  total: number | null;
  free: number | null;
};
type Monitor = { cpus: number; every_s: number; history: Sample[] };
type Gatherer = {
  /** The whole app's share of a CPU (%), since the last look. */
  cpu_pct: number;
  /** The oldest a picture may be for its stream to decode keyframes only (s; 0: off). */
  freshness: number;
  cache: Cache;
  monitor: Monitor;
  paused: boolean;
  gathering: boolean;
  pace: number;
  go2rtc: boolean | null;
  streams_read: number;
  survey: Survey;
  channels: Channel[];
};
type Picture = {
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
type Sending = { picture: string; viewer: string; open_s: number; frames: number; kb_frame: number; kbit_s: number; waiting_pct: number };
type Engine = {
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
type Status = { gatherer: Gatherer; live: Engine; draft: Engine | null };

const ENGINES = [
  ["live", "Live", "The dashboards and the wall tablets (Camera Commander cards)."],
  ["draft", "Preview", "The Camera Dashboard page's previews, and cards with Show the draft."],
] as const;

export function CompositorPage({ state }: { state?: string }) {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<string>(); // the cache item previewed, by id
  const [live, setLive] = useState<Channel>(); // the channel in a live view
  const [surveys, setSurveys] = useState<string>(); // the channel whose surveys show
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);
  useEffect(() => {
    if (state !== "running" && state !== "unconfigured") return;
    const load = () =>
      get<Status>("").then(
        (s) => (setStatus(s), setError(undefined)),
        (e) => setError((e as Error).message),
      );
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [state]);

  /** A control, then the status it answers with. */
  const act = async (path: string, done: string, body?: unknown) => {
    setBusy(true);
    try {
      setStatus(await post<Status>(path, body));
      toast(done);
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  };
  const g = status?.gatherer;
  const items = status ? cacheItems(status, act) : [];
  const preview = items.find((i) => i.id === shown);

  return (
    <Shell
      icon={<CameraGridIcon />}
      title="Camera compositor"
      blurb={`Its pipeline as it runs now, refreshed every ${POLL_MS / 1000} s: gatherer, cache, generators, servers.`}
      state={state}
      action={
        <button
          className={ui.button}
          disabled={busy || !status}
          title="Stop both engines (live and preview) and start them again: settings re-read, every picture and stream gone"
          onClick={() =>
            confirm("Restart the camera compositor? Every picture on screen stops for a moment.") && act("restart", "Restarted")
          }
        >
          Restart
        </button>
      }
    >
      {error && <p className={guest.empty}>{error}</p>}
      {!status && !error && <Empty>Loading…</Empty>}
      {status && g && (
        <>
          <Graphs m={g.monitor} />
          <Strip status={status} busy={busy} act={act} />
          <GathererArea g={g} busy={busy} act={act} onLive={setLive} onSurveys={setSurveys} />
          <CacheArea items={items} cache={g.cache} stale={status.live.stale_s ?? 30} busy={busy} act={act} onShow={setShown} />
          {ENGINES.map(([key, name, blurb]) => {
            const e = status[key];
            return (
              e && <GeneratorArea key={key} which={key} name={name} blurb={blurb} e={e} busy={busy} act={act} onShow={setShown} />
            );
          })}
          {ENGINES.map(([key, name]) => {
            const e = status[key];
            return e && <ServerArea key={key} which={key} name={name} e={e} busy={busy} act={act} />;
          })}
        </>
      )}
      {preview && <Preview item={preview} onClose={() => setShown(undefined)} />}
      {surveys && g && <Surveys c={g.channels.find((c) => c.camera === surveys)} onClose={() => setSurveys(undefined)} />}
      {live && <LiveView entity={live.of} title={live.title} initial={live.camera} onClose={() => setLive(undefined)} />}
      <Toasts toasts={toasts} />
    </Shell>
  );
}

type Act = (path: string, done: string, body?: unknown) => void;

/** Pause or run one stage. */
function PauseButton({ paused, path, name, busy, act }: { paused: boolean; path: string; name: string; busy: boolean; act: Act }) {
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

/** The four stages in a row: each one's state at a glance, with its pause or run. */
function Strip({ status, busy, act }: { status: Status; busy: boolean; act: Act }) {
  const g = status.gatherer;
  const fetching = g.channels.filter((c) => c.state !== "stopped").length;
  const engines = ENGINES.flatMap(([key, name]) => (status[key] ? [[key, name, status[key]!] as const] : []));
  return (
    <div className={pipe.strip}>
      <Stage
        name="Gatherer"
        on={!g.paused && g.gathering}
        note={g.paused ? "paused" : g.gathering ? `${plural(fetching, "channel")}, ${plural(g.streams_read, "stream")}` : "nothing wanted"}
      >
        <PauseButton paused={g.paused} path="gatherer" name="Gatherer" busy={busy} act={act} />
      </Stage>
      <Stage name="Cache" on note={`${plural(g.cache.pictures, "picture")} · ${mb(g.cache.bytes)}`}>
        <button className={ui.button} disabled={busy} onClick={() => act("cache/purge", "Cache purged")}>
          Purge
        </button>
      </Stage>
      {engines.map(([key, name, e]) => (
        <Stage key={`g${key}`} name={`${name} generator`} on={!e.generator_paused && !!e.drawing} note={e.generator_paused ? "paused" : e.drawing ? "drawing" : "idle"}>
          <PauseButton paused={!!e.generator_paused} path={`${key}/generator`} name={`${name} generator`} busy={busy} act={act} />
        </Stage>
      ))}
      {engines.map(([key, name, e]) => (
        <Stage
          key={`s${key}`}
          name={`${name} server`}
          on={!e.server_paused && (e.sending?.length ?? 0) > 0}
          note={e.server_paused ? "paused" : plural(e.sending?.length ?? 0, "stream")}
        >
          <PauseButton paused={!!e.server_paused} path={`${key}/server`} name={`${name} server`} busy={busy} act={act} />
        </Stage>
      ))}
    </div>
  );
}

/** The whole compositor system over the last minutes: CPU (gathering and composing),
 * memory (the cache and the rest of the app, against the box), and bytes sent. */
function Graphs({ m }: { m: Monitor }) {
  const h = m.history;
  const now = h[h.length - 1];
  if (!now) return null;
  const total = now.total ?? Math.max(...h.map((x) => x.rss ?? 0)) * 1.25;
  const busiest = Math.max(...h.map((x) => x.out_bps), 100_000);
  const scale = niceCeil(busiest);
  return (
    <div className={pipe.graphs}>
      <Graphlet
        title="CPU"
        value={`${now.app}% of the box (${m.cpus} cores)`}
        tone={now.app > 80 ? "bad" : now.app > 50 ? "warn" : "good"}
        series={[
          { name: "gathering", color: "var(--accent)", values: h.map((x) => x.gather) },
          { name: "composing", color: "var(--warn)", values: h.map((x) => x.compose) },
        ]}
        max={100}
        top="100%"
        bottom="0%"
      />
      <Graphlet
        title="Memory"
        value={`app ${mb(now.rss ?? 0)}${now.free != null ? ` · box ${gb(now.free)} free` : ""}`}
        tone={now.free != null && now.total && now.free / now.total < 0.1 ? "warn" : "good"}
        series={[
          { name: "cache", color: "var(--accent)", values: h.map((x) => x.cache) },
          { name: "rest of the app", color: "var(--warn)", values: h.map((x) => Math.max((x.rss ?? 0) - x.cache, 0)) },
        ]}
        max={total}
        top={gb(total)}
        bottom="0"
      />
      <Graphlet
        title="Network out"
        value={bits(now.out_bps)}
        series={[{ name: "sent", color: "var(--accent)", values: h.map((x) => x.out_bps) }]}
        max={scale}
        top={bits(scale)}
        bottom="0"
      />
    </div>
  );
}

/** A round number at or above n (1, 2 or 5 times a power of ten). */
function niceCeil(n: number): number {
  const p = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 5, 10].map((k) => k * p).find((v) => v >= n) ?? 10 * p;
}

const gb = (bytes: number) => `${(bytes / 1e9).toFixed(1)} GB`;

/** 850 kbit/s, 12.3 Mbit/s */
const bits = (bps: number) => (bps < 1e6 ? `${Math.round(bps / 1000)} kbit/s` : `${(bps / 1e6).toFixed(1)} Mbit/s`);

function Stage({ name, on, note, children }: { name: string; on: boolean; note: string; children: React.ReactNode }) {
  return (
    <div className={pipe.stage}>
      <strong>
        <span className={`${pipe.dot} ${on ? pipe.on : ""}`} aria-hidden="true" />
        {name}
      </strong>
      <span className={pipe.use}>{note}</span>
      {children}
    </div>
  );
}

const TIERS = ["high", "medium", "low"];

/** By camera name, then its channels from high to low. */
const byCamera = (a: Channel, b: Channel) =>
  a.title.localeCompare(b.title) || TIERS.indexOf(a.channel) - TIERS.indexOf(b.channel);

function GathererArea({
  g,
  busy,
  act,
  onLive,
  onSurveys,
}: {
  g: Gatherer;
  busy: boolean;
  act: Act;
  onLive: (c: Channel) => void;
  onSurveys: (camera: string) => void;
}) {
  return (
    <section className={guest.area}>
      <AreaHead
        title="Gatherer"
        blurb={`Each camera channel wanted is fetched on its own, ${paceText(g.pace)}: its stream's frames where Home Assistant's go2rtc carries it (${g.go2rtc ? "reachable" : "not reachable"}), else snapshots. ${g.paused ? "Paused: nothing is fetched." : ""}`}
        action={<PauseButton paused={g.paused} path="gatherer" name="Gatherer" busy={busy} act={act} />}
      />
      <PaceSlider which="gatherer" value={g.pace} steps={GATHER_STEPS} act={act} />
      <p className={pipe.use}>
        A picture fresher than its stream's last keyframe needs every frame since it decoded (most of the CPU a stream
        takes); up to this old, keyframes only will do, however often it is drawn.
      </p>
      <PaceSlider
        which="freshness"
        label="Picture age allowed"
        value={g.freshness}
        steps={[0, 1, 2, 3, 4, 5, 6, 8, 10]}
        text={(n) => (n === 0 ? "as fresh as its pace" : `up to ${n} s old`)}
        act={act}
      />
      <p className={pipe.use}>
        Survey: every channel of every camera, from its stream's first frame (a snapshot where there is no stream), for
        each one's picture and size.{" "}
        {g.paused
          ? "Paused with the gatherer."
          : g.survey.running
            ? `Passing now: ${g.survey.done} of ${g.survey.of}.`
            : g.survey.took_s != null
              ? `Last pass: ${plural(g.survey.of, "channel")} in ${seconds(g.survey.took_s)}, ${seconds(g.survey.cpu_s ?? 0)} of CPU; the next in ${seconds(g.survey.next_in ?? 0)}.`
              : ""}
      </p>
      <PaceSlider which="survey" label="Survey pause" value={g.survey.pace} steps={SURVEY_STEPS} act={act} />
      <PaceSlider
        which="survey_at_once"
        label="Survey at once"
        value={g.survey.at_once}
        steps={[1, 2, 3, 4, 5, 6, 7, 8]}
        text={(n) => `${plural(n, "stream")}`}
        act={act}
      />
      {g.channels.length ? (
        <Table head={["Camera", "Channel", "State", "Size", "Rate", "CPU", "Wanted by", "Missed", "Survey", ""]}>
          {[...g.channels].sort(byCamera).map((c) => (
            <tr key={c.camera}>
              <td>{c.title}</td>
              <td title={c.camera}>{c.channel}</td>
              <td>
                <StateBadge state={c.state} />
                {c.no_stream && <div className={pipe.cellNote}>not its stream: {c.no_stream}</div>}
              </td>
              <td>
                {c.width ? `${c.width} × ${c.height} ` : "? "}
                {c.size_from && (
                  <span
                    className={guest.badge}
                    title={
                      c.size_from === "stream"
                        ? "Its size as its stream gives it (read from its video)"
                        : "Its size as its snapshot gives it: not yet read from its stream, which may differ"
                    }
                  >
                    {c.size_from}
                  </span>
                )}
              </td>
              <td>{c.fps != null ? `${c.fps} fps` : c.fetch_ms != null ? `${ms(c.fetch_ms)} a still` : ""}</td>
              <td>
                {c.cpu_pct != null ? `${c.cpu_pct}% · ${c.decoding}` : ""}
                {(c.pace_s != null || c.gop_s) && (
                  <div className={pipe.cellNote}>
                    {[c.pace_s != null ? `used ${paceText(c.pace_s)}` : "", c.gop_s ? `keyframe every ${c.gop_s} s` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </td>
              <td>{c.wanted_by.map(owner).join(", ")}</td>
              <td style={c.back_in_s != null ? { color: "var(--bad)" } : undefined}>
                {c.back_in_s != null ? `back in ${seconds(c.back_in_s)}` : c.missed ? `${c.missed} in a row` : ""}
              </td>
              <td>
                {c.surveys.length ? (
                  <button
                    className={pipe.link}
                    onClick={() => onSurveys(c.camera)}
                    style={c.surveys[0].outcome === "stream" || c.surveys[0].outcome === "read" ? undefined : { color: "var(--warn)" }}
                    title="Its last surveys: what came of each, and why"
                  >
                    {c.surveys[0].outcome}
                  </button>
                ) : (
                  ""
                )}
              </td>
              <td>
                <button className={ui.iconButton} onClick={() => onLive(c)} title="A live view of this channel's stream" aria-label={`Live view of ${c.title}, ${c.channel}`}>
                  ↗
                </button>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>No cameras yet.</Empty>
      )}
    </section>
  );
}

/** The paces to choose from, seconds between: the gatherer's down to continuous (0), a
 * generator's down to 8 a second. */
const GATHER_STEPS = [0, 0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 15];
const DRAW_STEPS = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 15];
const SURVEY_STEPS = [10, 15, 30, 60, 120, 300, 600, 1800, 3600];

/** 0: continuous; 0.25: 4 a second; 2: every 2 s. */
function paceText(seconds: number): string {
  if (seconds === 0) return "continuous";
  if (seconds < 1) return `${Math.round(1 / seconds)} a second`;
  return seconds < 60 ? `every ${seconds} s` : `every ${seconds / 60} min`;
}

/** A pace, set on the box a moment after the slider stops moving. */
function PaceSlider({
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
    act("pace", `${label}: ${text(steps[held])}`, { which, seconds: steps[held] });
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

function StateBadge({ state }: { state: State }) {
  return <span className={`${pipe.state} ${pipe[state.replace(" ", "_")] ?? ""}`}>{state}</span>;
}

/** A picture in the cache: a camera channel's (from the gatherer) or a composite (a
 * picture a generator drew). */
type Item = {
  id: string;
  name: string;
  sub: string;
  kind: "camera" | "composite";
  age: number | null; // s; null while waiting for its first
  size: string;
  state?: State;
  note: string;
  uses: Use[];
  /** Its thumbnail's address, width wide: it changes only when a new picture comes (so the
   * browser fetches one only then). */
  src: (width: number) => string;
  purge: () => void;
};

function born(age: number | null): string {
  return age == null ? "w" : String(Math.round(Date.now() / 1000 - age));
}

function cacheItems(status: Status, act: Act): Item[] {
  const cameras = status.gatherer.channels.map(
    (c): Item => ({
      id: `c ${c.camera}`,
      name: c.title,
      sub: c.channel,
      kind: "camera",
      age: c.waiting ? null : c.age_s,
      size: c.picture ? `${c.picture[0]} × ${c.picture[1]}` : c.width ? `${c.width} × ${c.height}` : "size ?",
      state: c.state,
      note: [
        c.waiting ? "waiting for its first" : c.source === "stream" ? "stream" : "snapshot",
        // a picture not its channel's size (it would be drawn softer)
        c.picture && c.width && (c.picture[0] !== c.width || c.picture[1] !== c.height) ? `channel ${c.width} × ${c.height}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      uses: c.uses,
      src: (w) => `api/compositor/thumb/${encodeURIComponent(c.camera)}?w=${w}&whole=1&r=${born(c.waiting ? null : c.age_s)}`,
      purge: () => act("cache/forget", `Purged ${c.title} (${c.channel})`, { camera: c.camera }),
    }),
  );
  const composites = ENGINES.flatMap(([key, name]) =>
    (status[key]?.pictures ?? []).map(
      (p): Item => ({
        id: `p ${key} ${p.key}`,
        name: p.commander,
        sub: `${name.toLowerCase()}, ${p.width} × ${p.height}${p.asked ? ` at ${p.scale}×` : ""}`,
        kind: "composite",
        age: p.age_s,
        size: `${p.width} × ${p.height}`,
        note: `${p.kb} kB, drawn in ${p.draw_ms} ms`,
        uses: [],
        src: (w) => `api/compositor/thumb/${encodeURIComponent(p.key)}?engine=${key}&w=${w}&whole=1&r=${born(p.age_s)}`,
        purge: () => act("cache/forget", `Purged ${p.commander} (${name.toLowerCase()})`, { engine: key, picture: p.key }),
      }),
    ),
  );
  return [...cameras, ...composites];
}

type View = "tiles" | "list";
type Sort = "name" | "age";

/** A per-viewer choice kept in this browser (try: storage may be blocked). */
function useKept<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T) || fallback;
    } catch {
      return fallback;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, v);
    } catch {
      /* not kept: fine */
    }
  };
  return [value, set];
}

function CacheArea({
  items,
  cache,
  stale,
  busy,
  act,
  onShow,
}: {
  items: Item[];
  cache: Cache;
  stale: number;
  busy: boolean;
  act: Act;
  onShow: (id: string) => void;
}) {
  const [view, setView] = useKept<View>("cm.cache.view", "tiles");
  const [sort, setSort] = useKept<Sort>("cm.cache.sort", "name");
  const sorted = [...items].sort((a, b) =>
    sort === "age" ? (a.age ?? Infinity) - (b.age ?? Infinity) : a.name.localeCompare(b.name) || a.sub.localeCompare(b.sub),
  );
  const ageNote = (i: Item) => (i.age == null ? "" : `${seconds(i.age)} old`);
  const ageStyle = (i: Item) => (i.age != null && i.age > stale ? { color: "var(--warn)" } : undefined);
  const bin = (i: Item) => (
    <button
      className={ui.iconButton}
      disabled={busy}
      onClick={i.purge}
      title={i.kind === "camera" ? "Purge this picture: fetched afresh, “(Waiting …)” until then (its size is kept)" : "Purge this picture: drawn afresh at its next turn"}
      aria-label={`Purge ${i.name}, ${i.sub}`}
    >
      <BinIcon />
    </button>
  );
  return (
    <section className={guest.area}>
      <AreaHead
        title="Cache"
        blurb={`Every picture kept: each camera channel's newest (“(Waiting …)” until its first comes) and each composite the generators drew. ${plural(cache.pictures, "picture")} (${cache.cameras} cameras', ${cache.composites} composites; ${cache.waiting} channels waiting) and ${plural(cache.thumbnails, "thumbnail")}: ${mb(cache.bytes)}. Tap one for a live view; a bin purges it.`}
        action={
          <button className={ui.button} disabled={busy} onClick={() => act("cache/purge", "Cache purged")}>
            Purge all
          </button>
        }
      />
      <div className={pipe.controls}>
        <Segmented value={view} options={[["tiles", "Tiles"], ["list", "List"]]} onChange={setView} />
        <Segmented value={sort} options={[["name", "By name"], ["age", "Newest first"]]} onChange={setSort} />
      </div>
      {view === "tiles" ? (
        <div className={pipe.grid}>
          {sorted.map((i) => (
            <div key={i.id} className={pipe.card}>
              <button className={pipe.thumb} onClick={() => onShow(i.id)} title="A live view of this picture">
                <img src={i.src(240)} alt={`${i.name}, ${i.sub}`} loading="lazy" />
              </button>
              <div className={pipe.meta}>
                <strong>
                  {i.name} <span className={guest.rowMeta}>{i.sub}</span>
                </strong>
                <span>
                  {i.state ? <StateBadge state={i.state} /> : <span className={guest.badge}>composite</span>} {i.size}
                </span>
                <span className={guest.rowMeta} style={ageStyle(i)}>
                  {[ageNote(i), i.note].filter(Boolean).join(" · ")}
                </span>
                {i.uses.map((u) => (
                  <span key={`${u.picture} ${u.place}`} className={pipe.use} style={u.enlarged != null && u.enlarged > 1 ? { color: "var(--bad)" } : undefined}>
                    {u.picture}, {u.place} {u.width} × {u.height}
                    {u.enlarged == null ? "" : ` ×${u.enlarged}`}
                  </span>
                ))}
              </div>
              {bin(i)}
            </div>
          ))}
        </div>
      ) : (
        <Table head={["", "Name", "", "Kind", "Size", "Age", "", ""]}>
          {sorted.map((i) => (
            <tr key={i.id}>
              <td>
                <button className={pipe.mini} onClick={() => onShow(i.id)} title="A live view of this picture">
                  <img src={i.src(64)} alt="" loading="lazy" />
                </button>
              </td>
              <td>{i.name}</td>
              <td>{i.sub}</td>
              <td>{i.state ? <StateBadge state={i.state} /> : <span className={guest.badge}>composite</span>}</td>
              <td>{i.size}</td>
              <td style={ageStyle(i)}>{i.age == null ? "waiting" : seconds(i.age)}</td>
              <td className={guest.rowMeta}>{i.note}</td>
              <td>{bin(i)}</td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}

/** A channel's last surveys: what came of each, and why not its stream. */
function Surveys({ c, onClose }: { c?: Channel; onClose: () => void }) {
  if (!c) return null;
  return (
    <Dialog
      title={`${c.title}, ${c.channel}: its surveys`}
      wide
      onClose={onClose}
      footer={
        <button className={ui.primary} onClick={onClose}>
          Close
        </button>
      }
    >
      <p className={pipe.use}>
        <code>{c.camera}</code>: its last five surveys, newest first. Each opens its stream for a first frame (through
        Home Assistant's go2rtc), else takes its snapshot.
      </p>
      <Table head={["When", "Came", "Took", "CPU", "Size", "Why not its stream"]}>
        {c.surveys.map((r) => (
          <tr key={r.at}>
            <td>{new Date(r.at * 1000).toLocaleTimeString()}</td>
            <td style={r.outcome === "stream" || r.outcome === "read" ? undefined : { color: "var(--warn)" }}>
              {r.outcome === "read" ? "being read anyway" : r.outcome}
            </td>
            <td>{seconds(r.took_s)}</td>
            <td>{r.cpu_ms != null ? ms(r.cpu_ms) : ""}</td>
            <td>{r.size ? `${r.size[0]} × ${r.size[1]}` : ""}</td>
            <td style={{ whiteSpace: "normal" }}>{r.why}</td>
          </tr>
        ))}
      </Table>
    </Dialog>
  );
}

/** One cached picture, larger, as it changes (with the page's polling). */
function Preview({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <Dialog
      title={`${item.name}, ${item.sub}`}
      wide
      onClose={onClose}
      footer={
        <button className={ui.primary} onClick={onClose}>
          Close
        </button>
      }
    >
      <img className={pipe.big} src={item.src(1280)} alt={`${item.name}, ${item.sub}`} />
      <p className={pipe.use}>
        {item.state ? <StateBadge state={item.state} /> : <span className={guest.badge}>composite</span>} {item.size},{" "}
        {item.age == null ? "waiting for its first picture" : `${seconds(item.age)} old`}, {item.note}.
      </p>
    </Dialog>
  );
}

function GeneratorArea({
  which,
  name,
  blurb,
  e,
  busy,
  act,
  onShow,
}: {
  which: string;
  name: string;
  blurb: string;
  e: Engine;
  busy: boolean;
  act: Act;
  onShow: (id: string) => void;
}) {
  return (
    <section className={guest.area}>
      <AreaHead
        title={`${name} generator`}
        blurb={`${blurb} Draws each commander watched from the cache, ${paceText(e.pace ?? 2)}${e.generator_paused ? "; paused: the last pictures are served on" : ""}.`}
        action={<PauseButton paused={!!e.generator_paused} path={`${which}/generator`} name={`${name} generator`} busy={busy} act={act} />}
      />
      <PaceSlider which={which} value={e.pace ?? 2} steps={DRAW_STEPS} act={act} />
      {e.error && <p className={guest.empty}>{e.error}</p>}
      {e.needs && <Empty>It needs {e.needs}.</Empty>}
      {e.pictures?.length ? (
        <Table head={["Commander", "Size", "Drawn", "Draw", "Picture", ""]}>
          {e.pictures.map((p) => (
            <tr key={`${p.commander} ${p.width}x${p.height} ${p.scale}`}>
              <td>{p.commander}</td>
              <td>
                {p.width} × {p.height}
                {p.asked ? ` at ${p.scale}×` : ""} <span className={guest.badge}>{p.asked ? "a card's size" : "its own size"}</span>
              </td>
              <td>{seconds(p.age_s)} ago</td>
              <td>{p.draw_ms} ms</td>
              <td>{p.kb} kB</td>
              <td>
                <button className={ui.iconButton} onClick={() => onShow(`p ${which} ${p.key}`)} title="A live view of this picture" aria-label={`Live view of ${p.commander}`}>
                  ↗
                </button>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>None drawn since nobody last looked.</Empty>
      )}
    </section>
  );
}

function ServerArea({ which, name, e, busy, act }: { which: string; name: string; e: Engine; busy: boolean; act: Act }) {
  return (
    <section className={guest.area}>
      <AreaHead
        title={`${name} server`}
        blurb={`Port ${e.port}. Sends each viewer the newest picture as it is drawn${e.server_paused ? "; paused: streams hold, single pictures are refused" : ""}.`}
        action={<PauseButton paused={!!e.server_paused} path={`${which}/server`} name={`${name} server`} busy={busy} act={act} />}
      />
      {e.size_test && (
        <p>
          <a href={e.size_test} target="_blank" rel="noopener">
            Size test ↗
          </a>{" "}
          <span className={pipe.use}>a commander at exactly a browser window's size, with what was asked for and what came back (on this network only)</span>
        </p>
      )}
      {e.sending?.length ? (
        <Table head={["Viewer", "Picture", "Open", "Frames", "Frame", "Rate", "Waiting to send"]}>
          {e.sending.map((s) => (
            <tr key={`${s.viewer} ${s.picture} ${s.open_s}`}>
              <td>{s.viewer}</td>
              <td>{s.picture}</td>
              <td>{seconds(s.open_s)}</td>
              <td>{s.frames}</td>
              <td>{s.kb_frame} kB</td>
              <td>{s.kbit_s} kbit/s</td>
              <td style={s.waiting_pct > 50 ? { color: "var(--warn)" } : undefined}>{s.waiting_pct}%</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>No streams open.</Empty>
      )}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className={css.listing}>
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Who wants a channel: a compositor, by the store it serves. */
const owner = (store: string) => (store.includes("live") ? "Live" : "Preview");

const plural = (n: number, what: string) => `${n} ${what}${n === 1 ? "" : "s"}`;

/** 12.3 MB */
const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** 40 ms, 1.2 s */
const ms = (n: number) => (n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`);

/** 3.2 s, 4 min 10 s */
function seconds(s: number): string {
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${Math.round(s % 60)} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
