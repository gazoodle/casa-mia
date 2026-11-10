/** The watched sensors' levels and values as they move, both pushed by Home Assistant:
 * the levels by Sensor Watch's own feed (the integration's admin.py), the values by
 * Home Assistant's `subscribe_entities`, for the watched sensors only. */

import { useEffect, useMemo, useRef, useState } from "react";
import { displayed, type LevelsEvent, type LevelsView, type Live } from "./common";
import { follow, ha, LEVELS_FEED, type NotRunning } from "./ha";

// Milliseconds between two redraws for values. They move many times a second (a mains
// voltage, a CPU), and a page that redraws at each does nothing else (Safari hung on it).
const PACE = 1000;
const LOST = "The connection to Home Assistant is lost, so no levels are shown until it is back.";

/** A state as `subscribe_entities` sends it: the state and the attributes, each only
 * when it changed. */
type Compressed = { s?: string; a?: Record<string, unknown> };
type EntitiesEvent = { a?: Record<string, Compressed>; c?: Record<string, { "+"?: Compressed }> };

/** The entity ids whose values are followed, each with the attribute watched ("": its
 * state). A reminder's value is the days until its date, which its row carries. */
type Followed = Record<string, string>;

const follows = (row: Live) => !row.days_until;

/** A state's value as watched: the state, or the attribute (as text) while the entity is
 * available; undefined when the change doesn't say (something else changed). */
function valueOf(state: Compressed, attribute: string): string | undefined {
  if (!attribute || state.s === "unavailable" || state.s === "unknown") return state.s;
  const value = state.a?.[attribute];
  return value == null ? undefined : String(value);
}

/** The levels now, with each row's value as Home Assistant has it; undefined until the
 * first answer. `whole` is called each time every level arrives (the start, Sensor Watch
 * starting again, the connection coming back): the records may have changed with them. */
export function useLevels(whole: () => void): LevelsView | undefined {
  const [live, setLive] = useState<LevelsView>();
  const [followed, setFollowed] = useState<Followed>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [unfollowed, setUnfollowed] = useState<string>(); // why the values aren't moving
  const onWhole = useRef(whole);
  onWhole.current = whole;

  useEffect(() => {
    const on = ha();
    const none = (error: string) => {
      setLive({ levels: {}, error });
      setFollowed({});
    };

    const heard = (event: LevelsEvent | NotRunning) => {
      if ("error" in event) return none(event.error);
      if (event.whole) {
        setLive({ levels: event.levels, error: null });
        setFollowed(Object.fromEntries(Object.values(event.levels).filter(follows).map((r) => [r.entity_id, r.attribute ?? ""])));
        onWhole.current();
        return;
      }
      setLive((was) => {
        const levels = { ...was?.levels, ...event.levels };
        for (const gone of event.removed) delete levels[gone];
        return { levels, error: null };
      });
      // Followed again only when the set itself changed, not at each change of level.
      setFollowed((was) => {
        const now = { ...was };
        for (const gone of event.removed) delete now[gone];
        for (const row of Object.values(event.levels)) {
          if (follows(row)) now[row.entity_id] = row.attribute ?? "";
          else delete now[row.entity_id];
        }
        const same = Object.keys(now).length === Object.keys(was).length && Object.keys(now).every((e) => now[e] === was[e]);
        return same ? was : now;
      });
    };

    // Home Assistant's connection subscribes again by itself once it is back, and the
    // feed then sends every level.
    const lost = () => none(LOST);
    on.addEventListener("disconnected", lost);
    const stop = follow<LevelsEvent | NotRunning>(on, { type: LEVELS_FEED }, heard, (why) =>
      none(`Home Assistant refused Sensor Watch's levels: ${why}`),
    );
    return () => {
      on.removeEventListener("disconnected", lost);
      stop();
    };
  }, []);

  useEffect(() => {
    setValues({});
    setUnfollowed(undefined);
    const ids = Object.keys(followed);
    if (!ids.length) return; // an empty list would be answered with every entity
    let waiting: Record<string, string> = {};
    let cooling: ReturnType<typeof setTimeout> | undefined;
    let late = false;

    // At once, then nothing for PACE; what arrived meanwhile is shown at its end.
    const show = () => {
      if (cooling) {
        late = true;
        return;
      }
      const taken = waiting;
      waiting = {};
      setValues((was) => ({ ...was, ...taken }));
      cooling = setTimeout(() => {
        cooling = undefined;
        if (late) {
          late = false;
          show();
        }
      }, PACE);
    };

    const stop = follow<EntitiesEvent>(
      ha(),
      { type: "subscribe_entities", entity_ids: ids },
      (event) => {
        const take = (id: string, state: Compressed) => {
          const value = id in followed ? valueOf(state, followed[id]) : undefined;
          if (value !== undefined) waiting[id] = value;
        };
        for (const [id, state] of Object.entries(event.a ?? {})) take(id, state);
        for (const [id, change] of Object.entries(event.c ?? {})) take(id, change["+"] ?? {});
        show();
      },
      (why) => setUnfollowed(`Home Assistant refused the sensors' values (${why}), so each row shows the value its level was judged at.`),
    );
    return () => {
      clearTimeout(cooling);
      stop();
    };
  }, [followed]);

  return useMemo(() => {
    if (!live) return undefined;
    const levels = { ...live.levels };
    for (const [id, value] of Object.entries(values)) {
      const row = levels[id];
      // Rounded as Home Assistant shows it, by the precision its row carries.
      if (row) levels[id] = { ...row, value: displayed(value, row.precision) };
    }
    return { levels, error: live.error ?? unfollowed ?? null };
  }, [live, values, unfollowed]);
}
