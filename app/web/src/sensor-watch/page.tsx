/** Sensor Watch: the watched sensors with their level now (from the integration), a
 * search and level filter for a house with hundreds, and the ways to add more. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { SensorWatchIcon } from "../icons";
import { AreaHead, Empty, Shell } from "../page";
import { Toasts, type Toast } from "../ui";
import { LEVELS, LEVEL_NAMES, summary, swApi, type Level, type LevelsView, type WatchRecord, type WatchView } from "./common";
import { PickDialog, ScanDialog } from "./dialogs";
import { RecordDialog } from "./editor";
import css from "./sensor-watch.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";

const HEAD = {
  icon: <SensorWatchIcon />,
  title: "Sensor Watch",
  module: "sensor_watch",
  blurb: "Any sensor given bands of values, each with a level, so what needs doing or has gone wrong shows before the family notices.",
};
const PAGE = 100; // rows shown, then "Show more"

export function SensorWatchPage({ state }: { state?: string }) {
  const [view, setView] = useState<WatchView>();
  const [live, setLive] = useState<LevelsView>();
  const [missing, setMissing] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<"" | Level | "off">("");
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<{ entityId: string; record?: WatchRecord }>();
  const [picking, setPicking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);

  const readLive = useCallback(() => swApi.get<LevelsView>("levels").then(setLive, () => undefined), []);
  useEffect(() => {
    swApi.get<WatchView>("").then(setView, (err) => toast((err as Error).message, "bad"));
    swApi.get<{ missing: string[] }>("check").then((c) => setMissing(c.missing), () => undefined);
    readLive();
    const timer = setInterval(readLive, 30_000);
    return () => clearInterval(timer);
  }, [toast, readLive]);

  const change = async (action: () => Promise<WatchView>, done: string) => {
    try {
      setView(await action());
      toast(done);
      setTimeout(readLive, 3000); // the integration fetches the new records within a moment
      return true;
    } catch (err) {
      toast((err as Error).message, "bad");
      return false;
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (view?.records ?? []).filter((r) => {
      const now = live?.levels[r.entity_id]?.level;
      return (
        (!q || (r.label ?? "").toLowerCase().includes(q) || r.entity_id.includes(q)) &&
        (!level || (level === "off" ? now !== undefined && now !== "nominal" : now === level))
      );
    });
  }, [view, live, search, level]);

  if (!view) return <Shell {...HEAD} state={state}><p className={guest.notice}>Loading…</p></Shell>;
  const counts = Object.values(live?.levels ?? {}).reduce<Record<string, number>>((n, l) => ({ ...n, [l.level]: (n[l.level] ?? 0) + 1 }), {});

  return (
    <Shell {...HEAD} state={state}>
      {missing.length > 0 && (
        <div className={css.alarm} role="alert">
          <strong>Home Assistant isn't running its {missing.join(" or ")} integration.</strong> That's a serious fault in Home Assistant, not just here:
          without it there's no history and no statistics, so Sensor Watch can't suggest bands, and Home Assistant's own History panel and graphs
          don't work either. Look in Settings → System → Logs for why it didn't start. You can still set sensors up by hand meanwhile.
        </div>
      )}
      {view.error && <div className={guest.warning}>sensor-watch.json could not be read ({view.error}), so nothing is watched. Fix or remove the file.</div>}
      {live?.error && <div className={guest.warning}>{live.error}</div>}
      <section className={guest.area}>
        <AreaHead
          title="Watched sensors"
          blurb={
            view.records.length
              ? LEVELS.map((l) => `${counts[l] ?? 0} ${LEVEL_NAMES[l].toLowerCase()}`).join(" · ")
              : "Nothing watched yet."
          }
          action={
            <span className={css.actions}>
              <button className={ui.button} onClick={() => setScanning(true)}>
                Scan my house
              </button>
              <button className={ui.primary} onClick={() => setPicking(true)}>
                + Watch a sensor
              </button>
            </span>
          }
        />
        {view.records.length === 0 ? (
          <Empty>Watch a sensor to give it bands, or scan the house for suggestions from history.</Empty>
        ) : (
          <>
            <div className={css.filters}>
              <input type="search" placeholder="Search the watched sensors" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
              <select value={level} onChange={(e) => setLevel(e.target.value as "" | Level | "off")} aria-label="Level">
                <option value="">Any level</option>
                <option value="off">Anything not nominal</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_NAMES[l]}
                  </option>
                ))}
              </select>
            </div>
            <div className={css.table}>
              {rows.slice(0, shown).map((r) => {
                const now = live?.levels[r.entity_id];
                return (
                  <div key={r.entity_id} className={css.row}>
                    <span className={`${css.level} ${css[`lv_${now?.level ?? "none"}`]}`}>{now ? LEVEL_NAMES[now.level] : "…"}</span>
                    <span className={css.what}>
                      <strong>{r.label}</strong>
                      <code>{r.entity_id}</code>
                      <span className={css.note}>
                        {now ? `${now.value ?? "?"}${now.message ? ` · ${now.message}` : ""} · ` : ""}
                        {summary(r)}
                      </span>
                    </span>
                    <span className={css.rowActions}>
                      <button className={`${ui.button} ${ui.small}`} onClick={() => setEditing({ entityId: r.entity_id, record: r })}>
                        Edit
                      </button>
                      <button
                        className={`${ui.danger} ${ui.small}`}
                        onClick={() => confirm(`Stop watching ${r.label}?`) && change(() => swApi.del<WatchView>(encodeURIComponent(r.entity_id)), `${r.label}: no longer watched`)}
                      >
                        Stop watching
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
            {rows.length > shown && (
              <button className={ui.button} onClick={() => setShown(shown + PAGE)}>
                Show {Math.min(PAGE, rows.length - shown)} more of {rows.length}
              </button>
            )}
            {rows.length === 0 && <Empty>None match.</Empty>}
          </>
        )}
      </section>

      {picking && (
        <PickDialog
          onClose={() => setPicking(false)}
          onPick={(entityId) => {
            setPicking(false);
            setEditing({ entityId });
          }}
        />
      )}
      {editing && (
        <RecordDialog
          entityId={editing.entityId}
          record={editing.record}
          onClose={() => setEditing(undefined)}
          onSave={(body) => change(() => swApi.put<WatchView>(encodeURIComponent(editing.entityId), body), `${body.name || editing.record?.label || editing.entityId} saved`)}
        />
      )}
      {scanning && (
        <ScanDialog
          onClose={() => setScanning(false)}
          onAccepted={(records) => change(() => swApi.post<WatchView>("accept", { records }), `${records.length} sensors watched`)}
        />
      )}
      <Toasts toasts={toasts} />
    </Shell>
  );
}
