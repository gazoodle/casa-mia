/** A camera's controls (a gate, a light) and the edge of a full screen they go along, in
 * one place for the Cameras page and the Camera Commander card's full screen. */

export type Control = { entity: string; name?: string; icon?: string };

export type Edge = "top" | "bottom" | "left" | "right";
export const EDGES: Edge[] = ["top", "bottom", "left", "right"];

/** The edge for each shape of screen; a camera without its own takes these. */
export type ControlsAt = { landscape: Edge; portrait: Edge };
export const CONTROLS_AT: ControlsAt = { landscape: "bottom", portrait: "bottom" };

export function controlsAt(own?: Partial<ControlsAt>): ControlsAt {
  return { ...CONTROLS_AT, ...own };
}
