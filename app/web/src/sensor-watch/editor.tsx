/** One sensor's record: its history and the suggestion from it, the bands (or on/off)
 * with their levels and messages, and what counts when it's unavailable. */

import { useCallback, useEffect, useState } from "react";
import { Dialog, Field, Segmented } from "../ui";
import { HistoryChart } from "./chart";
import { FITS, kindOf, levelsOf, swApi, type Profile, type Suggested, type WatchRecord, type WatchView } from "./common";
import { LevelFields, useLevels, type Kind } from "./levels";
import css from "./sensor-watch.module.css";
import ui from "../ui.module.css";

export function RecordDialog({
  entityId,
  record,
  profiles,
  onClose,
  change,
}: {
  entityId: string;
  record?: WatchRecord;
  profiles: Profile[];
  onClose: () => void;
  /** The page's: run the calls, show the view they end with, say `done`. */
  change: (action: () => Promise<WatchView>, done: string) => Promise<boolean>;
}) {
  const [days, setDays] = useState("30");
  const [found, setFound] = useState<Suggested>();
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string>();
  const L = useLevels(record, kindOf(entityId));
  const [name, setName] = useState(record?.name ?? "");
  const [follows, setFollows] = useState(record?.profile ?? "");
  const [attribute, setAttribute] = useState(record?.attribute ?? "");
  const [saving, setSaving] = useState(false);

  /** Its history and a suggestion, as `as` (a number as exact states), or as itself; of
   * `att` (one of its attributes), or of its state. */
  const read = useCallback(async (as?: string, att = attribute) => {
    setReading(true);
    setProblem(undefined);
    try {
      const got = await swApi.get<Suggested>(
        `suggest?entity=${encodeURIComponent(entityId)}&days=${days}${as ? `&kind=${as}` : ""}${att ? `&attribute=${encodeURIComponent(att)}` : ""}`,
      );
      setFound(got);
      // A new one, a new kind, or another attribute starts from the suggestion.
      if (!record || as || att !== (record.attribute ?? "")) L.adopt(got.record);
    } catch (err) {
      setProblem((err as Error).message);
    } finally {
      setReading(false);
    }
  }, [entityId, days, attribute]);

  useEffect(() => {
    read();
    // Read once on opening; "Read again" reads with another number of days.
  }, []);

  const s = found?.suggestion;
  const unit = found?.sensor.unit ?? "";
  // How it can be watched: its own way (a number by bands or exact states), or only
  // whether it's there at all.
  const own = found?.sensor.kind ?? (record?.kind === "available" ? kindOf(entityId) : (record?.kind ?? kindOf(entityId)));
  const modes: [Kind, string][] = [
    ...(own === "numeric"
      ? ([["numeric", "Bands (a range)"], ["state", "Exact states"]] as [Kind, string][])
      : own === "binary"
        ? ([["binary", "On/off"]] as [Kind, string][])
        : ([["state", "Exact states"]] as [Kind, string][])),
    ["available", "Available"],
  ];
  // States to tick into the nominal list: an enum's own, else those seen, with their time.
  const total = Object.values(s?.seconds ?? {}).reduce((a, b) => a + b, 0);
  const seen: [string, number | undefined][] = found?.sensor.options?.length
    ? found.sensor.options.map((o) => [o, total ? (s?.seconds?.[o] ?? 0) / total : undefined])
    : Object.entries(s?.seconds ?? {}).map(([o, n]) => [o, total ? n / total : undefined]);
  // The profiles this sensor may follow (a number: bands or exact states).
  const sensorKind = found?.sensor.kind ?? kindOf(entityId);
  const fitting = profiles.filter((p) => (FITS[sensorKind] ?? []).includes(p.kind));
  const following = profiles.find((p) => p.id === follows);

  const label = name.trim() || record?.label || found?.sensor.name || entityId;
  const put = (body: object) => swApi.put<WatchView>(encodeURIComponent(entityId), body);

  /** Save: its own levels, or following a profile (changing the profile, if its levels
   * were edited here, once the user agrees: it changes every sensor that follows it). */
  const save = async () => {
    if (!L.sane()) return;
    setSaving(true);
    let ok: boolean;
    if (following) {
      const edited = same(levelsOf(following), L.body()) ? null : L.body();
      const others = following.followers - (record?.profile === following.id ? 1 : 0);
      if (edited && others > 0 && !confirm(`Change the profile "${following.name}"? It changes all ${others + 1} sensors that follow it.`)) {
        setSaving(false);
        return;
      }
      ok = await change(async () => {
        if (edited) await swApi.put<WatchView>(`profiles/${following.id}`, { name: following.name, ...edited });
        return put({ profile: following.id, name: name.trim(), attribute });
      }, `${label} follows ${following.name}`);
    } else {
      ok = await change(() => put({ name: name.trim(), ...L.body(), attribute }), `${label} saved`);
    }
    setSaving(false);
    if (ok) onClose();
  };

  /** Make these levels a new profile, and have this sensor follow it. */
  const saveAsProfile = async () => {
    if (!L.sane()) return;
    const title = prompt("Name the new profile (e.g. Mains voltage):")?.trim();
    if (!title) return;
    setSaving(true);
    const ok = await change(async () => {
      const made = await swApi.post<WatchView & { created: string }>("profiles", { name: title, ...L.body() });
      return put({ profile: made.created, name: name.trim(), attribute });
    }, `New profile ${title}; ${label} follows it`);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog
      wide
      tall
      title={record ? `Edit ${record.label ?? entityId}` : `Watch ${found?.sensor.name ?? entityId}`}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.button} disabled={saving} onClick={saveAsProfile} title="Save these levels as a profile other sensors can follow">
            Save as a new profile
          </button>
          <button className={ui.primary} disabled={saving} onClick={save}>
            {record ? "Save" : "Watch it"}
          </button>
        </>
      }
    >
      <p className={css.entity}>
        <code>{entityId}</code>
        {found && (
          <span>
            {attribute && `${attribute} `}now {found.sensor.state} {unit}
            {found.sensor.area && ` · ${found.sensor.area}`}
          </span>
        )}
      </p>

      {(attribute || Object.keys(found?.sensor.attributes ?? {}).length > 0) && (
        <Field label="Watch" help="Its state, or one of its attributes: a thermostat's state is only its mode, so watch its current_temperature or hvac_action.">
          <select
            value={attribute}
            onChange={(e) => {
              setAttribute(e.target.value);
              read(undefined, e.target.value);
            }}
          >
            <option value="">Its state</option>
            {Object.entries(found?.sensor.attributes ?? {}).map(([k, v]) => (
              <option key={k} value={k}>
                {k} (now {v})
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className={css.history}>
        <div className={css.historyHead}>
          <span>
            {reading
              ? "Reading its history…"
              : found
                ? `${found.source === "statistics" ? "Hourly statistics" : "State history"} from ${found.first ? new Date(found.first).toLocaleDateString() : "nothing"}${
                    found.source === "history" ? " (Home Assistant keeps state history 10 days by default)" : ""
                  }`
                : problem ?? ""}
          </span>
          <label className={css.days}>
            <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} aria-label="Days of history" /> days
          </label>
          <button className={`${ui.button} ${ui.small}`} disabled={reading} onClick={() => read(L.kind)}>
            Read again
          </button>
        </div>
        <Segmented
          value={L.kind}
          options={modes}
          onChange={(k) => {
            L.setKind(k);
            read(k);
          }}
        />
        {found?.points && L.kind === "numeric" && <HistoryChart points={found.points} bands={L.drawn()} unit={unit} />}
        {s && L.kind === "numeric" && s.count !== undefined && (
          <p className={css.note}>
            {s.count} samples, mean {s.mean?.toPrecision(4)} {unit}, from {s.min?.toPrecision(4)} to {s.max?.toPrecision(4)}.
            {s.outlier_count ? ` Set aside as outliers (worth a look): ${s.outliers?.map((o) => o.toPrecision(4)).join(", ")}${s.outlier_count > (s.outliers?.length ?? 0) ? " …" : ""}.` : " No outliers."}
          </p>
        )}
        {s && L.kind === "binary" && s.share !== undefined && (
          <p className={css.note}>
            It's {s.nominal} {Math.round(s.share * 100)}% of the time, so that's suggested as nominal.
          </p>
        )}
        {found?.problem && <p className={css.problem}>{found.problem}. Is Home Assistant's History integration loaded? Set it up yourself meanwhile.</p>}
        {found?.default && !record && !following && (
          <p className={css.note}>Set up by what it is (its kind and device class), not its history: change anything you like.</p>
        )}
        {found && !s && !found.problem && !found.default && <p className={css.note}>No history to suggest from: set it up yourself.</p>}
        {record && found?.record && !following && (
          <button className={`${ui.button} ${ui.small}`} onClick={() => L.adopt(found.record)}>
            Use the suggestion
          </button>
        )}
      </div>

      {fitting.length > 0 && (
        <Field
          label="Follows"
          help={
            following
              ? `Its levels come from the profile ${following.name}, followed by ${following.followers} sensors: editing them here changes the profile.`
              : "Its own levels, or a profile's (the same levels for many sensors, said once)."
          }
        >
          <select
            value={follows}
            onChange={(e) => {
              setFollows(e.target.value);
              const p = profiles.find((x) => x.id === e.target.value);
              if (p) L.adopt(p);
            }}
          >
            <option value="">Its own levels</option>
            {fitting.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.followers} following)
              </option>
            ))}
          </select>
        </Field>
      )}
      <LevelFields
        L={L}
        unit={unit}
        seen={seen}
        seenLabel={found?.sensor.options?.length ? "Its states" : "Seen"}
        extra={
          <Field label="Name" help="Leave empty to use Home Assistant's name.">
            <input value={name} maxLength={80} placeholder={found?.sensor.name ?? record?.label} onChange={(e) => setName(e.target.value)} />
          </Field>
        }
      />
    </Dialog>
  );
}

/** The same levels, whatever order their keys came in? */
function same(a: object, b: object): boolean {
  const canon = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)).map(([k, w]) => [k, canon(w)])) : v;
  const { followers: _f, id: _i, ...rest } = a as Profile;
  return JSON.stringify(canon(rest)) === JSON.stringify(canon(b));
}
