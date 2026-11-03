// HA's websocket connection, for what the cards keep open on it. HA imports its core and
// the extra scripts separately, so this bundle can run before window.hassConnection exists.
// Nothing announces it, so look until it's there (owner's approval of this start-up retry,
// 2026-11-02): it ends at the first sight, or says what won't work and gives up.
const EVERY_MS = 100;
const ATTEMPTS = 600; // about a minute, for a slow tablet on a cold load

/** Runs use with HA's connection once there is one; if there never is, says what is lost. */
export function whenConnected(what: string, use: (connection: { conn: any }) => void): void {
  const failed = (why: unknown) => console.error(`CASA-MIA CARDS: ${what} won't work: ${why}`);

  const attach = () => {
    const connection: Promise<{ conn: any }> | undefined = (window as any).hassConnection;
    connection?.then(use, (code) => failed(`Home Assistant's connection failed (${code})`));
    return !!connection;
  };
  if (attach()) return;

  let left = ATTEMPTS;
  const timer = setInterval(() => {
    if (attach()) clearInterval(timer);
    else if (--left === 0) {
      clearInterval(timer);
      failed("Home Assistant's connection never appeared");
    }
  }, EVERY_MS);
}
