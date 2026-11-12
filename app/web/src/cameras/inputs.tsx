import { useContext, useEffect, useMemo, useRef, useState } from "react";
import css from "../cameras.module.css";
import ui from "../ui.module.css";
import edges from "./edges.module.css";
import { Segmented } from "../ui";
import { Slider } from "../controls";
import { Control, Entities, ThumbRound } from "./common";
import { type ControlsAt, EDGES, controlsAt, controlsStyle } from "./controls";

/** Closes a popup (calls `close`) on a tap or click outside the returned ref. On the
 * finished click, not the press: closing a tall list moves the page, and a press that
 * closed it would leave the release over something else, losing the click (a control's ✕). */
export function useClickAway<T extends HTMLElement>(open: boolean, close: () => void) {
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

export const MAX_MATCHES = 100;

/** An entity field as in Home Assistant: type part of an id or a name ("switch.", "gate
 * light") and pick from the matches; every word typed must match. `domain` limits it to
 * one kind (camera, number...). Anything typed is kept, picked or not. */
export function EntityInput({
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
export function Thumb({ entity, className = css.thumb }: { entity: string; className?: string }) {
  const round = useContext(ThumbRound);
  const [failed, setFailed] = useState<number>();
  if (failed === round) return <span className={className} aria-hidden="true" />;
  return (
    <img
      className={className}
      src={`api/cameras/thumb/${encodeURIComponent(entity)}?r=${round}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(round)}
    />
  );
}

/** The previews' scale: a 1280 x 800 tablet each way round, drawn 384 px wide in
 * landscape and 240 px in portrait (edges.module.css). */
const PREVIEW = 0.3;

/** How a camera's controls are shown on a commander's full screen: an edge for a wide
 * screen and one for a tall one, where along it, the pills' size and background, each
 * screen previewed to scale over the camera's still. */
export function ControlsEdges({
  entity,
  controls,
  value,
  onChange,
}: {
  entity: string;
  controls: Control[];
  value?: Partial<ControlsAt>;
  onChange: (at: ControlsAt) => void;
}) {
  const at = controlsAt(value);
  const set = (change: Partial<ControlsAt>) => onChange({ ...at, ...change });
  const entities = useContext(Entities);
  const names = controls.map((c) => c.name || entities.find((e) => e.entity === c.entity)?.name || c.entity);
  return (
    <>
      <div className={edges.edges}>
        {(["landscape", "portrait"] as const).map((shape) => (
          <div key={shape} className={edges.edgeOf}>
            <Segmented value={at[shape]} options={EDGES.map((e) => [e, e[0].toUpperCase() + e.slice(1)])} onChange={(edge) => set({ [shape]: edge })} />
            <div className={`${edges.screen} ${edges[shape]}`} aria-label={`A ${shape} screen`}>
              <Thumb entity={entity} className={edges.screenPicture} />
              <div className={`${edges.screenControls} ${edges[at[shape]]}`} style={controlsStyle(at, PREVIEW)}>
                {names.map((n, i) => (
                  <span key={i} className={edges.pill} title={n}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={edges.look}>
        <span>Size</span>
        <Segmented value={at.size} options={[["small", "Small"], ["medium", "Medium"], ["large", "Large"]]} onChange={(size) => set({ size })} />
        <span>Along the edge</span>
        <Segmented
          value={at.align}
          options={[["start", "Left or top"], ["center", "Centre"], ["end", "Right or bottom"]]}
          onChange={(align) => set({ align })}
        />
        <span>Background</span>
        <Slider value={at.opacity} min={0} max={100} step={5} format={(v) => (v ? (v === 100 ? "solid" : `${v}%`) : "clear")} onChange={(opacity) => set({ opacity })} />
      </div>
    </>
  );
}

/** Entities shown at the top of a page (gates, lights): tapping one toggles it. */
export function Controls({ value, onChange }: { value: Control[]; onChange: (c: Control[]) => void }) {
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

export function clean(c: Control): Control {
  const out: Control = { entity: c.entity };
  if (c.name) out.name = c.name;
  if (c.icon) out.icon = c.icon;
  return out;
}
