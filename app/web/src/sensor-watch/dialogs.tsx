/** Choosing a sensor to watch, and scanning the house for suggestions, round by round. */

import { useEffect, useState } from "react";
import { Dialog, Field } from "../ui";
import { NO_FILTERS, query, summary, swApi, type CandidatesView, type Filters, type ScanView, type Suggested, type WatchRecord } from "./common";
import { FilterBar } from "./filters";
import css from "./sensor-watch.module.css";
import ui from "../ui.module.css";

/** The filtered sensors, asked of the app as the filters change (a big house has
 * thousands; the app sends at most 200). */
function useCandidates(filters: Filters) {
  const [view, setView] = useState<CandidatesView>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const timer = setTimeout(() => {
      swApi.get<CandidatesView>(`candidates?${query(filters)}`).then(
        (v) => {
          setView(v);
          setError(undefined);
        },
        (err) => setError((err as Error).message),
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [filters]);
  return { view, error };
}

export function PickDialog({ onClose, onPick }: { onClose: () => void; onPick: (entityId: string) => void }) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const { view, error } = useCandidates(filters);
  return (
    <Dialog
      wide
      title="Watch a sensor"
      onClose={onClose}
      footer={
        <button className={ui.button} onClick={onClose}>
          Cancel
        </button>
      }
    >
      <FilterBar value={filters} options={view?.options} onChange={setFilters} />
      {error && <p className={css.problem}>{error}</p>}
      {view && (
        <p className={css.note}>
          {view.total} sensors match{view.total > view.sensors.length ? `; the first ${view.sensors.length} are shown, narrow the filters for the rest` : ""}.
        </p>
      )}
      <ul className={css.pickList}>
        {view?.sensors.map((c) => (
          <li key={c.entity_id}>
            <button className={css.pick} disabled={c.watched} onClick={() => onPick(c.entity_id)}>
              <strong>{c.name}</strong>
              <span>
                {c.state} {c.unit}
                {c.area && ` · ${c.area}`}
                {c.watched && " · watched"}
              </span>
              <code>{c.entity_id}</code>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

export function ScanDialog({ onClose, onAccepted }: { onClose: () => void; onAccepted: (records: WatchRecord[]) => Promise<boolean> }) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [days, setDays] = useState("30");
  const { view } = useCandidates(filters);
  const [scan, setScan] = useState<ScanView>();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const run = async (start?: [string, string] | null) => {
    setBusy(true);
    setError(undefined);
    try {
      const got = await swApi.post<ScanView>("scan", { ...filters, days, start: start ?? undefined });
      setScan(got);
      setTicked(new Set(got.found.map((f) => f.sensor.entity_id)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!scan) return;
    setBusy(true);
    const records = scan.found
      .filter((f) => ticked.has(f.sensor.entity_id))
      .map((f) => ({ ...f.record, entity_id: f.sensor.entity_id }) as WatchRecord);
    const ok = await onAccepted(records);
    setBusy(false);
    if (ok) setScan({ ...scan, found: scan.found.filter((f) => !ticked.has(f.sensor.entity_id)) });
  };

  const flip = (f: Suggested) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(f.sensor.entity_id)) next.delete(f.sensor.entity_id);
      else next.add(f.sensor.entity_id);
      return next;
    });

  return (
    <Dialog
      wide
      title="Scan my house"
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Close
          </button>
          {scan?.next && (
            <button className={ui.button} disabled={busy} onClick={() => run(scan.next)}>
              Scan the next {Math.min(500, scan.remaining)}
            </button>
          )}
          {scan && scan.found.length > 0 ? (
            <button className={ui.primary} disabled={busy || ticked.size === 0} onClick={accept}>
              Watch the ticked ({ticked.size})
            </button>
          ) : (
            <button className={ui.primary} disabled={busy} onClick={() => run()}>
              {busy ? "Scanning…" : "Scan"}
            </button>
          )}
        </>
      }
    >
      <p className={css.note}>
        Suggests bands for every sensor not watched yet, from its history, 500 a round. Narrow it, or scan everything. Nothing is watched until you
        accept it.
      </p>
      <FilterBar value={filters} options={view?.options} onChange={setFilters} />
      <div className={css.scanBar}>
        <Field label="Days of history">
          <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
        {view && <span className={css.note}>{view.total} sensors match (watched ones are left out of a scan).</span>}
        {scan && (
          <button className={`${ui.button} ${ui.small}`} disabled={busy} onClick={() => run()}>
            Scan again from the start
          </button>
        )}
      </div>
      {error && <p className={css.problem}>{error}</p>}
      {scan && (
        <p className={css.note}>
          {scan.matched} unwatched sensors match; this round has {scan.found.length} suggestions
          {scan.skipped ? `, and ${scan.skipped} without history to suggest from` : ""}
          {scan.remaining ? `; ${scan.remaining} more to scan` : ""}.
        </p>
      )}
      <ul className={css.scanList}>
        {scan?.found.map((f) => (
          <li key={f.sensor.entity_id}>
            <label className={css.scanRow}>
              <input type="checkbox" checked={ticked.has(f.sensor.entity_id)} onChange={() => flip(f)} />
              <span>
                <strong>{f.sensor.name}</strong> <code>{f.sensor.entity_id}</code>
                <span className={css.note}>
                  {f.sensor.area && `${f.sensor.area} · `}
                  {summary(f.record)} {f.sensor.unit}
                  {f.suggestion?.outlier_count ? ` · ${f.suggestion.outlier_count} outliers set aside` : ""}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
