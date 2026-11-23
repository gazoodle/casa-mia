// Finding something to play, in the big player: one box that searches the music library
// and Spotify together, and below it, while the box is empty, what the speaker can play to
// browse through. A thing found is offered to the player (`jb-choose`), which asks where in
// the queue it should go. A source that can't be searched says why, beside the other's
// results.
import { LitElement, css, html, nothing } from "lit";
import { fire } from "../ha.ts";
import { type Favourite, type Source, browse, reason, search } from "./common.ts";
import { art, icon, shared } from "./parts.ts";

export const FIND = "casa-mia-jukebox-find";
/** How long after the last letter the search is made (ms), so that a word being typed
 * isn't searched for letter by letter. */
const PAUSE = 400;
/** One place being browsed: none of `items` and `why` while it is being asked for. */
type Place = { title: string; items?: Favourite[]; why?: string };

export class Find extends LitElement {
  static properties = { room: {}, changes: { type: Number }, _query: { state: true }, _found: { state: true }, _why: { state: true }, _trail: { state: true } };
  hass!: { connection?: any; hassUrl?: (path: string) => string; [key: string]: any };
  room = "";
  /** The class for a thing the player is waiting on a speaker for, and a count that
   * changes whenever that does, so the rows are drawn again. */
  waiting: (key: string) => string = () => "";
  changes = 0;
  _query = "";
  /** What the search found: none while it is being made. */
  _found?: Source[];
  _why?: string;
  /** The places opened, the top of what can be played first. */
  _trail: Place[] = [];
  private _typed?: ReturnType<typeof setTimeout>;
  private _asked = 0;

  connectedCallback() {
    super.connectedCallback();
    if (!this._trail.length) this._open();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._typed);
  }

  /** Open a place to browse: the top, or something that holds more. */
  private _open(at?: Favourite) {
    const place: Place = { title: at?.title ?? "Browse" };
    this._trail = [...this._trail, place];
    const fill = (more: Partial<Place>) => (this._trail = this._trail.map((p) => (p === place ? Object.assign(place, more) : p)));
    browse(this.hass, this.room, at).then(
      (found) => fill({ items: found.items }),
      (err) => fill({ why: reason(err) }),
    );
  }

  private _type(e: Event) {
    this._query = (e.target as HTMLInputElement).value;
    this._trail = this._trail.slice(0, 1);
    clearTimeout(this._typed);
    [this._found, this._why] = [undefined, undefined];
    const asked = ++this._asked; // whatever was being searched for is no longer wanted
    const query = this._query.trim();
    if (!query) return;
    this._typed = setTimeout(
      () =>
        search(this.hass, this.room, query).then(
          (found) => asked === this._asked && (this._found = found.sources),
          (err) => asked === this._asked && (this._why = reason(err)),
        ),
      PAUSE,
    );
  }

  private _clear() {
    const box = this.renderRoot.querySelector("input")!;
    box.value = "";
    box.dispatchEvent(new Event("input"));
    box.focus();
  }

  private _row(item: Favourite) {
    const choose = () => fire(this, "jb-choose", item);
    const more = item.can_expand;
    return html`<div class="row ${this.waiting(`fav:${item.media_content_id}`)}">
      <button class="t" ?disabled=${!more && !item.can_play} @click=${() => (more ? this._open(item) : choose())}>
        ${art(this.hass, item.picture, item.title)}
        <span><b>${item.title}</b>${item.by ? html`<small>${item.by}</small>` : nothing}</span>
        ${more ? icon("chevron") : nothing}
      </button>
      ${item.can_play ? html`<button class="ib" @click=${choose} aria-label="Play ${item.title}, or add it to the queue">${icon("plus")}</button>` : nothing}
    </div>`;
  }

  private _results() {
    if (this._why) return html`<p class="note">The search couldn't be made: ${this._why}</p>`;
    if (!this._found) return html`<p class="note">Searching the music library and Spotify…</p>`;
    return this._found.map((source) => {
      const folders = [...new Set(source.items.map((i) => i.folder))];
      return html`<h3>${source.name}</h3>
        ${source.why ? html`<p class="note">${source.name} couldn't be searched: ${source.why}</p>` : source.items.length ? nothing : html`<p class="note">Nothing found.</p>`}
        ${folders.map((folder) => html`<h4>${folder}</h4>${source.items.filter((i) => i.folder === folder).map((i) => this._row(i))}`)}`;
    });
  }

  private _browsing() {
    const place = this._trail[this._trail.length - 1];
    if (!place) return nothing;
    return html`<div class="where">
        ${this._trail.length > 1 ? html`<button class="ib" @click=${() => (this._trail = this._trail.slice(0, -1))} aria-label="Back">${icon("back")}</button>` : nothing}
        <h3>${place.title}</h3>
      </div>
      ${place.why
        ? html`<p class="note">This couldn't be opened: ${place.why}</p>`
        : !place.items
          ? html`<p class="note">Asking the speaker…</p>`
          : place.items.length
            ? place.items.map((i) => this._row(i))
            : html`<p class="note">There is nothing here.</p>`}`;
  }

  render() {
    // A place opened from the results is shown until it is left; then the results again.
    const results = this._query.trim() && this._trail.length < 2;
    return html`<label class="box">
        ${icon("search")}
        <input type="text" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="A song, an album or an artist" aria-label="Search the music library and Spotify" @input=${this._type} />
        ${this._query ? html`<button class="ib" @click=${this._clear} aria-label="Clear the search">${icon("close")}</button>` : nothing}
      </label>
      ${results ? this._results() : this._browsing()}`;
  }

  static styles = [
    shared,
    css`
      :host { display: block; padding: 0 6px; }
      .box { display: flex; align-items: center; gap: 8px; margin: 2px 4px 10px; padding: 0 6px 0 12px; border-radius: 14px; border: 1px solid var(--line); background: rgb(255 255 255 / 8%); color: var(--muted); }
      .box:focus-within { border-color: #fff; }
      .box svg { width: 20px; height: 20px; flex: none; }
      /* 16px, or a phone zooms the page in when the box is tapped. */
      .box input { flex: 1; min-width: 0; height: 46px; border: 0; outline: 0; background: none; color: #fff; font: inherit; font-size: 16px; }
      .box .ib { width: 36px; height: 36px; }
      h3 { margin: 14px 6px 4px; font-size: 15px; }
      h4 { margin: 12px 6px 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
      .where { display: flex; align-items: center; gap: 4px; min-height: 42px; }
      .where h3 { flex: 1; min-width: 0; margin: 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .note { margin: 0; padding: 14px 8px; color: var(--muted); overflow-wrap: anywhere; }
      .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 2px; border-radius: 14px; }
      .t { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 56px; padding: 6px; }
      .t .art { border-radius: 8px; }
      .t span { display: grid; grid-template-columns: minmax(0, 1fr); }
      .t b, .t small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .t small, .t > svg, .row > .ib { color: var(--muted); }
    `,
  ];
}
