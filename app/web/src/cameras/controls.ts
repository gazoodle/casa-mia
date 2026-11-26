/** A camera's controls (a gate, a light) and how they are shown on a commander's full
 * screen, in one place for the Cameras page and the Camera Commander card's full screen. */

export type Control = { entity: string; name?: string; icon?: string };

export type Edge = "top" | "bottom" | "left" | "right";
export const EDGES: Edge[] = ["top", "bottom", "left", "right"];

/** Along its edge: left or top, the middle, right or bottom (as a sections view's badges). */
export type Align = "start" | "center" | "end";

/** The edge for each shape of screen, where along it and how solid the pills' background
 * is (%); a camera without its own takes these. The pills have no size of their own
 * (owner, 2026-11-27): they are the main camera's name pill, at CONTROLS_HEIGHT of the
 * name's size there (labels.ts: nameSize), so a name and a button over a camera are one
 * family. Two builds
 * gave them a size of their own, in px and then as a share of their place, and neither
 * looked right on a phone, a wall tablet and a Mac at once. */
export type ControlsAt = { landscape: Edge; portrait: Edge; align: Align; opacity: number };
/** Down the right edge from the top, either way up (owner, 2026-11-27). */
export const CONTROLS_AT: ControlsAt = { landscape: "right", portrait: "right", align: "start", opacity: 60 };

/** A camera's own settings, each it lacks at its default. A size saved before
 * 2026.11.14-b10 (a height, a share or one of three names) is left out: it is no longer
 * used, and is dropped when the camera is next saved. */
export function controlsAt(own?: Partial<ControlsAt> & { size?: unknown }): ControlsAt {
  const { size: _size, ...rest } = own ?? {};
  return { ...CONTROLS_AT, ...rest };
}

/** The most PTZ presets that stand in the bar as buttons of their own; a camera with more
 * has one PTZ button, which opens them out beside the bar. */
export const PRESETS_INLINE = 3;

/** The name pill (the card's caption; the compositor's labels.py: name): its height, the
 * room at each end and between icon and text, and the icon, each of the name's size. */
const PILL = { height: 1.4, pad: 0.5, gap: 0.3, icon: 1.1 };
/** A pill's height, of its name's size. */
export const PILL_HEIGHT = PILL.height;
/** The controls' height, of the main camera's name size: a little larger than the name's
 * own pill (owner, 2026-11-26: set by hand on three devices, 1.39 to 1.56 of the name). */
export const CONTROLS_HEIGHT = 1.5;
/** The size the controls are drawn at (`name` for barFit and controlsStyle), for a main
 * camera name of `main` px. */
export const controlsName = (main: number) => (main * CONTROLS_HEIGHT) / PILL.height;
/** A letter's width, of the text's size, in a name's mixed case. An estimate, as nothing
 * is measured: it decides only when names give way (barFit). */
const LETTER = 0.58;
/** Between pills, and around the bar, of a pill's height (full.ts, edges.module.css). At
 * each end of its edge a pill's height (END), so the first button is not hard against
 * the frame's edge, where a finger misses it (owner, 2026-11-26: Full screen at the top of
 * a wall tablet's frame, and the button under it pressed instead). */
const BETWEEN = 0.2;
const AROUND = 0.3;
const END = 1;
/** The most of a place's width a bar down its side may take with its names. */
const SIDE_SHARE = 0.3;

/** A pill's width, in pill heights: with its name, or its icon alone (a circle). */
const pillWidth = (name: string | null) =>
  name === null ? 1 : (2 * PILL.pad + PILL.icon + PILL.gap + name.length * LETTER) / PILL.height;

/** How a bar is shown in its place: the pills' height (px), whether they keep their names
 * (else icons alone), and whether the presets are behind one PTZ button. */
export type Bar = { height: number; names: boolean; fold: boolean };

/** A bar of pills (`names`: the card's own buttons and the camera's controls) and PTZ
 * presets, at the controls' size there (`name`, px: controlsName), as it fits along `edge` of
 * a place w x h px. What doesn't fit gives way in a fixed order, so a bar never wraps
 * untidily or runs off its place: first the presets go behind the PTZ button (as more
 * than PRESETS_INLINE always are), then the names go and the pills are icons alone. The
 * presets keep their names when opened out: their icons are all the same. */
export function barFit(name: number, place: [number, number], edge: Edge, names: string[], presets: string[]): Bar {
  const height = name * PILL.height;
  const along = edge === "top" || edge === "bottom";
  const fits = (named: boolean, fold: boolean) => {
    const ptz = presets.length ? (fold ? ["PTZ"] : presets) : [];
    const widths = [...names, ...ptz].map((n) => pillWidth(named ? n : null));
    if (!widths.length) return true;
    const run = (sizes: number[]) => (sizes.reduce((a, b) => a + b, 0) + (sizes.length - 1) * BETWEEN + 2 * END) * height;
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
 * `name` is the controls' size there (px: controlsName), and `scale` shrinks it for a preview
 * drawn smaller than a screen. */
export function controlsStyle(at: ControlsAt, name: number, scale = 1): Record<string, string> {
  const px = (of: number) => `${Math.round(name * scale * of * 100) / 100}px`;
  return {
    "--cm-pill-height": px(PILL.height),
    "--cm-pill-font": px(1),
    "--cm-pill-pad": px(PILL.pad),
    "--cm-pill-gap": px(PILL.gap),
    "--cm-pill-icon": px(PILL.icon),
    "--cm-pill-alpha": `${at.opacity}%`,
    "--cm-pill-align": at.align === "center" ? "center" : `flex-${at.align}`,
  };
}
