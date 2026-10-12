/** Our select and slider, in place of the browser's (docs/design/chrome.html: select,
 * slider). Select takes the same option and optgroup children as the browser's select, so
 * a swap is one line; its menu is ours (ui.module.css menu), keyboard and all. */

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import css from "./ui.module.css";

type Item = { value: string; label: string; disabled?: boolean; group?: string };

/** The options in a select's children (<option>, <optgroup>, fragments, lists). */
function itemsOf(children: ReactNode, group?: string): Item[] {
  const out: Item[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: string | number; label?: string; disabled?: boolean; children?: ReactNode };
    if (child.type === "option") {
      const label = textOf(props.children);
      out.push({ value: String(props.value ?? label), label, disabled: props.disabled, group });
    } else if (child.type === "optgroup") {
      out.push(...itemsOf(props.children, props.label));
    } else if (props.children) {
      out.push(...itemsOf(props.children, group)); // a fragment
    }
  });
  return out;
}

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((n) => (typeof n === "string" || typeof n === "number" ? String(n) : ""))
    .join("");
}

export function Select({
  value,
  onChange,
  children,
  disabled,
  placeholder = "Choose…",
  className,
  title,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  /** Shown when the value is none of the options. */
  placeholder?: string;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) {
  const items = itemsOf(children);
  const chosen = items.find((i) => i.value === value);
  const [open, setOpen] = useState<{ top: number; left: number; width: number } | null>(null);
  const [active, setActive] = useState(-1);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const show = () => {
    const r = button.current!.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const top = below < 240 && r.top > below ? Math.max(8, r.top - Math.min(300, items.length * 34 + 12) - 4) : r.bottom + 4;
    setOpen({ top, left: r.left, width: r.width });
    setActive(Math.max(0, items.findIndex((i) => i.value === value)));
  };
  const close = () => setOpen(null);
  const pick = (i: number) => {
    const it = items[i];
    if (!it || it.disabled) return;
    close();
    if (it.value !== value) onChange(it.value);
    button.current?.focus();
  };

  // Close on a click elsewhere, a scroll of anything else, or the window resizing.
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !button.current?.contains(t)) close();
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("scroll", away, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("scroll", away, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    if (open && active >= 0) menu.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const step = (from: number, by: number) => {
    for (let i = from + by; i >= 0 && i < items.length; i += by) if (!items[i].disabled) return i;
    return from;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        e.stopPropagation(); // not the dialog's Enter
        show();
      }
      return;
    }
    if (k === "Escape") close();
    else if (k === "ArrowDown") setActive((a) => step(a, 1));
    else if (k === "ArrowUp") setActive((a) => step(a, -1));
    else if (k === "Home") setActive(step(-1, 1));
    else if (k === "End") setActive(step(items.length, -1));
    else if (k === "Enter" || k === " ") pick(active);
    else if (k === "Tab") return close();
    else if (k.length === 1) {
      // Typing jumps to the first option starting with what was typed (within a second).
      const now = Date.now();
      const text = (now - typed.current.at < 1000 ? typed.current.text : "") + k.toLowerCase();
      typed.current = { text, at: now };
      const at = items.findIndex((i) => !i.disabled && i.label.toLowerCase().startsWith(text));
      if (at >= 0) setActive(at);
    } else return;
    e.preventDefault();
    e.stopPropagation(); // Esc and Enter are the select's while it's open, not the dialog's
  };

  let group: string | undefined;
  return (
    <>
      <button
        ref={button}
        type="button"
        className={`${css.select} ${className ?? ""}`}
        aria-haspopup="listbox"
        aria-expanded={!!open}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
      >
        <span className={chosen ? undefined : css.placeholder}>{chosen?.label ?? placeholder}</span>
      </button>
      {open && (
        <div
          ref={menu}
          className={css.selectMenu}
          role="listbox"
          style={{ top: open.top, left: open.left, minWidth: open.width }}
          onKeyDown={onKeyDown}
        >
          {items.map((it, i) => {
            const heading = it.group !== group && it.group ? <div key={`g${i}`} className={css.menuGroup}>{it.group}</div> : null;
            group = it.group;
            return [
              heading,
              <button
                key={i}
                type="button"
                tabIndex={-1}
                data-i={i}
                role="option"
                aria-selected={it.value === value}
                data-active={i === active}
                disabled={it.disabled}
                className={css.menuItem}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(i)}
              >
                {it.label}
              </button>,
            ];
          })}
        </div>
      )}
    </>
  );
}

/** A slider: its words, the slider, its value at a fixed width (nothing moves under the
 * finger). Stepped (`steps`): the slider walks the list, for a wide range where the
 * small values matter (a hold-off: none, 30 s, … a day). `onRelease`: told when the
 * finger lifts or the key comes up, for a change that should be sent once. */
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  steps,
  format = String,
  ends,
  onRelease,
  disabled,
}: {
  label?: ReactNode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  steps?: number[];
  format?: (value: number) => string;
  ends?: [string, string];
  onRelease?: () => void;
  disabled?: boolean;
}) {
  // Stepped: the nearest step to the value (one set by hand may fall between them).
  const at = steps ? steps.reduce((best, s, i) => (Math.abs(s - value) < Math.abs(steps[best] - value) ? i : best), 0) : value;
  const [lo, hi] = steps ? [0, steps.length - 1] : [min, max];
  const pct = hi > lo ? ((at - lo) / (hi - lo)) * 100 : 0;
  // In a Field (no label of its own) a div: the Field is the label, and labels don't nest.
  const Box = label === undefined ? "div" : "label";
  return (
    <Box className={`${css.slider} ${label === undefined ? css.sliderBare : ""}`}>
      {label !== undefined && <span>{label}</span>}
      <input
        type="range"
        min={lo}
        max={hi}
        step={steps ? 1 : step}
        value={at}
        disabled={disabled}
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(steps ? steps[Number(e.target.value)] : Number(e.target.value))}
        onPointerUp={onRelease}
        onKeyUp={onRelease}
        onBlur={onRelease}
      />
      <output>{format(value)}</output>
      {ends && (
        <span className={css.sliderEnds}>
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </span>
      )}
    </Box>
  );
}
