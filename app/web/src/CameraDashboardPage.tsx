/** Camera Dashboard: one source for the camera composites and their HA dashboard. Edits
 * are a draft (Save draft); the draft compositor draws it for the previews, and Deploy
 * sends the dashboard to HA, to the preview dashboard or the live one. Live also makes
 * the draft what the wall tablets' compositor draws. */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "./api";
import { ago } from "./format";
import { CameraIcon } from "./icons";
import { AreaHead, Empty, Shell } from "./page";
import { Dialog, Field, Segmented, Switch, Toasts, type Toast } from "./ui";
import css from "./cameras.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";

const { get, post, put } = api("camera-dashboard");

const HEAD = {
  icon: <CameraIcon />,
  title: "Camera Dashboard",
  blurb: "The cameras, how they are composed, and the dashboard that shows them.",
};

type Control = { entity: string; name?: string; icon?: string };
type Preset = string | { preset: string; label?: string };
type Ptz = { action: string; data: Record<string, string>; presets: Preset[] };
type Camera = {
  title: string;
  medium?: string;
  high?: string;
  zoom?: string;
  live?: string;
  ptz?: Ptz;
  controls?: Control[];
};
type Group = {
  cameras: string[];
  tile: [number, number];
  fit: "cover" | "contain";
  menu: boolean;
  controls?: Control[];
};
type Row = { groups?: string[]; strip?: string[] };
type Overview = { width: number; gap: number; cell_aspect: number; strip_aspect: number; rows: Row[] };
type Panel = {
  cameras: string[];
  size: number;
  fit: "cover" | "contain";
  /** Top and bottom: run to the view's edge at that end (the side panel stops at them). */
  anchor_left?: boolean;
  anchor_right?: boolean;
};
const PANELS = ["left", "top", "right", "bottom"] as const;
type Commander = {
  width: number;
  height: number;
  gap: number;
  main: string;
  main_fit: "fit" | "fill" | "crop";
} & Record<(typeof PANELS)[number], Panel>;
type Store = {
  dashboard: string;
  title: string;
  home: string;
  help: string;
  nav_style: "badges" | "tiles";
  theme: string;
  placeholder: string;
  portrait_query: string;
  phone_query: string;
  wall_users: string[];
  live_card: string;
  hi_live_card: string;
  compositor_host: string;
  cameras: Record<string, Camera>;
  groups: Record<string, Group>;
  overview: Overview;
  overview_portrait: Overview;
  overview_mode: "groups" | "commander";
  commander: Commander;
};
type View = {
  store: Store;
  problems: string[];
  error: string | null;
  changed: boolean;
  deployed: string | null;
  preview_dashboard: string;
  compositor: { live: boolean; draft: boolean; host: string | null };
};
type HACamera = { entity: string; name: string; device_id: string | null; medium?: string; high?: string; zoom?: string };
type HAUser = { id: string; name: string; is_active: boolean };
type HA = {
  cameras?: HACamera[];
  users?: HAUser[];
  entities?: { entity: string; name: string }[];
  /** What the saved draft needs that Home Assistant seems to lack. */
  warnings?: string[];
  error: string | null;
};
type Backup = { name: string; url_path: string; saved: string };

const CARDS: [string, string][] = [
  ["picture-entity", "Picture entity (built in)"],
  ["webrtc-camera", "WebRTC camera (custom)"],
  ["advanced-camera-card", "Advanced camera card (custom)"],
];
/** How often the camera thumbnails are fetched again. */
const THUMB_EVERY_MS = 5 * 60_000;
/** Which round of thumbnails to show: bumped every THUMB_EVERY_MS. */
const ThumbRound = createContext(0);
/** Home Assistant's entities, for the entity fields. */
const Entities = createContext<{ entity: string; name: string }[]>([]);

