/** A tablet's screen at the start of its row: Kiosk Satellite's own capture
 * (/api/screenshot), fetched through the app's logged-in proxy. Click it for the full size
 * and its age, and Remote control (KioskRemote) to drive it live. Taken when the page opens
 * and on Refresh, never on a timer (RULE FOUR): each one is a capture on the tablet. */

import { useEffect, useState } from "react";
import type { Kiosk } from "./api";
import { ago } from "./format";
import { RemoteView, type RemoteState } from "./KioskRemote";
import { Dialog } from "./ui";
import css from "./kiosks.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";

export function KioskScreen({ kiosk: k }: { kiosk: Kiosk }) {
  const [asked, setAsked] = useState(() => Date.now()); // in the URL too, so Refresh is never answered from the browser's cache
  const [got, setGot] = useState<number>(); // when the picture last arrived
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<RemoteState>(); // set while Remote control runs or after it ended
  const driving = remote && remote.phase !== "ended";
  const close = () => {
    setOpen(false);
    setRemote(undefined);
  };

  // While live, "last change" is redrawn as it ages (ago() counts in minutes): a display
  // clock, not a poll.
  const [, tick] = useState(0);
  useEffect(() => {
    if (remote?.phase !== "live") return;
    const timer = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(timer);
  }, [remote?.phase]);

  const live = k.logged_in && k.online;
  const src = `kiosk/${k.id}/api/screenshot?t=${asked}`;
  const refresh = () => {
    setFailed(false);
    setAsked(Date.now());
  };
  const picture = (className: string) => (
    <img
      className={className}
      src={src}
      alt={`${k.name}'s screen`}
      onLoad={() => setGot(Date.now())}
      onError={() => setFailed(true)}
    />
  );

  // Without a login or an answer there is nothing to fetch: the proxy would wait for the
  // tablet up to a minute. Say why instead of drawing a broken picture.
  const why = !k.logged_in ? "needs login" : !k.online ? "not answering" : failed ? "no picture" : "";
  return (
    <>
      <button
        className={css.screen}
        disabled={!live}
        onClick={failed ? refresh : () => setOpen(true)}
        title={failed ? "Try again" : "Its screen, full size"}
      >
        {why ? <span>{why}</span> : picture(css.screenThumb)}
      </button>
      {open && (
        <Dialog
          title={`${k.name}: screen`}
          wide
          onClose={close}
          footer={
            <>
              {driving ? (
                <button className={ui.button} onClick={() => setRemote({ phase: "ended", why: "ended here" })}>
                  End remote control
                </button>
              ) : (
                <>
                  <button className={ui.button} disabled={!live || (!failed && (got ?? 0) < asked)} onClick={refresh} title="Take its screen again">
                    {!failed && (got ?? 0) < asked ? "Taking…" : "Refresh"}
                  </button>
                  <button
                    className={ui.button}
                    disabled={!k.online}
                    onClick={() => setRemote({ phase: "connecting" })}
                    title="Its live screen: your clicks, drags and keys go to the tablet (needs droidVNC-NG on it)"
                  >
                    Remote control
                  </button>
                </>
              )}
              <button className={ui.primary} onClick={close}>
                Done
              </button>
            </>
          }
        >
          <p className={guest.checkHelp}>
            {remote?.phase === "connecting"
              ? `Connecting to ${k.name}'s screen…`
              : remote?.phase === "live"
                ? `Live: your clicks, drags and keys go to ${k.name}. Last change ${ago(new Date(remote.changed).toISOString())}.`
                : remote?.phase === "ended"
                  ? `Remote control ended: ${remote.why}.`
                  : why
                    ? `No picture: ${k.name} is ${why === "no picture" ? "not sending one" : why}.`
                    : got
                      ? `Taken at ${new Date(got).toLocaleTimeString()} (${ago(new Date(got).toISOString())}).`
                      : "Taking…"}
          </p>
          {/* The snapshot keeps the stage its size; the live screen covers it from the first frame. */}
          <div className={css.stage}>
            {!why && picture(`${css.screenFull} ${remote?.phase === "live" ? css.hidden : ""}`)}
            {driving && (
              <RemoteView kiosk={k} onState={(s) => setRemote((r) => (r?.phase === "ended" ? r : s))} />
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
