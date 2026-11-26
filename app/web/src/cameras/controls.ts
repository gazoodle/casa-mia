/** A camera's controls (a gate, a light) and how they are shown on a commander's full
 * screen, in one place for the Cameras page and the Camera Commander card's full screen. */

export type Control = { entity: string; name?: string; icon?: string };

export type Edge = "top" | "bottom" | "left" | "right";
export const EDGES: Edge[] = ["top", "bottom", "left", "right"];

/** Along its edge: left or top, the middle, right or bottom (as a sections view's badges). */
export type Align = "start" | "center" | "end";

/** The edge for each shape of screen and where along it; a camera without its own takes
 * these. The buttons are the style guide's chips (pills.css: cm-chip) at the guide's one
 * size on every device, as everywhere else in Casa Mia (owner, 2026-11-26). Builds b8 to
 * b15 gave them a size of their own (px, a share of their place, then the main camera's
 * name by a fitted rule) and a background of their own. None looked right on a phone, a
 * wall tablet and a Mac at once, and the guide's chips do with no sizing at all: a CSS px
 * is already the unit that suits every device. */
export type ControlsAt = { landscape: Edge; portrait: Edge; align: Align };
/** Down the right edge from the top, either way up (owner, 2026-11-27). */
export const CONTROLS_AT: ControlsAt = { landscape: "right", portrait: "right", align: "start" };

/** A camera's own settings, each it lacks at its default. A size or a background saved
 * before 2026.11.14-b16 is left out: neither is used, and both are dropped when the
 * camera is next saved. */
export function controlsAt(own?: Partial<ControlsAt> & { size?: unknown; opacity?: unknown }): ControlsAt {
  const { size: _size, opacity: _opacity, ...rest } = own ?? {};
  return { ...CONTROLS_AT, ...rest };
}

/** Where along its edge, as CSS justify-content. */
export const alignOf = (at: ControlsAt) => (at.align === "center" ? "center" : `flex-${at.align}`);

/** The most PTZ presets that stand in the bar as buttons of their own; a camera with more
 * has one PTZ button, which opens them out beside the bar. */
export const PRESETS_INLINE = 3;

/** The style guide's chip in numbers (pills.css: cm-chip), px: its height, its text, the
 * room at each end, its icon and the gap after it. Only for what is worked out and not
 * drawn: when the presets fold (foldPresets), and the Cameras page's small preview. */
export const CHIP = { height: 22, font: 10, pad: 10, gap: 4, icon: 14 };
/** A letter's width, of the text's size: capitals, spaced as the guide's. An estimate, as
 * nothing is measured: it decides only when the presets fold. */
const LETTER = 0.72;
/** Room over a camera, px (full.ts, edges.module.css): between chips, around the bar, and
 * at each end of its edge, where a chip's height keeps the first button clear of the
 * frame, so a finger doesn't miss it for the one below (owner, 2026-11-26). Between
 * chips is more than the guide's rows have: each chip's tap area reaches half-way to the
 * next, and a finger needs the room. */
export const ROOM = { between: 10, around: 7, end: 22 };

const chipWidth = (name: string) => 2 * CHIP.pad + CHIP.icon + CHIP.gap + name.length * LETTER * CHIP.font;

/** Whether a bar's PTZ presets go behind one PTZ button: always when there are more than
 * PRESETS_INLINE, else when the chips (`names`: the card's own buttons and the camera's
 * controls, then the presets) don't fit along `edge` of a place w x h px. That is all that
 * gives way: the chips always keep their names, on a phone too, as a name is more to
 * hit than an icon (owner, 2026-11-26). A bar still too long wraps. */
export function foldPresets(place: [number, number], edge: Edge, names: string[], presets: string[]): boolean {
  if (presets.length > PRESETS_INLINE) return true;
  if (!presets.length) return false;
  const all = [...names, ...presets];
  const along = edge === "top" || edge === "bottom";
  // along the top or foot: side by side in the width; down a side: one under another
  const run = along ? all.reduce((sum, n) => sum + chipWidth(n), 0) : all.length * CHIP.height;
  return run + (all.length - 1) * ROOM.between + 2 * ROOM.end > (along ? place[0] : place[1]);
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

/** The chips as CSS custom properties, for the Cameras page's preview of a screen drawn
 * `scale` of its size (edges.module.css). The card draws the guide's own chips. */
export function previewStyle(at: ControlsAt, scale: number): Record<string, string> {
  const px = (n: number) => `${Math.round(n * scale * 100) / 100}px`;
  return {
    "--cm-chip-height": px(CHIP.height),
    "--cm-chip-font": px(CHIP.font),
    "--cm-chip-pad": px(CHIP.pad),
    "--cm-chip-gap": px(CHIP.gap),
    "--cm-chip-icon": px(CHIP.icon),
    "--cm-chip-between": px(ROOM.between),
    "--cm-chip-around": px(ROOM.around),
    "--cm-chip-end": px(ROOM.end),
    "--cm-chip-align": alignOf(at),
  };
}
