/** The websocket connection Home Assistant's own page holds. The app's page is drawn inside
 * it, on the same origin, so a page here can talk to an integration that the app itself
 * knows nothing of (Sensor Watch's tile, Love it or Loathe it's page). */

import type { Conn } from "./sensor-watch/ha";

/** Undefined when this page isn't inside Home Assistant: nothing to ask. */
export function homeConnection(): Promise<{ conn: Conn }> | undefined {
  try {
    return (window.parent as unknown as { hassConnection?: Promise<{ conn: Conn }> }).hassConnection;
  } catch {
    return undefined; // another origin's page holds this one
  }
}
