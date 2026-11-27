// A closer look at the main camera's full screen (card.ts, `_full`): two fingers pinch the
// live picture about the point between them, the mouse wheel enlarges it about the pointer,
// and one finger or a mouse drag moves it while it is enlarged. It is the picture enlarged
// by the browser, not the camera's lens, which is "zoom" in the commander (full.ts).
// docs/design/commander-zoom.md has the decisions.
import { html, nothing } from "lit";
import type { Channel } from "../ha.ts";
import { STEP, WHOLE, grip, zoomed, type View } from "../zoom.ts";

/** How long an enlarged picture stays so after the last touch: a lease (decided 1). */
export const CLOSER_MS = 60_000;
/** The closest: this many screen pixels to one video pixel of the largest channel. */
export const MOST_PX = 4;
/** A finger that travels further than this (CSS px) is dragging, not tapping. */
const SLOP = 8;

/** For a camera's channels shown whole in `box` (CSS px) on a screen of `ratio` device
 * pixels to one: the most it can be enlarged, and the picture's size in the box at 1.
 * With no channel's size known: MOST_PX times, and the picture taken to fill the box. */
export function closerLimits(channels: Channel[], box: [number, number], ratio: number): { most: number; pic: [number, number] } {
  const [, vw, vh] = channels.reduce((a, b) => (b[1] > a[1] ? b : a), ["", 0, 0]);
  if (!vw || !vh) return { most: MOST_PX, pic: box };
  const k = Math.min(box[0] / vw, box[1] / vh); // CSS px to a video pixel, shown whole
  return { most: Math.max(1, MOST_PX / (k * ratio)), pic: [vw * k, vh * k] };
}

export class Closer {
  view: View = WHOLE;
  /** The closest it has been since it was last whole: what the channel is chosen for,
   * so a pinch in and out doesn't change channels back and forth. */
  asked = 1;
  private fingers = new Map<number, [number, number]>();
  private travelled = 0;
  private dragged = false;
  private gone: ReturnType<typeof setTimeout> | undefined;
  // Fields set in the constructor, not parameter properties: Node's type stripping (the
  // cards' tests) can't run those.
  private wake: () => void; // redraw the card
  private picture: () => HTMLElement | null; // the .closer element now
  private limits: (box: [number, number]) => { most: number; pic: [number, number] };

  constructor(wake: () => void, picture: () => HTMLElement | null, limits: (box: [number, number]) => { most: number; pic: [number, number] }) {
    this.wake = wake;
    this.picture = picture;
    this.limits = limits;
  }

  label = () => `${this.view.s.toFixed(1)}×`;

  /** Write the view to the picture's element. Called after every change, and by the
   * card after every redraw, so a new element can never show another's view. */
  show(): this {
    const el = this.picture();
    const { s, x, y } = this.view;
    if (el) el.style.transform = s === 1 ? "" : `translate(${x}px, ${y}px) scale(${s})`;
    return this;
  }

  /** Back to the whole picture; redraws the card only if that changed anything. */
  whole(): this {
    clearTimeout(this.gone);
    this.gone = undefined;
    this.fingers.clear();
    const was = this.view.s !== 1;
    this.view = WHOLE;
    this.asked = 1;
    this.show();
    if (was) this.wake();
    return this;
  }

  /** Whether a click on the zone is the card's, to go back from the full screen: not
   * after a drag or a pinch, and while enlarged it goes back to the whole picture. */
  tap(): boolean {
    if (this.dragged) return false;
    if (this.view.s === 1) return true;
    this.whole();
    return false;
  }

  down = (e: PointerEvent) => {
    // The first finger down starts a new gesture: a tap until it travels or a second joins.
    if (!this.fingers.size) {
      this.travelled = 0;
      this.dragged = false;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.fingers.set(e.pointerId, [e.clientX, e.clientY]);
  };

  move = (e: PointerEvent) => {
    if (!this.fingers.has(e.pointerId)) return; // a mouse passing over, no button down
    const [wasX, wasY, was] = grip([...this.fingers.values()]);
    this.fingers.set(e.pointerId, [e.clientX, e.clientY]);
    const [x, y, apart] = grip([...this.fingers.values()]);

    this.travelled += Math.hypot(x - wasX, y - wasY);
    if (this.travelled > SLOP || this.fingers.size > 1) this.dragged = true;
    this.turn(e.currentTarget as HTMLElement, was && apart ? apart / was : 1, x, y, x - wasX, y - wasY);
  };

  up = (e: PointerEvent) => {
    this.fingers.delete(e.pointerId);
  };

  wheel = (e: WheelEvent) => {
    e.preventDefault(); // the page behind must not scroll
    this.turn(e.currentTarget as HTMLElement, e.deltaY < 0 ? STEP : 1 / STEP, e.clientX, e.clientY);
  };

  /** One change of view: the limits for the zone's box now, the new view, `asked`, the
   * transform, the lease renewed (cleared at s === 1), and a redraw if the chip changed. */
  private turn(zone: HTMLElement, by: number, x: number, y: number, dx = 0, dy = 0) {
    const r = zone.getBoundingClientRect();
    const { most, pic } = this.limits([r.width, r.height]);
    // The chip's text, or none while whole: "1.0×" at 1.03 still needs the chip drawn.
    const chip = () => this.view.s !== 1 && this.label();
    const before = chip();

    this.view = zoomed(this.view, by, x - r.left - r.width / 2, y - r.top - r.height / 2, dx, dy, r.width, r.height, most, pic[0], pic[1]);
    this.asked = this.view.s === 1 ? 1 : Math.max(this.asked, this.view.s);
    this.show();

    // The lease: renewed by every turn that leaves it enlarged (global setTimeout, so the
    // test runs in Node).
    clearTimeout(this.gone);
    this.gone = this.view.s === 1 ? undefined : setTimeout(() => this.whole(), CLOSER_MS);
    if (chip() !== before) this.wake();
  }
}

/** The chip that says the picture is enlarged; a tap goes back to the whole picture. */
export function closerChip(closer: Closer) {
  if (closer.view.s === 1) return nothing;
  return html`<button class="closer-chip cm-chip cm-on" title="The picture is enlarged ${closer.label()}: tap for the whole picture" @click=${() => closer.whole()}>
    <ha-icon icon="mdi:magnify"></ha-icon>
    <span>${closer.label()}</span>
  </button>`;
}
