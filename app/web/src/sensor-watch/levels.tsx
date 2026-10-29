/** A set of levels being edited: bands (or on/off, or exact states), what's outside them,
 * unavailable and the hold-off. Shared by a sensor's editor and a profile's. */

import { useState, type ReactNode } from "react";
import { Field } from "../ui";
import { LEVELS, LEVEL_NAMES, margin, type Accuracy, type Band, type Level, type Side, type StateLevel, type WatchRecord } from "./common";
import css from "./sensor-watch.module.css";
import ui from "../ui.module.css";
import { Select } from "../controls";
import { Slider } from "../controls";
import { moved, nudge, problemOf, toBands, toLadder, type Ladder, type Rung } from "./ladder";

export type Kind = WatchRecord["kind"];
// A message may be 255 characters; past 80, notifications and cards may cut it short.
const MAX_MESSAGE = 255;
const LONG = 80;
const LONG_HELP = `Up to ${MAX_MESSAGE} characters; keep it under ${LONG} to be shown whole in notifications and on cards.`;

/** The levels' state, from a record or profile (or none: a new one of `kind`). */
export function useLevels(start: Partial<WatchRecord> | undefined, kind: Kind) {
  const [k, setKind] = useState<Kind>(start?.kind ?? kind);
  const [otherwise, setOtherwise] = useState<Level>(start?.otherwise ?? "error");
  const [opened, setOpened] = useState(() => toLadder(start?.bands ?? [], start?.otherwise ?? "error"));
  const [ladder, setLadder] = useState<Ladder>(opened.ladder);
  // The nominal edge being typed in and its value before, for the nudge; any other edit ends it.
  const [edited, setEdited] = useState<{ side: "low" | "high"; was: string } | null>(null);
  const [off, setOff] = useState<Side>(start?.off ?? { level: "nominal", message: "" });
  const [on, setOn] = useState<Side>(start?.on ?? { level: "warning", message: "" });
  const [other, setOther] = useState<Level>(start?.other ?? "warning");
  const [available, setAvailable] = useState<Side>(start?.available ?? { level: "nominal", message: "" });
  const [message, setMessage] = useState(start?.message ?? "");
  const [states, setStates] = useState((start?.states ?? []).join(", "));
  const [exceptions, setExceptions] = useState<StateLevel[]>(start?.exceptions ?? []);
  const [unavailable, setUnavailable] = useState<Level | "ignore">(start?.unavailable ?? "error");
  const [holdOff, setHoldOff] = useState(String(start?.hold_off ?? 60));
  const [goneHold, setGoneHold] = useState(String(start?.unavailable_hold ?? 300));
  const [daysUntil, setDaysUntil] = useState(start?.days_until ?? false);
  const [escalate, setEscalate] = useState<Partial<Record<Level, number>>>(start?.escalate ?? {});
  const [accuracyAmount, setAccuracyAmount] = useState(start?.accuracy ? String(start.accuracy.amount) : "");
  const [accuracyPercent, setAccuracyPercent] = useState(start?.accuracy?.percent ?? true);

  /** Take another set of levels (a suggestion, a profile). */
  const adopt = (r: Partial<WatchRecord>) => {
    if (r.kind) setKind(r.kind);
    const next = toLadder(r.bands ?? [], r.otherwise ?? otherwise);
    setOpened(next);
    setLadder(next.ladder);
    setEdited(null);
    if (r.otherwise) setOtherwise(r.otherwise);
    if (r.off) setOff(r.off);
    if (r.on) setOn(r.on);
    if (r.other) setOther(r.other);
    if (r.available) setAvailable(r.available);
    if (r.message !== undefined) setMessage(r.message);
    if (r.states) setStates(r.states.join(", "));
    setExceptions(r.exceptions ?? []);
    if (r.unavailable) setUnavailable(r.unavailable);
    if (r.hold_off !== undefined) setHoldOff(String(r.hold_off));
    if (r.unavailable_hold !== undefined) setGoneHold(String(r.unavailable_hold));
    setDaysUntil(r.days_until ?? false);
    setEscalate(r.escalate ?? {});
    setAccuracyAmount(r.accuracy ? String(r.accuracy.amount) : "");
    setAccuracyPercent(r.accuracy?.percent ?? true);
  };

  /** The accuracy as the app takes it; none when empty or 0. */
  const accuracy = (): Accuracy | undefined => {
    const amount = Number(accuracyAmount);
    return accuracyAmount.trim() && amount > 0 ? { amount, percent: accuracyPercent } : undefined;
  };

  /** The levels as the app takes them. */
  const body = () => ({
    kind: k,
    hold_off: Number(holdOff),
    unavailable_hold: Number(goneHold),
    unavailable,
    ...(Object.values(escalate).some(Boolean) ? { escalate } : {}),
    ...(k === "binary"
      ? { off, on }
      : k === "available"
        ? { available, message }
      : k === "state"
        ? { states: split(states), other, message, exceptions: exceptions.filter((e) => e.state.trim()) }
        : { bands: toBands(ladder), otherwise, ...(daysUntil ? { days_until: true } : {}), ...(accuracy() ? { accuracy: accuracy() } : {}) }),
  });

  /** Why the bands can't be saved (shown under them as they are edited), or "". */
  const problem = (k === "numeric" && problemOf(ladder)) || "";
  const sane = async () => !problem;

  return {
    kind: k, setKind, ladder, setLadder, promoted: opened.promoted, edited, setEdited, otherwise, setOtherwise, off, setOff, on, setOn, other, setOther, available, setAvailable, message, setMessage,
    states, setStates, exceptions, setExceptions, unavailable, setUnavailable, holdOff, setHoldOff, goneHold, setGoneHold, daysUntil, setDaysUntil,
    accuracyAmount, setAccuracyAmount, accuracyPercent, setAccuracyPercent, accuracy, escalate, setEscalate,
    adopt, body, sane, problem, drawn: () => toBands(ladder),
  };
}

