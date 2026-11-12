// Where everything in a commander's picture is, whichever way it is laid out: the
// compositor's `placed` (app/src/casa_mia/modules/compositor/drawing.py). The card lays its
// tap zones over the picture from this, and the Camera Commander page's stage draws it, so
// neither knows the modes.
import { EQUAL, layout, PANELS, type Rect, type Settings } from "./layout.ts";
import { responsive, type Options } from "./responsive.ts";

/** A commander's layout settings: the fixed ones, and which mode it is in with the
 * Responsive mode's cameras and limits. */
export type Commander = Settings & { mode?: string; responsive?: Partial<Options> & { cameras?: string[] } };

/** How a camera is put in its place: cropped to fill it, whole with bars, or stretched. */
export type How = "cover" | "contain" | "fill";
/** A tile: where it is (its panel, or "tiles"), its camera, its place and how it is put there. */
export type Tile = { where: string; camera: string; rect: Rect; how: How };
export type Placed = {
  size: [number, number];
  main: Rect;
  mainHow: How;
  tiles: Tile[];
  /** The "+n more" tile, and how many cameras it stands for. */
  more: { rect: Rect; count: number } | null;
  /** The limits that gave way (Responsive: see the compositor's `responsive`). */
  gave: string[];
};

// A panel's fits that crop a camera to fill its tile (the compositor's CROPPED).
const CROPPED = ["cover", ...EQUAL];
const MAIN_HOW: Record<string, How> = { fill: "fill", crop: "cover" };

/** A commander's cameras, each once: panel by panel, or a Responsive commander's own list. */
export function camerasOf(s: Commander): string[] {
  if (s.mode === "responsive") return [...new Set(s.responsive?.cameras ?? [])];
  return [...new Set(PANELS.flatMap((p) => s[p].cameras))];
}

/** A commander laid out at its size, by its mode. */
export function placed(s: Commander, main: string | null = null): Placed {
  if (s.mode !== "responsive") {
    const [size, area, rects] = layout(s, main);
    return {
      size,
      main: area,
      mainHow: MAIN_HOW[s.main_fit ?? "fit"] ?? "contain",
      tiles: PANELS.flatMap((p) => s[p].cameras.map((camera, i): Tile => ({ where: p, camera, rect: rects[p][i], how: CROPPED.includes(s[p].fit ?? "cover") ? "cover" : "contain" }))),
      more: null,
      gave: [],
    };
  }

  const cameras = camerasOf(s);
  const laid = responsive(s.width, s.height, s.gap, s.margin ?? 0, cameras.length, s.responsive ?? {}, (s.aspects ?? {})[main ?? ""] ?? null, s.scale ?? 1);
  return {
    size: [s.width, s.height],
    main: laid.main,
    mainHow: laid.main_how,
    tiles: laid.tiles.map((rect, i): Tile => ({ where: "tiles", camera: cameras[i], rect, how: "cover" })),
    more: laid.more ? { rect: laid.more, count: laid.dropped } : null,
    gave: laid.gave,
  };
}
