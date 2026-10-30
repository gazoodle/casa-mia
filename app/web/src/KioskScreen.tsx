/** A tablet's screen at the start of its row: Kiosk Satellite's own capture
 * (/api/screenshot), fetched through the app's logged-in proxy. Click it for the full size
 * and its age, and Remote control (KioskRemote) to drive it live. Taken when the page opens
 * and on Refresh, never on a timer (RULE FOUR): each one is a capture on the tablet. */

import { useEffect, useRef, useState } from "react";
import { api, type Kiosk } from "./api";
import { ago } from "./format";
import { BUTTONS, openSettings, RemoteView, type Button, type Press, type RemoteState } from "./KioskRemote";
import { Dialog } from "./ui";
import css from "./kiosks.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";

const { get } = api("kiosks");

export function KioskScreen({ kiosk: k }: { kiosk: Kiosk }) {
  const [asked, setAsked] = useState(() => Date.now()); // in the URL too, so Refresh is never answered from the browser's cache
  const [got, setGot] = useState<number>(); // when the picture last arrived
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<RemoteState>(); // set while Remote control runs or after it ended
  const driving = remote && remote.phase !== "ended";
  const press = useRef<Press["current"]>(undefined);
  const [full, setFull] = useState(false); // the dialog fills the window
  const [actual, setActual] = useState(false); // 1:1: one tablet pixel per screen pixel
  const [settings, setSettings] = useState<string>(); // why Android Settings did not open
  // Whether the tablet has a VNC server: asked each time the dialog opens, never on a timer.
  const [vnc, setVnc] = useState<{ ok: boolean; why: string | null }>();
  useEffect(() => {
    if (!open) return;
    setVnc(undefined);
    get<{ ok: boolean; why: string | null }>(`${k.id}/vnc`).then(setVnc, (err) => setVnc({ ok: false, why: (err as Error).message }));
  }, [open, k.id]);
  const close = () => {
    setOpen(false);
    setRemote(undefined);
    setSettings(undefined);
  };
  const android = async () => setSettings(await openSettings(k.id));

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
          full={full}
          onClose={close}
          footer={
            <>
              {driving && (Object.keys(BUTTONS) as Button[]).map((b) => (
                <button key={b} className={`${ui.button} ${ui.small}`} disabled={remote.phase !== "live"} onClick={() => press.current?.(b)} title={`Android's ${b} button`}>
                  {b}
                </button>
              ))}
              {driving && (
                <>
                  <button className={`${ui.button} ${ui.small}`} disabled={remote.phase !== "live"} onClick={android} title="Android's Settings, over the kiosk; Home brings the kiosk back">
                    Android Settings
                  </button>
                  <button className={`${ui.button} ${ui.small}`} onClick={() => setActual((a) => !a)} title={actual ? "Scale the screen to fit" : "One tablet pixel per screen pixel; scroll when larger"}>
                    {actual ? "Fit" : "1:1"}
                  </button>
                </>
              )}
              <button className={`${ui.button} ${ui.small}`} onClick={() => setFull((f) => !f)} title={full ? "Back to a dialog" : "Fill the window"}>
                {full ? "Smaller" : "Full window"}
              </button>
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
                    disabled={!vnc?.ok}
                    onClick={() => setRemote({ phase: "connecting" })}
                    title="Its live screen: your clicks, drags and keys go to the tablet"
                  >
                    {vnc ? "Remote control" : "Checking…"}
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
          {!driving && vnc && !vnc.ok && <p className={guest.checkHelp}>Remote control is not available: {vnc.why}.</p>}
          {driving && settings && <p className={guest.checkHelp}>Android Settings did not open: {settings}.</p>}
          {/* The snapshot keeps the stage its size; the live screen covers it from the first frame. */}
          <div className={`${css.stage} ${full ? css.stageFull : ""}`}>
            {!why && picture(`${css.screenFull} ${remote?.phase === "live" ? css.hidden : ""}`)}
            {driving && (
              <RemoteView kiosk={k} press={press} actual={actual} onState={(s) => setRemote((r) => (r?.phase === "ended" ? r : s))} />
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
