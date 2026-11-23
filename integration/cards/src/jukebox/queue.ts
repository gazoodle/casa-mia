// The queue of one group, in the big player: tap a song to play it, drag it by its handle
// to move it, or take it out. Everything is asked of Jukebox, and after each change the
// speaker is asked what the queue now is, so what is shown is the speaker's and not a guess.
// The queue is asked for again when the house's music says its size or the song has
// changed, never on a timer.
import { LitElement, css, html, nothing } from "lit";
import { type Group, type Song, mmss, queue, reason } from "./common.ts";
import { Busy, icon, shared } from "./parts.ts";

export const QUEUE = "casa-mia-jukebox-queue";
/** Every row's height in px: a drag is measured in rows. */
const ROW = 56;

export class Queue extends LitElement {
  static properties = { group: { attribute: false }, _songs: { state: true }, _total: { state: true }, _why: { state: true }, _drag: { state: true } };
  hass!: { connection?: any; [key: string]: any };
  group?: Group;
  /** Ask Jukebox for something; true when it was done. The big player's own, so that a
   * refusal is said on the player. */
  do!: (action: string, data: object) => Promise<boolean>;
  _songs?: Song[];
  _total = 0;
  _why?: string;
  /** The row being dragged: where it was, where it would land, and how far it has moved. */
  _drag?: { from: number; to: number; y: number; dy: number };
  private _asked = 0;
  private _busy = new Busy(this);

  protected willUpdate(changed: Map<string, unknown>) {
    const was = changed.get("group") as Group | undefined;
    const now = this.group;
    if (changed.has("group") && now && (!was || was.id !== now.id || was.queue_size !== now.queue_size || was.queue_position !== now.queue_position || was.kind !== now.kind)) this._fetch();
  }

  private _fetch() {
    const asked = ++this._asked;
    queue(this.hass, this.group!.id).then(
      (found) => {
        // An answer that was overtaken is dropped, and a drag isn't redrawn under the finger
        // (the queue is asked for again when it ends).
        if (asked !== this._asked || this._drag) return;
        [this._songs, this._total, this._why] = [found.songs, found.total, undefined];
      },
      (err) => asked === this._asked && (this._why = reason(err)),
    );
  }

  /** Show the change at once, ask for it, then show what the speaker has, done or not. */
  private async _act(action: string, data: object, change: (songs: Song[]) => void, row = -1) {
    const songs = [...(this._songs ?? [])];
    change(songs);
    this._songs = songs;
    await this._busy.during(`row:${row}`, this.do(action, data));
    this._fetch();
  }

  private _down(e: PointerEvent, from: number) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this._drag = { from, to: from, y: e.clientY, dy: 0 };
  }

  private _moved = (e: PointerEvent) => {
    const drag = this._drag;
    if (!drag) return;
    const dy = e.clientY - drag.y;
    this._drag = { ...drag, dy, to: Math.max(0, Math.min(this._songs!.length - 1, drag.from + Math.round(dy / ROW))) };
  };

  private _up = () => {
    const drag = this._drag;
    if (!drag) return;
    this._drag = undefined;
    if (drag.to === drag.from) return this._fetch();
    this._act("queue_move", { value: drag.from + 1, to: drag.to + 1 }, (songs) => songs.splice(drag.to, 0, ...songs.splice(drag.from, 1)), drag.to);
  };

  render() {
    const { group, _songs: songs, _drag: drag } = this;
    if (!group) return nothing;
    if (!songs) return html`<p class="empty">${this._why ? `The queue couldn't be read: ${this._why}` : "Asking the speaker for its queue…"}</p>`;
    if (!songs.length) return html`<p class="empty">The queue is empty. Add something from the favourites.</p>`;
    // The song that is playing, when it is the queue that plays.
    const now = group.kind === "queue" ? group.queue_position : null;
    return html`${this._why ? html`<p class="empty">The queue couldn't be read again: ${this._why}</p>` : nothing}
      ${songs.map((song, i) => {
        // While one is dragged, the rows it passes move aside to show where it would land.
        const shift = !drag ? 0 : i === drag.from ? drag.dy : drag.from < i && i <= drag.to ? -ROW : drag.to <= i && i < drag.from ? ROW : 0;
        return html`<div class="row ${i + 1 === now ? "now" : ""} ${drag?.from === i ? "held" : ""} ${this._busy.on(`row:${i}`)}" style="transform:translateY(${shift}px)">
          <span class="handle" @pointerdown=${(e: PointerEvent) => this._down(e, i)} @pointermove=${this._moved} @pointerup=${this._up} @pointercancel=${this._up}>${icon("drag")}</span>
          <button class="t" @click=${() => this._busy.during(`row:${i}`, this.do("queue_play", { value: i + 1 }))} aria-label="Play ${song.title}"><b>${song.title}</b><small>${song.artist}</small></button>
          <span class="len">${i + 1 === now ? icon("volume") : song.duration ? mmss(song.duration) : nothing}</span>
          <button class="ib" @click=${() => this._act("queue_remove", { value: i + 1 }, (all) => all.splice(i, 1))} aria-label="Take ${song.title} out of the queue">${icon("close")}</button>
        </div>`;
      })}
      ${this._total > songs.length ? html`<p class="empty">and ${this._total - songs.length} more, which aren't shown</p>` : nothing}`;
  }

  static styles = [
    shared,
    css`
      :host { display: block; }
      .empty { padding: 28px 18px; text-align: center; color: var(--muted); overflow-wrap: anywhere; }
      .row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto 42px; align-items: center; gap: 4px; height: ${ROW}px; padding: 0 4px; border-radius: 14px; transition: transform 0.15s; }
      .row.now { background: rgb(255 255 255 / 9%); }
      .row.held { position: relative; z-index: 2; background: rgb(255 255 255 / 18%); box-shadow: 0 8px 24px rgb(0 0 0 / 50%); transition: none; }
      /* The handle takes the finger for itself, so a drag moves the song and not the list. */
      .handle { display: grid; place-items: center; height: 100%; color: var(--muted); cursor: grab; touch-action: none; }
      .t { display: grid; grid-template-columns: minmax(0, 1fr); align-self: stretch; align-content: center; min-width: 0; }
      .t b, .t small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .t small { color: var(--muted); }
      .len { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
      .len svg { width: 18px; height: 18px; color: #fff; }
      .ib { color: var(--muted); }
    `,
  ];
}
