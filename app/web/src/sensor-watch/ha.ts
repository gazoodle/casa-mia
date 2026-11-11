/** Sensor Watch's page talks to Home Assistant over the websocket Home Assistant's own
 * page already holds: the records' routes as one command (the integration's admin.py),
 * and feeds that are pushed. The panel's element hands Home Assistant in (panel.tsx)
 * before anything is drawn. */

import { ApiError } from "../api";

/** As much of Home Assistant's connection (home-assistant-js-websocket) as is used. It
 * subscribes again by itself after a reconnect. */
export type Conn = {
  sendMessagePromise<T>(message: object): Promise<T>;
  subscribeMessage<T>(heard: (event: T) => void, message: object): Promise<() => Promise<void>>;
  addEventListener(type: "disconnected", heard: () => void): void;
  removeEventListener(type: "disconnected", heard: () => void): void;
};

export const API = "casa_mia_sensor_watch/api";
export const LEVELS_FEED = "casa_mia_sensor_watch/levels";
export const SUMMARY = "casa_mia_sensor_watch/summary";

/** As much of Home Assistant's `hass` as the page uses: its connection for nearly all of
 * it; and, for the set-up's notify automation, its services (the notify actions there
 * are) and its REST API (how Home Assistant's own editor saves an automation). */
export type Home = {
  connection: Conn;
  services: Record<string, Record<string, unknown>>;
  callApi<T>(method: string, path: string, body?: unknown): Promise<T>;
};

let home: Home | undefined;

export function connect(given: Home): void {
  home = given;
}

export function hass(): Home {
  if (!home) throw new ApiError("Home Assistant's connection isn't here yet.");
  return home;
}

export function ha(): Conn {
  return hass().connection;
}

/** What Home Assistant says when it refuses a command: {code, message}. */
const why = (err: unknown) => (err as { message?: string })?.message ?? String(err);

async function send<T>(method: string, route: string, body?: unknown): Promise<T> {
  const [path, asked] = route.split("?");
  let answer: { status: number; body: T & { error?: string } };
  try {
    answer = await ha().sendMessagePromise({
      type: API,
      method,
      path: path.split("/").map(decodeURIComponent).join("/"),
      query: Object.fromEntries(new URLSearchParams(asked)),
      ...(body === undefined ? {} : { body }),
    });
  } catch (err) {
    throw new ApiError(why(err));
  }
  if (answer.status >= 400) throw new ApiError(answer.body.error ?? `Sensor Watch answered ${answer.status}.`);
  return answer.body;
}

/** The records' routes, with the methods and paths they had when the app served them. */
export const swApi = {
  get: <T>(path: string) => send<T>("GET", path),
  post: <T>(path: string, body?: unknown) => send<T>("POST", path, body ?? {}),
  put: <T>(path: string, body: unknown) => send<T>("PUT", path, body),
  del: <T>(path: string) => send<T>("DELETE", path),
};

/** Follow a feed until the function returned is called (an effect's cleanup). `failed`
 * is told why if Home Assistant refuses it, and its code ("unknown_command": nothing in
 * Home Assistant serves the feed). */
export function follow<T>(on: Conn, message: object, heard: (event: T) => void, failed: (why: string, code?: string) => void): () => void {
  const off = on.subscribeMessage<T>(heard, message);
  off.catch((err) => failed(why(err), (err as { code?: string })?.code));
  // Nothing to stop if it was refused, or the connection has gone.
  return () => void off.then((stop) => stop()).catch(() => undefined);
}

/** A feed's event while Sensor Watch isn't running in Home Assistant. */
export type NotRunning = { error: string };
