/** The house photo at the top of the home page (and of the guest welcome page): which
 * photo, and how each page frames it. Edited here, saved by the app; no rebuild. Nothing
 * reaches the app until Save, the photo included, so Cancel undoes everything. */

import { useState } from "react";
import { api, type Frame, type HeaderView } from "./api";
import bundled from "./assets/header.jpg";
import css from "./app.module.css";
import ui from "./ui.module.css";

export const photoApi = api("header");

/** The settings being edited, plus a photo picked but not yet saved: a new file (shown
 * from the browser's memory), or "original" to go back to the bundled one. */
export type PhotoDraft = HeaderView & { pick?: { file: File; url: string } | "original" };

export function photoUrl(view: PhotoDraft): string {
  if (view.pick === "original") return bundled;
  if (view.pick) return view.pick.url;
  return view.custom ? `api/header/image?v=${view.stamp}` : bundled;
}

/** The photo filling its (position: relative) parent, framed. */
export function Photo({ src, frame }: { src: string; frame: Frame }) {
  const at = `${frame.x}% ${frame.y}%`;
  return (
    <div
      className={css.photo}
      style={{ backgroundImage: `url(${src})`, backgroundPosition: at, transformOrigin: at, transform: `scale(${frame.zoom})` }}
    />
  );
}

/** The edit panel under the hero. `onChange` shows a change live (the hero above follows
 * `view.home`); `onDone` ends editing, with the saved view, or undefined on Cancel.
 * `saved` is what each page's Reset goes back to. */
export function PhotoEditor({
  view,
  saved,
  onChange,
  onDone,
}: {
  view: PhotoDraft;
  saved: HeaderView;
  onChange: (view: PhotoDraft) => void;
  onDone: (saved?: HeaderView) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = (next: PhotoDraft["pick"]) => {
    if (typeof view.pick === "object") URL.revokeObjectURL(view.pick.url);
    onChange({ ...view, pick: next });
  };

  /** The photo change first, then the framing; the view the app saved. */
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (view.pick === "original") await photoApi.del<HeaderView>("image");
      else if (view.pick) await photoApi.put<HeaderView>("image", view.pick.file);
      onDone(await photoApi.put<HeaderView>("", { home: view.home, welcome: view.welcome }));
      if (typeof view.pick === "object") URL.revokeObjectURL(view.pick.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const showing =
    view.pick === "original"
      ? "The photo the app comes with, from Save."
      : view.pick
        ? `New photo ${view.pick.file.name}, from Save.`
        : view.custom
          ? "Your uploaded photo."
          : "The photo the app comes with.";

  const frame = (page: "home" | "welcome") => (frame: Frame) => onChange({ ...view, [page]: frame });

  return (
    <section className={css.editor} aria-label="House photo">
      <div className={css.editorHead}>
        <div>
          <h2>House photo</h2>
          <p>{showing} Shown here and on the guest welcome page.</p>
        </div>
        <div className={css.editorActions}>
          <label className={`${ui.button} ${busy ? css.disabled : ""}`}>
            Choose photo…
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) pick({ file, url: URL.createObjectURL(file) });
              }}
            />
          </label>
          {(typeof view.pick === "object" || (view.custom && view.pick !== "original")) && (
            <button className={ui.button} disabled={busy} onClick={() => pick(view.custom ? "original" : undefined)}>
              Use the original
            </button>
          )}
        </div>
      </div>
      {error && <p className={css.error}>{error}</p>}
      <div className={css.frames}>
        <Framing title="Home page" help="The header above follows these." value={view.home} saved={saved.home} onChange={frame("home")} />
        <div className={css.welcomeFrame}>
          <Framing
            title="Welcome page"
            help="What a visitor's phone shows."
            value={view.welcome}
            saved={saved.welcome}
            onChange={frame("welcome")}
          />
          <div className={css.miniPhone} aria-hidden="true">
            <div className={css.miniHero}>
              <Photo src={photoUrl(view)} frame={view.welcome} />
            </div>
          </div>
        </div>
      </div>
      <div className={css.editorFoot}>
        <button
          className={ui.button}
          disabled={busy}
          onClick={() => {
            if (typeof view.pick === "object") URL.revokeObjectURL(view.pick.url);
            onDone();
          }}
        >
          Cancel
        </button>
        <button
          className={ui.primary}
          disabled={busy}
          onClick={save}
        >
          Save
        </button>
      </div>
    </section>
  );
}

/** One page's sliders. Reset puts back the last saved values, so you can try and undo. */
function Framing({
  title,
  help,
  value,
  saved,
  onChange,
}: {
  title: string;
  help: string;
  value: Frame;
  saved: Frame;
  onChange: (f: Frame) => void;
}) {
  const changed = (["zoom", "x", "y"] as const).some((k) => value[k] !== saved[k]);
  const slider = (key: keyof Frame, label: string, min: number, max: number, step: number, shown: string) => (
    <label className={css.slider}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
      />
      <output>{shown}</output>
    </label>
  );
  return (
    <div className={css.framing}>
      <div className={css.framingHead}>
        <div>
          <h3>{title}</h3>
          <p>{help}</p>
        </div>
        <button className={`${ui.button} ${ui.small}`} disabled={!changed} onClick={() => onChange(saved)} title="Back to the saved values">
          Reset
        </button>
      </div>
      {slider("zoom", "Zoom", 1, 4, 0.05, `${value.zoom.toFixed(2)}×`)}
      {slider("x", "Left – right", 0, 100, 1, `${Math.round(value.x)}%`)}
      {slider("y", "Top – bottom", 0, 100, 1, `${Math.round(value.y)}%`)}
    </div>
  );
}
