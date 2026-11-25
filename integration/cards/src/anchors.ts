// The nine places a thing can sit in its space: the corners, the edges and the centre.
// Shared by the Over layer and Jukebox's micro player; the grid that chooses one is
// anchor-grid.ts. Nothing here draws, so it is tested by itself.

export type Anchor = "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";
export const ANCHORS: Anchor[][] = [
  ["top-left", "top", "top-right"],
  ["left", "center", "right"],
  ["bottom-left", "bottom", "bottom-right"],
];

/** An anchor's row and column in ANCHORS; an unknown one (a typo in YAML) is the centre. */
export function cell(anchor: Anchor): [number, number] {
  const row = ANCHORS.findIndex((r) => r.includes(anchor));
  return row < 0 ? [1, 1] : [row, ANCHORS[row].indexOf(anchor)];
}

/** A thing's place in its space (a flex box): `justify` across, `align` down. */
export function placement(anchor: Anchor): { justify: string; align: string } {
  const [row, column] = cell(anchor);
  const at = ["flex-start", "center", "flex-end"];
  return { justify: at[column], align: at[row] };
}
