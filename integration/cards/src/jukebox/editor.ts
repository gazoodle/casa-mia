// A wide screen's way to put a Sonos playlist, or the queue, together: the list on one
// side, and beside it Search and Browse. A song or an album is carried across, by resting
// a finger on it until it lifts as the players are, and dropped where it is to go; + adds
// it to the end. The list itself is the big player's own (queue.ts), so its songs are
// moved and taken out as they are there. Everything is asked of Jukebox.
import { LitElement, css, html, nothing } from "lit";
import { type Hass } from "../ha.ts";
import { type Favourite, type House, ask, follow, groupOf, names, reason } from "./common.ts";
import { type Queue } from "./queue.ts";
import { Busy, EDGE, art, icon, shared } from "./parts.ts";

export const EDITOR = "casa-mia-jukebox-editor";

/** Open the editor over everything, for the queue of the group `room` is in or, given
 * one, for a Sonos playlist. `done` is called when it is closed. */
export function edit(hass: Hass, room: string, playlist: Favourite | undefined, done: () => void): void {
  document.querySelector(EDITOR)?.remove();
  document.body.append(Object.assign(document.createElement(EDITOR), { hass, room, playlist, done }));
}

export class Editor extends LitElement {
  static properties = { room: {}, playlist: { attribute: false }, _house: { state: true }, _why: { state: true }, _lift: { state: true }, _mark: { state: true }, _count: { state: true }, _stamp: { state: true }, _toast: { state: true } };
  hass!: Hass;
  room = "";
  /** The Sonos playlist being put together; none for the queue. */
  playlist?: Favourite;
  done: () => void = () => {};
  _house?: House;
  _why?: string;
  /** The thing being carried, and where the finger is. */
  _lift?: { item: Favourite; x: number; y: number };
  /** Before which song it would land, counted from 0; none while it isn't over the list. */
  _mark?: number;
  _count?: number;
  _stamp = 0;
  _toast = "";
  private _off?: () => void;
  private _fade?: ReturnType<typeof setTimeout>;
  private _frame = 0;
  private _busy = new Busy(this);

  connectedCallback() {
    super.connectedCallback();
    this._off = follow(this.hass.connection, (house, why) => ([this._house, this._why] = [house, why]));
    window.addEventListener("keydown", this._key);
    // A finger that moves scrolls a list, unless it is carrying something. Only a
    // listener that isn't passive may say so.
    this.addEventListener("touchmove", this._touch, { passive: false });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._off?.();
    window.removeEventListener("keydown", this._key);
    this.removeEventListener("touchmove", this._touch);
    clearTimeout(this._fade);
    cancelAnimationFrame(this._frame);
    this.done();
  }

