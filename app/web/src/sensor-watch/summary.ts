/** Sensor Watch's health for Casa Mia's Home tile. Sensor Watch is an integration of its
 * own in Home Assistant, which the app knows nothing of: the tile follows its summary
 * feed (its admin.py) over the connection Home Assistant's own page holds (the app's page
 * is inside it, on the same origin), and is shown only where Sensor Watch is installed. */

import { useEffect, useState } from "react";
import { homeConnection } from "../home";
import { follow, SUMMARY, type NotRunning } from "./ha";

/** What the tile shows (modules.tsx): the feed's event, or `problem`: why there is none.
 * Empty until Sensor Watch answers, and for good where it isn't installed: no tile. */
export type Summary = { health?: string; watching?: number; counts?: Record<string, number>; worst?: string | null; problem?: string };

/** The summary, pushed at each change. */
export function useSummary(): Summary {
  const [summary, setSummary] = useState<Summary>({});
  useEffect(() => {
    const none = (problem: string) => setSummary({ problem });
    const asked = homeConnection();
    if (!asked) return; // not inside Home Assistant: nothing to ask, so no tile

    let over = false;
    let stop = () => {};
    asked.then(
      ({ conn }) => {
        if (over) return;
        stop = follow<Summary | NotRunning>(conn, { type: SUMMARY }, (event) => ("error" in event ? none(event.error) : setSummary(event)), (why, code) => {
          if (code !== "unknown_command") none(`Home Assistant refused: ${why}`); // else: not installed
        });
      },
      (err) => none(`No connection to Home Assistant (${err})`),
    );
    return () => {
      over = true;
      stop();
    };
  }, []);
  return summary;
}
