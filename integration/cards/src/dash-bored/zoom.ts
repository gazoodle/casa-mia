// A closer look at a photograph: two fingers pinch it, one drags it, and a double tap or
// the wheel zooms. Home Assistant's page turns the browser's own zoom off, so the box
// takes the touches itself (touch-action: none, in styles.ts). The maths is shared (../zoom.ts).
import { STEP, WHOLE, grip, zoomed } from "../zoom.ts";

const MOST = 6; // times its size on the page
const TAP = 2.5; // a double tap goes this close, or back to the whole picture

// One photograph is open at a time, so its view and the fingers on it are kept here.
let view = WHOLE;
const fingers = new Map<number, [number, number]>();

function turn(box: HTMLElement, by: number, x: number, y: number, dx = 0, dy = 0) {
  const r = box.getBoundingClientRect();
  view = zoomed(view, by, x - r.left - r.width / 2, y - r.top - r.height / 2, dx, dy, r.width, r.height, MOST);
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
    const [wasX, wasY, was] = grip([...fingers.values()]);
    fingers.set(event.pointerId, [event.clientX, event.clientY]);
    const [x, y, apart] = grip([...fingers.values()]);
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
