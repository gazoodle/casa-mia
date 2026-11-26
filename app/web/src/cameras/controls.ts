/** A camera's controls (a gate, a light) and how they are shown on a commander's full
 * screen, in one place for the Cameras page and the Camera Commander card's full screen. */

export type Control = { entity: string; name?: string; icon?: string };

export type Edge = "top" | "bottom" | "left" | "right";
export const EDGES: Edge[] = ["top", "bottom", "left", "right"];

/** Along its edge: left or top, the middle, right or bottom (as a sections view's badges). */
export type Align = "start" | "center" | "end";

/** The edge for each shape of screen, where along it, the pills' size (their height in
 * CSS px where there is room: see pillHeight; their text, icon and gaps scale with it) and
 * how solid their background is (%); a camera without its own takes these. */
export type ControlsAt = { landscape: Edge; portrait: Edge; align: Align; size: number; opacity: number };
export const CONTROLS_AT: ControlsAt = { landscape: "bottom", portrait: "bottom", align: "center", size: 44, opacity: 60 };

/** The sizes the page's slider offers, px. */
export const PILL_SIZES = { min: 32, max: 72, step: 4 };

/** What a size bends to (owner, 2026-11-27, after a build that made it a plain share of
 * the place: 11 px pills on a phone, 70 px ones on a desktop). A size is anchored in
 * CSS px, which is near enough a physical size, and only shrinks in a small place:
 * - a place whose shorter side is ROOMY px or more has room: the size as set, never more;
 * - a smaller place has it in proportion, but never under FLOOR, the least a finger hits
 *   and an eye reads: below that the bar gives way instead (barFit);
 * - with a mouse it is never over FINE: a pointer needs no finger-sized button, and a
 *   desktop's main camera is a very large place. */
export const PILL_ROOMY = 600;
export const PILL_FLOOR = 32;
export const PILL_FINE = 34;

/** A size was one of three names before 2026.11.7, and in 2026.11.14-b8 alone a share
 * (3 to 12 %) of a place's shorter side, read here as the height it gave on a 1280 x 800
 * tablet's full screen. No height is as little as the largest share, so the two can't
 * be mistaken. */
const NAMED: Record<string, number> = { small: 40, medium: 56, large: 72 };
const SHARE_MOST = 12;
const TABLET_SIDE = 800;

export function controlsAt(own?: Partial<Omit<ControlsAt, "size">> & { size?: number | string }): ControlsAt {
  const at = { ...CONTROLS_AT, ...own };
  const size = typeof at.size === "number" ? at.size : (NAMED[at.size] ?? CONTROLS_AT.size);
  const px = size <= SHARE_MOST ? (size * TABLET_SIDE) / 100 : size;
  return { ...at, size: Math.min(PILL_SIZES.max, Math.max(PILL_SIZES.min, px)) };
}

/** A pill's height in px in a place w x h px; `fine`: the device has a mouse. */
export function pillHeight(at: ControlsAt, place: [number, number], fine = false): number {
  const most = fine ? Math.min(at.size, PILL_FINE) : at.size;
  return Math.min(most, Math.max(Math.min(PILL_FLOOR, most), (at.size * Math.min(...place)) / PILL_ROOMY));
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
export function barFit(at: ControlsAt, place: [number, number], edge: Edge, names: string[], presets: string[], fine = false): Bar {
  const height = pillHeight(at, place, fine);
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

/** A camera's zoom, from its number entity: where it is, its range, how far one tap of
 * the stepper moves it, and the entity's own step (`grain`), which every level sent is a
 * whole number of. */
export type Zoom = { value: number; min: number; max: number; step: number; grain: number };

/** Taps of the stepper from one end of a zoom's range to the other. */
const ZOOM_TAPS = 10;

/** A zoom entity's state and attributes as a Zoom; null when it has no level now
 * (unavailable, unknown) or no range. */
export function zoomOf(state: string, attrs: Record<string, unknown>): Zoom | null {
  const [value, min, max] = [Number(state), Number(attrs.min ?? 0), Number(attrs.max ?? 100)];
  if (state.trim() === "" || !Number.isFinite(value) || !(max > min)) return null;
  const grain = Number(attrs.step) > 0 ? Number(attrs.step) : 1;
  return { value, min, max, grain, step: Math.max(grain, (max - min) / ZOOM_TAPS) };
}

/** A level as a share of the zoom's range, %: 0 is all the way out. */
export const zoomPct = (z: Zoom, value: number) => Math.round(((value - z.min) / (z.max - z.min)) * 100);

/** The level one tap in (`by` 1) or out (-1) from `from`, within the range. */
export function zoomStep(z: Zoom, from: number, by: 1 | -1): number {
  const to = Math.min(z.max, Math.max(z.min, from + by * z.step));
  return Number((z.min + Math.round((to - z.min) / z.grain) * z.grain).toFixed(6));
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
