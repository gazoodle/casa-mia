/** A camera's controls (a gate, a light) and how they are shown on a commander's full
 * screen, in one place for the Cameras page and the Camera Commander card's full screen. */

export type Control = { entity: string; name?: string; icon?: string };

export type Edge = "top" | "bottom" | "left" | "right";
export const EDGES: Edge[] = ["top", "bottom", "left", "right"];

/** Along its edge: left or top, the middle, right or bottom (as a sections view's badges). */
export type Align = "start" | "center" | "end";

/** The edge for each shape of screen, where along it, the pills' size (their height, as
 * % of the shorter side of the place they are shown in: a main camera's area, or the whole
 * screen; their text, icon and gaps scale with it) and how solid their background is (%);
 * a camera without its own takes these. */
export type ControlsAt = { landscape: Edge; portrait: Edge; align: Align; size: number; opacity: number };
export const CONTROLS_AT: ControlsAt = { landscape: "bottom", portrait: "bottom", align: "center", size: 7, opacity: 60 };

/** The sizes the page's slider offers, %. */
export const PILL_SIZES = { min: 3, max: 12, step: 0.5 };

/** A pill is never shorter or taller than this, px, whatever its place: under the floor
 * it is specks, and a very large screen needs no bigger button than the cap. */
export const PILL_FLOOR = 10;
export const PILL_CAP = 96;

/** Until 2026.11.14-b8 a size was a height in px, the same on every screen (and before
 * 2026.11.7 one of three names). It is read as the share it was of a 1280 x 800 tablet's
 * full screen, so a camera looks there as it did. No share is as much as the smallest of
 * the old heights (24 px), so the two can't be mistaken. */
const NAMED: Record<string, number> = { small: 40, medium: 56, large: 72 };
const TABLET_SIDE = 800;

export function controlsAt(own?: Partial<Omit<ControlsAt, "size">> & { size?: number | string }): ControlsAt {
  const at = { ...CONTROLS_AT, ...own };
  const size = typeof at.size === "number" ? at.size : (NAMED[at.size] ?? CONTROLS_AT.size);
  const share = size > PILL_SIZES.max ? Math.round((200 * size) / TABLET_SIDE) / 2 : size;
  return { ...at, size: Math.min(PILL_SIZES.max, Math.max(PILL_SIZES.min, share)) };
}

/** A pill's height in px in a place w x h px. */
export function pillHeight(at: ControlsAt, place: [number, number]): number {
  return Math.min(PILL_CAP, Math.max(PILL_FLOOR, (at.size * Math.min(...place)) / 100));
}

/** The most PTZ presets that stand in the bar as buttons of their own; a camera with more
 * has one PTZ button, which opens them out beside the bar. */
export const PRESETS_INLINE = 3;

/** The style guide's chip (pills.css: cm-chip), which the pills are in proportion to at
 * any height: 22 px high, 10 px text, 10 px at each end, 4 px between icon and text. The
 * icon is a little over the text's height, as the guide's icons are beside their words. */
const CHIP = { height: 22, font: 10, pad: 10, gap: 4, icon: 13 };
/** A letter's width, of the text's size: capitals with the chip's letter spacing. An
 * estimate, as nothing is measured: it decides only when names give way (barFit). */
const LETTER = 0.72;
/** Between pills, and around the bar, of a pill's height (full.ts, edges.module.css). */
const BETWEEN = 0.2;
const AROUND = 0.3;
/** The most of a place's width a bar down its side may take with its names. */
const SIDE_SHARE = 0.3;

/** A pill's width, in pill heights: with its name, or its icon alone (a circle). */
const pillWidth = (name: string | null) =>
  name === null ? 1 : (2 * CHIP.pad + CHIP.icon + CHIP.gap + name.length * CHIP.font * LETTER) / CHIP.height;

/** How a bar is shown in its place: the pills' height (px), whether they keep their names
 * (else icons alone), and whether the presets are behind one PTZ button. */
export type Bar = { height: number; names: boolean; fold: boolean };

/** A bar of pills (`names`: the card's own buttons and the camera's controls) and PTZ
 * presets, as it fits along `edge` of a place w x h px. What doesn't fit gives way in a
 * fixed order, so a bar never wraps untidily or runs off its place: first the presets go
 * behind the PTZ button (as more than PRESETS_INLINE always are), then the names go and
 * the pills are icons alone. The presets keep their names when opened out: their icons
 * are all the same. */
export function barFit(at: ControlsAt, place: [number, number], edge: Edge, names: string[], presets: string[]): Bar {
  const height = pillHeight(at, place);
  const along = edge === "top" || edge === "bottom";
  const fits = (named: boolean, fold: boolean) => {
    const ptz = presets.length ? (fold ? ["PTZ"] : presets) : [];
    const widths = [...names, ...ptz].map((n) => pillWidth(named ? n : null));
    if (!widths.length) return true;
    const run = (sizes: number[]) => (sizes.reduce((a, b) => a + b, 0) + (sizes.length - 1) * BETWEEN + 2 * AROUND) * height;
    // along the top or foot: side by side in the width; down a side: one under another
    // in the height, and no wider than its share of the width
    return along ? run(widths) <= place[0] : run(widths.map(() => 1)) <= place[1] && (Math.max(...widths) + 2 * AROUND) * height <= place[0] * SIDE_SHARE;
  };
  const tries: [boolean, boolean][] = [
    [true, presets.length > PRESETS_INLINE],
    [true, true],
    [false, true],
  ];
  const [named, fold] = tries.find(([n, f]) => fits(n, f)) ?? tries[2];
  return { height, names: named, fold };
}

/** The pills' look as CSS custom properties, for the card and the page's preview alike:
 * `height` is a pill's (barFit), and `scale` shrinks it for a preview drawn smaller than
 * a screen. */
export function controlsStyle(at: ControlsAt, height: number, scale = 1): Record<string, string> {
  const h = height * scale;
  const part = (of: number) => `${Math.round((h * of * 100) / CHIP.height) / 100}px`;
  return {
    "--cm-pill-height": `${Math.round(h * 100) / 100}px`,
    "--cm-pill-font": part(CHIP.font),
    "--cm-pill-pad": part(CHIP.pad),
    "--cm-pill-gap": part(CHIP.gap),
    "--cm-pill-icon": part(CHIP.icon),
    "--cm-pill-alpha": `${at.opacity}%`,
    "--cm-pill-align": at.align === "center" ? "center" : `flex-${at.align}`,
  };
}
