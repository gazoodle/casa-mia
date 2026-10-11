/** One sensor's record: its history and the suggestion from it, the bands (or on/off)
 * with their levels and messages, and what counts when it's unavailable. */

import { useCallback, useEffect, useState } from "react";
import { Dialog, Field, Segmented } from "../ui";
import { HistoryChart } from "./chart";
import { LEVELS, LEVEL_NAMES, kindOf, swApi, type Band, type Level, type StateLevel, type Suggested, type WatchRecord } from "./common";
import css from "./sensor-watch.module.css";
import ui from "../ui.module.css";

type Draft = { from: string; to: string; level: Level; message: string };

const toDraft = (b: Band): Draft => ({ from: b.from === null ? "" : String(b.from), to: b.to === null ? "" : String(b.to), level: b.level, message: b.message });
const toBand = (d: Draft): Band => ({ from: d.from.trim() === "" ? null : Number(d.from), to: d.to.trim() === "" ? null : Number(d.to), level: d.level, message: d.message });

export function RecordDialog({
  entityId,
  record,
  onClose,
  onSave,
}: {
  entityId: string;
  record?: WatchRecord;
  onClose: () => void;
  onSave: (record: Omit<WatchRecord, "entity_id">) => Promise<boolean>;
}) {
  const [days, setDays] = useState("30");
  const [found, setFound] = useState<Suggested>();
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [kind, setKind] = useState(record?.kind ?? kindOf(entityId));
  const [bands, setBands] = useState<Draft[]>((record?.bands ?? []).map(toDraft));
  const [otherwise, setOtherwise] = useState<Level>(record?.otherwise ?? "error");
  const [nominal, setNominal] = useState<"on" | "off">(record?.nominal ?? "off");
  const [other, setOther] = useState<Level>(record?.other ?? "warning");
  const [message, setMessage] = useState(record?.message ?? "");
  const [states, setStates] = useState((record?.states ?? []).join(", "));
  const [exceptions, setExceptions] = useState<StateLevel[]>(record?.exceptions ?? []);
  const [unavailable, setUnavailable] = useState<Level | "ignore">(record?.unavailable ?? "error");
  const [holdOff, setHoldOff] = useState(String(record?.hold_off ?? 60));
  const [name, setName] = useState(record?.name ?? "");
  const [saving, setSaving] = useState(false);

  const adopt = (r: Omit<WatchRecord, "entity_id">) => {
    setKind(r.kind);
    setBands((r.bands ?? []).map(toDraft));
    if (r.otherwise) setOtherwise(r.otherwise);
    if (r.nominal) setNominal(r.nominal);
    if (r.other) setOther(r.other);
    if (r.states) setStates(r.states.join(", "));
    setExceptions(r.exceptions ?? []);
  };

  /** Its history and a suggestion, as `as` (a number as exact states), or as itself. */
  const read = useCallback(async (as?: string) => {
    setReading(true);
    setProblem(undefined);
    try {
      const got = await swApi.get<Suggested>(`suggest?entity=${encodeURIComponent(entityId)}&days=${days}${as ? `&kind=${as}` : ""}`);
      setFound(got);
      if (!record || as) adopt(got.record); // a new one, or a new kind, starts from the suggestion
    } catch (err) {
      setProblem((err as Error).message);
    } finally {
      setReading(false);
    }
  }, [entityId, days]);

  useEffect(() => {
    read();
    // Read once on opening; "Read again" reads with another number of days.
  }, []);

  const s = found?.suggestion;
  const unit = found?.sensor.unit ?? "";
  // A number can be watched by bands or by exact states; text only by exact states.
  const canSwitch = (found?.sensor.kind ?? (record?.kind === "binary" ? "binary" : "numeric")) === "numeric";
  // States to tick into the nominal list: an enum's own, else those seen, with their time.
  const total = Object.values(s?.seconds ?? {}).reduce((a, b) => a + b, 0);
  const seen: [string, number | undefined][] = found?.sensor.options?.length
    ? found.sensor.options.map((o) => [o, total ? (s?.seconds?.[o] ?? 0) / total : undefined])
    : Object.entries(s?.seconds ?? {}).map(([o, n]) => [o, total ? n / total : undefined]);
  const save = async () => {
    setSaving(true);
    const body = {
      kind: kind ?? found?.sensor.kind ?? "numeric",
      name: name.trim(),
      hold_off: Number(holdOff),
      unavailable,
      ...(kind === "binary"
        ? { nominal, other, message }
        : kind === "state"
          ? { states: split(states), other, message, exceptions: exceptions.filter((e) => e.state.trim()) }
          : { bands: bands.map(toBand), otherwise }),
    };
    const ok = await onSave(body);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog
      wide
      title={record ? `Edit ${record.label ?? entityId}` : `Watch ${found?.sensor.name ?? entityId}`}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
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
            now {found.sensor.state} {unit}
            {found.sensor.area && ` · ${found.sensor.area}`}
          </span>
        )}
      </p>

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
          <button className={`${ui.button} ${ui.small}`} disabled={reading} onClick={() => read(kind)}>
            Read again
          </button>
        </div>
        {canSwitch && (
          <Segmented
            value={kind}
            options={[["numeric", "Bands (a range)"], ["state", "Exact states"]]}
            onChange={(k) => {
              setKind(k);
              read(k);
            }}
          />
        )}
        {found?.points && kind === "numeric" && <HistoryChart points={found.points} bands={bands.map(toBand)} unit={unit} />}
        {s && kind === "numeric" && s.count !== undefined && (
          <p className={css.note}>
            {s.count} samples, mean {s.mean?.toPrecision(4)} {unit}, from {s.min?.toPrecision(4)} to {s.max?.toPrecision(4)}.
            {s.outlier_count ? ` Set aside as outliers (worth a look): ${s.outliers?.map((o) => o.toPrecision(4)).join(", ")}${s.outlier_count > (s.outliers?.length ?? 0) ? " …" : ""}.` : " No outliers."}
          </p>
        )}
        {s && kind === "binary" && s.share !== undefined && (
          <p className={css.note}>
            {s.nominal} {Math.round(s.share * 100)}% of the time.
          </p>
        )}
        {found?.problem && <p className={css.problem}>{found.problem}. Is Home Assistant's History integration loaded? Set it up yourself meanwhile.</p>}
        {found?.default && (
          <p className={css.note}>Set up by what it is (its kind and device class), not its history: change anything you like.</p>
        )}
        {found && !s && !found.problem && !found.default && <p className={css.note}>No history to suggest from: set it up yourself.</p>}
        {record && found?.record && (
          <button className={`${ui.button} ${ui.small}`} onClick={() => adopt(found.record)}>
            Use the suggestion
          </button>
        )}
      </div>

      {kind === "binary" && (
        <div className={css.binary}>
          <label className={css.tick}>
            <input type="checkbox" checked={nominal === "on"} onChange={(e) => setNominal(e.target.checked ? "on" : "off")} />
            <span>
              Nominal when on
              <span className={css.note}>Ticked, on is all well (a pump running); unticked, off is (a door closed, no leak).</span>
            </span>
          </label>
          <Field label={`When ${nominal === "on" ? "off" : "on"}`} help="Its level in the other state.">
            <LevelSelect value={other} onChange={(v) => setOther(v as Level)} />
          </Field>
          <Field label="Message" help="What it says in the other state, e.g. Back door open.">
            <input value={message} maxLength={80} onChange={(e) => setMessage(e.target.value)} />
          </Field>
        </div>
      )}
      {kind === "state" && (
        <div className={css.binary}>
          <Field label="Nominal states" help="Separated by commas: 0, or idle, standby. Anything else gets the level beside.">
            <input value={states} onChange={(e) => setStates(e.target.value)} placeholder="e.g. 0" />
          </Field>
          <Field label="Anything else" help="Its level in any other state.">
            <LevelSelect value={other} onChange={(v) => setOther(v as Level)} />
          </Field>
          <Field label="Message" help="What it says in another state, e.g. Alarm raised.">
            <input value={message} maxLength={80} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Exceptions items={exceptions} onChange={setExceptions} />
          {seen.length > 0 && (
            <p className={css.seen}>
              {found?.sensor.options?.length ? "Its states" : "Seen"}:{" "}
              {seen.map(([state, share]) => (
                <button key={state} className={`${ui.button} ${ui.small}`} onClick={() => setStates(toggle(states, state))}>
                  {listed(states, state) ? "✓ " : ""}
                  {state}
                  {share !== undefined && ` · ${Math.round(share * 100)}%`}
                </button>
              ))}
            </p>
          )}
        </div>
      )}
      {kind === "numeric" && <BandsEditor bands={bands} onChange={setBands} unit={unit} />}

      {kind && (
      <div className={css.settings}>
        {kind === "numeric" && (
          <Field label="Outside every band" help="The level of a value no band covers.">
            <LevelSelect value={otherwise} onChange={(v) => setOtherwise(v as Level)} />
          </Field>
        )}
        <Field label="When unavailable" help="Unavailable is often the first sign of trouble.">
          <LevelSelect value={unavailable} ignore onChange={setUnavailable} />
        </Field>
        <Field label="Hold-off (seconds)" help="How long a new level must last before it counts.">
          <input type="number" min={0} max={86400} value={holdOff} onChange={(e) => setHoldOff(e.target.value)} />
        </Field>
        <Field label="Name" help="Leave empty to use Home Assistant's name.">
          <input value={name} maxLength={80} placeholder={found?.sensor.name ?? record?.label} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
      )}
    </Dialog>
  );
}