export type Levels = ReturnType<typeof useLevels>;

/** The fields for `L`: by its kind, then outside every band, unavailable, hold-off and
 * `extra` (a sensor's name). `seen`: states to tick into the nominal list, with their share. */
export function LevelFields({ L, unit = "", seen = [], seenLabel = "Seen", extra }: { L: Levels; unit?: string; seen?: [string, number | undefined][]; seenLabel?: string; extra?: ReactNode }) {
  return (
    <>
      {L.kind === "binary" && (
        <div className={css.bands}>
          {(
            [
              ["off", L.off, L.setOff, "e.g. Pump stopped"],
              ["on", L.on, L.setOn, "e.g. Leak detected"],
            ] as const
          ).map(([state, side, set, hint]) => (
            <div key={state} className={`${css.sideRow} ${css[`edge_${side.level}`]}`}>
              <strong>When {state}</strong>
              <LevelSelect value={side.level} onChange={(v) => set({ ...side, level: v as Level })} />
              <MessageInput placeholder={side.level === "nominal" ? "" : hint} value={side.message} onChange={(v) => set({ ...side, message: v })} />
            </div>
          ))}
          <p className={css.note}>
            Each state its own level and message: a leak sensor is Nominal when off and Critical when on; a pump that should run is Nominal when on
            and an Error when off; or neither nominal. {LONG_HELP}
          </p>
        </div>
      )}
      {L.kind === "available" && (
        <div className={css.bands}>
          <div className={`${css.sideRow} ${css[`edge_${L.available.level}`]}`}>
            <strong>When available</strong>
            <LevelSelect value={L.available.level} onChange={(v) => L.setAvailable({ ...L.available, level: v as Level })} />
            <MessageInput
              placeholder={L.available.level === "nominal" ? "" : "e.g. It's back, and it should be gone"}
              value={L.available.message}
              onChange={(v) => L.setAvailable({ ...L.available, message: v })}
            />
          </div>
          <div className={`${css.sideRow} ${css[`edge_${L.unavailable}`]}`}>
            <strong>When unavailable</strong>
            <LevelSelect value={L.unavailable} ignore onChange={L.setUnavailable} />
            <MessageInput placeholder={L.unavailable === "nominal" ? "" : "e.g. Gone: is it switched off?"} value={L.message} onChange={L.setMessage} />
          </div>
          <p className={css.note}>
            Only whether it's there, whatever its state (unknown counts as there). Unavailable includes gone from Home Assistant: renamed, or its integration
            removed. Either way round: a bulb that should be there, or something retired that shouldn't come back. A long hold-off forgives a lamp switched off at
            the wall. {LONG_HELP}
          </p>
        </div>
      )}
      {L.kind === "state" && (
        <div className={css.binary}>
          <Field label="Nominal states" help="Separated by commas: 0, or idle, standby. Anything else gets the level beside.">
            <input value={L.states} onChange={(e) => L.setStates(e.target.value)} placeholder="e.g. 0" />
          </Field>
          <Field label="Anything else" help="Its level in any other state.">
            <LevelSelect value={L.other} onChange={(v) => L.setOther(v as Level)} />
          </Field>
          <Field label="Message" help={`What it says in another state, e.g. Alarm raised. ${LONG_HELP}`}>
            <MessageInput value={L.message} onChange={L.setMessage} />
          </Field>
          <Exceptions items={L.exceptions} onChange={L.setExceptions} />
          {seen.length > 0 && (
            <p className={css.seen}>
              {seenLabel}:{" "}
              {seen.map(([state, share]) => (
                <button key={state} className={`${ui.button} ${ui.small}`} onClick={() => L.setStates(toggle(L.states, state))}>
                  {listed(L.states, state) ? "✓ " : ""}
                  {state}
                  {share !== undefined && ` · ${Math.round(share * 100)}%`}
                </button>
              ))}
            </p>
          )}
        </div>
      )}
      {L.kind === "numeric" && <LadderEditor L={L} unit={unit} />}
      {L.kind === "numeric" && L.problem && (
        <span className={ui.fieldBad} role="alert">
          {L.problem}
        </span>
      )}

      <div className={css.settings}>
        {L.kind === "numeric" && (
          <Field label="A date: days until it" help="Its state is a date (a reminder due): the bands are the days until it, negative once it's passed.">
            <input type="checkbox" checked={L.daysUntil} onChange={(e) => L.setDaysUntil(e.target.checked)} />
          </Field>
        )}
        {L.kind === "numeric" && (
          <Field label="Not a number" help="The level of a state that isn't a number (a sensor reporting text, or a date it can't read).">
            <LevelSelect value={L.otherwise} onChange={(v) => L.setOtherwise(v as Level)} />
          </Field>
        )}
        {L.kind === "numeric" && (
          <Field
            label="Accuracy"
            help="How far the meter may be out, as a % of the edge or in its unit. A reading that close to an edge holds its level: worse only once surely past it, better as soon as back inside. Empty for none."
          >
            <span className={css.accuracy}>
              ±
              <input inputMode="decimal" placeholder="none" value={L.accuracyAmount} onChange={(e) => L.setAccuracyAmount(e.target.value)} aria-label="Accuracy" />
              <Select value={L.accuracyPercent ? "%" : "unit"} onChange={(v) => L.setAccuracyPercent(v === "%")}>
                <option value="%">%</option>
                <option value="unit">{unit || "in its unit"}</option>
              </Select>
            </span>
            {(() => {
              const narrow = tooNarrow(L.drawn(), L.accuracy());
              return narrow && <span className={css.note}>Wider than half of the band {narrow}: a reading may step through it in one go.</span>;
            })()}
          </Field>
        )}
        {L.kind !== "available" && (
          <Field label="When unavailable" help="Unavailable is often the first sign of trouble.">
            <LevelSelect value={L.unavailable} ignore onChange={L.setUnavailable} />
          </Field>
        )}
        {L.kind !== "available" && L.unavailable !== "ignore" && (
          <Field label="Unavailable for" help="How long it must be unavailable before that counts: a restart, a reload or a car asleep is usual, not trouble.">
            <Slider value={Number(L.goneHold) || 0} steps={HOLD_OFFS} format={seconds} ends={["none", "a day"]} onChange={(v) => L.setGoneHold(String(v))} />
          </Field>
        )}
        <Field
          label="Hold-off"
          help={L.kind === "available" ? "How long it must be unavailable (or back) before that counts." : "How long a worse level must last before it counts. A better one counts at once."}
        >
          <Slider value={Number(L.holdOff) || 0} steps={HOLD_OFFS} format={seconds} ends={["none", "a day"]} onChange={(v) => L.setHoldOff(String(v))} />
        </Field>
        {extra}
        {/* A row of its own: three sliders don't fit one of the grid's columns. */}
        <div className={css.escalateRow}>
          <Field
            label="Escalate"
            help="A level left standing moves up: having been at it this long (timed from when it began), it shows the next one up, then that one's wait starts. Back to a better level starts again."
          >
            <span className={css.escalate}>
              {LEVELS.slice(1, -1).map((lv, i) => (
                <span key={lv}>
                  {LEVEL_NAMES[lv]} → {LEVEL_NAMES[LEVELS[i + 2]]}
                  <Slider
                    value={L.escalate[lv] ?? 0}
                    steps={ESCALATIONS}
                    format={(s) => (s ? `after ${seconds(s)}` : "never")}
                    ends={["never", "90 days"]}
                    onChange={(v) => L.setEscalate({ ...L.escalate, [lv]: v })}
                  />
                </span>
              ))}
            </span>
          </Field>
        </div>
      </div>
    </>
  );
}

