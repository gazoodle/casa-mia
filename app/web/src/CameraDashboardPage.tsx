/** Camera Dashboard: one source for the Camera Commander and its HA dashboard. Edits are
 * a draft (Save draft); the draft compositor draws it for the preview, and Deploy sends
 * the dashboard to HA, to the preview dashboard or the live one. Live also makes the
 * draft what the wall tablets' compositor draws. */

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
  blurb: "The cameras, the commander that shows them, and its dashboard.",
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
type Highlight = { colour: string; width: number; blur: number; pulse: number; style: "breathe" | "ripple" };
const HIGHLIGHT: Highlight = { colour: "#7bd1a0", width: 2, blur: 13, pulse: 1.8, style: "breathe" };
const MOTION = { hold: 10, back: 30, pause: 120 };
// The integration's switches (Camera Commander device), flipped from here through the app.
const SECURITY_LOOK = "switch.camera_commander_security_look";
const SHOW_LOOK = "casa-mia:show-look"; // localStorage: the look on this page's previews

/** The Security look: a tint, how strong and how dark, and the CSS filter made of them. */
type Look = { tint: string; strength: number; darkness: number; css: string };

/** A shape, width over height: a number (1.78) or a ratio as written ("16:9"). */
type Shape = number | string;
type Panel = {
  cameras: string[];
  size: number;
  fit: "cover" | "contain";
  /** Top and bottom: run to the view's edge at that end (the side panel stops at them). */
  anchor_left?: boolean;
  anchor_right?: boolean;
  /** Rows (top, bottom) or columns (left, right) its cameras are shared between. */
  lines?: number;
  /** Off the view: no room, no tiles; its cameras kept for when it is shown again. */
  hidden?: boolean;
};
const PANELS = ["left", "top", "right", "bottom"] as const;
type Commander = {
  /** Its page's title on the dashboard; as a slug, the page's address. */
  name: string;
  /** Never changes: its device in the integration. "": the first there was. */
  id?: string;
  /** A page of its own on the dashboard; off: only drawn, for elsewhere (a card to come). */
  page?: boolean;
  width: number;
  height: number;
  gap: number;
  main: string;
  /** own and fixed: the main camera is main_width % wide; the panels take the rest. */
  main_fit: "fit" | "fill" | "crop" | "own" | "fixed";
  main_width?: number;
  main_ratio?: Shape;
  /** own, fixed: the % of the picture a panel with cameras keeps beside the main camera. */
  panel_min?: number;
  /** Seconds: a camera picture older than this is marked Stale. */
  stale?: number;
  /** The outline on the main camera's tile, drawn by the browser on the dashboard. */
  highlight?: Highlight;
  /** Track motion (done by the integration), seconds. back 0: stays on the motion camera. */
  motion?: { hold: number; back: number; pause: number };
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
  /** In order: the dashboard's first pages. Always at least one. */
  commanders: Commander[];
  look: Look;
};
type View = {
  store: Store;
  problems: string[];
  error: string | null;
  changed: boolean;
  deployed: string | null;
  preview_dashboard: string;
  /** When the preview dashboard was last deployed; null when there is none. */
  previewed: string | null;
  /** What a blank new commander starts as. */
  empty_commander: Commander;
  compositor: { live: boolean; draft: boolean; host: string | null };
};
type HACamera = { entity: string; name: string; device_id: string | null; medium?: string; high?: string; zoom?: string };
type HAUser = { id: string; name: string; is_active: boolean };
type HA = {
  cameras?: HACamera[];
  users?: HAUser[];
  entities?: { entity: string; name: string; state?: string }[];
  /** Each commander's (by id) Main camera select in the integration, which its taps set. */
  commander_selects?: Record<string, string>;
  /** Each commander's Track motion switch. */
  commander_switches?: Record<string, string>;
  /** Each camera's motion sensor (for the commander's Track motion), where it has one. */
  motion?: Record<string, string>;
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
/** The Security look's filter while it's shown on this page's previews, else "". */
const LookPreview = createContext("");
/** Home Assistant's entities, for the entity fields. */
const Entities = createContext<{ entity: string; name: string; state?: string }[]>([]);

const DEFAULT_PTZ: Ptz = { action: "unifiprotect.ptz_goto_preset", data: {}, presets: [] };

export function CameraDashboardPage({ state }: { state?: string }) {
  const [view, setView] = useState<View>();
  const [draft, setDraft] = useState<Store>();
  const [ha, setHa] = useState<HA>();
  const [stamp, setStamp] = useState(Date.now()); // bumps the warnings and backups after a save
  const [thumbRound, setThumbRound] = useState(0);
  // The Security look on this page's previews: remembered in this browser.
  const [showLook, setShowLookNow] = useState(() => {
    try {
      return localStorage.getItem(SHOW_LOOK) === "1";
    } catch {
      return false;
    }
  });
  const setShowLook = (on: boolean) => {
    setShowLookNow(on);
    try {
      localStorage.setItem(SHOW_LOOK, on ? "1" : "0");
    } catch {
      // private window: just this visit
    }
  };
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
    <LookPreview.Provider
      value={showLook ? draft.look?.css || lookCss(draft.look.tint, draft.look.strength, draft.look.darkness) : ""}
    >
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
                  `Remove the preview dashboard /${view.preview_dashboard} from Home Assistant? Its config is kept (Backups); the live dashboard and the draft are untouched.`,
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
          title="Security look"
          blurb="Every camera picture on the dashboards in monochrome, tinted, like a security control room: done by the browser, switched on and off with the Camera Commander's Security look switch in Home Assistant (by hand, or an automation at night). The look deployed live is the one used."
        />
        <LookEditor
          value={draft.look}
          shown={showLook}
          onShow={setShowLook}
          live={haSwitch(SECURITY_LOOK)}
          onLive={(on) => flip(SECURITY_LOOK, on, "Security look")}
          onChange={(l) => edit((s) => (s.look = l))}
        />
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
    </LookPreview.Provider>
  );
}

