/** Arrange: lays a commander's cameras out for it as tiles around the main camera, on the
 * edges picked and in the order they fill (the search is the cards' arrange.ts, which lays
 * each one out with the real engine). The picture is the app's own drawing of the draft with
 * the arrangement applied, so it shows the real cameras. Bigger main ⇄ bigger tiles steps
 * through what the search found; Apply writes the panels, unsaved until Save. */

import { useMemo, useState } from "react";
import { arrange, bestOf, ORDER, TRIM, type Arrangement, type Mode } from "../../../../integration/cards/src/arrange.ts";
import { Camera } from "../cameras";
import { Dialog, Field, Segmented, Switch } from "../ui";
import css from "../cameras.module.css";
import ui from "../ui.module.css";
import { Commander, PANELS, Panel } from "./common";
import { Chips } from "./inputs";
import { LivePreview } from "./preview";

type Side = (typeof PANELS)[number];

const SHAPES: [string, string][] = [
  ["16:9", "16:9"],
  ["4:3", "4:3"],
  ["1:1", "Square"],
];
const NAMES: Record<Side, string> = { bottom: "Bottom", left: "Left", right: "Right", top: "Top" };
const PERCENT = Math.round(TRIM * 100);
const MODES: [Mode, string][] = [
  ["best", "Best fit"],
  ["vary", "Sizes vary"],
  ["exact", "Exact shape"],
];
const MODE_HELP: Record<Mode, string> = {
  best: `All the tiles are one size. Each may be up to ${PERCENT}% off the tile shape, so that they fill their edges.`,
  vary: "As Best fit, and an edge's tiles grow to fill it where they can, so the tiles on one edge may be bigger than those on another.",
  exact: "All the tiles are one size, at exactly the tile shape. This usually leaves gaps.",
};

/** The commander with an arrangement written into it. */
function applied(value: Commander, a: Arrangement): Commander {
  const next = structuredClone(value);
  for (const p of PANELS) next[p] = { ...next[p], ...a.panels[p] } as Panel;
  next.main_fit = a.main_fit;
  return next;
}

export function ArrangeDialog({
  value,
  cameras,
  onApply,
  onClose,
}: {
  value: Commander;
  cameras: Record<string, Camera>;
  onApply: (c: Commander) => void;
  onClose: () => void;
}) {
  const [cell, setCell] = useState("16:9");
  const [mode, setMode] = useState<Mode>("best");
  const [oneLine, setOneLine] = useState(true);
  // it starts on the edges in use now
  const [edges, setEdges] = useState<Side[]>(() => {
    const used = ORDER.filter((p) => value[p].cameras.length && !value[p].hidden);
    return used.length ? used : ORDER.slice(0, 2);
  });

  // the cameras in fill order: those on the first edge now stay first
  const held = [...new Set([...edges, ...PANELS].flatMap((p) => value[p].cameras))];
  const options = useMemo(
    () => arrange({ width: value.width, height: value.height, gap: value.gap, margin: value.margin, cameras: held, cell, edges, mode, oneLine }),
    // the cameras by what they are, not the array made each render
    [value.width, value.height, value.gap, value.margin, held.join(), cell, edges, mode, oneLine],
  );
  const [picked, setPicked] = useState<number>();
  const at = picked !== undefined && picked < options.length ? picked : bestOf(options);
  const shown: Arrangement | undefined = options[at];

  // a new search starts on its best
  const asking =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPicked(undefined);
    };
  const apply = () => {
    onApply(applied(value, shown!));
    onClose();
  };

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
        All {held.length} cameras as tiles around the main camera. Apply replaces the panels' cameras, sizes and fits
        and the main camera's fit; nothing is saved until you Save.
      </p>
      <div className={css.arrangeOptions}>
        <Field
          label="Edges, in the order they fill"
          help="The first cameras go on the first edge. ‹ and › change the order, ✕ takes an edge out of use."
        >
          <Chips
            items={edges}
            label={(p) => NAMES[p as Side]}
            thumb={() => null}
            choices={ORDER.filter((p) => !edges.includes(p))}
            onChange={asking((items) => setEdges(items as Side[]))}
          />
        </Field>
        <Field label="One row or column per edge" help="On: never two rows or columns of tiles on an edge.">
          <Switch on={oneLine} label="One row or column per edge" onChange={asking(setOneLine)} />
        </Field>
        <Field label="Tile fit" help={MODE_HELP[mode]}>
          <Segmented value={mode} options={MODES} onChange={asking(setMode)} />
        </Field>
        <Field label="Tile shape" help="16:9 shows most cameras whole. Squares crop each camera's sides.">
          <Segmented value={cell} options={SHAPES} onChange={asking(setCell)} />
        </Field>
      </div>
      {shown ? (
        <>
          <div className={css.arrangePreview}>
            <LivePreview store={{ commanders: [applied(value, shown)], cameras }} index={0} />
          </div>
          <div className={css.arrangeRow}>
            <button type="button" className={ui.button} disabled={at === 0} onClick={() => setPicked(at - 1)}>
              ‹ Bigger main
            </button>
            <span className={css.muted}>
              {at + 1} of {options.length}: tiles {mode === "vary" ? "from " : ""}
              {shown.tile[0]}×{shown.tile[1]} px, {Math.round(shown.waste * 100)}% of the picture unused
              {shown.main_fit === "fit" ? " (the main camera shown whole)" : ""}
              {options.length === 1 ? ". This is the only arrangement found: another edge, tile fit or shape may give more." : ""}
            </span>
            <button type="button" className={ui.button} disabled={at === options.length - 1} onClick={() => setPicked(at + 1)}>
              Bigger tiles ›
            </button>
          </div>
        </>
      ) : (
        <p className={ui.dialogText} role="alert">
          {!held.length
            ? "The commander has no cameras yet: add some to its panels first."
            : !edges.length
              ? "No edge is in use: add one for the tiles to go on."
              : "The cameras don't fit on these edges: add an edge, or try another tile fit or shape."}
        </p>
      )}
    </Dialog>
  );
}
