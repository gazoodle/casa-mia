/** A camera's controls (a gate, a light) and how they are shown on a commander's full
 * screen, in one place for the Cameras page and the Camera Commander card's full screen. */

export type Control = { entity: string; name?: string; icon?: string };

export type Edge = "top" | "bottom" | "left" | "right";
export const EDGES: Edge[] = ["top", "bottom", "left", "right"];

/** Along its edge: left or top, the middle, right or bottom (as a sections view's badges). */
export type Align = "start" | "center" | "end";

/** The edge for each shape of screen, where along it, the pills' size (their height in
 * CSS px on the screen; their text, icon and gaps scale with it) and how solid their
 * background is (%); a camera without its own takes these. */
export type ControlsAt = { landscape: Edge; portrait: Edge; align: Align; size: number; opacity: number };
export const CONTROLS_AT: ControlsAt = { landscape: "bottom", portrait: "bottom", align: "center", size: 56, opacity: 60 };

/** The sizes the page's slider offers. Under 44 px is small for a finger. */
export const PILL_SIZES = { min: 24, max: 96, step: 8 };

/** The three sizes there were before 2026.11.7, saved by name: read as their heights. */
const NAMED: Record<string, number> = { small: 40, medium: 56, large: 72 };

export function controlsAt(own?: Partial<Omit<ControlsAt, "size">> & { size?: number | string }): ControlsAt {
  const at = { ...CONTROLS_AT, ...own };
  return { ...at, size: typeof at.size === "number" ? at.size : (NAMED[at.size] ?? CONTROLS_AT.size) };
}

/** The pills' look as CSS custom properties, for the card and the page's preview alike;
 * `scale` shrinks them for a preview drawn smaller than a screen. */
export function controlsStyle(at: ControlsAt, scale = 1): Record<string, string> {
  return {
    "--cm-pill-height": `${at.size * scale}px`,
    "--cm-pill-alpha": `${at.opacity}%`,
    "--cm-pill-align": at.align === "center" ? "center" : `flex-${at.align}`,
  };
}
