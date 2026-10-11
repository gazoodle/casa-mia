/** Sensor Watch: the watched sensors with their level now (from the integration, in
 * watched.tsx), Home Assistant itself, and the ways to add more. */

import { useCallback, useEffect, useState } from "react";
import { SensorWatchIcon } from "../icons";
import { AreaHead, Empty, Shell } from "../page";
import { Toasts, type Toast } from "../ui";
import { swApi, type LevelsView, type WatchRecord, type WatchView } from "./common";
import { PickDialog, ScanDialog } from "./dialogs";
import { RecordDialog } from "./editor";
import { SystemSection } from "./system";
import { WatchedList } from "./watched";
import css from "./sensor-watch.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";

const HEAD = {
  icon: <SensorWatchIcon />,
  title: "Sensor Watch",
  module: "sensor_watch",
  blurb: "Any sensor given bands of values, each with a level, so what needs doing or has gone wrong shows before the family notices.",
};

export function SensorWatchPage({ state }: { state?: string }) {
  const [view, setView] = useState<WatchView>();
  const [live, setLive] = useState<LevelsView>();
  const [missing, setMissing] = useState<string[]>([]);
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

  if (!view) return <Shell {...HEAD} state={state}><p className={guest.notice}>Loading…</p></Shell>;

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
          blurb={view.records.length ? `${view.records.length} watched; the chips filter them and give the counts.` : "Nothing watched yet."}
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
          <WatchedList
            records={view.records}
            live={live}
            labels={view.labels ?? {}}
            onEdit={(r) => setEditing({ entityId: r.entity_id, record: r })}
            onStopMany={(rs) =>
              change(() => swApi.post<WatchView>("forget", { entity_ids: rs.map((r) => r.entity_id) }), `${rs.length} sensors no longer watched`)
            }
            onStop={(r) =>
              confirm(`Stop watching ${r.label}?`) && change(() => swApi.del<WatchView>(encodeURIComponent(r.entity_id)), `${r.label}: no longer watched`)
            }
          />
        )}
      </section>

      <SystemSection system={view.system} live={live} change={change} />

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