/** The first band whose edges' doubt overlaps (more than half its width), as "126–127". */
function tooNarrow(bands: Band[], a?: Accuracy): string | null {
  for (const b of bands) {
    if (b.from === null || b.to === null || !a) continue;
    if (margin(b.from, a) + margin(b.to, a) > b.to - b.from) return `${b.from}–${b.to}`;
  }
  return null;
}

/** `beyond`: offer only the levels worse than it (and the one chosen, should it not be). */
function LevelSelect({ value, ignore, beyond, onChange }: { value: string; ignore?: boolean; beyond?: Level; onChange: (v: Level | "ignore") => void }) {
  const offered = beyond ? LEVELS.filter((l) => l === value || LEVELS.indexOf(l) > LEVELS.indexOf(beyond)) : LEVELS;
  return (
    <Select value={value} onChange={(picked) => onChange(picked as Level | "ignore")}>
      {offered.map((l) => (
        <option key={l} value={l}>
          {LEVEL_NAMES[l]}
        </option>
      ))}
      {ignore && <option value="ignore">Ignore</option>}
    </Select>
  );
}

/** The bands as a ladder out from nominal: the bands going up (highest first), nominal's
 * window, the bands going down. Each band beyond types only its far edge. */
function LadderEditor({ L, unit }: { L: Levels; unit: string }) {
  const l = L.ladder;
  const edit = (next: Ladder) => {
    L.setEdited(null);
    L.setLadder(next);
  };
  const edge = (side: "low" | "high", value: string) => {
    if (L.edited?.side !== side) L.setEdited({ side, was: l[side] });
    L.setLadder({ ...l, [side]: value });
  };
  const by = L.edited && moved(L.edited.was, l[L.edited.side]);
  const sign = by && (by > 0 ? `+${by}` : `−${-by}`);

  /** The rows of one side, nearest first: its level, its edge, its message. */
  const rungs = (way: "up" | "down") =>
    l[way].map((r, i) => {
      const set = (part: Partial<Rung>) => edit({ ...l, [way]: l[way].map((x, n) => (n === i ? { ...x, ...part } : x)) });
      const near = (i ? l[way][i - 1].edge : way === "up" ? l.high : l.low) || "…";
      const outermost = i === l[way].length - 1;
      return (
        <div key={`${way}${i}`} className={`${css.bandRow} ${css[`edge_${r.level}`]}`}>
          <LevelSelect value={r.level} beyond={i ? l[way][i - 1].level : "nominal"} onChange={(v) => set({ level: v as Level })} />
          {outermost ? (
            <span className={css.rungEdge}>
              {way === "up" ? "above" : "below"} {near}
            </span>
          ) : (
            <span className={css.rungEdge}>
              {way === "up" ? "up to" : "down to"}
              <input inputMode="decimal" placeholder="edge" value={r.edge} onChange={(e) => set({ edge: e.target.value })} aria-label={`${LEVEL_NAMES[r.level]} ${way} to`} />
            </span>
          )}
          <MessageInput placeholder={r.level === "task" ? "e.g. Top up the salt" : ""} value={r.message} onChange={(v) => set({ message: v })} />
          <button className={`${ui.button} ${ui.small}`} onClick={() => edit({ ...l, [way]: l[way].filter((_, n) => n !== i) })} aria-label={`Remove ${LEVEL_NAMES[r.level]}`}>
            ✕
          </button>
        </div>
      );
    });

  /** "+ Band above" (or below): one worse than the outermost; none past Critical. */
  const add = (way: "up" | "down") => {
    const outer = l[way].length ? l[way][l[way].length - 1].level : "nominal";
    const level = outer === "nominal" ? "warning" : LEVELS[LEVELS.indexOf(outer) + 1];
    return (
      level && (
        <button className={`${ui.button} ${ui.small}`} onClick={() => edit({ ...l, [way]: [...l[way], { edge: "", level, message: "" }] })}>
          + Band {way === "up" ? "above" : "below"}
        </button>
      )
    );
  };

  return (
    <div className={css.bands}>
      {add("up")}
      {rungs("up").reverse()}
      <div className={`${css.bandRow} ${css.edge_nominal}`}>
        <strong>Nominal</strong>
        <span className={css.rungEdge}>
          <input inputMode="decimal" placeholder="open" value={l.low} onChange={(e) => edge("low", e.target.value)} aria-label="Nominal from" />
          to
          <input inputMode="decimal" placeholder="open" value={l.high} onChange={(e) => edge("high", e.target.value)} aria-label="Nominal to" />
          {unit}
        </span>
        <MessageInput value={l.message} onChange={(v) => edit({ ...l, message: v })} />
        <span />
      </div>
      {L.edited && by && (
        <span className={css.nudge}>
          Move too:
          <button className={`${ui.button} ${ui.small}`} onClick={() => edit(nudge(l, L.edited!.side, by, false))}>
            Bands {L.edited.side === "high" ? "above" : "below"} {sign}
          </button>
          <button className={`${ui.button} ${ui.small}`} onClick={() => edit(nudge(l, L.edited!.side, by, true))}>
            Everything {sign}
          </button>
        </span>
      )}
      {rungs("down")}
      {add("down")}
      {L.promoted && (
        <p className={css.note}>
          No band was nominal: {L.promoted.from ?? "below"}–{L.promoted.to ?? "above"} ({LEVEL_NAMES[L.promoted.level]}) is shown as Nominal, and saves as Nominal.
        </p>
      )}
      <p className={css.note}>
        Out from nominal, each band starts where the one inside it ends and is worse than it. An edge belongs to the band above it. Leave a nominal edge empty for
        open (a battery is nominal from 30% up). {LONG_HELP}
      </p>
    </div>
  );
}

