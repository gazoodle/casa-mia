/** A camera's controls (a gate, a light) and how they are shown on a commander's full
 * screen, in one place for the Cameras page and the Camera Commander card's full screen. */

export type Control = { entity: string; name?: string; icon?: string };

export type Edge = "top" | "bottom" | "left" | "right";
export const EDGES: Edge[] = ["top", "bottom", "left", "right"];

/** Along its edge: left or top, the middle, right or bottom (as a sections view's badges). */
export type Align = "start" | "center" | "end";
export type PillSize = "small" | "medium" | "large";

/** The edge for each shape of screen, where along it, the pills' size and how solid their
 * background is (%); a camera without its own takes these. */
export type ControlsAt = { landscape: Edge; portrait: Edge; align: Align; size: PillSize; opacity: number };
export const CONTROLS_AT: ControlsAt = { landscape: "bottom", portrait: "bottom", align: "center", size: "medium", opacity: 60 };

/** A pill's height in CSS px on the screen; its text, icon and gaps scale with it. */
export const PILL_HEIGHT: Record<PillSize, number> = { small: 40, medium: 56, large: 72 };

export function controlsAt(own?: Partial<ControlsAt>): ControlsAt {
  return { ...CONTROLS_AT, ...own };
}

/** The pills' look as CSS custom properties, for the card and the page's preview alike;
 * `scale` shrinks them for a preview drawn smaller than a screen. */
export function controlsStyle(at: ControlsAt, scale = 1): Record<string, string> {
  return {
    "--cm-pill-height": `${PILL_HEIGHT[at.size] * scale}px`,
    "--cm-pill-alpha": `${at.opacity}%`,
    "--cm-pill-align": at.align === "center" ? "center" : `flex-${at.align}`,
  };
}
