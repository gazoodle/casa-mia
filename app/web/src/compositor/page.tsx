import { useCallback, useEffect, useState } from "react";
import { CameraGridIcon } from "../icons";
import { Empty, Shell } from "../page";
import { LiveView } from "../LiveView";
import { Switch, Toasts, type Toast } from "../ui";
import guest from "../guest.module.css";
import pipe from "../pipeline.module.css";
import ui from "../ui.module.css";
import { CacheArea, Preview, Surveys, cacheItems } from "./cache";
import { Act, Channel, ENGINES, POLL_MS, PauseButton, Status, get, mb, plural, post } from "./common";
import { GeneratorArea, ServerArea } from "./engines";
import { GathererArea } from "./gatherer";
import { Graphs, Health, Stage } from "./health";

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
  /** Whether it was done (a refusal is said in a toast). */
  const act = async (path: string, done: string, body?: unknown): Promise<boolean> => {
    setBusy(true);
    try {
      setStatus(await post<Status>(path, body));
      toast(done);
      return true;
    } catch (err) {
      toast((err as Error).message, "bad");
      return false;
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
          <Health v={g.health} />
          <Graphs m={g.monitor} />
          <div className={pipe.flag}>
            <Switch
              on={g.flags.live_main}
              label="Live main camera"
              onChange={(on) => act("flag", on ? "Live main camera on" : "Live main camera off", { which: "live_main", on })}
            />
            <span>
              <strong>Live main camera.</strong>{" "}
              <span className={pipe.use}>
                Camera Commander cards play the main camera as live video over the picture (the tablet decodes it; the box
                does not). Off: every card shows the drawn picture, main camera and all.
              </span>
            </span>
          </div>
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

/** The four stages in a row: each one's state at a glance, with its pause or run. */
export function Strip({ status, busy, act }: { status: Status; busy: boolean; act: Act }) {
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
