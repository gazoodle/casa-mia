// The big player: what one group is playing, over its own artwork, with its queue
// (queue.ts), the rooms it plays in (each with its own volume), the Sonos favourites and a
// search of the music library and Spotify (find.ts). It covers the whole screen, on
// the document itself, so it looks the same opened from the page or from a card on any
// dashboard, and it follows the house by itself. The Now playing card shows the same
// player in place (`inline`). A phone gets the rooms and favourites as
// a sheet over the player; a wall tablet gets them beside it.
import { LitElement, css, html, nothing } from "lit";
import type { Hass } from "../ha.ts";
import { type Favourite, type Group, type House, ask, average, clock, colours, favourites, follow, groupOf, latest, loved, mmss, muted, names, playing, position, queue, reason, shut } from "./common.ts";
import { Busy, Clock, art, icon, shared } from "./parts.ts";

export const BIG = "casa-mia-jukebox-big";
type Tab = "queue" | "rooms" | "favourites" | "search";
const TABS: [Tab, string][] = [
  ["queue", "Queue"],
  ["rooms", "Rooms"],
  ["favourites", "Favourites"],
  ["search", "Search"],
];
const REPEAT = { off: "all", all: "one", one: "off" } as const;
/** Where this device keeps which folders of favourites are closed. A convenience only:
 * a browser that won't keep it (a private window) shows them all open. */
