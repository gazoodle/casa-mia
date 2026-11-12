/** A section of the Camera compositor page that folds to its heading, and the choice kept
 * in this browser: the sections are long, and the one wanted is often a long way down. */

import { useState, type ReactNode } from "react";
import guest from "../guest.module.css";
import ui from "../ui.module.css";

/** A per-viewer choice kept in this browser (try: storage may be blocked). */
export function useKept<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T) || fallback;
    } catch {
      return fallback;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, v);
    } catch {
      /* not kept: fine */
    }
  };
  return [value, set];
}

/** One section: its heading folds it (the fold kept for this browser, by `id`). Folded,
 * its heading and its action (pause, purge) stay; its blurb and body go. */
export function FoldArea({ id, title, blurb, action, children }: { id: string; title: string; blurb: ReactNode; action?: ReactNode; children: ReactNode }) {
  const [kept, keep] = useKept<"open" | "shut">(`cm.compositor.${id}`, "open");
  const open = kept === "open";
  return (
    <section className={guest.area}>
      {/* (the pages' AreaHead, with a heading that folds) */}
      <div className={guest.areaHead}>
        <div>
          <h2>
            <button className={ui.fold} aria-expanded={open} title={open ? "Fold this section away" : "Show this section"} onClick={() => keep(open ? "shut" : "open")}>
              {title}
            </button>
          </h2>
          {open && <p>{blurb}</p>}
        </div>
        {action}
      </div>
      {open && children}
    </section>
  );
}