/** Whether a commander's taps can work: they set its Main camera select in the integration,
 * so say plainly when Home Assistant doesn't have it (yet), or has it with no cameras. */
function CommanderSelectCheck({ ha, id }: { ha?: HA; id: string }) {
  const entity = ha?.commander_selects?.[id];
  if (!ha?.entities || !entity) return null;
  const select = ha.entities.find((e) => e.entity === entity);
  if (select && select.state !== "unavailable") return null;
  return (
    <div className={css.alarm} role="alert">
      <strong>Taps on the commander do nothing yet.</strong>{" "}
      {select ? (
        <>
          <code>{entity}</code> is unavailable in Home Assistant: either the integration can't reach this
          app, or the commander has no saved cameras yet (save a draft with cameras in its panels; Home Assistant picks
          them up within 30 seconds).
        </>
      ) : (
        <>
          Home Assistant has no <code>{entity}</code>, which every tap sets. It comes with the Casa Mia integration (a
          new commander's once the draft is saved): after the app updates the integration, Home Assistant needs a
          restart to load it (Settings → Repairs, or Settings → System → Restart).
        </>
      )}
    </div>
  );
}

/** The CSS filter of a look: monochrome, then tinted (sepia's own hue is about 35°, turned
 * to the tint's), saturated by `strength`, darkened by `darkness` %. */
function lookCss(tint: string, strength: number, darkness: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(tint.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const span = max - Math.min(r, g, b);
  let hue = 0;
  if (span) hue = max === r ? ((g - b) / span) % 6 : max === g ? (b - r) / span + 2 : (r - g) / span + 4;
  const turn = Math.round(hue * 60 - 35);
  const bright = Math.max(0.1, 1 - darkness / 100).toFixed(2);
  return `grayscale(1) sepia(1) hue-rotate(${turn}deg) saturate(${strength}) brightness(${bright}) contrast(1.1)`;
}

function LookEditor({
  value,
  shown,
  onShow,
  live,
  onLive,
  onChange,
}: {
  value: Look;
  shown: boolean;
  onShow: (on: boolean) => void;
  /** The Security look switch's state in Home Assistant (undefined: HA hasn't it). */
  live?: string;
  onLive: (on: boolean) => void;
  onChange: (l: Look) => void;
}) {
  const look = value; // the app fills in the defaults
  const set = (change: Partial<Look>) => {
    const next = { ...look, ...change };
    onChange({ ...next, css: lookCss(next.tint, next.strength, next.darkness) });
  };
  return (
    <div className={css.settings}>
      <div className={css.numbers}>
        <Field label="Tint">
          <input type="color" className={css.colour} value={look.tint} onChange={(e) => set({ tint: e.target.value })} />
        </Field>
        <Num label="Strength" step={0.5} value={look.strength} onChange={(n) => set({ strength: n })} />
        <Num label="Darker, %" value={look.darkness} onChange={(n) => set({ darkness: n })} />
        <Field
          label="On the dashboards"
          help={
            live === undefined
              ? "Home Assistant has no Security look switch yet (the Casa Mia integration adds it)."
              : "The Camera Commander's Security look switch: every dashboard, every screen. Automations can flip it too."
          }
        >
          <Switch on={live === "on"} label="On the dashboards" busy={live === undefined} onChange={onLive} />
        </Field>
        <Field label="On the previews here" help="Only this page, in this browser.">
          <Switch on={shown} label="On the previews here" onChange={onShow} />
        </Field>
      </div>
      <p className={css.hint}>
        The filter: <code>{look.css || lookCss(look.tint, look.strength, look.darkness)}</code>. The dashboards use
        the saved draft's look.
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

/** The commanders as an accordion: one open at a time (only its preview is drawn). Each
 * can be moved up and down (the dashboard's pages follow), deleted while another is left,
 * and a new one starts as a copy of the one open. */
function Commanders({
  store,
  blank,
  ha,
  trackMotion,
  onTrackMotion,
  onChange,
}: {
  store: Store;
  blank: Commander;
  ha?: HA;
  /** A commander's (by id) Track motion switch's state in Home Assistant. */
  trackMotion: (id: string) => string | undefined;
  onTrackMotion: (id: string, on: boolean) => void;
  onChange: (c: Commander[]) => void;
}) {
  const [open, setOpen] = useState(0);
  const list = store.commanders;
  const change = (next: Commander[], opened = open) => {
    onChange(next);
    setOpen(opened);
  };
  const move = (i: number, to: number) => {
    const next = [...list];
    next.splice(to, 0, ...next.splice(i, 1));
    change(next, open === i ? to : open === to ? i : open);
  };
  /** A new commander: a copy of the one open, or blank (no cameras, every setting at its default). */
  const add = (from: Commander) => {
    const names = new Set(list.map((c) => c.name));
    let n = list.length + 1;
    while (names.has(`Commander ${n}`)) n++;
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 8); // its device: never reused
    change([...list, { ...structuredClone(from), name: `Commander ${n}`, id }], list.length);
  };
  const remove = (i: number) =>
    confirm(`Delete the ${list[i].name} commander?`) &&
    change(
      list.filter((_, j) => j !== i),
      Math.min(open > i ? open - 1 : open, list.length - 2),
    );
  return (
    <div className={css.folds}>
      {list.map((c, i) => (
        <div key={i} className={css.fold}>
          <header className={css.foldHead}>
            <button className={css.foldToggle} aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
              <span className={css.chevron}>{open === i ? "▾" : "▸"}</span>
              <strong>{c.name.trim() || "(no name)"}</strong>
              <span className={css.muted}>
                {plural(new Set(PANELS.flatMap((p) => (c[p].hidden ? [] : c[p].cameras))).size, "camera")}
                {c.page === false && " · no dashboard page"}
              </span>
            </button>
            <span className={css.actions}>
              <button
                className={`${ui.button} ${ui.small}`}
                disabled={i === 0}
                title="Earlier on the dashboard"
                aria-label={`Move ${c.name} up`}
                onClick={() => move(i, i - 1)}
              >
                ↑
              </button>
              <button
                className={`${ui.button} ${ui.small}`}
                disabled={i === list.length - 1}
                title="Later on the dashboard"
                aria-label={`Move ${c.name} down`}
                onClick={() => move(i, i + 1)}
              >
                ↓
              </button>
              <button
                className={`${ui.danger} ${ui.small}`}
                disabled={list.length === 1}
                title={list.length === 1 ? "There must always be one commander." : undefined}
                onClick={() => remove(i)}
              >
                Delete
              </button>
            </span>
          </header>
          {open === i && <CommanderSelectCheck ha={ha} id={c.id ?? ""} />}
          {open === i && (
            <CommanderEditor
              value={c}
              cameras={store.cameras}
              preview={<LivePreview store={store} index={i} />}
              trackMotion={trackMotion(c.id ?? "")}
              onTrackMotion={(on) => onTrackMotion(c.id ?? "", on)}
              onChange={(v) => change(list.map((x, j) => (j === i ? v : x)))}
            />
          )}
        </div>
      ))}
      <div className={css.actions}>
        <button
          className={ui.button}
          onClick={() => add(list[open] ?? list[0])}
          title={`A copy of ${(list[open] ?? list[0]).name}, to change`}
        >
          + Copy of {(list[open] ?? list[0]).name}
        </button>
        <button className={ui.button} onClick={() => add(blank)} title="No cameras, every setting at its default">
          + Blank commander
        </button>
      </div>
    </div>
  );
}

/** A commander's layout: its name, size, the main camera at start, and its four panels. */
function CommanderEditor({
  value,
  cameras,
  preview,
  trackMotion,
  onTrackMotion,
  onChange,
}: {
  value: Commander;
  cameras: Record<string, Camera>;
  preview: ReactNode;
  /** The Track motion switch's state in Home Assistant (undefined: HA hasn't it). */
  trackMotion?: string;
  onTrackMotion: (on: boolean) => void;
  onChange: (c: Commander) => void;
}) {
  const set = (change: (c: Commander) => void) => {
    const next = structuredClone(value);
    change(next);
    onChange(next);
  };
  const inPanels = [...new Set(PANELS.flatMap((p) => value[p].cameras))];
  const sized = value.main_fit === "own" || value.main_fit === "fixed"; // the panels take the rest
  const lit = { ...HIGHLIGHT, ...value.highlight };
  const moves = { ...MOTION, ...value.motion };
  return (
    <div className={css.commander}>
      <div className={css.commanderTop}>
        <div className={css.commanderPreview}>{preview}</div>
        <section className={`${css.options} ${css.numbers}`}>
          <h4 className={css.sub}>Picture</h4>
          <div className={css.wide}>
            <Field label="Name" help="Its page's title on the dashboard; the page's address is made from it.">
              <input value={value.name} onChange={(e) => set((c) => (c.name = e.target.value))} />
            </Field>
          </div>
          <div className={css.wide}>
            <Field
              label="Dashboard page"
              help="Off: no page of its own on the dashboard. It is still drawn and keeps its device in Home Assistant, for showing elsewhere (a card to come); its cameras keep their live pages."
            >
              <Switch
                on={value.page !== false}
                label="Dashboard page"
                onChange={(on) => set((c) => (c.page = on))}
              />
            </Field>
          </div>
          <Num label="Width" value={value.width} onChange={(n) => set((c) => (c.width = n))} />
          <Num label="Height" value={value.height} onChange={(n) => set((c) => (c.height = n))} />
          <Num label="Gap, px" value={value.gap} onChange={(n) => set((c) => (c.gap = n))} />
          <Num
            label="Stale after, s"
            value={value.stale ?? 30}
            help="A camera picture older than this is marked Stale (the camera is slow or not answering)."
            onChange={(n) => set((c) => (c.stale = n))}
          />
          <p className={`${css.hint} ${css.wide}`}>
            Gaps are transparent: the dashboard's background shows through them.
          </p>
        </section>
        <section className={`${css.options} ${css.numbers}`}>
          <h4 className={css.sub}>Main camera</h4>
          <div className={css.wide}>
            <Field
              label="Fit"
              help="Fit: whole, with black borders. Fill: stretched to the space. Crop: fills it, edges cut off. Own shape: Main width wide at the camera's own shape, the panels around it (they move when a camera of another shape is shown). Fixed shape: Main width wide at the shape set, the camera whole within it."
            >
              <Segmented
                value={value.main_fit ?? "fit"}
                options={[
                  ["fit", "Fit"],
                  ["fill", "Fill"],
                  ["crop", "Crop"],
                  ["own", "Own shape"],
                  ["fixed", "Fixed shape"],
                ]}
                onChange={(f) => set((c) => (c.main_fit = f))}
              />
            </Field>
          </div>
          {sized && (
            <Num
              label="Main width, % of the picture"
              value={value.main_width ?? 70}
              onChange={(n) => set((c) => (c.main_width = n))}
            />
          )}
          {sized && (
            <Num
              label="Smallest panel, %"
              value={value.panel_min ?? 8}
              help="A panel with cameras keeps at least this much of the picture; the main camera shrinks (same shape) rather than squeeze it out."
              onChange={(n) => set((c) => (c.panel_min = n))}
            />
          )}
          {value.main_fit === "fixed" && (
            <RatioInput label="Main shape" value={value.main_ratio ?? "16:9"} onChange={(r) => set((c) => (c.main_ratio = r))} />
          )}
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
        </section>
        <section className={`${css.options} ${css.numbers}`}>
          <h4 className={css.sub}>Highlight on the main camera's tile</h4>
          <Field label="Colour">
            <input
              type="color"
              className={css.colour}
              value={lit.colour}
              onChange={(e) => set((c) => (c.highlight = { ...lit, colour: e.target.value }))}
            />
          </Field>
          <Num label="Width, px" value={lit.width} onChange={(n) => set((c) => (c.highlight = { ...lit, width: n }))} />
          <Num label="Blur, px" value={lit.blur} onChange={(n) => set((c) => (c.highlight = { ...lit, blur: n }))} />
          <Num
            label="Pulse, s"
            step={0.1}
            value={lit.pulse}
            help="0: steady."
            onChange={(n) => set((c) => (c.highlight = { ...lit, pulse: n }))}
          />
          <Field label="Pulse style" help="Breathe: the glow swells and fades. Ripple: a ring spreads out and fades.">
            <Segmented
              value={lit.style}
              options={[
                ["breathe", "Breathe"],
                ["ripple", "Ripple"],
              ]}
              onChange={(st) => set((c) => (c.highlight = { ...lit, style: st }))}
            />
          </Field>
          <Field label="As it looks">
            <span
              className={`${css.swatch} ${lit.pulse > 0 ? (lit.style === "ripple" ? css.ripple : css.breathe) : ""}`}
              style={
                {
                  border: `${lit.width}px solid ${lit.colour}`,
                  boxShadow: `0 0 ${lit.blur}px ${lit.colour}`,
                  "--cm-colour": lit.colour,
                  "--cm-blur": `${lit.blur}px`,
                  "--cm-pulse": `${lit.pulse}s`,
                } as React.CSSProperties
              }
            />
          </Field>
        </section>
        <section className={`${css.options} ${css.numbers}`}>
          <h4 className={css.sub}>Track motion</h4>
          <div className={css.wide}>
            <Field
              label="Track motion"
              help={
                trackMotion === undefined
                  ? "Home Assistant has no Track motion switch yet (the Casa Mia integration adds it)."
                  : "This commander's Track motion switch in Home Assistant (on its Camera Commander device): automations can flip it too."
              }
            >
              <Switch on={trackMotion === "on"} label="Track motion" busy={trackMotion === undefined} onChange={onTrackMotion} />
            </Field>
          </div>
          <p className={`${css.hint} ${css.wide}`}>
            While it is on, a camera that sees motion becomes the main one (its tile gets a red dot whenever it sees motion,
            on or off).
          </p>
          <Num
            label="Hold, s"
            value={moves.hold}
            help="A switch stays this long before motion elsewhere can take over."
            onChange={(n) => set((c) => (c.motion = { ...moves, hold: n }))}
          />
          <Num
            label="Go back after, s"
            value={moves.back}
            help="Once all motion stops, back to the camera chosen by hand. 0: stay."
            onChange={(n) => set((c) => (c.motion = { ...moves, back: n }))}
          />
          <Num
            label="Pause after a choice, s"
            value={moves.pause}
            help="Choosing a camera yourself (a tap) pauses tracking this long."
            onChange={(n) => set((c) => (c.motion = { ...moves, pause: n }))}
          />
        </section>
      </div>
      <div className={css.panels}>
        {PANELS.map((p) => (
          <div key={p} className={`${css.overview} ${value[p].hidden ? css.hiddenPanel : ""}`}>
            <header className={css.panelHead}>
              <h3>{PANEL_NAMES[p][0]}</h3>
              <Switch
                on={!value[p].hidden}
                label={value[p].hidden ? "Hidden" : "Shown"}
                onChange={(on) => set((c) => (c[p].hidden = !on))}
              />
              <span className={css.muted}>{value[p].hidden ? "Hidden: not on the view" : "Shown"}</span>
            </header>
            <Chips
              items={value[p].cameras}
              label={(e) => cameras[e]?.title ?? e}
              thumb={(e) => <Thumb entity={e} />}
              choices={Object.keys(cameras).filter((e) => !inPanels.includes(e))}
              onChange={(items) => set((c) => (c[p].cameras = items))}
            />
            <div className={css.panelOptions}>
              <Num
                label={PANEL_NAMES[p][1]}
                value={value[p].size}
                disabled={sized}
                help={sized ? "Set by the main camera's size." : undefined}
                onChange={(n) => set((c) => (c[p].size = n))}
              />
              <Num
                label={p === "left" || p === "right" ? "Columns" : "Rows"}
                value={value[p].lines ?? 1}
                help="Its cameras shared between them, the first taking one more when they don't share evenly."
                onChange={(n) => set((c) => (c[p].lines = Math.max(1, Math.round(n))))}
              />
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

/** The commander drawn from the unsaved draft, redrawn a moment after an edit that changes
 * it (and only then: the key is what the picture depends on). The last picture stays,
 * dimmed, while the next is drawn. */
function LivePreview({ store, index }: { store: Store; index: number }) {
  const key = previewKey(store, index);
  const [src, setSrc] = useState<string>();
  const [note, setNote] = useState<string>();
  const [busy, setBusy] = useState(true);
  const latest = useRef(store);
  latest.current = store;
  const shown = useRef<string | undefined>(undefined);
  const drawn = useRef(false); // the first picture at once; after edits, a short pause
  const look = useContext(LookPreview);
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
          body: JSON.stringify({ store: latest.current, index }),
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
  }, [key]);
  if (note) return <div className={css.noPreview}>{note}</div>;
  if (!src) return <div className={css.noPreview}>Drawing…</div>;
  return (
    <img
      className={`${css.preview} ${busy ? css.stale : ""}`}
      src={src}
      alt="The commander"
      style={{ filter: look || undefined }}
    />
  );
}

/** Everything a commander's picture depends on, so its preview is redrawn only when that
 * changes (not its name). */
function previewKey(store: Store, index: number): string {
  const cmd = store.commanders[index];
  const cams = PANELS.flatMap((p) => cmd[p].cameras);
  return JSON.stringify([{ ...cmd, name: "" }, index, cams.map((e) => store.cameras[e]?.title)]);
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
  low: ["Low", "the low channel, the one the commander is made from"],
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

function Num({
  label,
  value,
  step = 1,
  disabled,
  help,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  disabled?: boolean;
  help?: ReactNode;
  onChange: (n: number) => void;
}) {
  return (
    <Field label={label} help={help}>
      <input type="number" step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}

/** The usual shapes, width:height. */
const RATIOS = ["1:1", "5:4", "4:3", "3:2", "16:10", "16:9", "1.85:1", "2:1", "21:9", "2.39:1", "3:4", "9:16"];

/** A shape: typed as a number (1.78) or a ratio (16:9), or picked from the usual ones,
 * which puts the ratio itself in the box (kept as written; the app works out the number). */
function RatioInput({ label, value, onChange }: { label: string; value: Shape; onChange: (r: Shape) => void }) {
  return (
    <Field label={label}>
      <span className={css.ratio}>
        <input value={String(value)} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
        <select value="" aria-label={`${label}: the usual shapes`} onChange={(e) => e.target.value && onChange(e.target.value)}>
          <option value="">▾</option>
          {RATIOS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </span>
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
        {text("portrait_query", "Portrait screens", "A media query: the screens held upright (for commanders made for them).")}
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
