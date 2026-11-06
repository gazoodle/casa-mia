/** Arrange: lays a commander's cameras out for it, as tiles all of one size around the main
 * camera with as little of the picture unused as can be (the search is the cards' arrange.ts,
 * which lays each one out with the real engine). Bigger main ⇄ bigger tiles steps through
 * the best it found; Apply writes the panels, unsaved until Save. */

import { useMemo, useState } from "react";
import { arrange, bestOf, ORDER } from "../../../../integration/cards/src/arrange.ts";
import { Dialog, Field, Segmented, Switch } from "../ui";
import css from "../cameras.module.css";
import ui from "../ui.module.css";
import { Commander, PANELS, Panel } from "./common";

type Side = (typeof PANELS)[number];

const SHAPES: [string, string][] = [
  ["16:9", "16:9"],
  ["4:3", "4:3"],
  ["1:1", "Square"],
];
const NAMES: Record<Side, string> = { bottom: "Bottom", left: "Left", right: "Right", top: "Top" };

export function ArrangeDialog({ value, onApply, onClose }: { value: Commander; onApply: (c: Commander) => void; onClose: () => void }) {
  const [cell, setCell] = useState("16:9");
  const [edges, setEdges] = useState<Side[]>([...ORDER]);
  const [oneLine, setOneLine] = useState(true);
  const cameras = [...new Set(PANELS.flatMap((p) => value[p].cameras))];
  const options = useMemo(
    () => arrange({ width: value.width, height: value.height, gap: value.gap, margin: value.margin, cameras, cell, edges, oneLine }),
    // the cameras by what they are, not the array made each render
    [value.width, value.height, value.gap, value.margin, cameras.join(), cell, edges, oneLine],
  );
  const [picked, setPicked] = useState<number>();
  const at = picked !== undefined && picked < options.length ? picked : bestOf(options);
  const shown = options[at];

  const apply = () => {
    const next = structuredClone(value);
    for (const p of PANELS) next[p] = { ...next[p], ...shown.panels[p] } as Panel;
    next.main_fit = shown.main_fit;
    onApply(next);
    onClose();
  };
  const restart = () => setPicked(undefined); // a new search starts on its best

  return (
    <Dialog
      title="Arrange the cameras"
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={ui.primary} disabled={!shown} onClick={apply}>
            Apply
          </button>
        </>
      }
    >
      <p className={ui.dialogText}>
        All {cameras.length} cameras as tiles of one size around the main camera, filling the bottom first, then the
        left, the right and the top. Apply replaces the panels' cameras, sizes and fits and the main camera's fit;
        nothing is saved until you Save.
      </p>
      <Field label="Tile shape" help="16:9 shows most cameras whole. Squares crop each camera's sides.">
        <Segmented
          value={cell}
          options={SHAPES}
          onChange={(c) => {
            setCell(c);
            restart();
          }}
        />
      </Field>
      <Field label="One row or column per edge" help="On: never two rows or columns of tiles on an edge.">
        <Switch
          on={oneLine}
          label="One row or column per edge"
          onChange={(on) => {
            setOneLine(on);
            restart();
          }}
        />
      </Field>
      <Field label="Edges it may use">
        <span className={css.arrangeRow}>
          {ORDER.map((p) => (
            <span key={p} className={css.arrangeEdge}>
              <Switch
                on={edges.includes(p)}
                label={NAMES[p]}
                onChange={(on) => {
                  setEdges(on ? [...edges, p] : edges.filter((e) => e !== p));
                  restart();
                }}
              />
              {NAMES[p]}
            </span>
          ))}
        </span>
      </Field>
      {shown ? (
        <>
          <Sketch value={value} shown={shown} />
          <div className={css.arrangeRow}>
            <button type="button" className={ui.button} disabled={at === 0} onClick={() => setPicked(at - 1)}>
              ‹ Bigger main
            </button>
            <span className={css.muted}>
              {at + 1} of {options.length}: tiles {shown.tile[0]}×{shown.tile[1]} px, {Math.round(shown.waste * 100)}% of the
              picture unused{shown.main_fit === "fit" ? " (the main camera shown whole)" : ""}
            </span>
            <button type="button" className={ui.button} disabled={at === options.length - 1} onClick={() => setPicked(at + 1)}>
              Bigger tiles ›
            </button>
          </div>
        </>
      ) : (
        <p className={ui.dialogText} role="alert">
          {cameras.length
            ? "The cameras don't fit as tiles of a useful size on these edges: allow more edges, or try another tile shape."
            : "The commander has no cameras yet: add some to its panels first."}
        </p>
      )}
    </Dialog>
  );
}

/** The arrangement drawn plainly: the picture, the main camera (as much of its space as it
 * shows) and the tiles. */
function Sketch({ value, shown }: { value: Commander; shown: ReturnType<typeof arrange>[number] }) {
  const [x, y, w, h] = shown.main;
  const shape = 16 / 9; // as arrange.ts assumes for the main camera
  const [mw, mh] = shown.main_fit === "fit" ? [Math.min(w, h * shape), Math.min(h, w / shape)] : [w, h];
  const counts = PANELS.filter((p) => shown.panels[p].cameras.length).map((p) => `${shown.panels[p].cameras.length} ${p}`);
  return (
    <svg
      className={css.arrangeSketch}
      style={{ aspectRatio: `${value.width} / ${value.height}` }}
      viewBox={`0 0 ${value.width} ${value.height}`}
      role="img"
      aria-label={`Tiles: ${counts.join(", ")}`}
    >
      <rect className={css.arrangePicture} width={value.width} height={value.height} />
      <rect className={css.arrangeMain} x={x + (w - mw) / 2} y={y + (h - mh) / 2} width={mw} height={mh} />
      {shown.rects.map(([tx, ty, tw, th], i) => (
        <rect key={i} className={css.arrangeTile} x={tx} y={ty} width={tw} height={th} />
      ))}
    </svg>
  );
}
