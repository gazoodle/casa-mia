/** Camera compositor: what the live compositor (the dashboards, the wall tablets) and the
 * draft one (previews, Show the draft cards) are serving now: each picture drawn, at each
 * size asked for, the streams open on it and per device, and each camera still with its
 * age. Polled while open. Restart (both engines), Flush cache (one engine), and a bin per
 * still (forget it: fetched again next round). */

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { BinIcon, CameraGridIcon } from "./icons";
import { AreaHead, Empty, Shell } from "./page";
import { Toasts, type Toast } from "./ui";
import css from "./firmware.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";

const { get, post } = api("compositor");
type Both = { live: Status; draft: Status | null };
const POLL_MS = 2000;

type Picture = { commander: string; width: number; height: number; scale: number; asked: boolean; age_s: number; streams: number };
type Still = { camera: string; title: string; width: number; height: number; age_s: number; missed: number; back_in_s: number | null };
type Status = {
  state: string;
  port: number;
  gathering?: boolean;
  error?: string | null;
  needs?: string | null;
  stale_s?: number;
  pictures?: Picture[];
  devices?: Record<string, number>;
  stills?: Still[];
};

export function CompositorPage({ state }: { state?: string }) {
  const [status, setStatus] = useState<Both>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);
  useEffect(() => {
    if (state !== "running" && state !== "unconfigured") return;
    const load = () =>
      get<Both>("").then(
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
      setStatus(await post<Both>(path, body));
      toast(done);
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      icon={<CameraGridIcon />}
      title="Camera compositor"
      blurb="What it is drawing and serving now, refreshed every 2 seconds."
      state={state}
      action={
        <button
          className={ui.button}
          disabled={busy || !status}
          title="Stop both engines (live and draft) and start them again: settings re-read, every still, picture and stream gone"
          onClick={() =>
            confirm("Restart the camera compositor? Every picture on screen stops for a moment.") &&
            act("restart", "Restarted")
          }
        >
          Restart
        </button>
      }
    >
      {error && <p className={guest.empty}>{error}</p>}
      {!status && !error && <Empty>Loading…</Empty>}
      {status && (
        <Compositor
          title="Live"
          blurb="The dashboards and the wall tablets (Camera Commander cards)."
          s={status.live}
          busy={busy}
          onFlush={() => act("live/flush", "Live cache flushed")}
          onForget={(c) => act("live/forget", `Forgot ${c.title}`, { camera: c.camera })}
        />
      )}
      {status?.draft && (
        <Compositor
          title="Draft"
          blurb="The Camera Dashboard page's previews, and cards with Show the draft."
          s={status.draft}
          busy={busy}
          onFlush={() => act("draft/flush", "Draft cache flushed")}
          onForget={(c) => act("draft/forget", `Forgot ${c.title}`, { camera: c.camera })}
        />
      )}
      <Toasts toasts={toasts} />
    </Shell>
  );
}

function Compositor({
  title,
  blurb,
  s,
  busy,
  onFlush,
  onForget,
}: {
  title: string;
  blurb: string;
  s: Status;
  busy: boolean;
  onFlush: () => void;
  onForget: (still: Still) => void;
}) {
  const stale = s.stale_s ?? 30;
  const devices = Object.entries(s.devices ?? {});
  return (
    <section className={guest.area}>
      <AreaHead
        title={title}
        blurb={`${blurb} Port ${s.port}; ${s.gathering ? "someone is watching: fetching every 2 s" : "nobody watching: fetching nothing"}.`}
        action={
          <button
            className={ui.button}
            disabled={busy}
            title="Forget every still and picture: each is fetched and drawn afresh, only as it is asked for"
            onClick={onFlush}
          >
            Flush cache
          </button>
        }
      />
      {s.error && <p className={guest.empty}>{s.error}</p>}
      {s.needs && <Empty>It needs {s.needs}.</Empty>}
      <h3>Pictures</h3>
      {s.pictures?.length ? (
        <Table head={["Commander", "Size", "Drawn", "Streams"]}>
          {s.pictures.map((p) => (
            <tr key={`${p.commander} ${p.width}x${p.height} ${p.scale}`}>
              <td>{p.commander}</td>
              <td>
                {p.width} × {p.height}
                {p.asked ? ` at ${p.scale}×` : ""} <span className={guest.badge}>{p.asked ? "a card's size" : "its own size"}</span>
              </td>
              <td>{seconds(p.age_s)} ago</td>
              <td>{p.streams}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>None drawn since nobody last looked.</Empty>
      )}
      <h3>Devices watching</h3>
      {devices.length ? (
        <Table head={["Address", "Streams"]}>
          {devices.map(([ip, n]) => (
            <tr key={ip}>
              <td>{ip}</td>
              <td>{n}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>No streams open.</Empty>
      )}
      <h3>Camera stills</h3>
      {s.stills?.length ? (
        <Table head={["", "Camera", "Fetched at", "Age", "Missed"]}>
          {s.stills.map((c) => (
            <tr key={`${c.camera} ${c.width}`}>
              <td>
                <button
                  className={ui.iconButton}
                  disabled={busy}
                  onClick={() => onForget(c)}
                  title="Forget this still: fetched again next round (one sitting out is tried again)"
                  aria-label={`Forget ${c.title}`}
                >
                  <BinIcon />
                </button>
              </td>
              <td title={c.camera}>{c.title}</td>
              <td>
                {c.width} × {c.height}
              </td>
              <td style={c.age_s > stale ? { color: "var(--warn)" } : undefined}>
                {seconds(c.age_s)}
                {c.age_s > stale ? " (stale)" : ""}
              </td>
              <td style={c.back_in_s != null ? { color: "var(--bad)" } : undefined}>
                {c.back_in_s != null ? `sitting out, tried again in ${seconds(c.back_in_s)}` : c.missed ? `${c.missed} in a row` : ""}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>None fetched yet.</Empty>
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

/** 3.2 s, 4 min 10 s */
function seconds(s: number): string {
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${Math.round(s % 60)} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