/** A message box, flagged (with its length) past the length that shows whole everywhere. */
function MessageInput({ value, placeholder, onChange }: { value: string; placeholder?: string; onChange: (v: string) => void }) {
  const long = value.length > LONG;
  return (
    <span className={css.message}>
      <input className={long ? css.long : undefined} value={value} maxLength={MAX_MESSAGE} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-label="Message" />
      {long && (
        <span className={css.longNote}>
          {value.length}/{MAX_MESSAGE}: notifications and cards may cut it short
        </span>
      )}
    </span>
  );
}

/** A hold-off's steps, seconds: fine where it matters (the first minutes), up to a day. */
const HOLD_OFFS = [0, 10, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 21600, 43200, 86400];

/** An escalation's steps, seconds: never, then an hour to 90 days. */
const ESCALATIONS = [0, 3600, 21600, 43200, 86400, 2 * 86400, 3 * 86400, 7 * 86400, 14 * 86400, 30 * 86400, 90 * 86400];

function seconds(s: number): string {
  if (s === 0) return "none";
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${+(s / 60).toFixed(1)} min`;
  if (s < 86400) return `${+(s / 3600).toFixed(1)} h`;
  return `${+(s / 86400).toFixed(1)} day${s === 86400 ? "" : "s"}`;
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
          <MessageInput value={e.message} placeholder="its message" onChange={(v) => set(i, { message: v })} />
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
