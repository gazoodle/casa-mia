import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Developer } from "../health";
import { Field, Segmented, Switch } from "../ui";
import css from "../cameras.module.css";
import ui from "../ui.module.css";
import LAYOUT from "../../../src/casa_mia/layout.json";
import { Camera, Thumb, plural } from "../cameras";
import { Commander, DEBUG, Edits, HA, HIGHLIGHT, L, MOTION, P, PANELS, Panel, help } from "./common";
import { AddMenu, Num, RatioInput } from "./inputs";

/** Whether a commander's taps can work: they set its Main camera select in the integration,
 * so say plainly when Home Assistant doesn't have it (yet), or has it with no cameras. */
export function CommanderSelectCheck({ ha, id }: { ha?: HA; id: string }) {
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

export const PANEL_NAMES: Record<(typeof PANELS)[number], [title: string, size: string]> = {
  left: ["Left", "Width"],
  top: ["Top", "Height"],
  right: ["Right", "Width"],
  bottom: ["Bottom", "Height"],
};

/** The commanders as an accordion: one open at a time (only its preview is drawn). Each
 * can be moved up and down (the dashboard's pages follow), deleted while another is left,
 * and a new one starts as a copy of the one open. */
export function Commanders({
  store,
  blank,
  ha,
  trackMotion,
  onTrackMotion,
  onChange,
}: {
  store: Edits;
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
    // its device: never reused. getRandomValues, not randomUUID: HA is often plain http on
    // the LAN, where randomUUID doesn't exist (secure contexts only).
    const id = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("");
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
export function CommanderEditor({
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
  const dbg = { ...DEBUG, ...value.debug };
  const developer = useContext(Developer); // Debug options only in developer mode
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
          <Num label={L.gap.label} value={value.gap} help={help(L.gap)} onChange={(n) => set((c) => (c.gap = n))} />
          <Num
            label={L.margin.label}
            value={value.margin ?? L.margin.default}
            help={help(L.margin)}
            onChange={(n) => set((c) => (c.margin = Math.max(0, n)))}
          />
          <Num
            label="Stale after, s"
            value={value.stale ?? 30}
            help="A camera picture older than this is marked Stale (the camera is slow or not answering)."
            onChange={(n) => set((c) => (c.stale = n))}
          />
          <p className={`${css.hint} ${css.wide}`}>
            Gaps, and the borders beside a main camera kept whole, are transparent: the dashboard's background shows through them. The Camera Commander card draws it
            exactly the size it is shown (its shape too); the preview here and the generated dashboard draw it at a fixed size.
          </p>
        </section>
        <section className={`${css.options} ${css.numbers}`}>
          <h4 className={css.sub}>Main camera</h4>
          <div className={css.wide}>
            <Field label={L.main_fit.label} help={help(L.main_fit)}>
              <Segmented
                value={value.main_fit ?? (L.main_fit.default as Commander["main_fit"])}
                options={L.main_fit.options as [Commander["main_fit"], string][]}
                onChange={(f) => set((c) => (c.main_fit = f))}
              />
            </Field>
          </div>
          {sized && (
            <Num
              label={L.main_width.label}
              value={value.main_width ?? L.main_width.default}
              help={help(L.main_width)}
              onChange={(n) => set((c) => (c.main_width = n))}
            />
          )}
          {sized && (
            <Num
              label={L.panel_min.label}
              value={value.panel_min ?? L.panel_min.default}
              help={help(L.panel_min)}
              onChange={(n) => set((c) => (c.panel_min = n))}
            />
          )}
          {value.main_fit === "fixed" && (
            <RatioInput label={L.main_ratio.label} value={value.main_ratio ?? L.main_ratio.default} onChange={(r) => set((c) => (c.main_ratio = r))} />
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
        {developer && (
          <section className={`${css.options} ${css.numbers}`}>
            <h4 className={css.sub}>Debug options</h4>
            <div className={css.wide}>
              <Field
                label="Debug"
                help="Dims the whole picture and draws an L in each corner and both diagonals, so its true edges show, with its ID (name, size, scale) and when it was drawn. Camera Commander cards add their own figures. Saved in the draft, it shows on the preview and Show the draft cards first."
              >
                <Switch on={dbg.on} label="Debug" onChange={(on) => set((c) => (c.debug = { ...dbg, on }))} />
              </Field>
            </div>
            {dbg.on && (
              <>
                <Num label="Dim to, %" value={dbg.dim} onChange={(n) => set((c) => (c.debug = { ...dbg, dim: Math.min(100, Math.max(0, n)) }))} />
                <Num label="Corner L, px" value={dbg.corner} onChange={(n) => set((c) => (c.debug = { ...dbg, corner: n }))} />
                <Num label="Line width, px" value={dbg.width} onChange={(n) => set((c) => (c.debug = { ...dbg, width: n }))} />
                <Field label="Line colour">
                  <input
                    type="color"
                    className={css.colour}
                    value={dbg.colour}
                    onChange={(e) => set((c) => (c.debug = { ...dbg, colour: e.target.value }))}
                  />
                </Field>
              </>
            )}
          </section>
        )}
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
            While it is on, a camera that sees motion becomes the main one. On or off, the Camera Commander card marks a
            tile with a pulsing dot while its camera sees motion (the card's own options set its look).
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
          {inPanels.length > 0 && (
            <div className={css.wide}>
              <Field
                label="Track motion switches to"
                help="Untick a camera whose motion should not take over (a busy road, a tree in the wind): the card still marks its motion with the dot, and a tap still makes it the main camera."
              >
                <div className={css.trackCameras}>
                  {inPanels.map((e) => {
                    const ignored = (value.motion_ignore ?? []).includes(e);
                    return (
                      <label key={e}>
                        <input
                          type="checkbox"
                          checked={!ignored}
                          onChange={(ev) =>
                            set((c) => {
                              const rest = (c.motion_ignore ?? []).filter((x) => x !== e);
                              c.motion_ignore = ev.target.checked ? rest : [...rest, e];
                            })
                          }
                        />
                        {cameras[e]?.title ?? e}
                      </label>
                    );
                  })}
                </div>
              </Field>
            </div>
          )}
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
                label={`${PANEL_NAMES[p][1]}, ${value[p].unit === "px" ? "px" : "% of the picture"}`}
                value={value[p].size}
                disabled={sized}
                help={sized ? "Set by the main camera's size." : undefined}
                onChange={(n) => set((c) => (c[p].size = n))}
              />
              {!sized && (
                <Field label={P.unit.label} help={help(P.unit)}>
                  <Segmented
                    value={value[p].unit ?? "%"}
                    options={P.unit.options as ["%" | "px", string][]}
                    onChange={(u) =>
                      set((c) => {
                        // The same size in the other unit, at the commander's own size.
                        const of = p === "left" || p === "right" ? c.width : c.height;
                        const was = c[p].unit ?? "%";
                        if (u !== was) c[p].size = Math.round(u === "px" ? (of * c[p].size) / 100 : Math.min(45, (c[p].size * 100) / of));
                        c[p].unit = u;
                      })
                    }
                  />
                </Field>
              )}
              <Num
                label={p === "left" || p === "right" ? "Columns" : "Rows"}
                value={value[p].lines ?? 1}
                help={help(P.lines)}
                onChange={(n) => set((c) => (c[p].lines = Math.max(1, Math.round(n))))}
              />
              <div className={css.fitOption}>
              <Field label={P.fit.label} help={help(P.fit)}>
                <Segmented
                  value={value[p].fit}
                  options={P.fit.options as [Panel["fit"], string][]}
                  onChange={(f) => set((c) => (c[p].fit = f))}
                />
              </Field>
              </div>
              {(p === "top" || p === "bottom") &&
                (["anchor_left", "anchor_right"] as const).map((end) => (
                  <Field key={end} label={P[end].label} help={help(P[end])}>
                    <Switch
                      on={value[p][end] ?? Boolean(LAYOUT.panels[p][end])}
                      label={P[end].label}
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
export function LivePreview({ store, index }: { store: Edits; index: number }) {
  const key = previewKey(store, index);
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
        const r = await fetch("api/commander/render", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store: { commanders: latest.current.commanders }, index }),
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
    />
  );
}

/** Everything a commander's picture depends on, so its preview is redrawn only when that
 * changes (not its name). */
export function previewKey(store: Edits, index: number): string {
  const cmd = store.commanders[index];
  const cams = PANELS.flatMap((p) => cmd[p].cameras);
  return JSON.stringify([{ ...cmd, name: "" }, index, cams.map((e) => store.cameras[e]?.title)]);
}

/** An ordered list as chips: move, remove, and add from the choices. */
export function Chips({
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
