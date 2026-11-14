// The record: how one device stood through the last day, from Home Assistant's history.
// Asked for once, when its clipping is opened; what happens after that is already told to
// the page as it happens.
import type { Hass } from "../ha.ts";
import { standing, type Device, type Kind } from "./house.ts";

export const DAY = 24 * 3_600_000;
export type Change = { at: number; on: boolean; level?: number; away: boolean };
/** A state as the history command sends it: its state, attributes and time, in seconds. */
export type Row = { s: string; a?: Record<string, any>; lu: number };

/** The history's rows as changes: one for each time the device came to stand differently. */
export function chronicle(kind: Kind, rows: Row[]): Change[] {
  const changes: Change[] = [];
  for (const row of rows) {
    const next = { at: row.lu * 1000, ...standing(kind, { state: row.s, attributes: row.a ?? {} }) };
    const last = changes.at(-1);
    if (!last || last.on !== next.on || last.level !== next.level || last.away !== next.away) changes.push(next);
  }
  return changes;
}

/** When it was on between `from` and `to`, as [left, width] in per cent of that span. */
export function lit(changes: Change[], from: number, to: number): [number, number][] {
  const spans: [number, number][] = [];
  changes.forEach((change, i) => {
    const start = Math.max(change.at, from);
    const end = Math.min(changes[i + 1]?.at ?? to, to);
    if (change.on && end > start) spans.push([((start - from) / (to - from)) * 100, ((end - start) / (to - from)) * 100]);
  });
  return spans;
}

export async function recorded(hass: Hass, d: Device, now: number): Promise<Change[]> {
  const found: Record<string, Row[]> = await hass.connection.sendMessagePromise({
    type: "history/history_during_period",
    start_time: new Date(now - DAY).toISOString(),
    entity_ids: [d.id],
    // A cover's position is in its attributes, and a change of position alone is not
    // "significant". Home Assistant keeps a light's brightness out of its history
    // altogether, so a light's record is of when it was on, and not of how brightly. A
    // thermostat's target is kept.
    significant_changes_only: false,
    no_attributes: d.kind !== "cover" && d.kind !== "climate",
  });
  return chronicle(d.kind, found[d.id] ?? []);
}
