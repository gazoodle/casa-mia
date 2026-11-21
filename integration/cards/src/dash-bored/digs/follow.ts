// Digs' tour: when nobody has touched the page for a minute, the view follows one of the
// household about the house, and the imp while he is at his prank. When the one followed
// gets where they were going, or stands still while somebody else sets off, it goes over
// to somebody on the move. The tip says whom it follows. A touch, the wheel or a key
// hands the view back at once. A frame is drawn only while there is
// somewhere to move the view to: on a wall tablet it is otherwise still.
// ponytail: always on, on the page only, after IDLE. The options (BACKLOG: Digs, options
// for what moves by itself) turn it off, put it on a dashboard's card, or change the wait.

const IDLE = 60_000; // ms: no touch for this long and the view is the tour's again (owner, 2026-11-20: a minute, so that it is clear when it is touring)
const EASE = 400; // ms: about how far behind the one followed the view keeps

/** What the tour needs of the element it is on. */
type Host = {
  scroller(): HTMLElement | null | undefined;
  block(): number; // px
  instead(was: ReturnType<typeof setTimeout> | undefined, ms: number, then: () => void): ReturnType<typeof setTimeout> | undefined;
  able(): boolean;
  /** Where the view is to be, across in blocks, and whether that is moving: the imp's prank, or the one followed. */
  target(who: string): { x: number; moving: boolean } | undefined;
  pick(not: string): string | undefined;
  requestUpdate(): void; // the tour began or ended: the tip says so
};

export class Tour {
  private _on = false;
  private _who = ""; // whom the view follows
  private _idle?: ReturnType<typeof setTimeout>;
  private _frame = 0;
  private _last = 0; // ms: when the view was last moved, for the next frame's share of the way
  private _host: Host;

  constructor(host: Host) {
    this._host = host;
  }

  /** Somebody touched the page, or it has just been opened: the view is theirs until IDLE has passed with no touch. */
  touched = () => {
    if (this._on) this._host.requestUpdate();
    this._on = false;
    this._halt();
    this._idle = this._host.instead(this._idle, IDLE, () => {
      this._on = this._host.able();
      this._who = this._host.pick("") ?? "";
      this._host.requestUpdate();
      this.kick();
    });
  };

  /** Whom the view follows while it is touring, by their id ("" for nobody yet); undefined while the view is the viewer's. */
  get following() {
    return this._on ? this._who : undefined;
  }

  /** The element has left the page. Its own timers go with it. */
  stop() {
    this._on = false;
    this._halt();
  }

  /** The one followed has got where they were going: over to somebody else on the move. */
  arrived(id: string) {
    if (!this._on || id !== this._who) return;
    this._who = this._host.pick(id) ?? id;
    this.kick();
  }

  /** The imp has begun a prank: the view goes to him, even in the minute after a touch
   * (owner, 2026-11-20: "always track the imp if he's up to no good"). A touch during the
   * prank hands the view back as ever. */
  imp() {
    if (!this._host.able()) return;
    if (!this._on) this._host.requestUpdate();
    this._on = true;
    this.kick();
  }

  /** Somebody set off: the view goes over to them if the one it follows is standing still. */
  setOff(id: string) {
    if (!this._on || id === this._who || this._host.target(this._who)?.moving) return;
    this._who = id;
    this.kick();
  }

  /** Something in the world changed (somebody set off, the imp turned up): the view catches up. */
  kick() {
    if (!this._on || this._frame) return;
    if (!this._host.target(this._who)) this._who = this._host.pick("") ?? "";
    this._frame = requestAnimationFrame(this._move);
  }

  private _halt() {
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    this._last = 0;
  }

  /** One frame: the view goes part of the way to the one followed, centred on them, and
   * stops asking for frames once it is there and they are standing still. */
  private _move = (t: number) => {
    this._frame = 0;
    const el = this._host.scroller(), aim = this._host.target(this._who);
    if (!el || !aim || !this._on) return void (this._last = 0);

    const goal = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, (aim.x + 0.5) * this._host.block() - el.clientWidth / 2));
    const gap = goal - el.scrollLeft;
    const dt = this._last ? t - this._last : 16;
    this._last = t;
    // At least a pixel a frame: a browser that keeps the scroll in whole pixels would otherwise stop short.
    const by = gap * (1 - Math.exp(-dt / EASE));
    el.scrollLeft += Math.abs(by) < 1 ? Math.max(-1, Math.min(1, gap)) : by;

    if (aim.moving || Math.abs(gap) > 1) this._frame = requestAnimationFrame(this._move);
    else this._last = 0;
  };
}
