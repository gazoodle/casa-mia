// The maths of a closer look at a picture: two fingers pinch it, one drags it, and the
// wheel enlarges it. Shared by Dash-Bored's photograph (dash-bored/zoom.ts) and the Camera
// Commander's full screen (commander/closer.ts), which each keep their own view and fingers.

/** How a picture stands in its box: its scale, and how far it is moved from the middle, in px. */
export type View = { s: number; x: number; y: number };
export const WHOLE: View = { s: 1, x: 0, y: 0 };
export const STEP = 1.2; // a notch of the wheel

/** The view once it has been moved by (dx, dy) and zoomed `by` times about a point (fx, fy,
 * from the box's middle): what is under the fingers stays under them. It is never more
 * than `most` times or smaller than its box (w × h), and the picture (pw × ph in the box,
 * shown whole) never leaves a gap at an edge of the box that it is larger than. */
export function zoomed(v: View, by: number, fx: number, fy: number, dx: number, dy: number, w: number, h: number, most: number, pw = w, ph = h): View {
  const s = Math.min(most, Math.max(1, v.s * by));
  const k = s / v.s;
  const held = (at: number, edge: number) => Math.min(edge, Math.max(-edge, at)) || 0;
  return { s, x: held(fx - (fx - v.x - dx) * k, Math.max(0, (s * pw - w) / 2)), y: held(fy - (fy - v.y - dy) * k, Math.max(0, (s * ph - h) / 2)) };
}

/** The middle of the fingers that are down (`at`, at least one), and how far apart two of them are. */
export function grip(at: [number, number][]): [number, number, number] {
  const mid = (i: 0 | 1) => at.reduce((sum, p) => sum + p[i], 0) / at.length;
  return [mid(0), mid(1), at.length > 1 ? Math.hypot(at[0][0] - at[1][0], at[0][1] - at[1][1]) : 0];
}
