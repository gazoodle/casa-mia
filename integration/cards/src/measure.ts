// What a laid-out commander does with its space, in the terms people judge it by: how big
// the main camera is, how much of the space shows no camera, how much of a picture is cut
// off, and whether tiles have gone narrow. The Camera Commander page says these under its
// stage (docs/design/commander-responsive-layout.md), for any size the stage is dragged to.
import type { Rect } from "./layout.ts";

/** One camera as drawn: its place, its own shape (width / height), and how it is put
 * there: cover (cropped to fill), contain (whole, with bars) or fill (stretched to fit). */
export type Shown = { rect: Rect; shape: number; how: "cover" | "contain" | "fill" };

export type Measured = {
  /** The main camera's picture, as a share of the space. */
  main: number;
  /** The share of the space that shows no camera: gaps, margins, bars, empty panels. */
  unused: number;
  /** The most any camera loses to cropping (0.25: a quarter of its picture). */
  lost: number;
  /** The most any camera is stretched out of its shape. */
  squeezed: number;
  /** How many tiles are taller than wide. */
  tall: number;
};

/** How far a place is from the camera's shape: 0 when they match. */
function off({ rect: [, , w, h], shape }: Shown): number {
  if (w <= 0 || h <= 0) return 0;
  return 1 - Math.min(w / h / shape, shape / (w / h));
}

/** The room a camera's picture takes: all of its place, less its bars when shown whole. */
const area = (s: Shown) => Math.max(0, s.rect[2]) * Math.max(0, s.rect[3]) * (s.how === "contain" ? 1 - off(s) : 1);

export function measure([w, h]: [number, number], main: Shown | null, tiles: Shown[]): Measured {
  const all = main ? [main, ...tiles] : tiles;
  const most = (how: Shown["how"]) => Math.max(0, ...all.filter((s) => s.how === how).map(off));

  return {
    main: main ? area(main) / (w * h) : 0,
    unused: 1 - all.reduce((sum, s) => sum + area(s), 0) / (w * h),
    lost: most("cover"),
    squeezed: most("fill"),
    tall: tiles.filter((s) => s.rect[3] > s.rect[2] && s.rect[2] > 0).length,
  };
}
