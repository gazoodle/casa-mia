// The big player: what one group is playing, over its own artwork, with the rooms it plays
// in (each with its own volume) and the Sonos favourites. It covers the whole screen, on
// the document itself, so it looks the same opened from the page or from a card on any
// dashboard, and it follows the house by itself. A phone gets the rooms and favourites as
// a sheet over the player; a wall tablet gets them beside it.
import { LitElement, css, html, nothing } from "lit";
import type { Hass } from "../ha.ts";
import { type Favourite, type Group, type House, ask, average, colours, favourites, follow, groupOf, latest, mmss, names, playing, position, reason } from "./common.ts";
import { Clock, art, icon, shared } from "./parts.ts";

export const BIG = "casa-mia-jukebox-big";
type Tab = "rooms" | "favourites";
const TABS: [Tab, string][] = [
  ["rooms", "Rooms"],
  ["favourites", "Favourites"],
];
const REPEAT = { off: "all", all: "one", one: "off" } as const;

/** Show the big player for the group `room` is in, in place of any already open. */
export function open(hass: Hass, room: string, tab?: Tab): void {
  document.querySelector(BIG)?.remove();
  document.body.append(Object.assign(document.createElement(BIG), { hass, room, tab }));
}

export class Big extends LitElement {
  static properties = { room: {}, tab: {}, _house: { state: true }, _why: { state: true }, _favourites: { state: true }, _menu: { state: true }, _replace: { state: true }, _toast: { state: true } };
  hass!: Hass; // for its connection; set once, by open()
  /** A room of the group shown: the player follows the room if its group changes. */
  room = "";
  /** The sheet that is up on a phone; a wide screen shows the rooms when it is none. */
  tab?: Tab;
  _house?: House;
  _why?: string;
  /** None until asked for; a string is why they couldn't be had. */
  _favourites?: Favourite[] | string;
  _menu?: Favourite;
  _replace?: Favourite;
  _toast = "";
  private _off?: () => void;
  private _fade?: ReturnType<typeof setTimeout>;
  private _sliders = new Map<string, (value: number) => void>();

  constructor() {
    super();
    new Clock(this); // the song's place moves on by itself
  }