  private _key = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopImmediatePropagation(); // the player under this one stays
    this.remove();
  };

  private _touch = (e: Event) => {
    if (this._lift) e.preventDefault();
  };

  private _say(text: string) {
    this._toast = text;
    clearTimeout(this._fade);
    this._fade = setTimeout(() => (this._toast = ""), 3500);
  }

  private _do = (action: string, data: object, key = action): Promise<boolean> =>
    this._busy.during(key, ask(this.hass, action, this.room, data)).then(
      () => (this._stamp++, true),
      (err) => (this._say(reason(err)), false),
    );

  /** Add a thing found: to be song number `to`, or at the end without one. */
  private async _add(item: Favourite, to?: number) {
    const where = to ? { to } : {};
    const key = `fav:${item.media_content_id}`;
    const added = this.playlist
      ? await this._do("playlist_add", { playlist: this.playlist.media_content_id, media_content_id: item.media_content_id, name: item.title.slice(0, 60), ...where }, key)
      : await this._do("queue_add", { media_content_id: item.media_content_id, media_content_type: item.media_content_type, ...where }, key);
    if (added) this._say(to ? `Added as number ${to}: ${item.title}` : `Added to the end: ${item.title}`);
  }

  private get _list() {
    return this.renderRoot.querySelector<Queue>("casa-mia-jukebox-queue");
  }

  /** Where the thing carried would land: only while the finger is over the list. */
  private _place() {
    const [lift, list] = [this._lift, this._list];
    const box = this.renderRoot.querySelector(".list .scroll")?.getBoundingClientRect();
    if (!lift || !list || !box) return;
    const over = lift.x >= box.left && lift.x <= box.right && lift.y >= box.top && lift.y <= box.bottom;
    this._mark = over ? list.at(lift.y) : undefined;
  }

  /** Each frame of a carry: near the top or bottom of the list it scrolls, faster the
   * nearer, so a thing can be carried to a place that was out of sight. */
  private _edge = () => {
    const lift = this._lift;
    const scroll = this.renderRoot.querySelector(".list .scroll");
    if (!lift || !scroll) return;
    const box = scroll.getBoundingClientRect();
    const inside = lift.x >= box.left && lift.x <= box.right;
    const by = !inside ? 0 : lift.y < box.top + EDGE ? -Math.ceil((box.top + EDGE - lift.y) / 5) : lift.y > box.bottom - EDGE ? Math.ceil((lift.y - box.bottom + EDGE) / 5) : 0;
    const was = scroll.scrollTop;
    if (by) scroll.scrollTop = was + by;
    if (scroll.scrollTop !== was) this._place();
    this._frame = requestAnimationFrame(this._edge);
  };

  private _lifted = (e: CustomEvent) => {
    this._lift = e.detail;
    this._place();
    this._frame = requestAnimationFrame(this._edge);
  };

  private _carried = (e: CustomEvent) => {
    if (!this._lift) return;
    this._lift = { ...this._lift, ...e.detail };
    this._place();
  };

  private _let = (drop: boolean) => {
    const [lift, mark] = [this._lift, this._mark];
    cancelAnimationFrame(this._frame);
    this._lift = this._mark = undefined;
    if (drop && lift && mark !== undefined) this._add(lift.item, mark + 1);
  };

  render() {
    const house = this._house;
    const group = house && groupOf(house, this.room);
    const lift = this._lift;
    const what = this.playlist ? this.playlist.title : group && house ? `The queue in ${names(house, group)}` : "The queue";
    const songs = this._count === undefined ? "" : this._count === 1 ? "1 song" : `${this._count} songs`;
    return html`<div class="page ${lift ? "carrying" : ""}">
      <header>
        <button class="ib" @click=${() => this.remove()} aria-label="Close the editor">${icon("back")}</button>
        <h1>${what}<small>Rest a finger on a song or an album on the right until it lifts, then drag it to where it should go. + adds it to the end.</small></h1>
      </header>
      ${group
        ? html`<div class="cols">
            <section class="list">
              <h2>${this.playlist ? "In this playlist" : "In the queue"}<small>${songs}</small></h2>
              <div class="scroll"><casa-mia-jukebox-queue .hass=${this.hass} .group=${group} .playlist=${this.playlist?.media_content_id} .do=${this._do} .stamp=${this._stamp} .mark=${this._mark} @jb-listed=${(e: CustomEvent) => (this._count = e.detail)}></casa-mia-jukebox-queue></div>
            </section>
            <section class="find">
              <h2>Search and browse</h2>
              <div class="scroll">
                <casa-mia-jukebox-find carry .hass=${this.hass} .room=${group.id} .waiting=${(key: string) => this._busy.on(key)} .changes=${this._busy.changes} @jb-choose=${(e: CustomEvent) => this._add(e.detail)} @jb-lift=${this._lifted} @jb-carry=${this._carried} @jb-drop=${() => this._let(true)} @jb-cancel=${() => this._let(false)}></casa-mia-jukebox-find>
              </div>
            </section>
          </div>`
        : html`<p class="none">${this._why ?? (house ? "That room isn't answering." : "Asking Home Assistant what is playing…")}</p>`}
      ${lift ? html`<div class="ghost" style="transform:translate(${lift.x + 14}px,${lift.y - 28}px)">${art(this.hass, lift.item.picture, lift.item.title)}<b>${lift.item.title}</b></div>` : nothing}
      ${this._toast ? html`<div class="toast" role="status">${this._toast}</div>` : nothing}
    </div>`;
  }

  static styles = [
    shared,
    css`
      :host { position: fixed; inset: 0; z-index: 1001; font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); color: #fff; --line: rgb(255 255 255 / 14%); --muted: rgb(255 255 255 / 60%); }
      .page { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; padding: max(14px, env(safe-area-inset-top)) 16px 16px; box-sizing: border-box; background: #171512; }
      .page.carrying { cursor: grabbing; }
      header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
      h1 { display: grid; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; min-width: 0; }
      h1 small { font-size: 13px; font-weight: 400; color: var(--muted); letter-spacing: 0; }
      .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; min-height: 0; }
      section { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; border-radius: 22px; background: #26231f; }
      h2 { display: flex; align-items: baseline; gap: 10px; margin: 0; padding: 14px 18px 10px; font-size: 15px; }
      h2 small { font-weight: 400; color: var(--muted); }
      .scroll { overflow: auto; overscroll-behavior: contain; padding: 0 6px 10px; }
      .carrying .list { outline: 2px dashed rgb(255 255 255 / 35%); outline-offset: -2px; }
      .none { color: var(--muted); }
      .ghost { position: fixed; left: 0; top: 0; z-index: 5; display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: center; gap: 10px; max-width: 300px; padding: 8px 14px 8px 8px; border-radius: 14px; background: #3a3630; box-shadow: 0 16px 40px rgb(0 0 0 / 60%); pointer-events: none; }
      .ghost .art { border-radius: 8px; }
      .ghost b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .toast { position: fixed; left: 50%; bottom: 26px; z-index: 6; transform: translateX(-50%); max-width: min(90vw, 520px); padding: 12px 18px; border-radius: 14px; background: #fff; color: #111; font-weight: 600; overflow-wrap: anywhere; }
    `,
  ];
}
