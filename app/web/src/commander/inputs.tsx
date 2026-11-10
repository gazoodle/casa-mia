import { useState, type ReactNode } from "react";
import { Field } from "../ui";
import css from "../cameras.module.css";
import { useClickAway } from "../cameras";
import { Shape } from "./common";
import { Select } from "../controls";

/** "+ Add…" as a menu with a picture against each choice (a native select can't show
 * pictures). Keys as a select: arrows, Enter, Escape; a tap or click outside closes it. */
export function AddMenu({
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

export function Num({
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
export const RATIOS = ["1:1", "5:4", "4:3", "3:2", "16:10", "16:9", "1.85:1", "2:1", "21:9", "2.39:1", "3:4", "9:16"];

/** A shape: typed as a number (1.78) or a ratio (16:9), or picked from the usual ones,
 * which puts the ratio itself in the box (kept as written; the app works out the number). */
export function RatioInput({ label, value, onChange }: { label: string; value: Shape; onChange: (r: Shape) => void }) {
  return (
    <Field label={label}>
      <span className={css.ratio}>
        <input value={String(value)} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
        <Select value="" aria-label={`${label}: the usual shapes`} onChange={(picked) => picked && onChange(picked)}>
          <option value="">▾</option>
          {RATIOS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </span>
    </Field>
  );
}

/** A list as chips: remove, add from the choices, and move (when the order matters). */
export function Chips({
  items,
  ordered = true,
  label,
  thumb,
  choices,
  onChange,
}: {
  items: string[];
  ordered?: boolean;
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
    // Inside a Field (a <label>), a click on a menu choice or a chip's name would also
    // click the label's first button: the first chip's ✕. Cancel that label click.
    <div className={css.chips} onClick={(e) => e.preventDefault()}>
      {items.map((item, i) => (
        <span key={item} className={css.chip}>
          {ordered && (
            <button className={css.chipTool} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${label(item)} earlier`}>
              ‹
            </button>
          )}
          {label(item)}
          {ordered && (
            <button className={css.chipTool} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${label(item)} later`}>
              ›
            </button>
          )}
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
