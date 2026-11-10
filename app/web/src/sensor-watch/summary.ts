/** Sensor Watch's health for Casa Mia's Home tile. Sensor Watch runs in Home Assistant,
 * so the tile follows its summary feed (the integration's admin.py) over the connection
 * Home Assistant's own page holds: the app's page is inside it, on the same origin. */

import { useEffect, useState } from "react";
import { follow, SUMMARY, type Conn, type NotRunning } from "./ha";

/** What the tile shows (modules.tsx): the feed's event, or `problem`: why there is none. */
export type Summary = { health?: string; watching?: number; counts?: Record<string, number>; worst?: string | null; problem?: string };

const OUTSIDE = "This page isn't inside Home Assistant, so it can't ask Sensor Watch";

/** The summary while `on` (the tile is shown), pushed at each change. */
export function useSummary(on: boolean): Summary {
  const [summary, setSummary] = useState<Summary>({});
  useEffect(() => {
    if (!on) return;
    const none = (problem: string) => setSummary({ problem });
    let asked: Promise<{ conn: Conn }> | undefined;
    try {
      asked = (window.parent as unknown as { hassConnection?: Promise<{ conn: Conn }> }).hassConnection;
    } catch {
      // another origin's page holds this one
    }
    if (!asked) return none(OUTSIDE);

    let over = false;
    let stop = () => {};
    asked.then(
      ({ conn }) => {
        if (over) return;
        stop = follow<Summary | NotRunning>(conn, { type: SUMMARY }, (event) => ("error" in event ? none(event.error) : setSummary(event)), (why) =>
          none(`Home Assistant refused: ${why}`),
        );
      },
      (err) => none(`No connection to Home Assistant (${err})`),
    );
    return () => {
      over = true;
      stop();
    };
  }, [on]);
  return summary;
}
