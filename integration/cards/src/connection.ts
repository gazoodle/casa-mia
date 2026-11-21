// HA's websocket connection, for what the cards keep open on it. HA imports its core and
// the extra scripts separately, so this bundle can run before window.hassConnection exists.
// Nothing announces it, so look until it's there (owner's approval of this start-up retry,
// 2026-11-02): it ends at the first sight, or says what won't work and gives up.
const EVERY_MS = 100;
const ATTEMPTS = 600; // about a minute, for a slow tablet on a cold load
const IDLE = 60_000; // ms: untouched this long, a page that may reloads itself after an update
const TOUCHES = ["pointerdown", "keydown", "wheel"];

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

/** A page open since before an update keeps running the old cards (HA loads each script
 * once per page), which looks like a bug that isn't there. So at each reconnect (HA
 * restarts after an update) ask which version HA serves now (`command`, answering
 * {version}) and, if it isn't the one `running`, offer a reload in HA's own toast, as HA
 * does for its own frontend. Not in development (`running` "dev": no ?v= on the file).
 * `unattended`: whether the page may also reload itself, once nobody has touched it for
 * IDLE; asked when the time is up, and a touch starts the wait again. */
export function offerReload(name: string, command: string, running: string, unattended?: () => boolean): void {
  if (running === "dev") return;
  whenConnected(`${name}'s offer to reload after an update`, ({ conn }) => {
    const check = () =>
      conn.sendMessagePromise({ type: command }).then(({ version }: { version: string | null }) => {
        if (!version || version === running) return;
        console.warn(`CASA-MIA CARDS: ${name} ${running} running, ${version} served: reload to update`);
        document.querySelector("home-assistant")?.dispatchEvent(
          new CustomEvent("hass-notification", {
            detail: {
              message: `${name} updated to ${version}: reload to use it`,
              duration: -1,
              dismissable: true,
              action: { text: "Reload", action: () => location.reload() },
            },
            bubbles: true,
            composed: true,
          }),
        );
        if (unattended) reloadWhenIdle(name, unattended);
      }, () => {}); // an older integration without the command: nothing to compare
    conn.addEventListener("ready", check);
  });
}

let idling = false;
/** Reload once the page has gone IDLE without a touch, if `may` says so then. A date
 * coming due, put off by each touch, not a poll: a page that may not reload waits for the
 * next touch to start the wait again. Set once, however many reconnects find the update. */
function reloadWhenIdle(name: string, may: () => boolean) {
  if (idling) return;
  idling = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wait = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!may()) return;
      console.warn(`CASA-MIA CARDS: ${name} reloading itself to update, untouched for ${IDLE / 1000} s`);
      location.reload();
    }, IDLE);
  };
  for (const type of TOUCHES) window.addEventListener(type, wait, { capture: true, passive: true });
  wait();
}
