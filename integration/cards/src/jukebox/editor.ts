// A wide screen's way to put a Sonos playlist, or the queue, together: the list on one
// side, and beside it Search and Browse. A tap on a song of the list chooses it: it is
// shown whole at the top (its cover, and its names in full, which a row cuts short), and
// a thing found is then put before it, after it or at the end. A thing found can also be
// carried across, by resting a finger on it until it lifts as the players are, and
// dropped where it is to go. A playlist can be sorted, a sort put back, and the songs
// that are in it twice taken out. The list itself is the big player's own (queue.ts).
// Everything is asked of Jukebox.
import { LitElement, css, html, nothing } from "lit";
import { type Hass } from "../ha.ts";
import { type Favourite, type House, type Song, ask, curates, favourites, follow, groupOf, mmss, names, reason } from "./common.ts";
import { type Pick, chooser, sent } from "./pick.ts";
import { type Queue } from "./queue.ts";
import { Busy, EDGE, Split, art, grips, icon, shared } from "./parts.ts";

export const EDITOR = "casa-mia-jukebox-editor";
const FROM: Record<string, string> = { library: "Music library", spotify: "Spotify", streamed: "A streaming service" };
const SORTS: [by: string, label: string, said: string][] = [
  ["title", "By title", "title"],
  ["artist", "By artist, then album", "artist"],
  ["album", "By album, in the album's own order", "album"],
];
type Sure = { warn: string; text: string; keep: string; go: string; run: () => void };

/** Open the editor over everything, for the queue of the group `room` is in or, given
 * one, for a Sonos playlist. `done` is called when it is closed. */
export function edit(hass: Hass, room: string, playlist: Favourite | undefined, done: () => void): void {
  document.querySelector(EDITOR)?.remove();
  document.body.append(Object.assign(document.createElement(EDITOR), { hass, room, playlist, done }));
}

