import { useCallback, useEffect, useMemo, useState } from "react";
import { THUMB_EVERY_MS, ThumbRound } from "../cameras";
import { AreaHead, Empty, Shell } from "../page";
import { Field, Toasts, type Toast } from "../ui";
import css from "../cameras.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";
import { Commander, HA, HEAD, View, get, post, put } from "./common";
import { Commanders } from "./editor";

type Saved = View["store"];

/** The commanders: edited here, and live on Save (no draft). */
export function CommanderPage({ state }: { state?: string }) {
  const [view, setView] = useState<View>();
  const [edits, setEdits] = useState<Saved>();
  const [ha, setHa] = useState<HA>();
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [thumbRound, setThumbRound] = useState(0);
  const [haRound, setHaRound] = useState(0); // ask HA again (after flipping a switch)
  useEffect(() => {
    const timer = setInterval(() => setThumbRound((n) => n + 1), THUMB_EVERY_MS);
    return () => clearInterval(timer);
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 6000);
  }, []);

  const load = useCallback((v: View) => {
    setView(v);
    setEdits(structuredClone(v.store));
  }, []);

  useEffect(() => {
    if (state === "disabled") return;
    get<View>("").then(load, (err) => toast((err as Error).message, "bad"));
  }, [state, load, toast]);
  useEffect(() => {
    if (state === "disabled") return;
    get<HA>("ha").then(setHa, (err) => setHa({ error: (err as Error).message }));
  }, [state, haRound, view]);

  const dirty = useMemo(() => !!view && !!edits && JSON.stringify(view.store) !== JSON.stringify(edits), [view, edits]);

  if (state === "disabled")
    return (
      <Shell {...HEAD} state={state}>
        <Empty>Switch on Camera Dashboard in the app's Configuration tab.</Empty>
      </Shell>
    );
  if (!view || !edits)
    return (
      <Shell {...HEAD} state={state}>
        <p className={guest.notice}>Loading…</p>
      </Shell>
    );

  const save = async () => {
    setBusy(true);
    try {
      load(await put<View>("", edits));
      toast("Saved: live now");
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  };
  const flip = async (entity: string, on: boolean) => {
    try {
      await post("switch", { entity, on });
      toast(`Track motion ${on ? "on" : "off"}`);
    } catch (err) {
      toast((err as Error).message, "bad");
    }
    setHaRound((n) => n + 1);
  };
  const switchState = (id: string) => {
    const entity = ha?.commander_switches?.[id];
    return entity ? ha?.entities?.find((e) => e.entity === entity)?.state : undefined;
  };

  return (
    <ThumbRound.Provider value={thumbRound}>
        <Shell {...HEAD} state={state}>
          {view.error && <div className={guest.warning}>{view.error}</div>}
          {ha?.error && <div className={guest.warning}>Home Assistant: {ha.error}</div>}
          {!view.compositor && (
            <div className={guest.warning}>
              The live compositor is off: switch on Compose camera groups in the app's Configuration tab to draw the
              commanders.
            </div>
          )}

          <div className={css.bar}>
            <div className={css.barState}>
              <span className={`${css.dot} ${dirty ? css.warnDot : css.goodDot}`} />
              {dirty ? "Unsaved changes" : "Saved: what you see is live"}
            </div>
            <div className={css.barActions}>
              {dirty && (
                <button className={ui.button} onClick={() => setEdits(structuredClone(view.store))} disabled={busy}>
                  Discard
                </button>
              )}
              <button className={ui.primary} onClick={save} disabled={!dirty || busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {view.problems.length > 0 && !dirty && (
            <div className={guest.warning}>
              <strong>To fix:</strong>
              <ul className={css.problems}>
                {view.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <section className={guest.area}>
            <AreaHead
              title="Commanders"
              blurb={
                <>
                  Each one landscape picture: a main camera in its natural shape, framed by panels of cameras. Tapping a
                  camera makes it the main one. Each commander is a device in Home Assistant (Camera Commander, then
                  Camera Commander and its name), so automations choose it too, with its Main camera, and its Track
                  motion switch. Save shows them live at once, on every Camera Commander card. The cameras themselves
                  are added and named on the <a href="#/cameras">Cameras</a> page.
                </>
              }
            />
            <Commanders
              store={{ commanders: edits.commanders, cameras: view.cameras }}
              blank={view.empty_commander}
              ha={ha}
              trackMotion={switchState}
              onTrackMotion={(id, on) => ha?.commander_switches?.[id] && flip(ha.commander_switches[id], on)}
              onChange={(c: Commander[]) => setEdits({ ...edits, commanders: c })}
            />
          </section>

          <section className={guest.area}>
            <AreaHead title="Pictures" blurb="Where the cards and the dashboard fetch the commanders' pictures from." />
            <Field label="Compositor host" help={`The address the pictures are fetched from. Blank: this box (${view.host ?? "unknown"}).`}>
              <input
                value={edits.compositor_host}
                placeholder={view.host ?? ""}
                onChange={(e) => setEdits({ ...edits, compositor_host: e.target.value })}
              />
            </Field>
          </section>
          <Toasts toasts={toasts} />
        </Shell>
    </ThumbRound.Provider>
  );
}