  connectedCallback() {
    super.connectedCallback();
    this._off = follow(this.hass.connection, (house, why) => ([this._house, this._why] = [house, why]));
    window.addEventListener("keydown", this._key);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._off?.();
    window.removeEventListener("keydown", this._key);
    clearTimeout(this._fade);
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has("tab") && this.tab === "favourites" && this._favourites === undefined) {
      favourites(this.hass, this.room).then(
        (found) => (this._favourites = found),
        (err) => (this._favourites = reason(err)),
      );
    }
  }

  private _key = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.remove();
  };

  private _say(text: string) {
    this._toast = text;
    clearTimeout(this._fade);
    this._fade = setTimeout(() => (this._toast = ""), 3500);
  }

  /** Ask Jukebox for something, and say so on the player if it can't be done. */
  private _do(action: string, data: object = {}, room = this.room): Promise<boolean> {
    return ask(this.hass, action, room, data).then(
      () => true,
      (err) => (this._say(reason(err)), false),
    );
  }

  /** A slider's sender, one for each thing it sets, kept so a drag sends in turn. */
  private _slide(action: string, room: string) {
    const key = `${action} ${room}`;
    if (!this._sliders.has(key))
      this._sliders.set(
        key,
        latest<number>(
          (value) => ask(this.hass, action, room, { value }),
          (err) => this._say(reason(err)),
        ),
      );
    return (e: CustomEvent) => this._sliders.get(key)!(e.detail.value);
  }

  private _toggleRoom(group: Group, room: string) {
    if (!group.rooms.includes(room)) return void this._do("join", { room });
    if (group.rooms.length === 1) return this._say("That is the last room. Pause the music to stop it.");
    // Taking out the room this player follows: stay with the music, not the room.
    if (room === this.room) this.room = group.rooms.find((r) => r !== room)!;
    this._do("leave", { room });
  }

  private async _play(favourite: Favourite, enqueue?: "next" | "add" | "replace") {
    this._menu = this._replace = undefined;
    const done = await this._do("play_media", { media_content_id: favourite.media_content_id, media_content_type: favourite.media_content_type, ...(enqueue ? { enqueue } : {}) });
    const said = { next: "Playing next", add: "Added to the end" } as Record<string, string>;
    if (done) this._say(`${said[enqueue ?? ""] ?? "Playing"}: ${favourite.title}`);
  }

  private _choose(group: Group, favourite: Favourite) {
    // A station plays at once and leaves the queue as it is; so does anything in a room
    // that is playing nothing. The rest is lined up, so there is a choice of where.
    if (favourite.live || group.kind === "nothing") this._play(favourite);
    else this._menu = favourite;
  }

  private _tabs(group: Group) {
    const shown = this.tab ?? "rooms";
    return html`<div class="tabs">
      ${TABS.map(
        ([tab, label]) => html`<button class=${this.tab === tab ? "up" : shown === tab ? "shown" : ""} @click=${() => (this.tab = this.tab === tab ? undefined : tab)}>
          ${icon(tab)}${label}${tab === "rooms" && group.rooms.length > 1 ? html` (${group.rooms.length})` : nothing}
        </button>`,
      )}
    </div>`;
  }

  private _now(house: House, group: Group) {
    const { title, by } = playing(group);
    const at = position(group, Date.now());
    const on = group.state === "playing";
    const queue = group.kind === "queue";
    return html`<div class="now">
      <div class="bar">
        <button class="ib" @click=${() => this.remove()} aria-label="Close the player">${icon("down")}</button>
        <div class="where"><small>Playing in</small><b>${names(house, group)}</b></div>
        <span class="ib"></span>
      </div>
      <div class="cover">${art(this.hass, group.picture, title)}</div>
      <div class="title"><b>${title}</b><span>${by}</span></div>
      ${at !== null && group.duration
        ? html`<div class="seek">
            <span>${mmss(at)}</span>
            <casa-mia-jukebox-slider .value=${at} .max=${group.duration} label="Place in the song" @jb-set=${(e: CustomEvent) => this._do("seek", { value: e.detail.value })}></casa-mia-jukebox-slider>
            <span>${mmss(group.duration)}</span>
          </div>`
        : group.kind === "radio"
          ? html`<div class="live">LIVE${group.channel ? ` · ${group.channel.toUpperCase()}` : ""}</div>`
          : nothing}
      <div class="tp">
        ${queue ? html`<button class="ib sm ${group.shuffle ? "on" : ""}" @click=${() => this._do("shuffle", { on: !group.shuffle })} aria-label="Shuffle">${icon("shuffle")}</button>` : nothing}
        ${queue ? html`<button class="ib" @click=${() => this._do("previous")} aria-label="Previous song">${icon("previous")}</button>` : nothing}
        <button class="ib play" ?disabled=${group.kind === "nothing"} @click=${() => this._do(on ? "pause" : "play")} aria-label=${on ? "Pause" : "Play"}>${icon(on ? "pause" : "play")}</button>
        ${queue ? html`<button class="ib" @click=${() => this._do("next")} aria-label="Next song">${icon("next")}</button>` : nothing}
        ${queue
          ? html`<button class="ib sm ${group.repeat === "off" ? "" : "on"}" @click=${() => this._do("repeat", { mode: REPEAT[group.repeat] })} aria-label="Repeat">
              ${icon("repeat")}${group.repeat === "one" ? html`<sup>1</sup>` : nothing}
            </button>`
          : nothing}
      </div>
      <div class="gvol">
        ${icon("volume")}
        <casa-mia-jukebox-slider .value=${average(house, group)} label="Volume" @jb-slide=${this._slide("group_volume", group.id)} @jb-set=${this._slide("group_volume", group.id)}></casa-mia-jukebox-slider>
      </div>
      ${this._tabs(group)}
    </div>`;
  }

  private _head(title: string, sub: string) {
    return html`<div class="head">
      <b>${title}<small>${sub}</small></b>
      <button class="ib shut" @click=${() => (this.tab = undefined)} aria-label="Close">${icon("close")}</button>
    </div>`;
  }

  private _rooms(house: House, group: Group) {
    const others = Object.keys(house.rooms)
      .filter((r) => !group.rooms.includes(r))
      .sort((a, b) => house.rooms[a].name.localeCompare(house.rooms[b].name));
    const row = (id: string) => {
      const room = house.rooms[id];
      const inn = group.rooms.includes(id);
      const other = groupOf(house, id);
      const note = !room.available ? "Not answering" : inn ? "Playing this" : other && !other.quiet ? `Playing ${playing(other).title}: tap to bring it here` : "Quiet: tap to add it";
      return html`<div class="room ${inn ? "in" : ""}">
        <button class="tick" ?disabled=${!room.available} @click=${() => this._toggleRoom(group, id)} aria-label=${inn ? `Take ${room.name} out` : `Add ${room.name}`}>${icon(inn ? "check" : "plus")}</button>
        <button class="t" ?disabled=${!room.available} @click=${() => this._toggleRoom(group, id)}><b>${room.name}</b><small>${note}</small></button>
        ${inn && room.volume !== null
          ? html`<casa-mia-jukebox-slider .value=${room.volume} label="${room.name} volume" @jb-slide=${this._slide("volume", id)} @jb-set=${this._slide("volume", id)}></casa-mia-jukebox-slider><output>${room.volume}</output>`
          : nothing}
      </div>`;
    };
    return html`${this._head("Rooms", "Tap a room to add it or take it out. Each has its own volume.")}
      <div class="scroll">${[...group.rooms, ...others].map(row)}</div>`;
  }

  private _favouritesPanel(group: Group) {
    const found = this._favourites;
    const folders = Array.isArray(found) ? [...new Set(found.map((f) => f.folder))] : [];
    const tile = (f: Favourite) => html`<button @click=${() => this._choose(group, f)}>${art(this.hass, f.picture, f.title)}<b>${f.title}</b></button>`;
    return html`${this._head("Favourites", "The stations, playlists and songs saved in Sonos")}
      <div class="scroll">
        ${found === undefined
          ? html`<p class="empty">Fetching them from the speaker…</p>`
          : typeof found === "string"
            ? html`<p class="empty">The favourites couldn't be fetched: ${found}</p>`
            : found.length
              ? folders.map((folder) => html`<h3>${folder}</h3><div class="tiles">${found.filter((f) => f.folder === folder).map(tile)}</div>`)
              : html`<p class="empty">There are no favourites saved in Sonos yet.</p>`}
      </div>`;
  }

  /** Where a favourite goes in the queue. Replacing the queue is kept apart and asks again. */
  private _sheets(group: Group) {
    const menu = this._menu;
    const replace = this._replace;
    const songs = group.kind === "queue" && group.queue_size ? `The ${group.queue_size} songs in the queue` : "Whatever is in the queue";
    if (replace)
      return html`<div class="veil">
        <div class="sheet" role="alertdialog" aria-label="Replace the whole queue">
          <p class="warn">This replaces the whole queue</p>
          <p>${songs} will go, and "${replace.title}" will start now.</p>
          <div class="acts">
            <button class="main" @click=${() => (this._replace = undefined)}>Keep the queue</button>
            <button class="danger" @click=${() => this._play(replace, "replace")}>Replace it</button>
          </div>
        </div>
      </div>`;
    if (menu)
      return html`<div class="veil" @click=${(e: Event) => e.target === e.currentTarget && (this._menu = undefined)}>
        <div class="sheet" role="dialog" aria-label=${menu.title}>
          <h4>${menu.title}</h4>
          <p>${menu.folder}</p>
          <div class="acts">
            <button class="main" @click=${() => this._play(menu, "next")}>Play next</button>
            <button @click=${() => this._play(menu, "add")}>Add to the end of the queue</button>
            <button class="danger sep" @click=${() => ([this._menu, this._replace] = [undefined, menu])}>Play now and replace the queue…</button>
          </div>
        </div>
      </div>`;
    return nothing;
  }

  render() {
    const house = this._house;
    const group = house && groupOf(house, this.room);
    if (!house || !group) {
      // Not known yet, refused, or the room has stopped answering: say which, with a way out.
      const why = this._why ?? (house ? "This room's speaker isn't answering." : "Asking Home Assistant what is playing…");
      return html`<div class="big"><div class="now"><div class="bar"><button class="ib" @click=${() => this.remove()} aria-label="Close the player">${icon("down")}</button></div><p class="empty">${why}</p></div></div>`;
    }
    const [a, b] = colours(playing(group).title);
    const picture = group.picture ? `--pic:url('${(this.hass.hassUrl?.(group.picture) ?? group.picture).replace(/'/g, "%27")}');` : "";
    return html`<div class="big" style="--a:${a};--b:${b};${picture}">
      ${this._now(house, group)}
      <div class="side ${this.tab ? "up" : ""}">${this._tabs(group)}${(this.tab ?? "rooms") === "rooms" ? this._rooms(house, group) : this._favouritesPanel(group)}</div>
      ${this._sheets(group)}
      <div class="toast ${this._toast ? "on" : ""}" role="status">${this._toast}</div>
    </div>`;
  }

  static styles = [
    shared,
    css`
      :host { position: fixed; inset: 0; z-index: 1000; font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .big { position: absolute; inset: 0; display: grid; overflow: clip; background: #111; color: #fff; --muted: rgb(255 255 255 / 66%); --line: rgb(255 255 255 / 14%); --jb-fill: #fff; --jb-track: rgb(255 255 255 / 22%); animation: up 0.28s ease-out; }
      /* Clipped, not hidden: a hidden box can still be scrolled (a tap brings its target into
         view), and the light behind the player overflows it on purpose. */
      .big::before { content: ""; position: absolute; inset: -60px; background: var(--pic, conic-gradient(from 200deg at 60% 40%, var(--a), var(--b), var(--a))) center / cover; filter: blur(50px) saturate(1.3); }
      .big::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgb(0 0 0 / 30%), rgb(0 0 0 / 72%)); }
      .big > * { position: relative; z-index: 1; min-height: 0; }
      @keyframes up { from { transform: translateY(40px); opacity: 0; } }
      .now { display: flex; flex-direction: column; gap: 12px; padding: max(12px, env(safe-area-inset-top)) 22px max(14px, env(safe-area-inset-bottom)); }
      .bar { display: flex; align-items: center; gap: 8px; }
      .where { flex: 1; min-width: 0; text-align: center; }
      .where small { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
      .where b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cover { flex: 1; min-height: 0; display: grid; place-items: center; }
      .cover .art { width: auto; height: 100%; max-width: 100%; max-height: 380px; border-radius: 18px; box-shadow: 0 20px 50px rgb(0 0 0 / 50%); }
      .title { text-align: center; }
      .title b { display: block; font-size: 21px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .title span { color: var(--muted); }
      .seek { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
      .live { text-align: center; color: var(--muted); font-size: 12px; font-weight: 700; letter-spacing: 0.1em; }
      .tp { display: flex; align-items: center; justify-content: center; gap: 10px; }
      .tp .ib svg { width: 30px; height: 30px; }
      .tp .ib.sm { position: relative; color: var(--muted); }
      .tp .ib.sm svg { width: 22px; height: 22px; }
      .tp .ib.sm.on { color: #fff; background: rgb(255 255 255 / 22%); }
      .tp sup { position: absolute; top: 4px; right: 6px; font-size: 10px; font-weight: 800; }
      .tp .play { width: 66px; height: 66px; background: #fff; color: #111; }
      .tp .play:hover:not(:disabled) { background: #fff; transform: scale(1.05); }
      .tp .play svg { width: 36px; height: 36px; }
      .gvol { display: flex; align-items: center; gap: 12px; color: var(--muted); }
      .gvol svg { width: 20px; height: 20px; flex: none; }
      .gvol casa-mia-jukebox-slider, .seek casa-mia-jukebox-slider { color: #fff; }
      .tabs { display: flex; gap: 6px; }
      .tabs button { flex: 1; display: grid; justify-items: center; gap: 2px; padding: 8px 4px; border-radius: 12px; font-size: 11px; font-weight: 700; color: var(--muted); }
      .tabs svg { width: 22px; height: 22px; }
      .tabs .up { background: rgb(255 255 255 / 16%); color: #fff; }

      /* The rooms and favourites: a sheet over the player on a phone. */
      .side { position: absolute; inset: 64px 0 0; z-index: 3; display: none; flex-direction: column; border-radius: 22px 22px 0 0; background: rgb(22 20 18); box-shadow: 0 -10px 40px rgb(0 0 0 / 50%); animation: up 0.24s ease-out; }
      .side.up { display: flex; }
      .side .tabs { display: none; padding: 10px 10px 0; }
      .head { display: flex; align-items: center; gap: 8px; padding: 12px 10px 8px 16px; }
      .head b { flex: 1; font-size: 16px; }
      .head small { display: block; color: var(--muted); font-weight: 500; font-size: 12px; }
      .scroll { flex: 1; min-height: 0; overflow: auto; padding: 0 6px max(16px, env(safe-area-inset-bottom)); }
      .scroll h3 { margin: 16px 10px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
      .empty { padding: 28px 18px; text-align: center; color: var(--muted); overflow-wrap: anywhere; }
      .room { display: grid; grid-template-columns: 44px minmax(0, 1fr) 34px; gap: 4px 12px; align-items: center; padding: 10px; border-radius: 14px; }
      .room.in { margin-bottom: 6px; background: rgb(255 255 255 / 9%); }
      .tick { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--line); color: var(--muted); }
      .room.in .tick { background: #fff; border-color: #fff; color: #111; }
      .room .t b { display: block; }
      .room .t small { color: var(--muted); }
      .room casa-mia-jukebox-slider { grid-column: 2; }
      .room output { text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }
      .tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 10px; padding: 0 10px; }
      .tiles button { display: grid; gap: 6px; min-width: 0; }
      .tiles b { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .veil { position: absolute; inset: 0; z-index: 5; display: grid; place-items: end center; padding: 14px; background: rgb(0 0 0 / 60%); }
      .sheet { width: min(100%, 440px); padding: 18px; border-radius: 22px; background: #26231f; box-shadow: 0 20px 60px rgb(0 0 0 / 60%); animation: up 0.2s ease-out; }
      .sheet h4 { margin: 0 0 2px; font-size: 16px; }
      .sheet p { margin: 0 0 14px; color: rgb(255 255 255 / 70%); overflow-wrap: anywhere; }
      .sheet .warn { margin: 0 0 10px; color: #ff6b5e; font-size: 30px; font-weight: 900; line-height: 1.05; text-transform: uppercase; }
      .acts { display: grid; gap: 8px; }
      .acts button { padding: 14px; border-radius: 14px; background: rgb(255 255 255 / 10%); font-size: 15px; font-weight: 700; text-align: center; }
      .acts button:hover { background: rgb(255 255 255 / 18%); }
      .acts .main { background: #fff; color: #111; }
      .acts .danger { background: none; border: 1px solid #ff6b5e; color: #ff6b5e; }
      .acts .sep { margin-top: 10px; }
      .toast { position: absolute; left: 14px; right: 14px; bottom: 18px; z-index: 6; margin: 0 auto; width: fit-content; max-width: calc(100% - 28px); padding: 11px 16px; border-radius: 14px; background: #fff; color: #111; font-weight: 600; overflow-wrap: anywhere; box-shadow: 0 10px 30px rgb(0 0 0 / 45%); opacity: 0; transform: translateY(12px); transition: 0.25s; pointer-events: none; }
      .toast.on { opacity: 1; transform: none; }

      /* A wide screen (a wall tablet): the rooms and favourites sit beside the player. */
      @media (min-width: 900px) {
        .big { grid-template-columns: minmax(0, 1fr) 460px; }
        .now { padding: 16px 56px 22px; }
        .now .tabs, .shut { display: none; }
        .side { position: relative; inset: auto; display: flex; border-radius: 0; border-left: 1px solid var(--line); background: rgb(12 11 10 / 46%); backdrop-filter: blur(24px); box-shadow: none; animation: none; }
        .side .tabs { display: flex; }
        .side .tabs .shown { background: rgb(255 255 255 / 16%); color: #fff; }
        .veil { place-items: center; }
      }
    `,
  ];
}