export class Editor extends LitElement {
  static properties = { room: {}, playlist: { attribute: false }, _house: { state: true }, _why: { state: true }, _lift: { state: true }, _mark: { state: true }, _songs: { state: true }, _total: { state: true }, _sel: { state: true }, _stamp: { state: true }, _toast: { state: true }, _menu: { state: true }, _sorting: { state: true }, _confirm: { state: true }, _unsort: { state: true }, _zoom: { state: true }, _putting: { state: true }, _lists: { state: true } };
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
  /** The list as the speaker last gave it, and how many songs it has in all. */
  _songs: Song[] = [];
  _total?: number;
  /** The song that is chosen, counted from 0. */
  _sel?: number;
  _stamp = 0;
  _toast = "";
  /** A thing found, while it is asked where it goes: before or after the chosen song. */
  _menu?: Favourite;
  _sorting = false;
  _confirm?: Sure;
  /** The playlist was sorted here and is as the sort left it: it can be put back. */
  _unsort = false;
  /** The chosen song's cover, shown as large as the screen allows. */
  _zoom = false;
  /** The sheet that asks which playlist the chosen song moves to (pick.ts), and the
   * favourites it lists: fetched each time it opens, a string when they couldn't be. */
  _putting?: Pick;
  _lists?: Favourite[] | string;
  /** Something is being added above or straight after the chosen song, which is to stay
   * chosen: how many songs there were, to tell how many came. */
  private _adding?: { total: number; over: boolean };
  private _off?: () => void;
  private _fade?: ReturnType<typeof setTimeout>;
  private _frame = 0;
  private _busy = new Busy(this);
  /** How much of the width the list has, in hundredths. */
  private _split = new Split(this, "casa-mia-jukebox-split-editor", 50);

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
    // What is up over the editor goes first; then the editor.
    if (this._zoom || this._menu || this._sorting || this._confirm || this._putting) [this._zoom, this._menu, this._sorting, this._confirm, this._putting] = [false, undefined, false, undefined, undefined];
    else this.remove();
  };

  private _touch = (e: Event) => {
    if (this._lift) e.preventDefault();
  };

  private _say(text: string) {
    this._toast = text;
    clearTimeout(this._fade);
    this._fade = setTimeout(() => (this._toast = ""), 3500);
  }

  /** Ask Jukebox for something. Gives what it said of what it did (`{}` when it said
   * nothing), or none when it couldn't be done, which is said on the screen. */
  private _run(action: string, data: Record<string, unknown> = {}, key = action): Promise<Record<string, unknown> | undefined> {
    return this._busy.during(key, ask(this.hass, action, this.room, data)).then(
      (told) => {
        this._moved(action, data);
        this._stamp++;
        return (told ?? {}) as Record<string, unknown>;
      },
      (err) => (this._say(reason(err)), undefined),
    );
  }

  /** For the list, which moves and takes out its own songs through here. */
  private _do = (action: string, data: object) => this._run(action, data as Record<string, unknown>).then((told) => !!told);

  /** Keep the chosen song chosen through a change to the list, and forget a sort that
   * can no longer be put back. Songs are numbered from 1 in what is asked. */
  private _moved(action: string, data: Record<string, unknown>) {
    if (!/sort$/.test(action)) this._unsort = false;
    const sel = this._sel;
    if (sel === undefined) return;
    const [from, to] = [Number(data.value) - 1, Number(data.to) - 1];
    if (/_(remove|send)$/.test(action)) this._sel = from === sel ? undefined : from < sel ? sel - 1 : sel;
    else if (/_move$/.test(action)) this._sel = from === sel ? to : from < sel && to >= sel ? sel - 1 : from > sel && to <= sel ? sel + 1 : sel;
    else if (/sort$|dedupe$|clear$/.test(action)) this._sel = undefined;
  }

  /** The list was read again: what it holds now, and where the chosen song has got to
   * if something was added above it. */
  private _listed = (e: CustomEvent<{ total: number; songs: Song[] }>) => {
    const { total, songs } = e.detail;
    const adding = this._adding;
    if (adding && this._sel !== undefined && total > adding.total) {
      this._sel += total - adding.total;
      this._adding = undefined;
    } else if (adding?.over) this._adding = undefined;
    [this._songs, this._total] = [songs, total];
    if (this._sel !== undefined && this._sel >= songs.length) this._sel = undefined;
  };

  /** Add a thing found: to be song number `to`, or at the end without one. `keep` is
   * that the chosen song, or the last of what is added after it, is chosen afterwards. */
  private async _add(item: Favourite, to?: number, keep = false) {
    this._menu = undefined;
    const where = to ? { to } : {};
    const key = `fav:${item.media_content_id}`;
    const adding: { total: number; over: boolean } | undefined = keep ? { total: this._total ?? 0, over: false } : undefined;
    this._adding = adding;
    const added = this.playlist
      ? await this._run("playlist_add", { playlist: this.playlist.media_content_id, media_content_id: item.media_content_id, name: item.title.slice(0, 60), ...where }, key)
      : await this._run("queue_add", { media_content_id: item.media_content_id, media_content_type: item.media_content_type, ...where }, key);
    if (adding) adding.over = true;
    if (added) this._say(to ? `Added as number ${to}: ${item.title}` : `Added to the end: ${item.title}`);
  }

  /** + beside a thing found: with a song chosen there is a choice of where it goes. */
  private _choose(item: Favourite) {
    if (this._sel === undefined) this._add(item);
    else this._menu = item;
  }

  private _move(to: number) {
    const sel = this._sel!;
    if (to - 1 !== sel) this._run(this.playlist ? "playlist_move" : "queue_move", { ...this._which(), value: sel + 1, to });
  }

  /** The chosen song, to the end of another playlist, and out of this one unless it is
   * copied. */
  private _send(sel: number, song: Song, copy: boolean) {
    const from = this.playlist!;
    const asked = sent(from, sel, song, copy);
    const pick = async (playlist: Favourite) => {
      this._putting = undefined;
      if (await this._run(asked.action, asked.data(playlist))) this._say(asked.said(playlist));
    };
    this._lists = undefined;
    favourites(this.hass, this.room).then(
      (found) => (this._lists = found),
      (err) => (this._lists = reason(err)),
    );
    this._putting = { ...asked.pick, pick };
  }

  private _which() {
    return this.playlist ? { playlist: this.playlist.media_content_id } : {};
  }

  private async _sort(by: string, said: string) {
    this._sorting = false;
    const told = await this._run("playlist_sort", { ...this._which(), by });
    if (!told) return;
    this._unsort = !!told.moved;
    this._say(told.moved ? `Sorted by ${said}. Put it back returns the order it had.` : `It is already in order of ${said}.`);
  }

  private async _back() {
    if (!(await this._run("playlist_unsort", this._which()))) return;
    this._unsort = false;
    this._say("Back in the order it had.");
  }

  private _dedupe() {
    const run = async () => {
      const told = await this._run("playlist_dedupe", this._which());
      if (!told) return;
      const n = Number(told.removed);
      this._say(n ? `Took out ${n === 1 ? "1 song that was" : `${n} songs that were`} in it more than once.` : "No song is in it more than once.");
    };
    this._confirm = { warn: "This takes songs out", text: "Every song that is in this playlist more than once is taken out, keeping the first of each. They can't be put back.", keep: "Leave it", go: "Take them out", run };
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
    const [lift, mark, sel] = [this._lift, this._mark, this._sel];
    cancelAnimationFrame(this._frame);
    this._lift = this._mark = undefined;
    // Dropped above the chosen song: it moves down, and stays chosen.
    if (drop && lift && mark !== undefined) this._add(lift.item, mark + 1, sel !== undefined && mark <= sel);
  };

  /** The chosen song, whole: a row cuts its names short. With none chosen, how to. */
  private _pane() {
    const [sel, song] = [this._sel, this._sel === undefined ? undefined : this._songs[this._sel]];
    if (sel === undefined || !song) return html`<p class="pane none">Tap a song to see it here, and to choose where the next thing you add goes.</p>`;
    const total = this._total ?? this._songs.length;
    const facts = [song.duration ? mmss(song.duration) : "", FROM[song.source ?? ""] ?? "", `Number ${sel + 1} of ${total}`].filter(Boolean);
    return html`<div class="pane">
      <button class="cover" @click=${() => (this._zoom = true)} aria-label="Show the cover larger">${art(this.hass, song.picture, song.title || song.album || "?")}</button>
      <div class="about">
        <h3>${song.title || "A song with no title"}</h3>
        ${song.artist ? html`<p>${song.artist}</p>` : nothing}
        ${song.album ? html`<p class="album">${song.album}</p>` : nothing}
        <small>${facts.join(" · ")}</small>
        <div class="acts">
          ${this.playlist ? nothing : html`<button class=${this._busy.on("queue_play")} @click=${() => this._run("queue_play", { value: sel + 1 })}>${icon("play")}Play from here</button>`}
          <button ?disabled=${sel === 0} @click=${() => this._move(1)}>To the top</button>
          <button ?disabled=${sel >= total - 1} @click=${() => this._move(total)}>To the end</button>
          <button @click=${() => this._run(this.playlist ? "playlist_remove" : "queue_remove", { ...this._which(), value: sel + 1 })}>${icon("close")}Take out</button>
          ${this.playlist
            ? html`<button class=${this._busy.on("playlist_send")} @click=${() => this._send(sel, song, false)}>Move to another playlist…</button>
                <button class=${this._busy.on("playlist_copy")} @click=${() => this._send(sel, song, true)}>Copy to another playlist…</button>`
            : nothing}
          <button @click=${() => (this._sel = undefined)}>Let go</button>
        </div>
      </div>
    </div>`;
  }

  private _sheets() {
    const [sure, menu, song] = [this._confirm, this._menu, this._sel === undefined ? undefined : this._songs[this._sel]];
    const veil = (inside: unknown, shut: () => void) => html`<div class="veil" @click=${(e: Event) => e.target === e.currentTarget && shut()}>${inside}</div>`;
    if (sure)
      return veil(
        html`<div class="sheet" role="alertdialog" aria-label=${sure.warn}>
          <p class="warn">${sure.warn}</p>
          <p>${sure.text}</p>
          <div class="acts">
            <button class="main" @click=${() => (this._confirm = undefined)}>${sure.keep}</button>
            <button class="danger" @click=${() => ((this._confirm = undefined), sure.run())}>${sure.go}</button>
          </div>
        </div>`,
        () => (this._confirm = undefined),
      );
    if (menu && song && this._sel !== undefined) {
      const [sel, name] = [this._sel, song.title || "the chosen song"];
      return veil(
        html`<div class="sheet" role="dialog" aria-label="Where to add ${menu.title}">
          <h4>${menu.title}</h4>
          <p>Where should it go?</p>
          <div class="acts">
            <button class="main" @click=${() => this._add(menu, sel + 2, true)}>After “${name}”</button>
            <button @click=${() => this._add(menu, sel + 1, true)}>Before “${name}”</button>
            <button @click=${() => this._add(menu)}>At the end</button>
            <button class="sep" @click=${() => (this._menu = undefined)}>Cancel</button>
          </div>
        </div>`,
        () => (this._menu = undefined),
      );
    }
    if (this._putting) {
      const shut = () => (this._putting = undefined);
      return veil(chooser(this._lists, this._putting, shut), shut);
    }
    if (this._sorting)
      return veil(
        html`<div class="sheet" role="dialog" aria-label="Sort this playlist">
          <h4>Sort this playlist</h4>
          <p>The songs are moved into that order in Sonos. Put it back returns the order it had, until you change the playlist or close this editor.</p>
          <div class="acts">
            ${SORTS.map(([by, label, said]) => html`<button @click=${() => this._sort(by, said)}>${label}</button>`)}
            <button class="sep" @click=${() => (this._sorting = false)}>Cancel</button>
          </div>
        </div>`,
        () => (this._sorting = false),
      );
    if (this._zoom && song) return veil(html`<div class="large">${art(this.hass, song.picture, song.title || song.album || "?")}</div>`, () => (this._zoom = false));
    return nothing;
  }

  render() {
    const house = this._house;
    const group = house && groupOf(house, this.room);
    const lift = this._lift;
    const what = this.playlist ? this.playlist.title : group && house ? `The queue in ${names(house, group)}` : "The queue";
    const songs = this._total === undefined ? "" : this._total === 1 ? "1 song" : `${this._total} songs`;
    const more = (this._total ?? 0) - this._songs.length;
    const tidy = this.playlist && curates(house);
    const split = this._split.value;
    const width = (e: PointerEvent) => {
      const box = this.renderRoot.querySelector(".cols")!.getBoundingClientRect();
      return Math.round(Math.max(25, Math.min(75, (100 * (e.clientX - box.left)) / box.width)));
    };
    return html`<div class="page ${lift ? "carrying" : ""}">
      <header>
        <button class="ib" @click=${() => this.remove()} aria-label="Close the editor">${icon("back")}</button>
        <h1>${what}<small>Tap a song on the left to choose it. Press + beside something on the right to add it, or rest a finger on it until it lifts and drag it to its place.</small></h1>
      </header>
      ${group
        ? html`<div class="cols" style="grid-template-columns:minmax(0,${split}fr) auto minmax(0,${100 - split}fr)">
            <section class="list">
              <h2>${this.playlist ? "In this playlist" : "In the queue"}<small>${songs}${more > 0 ? `, the first ${this._songs.length} shown` : ""}</small></h2>
              ${this._pane()}
              ${tidy
                ? html`<div class="tools">
                    <button class=${this._busy.on("playlist_sort")} @click=${() => (this._sorting = true)}>Sort…</button>
                    <button class=${this._busy.on("playlist_dedupe")} @click=${() => this._dedupe()}>Duplicates…</button>
                    ${this._unsort ? html`<button class="go ${this._busy.on("playlist_unsort")}" @click=${() => this._back()}>${icon("reset")}Put it back</button>` : nothing}
                  </div>`
                : nothing}
              <div class="scroll"><casa-mia-jukebox-queue picks .hass=${this.hass} .group=${group} .playlist=${this.playlist?.media_content_id} .do=${this._do} .stamp=${this._stamp} .mark=${this._mark} .selected=${this._sel} @jb-listed=${this._listed} @jb-pick=${(e: CustomEvent) => (this._sel = this._sel === e.detail ? undefined : e.detail)}></casa-mia-jukebox-queue></div>
            </section>
            ${this._split.grip(width)}
            <section class="find">
              <h2>Search and browse</h2>
              <div class="scroll">
                <casa-mia-jukebox-find carry .hass=${this.hass} .room=${group.id} .waiting=${(key: string) => this._busy.on(key)} .changes=${this._busy.changes} @jb-choose=${(e: CustomEvent) => this._choose(e.detail)} @jb-lift=${this._lifted} @jb-carry=${this._carried} @jb-drop=${() => this._let(true)} @jb-cancel=${() => this._let(false)}></casa-mia-jukebox-find>
              </div>
            </section>
          </div>`
        : html`<p class="none">${this._why ?? (house ? "That room isn't answering." : "Asking Home Assistant what is playing…")}</p>`}
      ${lift ? html`<div class="ghost" style="transform:translate(${lift.x + 14}px,${lift.y - 28}px)">${art(this.hass, lift.item.picture, lift.item.title)}<b>${lift.item.title}</b></div>` : nothing}
      ${this._sheets()}
      ${this._toast ? html`<div class="toast" role="status">${this._toast}</div>` : nothing}
    </div>`;
  }

  static styles = [
    shared,
    grips,
    css`
      :host { position: fixed; inset: 0; z-index: 1001; font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); color: #fff; --line: rgb(255 255 255 / 14%); --muted: rgb(255 255 255 / 60%); }
      .page { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; padding: max(14px, env(safe-area-inset-top)) 16px 16px; box-sizing: border-box; background: #171512; }
      .page.carrying { cursor: grabbing; }
      header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
      h1 { display: grid; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; min-width: 0; }
      h1 small { font-size: 13px; font-weight: 400; color: var(--muted); letter-spacing: 0; }
      .cols { display: grid; gap: 2px; min-height: 0; }
      section { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; border-radius: 22px; background: #26231f; }
      section.list { grid-template-rows: auto auto auto minmax(0, 1fr); }
      h2 { display: flex; align-items: baseline; gap: 10px; margin: 0; padding: 14px 18px 10px; font-size: 15px; }
      h2 small { font-weight: 400; color: var(--muted); }
      .scroll { overflow: auto; overscroll-behavior: contain; padding: 0 6px 10px; }
      .carrying .list { outline: 2px dashed rgb(255 255 255 / 35%); outline-offset: -2px; }
      .none { color: var(--muted); }
      /* The chosen song, whole. Its names wrap: here nothing is cut short. */
      .pane { display: grid; grid-template-columns: clamp(110px, 22vh, 200px) minmax(0, 1fr); gap: 16px; margin: 0 12px 10px; padding: 12px; border-radius: 16px; background: rgb(255 255 255 / 6%); }
      .pane.none { display: block; margin: 0 12px 10px; }
      .pane .cover { align-self: start; border-radius: 12px; cursor: zoom-in; }
      .about { display: grid; align-content: start; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
      .about h3 { margin: 0; font-size: 18px; line-height: 1.2; }
      .about p { margin: 0; }
      .about .album, .about small { color: var(--muted); }
      .about .acts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .about .acts button, .tools button { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 12px; background: rgb(255 255 255 / 10%); font-size: 13px; font-weight: 600; }
      .about .acts button:disabled { opacity: 0.35; }
      .about .acts svg, .tools svg { width: 16px; height: 16px; flex: none; }
      .tools { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 10px; }
      .tools .go { background: #fff; color: #111; }
      .ghost { position: fixed; left: 0; top: 0; z-index: 5; display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: center; gap: 10px; max-width: 300px; padding: 8px 14px 8px 8px; border-radius: 14px; background: #3a3630; box-shadow: 0 16px 40px rgb(0 0 0 / 60%); pointer-events: none; }
      .ghost .art { border-radius: 8px; }
      .ghost b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .veil { position: fixed; inset: 0; z-index: 7; display: grid; place-items: center; padding: 16px; background: rgb(0 0 0 / 60%); }
      .sheet { width: min(100%, 440px); padding: 18px; border-radius: 22px; background: #26231f; box-shadow: 0 20px 60px rgb(0 0 0 / 60%); }
      .sheet h4 { margin: 0 0 2px; font-size: 16px; overflow-wrap: anywhere; }
      .sheet p { margin: 0 0 14px; color: rgb(255 255 255 / 70%); overflow-wrap: anywhere; }
      .sheet .warn { margin: 0 0 10px; color: #ff6b5e; font-size: 30px; font-weight: 900; line-height: 1.05; text-transform: uppercase; }
      .sheet .acts { display: grid; gap: 8px; }
      .sheet .acts button { padding: 14px; border-radius: 14px; background: rgb(255 255 255 / 10%); font-size: 15px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }
      .sheet .acts .main { background: #fff; color: #111; }
      .sheet .acts .danger { background: none; border: 1px solid #ff6b5e; color: #ff6b5e; }
      .sheet .acts .sep { margin-top: 10px; }
      .sheet .picks { max-height: 32vh; overflow: auto; }
      .sheet .lost { color: #ff9a8f; }
      .large { width: min(84vw, 84vh); }
      .large .art { border-radius: 18px; box-shadow: 0 20px 60px rgb(0 0 0 / 60%); }
      .toast { position: fixed; left: 50%; bottom: 26px; z-index: 8; transform: translateX(-50%); max-width: min(90vw, 520px); padding: 12px 18px; border-radius: 14px; background: #fff; color: #111; font-weight: 600; overflow-wrap: anywhere; }
    `,
  ];
}
