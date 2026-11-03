/** The app's /health, polled. Relative URL: under ingress it resolves against <base href>. */

import { createContext, useEffect, useState } from "react";

export type ModuleHealth = { state?: string; error?: string | null } & Record<string, unknown>;

export type Health = {
  status: string;
  version: string;
  api: number;
  integration_url?: string;
  developer?: boolean; // the developer_mode app option
  modules: Record<string, ModuleHealth>;
};

/** Developer mode (the app option): its debugging aids show only while it is on. */
export const Developer = createContext(false);

const POLL_MS = 5000;
/** The app version this page was loaded from. An open page outlives an app update, and
 * would keep running the old UI: when the version changes, reload the whole page. */
let loadedVersion: string | undefined;

export function useHealth(): { health?: Health; error?: string } {
  const [health, setHealth] = useState<Health>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("health", { cache: "no-store" });
        if (!response.ok) throw new Error(`the app answered ${response.status}`);
        const body = (await response.json()) as Health;
        loadedVersion ??= body.version;
        if (body.version !== loadedVersion) {
          location.reload();
          return;
        }
        if (alive) {
          setHealth(body);
          setError(undefined);
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return { health, error };
}
