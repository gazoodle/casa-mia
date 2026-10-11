/** Choosing a sensor to watch, and scanning the house for suggestions, round by round. */

import { useEffect, useState } from "react";
import { Dialog, Field } from "../ui";
import { NO_FILTERS, query, summary, swApi, type Candidate, type CandidatesView, type Filters, type ScanView, type Suggested, type WatchRecord, FITS, type Profile } from "./common";
import { FilterBar } from "./filters";
import css from "./sensor-watch.module.css";
import ui from "../ui.module.css";

/** The filtered sensors, asked of the app as the filters change (a big house has
 * thousands; the app sends at most 200). */
export function useCandidates(filters: Filters) {
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
      title="Watch an entity"
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

export function ScanDialog({
  profiles,
  onClose,
  onAccepted,
}: {
  profiles: Profile[];
  onClose: () => void;
  onAccepted: (records: WatchRecord[]) => Promise<boolean>;
}) {
  const [useProfile, setUseProfile] = useState("");
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

  const chosen = profiles.find((p) => p.id === useProfile);
  const accept = async () => {
    if (!scan) return;
    setBusy(true);
    const records = scan.found
      .filter((f) => ticked.has(f.sensor.entity_id))
      .map((f) =>
        // The chosen profile where it fits the sensor; its own suggestion elsewhere.
        chosen && (FITS[f.sensor.kind] ?? []).includes(chosen.kind)
          ? ({ entity_id: f.sensor.entity_id, name: "", profile: chosen.id } as WatchRecord)
          : ({ ...f.record, entity_id: f.sensor.entity_id } as WatchRecord),
      );
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
        Suggests bands for everything not watched yet, from its history, 500 a round. Without a domain it looks at sensors, binary sensors, updates,
        covers, locks, valves, vacuums, mowers and alarm panels; choose a domain to scan others (all your numbers, say). Nothing is watched until you accept it.
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
      {scan?.problem && <p className={css.problem}>{scan.problem}</p>}
      {scan && (
        <p className={css.note}>
          {scan.matched} unwatched sensors match; this round has {scan.found.length} suggestions
          {scan.skipped ? `, and ${scan.skipped} without history to suggest from` : ""}
          {scan.remaining ? `; ${scan.remaining} more to scan` : ""}.
        </p>
      )}
      {scan && scan.found.length > 0 && (
        <div className={css.selectBar}>
          {profiles.length > 0 && (
            <select value={useProfile} onChange={(e) => setUseProfile(e.target.value)} aria-label="Use a profile for the ticked" className={css.profilePick}>
              <option value="">Each its own suggestion</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  Use the profile {p.name} for the ticked ({p.kind})
                </option>
              ))}
            </select>
          )}
          <span className={css.note}>
            {ticked.size} of {scan.found.length} ticked
          </span>
          <button className={`${ui.button} ${ui.small}`} disabled={ticked.size === scan.found.length} onClick={() => setTicked(new Set(scan.found.map((f) => f.sensor.entity_id)))}>
            Select all
          </button>
          <button className={`${ui.button} ${ui.small}`} disabled={ticked.size === 0} onClick={() => setTicked(new Set())}>
            Select none
          </button>
        </div>
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
                  {f.source === "default" && " · by what it is"}
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

/** Choose sensors, watched or not, to follow `profile` (filtered to its kind to start). */
export function ApplyDialog({ profile, onClose, onApply }: { profile: Profile; onClose: () => void; onApply: (entityIds: string[]) => Promise<boolean> }) {
  // A bands or on/off profile fits only its own kind; exact states fit numbers too.
  const [filters, setFilters] = useState<Filters>({ ...NO_FILTERS, kind: profile.kind === "state" ? "" : profile.kind });
  const { view, error } = useCandidates(filters);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const fits = (c: Candidate) => (FITS[c.kind] ?? []).includes(profile.kind);
  const shown = view?.sensors.filter(fits) ?? [];

  const flip = (id: string) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const go = async () => {
    setBusy(true);
    const ok = await onApply([...ticked]);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog
      wide
      title={`Follow ${profile.name}`}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} disabled={busy || ticked.size === 0} onClick={go}>
            Follow it ({ticked.size})
          </button>
        </>
      }
    >
      <p className={css.note}>
        Tick the sensors to follow it: those watched already swap their own levels for its; the rest start being watched. Only sensors of a kind it fits are
        listed.
      </p>
      <FilterBar value={filters} options={view?.options} onChange={setFilters} />
      {error && <p className={css.problem}>{error}</p>}
      <div className={css.selectBar}>
        <span className={css.note}>
          {view && view.total > view.sensors.length ? `The first ${view.sensors.length} of ${view.total}; narrow the filters for the rest. ` : ""}
          {ticked.size} ticked
        </span>
        <button className={`${ui.button} ${ui.small}`} disabled={!shown.length} onClick={() => setTicked(new Set([...ticked, ...shown.map((c) => c.entity_id)]))}>
          Select all shown
        </button>
        <button className={`${ui.button} ${ui.small}`} disabled={ticked.size === 0} onClick={() => setTicked(new Set())}>
          Select none
        </button>
      </div>
      <ul className={css.scanList}>
        {shown.map((c) => (
          <li key={c.entity_id}>
            <label className={css.scanRow}>
              <input type="checkbox" checked={ticked.has(c.entity_id)} onChange={() => flip(c.entity_id)} />
              <span>
                <strong>{c.name}</strong> <code>{c.entity_id}</code>
                <span className={css.note}>
                  {c.state} {c.unit}
                  {c.area && ` · ${c.area}`}
                  {c.watched && " · watched"}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
