import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ago } from "../format";
import { AreaHead, Empty, Shell } from "../page";
import { LiveView } from "../LiveView";
import { Segmented, Toasts, type Toast } from "../ui";
import css from "../cameras.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";
import { AddCameras, CameraDialog } from "./cameras";
import { Commanders } from "./commanders";
import { Entities, HA, HEAD, PANELS, Store, THUMB_EVERY_MS, ThumbRound, View, get, plural, post, put } from "./common";
import { Thumb } from "./inputs";
import { Backups, Settings, YamlDialog } from "./settings";

export function CameraDashboardPage({ state }: { state?: string }) {
  const [view, setView] = useState<View>();
  const [draft, setDraft] = useState<Store>();
  const [ha, setHa] = useState<HA>();
  const [stamp, setStamp] = useState(Date.now()); // bumps the warnings and backups after a save
  const [thumbRound, setThumbRound] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setThumbRound((n) => n + 1), THUMB_EVERY_MS);
    return () => clearInterval(timer);
  }, []);
  const [busy, setBusy] = useState("");
  const [dialog, setDialog] = useState<ReactNode>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 6000);
  }, []);

  const load = useCallback((v: View) => {
    setView(v);
    setDraft(structuredClone(v.store));
    setStamp(Date.now());
  }, []);

  useEffect(() => {
    get<View>("").then(load, (err) => toast((err as Error).message, "bad"));
  }, [load, toast]);
  const [haRound, setHaRound] = useState(0); // ask HA again (after flipping a switch)
  useEffect(() => {
    // Again after each save: the warnings are about the saved draft.
    get<HA>("ha").then(setHa, (err) => setHa({ error: (err as Error).message }));
  }, [stamp, haRound]);
  /** One of the commander's switches in Home Assistant, as HA has it now. */
  const haSwitch = (entity: string) => ha?.entities?.find((e) => e.entity === entity)?.state;
  const flip = async (entity: string, on: boolean, what: string) => {
    try {
      await post("switch", { entity, on });
      toast(`${what} ${on ? "on" : "off"}`);
    } catch (err) {
      toast((err as Error).message, "bad");
    }
    setHaRound((n) => n + 1);
  };

  const dirty = useMemo(
    () => !!view && !!draft && JSON.stringify(view.store) !== JSON.stringify(draft),
    [view, draft],
  );

  if (state === "disabled")
    return (
      <Shell {...HEAD} state={state}>
        <Empty>Switch on Camera Dashboard in the app's Configuration tab.</Empty>
      </Shell>
    );
  if (!view || !draft)
    return (
      <Shell {...HEAD} state={state}>
        <p className={guest.notice}>Loading…</p>
      </Shell>
    );

  const edit = (change: (s: Store) => void) =>
    setDraft((d) => {
      const next = structuredClone(d!);
      change(next);
      return next;
    });

  const act = async (label: string, run: () => Promise<View | void>, done: string) => {
    setBusy(label);
    try {
      const v = await run();
      if (v) load(v);
      toast(done);
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy("");
    }
  };

  const save = () => act("save", () => put<View>("", draft), "Draft saved");
  const deploy = (target: "preview" | "live") =>
    act(
      target,
      () => post<View & { url_path: string; views: number }>("deploy", { target }),
      target === "live" ? `Deployed to /${draft.dashboard}` : `Deployed to /${view.preview_dashboard}`,
    );

  return (
    <ThumbRound.Provider value={thumbRound}>
    <Entities.Provider value={ha?.entities ?? []}>
    <Shell {...HEAD} state={state}>
      {view.error && <div className={guest.warning}>{view.error}</div>}
      {ha?.error && <div className={guest.warning}>Home Assistant: {ha.error}</div>}

      <div className={css.bar}>
        <div className={css.barState}>
          <span className={`${css.dot} ${dirty ? css.warnDot : view.changed ? css.warnDot : css.goodDot}`} />
          {dirty
            ? "Unsaved changes"
            : view.changed
              ? `Draft differs from live${view.deployed ? ` (deployed ${ago(view.deployed)})` : " (never deployed)"}`
              : `Live is up to date${view.deployed ? ` (deployed ${ago(view.deployed)})` : ""}`}
          {view.problems.length > 0 && !dirty && (
            <span className={css.problemCount}>{view.problems.length} to fix</span>
          )}
        </div>
        <div className={css.barActions}>
          {dirty && (
            <button className={ui.button} onClick={() => setDraft(structuredClone(view.store))} disabled={!!busy}>
              Discard
            </button>
          )}
          <button className={ui.primary} onClick={save} disabled={!dirty || !!busy}>
            {busy === "save" ? "Saving…" : "Save draft"}
          </button>
          <button
            className={ui.button}
            disabled={dirty || !!busy || view.problems.length > 0}
            title={`Deploy the draft to /${view.preview_dashboard}, with the draft composites`}
            onClick={() => deploy("preview")}
          >
            {busy === "preview" ? "Deploying…" : "Deploy preview"}
          </button>
          {view.previewed && (
            <button
              className={ui.button}
              disabled={!!busy}
              title={`Delete the preview dashboard /${view.preview_dashboard} from Home Assistant`}
              onClick={() =>
                confirm(
                  `Remove the preview dashboard /${view.preview_dashboard} from Home Assistant? The live dashboard and the draft are untouched.`,
                ) && act("unpreview", () => post<View>("remove-preview"), `Removed /${view.preview_dashboard}`)
              }
            >
              {busy === "unpreview" ? "Removing…" : "Remove preview"}
            </button>
          )}
          <button
            className={ui.button}
            disabled={dirty || !!busy || view.problems.length > 0 || !view.changed}
            title={`Deploy the draft to /${draft.dashboard}, and make it the live composites`}
            onClick={() =>
              confirm(
                `Replace the dashboard /${draft.dashboard} and the live composites with this draft? ${view.keep ? `The dashboard it replaces is kept as an older version (Backups).` : "Older versions are not being kept (Backups)."}`,
              ) && deploy("live")
            }
          >
            {busy === "live" ? "Deploying…" : "Deploy live"}
          </button>
          <button className={ui.button} disabled={dirty} onClick={() => setDialog(<YamlDialog onClose={() => setDialog(null)} />)}>
            YAML
          </button>
        </div>
      </div>

      {view.problems.length > 0 && !dirty && (
        <div className={guest.warning}>
          <strong>To fix before deploying:</strong>
          <ul className={css.problems}>
            {view.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {!!ha?.warnings?.length && !dirty && (
        <details className={`${guest.warning} ${css.warnings}`}>
          <summary>
            {plural(ha.warnings.length, "thing")} the dashboard needs that Home Assistant seems to lack (deploying still
            works)
          </summary>
          <ul className={css.problems}>
            {ha.warnings.slice(0, 12).map((w) => (
              <li key={w}>{w}</li>
            ))}
            {ha.warnings.length > 12 && <li>…and {ha.warnings.length - 12} more.</li>}
          </ul>
        </details>
      )}

      <section className={guest.area}>
        <AreaHead
          title="Commanders"
          blurb={
            <>
              Each one landscape picture: a main camera in its natural shape, framed by panels of cameras. Tapping a camera
              makes it the main one; tapping the main one opens its live page. Each commander is a device in Home Assistant
              (Camera Commander, then Camera Commander and its name), so automations choose it too, with its Main camera, and
              its Track motion switch. Each is a page of the dashboard, the first pages, in this order; the camera pages
              follow.
            </>
          }
        />
        <Commanders
          store={draft}
          blank={view.empty_commander}
          ha={ha}
          trackMotion={(id) => haSwitch(ha?.commander_switches?.[id] ?? "")}
          onTrackMotion={(id, on) =>
            ha?.commander_switches?.[id] && flip(ha.commander_switches[id], on, "Track motion")
          }
          onChange={(c) => edit((s) => (s.commanders = c))}
        />
      </section>

      <section className={guest.area}>
        <AreaHead
          title="Cameras"
          blurb="The cameras the commander and live pages use, chosen from Home Assistant. Each camera's medium channel goes to the wall tablets and phones, its high channel to everyone else."
          action={
            <button
              className={ui.primary}
              disabled={!ha?.cameras}
              onClick={() =>
                setDialog(
                  <AddCameras
                    ha={ha?.cameras ?? []}
                    chosen={draft.cameras}
                    onClose={() => setDialog(null)}
                    onAdd={(cams) => {
                      edit((s) => {
                        for (const c of cams)
                          s.cameras[c.entity] = {
                            title: c.name,
                            ...(c.medium && { medium: c.medium }),
                            ...(c.high && { high: c.high }),
                            ...(c.zoom && { zoom: c.zoom }),
                          };
                      });
                      setDialog(null);
                    }}
                  />,
                )
              }
            >
              + Add cameras
            </button>
          }
        />
        {Object.keys(draft.cameras).length === 0 ? (
          <Empty>No cameras yet. Add them from Home Assistant's list.</Empty>
        ) : (
          <div className={css.table}>
            <div className={`${css.camRow} ${css.head}`}>
              <span>Camera</span>
              <span>Channels</span>
              <span>In commanders</span>
              <span>Extras</span>
              <span />
            </div>
            {Object.entries(draft.cameras).map(([entity, cam]) => {
              const shownIn = draft.commanders.filter((c) => PANELS.some((p) => c[p].cameras.includes(entity)));
              return (
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
                  <span className={css.muted}>{shownIn.map((c) => c.name).join(", ") || "none"}</span>
                  <span className={css.muted}>
                    {[
                      cam.zoom && "zoom",
                      ha?.motion?.[entity] && "motion",
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
                            onSave={(c) => {
                              edit((s) => (s.cameras[entity] = c));
                              setDialog(null);
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
                        edit((s) => {
                          delete s.cameras[entity];
                          for (const c of s.commanders)
                            for (const p of PANELS) c[p].cameras = c[p].cameras.filter((e) => e !== entity);
                        })
                      }
                    >
                      Remove
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className={guest.area}>
        <AreaHead title="Dashboard" blurb="Where the dashboard goes and how it behaves." />
        <Settings store={draft} users={ha?.users ?? []} host={view.compositor.host} onChange={edit} />
      </section>

      <section className={guest.area}>
        <AreaHead
          title="Backups"
          blurb="Revert draft goes back to what is live. Revert preview puts the preview dashboard back as it was before its last deploy (again to undo). Older live versions: Restore puts one back (the composites are unchanged: use Revert draft and deploy for those)."
          action={
            <div className={css.revertButtons}>
              <button
                className={ui.button}
                disabled={!!busy || !view.deployed}
                onClick={() =>
                  confirm("Throw the draft away and go back to what is live?") &&
                  act("revert", () => post<View>("revert"), "Draft reverted to live")
                }
              >
                Revert draft
              </button>
              <button
                className={ui.button}
                disabled={!!busy || !view.preview_backup}
                title={
                  view.preview_backup
                    ? `Put /${view.preview_dashboard} back as it was ${ago(view.preview_backup)}`
                    : "The preview has no earlier version yet: the second preview deploy keeps the first."
                }
                onClick={() =>
                  confirm(`Put /${view.preview_dashboard} back as it was before its last deploy?`) &&
                  act("revert-preview", () => post<View>("revert-preview"), `Reverted /${view.preview_dashboard}`)
                }
              >
                Revert preview
              </button>
            </div>
          }
        />
        <div className={css.keep}>
          <span>Keep older versions</span>
          <Segmented
            value={String(view.keep)}
            options={Array.from({ length: view.max_keep + 1 }, (_, n) => [String(n), String(n)])}
            onChange={(v) =>
              act("keep", () => put<View>("keep", { keep: Number(v) }), `Keeping ${plural(Number(v), "older version")}`).then(
                () => setStamp(Date.now()),
              )
            }
          />
          <span className={css.keepHelp}>
            Of the live dashboard's config, each deploy keeps the one it replaces. Lowering it deletes the extras now.
          </span>
        </div>
        <Backups toast={toast} stamp={stamp} />
      </section>

      {dialog}
      <Toasts toasts={toasts} />
    </Shell>
    </Entities.Provider>
    </ThumbRound.Provider>
  );
}
