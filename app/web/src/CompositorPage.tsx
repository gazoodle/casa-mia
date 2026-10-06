/** Camera compositor: its pipeline, as it runs now, polled while open. Gatherer (every
 * camera channel: its state, size, source and who wants it) → cache (each picture kept,
 * with a thumbnail; click for a live preview) → generators (live and preview: the
 * pictures drawn) → servers (live and preview: who is watching, and how fast it goes).
 * Each stage pauses and runs on its own; the cache purges whole or a picture at a time;
 * Restart restarts both engines. */

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { BinIcon, CameraGridIcon } from "./icons";
import { AreaHead, Empty, Shell } from "./page";
import { Dialog, Toasts, type Toast } from "./ui";
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
  title: string;
  channel: string;
  state: State;
  /** Still "(Waiting …)": no picture has come yet. */
  waiting: boolean;
  source: "stream" | "snapshot";
  fps: number | null;
  no_stream: string | null;
  width: number;
  height: number;
  size_from: "stream" | "still" | null;
  age_s: number | null;
  fetch_ms: number | null;
  missed: number;
  back_in_s: number | null;
  wanted_by: string[];
  uses: Use[];
};
type Gatherer = { paused: boolean; gathering: boolean; go2rtc: boolean | null; streams_read: number; channels: Channel[] };
type Picture = {
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
  const [shown, setShown] = useState<string>(); // the channel previewed
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
  const preview = g?.channels.find((c) => c.camera === shown);

  return (
    <Shell
      icon={<CameraGridIcon />}
      title="Camera compositor"
      blurb="Its pipeline as it runs now, refreshed every 2 seconds: gatherer, cache, generators, servers."
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
          <Strip status={status} busy={busy} act={act} />
          <GathererArea g={g} busy={busy} act={act} />
          <CacheArea g={g} stale={status.live.stale_s ?? 30} busy={busy} act={act} onShow={setShown} />
          {ENGINES.map(([key, name, blurb]) => {
            const e = status[key];
            return e && <GeneratorArea key={key} which={key} name={name} blurb={blurb} e={e} busy={busy} act={act} />;
          })}
          {ENGINES.map(([key, name]) => {
            const e = status[key];
            return e && <ServerArea key={key} which={key} name={name} e={e} busy={busy} act={act} />;
          })}
        </>
      )}
      {preview && <Preview c={preview} onClose={() => setShown(undefined)} />}
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
      <Stage name="Cache" on note={`${g.channels.filter((c) => !c.waiting).length} of ${g.channels.length} pictures`}>
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

function Stage({ name, on, note, children }: { name: string; on: boolean; note: string; children: React.ReactNode }) {
  return (
    <div className={pipe.stage}>
      <strong>
        <span className={`${pipe.dot} ${on ? pipe.on : ""}`} aria-hidden="true" />
        {name}
      </strong>
      <span className={guest.rowMeta}>{note}</span>
      {children}
    </div>
  );
}

