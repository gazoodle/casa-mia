/** Compact filters as chips: a chip per filter that opens a short menu (with its own
 * search when the list is long) and reads "Area: Kitchen ✕" once set; and level chips
 * with their counts. Made for the watched list; the scan and add dialogs can share them. */

import { useEffect, useRef, useState } from "react";
import { LEVELS, LEVEL_NAMES, type Filters, type Level } from "./common";
import css from "./sensor-watch.module.css";

export type Choice = { id: string; name: string };
/** The kinds a sensor can be watched as. */
export const KINDS: Choice[] = [
  { id: "numeric", name: "Numeric" },
  { id: "binary", name: "On/off" },
  { id: "state", name: "States" },
];
/** The choices each filter offers (only what the sensors in view have). */
export type ChipOptions = Partial<Record<Exclude<keyof Filters, "q">, Choice[]>>;

const NAMES: Record<Exclude<keyof Filters, "q">, string> = {
  domain: "Domain",
  area: "Area",
  floor: "Floor",
  label: "Label",
  platform: "Integration",
  manufacturer: "Maker",
  model: "Model",
  device: "Device",
  device_class: "Device class",
  category: "Category",
  kind: "Kind",
  profile: "Profile",
  group: "Group",
};

export function FilterChips({ value, options, onChange }: { value: Filters; options: ChipOptions; onChange: (f: Filters) => void }) {
  return (
    <>
      {(Object.keys(NAMES) as (keyof typeof NAMES)[]).map((key) => {
        const choices = options[key] ?? [];
        if (!value[key] && choices.length === 0) return null; // nothing to choose
        return (
          <ChipMenu
            key={key}
            title={NAMES[key]}
            choices={choices}
            chosen={value[key] ?? ""}
            onChoose={(id) => onChange({ ...value, [key]: id })}
          />
        );
      })}
    </>
  );
}

function ChipMenu({ title, choices, chosen, onChoose }: { title: string; choices: Choice[]; chosen: string; onChoose: (id: string) => void }) {
  // Open: where on screen, under its chip. Fixed, so a dialog's scrolling body can't
  // clip it; closed on any scroll, which would leave it behind.
  const [open, setOpen] = useState<{ top: number; left: number } | null>(null);
  const [find, setFind] = useState("");
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(null);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation(); // the menu, not the dialog around it
      setOpen(null);
    };
    const scrolled = (e: Event) => !box.current?.contains(e.target as Node) && setOpen(null);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc, true);
    document.addEventListener("scroll", scrolled, true);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc, true);
      document.removeEventListener("scroll", scrolled, true);
    };
  }, [open]);
  const toggle = (button: HTMLElement) => {
    if (open) return setOpen(null);
    const r = button.getBoundingClientRect();
    setOpen({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 330)) });
  };
  const name = choices.find((c) => c.id === chosen)?.name ?? chosen;
  const words = find.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const shown = choices.filter((c) => words.every((w) => c.name.toLowerCase().includes(w)));

  if (chosen)
    return (
      <button type="button" className={`${css.chip} ${css.chipOn}`} onClick={() => onChoose("")} aria-label={`${title}: ${name}, clear`}>
        {title}: {name} ✕
      </button>
    );
  return (
    <span className={css.chipBox} ref={box}>
      <button type="button" className={css.chip} aria-expanded={!!open} onClick={(e) => toggle(e.currentTarget)}>
        {title} ▾
      </button>
      {open && (
        <div className={css.chipMenu} role="menu" style={{ top: open.top, left: open.left }}>
          {choices.length > 8 && (
            <input type="search" placeholder={`Find a ${title.toLowerCase()}`} value={find} autoFocus onChange={(e) => setFind(e.target.value)} />
          )}
          {shown.map((c) => (
            <button
              type="button"
              role="menuitem"
              key={c.id}
              className={css.menuItem}
              onClick={() => {
                onChoose(c.id);
                setOpen(null);
              }}
            >
              {c.name}
            </button>
          ))}
          {shown.length === 0 && <span className={css.note}>None match.</span>}
        </div>
      )}
    </span>
  );
}

export function LevelChips({ counts, value, onChange }: { counts: Record<string, number>; value: Set<Level>; onChange: (v: Set<Level>) => void }) {
  return (
    <>
      {[...LEVELS].reverse().map((l) => {
        const on = value.has(l);
        return (
          <button
            type="button"
            key={l}
            aria-pressed={on}
            className={`${css.chip} ${css[`chip_${l}`]} ${on ? css.levelOn : ""}`}
            onClick={() => {
              const next = new Set(value);
              if (on) next.delete(l);
              else next.add(l);
              onChange(next);
            }}
          >
            {LEVEL_NAMES[l]} {counts[l] ?? 0}
          </button>
        );
      })}
    </>
  );
}
