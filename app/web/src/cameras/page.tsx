import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LiveView } from "../LiveView";
import { AreaHead, Empty, Shell } from "../page";
import { Toasts, type Toast } from "../ui";
import css from "../cameras.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";
import { Cameras, Entities, HA, HEAD, THUMB_EVERY_MS, ThumbRound, get, plural, put } from "./common";
import { AddCameras, CameraDialog } from "./dialogs";
import { Thumb } from "./inputs";

/** The cameras, chosen from Home Assistant, each with its title, channels and extras.
 * Every change is saved at once; the commanders and the dashboard read them. */
export function CamerasPage({ state }: { state?: string }) {
  const [cameras, setCameras] = useState<Cameras>();
  const [error, setError] = useState<string | null>(null);
  const [ha, setHa] = useState<HA>();
  const [dialog, setDialog] = useState<ReactNode>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [thumbRound, setThumbRound] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setThumbRound((n) => n + 1), THUMB_EVERY_MS);
    return () => clearInterval(timer);
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 6000);
  }, []);

  useEffect(() => {
    if (state === "disabled") return;
    get<{ cameras: Cameras; error: string | null }>("").then(
      (v) => {
        setCameras(v.cameras);
        setError(v.error);
      },
      (err) => toast((err as Error).message, "bad"),
    );
    get<HA>("ha").then(setHa, (err) => setHa({ error: (err as Error).message }));
  }, [state, toast]);

  if (state === "disabled")
    return (
      <Shell {...HEAD} state={state}>
        <Empty>Switch on Camera Dashboard in the app's Configuration tab.</Empty>
      </Shell>
    );
  if (!cameras)
    return (
      <Shell {...HEAD} state={state}>
        <p className={guest.notice}>Loading…</p>
      </Shell>
    );

  /** Save the cameras with one change; the page shows what the app kept. */
  const save = async (change: (c: Cameras) => void, done: string) => {
    const next = structuredClone(cameras);
    change(next);
    try {
      setCameras((await put<{ cameras: Cameras }>("", { cameras: next })).cameras);
      toast(done);
      return true;
    } catch (err) {
      toast((err as Error).message, "bad");
      return false;
    }
  };

  return (
    <ThumbRound.Provider value={thumbRound}>
      <Entities.Provider value={ha?.entities ?? []}>
        <Shell {...HEAD} state={state}>
          {error && <div className={guest.warning}>{error}</div>}
          {ha?.error && <div className={guest.warning}>Home Assistant: {ha.error}</div>}
          <section className={guest.area}>
            <AreaHead
              title="Cameras"
              blurb="Chosen from Home Assistant. Each camera's medium channel goes to the wall tablets and phones, its high channel to everyone else. Changes are saved at once; the commanders' preview takes them at once, the live dashboard at its next Deploy live."
              action={
                <button
                  className={ui.primary}
                  disabled={!ha?.cameras}
                  onClick={() =>
                    setDialog(
                      <AddCameras
                        ha={ha?.cameras ?? []}
                        chosen={cameras}
                        onClose={() => setDialog(null)}
                        onAdd={async (cams) => {
                          const ok = await save((s) => {
                            for (const c of cams)
                              s[c.entity] = {
                                title: c.name,
                                ...(c.medium && { medium: c.medium }),
                                ...(c.high && { high: c.high }),
                                ...(c.zoom && { zoom: c.zoom }),
                              };
                          }, `Added ${plural(cams.length, "camera")}`);
                          if (ok) setDialog(null);
                        }}
                      />,
                    )
                  }
                >
                  + Add cameras
                </button>
              }
            />
            {Object.keys(cameras).length === 0 ? (
              <Empty>No cameras yet. Add them from Home Assistant's list.</Empty>
            ) : (
              <div className={css.table}>
                <div className={`${css.camRow} ${css.head}`}>
                  <span>Camera</span>
                  <span>Channels</span>
                  <span>Motion</span>
                  <span>Extras</span>
                  <span />
                </div>
                {Object.entries(cameras).map(([entity, cam]) => (
                  <div key={entity} className={css.camRow}>
                    <button
                      className={css.camCell}
                      title="Watch it live"
                      onClick={() => setDialog(<LiveView entity={entity} title={cam.title} onClose={() => setDialog(null)} />)}
                    >
                      <Thumb entity={entity} />
                      <span className={css.camName}>
                        <strong>{cam.title}</strong>
                        <code>{entity}</code>
                      </span>
                    </button>
                    <span className={css.muted}>
                      {[cam.medium && "medium", cam.high && "high"].filter(Boolean).join(", ") || "itself only"}
                      {cam.live && ` · ${cam.live}`}
                    </span>
                    <span className={css.muted}>{ha?.motion?.[entity] ? <code>{ha.motion[entity]}</code> : "none"}</span>
                    <span className={css.muted}>
                      {[
                        cam.zoom && "zoom",
                        cam.ptz && plural(cam.ptz.presets.length, "preset"),
                        cam.controls?.length && plural(cam.controls.length, "control"),
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </span>
                    <span className={css.actions}>
                      <button
                        className={`${ui.button} ${ui.small}`}
                        onClick={() =>
                          setDialog(
                            <CameraDialog
                              entity={entity}
                              camera={cam}
                              ha={ha?.cameras?.find((c) => c.entity === entity)}
                              onClose={() => setDialog(null)}
                              onSave={async (c) => {
                                if (await save((s) => (s[entity] = c), `${c.title} saved`)) setDialog(null);
                              }}
                            />,
                          )
                        }
                      >
                        Edit
                      </button>
                      <button
                        className={`${ui.danger} ${ui.small}`}
                        onClick={() =>
                          confirm(`Remove ${cam.title}? It also leaves the commanders that show it (on the live dashboard at its next Deploy live).`) &&
                          save((s) => delete s[entity], `${cam.title} removed`)
                        }
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
          {dialog}
          <Toasts toasts={toasts} />
        </Shell>
      </Entities.Provider>
    </ThumbRound.Provider>
  );
}
