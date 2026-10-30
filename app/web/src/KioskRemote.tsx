/** Remote control of a tablet: its live screen in the screen dialog, through droidVNC-NG
 * beside Kiosk Satellite, and the VNC password the app logs in with.
 *
 * The page opens the websocket itself (to the app's /kiosk/<id>/_vnc) and hands it to noVNC,
 * so it sees each message: the first after noVNC connects is the first frame, when the
 * snapshot gives way; the latest is the "last change" shown, so a frozen screen shows its
 * age instead of passing for live (RULE FIVE). The app does the VNC login, so the password
 * never reaches the browser; a refusal arrives with its reason. */

import { useEffect, useRef, useState } from "react";
import type RFB from "@novnc/novnc";
import type { Kiosk } from "./api";
import { Field } from "./ui";
import css from "./kiosks.module.css";
import ui from "./ui.module.css";

/** No touch or key for this long ends the session, so a forgotten dialog does not keep the
 * tablet capturing and streaming. */
const IDLE_MS = 10 * 60 * 1000;

/** Android's buttons, as droidVNC-NG's default key chords (its Preseed-Preferences doc):
 * each [keysym, code], pressed in order and released in reverse. */
export const BUTTONS = {
  Back: [[0xff1b, "Escape"]],
  Home: [[0xff50, "Home"]],
  Recents: [
    [0xffe3, "ControlLeft"],
    [0xffe1, "ShiftLeft"],
    [0xff1b, "Escape"],
  ],
} satisfies Record<string, [number, string][]>;
export type Button = keyof typeof BUTTONS;

/** Set by a live session: presses one of Android's buttons on the tablet. */
export type Press = { current?: (button: Button) => void };

export type RemoteState = { phase: "connecting" } | { phase: "live"; changed: number } | { phase: "ended"; why: string };

/** The live screen, laid over the dialog's snapshot (`stage`, which keeps its size). */
export function RemoteView({ kiosk: k, onState, press }: { kiosk: Kiosk; onState: (s: RemoteState) => void; press: Press }) {
  const target = useRef<HTMLDivElement>(null);
  const report = useRef(onState);
  report.current = onState;

  useEffect(() => {
    // noVNC loads only when Remote control is used, not with every admin page (190 kB).
    let stop: (() => void) | undefined;
    let gone = false;
    import("@novnc/novnc").then(
      ({ default: rfbClass }) => !gone && (stop = session(rfbClass, target.current!, k.id, report, press)),
      (err) => report.current({ phase: "ended", why: `the VNC viewer did not load (${err})` }),
    );
    return () => {
      gone = true;
      stop?.();
    };
  }, [k.id, press]);

  return <div ref={target} className={css.remote} />;
}

/** One session: noVNC on the app's websocket, until the returned stop or its own end. */
function session(rfbClass: typeof RFB, target: HTMLDivElement, id: string, report: { current: (s: RemoteState) => void }, press: Press) {
  const url = new URL(`kiosk/${id}/_vnc`, location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(url);
  const rfb = new rfbClass(target, ws, { shared: true });
  rfb.scaleViewport = true;
  rfb.resizeSession = false;
  rfb.background = "transparent";
  // droidVNC-NG sends an empty cursor shape, which noVNC draws as nothing: show a dot instead,
  // so you can see where you are about to click.
  rfb.showDotCursor = true;

  // Set once, by whichever comes first: a refusal's reason, the idle limit, or the close.
  let why: string | undefined;
  let connected = false;
  let idle = 0;
  const end = (reason: string) => {
    why ??= reason;
    rfb.disconnect();
  };
  const touched = () => {
    clearTimeout(idle);
    idle = window.setTimeout(() => end("no touch or key for 10 minutes"), IDLE_MS);
  };
  touched();

  // Messages come many a second while the screen moves: tell the dialog at most once a second.
  let told = 0;
  rfb.addEventListener("connect", () => (connected = true));
  ws.addEventListener("message", () => {
    const now = Date.now();
    if (!connected || now - told < 1000) return;
    told = now;
    report.current({ phase: "live", changed: now });
  });
  rfb.addEventListener("securityfailure", (e) => (why ??= (e as CustomEvent<{ reason?: string }>).detail.reason ?? "refused"));
  rfb.addEventListener("disconnect", (e) =>
    report.current({ phase: "ended", why: why ?? ((e as CustomEvent<{ clean: boolean }>).detail.clean ? "the tablet closed it" : "the connection was lost") }),
  );
  target.addEventListener("pointerdown", touched);
  target.addEventListener("keydown", touched);
  press.current = (button) => {
    touched();
    for (const [sym, code] of BUTTONS[button]) rfb.sendKey(sym, code, true);
    for (const [sym, code] of [...BUTTONS[button]].reverse()) rfb.sendKey(sym, code, false);
  };

  // However the dialog goes (Done, close, the page left), the session ends with it.
  return () => {
    clearTimeout(idle);
    target.removeEventListener("pointerdown", touched);
    target.removeEventListener("keydown", touched);
    press.current = undefined;
    why ??= "closed";
    rfb.disconnect();
  };
}

/** The Kiosk Satellites page's VNC password: one for every tablet, set on their droidVNC-NG.
 * Shown only as set or not; the app keeps it. */
export function RemotePassword({ set, onSave }: { set: boolean; onSave: (password: string) => Promise<unknown> }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (value: string) => {
    setBusy(true);
    try {
      await onSave(value);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(password);
      }}
    >
      {/* The box and its buttons on one line, as Add a kiosk; the label and help around them. */}
      <Field label="VNC password" help={set ? "Set. Enter a new one to change it." : "Not set: Remote control will say so."}>
        <span className={css.addRow}>
          <input type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className={ui.button} disabled={!password || busy}>
            Save
          </button>
          {set && (
            <button type="button" className={ui.button} disabled={busy} onClick={() => save("")}>
              Clear
            </button>
          )}
        </span>
      </Field>
    </form>
  );
}