const FOLDED = "casa-mia-jukebox-folded";
function remembered(): string[] {
  try {
    const kept = JSON.parse(localStorage.getItem(FOLDED) ?? "[]");
    return Array.isArray(kept) ? kept.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

/** Show the big player for the group `room` is in, in place of any already open. */
export function open(hass: Hass, room: string, tab?: Tab): void {
  document.querySelector(BIG)?.remove();
  document.body.append(Object.assign(document.createElement(BIG), { hass, room, tab }));
}

export class Big extends LitElement {
  static properties = { room: {}, tab: {}, inline: { type: Boolean, reflect: true }, _house: { state: true }, _why: { state: true }, _favourites: { state: true }, _menu: { state: true }, _confirm: { state: true }, _naming: { state: true }, _partying: { state: true }, _queued: { state: true }, _stamp: { state: true }, _viewing: { state: true }, _adding: { state: true }, _folded: { state: true }, _toast: { state: true } };
  hass!: Hass; // for its connection; set once, by open()
  /** A room of the group shown: the player follows the room if its group changes. */
  room = "";
  /** The sheet that is up on a phone; a wide screen shows the rooms when it is none. */
  tab?: Tab;
  _house?: House;
  _why?: string;
  /** None until asked for; a string is why they couldn't be had. */
  _favourites?: Favourite[] | string;
  /** The Sonos playlist whose songs are being looked at, in the Favourites tab. */
  _viewing?: Favourite;
  /** Search was opened to add to the queue or to the playlist being looked at: a thing
   * chosen goes there, and the player goes back to where it came from. */
  _adding?: "queue" | "playlist";
  private _fresh = 0;
  /** The folders of favourites that are closed up, remembered on this device. */
  _folded: string[] = remembered();
  _menu?: Favourite;
  /** Something that can't be undone, asked about again in large letters. */
  _confirm?: { warn: string; text: string; keep: string; go: string; run: () => void };
  /** The sheet that asks what to call the queue as a playlist. */
  _naming = false;
  /** Drawn in place, in a card, and so with nothing to close. */
  inline = false;
  /** How many songs the speaker's queue holds, once the Queue tab has asked it. Home
   * Assistant's own count goes stale while a station plays. */
  _queued?: number;
  /** Goes up when something was done that may have changed the queue, so the Queue tab
   * asks the speaker again: a speaker playing a station reports no such change. */
  _stamp = 0;
  /** The sheet that says what the party lock is doing, and ends it. */
  _partying = false;
  /** The newest thing put back that has been said, so each is said once. */
  private _said?: string;
  _toast = "";
  private _off?: () => void;
  private _fade?: ReturnType<typeof setTimeout>;
  private _sliders = new Map<string, (value: number) => void>();
  private _busy = new Busy(this);

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
    if (changed.has("_house") && this._house) {
      // Something put back by the party lock is said as it happens, not at first sight.
      const last = groupOf(this._house, this.room)?.party?.undone[0];
      if (last && this._said !== undefined && last.at !== this._said) this._say(last.failed ? last.what : `Put back: ${last.what.replace(/^Someone/, "someone")}`);
      this._said = last?.at ?? "";
    }
    // Wanted for their own tab, and to list the playlists a queue can be saved over.
    if ((changed.has("tab") || changed.has("_favourites") || changed.has("_naming")) && (this.tab === "favourites" || this._naming) && this._favourites === undefined) {
      favourites(this.hass, this.room).then(
        (found) => (this._favourites = found),
        (err) => (this._favourites = reason(err)),
      );
    }
  }

  private _key = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !this.inline) this.remove();
  };

  /** The way out, where there is one: a player in a card stays where it is. */
  private _shut() {
    return this.inline ? html`<span class="ib"></span>` : html`<button class="ib" @click=${() => this.remove()} aria-label="Close the player">${icon("down")}</button>`;
  }

  private _say(text: string) {
    this._toast = text;
    clearTimeout(this._fade);
    this._fade = setTimeout(() => (this._toast = ""), 3500);
  }

  /** Ask Jukebox for something, and say so on the player if it can't be done. The button
   * that stands for `key` shows that it is waiting until the answer comes. */
  private _do(action: string, data: object = {}, key = action): Promise<boolean> {
    return this._busy.during(key, ask(this.hass, action, this.room, data)).then(
      () => (/^(queue_|play_media|stop)/.test(action) && this._stamp++, true),
      (err) => (this._say(reason(err)), false),
    );
  }

  /** For the queue, which asks through the player so that a refusal is said here. */
  private _ask = (action: string, data: object) => this._do(action, data);

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
    if (!group.rooms.includes(room)) return void this._do("join", { room }, `room:${room}`);
    if (group.rooms.length === 1) return this._say("That is the last room. Pause the music to stop it.");
    // Taking out the room this player follows: stay with the music, not the room.
    if (room === this.room) this.room = group.rooms.find((r) => r !== room)!;
    this._do("leave", { room }, `room:${room}`);
  }

  private async _play(favourite: Favourite, enqueue?: "next" | "add" | "replace") {
    this._menu = this._confirm = undefined;
    const done = await this._do("play_media", { media_content_id: favourite.media_content_id, media_content_type: favourite.media_content_type, ...(enqueue ? { enqueue } : {}) }, `fav:${favourite.media_content_id}`);
    const said = { next: "Playing next", add: "Added to the end" } as Record<string, string>;
    if (!done) return;
    this._say(`${said[enqueue ?? ""] ?? "Playing"}: ${favourite.title}`);
    // Search was opened from the queue, to add to it: back to the queue, to carry on.
    if (this._adding === "queue") [this._adding, this.tab] = [undefined, "queue"];
  }

  private _fold(folder: string) {
    this._folded = this._folded.includes(folder) ? this._folded.filter((f) => f !== folder) : [...this._folded, folder];
    try {
      localStorage.setItem(FOLDED, JSON.stringify(this._folded));
    } catch {
      // Not kept on this device: it still folds until the page is left.
    }
  }

  /** Open Search with an empty box, to add to the queue or to the playlist looked at. */
  private _add(to: "queue" | "playlist") {
    [this._adding, this.tab] = [to, "search"];
    this._fresh++;
  }

  /** Add a thing found to the end of the playlist being looked at, and go back to it. */
  private async _addToPlaylist(playlist: Favourite, found: Favourite) {
    const done = await this._do("playlist_add", { playlist: playlist.media_content_id, media_content_id: found.media_content_id, name: found.title.slice(0, 60) }, `fav:${found.media_content_id}`);
    if (!done) return;
    this._say(`Added to ${playlist.title}: ${found.title}`);
    [this._adding, this.tab] = [undefined, "favourites"];
    this._stamp++;
  }

  private _choose(group: Group, favourite: Favourite) {
    // A station plays at once and leaves the queue as it is; so does anything in a room
    // that is playing nothing. The rest is lined up, so there is a choice of where. A
    // Sonos playlist always has a choice: it can be deleted.
    // Adding to a playlist: there is only its end to add to, so nothing is asked.
    if (this._adding === "playlist" && this._viewing) this._addToPlaylist(this._viewing, favourite);
    else if (favourite.live || (group.kind === "nothing" && !favourite.playlist)) this._play(favourite);
    else this._menu = favourite;
  }

  private _tabs(group: Group) {
    const shown = this.tab ?? "rooms";
    return html`<div class="tabs">
      ${TABS.map(
        ([tab, label]) => html`<button class=${this.tab === tab ? "up" : shown === tab ? "shown" : ""} @click=${() => ([this._adding, this._viewing, this.tab] = [undefined, undefined, this.tab === tab ? undefined : tab])}>
          ${icon(tab)}${label}${tab === "rooms" && group.rooms.length > 1 ? html` (${group.rooms.length})` : nothing}
        </button>`,
      )}
    </div>`;
  }

  private _now(house: House, group: Group) {
    const { title, by } = playing(group);
    const at = position(group, Date.now());
    const on = group.state === "playing";
    const hush = muted(house, group);
    const queue = group.kind === "queue";
    const host = house.me === "host";
    const love = loved(group, Date.now());
    return html`<div class="now">
      <div class="bar">
        ${this._shut()}
        <div class="where"><small>Playing in</small><b>${names(house, group)}</b></div>
        ${group.party || host
          ? html`<button class="pill ${group.party ? "on" : ""} ${this._busy.on("party")}" @click=${() => (group.party ? (this._partying = true) : this._party(true))} aria-label=${group.party ? "The party lock is on" : "Turn the party lock on"}>
              ${icon("lock")}${group.party ? `Party on${host && group.party.undone.length ? ` · ${group.party.undone.length}` : ""}` : "Party"}
            </button>`
          : nothing}
      </div>
      ${shut(house, group) ? html`<p class="barred">A party is on: the music can't be changed from this screen.</p>` : nothing}
      <div class="cover">${art(this.hass, group.picture, title)}</div>
      <div class="title">
        <b>${title}</b><span>${by}</span>
        <!-- Love it or Loathe it's own thumbs, where it is installed: its bundle defines the
             element, and it shows nothing where this login can't rate. -->
        <casa-mia-thumbs quiet .hass=${this.hass} .entityId=${group.id}></casa-mia-thumbs>
        ${love ? html`<p class="love ${love.over ? "over" : ""}"><strong>Love it or Loathe it${love.over ? `, at ${clock(group.love!.at)}` : ""}:</strong> ${love.text}</p>` : nothing}
      </div>
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
        ${queue ? html`<button class="ib sm ${group.shuffle ? "on" : ""} ${this._busy.on("shuffle")}" @click=${() => this._do("shuffle", { on: !group.shuffle })} aria-label="Shuffle">${icon("shuffle")}</button>` : nothing}
        ${queue ? html`<button class="ib ${this._busy.on("previous")}" @click=${() => this._do("previous")} aria-label="Previous song">${icon("previous")}</button>` : nothing}
        <button class="ib play ${this._busy.on("play")}" ?disabled=${group.kind === "nothing"} @click=${() => this._do(on ? "pause" : "play", {}, "play")} aria-label=${on ? "Pause" : "Play"}>${icon(on ? "pause" : "play")}</button>
        ${queue ? html`<button class="ib ${this._busy.on("next")}" @click=${() => this._do("next")} aria-label="Next song">${icon("next")}</button>` : nothing}
        ${queue
          ? html`<button class="ib sm ${group.repeat === "off" ? "" : "on"} ${this._busy.on("repeat")}" @click=${() => this._do("repeat", { mode: REPEAT[group.repeat] })} aria-label="Repeat">
              ${icon("repeat")}${group.repeat === "one" ? html`<sup>1</sup>` : nothing}
            </button>`
          : nothing}
      </div>
      <div class="gvol ${hush ? "hush" : ""}">
        <button class="ib ${this._busy.on("group_mute")}" @click=${() => this._do("group_mute", { on: !hush })} aria-label=${hush ? "Unmute" : "Mute"} aria-pressed=${hush}>${icon(hush ? "muted" : "volume")}</button>
        <casa-mia-jukebox-slider .value=${average(house, group)} label="Volume" @jb-slide=${this._slide("group_volume", group.id)} @jb-set=${this._slide("group_volume", group.id)}></casa-mia-jukebox-slider>
        <button class="ib ${this._busy.on("stop")}" @click=${() => this._stop(house, group)} aria-label="Stop the music here and clear the player">${icon("stop")}</button>
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

  private async _party(on: boolean) {
    this._partying = false;
    if (await this._do("party", { on }, "party")) this._say(on ? "Party on. The queue, the rooms and the volume can only be changed from Jukebox." : "Party off. Other apps can change things again.");
  }

  private _songs(group: Group) {
    const songs = this._queued ?? (group.kind === "queue" ? group.queue_size : null);
    return songs ? (songs === 1 ? "The one song in the queue" : `The ${songs} songs in the queue`) : "Whatever is in the queue";
  }

  /** End the music here and give the rooms back to the quiet ones, after asking. */
  private _stop(house: House, group: Group) {
    const run = async () => (await this._do("stop", {}, "stop")) && !this.inline && this.remove();
    this._confirm = { warn: "This stops the music here", text: `${this._songs(group)} will go, and ${names(house, group)} will be listed with the quiet rooms again.`, keep: "Keep it", go: "Stop it", run };
  }

  private _clear(group: Group) {
    this._confirm = { warn: "This clears the whole queue", text: `${this._songs(group)} will go, and the music stops.`, keep: "Keep the queue", go: "Clear it", run: () => this._do("queue_clear") };
  }

  private _save = async (e: SubmitEvent) => {
    e.preventDefault();
    const name = String(new FormData(e.target as HTMLFormElement).get("name") ?? "").trim();
    if (!name) return;
    // A name that a playlist already has: Sonos would keep two of them, so ask which.
    const same = this._playlists().find((p) => p.title.toLowerCase() === name.toLowerCase());
    if (same) return void this._over(same);
    this._naming = false;
    if (!(await this._do("queue_save", { name }))) return;
    this._say(`Saved as a playlist: ${name}`);
    this._favourites = undefined; // asked for again when they are next shown
  };

  /** The Sonos playlists, once the favourites have been fetched. */
  private _playlists() {
    return Array.isArray(this._favourites) ? this._favourites.filter((f) => f.playlist) : [];
  }

  /** Save the queue in place of a playlist's songs, after asking with both counts: the
   * playlist's songs can't be got back. */
  private async _over(playlist: Favourite) {
    this._naming = false;
    const count = (n: number) => (n === 1 ? "1 song" : `${n} songs`);
    const holds = await queue(this.hass, this.room, playlist.media_content_id).then(
      (found) => found.total,
      () => undefined, // asked about all the same, without the count
    );
    const run = async () => (await this._do("queue_save", { playlist: playlist.media_content_id })) && this._say(`Saved over the playlist: ${playlist.title}`);
    const now = holds === undefined ? "" : ` holds ${count(holds)} now. It`;
    const queued = this._queued ? count(this._queued) : "songs";
    this._confirm = { warn: "This replaces the playlist", text: `"${playlist.title}"${now} will hold the queue's ${queued} instead, and what it held can't be got back.`, keep: "Keep the playlist", go: "Replace it", run };
  }

  /** The playlists the queue can be saved over, the one it came from first. */
  private _overs(group: Group) {
    if (this._favourites === undefined) return html`<p class="or">Fetching the playlists you have…</p>`;
    const from = (p: Favourite) => p.media_content_id === group.source;
    const lists = this._playlists().sort((a, b) => Number(from(b)) - Number(from(a)));
    if (!lists.length) return nothing;
    return html`<p class="or">Or save it over a playlist you have:</p>
      <div class="acts over">${lists.map((p) => html`<button type="button" @click=${() => this._over(p)}>${from(p) ? html`Save back to <strong>${p.title}</strong>` : p.title}</button>`)}</div>`;
  }

  private _delete(playlist: Favourite) {
    const run = async () => {
      if (!(await this._do("playlist_delete", { media_content_id: playlist.media_content_id }, `fav:${playlist.media_content_id}`))) return;
      if (Array.isArray(this._favourites)) this._favourites = this._favourites.filter((f) => f !== playlist);
      this._say(`Deleted: ${playlist.title}`);
    };
    this._menu = undefined;
    this._confirm = { warn: "This deletes the playlist", text: `"${playlist.title}" will be gone from Sonos for good. The queue is left as it is.`, keep: "Keep the playlist", go: "Delete it", run };
  }

  private _waiting = (key: string) => this._busy.on(key);

  private _search(group: Group) {
    const adding = this._adding === "playlist" && this._viewing;
    const head = adding
      ? this._head(`Add to ${adding.title}`, "Press + beside a song or an album to add it to the end of the playlist.")
      : this._adding === "queue"
        ? this._head("Add to the queue", "Press + beside what you find to play it next or add it to the end.")
        : this._head("Search", "The music library and Spotify. Press + to play something or add it to the queue.");
    return html`${head}
      <div class="scroll">
        <casa-mia-jukebox-find .hass=${this.hass} .room=${group.id} .fresh=${this._fresh} .waiting=${this._waiting} .changes=${this._busy.changes} @jb-choose=${(e: CustomEvent) => this._choose(group, e.detail)}></casa-mia-jukebox-find>
      </div>`;
  }

  private _queue(group: Group) {
    const none = this._queued === 0;
    return html`${this._head("Queue", "Tap a song to play it. Drag one by its handle to move it.")}
      ${group.kind !== "queue" && !none
        ? html`<div class="tools"><button class="go ${this._busy.on("queue_play")}" @click=${() => this._do("queue_play", { value: 1 })}>${icon("play")}Play the queue${group.kind === "radio" ? " in place of the radio" : ""}</button></div>`
        : nothing}
      <div class="tools">
        <button @click=${() => this._add("queue")}>${icon("plus")}Add</button>
        ${this._house?.me === "host" ? html`<button class=${this._busy.on("queue_save")} ?disabled=${none} @click=${() => (this._naming = true)}>${icon("save")}Save as a playlist</button>` : nothing}
        <button class=${this._busy.on("queue_clear")} ?disabled=${none} @click=${() => this._clear(group)}>${icon("trash")}Clear the queue</button>
      </div>
      <div class="scroll"><casa-mia-jukebox-queue .hass=${this.hass} .group=${group} .do=${this._ask} .stamp=${this._stamp} @jb-queued=${(e: CustomEvent) => (this._queued = e.detail)}></casa-mia-jukebox-queue></div>`;
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
      const mute = `mute:${id}`;
      return html`<div class="room ${inn ? "in" : ""} ${room.muted ? "hush" : ""}">
        <button class="tick ${this._busy.on(`room:${id}`)}" ?disabled=${!room.available} @click=${() => this._toggleRoom(group, id)} aria-label=${inn ? `Take ${room.name} out` : `Add ${room.name}`}>${icon(inn ? "check" : "plus")}</button>
        <button class="t" ?disabled=${!room.available} @click=${() => this._toggleRoom(group, id)}><b>${room.name}</b><small>${note}</small></button>
        ${inn && room.volume !== null
          ? html`<button class="ib mute ${this._busy.on(mute)}" @click=${() => this._busy.during(mute, ask(this.hass, "mute", id, { on: !room.muted })).catch((err) => this._say(reason(err)))} aria-label=${room.muted ? `Unmute ${room.name}` : `Mute ${room.name}`} aria-pressed=${room.muted}>${icon(room.muted ? "muted" : "volume")}</button><casa-mia-jukebox-slider .value=${room.volume} label="${room.name} volume" @jb-slide=${this._slide("volume", id)} @jb-set=${this._slide("volume", id)}></casa-mia-jukebox-slider><output>${room.volume}</output>`
          : nothing}
      </div>`;
    };
    return html`${this._head("Rooms", "Tap a room to add it or take it out. Each has its own volume.")}
      <div class="scroll">${[...group.rooms, ...others].map(row)}</div>`;
  }

  private _favouritesPanel(group: Group) {
    const found = this._favourites;
    const folders = Array.isArray(found) ? [...new Set(found.map((f) => f.folder))] : [];
    const tile = (f: Favourite) => html`<button class=${this._busy.on(`fav:${f.media_content_id}`)} @click=${() => this._choose(group, f)}>${art(this.hass, f.picture, f.title)}<b>${f.title}</b></button>`;
    const viewing = this._viewing;
    if (viewing) {
      // A playlist's songs, to see what is in it before it is played. The people who
      // may change playlists can move, take out and add; anyone else only looks.
      const host = this._house?.me === "host";
      return html`${this._head(viewing.title, host ? "Drag a song by its handle to move it, or take it out with the cross." : "The songs in this playlist.")}
        <div class="tools">
          <button @click=${() => (this._viewing = undefined)}>${icon("back")}Favourites</button>
          <button @click=${() => (this._menu = viewing)}>${icon("play")}Play…</button>
          ${host ? html`<button @click=${() => this._add("playlist")}>${icon("plus")}Add</button>` : nothing}
        </div>
        <div class="scroll"><casa-mia-jukebox-queue .hass=${this.hass} .group=${group} .playlist=${viewing.media_content_id} .locked=${!host} .do=${this._ask} .stamp=${this._stamp}></casa-mia-jukebox-queue></div>`;
    }
    return html`${this._head("Favourites", "The stations, playlists and songs saved in Sonos")}
      <div class="scroll">
        ${found === undefined
          ? html`<p class="empty">Fetching them from the speaker…</p>`
          : typeof found === "string"
            ? html`<p class="empty">The favourites couldn't be fetched: ${found}</p>`
            : found.length
              ? folders.map((folder) => {
                  const inside = found.filter((f) => f.folder === folder);
                  const shut = this._folded.includes(folder);
                  return html`<h3><button class="fold" aria-expanded=${!shut} @click=${() => this._fold(folder)}>${icon(shut ? "chevron" : "down")}${folder} (${inside.length})</button></h3>
                    ${shut ? nothing : html`<div class="tiles">${inside.map(tile)}</div>`}`;
                })
              : html`<p class="empty">There are no favourites saved in Sonos yet.</p>`}
      </div>`;
  }

  /** What is asked before anything is done: where a favourite goes in the queue, a name for
   * a playlist, and once more, in large letters, before something that can't be undone. */
  private _sheets(house: House, group: Group) {
    const { _menu: menu, _confirm: sure } = this;
    if (sure)
      return html`<div class="veil">
        <div class="sheet" role="alertdialog" aria-label=${sure.warn}>
          <p class="warn">${sure.warn}</p>
          <p>${sure.text}</p>
          <div class="acts">
            <button class="main" @click=${() => (this._confirm = undefined)}>${sure.keep}</button>
            <button class="danger" @click=${() => ((this._confirm = undefined), sure.run())}>${sure.go}</button>
          </div>
        </div>
      </div>`;
    if (this._partying && group.party) {
      const party = group.party;
      return html`<div class="veil" @click=${(e: Event) => e.target === e.currentTarget && (this._partying = false)}>
        <div class="sheet" role="dialog" aria-label="The party lock">
          <h4>The party is on, since ${clock(party.since)}</h4>
          <p>The queue, the rooms and their volumes can only be changed from Jukebox. Anything changed another way, such as from the Sonos app, is put back.</p>
          ${party.unwatched ? html`<p class="lost">A song moved in another app isn't being noticed, since ${clock(party.unwatched)}: the speaker isn't reporting its queue. Songs added or taken out are still put back.</p>` : nothing}
          ${party.undone.length
            ? html`<ul class="undone">${party.undone.map((u) => html`<li class=${u.failed ? "failed" : ""}><time>${clock(u.at)}</time>${u.failed ? u.what : `Put back: ${u.what.replace(/^Someone/, "someone")}`}</li>`)}</ul>`
            : html`<p>Nothing has had to be put back.</p>`}
          ${house.me === "host"
            ? html`<button class="switch ${this._busy.on("party_open")}" role="switch" aria-checked=${party.open} @click=${() => this._do("party_open", { on: !party.open })}>
                  <span><b>Let the wall tablets change the music</b><small>${party.open ? "They can, until you turn this off or the party ends." : "Only the people who run the party can."}</small></span><i></i>
                </button>
                <div class="acts">
                  <button class="main" @click=${() => (this._partying = false)}>Keep the party going</button>
                  <button class="danger" @click=${() => this._party(false)}>End the party</button>
                </div>`
            : html`<p>${shut(house, group) ? "The music can't be changed from this screen." : "This screen has been let to change the music."} Only the people who run the party can end it.</p>
                <div class="acts"><button class="main" @click=${() => (this._partying = false)}>Close</button></div>`}
        </div>
      </div>`;
    }
    if (this._naming)
      return html`<div class="veil" @click=${(e: Event) => e.target === e.currentTarget && (this._naming = false)}>
        <form class="sheet" aria-label="Save the queue as a playlist" @submit=${this._save}>
          <h4>Save the queue as a playlist</h4>
          <p>It is kept in Sonos, and is listed with the favourites.</p>
          <input name="name" maxlength="60" required autocomplete="off" placeholder="A name for the playlist" aria-label="A name for the playlist" />
          <div class="acts">
            <button class="main" type="submit">Save</button>
            <button type="button" @click=${() => (this._naming = false)}>Cancel</button>
          </div>
          ${this._overs(group)}
        </form>
      </div>`;
    if (menu) {
      const replace = { warn: "This replaces the whole queue", text: `${this._songs(group)} will go, and "${menu.title}" will start now.`, keep: "Keep the queue", go: "Replace it", run: () => void this._play(menu, "replace") };
      return html`<div class="veil" @click=${(e: Event) => e.target === e.currentTarget && (this._menu = undefined)}>
        <div class="sheet" role="dialog" aria-label=${menu.title}>
          <h4>${menu.title}</h4>
          <p>${menu.folder}</p>
          <div class="acts">
            ${group.kind === "nothing"
              ? html`<button class="main" @click=${() => this._play(menu)}>Play now</button>`
              : html`<button class="main" @click=${() => this._play(menu, "next")}>Play next</button>
                  <button @click=${() => this._play(menu, "add")}>Add to the end of the queue</button>
                  <button class="danger sep" @click=${() => ([this._menu, this._confirm] = [undefined, replace])}>Play now and replace the queue…</button>`}
            ${menu.playlist && this._viewing !== menu ? html`<button class="sep" @click=${() => ([this._menu, this._viewing, this.tab] = [undefined, menu, "favourites"])}>See what is in it</button>` : nothing}
            ${menu.playlist && house.me === "host" ? html`<button class="danger sep" @click=${() => this._delete(menu)}>Delete this playlist…</button>` : nothing}
          </div>
        </div>
      </div>`;
    }
    return nothing;
  }

  render() {
    const house = this._house;
    const group = house && groupOf(house, this.room);
    if (!house || !group) {
      // Not known yet, refused, or the room has stopped answering: say which, with a way out.
      const why = this._why ?? (house ? "This room's speaker isn't answering." : "Asking Home Assistant what is playing…");
      return html`<div class="big"><div class="now"><div class="bar">${this._shut()}</div><p class="empty">${why}</p></div></div>`;
    }
    const shown = this.tab ?? "rooms";
    const [a, b] = colours(playing(group).title);
    const picture = group.picture ? `--pic:url('${(this.hass.hassUrl?.(group.picture) ?? group.picture).replace(/'/g, "%27")}');` : "";
    return html`<div class="big" style="--a:${a};--b:${b};${picture}">
      ${this._now(house, group)}
      <div class="side ${this.tab ? "up" : ""}">${this._tabs(group)}${shown === "queue" ? this._queue(group) : shown === "rooms" ? this._rooms(house, group) : shown === "search" ? this._search(group) : this._favouritesPanel(group)}</div>
      ${this._sheets(house, group)}
      <div class="toast ${this._toast ? "on" : ""}" role="status">${this._toast}</div>
    </div>`;
  }

  static styles = [
    shared,
    css`
      /* Its own width decides its layout, not the screen's: it may be over the whole screen,
         or in a card of any size. */
      :host { position: fixed; inset: 0; z-index: 1000; container-type: inline-size; font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .big { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 1fr); overflow: clip; background: #111; color: #fff; --muted: rgb(255 255 255 / 66%); --line: rgb(255 255 255 / 14%); --jb-fill: #fff; --jb-glow: #fff; --jb-track: rgb(255 255 255 / 22%); animation: up 0.28s ease-out; }
      /* Clipped, not hidden: a hidden box can still be scrolled (a tap brings its target into
         view), and the light behind the player overflows it on purpose. */
      .big::before { content: ""; position: absolute; inset: -60px; background: var(--pic, conic-gradient(from 200deg at 60% 40%, var(--a), var(--b), var(--a))) center / cover; filter: blur(50px) saturate(1.3); }
      .big::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgb(0 0 0 / 30%), rgb(0 0 0 / 72%)); }
      /* The one column is no wider than the screen. Left to itself it grows to fit a long
         title, which may not wrap, and the buttons go off the right edge with it. */
      .big > * { position: relative; z-index: 1; min-width: 0; min-height: 0; }
      @keyframes up { from { transform: translateY(40px); opacity: 0; } }
      .now { display: flex; flex-direction: column; gap: 12px; padding: max(12px, env(safe-area-inset-top)) 22px max(14px, env(safe-area-inset-bottom)); }
      .bar { display: flex; align-items: center; gap: 8px; }
      .where { flex: 1; min-width: 0; text-align: center; }
      .pill { display: flex; align-items: center; gap: 5px; flex: none; padding: 8px 12px 8px 9px; border-radius: 999px; background: rgb(255 255 255 / 14%); font-size: 12px; font-weight: 700; }
      .pill svg { width: 16px; height: 16px; }
      .pill.on { background: #fff; color: #111; }
      .where small { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
      .where b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      /* The artwork is a square that fits the space left for it, whichever way that space is
         the narrower, and the picture is shown whole inside it, never cropped. */
      .cover { flex: 1; min-height: 0; display: grid; place-items: center; container-type: size; }
      .cover .art { width: min(100cqw, 100cqh, 380px); border-radius: 18px; box-shadow: 0 20px 50px rgb(0 0 0 / 50%); }
      .cover .art:has(img) { overflow: visible; background: none; box-shadow: none; }
      .cover .art:has(img) i { display: none; }
      .cover .art img { object-fit: contain; border-radius: 18px; filter: drop-shadow(0 16px 30px rgb(0 0 0 / 50%)); }
      .title { text-align: center; }
      /* Two lines at most: enough to tell one version of a song from another, and no title
         can squeeze the artwork. */
      .title b { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 21px; line-height: 1.2; overflow-wrap: anywhere; text-wrap: balance; }
      .title span { color: var(--muted); }
      .title casa-mia-thumbs { display: flex; justify-content: center; --secondary-text-color: rgb(255 255 255 / 66%); --secondary-background-color: rgb(255 255 255 / 12%); }
      .love { margin: 6px 0 0; font-size: 12.5px; line-height: 1.35; color: #fff; overflow-wrap: anywhere; }
      .love.over { color: var(--muted); }
      .barred { margin: 0; padding: 8px 12px; border-radius: 12px; background: rgb(255 255 255 / 12%); font-size: 13px; text-align: center; }
      .switch { display: flex; align-items: center; gap: 12px; width: 100%; margin: 0 0 14px; padding: 12px 14px; border-radius: 14px; background: rgb(255 255 255 / 8%); text-align: left; }
      .switch span { flex: 1; min-width: 0; }
      .switch small { display: block; color: rgb(255 255 255 / 70%); }
      .switch i { position: relative; flex: none; width: 44px; height: 26px; border-radius: 999px; background: rgb(255 255 255 / 25%); transition: background 0.15s; }
      .switch i::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: translate 0.15s; }
      .switch[aria-checked="true"] i { background: #3fae5a; }
      .switch[aria-checked="true"] i::after { translate: 18px; }
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
      .gvol .ib:first-child { margin: 0 -11px; }
      .room .mute { justify-self: center; color: var(--muted); }
      .room .mute svg { width: 20px; height: 20px; }
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
      .tools { display: flex; gap: 8px; padding: 0 12px 8px; }
      .tools button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 12px; background: rgb(255 255 255 / 10%); font-size: 13px; font-weight: 600; }
      .tools svg { width: 18px; height: 18px; flex: none; }
      .tools .go { background: #fff; color: #111; }
      .fold { display: flex; align-items: center; gap: 4px; width: 100%; min-height: 36px; text-transform: inherit; letter-spacing: inherit; }
      .fold svg { width: 18px; height: 18px; }
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
      .sheet input { display: block; width: 100%; margin: 0 0 14px; padding: 13px 14px; border: 1px solid var(--line); border-radius: 14px; background: rgb(255 255 255 / 8%); color: #fff; font: inherit; font-size: 16px; }
      .sheet .lost, .undone .failed { color: #ff9a8f; }
      .undone { max-height: 34vh; margin: 0 0 14px; padding: 0; overflow: auto; list-style: none; }
      .undone li { display: flex; gap: 10px; padding: 7px 0; border-top: 1px solid var(--line); font-size: 13px; overflow-wrap: anywhere; }
      .undone time { flex: none; color: var(--muted); font-variant-numeric: tabular-nums; }
      .sheet .warn { margin: 0 0 10px; color: #ff6b5e; font-size: 30px; font-weight: 900; line-height: 1.05; text-transform: uppercase; }
      .acts { display: grid; gap: 8px; }
      .acts button { padding: 14px; border-radius: 14px; background: rgb(255 255 255 / 10%); font-size: 15px; font-weight: 700; text-align: center; }
      .acts button:hover { background: rgb(255 255 255 / 18%); }
      .acts .main { background: #fff; color: #111; }
      .acts .danger { background: none; border: 1px solid #ff6b5e; color: #ff6b5e; }
      .acts .sep { margin-top: 10px; }
      .sheet .or { margin: 16px 0 8px; }
      .over { max-height: 32vh; overflow: auto; }
      .toast { position: absolute; left: 14px; right: 14px; bottom: 18px; z-index: 6; margin: 0 auto; width: fit-content; max-width: calc(100% - 28px); padding: 11px 16px; border-radius: 14px; background: #fff; color: #111; font-weight: 600; overflow-wrap: anywhere; box-shadow: 0 10px 30px rgb(0 0 0 / 45%); opacity: 0; transform: translateY(12px); transition: 0.25s; pointer-events: none; }
      .toast.on { opacity: 1; transform: none; }
      /* Out of the way of a question's buttons. */
      .veil ~ .toast { top: max(18px, env(safe-area-inset-top)); bottom: auto; }

      /* A wide screen (a wall tablet): the rooms and favourites sit beside the player. */
      /* In a dashboard card (the Now playing card): in place, the size the card is given. */
      :host([inline]) { position: relative; inset: auto; z-index: 0; display: block; height: 100%; min-height: 560px; overflow: hidden; border-radius: var(--ha-card-border-radius, 18px); }
      :host([inline]) .big { animation: none; }

      @container (min-width: 900px) {
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