function LevelSelect({ value, ignore, onChange }: { value: string; ignore?: boolean; onChange: (v: Level | "ignore") => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Level | "ignore")}>
      {LEVELS.map((l) => (
        <option key={l} value={l}>
          {LEVEL_NAMES[l]}
        </option>
      ))}
      {ignore && <option value="ignore">Ignore</option>}
    </select>
  );
}

function BandsEditor({ bands, onChange, unit }: { bands: Draft[]; onChange: (b: Draft[]) => void; unit: string }) {
  const set = (i: number, part: Partial<Draft>) => onChange(bands.map((b, n) => (n === i ? { ...b, ...part } : b)));
  return (
    <div className={css.bands}>
      <div className={`${css.bandRow} ${css.bandHead}`}>
        <span>From {unit && `(${unit})`}</span>
        <span>To</span>
        <span>Level</span>
        <span>Message</span>
        <span />
      </div>
      {bands.map((b, i) => (
        <div key={i} className={`${css.bandRow} ${css[`edge_${b.level}`]}`}>
          <input inputMode="decimal" placeholder="open" value={b.from} onChange={(e) => set(i, { from: e.target.value })} aria-label="From" />
          <input inputMode="decimal" placeholder="open" value={b.to} onChange={(e) => set(i, { to: e.target.value })} aria-label="To" />
          <LevelSelect value={b.level} onChange={(v) => set(i, { level: v as Level })} />
          <input placeholder={b.level === "task" ? "e.g. Top up the salt" : ""} maxLength={80} value={b.message} onChange={(e) => set(i, { message: e.target.value })} aria-label="Message" />
          <button className={`${ui.button} ${ui.small}`} onClick={() => onChange(bands.filter((_, n) => n !== i))} aria-label="Remove this band">
            ✕
          </button>
        </div>
      ))}
      <p className={css.note}>
        From is included, To is not; leave either empty for open-ended. A value in no band takes the level below.
      </p>
      <button className={`${ui.button} ${ui.small}`} onClick={() => onChange([...bands, { from: "", to: "", level: "warning", message: "" }])}>
        + Add band
      </button>
    </div>
  );
}

