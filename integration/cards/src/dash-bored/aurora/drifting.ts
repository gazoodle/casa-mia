// Moves what drifts over a season skin by drift.ts's model: seasons.ts draws a `.m` for
// each thing, a `.machine` and an empty `.heaps`, and this places them each frame and
// draws the heaps when they change. Aurora calls `over` after each time it draws itself,
// `shake` when a tile is touched, and `stop` when it leaves the page. The tiles on the
// screen and the bar are the model's ledges: they are measured when Aurora draws itself
// and when the page or the bar changes size, not each frame.
import { MOVES, begin, fit, outline, shake, step, tilt, type Field } from "./drift.ts";

const INSET = 22; // a ledge stops short of its tile's round corners
const ROOM = 56; // how tall the machine is
/** What a heap of each thing is filled with, and edged with. */
const HEAPS: Record<string, [string, string]> = { flake: ["#fff", "#cfe0f1"], leaf: ["#c9742a", "#8a4a17"], petal: ["#f8cfe0", "#e9a3c1"] };

export class Drifting {
  private _field?: Field;
  private _host?: HTMLElement;
  private _ledges: HTMLElement[] = [];
  private _ids = new WeakMap<Element, string>(); // each ledge's name in the model, by its element
  private _named = 0;
  private _sizes = new ResizeObserver(() => this._measure());
  private _watching = false;
  private _things: HTMLElement[] = [];
  private _machine: HTMLElement | null = null;
  private _heaps = new Map<string, SVGPathElement>();
  private _drawn: string[] = []; // each drawing's place as last set, so that one lying still is not set again
  private _frame = 0;
  private _last = 0; // ms: the frame before this one

  /** The decorations as they now are (`.season`, seasons.ts), or null if there are none, and what things can lie on top of: the first is the bar. */
  over(host: HTMLElement | null, ledges: HTMLElement[]): this {
    const glyph = host?.dataset.glyph ?? "";
    const move = MOVES[glyph];
    if (!host || !move) return this.stop();

    // Another skin's things, or the same ones drawn afresh, start again.
    const afresh = host !== this._host || move !== this._field?.move;
    if (afresh) {
      this._field = begin(move, Number(host.dataset.count), host.clientWidth, host.clientHeight, Date.now() | 0);
      this._things = [...host.querySelectorAll<HTMLElement>(".m")];
      this._machine = host.querySelector<HTMLElement>(".machine");
      this._drawn = [];
      host.querySelector(".heaps")?.replaceChildren();
      this._heaps.clear();
    }
    if (afresh || !this._watching) {
      this._watching = true;
      this._sizes.disconnect();
      for (const el of [host, ledges[0]]) if (el) this._sizes.observe(el);
    }
    [this._host, this._ledges] = [host, ledges];
    this._measure();

    // Somebody who asked for less motion has them where they are, still.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return this.stop()._paint();
    if (!this._frame) {
      this._last = 0;
      this._frame = requestAnimationFrame(this._tick);
    }
    return this;
  }

  /** A tile was touched: what was on it falls off. */
  shake(tile: Element | null | undefined): this {
    const id = tile && this._ids.get(tile);
    if (id && this._field) shake(this._field, id);
    return this;
  }

  stop(): this {
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    this._sizes.disconnect();
    this._watching = false;
    return this;
  }

  // The page's size, and where each ledge is on it.
  private _measure() {
    if (!this._field || !this._host?.isConnected) return;
    const page = this._host.getBoundingClientRect();
    const shelves = this._ledges.flatMap((el) => {
      const at = el.getBoundingClientRect();
      // Too narrow to hold anything, or so near the top of the page that the machine would have no room to stand on it.
      if (at.width < 4 * INSET || at.top - page.top < ROOM) return [];
      if (!this._ids.has(el)) this._ids.set(el, `l${++this._named}`);
      return [{ id: this._ids.get(el)!, from: at.left - page.left + INSET, to: at.right - page.left - INSET, top: at.top - page.top }];
    });
    fit(this._field, page.width, page.height, shelves);
  }

  private _tick = (now: number) => {
    step(this._field!, this._last ? (now - this._last) / 1000 : 0);
    this._last = now;
    this._paint();
    this._frame = requestAnimationFrame(this._tick);
  };

  private _set(i: number, el: HTMLElement | null | undefined, to: string) {
    if (!el || this._drawn[i] === to) return;
    this._drawn[i] = to;
    el.style.transform = to;
    el.style.visibility = to ? "visible" : "hidden";
  }

  // The heaps that changed, each one path: made when its ledge first has one, and gone with its ledge.
  private _heap() {
    const f = this._field!;
    const [fill, edge] = HEAPS[this._host!.dataset.glyph!] ?? ["#fff", "#ccc"];
    for (const id of f.changed) {
      const ledge = f.ledges.find((l) => l.id === id);
      let path = this._heaps.get(id);
      if (!ledge) {
        path?.remove();
        this._heaps.delete(id);
        continue;
      }
      if (!path) {
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", fill);
        path.setAttribute("stroke", edge);
        this._host!.querySelector(".heaps")?.append(path);
        this._heaps.set(id, path);
      }
      path.setAttribute("d", outline(ledge));
    }
    f.changed.clear();
  }

  private _paint(): this {
    const f = this._field!;
    f.motes.forEach((m, i) => this._set(i, this._things[i], m.state === "spare" ? "" : `translate(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px) rotate(${tilt(f, m).toFixed(2)}rad)`));
    if (f.changed.size) this._heap();

    // The machine stands on its ledge and faces the way it goes (it is drawn facing right, its wheels 6 from its foot), and its propeller turns while it flies.
    const t = f.tidy;
    this._set(f.motes.length, this._machine, t ? `translate(${t.x.toFixed(1)}px, ${(t.y - 50).toFixed(1)}px) scaleX(${t.dir})` : "");
    this._machine?.classList.toggle("flying", !!t && !t.driving);
    return this;
  }
}
