import { useEffect, useRef, useState } from "react";
import css from "../cameras.module.css";
import { Edits, PANELS } from "./common";

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