const split = (list: string) =>
  list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Is `state` in the comma-separated list? */
function listed(list: string, state: string): boolean {
  return split(list).includes(state);
}

/** The list with `state` added, or taken out if it was there. */
function toggle(list: string, state: string): string {
  const items = split(list);
  return (items.includes(state) ? items.filter((s) => s !== state) : [...items, state]).join(", ");
}

/** States with a level of their own (a lock: jammed is an error, though unlocked is a task). */
function Exceptions({ items, onChange }: { items: StateLevel[]; onChange: (items: StateLevel[]) => void }) {
  const set = (i: number, part: Partial<StateLevel>) => onChange(items.map((e, n) => (n === i ? { ...e, ...part } : e)));
  return (
    <div className={css.exceptions}>
      {items.length > 0 && <span className={css.note}>States with a level of their own:</span>}
      {items.map((e, i) => (
        <div key={i} className={`${css.exceptionRow} ${css[`edge_${e.level}`]}`}>
          <input value={e.state} placeholder="a state, e.g. jammed" onChange={(ev) => set(i, { state: ev.target.value })} aria-label="State" />
          <LevelSelect value={e.level} onChange={(v) => set(i, { level: v as Level })} />
          <input value={e.message} maxLength={80} placeholder="its message" onChange={(ev) => set(i, { message: ev.target.value })} aria-label="Message" />
          <button className={`${ui.button} ${ui.small}`} onClick={() => onChange(items.filter((_, n) => n !== i))} aria-label="Remove this state">
            ✕
          </button>
        </div>
      ))}
      <button className={`${ui.button} ${ui.small}`} onClick={() => onChange([...items, { state: "", level: "error", message: "" }])}>
        + A state with its own level
      </button>
    </div>
  );
}
