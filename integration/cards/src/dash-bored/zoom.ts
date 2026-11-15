// A closer look at a photograph: two fingers pinch it, one drags it, and a double tap or
// the wheel zooms. Home Assistant's page turns the browser's own zoom off, so the box
// takes the touches itself (touch-action: none, in styles.ts).

/** How a picture stands in its box: its scale, and how far it is moved from the middle, in px. */
export type View = { s: number; x: number; y: number };
export const WHOLE: View = { s: 1, x: 0, y: 0 };
const MOST = 6; // times its size on the page
const STEP = 1.2; // a notch of the wheel
const TAP = 2.5; // a double tap goes this close, or back to the whole picture

/** The view once it has been moved by (dx, dy) and zoomed `by` times about a point (fx, fy,
 * from the box's middle): what is under the fingers stays under them. The picture never
 * shrinks below its box (w × h) or leaves a gap at an edge of it. */
export function zoomed(v: View, by: number, fx: number, fy: number, dx: number, dy: number, w: number, h: number): View {
  const s = Math.min(MOST, Math.max(1, v.s * by));
  const k = s / v.s;
  const held = (at: number, most: number) => Math.min(most, Math.max(-most, at)) || 0;
  return { s, x: held(fx - (fx - v.x - dx) * k, ((s - 1) * w) / 2), y: held(fy - (fy - v.y - dy) * k, ((s - 1) * h) / 2) };
}

// One photograph is open at a time, so its view and the fingers on it are kept here.
let view = WHOLE;
const fingers = new Map<number, [number, number]>();

/** The middle of the fingers that are down, and how far apart two of them are. */
function grip(): [number, number, number] {
  const at = [...fingers.values()];
  const mid = (i: 0 | 1) => at.reduce((sum, p) => sum + p[i], 0) / at.length;
  return [mid(0), mid(1), at.length > 1 ? Math.hypot(at[0][0] - at[1][0], at[0][1] - at[1][1]) : 0];
}

function turn(box: HTMLElement, by: number, x: number, y: number, dx = 0, dy = 0) {
  const r = box.getBoundingClientRect();
  view = zoomed(view, by, x - r.left - r.width / 2, y - r.top - r.height / 2, dx, dy, r.width, r.height);
  (box.firstElementChild as HTMLElement).style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
  box.classList.toggle("near", view.s > 1);
}
const box = (event: Event) => event.currentTarget as HTMLElement;

/** The box's event handlers: a .zoom element whose one child is the picture. */
export const look = {
  /** A picture newly shown is shown whole. */
  whole() {
    view = WHOLE;
    fingers.clear();
  },
  down(event: PointerEvent) {
    box(event).setPointerCapture(event.pointerId);
    fingers.set(event.pointerId, [event.clientX, event.clientY]);
  },
  move(event: PointerEvent) {
    if (!fingers.has(event.pointerId)) return;
    const [wasX, wasY, was] = grip();
    fingers.set(event.pointerId, [event.clientX, event.clientY]);
    const [x, y, apart] = grip();
    turn(box(event), was && apart ? apart / was : 1, x, y, x - wasX, y - wasY);
  },
  up(event: PointerEvent) {
    fingers.delete(event.pointerId);
  },
  wheel(event: WheelEvent) {
    event.preventDefault(); // the page behind must not scroll
    turn(box(event), event.deltaY < 0 ? STEP : 1 / STEP, event.clientX, event.clientY);
  },
  twice(event: MouseEvent) {
    turn(box(event), view.s > 1 ? 1 / view.s : TAP, event.clientX, event.clientY);
  },
};