const DEFAULT_PTZ: Ptz = { action: "unifiprotect.ptz_goto_preset", data: {}, presets: [] };

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
  useEffect(() => {
    // Again after each save: the warnings are about the saved draft.
    get<HA>("ha").then(setHa, (err) => setHa({ error: (err as Error).message }));
  }, [stamp]);

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

  const names = { cameras: draft.cameras, groups: Object.keys(draft.groups) };
  const nameGroup = (title: string, initial: string, save: (name: string) => void) =>
    setDialog(
      <NameDialog
        title={title}
        initial={initial}
        taken={names.groups}
        onClose={() => setDialog(null)}
        onSave={(name) => {
          save(name);
          setDialog(null);
        }}
      />,
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
          <button
            className={ui.button}
            disabled={dirty || !!busy || view.problems.length > 0 || !view.changed}
            title={`Deploy the draft to /${draft.dashboard}, and make it the live composites`}
            onClick={() =>
              confirm(
                `Replace the dashboard /${draft.dashboard} and the live composites with this draft? What it replaces is kept (Backups).`,
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
          title="Overview"
          blurb="The first page: every group's composite in one picture. Tap a group to open its page. Landscape for tablets and computers, portrait for phones held upright."
          action={
            <Field label="Landscape overview">
              <Segmented
                value={draft.overview_mode}
                options={[
                  ["groups", "Groups"],
                  ["commander", "Commander"],
                ]}
                onChange={(m) => edit((s) => (s.overview_mode = m))}
              />
            </Field>
          }
        />
        <div className={css.overviews}>
          {(["overview", "overview_portrait"] as const).map((key) =>
            key === "overview" && draft.overview_mode === "commander" ? (
              <div key={key} className={css.overview}>
                <h3>Landscape: the commander</h3>
                <LivePreview store={draft} name="commander" />
                <p className={css.hint}>The commander is the landscape overview; set it up under Commander below.</p>
              </div>
            ) : (
            <OverviewEditor
              key={key}
              title={key === "overview" ? "Landscape" : "Portrait"}
              value={draft[key]}
              groups={names.groups}
              thumb={(g) => <GroupThumb entities={draft.groups[g]?.cameras ?? []} />}
              preview={<LivePreview store={draft} name="overview" portrait={key !== "overview"} />}
              onChange={(o) => edit((s) => (s[key] = o))}
            />
            ),
          )}
        </div>
      </section>

      <section className={guest.area}>
        <AreaHead
          title="Commander"
          blurb={
            <>
              One landscape picture: a main camera in its natural shape, framed by panels of cameras. Tapping a camera makes it
              the main one; tapping the main one opens its live page. Automations choose it too, with the Camera Commander's
              Main camera in Home Assistant.{" "}
              {draft.overview_mode === "commander"
                ? "It is the landscape overview."
                : "Choose Commander as the landscape overview to show it."}
            </>
          }
        />
        <CommanderEditor
          value={draft.commander}
          cameras={draft.cameras}
          preview={<LivePreview store={draft} name="commander" />}
          onChange={(c) => edit((s) => (s.commander = c))}
        />
      </section>

      <section className={guest.area}>
        <AreaHead
          title="Groups"
          blurb="Each group is one composite and one dashboard page; tap a camera on it to open the camera's live page. Groups out of the menu (the wall composites) are only for viewing."
          action={
            <button
              className={ui.primary}
              disabled={Object.keys(draft.cameras).length === 0}
              onClick={() =>
                nameGroup("New group", "", (name) =>
                  edit((s) => (s.groups[name] = { cameras: [], tile: [640, 340], fit: "cover", menu: true })),
                )
              }
            >
              + Add group
            </button>
          }
        />
        {Object.keys(draft.groups).length === 0 ? (
          <Empty>No groups yet. Add the cameras first, then group them.</Empty>
        ) : (
          <div className={css.groups}>
            {Object.entries(draft.groups).map(([name, g], i, all) => (
              <GroupCard
                key={name}
                name={name}
                group={g}
                cameras={draft.cameras}
                preview={<LivePreview store={draft} name={name} />}
                first={i === 0}
                last={i === all.length - 1}
                onChange={(next) => edit((s) => (s.groups[name] = next))}
                onRename={() =>
                  nameGroup("Rename group", name, (to) =>
                    edit((s) => {
                    s.groups = renameKey(s.groups, name, to);
                    for (const o of [s.overview, s.overview_portrait])
                      for (const row of o.rows)
                        for (const k of ["groups", "strip"] as const)
                          if (row[k]) row[k] = row[k]!.map((n) => (n === name ? to : n));
                    }),
                  )
                }
                onMove={(by) => edit((s) => (s.groups = moveKey(s.groups, name, by)))}
                onRemove={() =>
                  edit((s) => {
                    delete s.groups[name];
                    for (const o of [s.overview, s.overview_portrait])
                      o.rows = o.rows
                        .map((r) => (r.groups ? { groups: r.groups.filter((n) => n !== name) } : { strip: r.strip!.filter((n) => n !== name) }))
                        .filter((r) => (r.groups ?? r.strip)!.length > 0);
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className={guest.area}>
        <AreaHead
          title="Cameras"
          blurb="The cameras the composites and live pages use, chosen from Home Assistant. Each camera's medium channel goes to the wall tablets and phones, its high channel to everyone else."
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
              <span>In groups</span>
              <span>Extras</span>
              <span />
            </div>
            {Object.entries(draft.cameras).map(([entity, cam]) => {
              const inGroups = Object.entries(draft.groups)
                .filter(([, g]) => g.cameras.includes(entity))
                .map(([n]) => n);
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
                  <span className={css.muted}>{inGroups.join(", ") || "none"}</span>
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
                          for (const g of Object.values(s.groups)) g.cameras = g.cameras.filter((e) => e !== entity);
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
          blurb="Every deploy keeps the dashboard config it replaces. Restore puts one back (the composites are unchanged: use Revert draft and deploy for those)."
          action={
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
          }
        />
        <Backups toast={toast} stamp={stamp} />
      </section>

      {dialog}
      <Toasts toasts={toasts} />
    </Shell>
    </Entities.Provider>
    </ThumbRound.Provider>
  );
}

/** One overview layout: its rows of groups, its sizes and its preview. */
function OverviewEditor({
  title,
  value,
  groups,
  thumb,
  preview,
  onChange,
}: {
  title: string;
  value: Overview;
  groups: string[];
  thumb: (group: string) => ReactNode;
  preview: ReactNode;
  onChange: (o: Overview) => void;
}) {
  const set = (change: (o: Overview) => void) => {
    const next = structuredClone(value);
    change(next);
    onChange(next);
  };
  return (
    <div className={css.overview}>
      <h3>{title}</h3>
      {preview}
      <div className={css.numbers}>
        <Num label="Width" value={value.width} onChange={(n) => set((o) => (o.width = n))} />
        <Num label="Gap" value={value.gap} onChange={(n) => set((o) => (o.gap = n))} />
        <Num label="Cell aspect" step={0.05} value={value.cell_aspect} onChange={(n) => set((o) => (o.cell_aspect = n))} />
        <Num label="Strip aspect" step={0.05} value={value.strip_aspect} onChange={(n) => set((o) => (o.strip_aspect = n))} />
      </div>
      <ol className={css.rows}>
        {value.rows.map((row, i) => {
          const kind = row.groups ? "groups" : "strip";
          const names = (row.groups ?? row.strip)!;
          return (
            <li key={i} className={css.row}>
              <Segmented
                value={kind}
                options={[
                  ["groups", "Groups"],
                  ["strip", "Strip"],
                ]}
                onChange={(k) => set((o) => (o.rows[i] = { [k]: names }))}
              />
              <Chips
                items={names}
                label={(n) => n}
                thumb={thumb}
                choices={groups.filter((g) => !names.includes(g))}
                onChange={(items) => set((o) => (o.rows[i] = { [kind]: items }))}
              />
              <span className={css.rowTools}>
                <button className={ui.iconButton} disabled={i === 0} onClick={() => set((o) => o.rows.splice(i - 1, 0, ...o.rows.splice(i, 1)))} aria-label="Move row up">
                  ↑
                </button>
                <button className={ui.iconButton} onClick={() => set((o) => o.rows.splice(i, 1))} aria-label="Remove row">
                  ✕
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      <button className={`${ui.button} ${ui.small} ${css.start}`} disabled={!groups.length} onClick={() => set((o) => o.rows.push({ groups: [] }))}>
        + Row
      </button>
      <p className={css.hint}>
        <b>Groups</b>: each group's composite as one cell. <b>Strip</b>: those groups' cameras side by side in one line.
      </p>
    </div>
  );
}

const PANEL_NAMES: Record<(typeof PANELS)[number], [title: string, size: string]> = {
  left: ["Left", "Width, % of the picture"],
  top: ["Top", "Height, % of the picture"],
  right: ["Right", "Width, % of the picture"],
  bottom: ["Bottom", "Height, % of the picture"],
};

/** The commander's layout: its size, the main camera at start, and its four panels. */
function CommanderEditor({
  value,
  cameras,
  preview,
  onChange,
}: {
  value: Commander;
  cameras: Record<string, Camera>;
  preview: ReactNode;
  onChange: (c: Commander) => void;
}) {
  const set = (change: (c: Commander) => void) => {
    const next = structuredClone(value);
    change(next);
    onChange(next);
  };
  const inPanels = [...new Set(PANELS.flatMap((p) => value[p].cameras))];
  return (
    <div className={css.commander}>
      <div className={css.commanderTop}>
        <div className={css.commanderPreview}>{preview}</div>
        <div className={css.numbers}>
          <Num label="Width" value={value.width} onChange={(n) => set((c) => (c.width = n))} />
          <Num label="Height" value={value.height} onChange={(n) => set((c) => (c.height = n))} />
          <Num label="Gap" value={value.gap} onChange={(n) => set((c) => (c.gap = n))} />
          <div className={css.wide}>
            <Field label="Main camera" help="Fit: whole, with black borders. Fill: stretched to the space. Crop: fills it, edges cut off.">
              <Segmented
                value={value.main_fit ?? "fit"}
                options={[
                  ["fit", "Fit"],
                  ["fill", "Fill"],
                  ["crop", "Crop"],
                ]}
                onChange={(f) => set((c) => (c.main_fit = f))}
              />
            </Field>
          </div>
          <div className={css.wide}>
            <Field label="Main camera at start">
              <select value={value.main} onChange={(e) => set((c) => (c.main = e.target.value))}>
                <option value="">The first one</option>
                {inPanels.map((e) => (
                  <option key={e} value={e}>
                    {cameras[e]?.title ?? e}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>
      <div className={css.panels}>
        {PANELS.map((p) => (
          <div key={p} className={css.overview}>
            <h3>{PANEL_NAMES[p][0]}</h3>
            <Chips
              items={value[p].cameras}
              label={(e) => cameras[e]?.title ?? e}
              thumb={(e) => <Thumb entity={e} />}
              choices={Object.keys(cameras).filter((e) => !inPanels.includes(e))}
              onChange={(items) => set((c) => (c[p].cameras = items))}
            />
            <div className={css.numbers}>
              <Num label={PANEL_NAMES[p][1]} value={value[p].size} onChange={(n) => set((c) => (c[p].size = n))} />
              <Field label="Fit">
                <Segmented
                  value={value[p].fit}
                  options={[
                    ["cover", "Fill"],
                    ["contain", "Whole"],
                  ]}
                  onChange={(f) => set((c) => (c[p].fit = f))}
                />
              </Field>
              {(p === "top" || p === "bottom") &&
                (["anchor_left", "anchor_right"] as const).map((end) => (
                  <Field
                    key={end}
                    label={end === "anchor_left" ? "To the left edge" : "To the right edge"}
                    help={
                      end === "anchor_left"
                        ? "On: it runs to the view's edge and Left stops at it. Off: it stops at Left."
                        : "On: it runs to the view's edge and Right stops at it. Off: it stops at Right."
                    }
                  >
                    <Switch
                      on={value[p][end] ?? p === "bottom"}
                      label={end === "anchor_left" ? "To the left edge" : "To the right edge"}
                      onChange={(on) => set((c) => (c[p][end] = on))}
                    />
                  </Field>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupCard({
  name,
  group,
  cameras,
  preview,
  first,
  last,
  onChange,
  onRename,
  onMove,
  onRemove,
}: {
  name: string;
  group: Group;
  cameras: Record<string, Camera>;
  preview: ReactNode;
  first: boolean;
  last: boolean;
  onChange: (g: Group) => void;
  onRename: () => void;
  onMove: (by: number) => void;
  onRemove: () => void;
}) {
  const set = (change: (g: Group) => void) => {
    const next = structuredClone(group);
    change(next);
    onChange(next);
  };
  return (
    <article className={css.group}>
      <header className={css.groupHead}>
        <h3>{name}</h3>
        {!group.menu && <span className={guest.badge}>wall</span>}
        <span className={css.rowTools}>
          <button className={ui.iconButton} disabled={first} onClick={() => onMove(-1)} aria-label="Move earlier">
            ↑
          </button>
          <button className={ui.iconButton} disabled={last} onClick={() => onMove(1)} aria-label="Move later">
            ↓
          </button>
          <button className={ui.iconButton} onClick={onRename} aria-label="Rename">
            ✎
          </button>
          <button className={ui.iconButton} onClick={onRemove} aria-label="Remove">
            ✕
          </button>
        </span>
      </header>
      {preview}
      <Chips
        items={group.cameras}
        label={(e) => cameras[e]?.title ?? e}
        thumb={(e) => <Thumb entity={e} />}
        choices={Object.keys(cameras).filter((e) => !group.cameras.includes(e))}
        onChange={(items) => set((g) => (g.cameras = items))}
      />
      <div className={css.numbers}>
        <Num label="Tile width" value={group.tile[0]} onChange={(n) => set((g) => (g.tile = [n, g.tile[1]]))} />
        <Num label="Tile height" value={group.tile[1]} onChange={(n) => set((g) => (g.tile = [g.tile[0], n]))} />
        <Field label="Fit">
          <Segmented
            value={group.fit}
            options={[
              ["cover", "Fill"],
              ["contain", "Whole"],
            ]}
            onChange={(f) => set((g) => (g.fit = f))}
          />
        </Field>
        <Field label="In the menu">
          <Switch on={group.menu} label="In the menu" onChange={(on) => set((g) => (g.menu = on))} />
        </Field>
      </div>
      <details className={css.more}>
        <summary>Page controls ({group.controls?.length ?? 0})</summary>
        <Controls value={group.controls ?? []} onChange={(c) => set((g) => (g.controls = c))} />
      </details>
    </article>
  );
}

/** A composite drawn from the unsaved draft, redrawn a moment after an edit that changes
 * it (and only then: the key is what the picture depends on). The last picture stays,
 * dimmed, while the next is drawn. */
function LivePreview({ store, name, portrait = false }: { store: Store; name: string; portrait?: boolean }) {
  const key = previewKey(store, name, portrait);
  const [src, setSrc] = useState<string>();
  const [note, setNote] = useState<string>();
  const [busy, setBusy] = useState(true);
  const latest = useRef(store);
  latest.current = store;
  const shown = useRef<string | undefined>(undefined);
  const drawn = useRef(false); // the first picture at once; after edits, a short pause
  useEffect(
    () => () => {
      if (shown.current) URL.revokeObjectURL(shown.current);
    },
    [],
  );
  useEffect(() => {
    let gone = false;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch("api/camera-dashboard/render", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store: latest.current, name, portrait }),
        });
        if (gone) return;
        if (r.ok) {
          const url = URL.createObjectURL(await r.blob());
          if (shown.current) URL.revokeObjectURL(shown.current);
          shown.current = url;
          setSrc(url);
          setNote(undefined);
        } else setNote((await r.json().catch(() => ({}))).error ?? `The app answered ${r.status}.`);
      } catch (err) {
        if (!gone) setNote((err as Error).message);
      } finally {
        if (!gone) setBusy(false);
      }
    }, drawn.current ? 400 : 0);
    drawn.current = true;
    return () => {
      gone = true;
      clearTimeout(timer);
    };
  }, [key, name, portrait]);
  if (note) return <div className={css.noPreview}>{note}</div>;
  if (!src) return <div className={css.noPreview}>Drawing…</div>;
  return <img className={`${css.preview} ${busy ? css.stale : ""}`} src={src} alt={`${name} composite`} />;
}

/** Everything a composite depends on, so a preview is redrawn only when that changes. */
function previewKey(store: Store, name: string, portrait: boolean): string {
  if (name === "commander") {
    const cams = PANELS.flatMap((p) => store.commander[p].cameras);
    return JSON.stringify([store.commander, cams.map((e) => store.cameras[e]?.title)]);
  }
  const group = (n: string) => {
    const g = store.groups[n];
    return g && [g.cameras.map((e) => [e, store.cameras[e]?.title]), g.tile, g.fit];
  };
  if (name !== "overview") return JSON.stringify([group(name), portrait]);
  const layout = portrait ? store.overview_portrait : store.overview;
  return JSON.stringify([layout, layout.rows.flatMap((r) => r.groups ?? r.strip ?? []).map(group)]);
}

function NameDialog({
  title,
  initial,
  taken,
  onClose,
  onSave,
}: {
  title: string;
  initial: string;
  taken: string[];
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  const clean = name.trim();
  const clash = clean !== initial && taken.includes(clean);
  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} disabled={!clean || clash || clean === initial} onClick={() => onSave(clean)}>
            {initial ? "Rename" : "Add"}
          </button>
        </>
      }
    >
      <Field
        label="Name"
        help={clash ? `There is already a group called ${clean}.` : "On the group's picture in the overview, and as its page's name."}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
    </Dialog>
  );
}

/** An ordered list as chips: move, remove, and add from the choices. */
function Chips({
  items,
  label,
  thumb,
  choices,
  onChange,
}: {
  items: string[];
  label: (item: string) => string;
  thumb: (item: string) => ReactNode;
  choices: string[];
  onChange: (items: string[]) => void;
}) {
  const move = (i: number, by: number) => {
    const next = [...items];
    next.splice(i + by, 0, ...next.splice(i, 1));
    onChange(next);
  };
  return (
    <div className={css.chips}>
      {items.map((item, i) => (
        <span key={item} className={css.chip}>
          <button className={css.chipTool} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${label(item)} earlier`}>
            ‹
          </button>
          {label(item)}
          <button className={css.chipTool} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${label(item)} later`}>
            ›
          </button>
          <button className={css.chipTool} onClick={() => onChange(items.filter((x) => x !== item))} aria-label={`Remove ${label(item)}`}>
            ✕
          </button>
        </span>
      ))}
      {choices.length > 0 && (
        <AddMenu choices={choices} label={label} thumb={thumb} onPick={(c) => onChange([...items, c])} />
      )}
    </div>
  );
}

/** "+ Add…" as a menu with a picture against each choice (a native select can't show
 * pictures). Keys as a select: arrows, Enter, Escape; a tap or click outside closes it. */
function AddMenu({
  choices,
  label,
  thumb,
  onPick,
}: {
  choices: string[];
  label: (item: string) => string;
  thumb: (item: string) => ReactNode;
  onPick: (item: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const ref = useClickAway<HTMLDivElement>(open, () => setOpen(false));
  const pick = (c: string) => {
    onPick(c);
    setOpen(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAt(0);
        setOpen(true);
      }
      return;
    }
    const keys: Record<string, () => void> = {
      Escape: () => setOpen(false),
      ArrowDown: () => setAt((a) => Math.min(a + 1, choices.length - 1)),
      ArrowUp: () => setAt((a) => Math.max(a - 1, 0)),
      Home: () => setAt(0),
      End: () => setAt(choices.length - 1),
      Enter: () => pick(choices[Math.min(at, choices.length - 1)]),
    };
    if (keys[e.key]) {
      e.preventDefault();
      e.stopPropagation();
      keys[e.key]();
    } else if (e.key === "Tab") setOpen(false);
  };
  return (
    <div className={css.addMenu} ref={ref} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={css.add}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setAt(0);
          setOpen((o) => !o);
        }}
      >
        + Add…
      </button>
      {open && (
        <ul role="listbox" className={css.menu} aria-label="Add">
          {choices.map((c, i) => (
            <li
              key={c}
              role="option"
              aria-selected={i === at}
              className={i === at ? css.menuOn : ""}
              ref={i === at ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
              onPointerEnter={() => setAt(i)}
              onClick={() => pick(c)}
            >
              {thumb(c)}
              <span>{label(c)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Channel = { channel: "camera" | "low" | "medium" | "high"; entity: string; url: string };

const CHANNELS: Record<Channel["channel"], [label: string, about: string]> = {
  camera: ["The camera", "the camera itself (it has no separate channels)"],
  low: ["Low", "the low channel, the one the composites are made from"],
  medium: ["Medium", "the medium channel, the one the wall tablets and phones play"],
  high: ["High", "the high channel, the one everyone else plays; the slowest to come through here"],
};

/** One camera's live picture, each of its channels to choose from: Home Assistant's MJPEG
 * stream, played from HA directly as its camera cards do (the app only gives the address). */
function LiveView({ entity, title, onClose }: { entity: string; title: string; onClose: () => void }) {
  const img = useRef<HTMLImageElement>(null);
  const [channels, setChannels] = useState<Channel[]>();
  const [chosen, setChosen] = useState<Channel["channel"]>();
  const [state, setState] = useState<"connecting" | "live" | "failed">("connecting");
  const [error, setError] = useState<string>();
  useEffect(() => {
    get<{ channels: Channel[] }>(`live/${encodeURIComponent(entity)}`).then(
      (r) => {
        setChannels(r.channels);
        setChosen(r.channels[0]?.channel);
      },
      (err) => setError((err as Error).message),
    );
  }, [entity]);
  const shown = channels?.find((c) => c.channel === chosen);
  // Blank the image on a change of channel and on close: a browser can keep an <img>
  // stream open after the image is gone.
  useEffect(() => {
    const el = img.current;
    return () => {
      if (el) el.src = "";
    };
  }, [shown?.url]);
  const note = error ?? (channels && !shown ? "Home Assistant has no stream of this camera." : undefined);
  return (
    <Dialog
      title={title}
      wide
      onClose={onClose}
      footer={
        <button className={ui.primary} onClick={onClose}>
          Close
        </button>
      }
    >
      {channels && channels.length > 1 && (
        <Segmented
          value={chosen ?? channels[0].channel}
          options={channels.map((c) => [c.channel, CHANNELS[c.channel][0]])}
          onChange={(c) => {
            setState("connecting");
            setChosen(c);
          }}
        />
      )}
      <div className={css.live}>
        {shown && (
          <img
            key={shown.url}
            ref={img}
            src={shown.url}
            alt={`${title}, live`}
            onLoad={() => setState("live")}
            onError={() => setState("failed")}
          />
        )}
        {(note || state !== "live") && (
          <span className={css.liveNote}>
            {note ?? (state === "failed" ? "No live picture from this channel." : "Connecting…")}
          </span>
        )}
      </div>
      {shown && (
        <p className={css.muted}>
          <code>{shown.entity}</code>: {CHANNELS[shown.channel][1]}. Home Assistant's MJPEG stream, made from the camera's
          snapshots: a few pictures a second, not video.
        </p>
      )}
    </Dialog>
  );
}

/** Closes a popup (calls `close`) on a tap or click outside the returned ref. On the
 * finished click, not the press: closing a tall list moves the page, and a press that
 * closed it would leave the release over something else, losing the click (a control's ✕). */
function useClickAway<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) latest.current();
    };
    addEventListener("click", away);
    return () => removeEventListener("click", away);
  }, [open]);
  return ref;
}

const MAX_MATCHES = 100;

/** An entity field as in Home Assistant: type part of an id or a name ("switch.", "gate
 * light") and pick from the matches; every word typed must match. `domain` limits it to
 * one kind (camera, number...). Anything typed is kept, picked or not. */
function EntityInput({
  value,
  onChange,
  domain,
  placeholder,
}: {
  value: string;
  onChange: (entity: string) => void;
  domain?: string;
  placeholder?: string;
}) {
  const all = useContext(Entities);
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const ref = useClickAway<HTMLDivElement>(open, () => setOpen(false));
  const matches = useMemo(() => {
    const words = value.toLowerCase().split(/\s+/).filter(Boolean);
    const pool = domain ? all.filter((e) => e.entity.startsWith(`${domain}.`)) : all;
    return pool.filter((e) => {
      const text = `${e.entity} ${e.name}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [all, value, domain]);
  const shown = matches.slice(0, MAX_MATCHES);
  const pick = (entity: string) => {
    onChange(entity);
    setOpen(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => (open ? setAt((a) => Math.min(a + 1, shown.length - 1)) : setOpen(true)),
      ArrowUp: () => setAt((a) => Math.max(a - 1, 0)),
      Escape: () => setOpen(false),
      Enter: () => shown[at] && pick(shown[at].entity),
    };
    // Esc and Enter belong to the dialog around this field unless the list is open.
    if (keys[e.key] && (open || e.key === "ArrowDown")) {
      e.preventDefault();
      e.stopPropagation();
      keys[e.key]();
    } else if (e.key === "Tab") setOpen(false);
  };
  return (
    <div className={css.combo} ref={ref} onKeyDown={onKeyDown}>
      <input
        value={value}
        placeholder={placeholder ?? (domain ? `${domain}.` : "")}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setAt(0);
          setOpen(true);
        }}
      />
      {open && shown.length > 0 && (
        <ul role="listbox" className={css.menu}>
          {shown.map((e, i) => (
            <li
              key={e.entity}
              role="option"
              aria-selected={i === at}
              className={i === at ? css.menuOn : ""}
              ref={i === at ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
              onPointerEnter={() => setAt(i)}
              onPointerDown={(ev) => ev.preventDefault()} // keep the focus in the field
              onClick={() => pick(e.entity)}
            >
              <span className={css.entity}>
                <span>{e.name}</span>
                <code>{e.entity}</code>
              </span>
            </li>
          ))}
          {matches.length > MAX_MATCHES && (
            <li className={css.menuNote} aria-disabled="true">
              {matches.length - MAX_MATCHES} more: keep typing
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** A camera's small still, fetched again each thumbnail round; a blank frame if it has none. */
function Thumb({ entity }: { entity: string }) {
  const round = useContext(ThumbRound);
  const [failed, setFailed] = useState<number>();
  if (failed === round) return <span className={css.thumb} aria-hidden="true" />;
  return (
    <img
      className={css.thumb}
      src={`api/camera-dashboard/thumb/${encodeURIComponent(entity)}?r=${round}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(round)}
    />
  );
}

/** A group's cameras as thumbnails on the compositor's grid (as many columns as the
 * square root, rounded up), so a group is recognisable before its composite is drawn. */
function GroupThumb({ entities }: { entities: string[] }) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(entities.length)));
  return (
    <span className={css.groupThumb} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} aria-hidden="true">
      {entities.map((e) => (
        <Thumb key={e} entity={e} />
      ))}
    </span>
  );
}

function Num({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}

/** Entities shown at the top of a page (gates, lights): tapping one toggles it. */
function Controls({ value, onChange }: { value: Control[]; onChange: (c: Control[]) => void }) {
  const set = (i: number, c: Partial<Control>) => {
    const next = value.map((x, j) => (j === i ? clean({ ...x, ...c }) : x));
    onChange(next);
  };
  return (
    <div className={css.controls}>
      {value.map((c, i) => (
        <div key={i} className={css.control}>
          <EntityInput placeholder="switch.gate" value={c.entity} onChange={(entity) => set(i, { entity })} />
          <input placeholder="Name (the entity's own)" value={c.name ?? ""} onChange={(e) => set(i, { name: e.target.value })} />
          <input placeholder="mdi:gate (the entity's own)" value={c.icon ?? ""} onChange={(e) => set(i, { icon: e.target.value })} />
          <button className={ui.iconButton} onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove control">
            ✕
          </button>
        </div>
      ))}
      <button className={`${ui.button} ${ui.small} ${css.start}`} onClick={() => onChange([...value, { entity: "" }])}>
        + Control
      </button>
    </div>
  );
}

function clean(c: Control): Control {
  const out: Control = { entity: c.entity };
  if (c.name) out.name = c.name;
  if (c.icon) out.icon = c.icon;
  return out;
}

function AddCameras({
  ha,
  chosen,
  onClose,
  onAdd,
}: {
  ha: HACamera[];
  chosen: Record<string, Camera>;
  onClose: () => void;
  onAdd: (cams: HACamera[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const left = ha.filter((c) => !chosen[c.entity] && `${c.name} ${c.entity}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <Dialog
      title="Add cameras"
      wide
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} disabled={!picked.length} onClick={() => onAdd(ha.filter((c) => picked.includes(c.entity)))}>
            Add {picked.length || ""}
          </button>
        </>
      }
    >
      <input placeholder="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
      {left.length === 0 ? (
        <Empty>{ha.length ? "Every camera is already added." : "Home Assistant has no cameras."}</Empty>
      ) : (
        <ul className={css.pick}>
          {left.map((c) => (
            <li key={c.entity}>
              <label>
                <input
                  type="checkbox"
                  checked={picked.includes(c.entity)}
                  onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.entity] : p.filter((x) => x !== c.entity)))}
                />
                <span>
                  <strong>{c.name}</strong>
                  <code>{c.entity}</code>
                  <small>{[c.medium && "medium", c.high && "high", c.zoom && "zoom"].filter(Boolean).join(" · ") || "no channels"}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function CameraDialog({
  entity,
  camera,
  ha,
  onClose,
  onSave,
}: {
  entity: string;
  camera: Camera;
  ha?: HACamera;
  onClose: () => void;
  onSave: (c: Camera) => void;
}) {
  const [c, setC] = useState<Camera>(structuredClone(camera));
  const [presets, setPresets] = useState(presetText(camera.ptz?.presets ?? []));
  const set = (change: Partial<Camera>) => setC((x) => ({ ...x, ...change }));
  const opt = (v: string) => v.trim() || undefined;
  return (
    <Dialog
      title={`${camera.title}`}
      wide
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button
            className={ui.primary}
            disabled={!c.title.trim()}
            onClick={() => {
              const out: Camera = { ...c, title: c.title.trim() };
              for (const k of ["medium", "high", "zoom", "live"] as const) if (!out[k]) delete out[k];
              if (out.ptz) out.ptz = { ...out.ptz, presets: parsePresets(presets) };
              if (!out.controls?.length) delete out.controls;
              onSave(out);
            }}
          >
            Done
          </button>
        </>
      }
    >
      <p className={css.muted}>
        <code>{entity}</code> is drawn in the composites.
      </p>
      <Field label="Title" help="On its composite tile and as its page's name.">
        <input value={c.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className={css.two}>
        <Field label="Medium channel" help="Wall tablets and phones. Blank: the camera itself.">
          <EntityInput domain="camera" value={c.medium ?? ""} placeholder={ha?.medium} onChange={(v) => set({ medium: opt(v) })} />
        </Field>
        <Field label="High channel" help="Everyone else. Blank: the camera itself.">
          <EntityInput domain="camera" value={c.high ?? ""} placeholder={ha?.high} onChange={(v) => set({ high: opt(v) })} />
        </Field>
        <Field label="Zoom" help="A number entity; shown on its page.">
          <EntityInput domain="number" value={c.zoom ?? ""} placeholder={ha?.zoom} onChange={(v) => set({ zoom: opt(v) })} />
        </Field>
        <Field label="Live card" help="Overrides the dashboard's cards, e.g. for cameras that only give MJPEG.">
          <select value={c.live ?? ""} onChange={(e) => set({ live: opt(e.target.value) })}>
            <option value="">The dashboard's</option>
            {CARDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="PTZ presets">
        <Switch
          on={!!c.ptz}
          label="PTZ presets"
          onChange={(on) =>
            set({ ptz: on ? { ...DEFAULT_PTZ, data: ha?.device_id ? { device_id: ha.device_id } : {} } : undefined })
          }
        />
      </Field>
      {c.ptz && (
        <div className={css.two}>
          <Field label="Action" help="Run with the data below plus preset: <name>.">
            <input value={c.ptz.action} onChange={(e) => set({ ptz: { ...c.ptz!, action: e.target.value } })} />
          </Field>
          <Field label="Device id" help="The camera's device (filled in from Home Assistant).">
            <input
              value={c.ptz.data.device_id ?? ""}
              onChange={(e) => set({ ptz: { ...c.ptz!, data: { ...c.ptz!.data, device_id: e.target.value } } })}
            />
          </Field>
          <Field label="Presets" help="One per line, in order. Preset | Label when the tile needs another name.">
            <textarea rows={8} value={presets} onChange={(e) => setPresets(e.target.value)} />
          </Field>
        </div>
      )}
      <Field label="Page controls" help="Entities at the top of its live page (a gate, a light); a tap toggles them.">
        <Controls value={c.controls ?? []} onChange={(controls) => set({ controls })} />
      </Field>
    </Dialog>
  );
}

function presetText(presets: Preset[]): string {
  return presets.map((p) => (typeof p === "string" ? p : p.label ? `${p.preset} | ${p.label}` : p.preset)).join("\n");
}

function parsePresets(text: string): Preset[] {
  return text
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()))
    .filter(([p]) => p)
    .map(([preset, label]) => (label ? { preset, label } : preset));
}

function Settings({
  store,
  users,
  host,
  onChange,
}: {
  store: Store;
  users: HAUser[];
  host: string | null;
  onChange: (change: (s: Store) => void) => void;
}) {
  const text = (key: keyof Store, label: string, help: ReactNode, placeholder?: string) => (
    <Field label={label} help={help}>
      <input value={store[key] as string} placeholder={placeholder} onChange={(e) => onChange((s) => ((s[key] as string) = e.target.value))} />
    </Field>
  );
  return (
    <div className={css.settings}>
      <div className={css.two}>
        {text("dashboard", "Dashboard URL", <>It goes to /{store.dashboard}; the preview to /{store.dashboard}-preview. Created if missing.</>)}
        {text("title", "Title", "The dashboard's name, and its first page's.")}
        {text("home", "Home", "Where the Home button goes.")}
        {text("help", "Help", "Where the Help button goes.")}
        <Field label="Navigation" help="Back, Home and Help (and the page controls) as header badges, or as a row of tiles.">
          <Segmented
            value={store.nav_style}
            options={[
              ["badges", "Badges"],
              ["tiles", "Tiles"],
            ]}
            onChange={(v) => onChange((s) => (s.nav_style = v))}
          />
        </Field>
        {text("theme", "Theme", "A Home Assistant theme for every page; blank for the default.")}
        <Field label="Tile entity" help="Tiles need an entity; this input_button helper stands in for the navigation and preset tiles.">
          <EntityInput domain="input_button" value={store.placeholder} onChange={(v) => onChange((s) => (s.placeholder = v))} />
        </Field>
        {text("compositor_host", "Compositor host", <>The address the composites are fetched from. Blank: this box ({host ?? "unknown"}).</>, host ?? "")}
        <Field label="Live card (wall tablets and phones)">
          <select value={store.live_card} onChange={(e) => onChange((s) => (s.live_card = e.target.value))}>
            {CARDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Live card (everyone else)">
          <select value={store.hi_live_card} onChange={(e) => onChange((s) => (s.hi_live_card = e.target.value))}>
            <option value="">The same</option>
            {CARDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        {text("portrait_query", "Portrait screens", "A media query: these get the portrait composites.")}
        {text("phone_query", "Phones", "A media query: these get the medium channel.")}
      </div>
      <Field label="Wall tablets" help="Home Assistant users that are wall tablets: they get the medium channel.">
        <div className={css.users}>
          {users.map((u) => (
            <label key={u.id} className={css.user}>
              <input
                type="checkbox"
                checked={store.wall_users.includes(u.id)}
                onChange={(e) =>
                  onChange((s) => (s.wall_users = e.target.checked ? [...s.wall_users, u.id] : s.wall_users.filter((x) => x !== u.id)))
                }
              />
              {u.name}
            </label>
          ))}
          {store.wall_users
            .filter((id) => !users.some((u) => u.id === id))
            .map((id) => (
              <label key={id} className={css.user} title="Not one of Home Assistant's users">
                <input type="checkbox" checked onChange={() => onChange((s) => (s.wall_users = s.wall_users.filter((x) => x !== id)))} />
                <code>{id.slice(0, 8)}…</code>
              </label>
            ))}
        </div>
      </Field>
    </div>
  );
}

function YamlDialog({ onClose }: { onClose: () => void }) {
  const [target, setTarget] = useState<"live" | "preview">("live");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`api/camera-dashboard/yaml?target=${target}`, { cache: "no-store" }).then(async (r) => {
      if (r.ok) {
        setText(await r.text());
        setError("");
      } else setError((await r.json().catch(() => ({}))).error ?? `The app answered ${r.status}.`);
    });
  }, [target]);
  return (
    <Dialog
      title="Dashboard YAML"
      wide
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={() => navigator.clipboard?.writeText(text)} disabled={!text}>
            Copy
          </button>
          <button className={ui.primary} onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <p className={css.muted}>
        The saved draft, as it would be deployed. To set it by hand: the dashboard's ⋮ → Edit dashboard → ⋮ → Raw configuration
        editor, and replace everything.
      </p>
      <Segmented
        value={target}
        options={[
          ["live", "Live"],
          ["preview", "Preview"],
        ]}
        onChange={setTarget}
      />
      {error ? <div className={guest.warning}>{error}</div> : <pre className={css.yaml}>{text}</pre>}
    </Dialog>
  );
}

function Backups({ toast, stamp }: { toast: (t: string, tone?: Toast["tone"]) => void; stamp: number }) {
  const [backups, setBackups] = useState<Backup[]>();
  useEffect(() => {
    get<{ backups: Backup[] }>("backups").then((b) => setBackups(b.backups), () => setBackups([]));
  }, [stamp]);
  if (!backups) return null;
  if (!backups.length) return <Empty>None yet: the first deploy keeps one.</Empty>;
  return (
    <ul className={css.backups}>
      {backups.map((b) => (
        <li key={b.name}>
          <span>
            /{b.url_path} <span className={css.muted}>as it was {ago(b.saved)} ({b.saved.replace("T", " ")})</span>
          </span>
          <button
            className={`${ui.button} ${ui.small}`}
            onClick={() =>
              confirm(`Put /${b.url_path} back as it was then? Its current config is kept first.`) &&
              post<{ backups: Backup[] }>("restore", { name: b.name }).then(
                (r) => {
                  setBackups(r.backups);
                  toast(`/${b.url_path} restored`);
                },
                (err) => toast((err as Error).message, "bad"),
              )
            }
          >
            Restore
          </button>
        </li>
      ))}
    </ul>
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function renameKey<T>(obj: Record<string, T>, from: string, to: string): Record<string, T> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k === from ? to : k, v]));
}

function moveKey<T>(obj: Record<string, T>, key: string, by: number): Record<string, T> {
  const entries = Object.entries(obj);
  const i = entries.findIndex(([k]) => k === key);
  entries.splice(i + by, 0, ...entries.splice(i, 1));
  return Object.fromEntries(entries);
}
