/** Firmware server: the tablets' URL, Check now, how many older releases to keep, and the
 * files being served. */

import { useCallback, useEffect, useState } from "react";
import { api, type FirmwareFile, type FirmwareStatus } from "./api";
import { ago, megabytes } from "./format";
import { FirmwareIcon } from "./icons";
import { AreaHead, Empty, Shell } from "./page";
import { copyText, Segmented, Toasts, type Toast } from "./ui";
import css from "./firmware.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";

const { get, post, put } = api("gitproxy");
const POLL_MS = 5000;
const BUSY_POLL_MS = 1000;

const HEAD = {
  icon: <FirmwareIcon />,
  title: "Firmware server",
  blurb: "Mirrors the Kiosk Satellite firmware so the wall tablets update without the internet.",
};

export function FirmwarePage({ state }: { state?: string }) {
  const [status, setStatus] = useState<FirmwareStatus>();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);

  const busy = !!status && (status.checking || status.downloading);

  const load = useCallback(async () => {
    try {
      setStatus(await get<FirmwareStatus>("status"));
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  }, [toast]);

  useEffect(() => {
    if (state !== "running") return;
    load();
    const timer = setInterval(load, busy ? BUSY_POLL_MS : POLL_MS);
    return () => clearInterval(timer);
  }, [state, load, busy]);

  const change = async (action: () => Promise<FirmwareStatus>, done: string) => {
    try {
      setStatus(await action());
      toast(done);
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  };

  if (state && state !== "running") {
    return (
      <Shell {...HEAD} state={state}>
        <p className={guest.notice}>
          The firmware server is {state === "disabled" ? "switched off" : state}. Turn on{" "}
          <strong>Serve tablet firmware</strong> in the app's Configuration tab to use it.
        </p>
      </Shell>
    );
  }
  if (!status) return <Shell {...HEAD} state={state}><p className={guest.notice}>Loading…</p></Shell>;

  return (
    <Shell {...HEAD} state={state}>
      <section className={guest.area}>
        <AreaHead
          title="Tablet URL"
          blurb="In Kiosk Satellite, set the update source to Custom repository with this address."
        />
        <button
          className={guest.url}
          title="Copy the address"
          onClick={() => copyText(status.url).then(() => toast("Address copied"), () => toast("Couldn't copy: select it by hand", "bad"))}
        >
          {status.url}
        </button>
      </section>

      <section className={guest.area}>
        <AreaHead
          title="Releases"
          blurb={
            <>
              Latest <strong>{status.latest ?? "none yet"}</strong> · checked {ago(status.last_check) ?? "not yet"} ·
              checks itself every 12 hours
            </>
          }
          action={
            <button
              className={ui.primary}
              disabled={busy}
              onClick={() => change(() => post<FirmwareStatus>("check"), "Checking for a new release")}
            >
              {status.downloading ? "Downloading…" : status.checking ? "Checking…" : "Check now"}
            </button>
          }
        />
        {status.error && <div className={guest.warning}>{status.error}</div>}
        {status.downloading && (
          <div className={css.progress}>
            <div className={css.bar} aria-label={`${status.downloaded_percent ?? 0}%`}>
              <div className={css.barFill} style={{ width: `${Math.min(100, status.downloaded_percent ?? 0)}%` }} />
            </div>
            <span>
              {status.downloaded_percent ?? 0}% of {megabytes(status.total_bytes) ?? "?"}
            </span>
          </div>
        )}
        <div className={css.keep}>
          <span>Keep older releases</span>
          <Segmented
            value={String(status.keep)}
            options={Array.from({ length: status.max_keep + 1 }, (_, n) => [String(n), String(n)])}
            onChange={(v) =>
              change(
                () => put<FirmwareStatus>("settings", { keep: Number(v) }),
                `Keeping ${v} older release${v === "1" ? "" : "s"}`,
              )
            }
          />
          <span className={css.keepHelp}>
            Besides the latest. Lowering it deletes the extra files now; raising it keeps more from the next
            release on.
          </span>
        </div>
        {status.files.length === 0 ? (
          <Empty>Nothing downloaded yet. Check now fetches the latest release.</Empty>
        ) : (
          <Listing files={status.files} latest={status.latest} />
        )}
      </section>
      <Toasts toasts={toasts} />
    </Shell>
  );
}

/** The firmware folder, `ls -l` style: date, size, name, newest first. */
function Listing({ files, latest }: { files: FirmwareFile[]; latest: string | null }) {
  const total = files.reduce((sum, f) => sum + f.size, 0);
  return (
    <div className={css.listing}>
      <table>
        <tbody>
          {files.map((f) => (
            <tr key={f.name}>
              <td className={css.date}>{stamp(f.modified)}</td>
              <td className={css.size}>{size(f.size)}</td>
              <td className={css.name}>
                {f.name}
                {latest && f.name.includes(`-${latest}.`) && <span className={guest.badge}>Latest</span>}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>total</td>
            <td className={css.size}>{size(total)}</td>
            <td>
              {files.length} file{files.length === 1 ? "" : "s"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** 2026-10-02 11:42, in local time. */
function stamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** `ls -lh` sizes: 912B, 4.0K, 38M. */
function size(bytes: number): string {
  const units = ["B", "K", "M", "G"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return i === 0 ? `${n}B` : `${n < 10 ? n.toFixed(1) : Math.round(n)}${units[i]}`;
}
