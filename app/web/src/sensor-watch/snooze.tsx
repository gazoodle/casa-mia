/** Snooze, on a row of the page (watched.tsx, system.tsx): a fault you know about put out
 * of the way until a time, or a snoozed one put back. It calls Sensor Watch's snooze and
 * unsnooze actions as whoever is signed in, so the row can say who. What may be snoozed,
 * and what ends a snooze early, is the integration's to decide (its snooze.py). */

import { useState } from "react";
import { Select } from "../controls";
import type { Toast } from "../ui";
import type { Live } from "./common";
import { act } from "./ha";
import css from "./sensor-watch.module.css";
import ui from "../ui.module.css";

// In hours.
const FOR: [string, number][] = [
  ["4 hours", 4],
  ["1 day", 24],
  ["1 week", 168],
  ["30 days", 720],
];
const DATE = "date"; // the choice that asks for a date and time
/** A time as a datetime-local field holds it: local, to the minute. */
const field = (at: number) => new Date(at - new Date(at).getTimezoneOffset() * 60e3).toISOString().slice(0, 16);

/** Can it be snoozed? Not one at critical, nor one rolled up into its integration (that
 * is the row to snooze); the integration refuses both as well. */
export const snoozable = (l?: Live) => !!l && !l.snoozed && !l.under && l.level !== "nominal" && l.level !== "critical";

/** "snoozed until 27 Nov, 09:00 by Sam", for a row's note. */
export function snoozedUntil(l: Live): string {
  if (!l.snoozed) return "";
  const until = new Date(l.snoozed.until).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return `snoozed until ${until}${l.snoozed.by ? ` by ${l.snoozed.by}` : ""}`;
}

export function SnoozeControl({ row, say }: { row: Live; say: (text: string, tone?: Toast["tone"]) => void }) {
  const [when, setWhen] = useState<string>(); // set: a date and time is being asked for
  const run = async (service: "snooze" | "unsnooze", data: object, done: string) => {
    try {
      await act(service, { entity_id: row.entity_id, ...data });
      setWhen(undefined);
      say(`${row.name}: ${done}`);
    } catch (err) {
      say((err as Error).message, "bad"); // refused: the integration says why
    }
  };

  if (row.snoozed)
    return (
      <button className={`${ui.button} ${ui.small}`} onClick={() => run("unsnooze", {}, "counted again")}>
        Unsnooze
      </button>
    );
  if (!snoozable(row)) return null;
  if (when !== undefined)
    return (
      <>
        <input
          type="datetime-local"
          className={css.snoozeWhen}
          value={when}
          min={field(Date.now())}
          onChange={(e) => setWhen(e.target.value)}
          aria-label={`Snooze ${row.name} until`}
        />
        <button
          className={`${ui.button} ${ui.small}`}
          disabled={!when}
          onClick={() => run("snooze", { until: new Date(when).toISOString() }, `snoozed until ${new Date(when).toLocaleString()}`)}
        >
          Snooze
        </button>
        <button className={`${ui.button} ${ui.small}`} onClick={() => setWhen(undefined)}>
          Cancel
        </button>
      </>
    );
  return (
    <Select
      value=""
      placeholder="Snooze…"
      aria-label={`Snooze ${row.name}`}
      onChange={(picked) => {
        if (picked === DATE) return setWhen(field(Date.now() + 86400e3));
        const [label, hours] = FOR.find(([, h]) => String(h) === picked)!;
        run("snooze", { duration: { hours } }, `snoozed for ${label}`);
      }}
    >
      {FOR.map(([label, hours]) => (
        <option key={hours} value={String(hours)}>
          {label}
        </option>
      ))}
      <option value={DATE}>Until a date…</option>
    </Select>
  );
}