function GathererArea({ g, busy, act }: { g: Gatherer; busy: boolean; act: Act }) {
  return (
    <section className={guest.area}>
      <AreaHead
        title="Gatherer"
        blurb={`Each camera channel wanted is fetched on its own, every 2 s: its stream's frames where Home Assistant's go2rtc carries it (${g.go2rtc ? "reachable" : "not reachable"}), else snapshots. ${g.paused ? "Paused: nothing is fetched." : ""}`}
        action={<PauseButton paused={g.paused} path="gatherer" name="Gatherer" busy={busy} act={act} />}
      />
      {g.channels.length ? (
        <Table head={["Camera", "Channel", "State", "Size", "Rate", "Wanted by", "Missed"]}>
          {g.channels.map((c) => (
            <tr key={c.camera}>
              <td>{c.title}</td>
              <td title={c.camera}>{c.channel}</td>
              <td title={c.no_stream ? `Not its stream: ${c.no_stream}` : undefined}>
                <StateBadge state={c.state} />
              </td>
              <td>{c.width ? `${c.width} × ${c.height}${c.size_from === "stream" ? " (stream)" : ""}` : "?"}</td>
              <td>{c.fps != null ? `${c.fps} fps` : c.fetch_ms != null ? `${ms(c.fetch_ms)} a still` : ""}</td>
              <td>{c.wanted_by.map(owner).join(", ")}</td>
              <td style={c.back_in_s != null ? { color: "var(--bad)" } : undefined}>
                {c.back_in_s != null ? `back in ${seconds(c.back_in_s)}` : c.missed ? `${c.missed} in a row` : ""}
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

function StateBadge({ state }: { state: State }) {
  return <span className={`${pipe.state} ${pipe[state.replace(" ", "_")] ?? ""}`}>{state}</span>;
}

/** A cached picture's thumbnail address: it changes only when a new picture comes (so the
 * browser fetches one only then). */
function thumbUrl(c: Channel, width: number): string {
  const born = c.waiting || c.age_s == null ? "w" : Math.round(Date.now() / 1000 - c.age_s);
  return `api/compositor/thumb/${encodeURIComponent(c.camera)}?w=${width}&whole=1&r=${born}`;
}

function CacheArea({ g, stale, busy, act, onShow }: { g: Gatherer; stale: number; busy: boolean; act: Act; onShow: (camera: string) => void }) {
  return (
    <section className={guest.area}>
      <AreaHead
        title="Cache"
        blurb={`Each channel's newest picture, kept for the generators: "(Waiting …)" until its first comes. Tap one for a live view; a bin purges it (fetched afresh; its size is kept).`}
        action={
          <button className={ui.button} disabled={busy} onClick={() => act("cache/purge", "Cache purged")}>
            Purge all
          </button>
        }
      />
      <div className={pipe.grid}>
        {g.channels.map((c) => (
          <div key={c.camera} className={pipe.card}>
            <button className={pipe.thumb} onClick={() => onShow(c.camera)} title="A live view of this picture">
              <img src={thumbUrl(c, 240)} alt={`${c.title}, ${c.channel}`} loading="lazy" />
            </button>
            <div className={pipe.meta}>
              <strong>
                {c.title} <span className={guest.rowMeta}>{c.channel}</span>
              </strong>
              <span>
                <StateBadge state={c.state} /> {c.width ? `${c.width} × ${c.height}` : "size ?"}
              </span>
              <span className={guest.rowMeta} style={c.age_s != null && c.age_s > stale ? { color: "var(--warn)" } : undefined}>
                {c.waiting ? "waiting for its first" : c.age_s != null ? `${seconds(c.age_s)} old` : ""}
                {c.source === "stream" ? " · stream" : c.waiting ? "" : " · snapshot"}
              </span>
              {c.uses.map((u) => (
                <span
                  key={`${u.picture} ${u.place}`}
                  className={pipe.use}
                  style={u.enlarged != null && u.enlarged > 1 ? { color: "var(--bad)" } : undefined}
                >
                  {u.picture}, {u.place} {u.width} × {u.height}
                  {u.enlarged == null ? "" : ` ×${u.enlarged}`}
                </span>
              ))}
            </div>
            <button
              className={ui.iconButton}
              disabled={busy}
              onClick={() => act("cache/forget", `Purged ${c.title} (${c.channel})`, { camera: c.camera })}
              title="Purge this picture: fetched afresh, “(Waiting …)” until then (its size is kept)"
              aria-label={`Purge ${c.title}, ${c.channel}`}
            >
              <BinIcon />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/** One cached picture, larger, as it changes (with the page's polling). */
function Preview({ c, onClose }: { c: Channel; onClose: () => void }) {
  return (
    <Dialog
      title={`${c.title}, ${c.channel}`}
      wide
      onClose={onClose}
      footer={
        <button className={ui.primary} onClick={onClose}>
          Close
        </button>
      }
    >
      <img className={pipe.big} src={thumbUrl(c, 1280)} alt={`${c.title}, ${c.channel}`} />
      <p className={guest.rowMeta}>
        <code>{c.camera}</code>: <StateBadge state={c.state} /> {c.width ? `${c.width} × ${c.height}` : "size ?"}
        {c.size_from ? ` (from its ${c.size_from})` : ""}, {c.waiting ? "waiting for its first picture" : `${seconds(c.age_s ?? 0)} old`}
        {c.fps != null ? `, ${c.fps} fps` : ""}
        {c.no_stream ? `; not its stream: ${c.no_stream}` : ""}.
      </p>
    </Dialog>
  );
}

function GeneratorArea({ which, name, blurb, e, busy, act }: { which: string; name: string; blurb: string; e: Engine; busy: boolean; act: Act }) {
  return (
    <section className={guest.area}>
      <AreaHead
        title={`${name} generator`}
        blurb={`${blurb} Draws each commander watched every 2 s from the cache${e.generator_paused ? "; paused: the last pictures are served on" : ""}.`}
        action={<PauseButton paused={!!e.generator_paused} path={`${which}/generator`} name={`${name} generator`} busy={busy} act={act} />}
      />
      {e.error && <p className={guest.empty}>{e.error}</p>}
      {e.needs && <Empty>It needs {e.needs}.</Empty>}
      {e.pictures?.length ? (
        <Table head={["Commander", "Size", "Drawn", "Draw", "Picture"]}>
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
          <span className={guest.rowMeta}>a commander at exactly a browser window's size, with what was asked for and what came back (on this network only)</span>
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

/** 40 ms, 1.2 s */
const ms = (n: number) => (n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`);

/** 3.2 s, 4 min 10 s */
function seconds(s: number): string {
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${Math.round(s % 60)} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
