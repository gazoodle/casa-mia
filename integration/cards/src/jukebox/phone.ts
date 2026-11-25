// This device as one more room of Jukebox: a phone, a tablet or a computer, heard through
// its own earbuds or speaker. Home Assistant knows nothing of this room. The page puts it
// into the house it is sent (`within`), answers for it whatever is asked of a room
// (`do`, `queue`), keeps its queue (lineup.ts) and plays it (sound.ts). So the players,
// the queue, favourites and search work here as they do for a Sonos room, through
// common.ts, which sends this room's requests here.
//
// What the page can't do by itself it asks Jukebox for (the integration's phone.py): the
// songs of a favourite or a playlist, where a library song or a station is fetched from,
// and the sign-in for Spotify's player.
//
// The queue is kept on the device, so it is there when the page is opened again. The
// phone's own volume buttons set how loud it is: a page can't on an iPhone.
import type { Favourite, Group, House, Song } from "./common.ts";
import { EMPTY, type Lineup, type Track, after, before, move, put, remove } from "./lineup.ts";
import { Sound, type Told } from "./sound.ts";

/** The room's id, where a Sonos room has its entity's. */
export const PHONE = "this_device";
const DOMAIN = "casa_mia_jukebox";
/** Where this device keeps its queue. */
const KEPT = "casa-mia-jukebox-phone";
/** How many songs in a row may fail before the music stops, not skips on. */
const FAILS = 3;
/** Previous goes to the start of the song when it is further in than this, in seconds. */
const RESTART = 3;
/** What can't be asked of this room, and why, for the player to say. */
const REFUSED: Record<string, string> = {
  volume: "Use this device's own volume buttons",
  group_volume: "Use this device's own volume buttons",
  mute: "Use this device's own volume buttons",
  group_mute: "Use this device's own volume buttons",
  join: "This device plays by itself, and can't be joined to the Sonos rooms",
  leave: "This device plays by itself",
  party: "A party is for the Sonos rooms",
  party_open: "A party is for the Sonos rooms",
  queue_save: "This device's queue can't be saved as a Sonos playlist",
};
type Asking = { connection?: any; [key: string]: any };

/** What to call the room, from what the device says it is. */
function called(): string {
  const says = navigator.userAgent;
  if (/iPhone|iPod|Android.+Mobile/.test(says)) return "This phone";
  // An iPad says it is a Mac, but a Mac has no touch screen.
  if (/iPad|Android/.test(says) || (/Macintosh/.test(says) && navigator.maxTouchPoints > 1)) return "This tablet";
  return "This computer";
}

/** The queue as it was left on this device, if it was and still reads as one. */
function kept(): { line: Lineup; station?: Track } {
  try {
    const was = JSON.parse(localStorage.getItem(KEPT) ?? "null");
    const whole = Array.isArray(was?.line?.songs) && was.line.songs.every((s: Track) => typeof s?.uri === "string") && typeof was.line.at === "number";
    if (whole && was.line.at < was.line.songs.length) return { line: { ...EMPTY, ...was.line }, station: typeof was.station?.uri === "string" ? was.station : undefined };
  } catch {
    // A browser that keeps nothing (a private window): the queue lasts as long as the page.
  }
  return { line: EMPTY };
}

const reason = (err: any): string => err?.message ?? String(err);

class Phone {
  private _line: Lineup;
  /** A station that is on: it plays in place of the queue, which is left as it is. */
  private _station?: Track;
  /** What the player last said, and when (ms). */
  private _told: Told & { at: number } = { playing: false, position: 0, duration: null, at: 0 };
  /** Said on the players until something else is asked: a song that couldn't be played. */
  private _trouble = "";
  /** Said while something takes a while. */
  private _note = "";
  private _hass?: Asking;
  /** The house as Jukebox last sent it, without this room. */
  private _house?: House;
  private _heard = new Set<() => void>();
  /** Goes up at each song started, so what an earlier start was waiting for is dropped. */
  private _serial = 0;
  /** The start that is a second try, and the start whose failure has been dealt with. */
  private _retried = 0;
  private _failed = 0;
  /** How many songs in a row have failed. */
  private _fails = 0;
  private _token?: { token: string; until: number };
  /** What the page has listed, by its address: a song asked for by its address alone is
   * then known by its title and picture. */
  private _seen = new Map<string, Favourite>();
  private _sound: Sound;
  private _session = false;

  constructor() {
    ({ line: this._line, station: this._station } = kept());
    this._sound = new Sound(
      {
        told: (now) => this._heardTold(now),
        ended: () => this._advance(true),
        failed: (why) => this._cant(why),
        lost: (why) => this._lost(why),
        note: (text) => ((this._note = text), this._changed()),
      },
      () => this._spotifyToken(),
    );
  }

  /** Be told whenever this room changes, until what this returns is called. */
  listen(heard: () => void): () => void {
    this._heard.add(heard);
    return () => void this._heard.delete(heard);
  }

  private _changed(): void {
    for (const heard of this._heard) heard();
  }

  private _save(): void {
    try {
      localStorage.setItem(KEPT, JSON.stringify({ line: this._line, station: this._station }));
    } catch {
      // Not kept on this device: see `kept`.
    }
  }

  /** The house with this room in it. A screen that is the house's own (a wall tablet)
   * isn't offered itself as a room: it is for whoever holds the device. */
  within(house: House): House {
    this._house = house;
    const group = this._group();
    if (group.quiet && house.me === "screen") return house;
    const rooms = { ...house.rooms, [PHONE]: { name: called(), volume: null, muted: false, available: true } };
    return { ...house, rooms, groups: group.quiet ? [...house.groups, group] : [group, ...house.groups] };
  }

  /** A Sonos room that is answering, to ask through: the favourites, the library and a
   * playlist's songs are read from a speaker. Empty when there is none. */
  speaker(): string {
    const rooms = this._house?.rooms ?? {};
    return Object.keys(rooms).find((room) => rooms[room].available) ?? "";
  }

  /** Remember what the page listed (see `_seen`). */
  seen(items: Favourite[]): void {
    // ponytail: forgotten all at once when there are very many, not the oldest first.
    if (this._seen.size > 2000) this._seen.clear();
    for (const item of items) this._seen.set(item.media_content_id, item);
  }

  /** This room was opened or asked something: have Spotify's player ready, where this
   * login may have it, so that the tap that plays the first song can let it sound. */
  wake(hass: Asking): void {
    this._hass = hass;
    // A failure here is said when a song from Spotify is asked for, which tries again.
    if (this._house?.spotify) this._sound.ready().catch(() => undefined);
  }

  private _current(): Track | undefined {
    return this._station ?? this._line.songs[this._line.at];
  }

  /** How far into the song the player is now, in seconds. */
  private _position(): number {
    return this._told.position + (this._told.playing ? Math.max(0, (Date.now() - this._told.at) / 1000) : 0);
  }

  private _group(): Group {
    const [track, told, line] = [this._current(), this._told, this._line];
    const kind = this._station ? "radio" : track ? "queue" : "nothing";
    return {
      id: PHONE,
      rooms: [PHONE],
      state: told.playing ? "playing" : "paused",
      kind,
      quiet: kind === "nothing",
      title: this._station ? "" : (track?.title ?? ""),
      artist: this._station ? "" : (track?.artist ?? ""),
      album: this._station ? "" : (track?.album ?? ""),
      channel: this._station?.title ?? "",
      picture: track?.picture ?? null,
      duration: this._station ? null : (told.duration ?? track?.duration ?? null),
      position: this._station ? null : told.position,
      position_at: new Date(told.at || Date.now()).toISOString(),
      shuffle: line.shuffle,
      repeat: line.repeat,
      queue_size: line.songs.length,
      queue_position: line.at + 1,
      party: null,
      love: null,
      trouble: this._trouble || this._note || undefined,
    };
  }

  /** This room's queue, as a speaker's is listed. */
  queue(): Promise<{ songs: Song[]; total: number }> {
    return Promise.resolve({ songs: this._line.songs, total: this._line.songs.length });
  }

  /** Do one thing asked of this room, as Jukebox does for a Sonos room. Rejects with
   * the reason. Called in the tap that asked, which is what lets a browser start sound. */
  do(hass: Asking, action: string, data: any = {}): Promise<unknown> {
    this._hass = hass;
    this._sound.unlock();
    this._trouble = "";
    const act = this._acts[action];
    if (!act) return Promise.reject(new Error(REFUSED[action] ?? "That can't be done on this device"));
    return Promise.resolve()
      .then(() => act(data))
      .finally(() => (this._save(), this._changed()));
  }

  private _acts: Record<string, (data: any) => unknown> = {
    play: () => this._resume(),
    pause: () => this._sound.pause(),
    next: () => {
      if (this._station) throw new Error("A station has no next song");
      return this._go(after(this._line, false));
    },
    previous: () => (this._position() > RESTART ? this._seek(0) : this._go(before(this._line))),
    seek: (data) => this._seek(Number(data.value)),
    shuffle: (data) => void (this._line = { ...this._line, shuffle: !!data.on }),
    repeat: (data) => void (this._line = { ...this._line, repeat: data.mode }),
    play_media: (data) => this._add(data, data.enqueue),
    queue_add: (data) => this._add(data, "add", data.to),
    queue_play: (data) => this._go(Number(data.value) - 1),
    queue_move: (data) => void (this._line = move(this._line, Number(data.value), Number(data.to))),
    queue_remove: (data) => {
      const [line, playing] = remove(this._line, Number(data.value));
      this._line = line;
      // The song that was playing has gone: the one after it plays, if anything was.
      if (playing && !this._station && this._told.playing) return this._go(line.at < 0 ? null : line.at);
      if (playing && !this._station) this._rest();
    },
    queue_clear: () => {
      this._line = { ...this._line, songs: [], at: -1 };
      if (!this._station) this._rest();
    },
    stop: () => {
      [this._line, this._station] = [{ ...this._line, songs: [], at: -1 }, undefined];
      this._rest();
    },
  };

  private _send(message: object): Promise<any> {
    return this._hass!.connection.sendMessagePromise(message);
  }

  /** Something chosen to play: its songs are asked for, and go where `where` says. A
   * station plays now, in place of the queue, which is left as it is. */
  private async _add(data: any, where?: string, to?: number): Promise<void> {
    const room = this.speaker();
    if (!room) throw new Error("No Sonos speaker is answering, and the music is listed by one");
    const about = this._seen.get(data.media_content_id);
    const found: { songs: Track[]; left_out: number } = await this._send({
      type: `${DOMAIN}/phone/songs`,
      entity_id: room,
      media_content_id: data.media_content_id,
      media_content_type: data.media_content_type,
      name: about?.title ?? data.name ?? "",
      by: about?.by ?? "",
    });
    // One thing with no picture of its own takes the picture it was listed with.
    if (found.songs.length === 1) found.songs[0].picture ??= about?.picture ?? null;

    const first = found.songs[0];
    if (first.live) {
      this._station = first;
      await this._start(first);
    } else {
      const [line, start] = put(this._line, found.songs, where, to);
      this._line = line;
      if (start) {
        this._station = undefined;
        await this._start(line.songs[line.at]);
      }
    }
    const left = found.left_out;
    // Beside anything the first song has already said of itself.
    if (left) this._trouble = `${this._trouble} ${left === 1 ? "One of its songs is" : `${left} of its songs are`} from another music service, and couldn't be added.`.trim();
  }

  /** Play song number `index` of the queue, counted from 0; none is the queue's end. */
  private _go(index: number | null): Promise<void> | void {
    if (index === null || !this._line.songs[index]) return this._rest();
    [this._line, this._station] = [{ ...this._line, at: index }, undefined];
    return this._start(this._line.songs[index]);
  }

  /** Nothing sounding, and the queue back at its first song. */
  private _rest(): void {
    this._sound.stop();
    this._serial++;
    this._line = { ...this._line, at: this._line.songs.length ? 0 : -1 };
    this._told = { playing: false, position: 0, duration: null, at: Date.now() };
    this._note = "";
  }

  private async _resume(): Promise<void> {
    const track = this._current();
    if (!track) throw new Error("There is nothing to play. Choose something from Favourites or Search.");
    // Nothing is loaded when the page has been opened again: the song is started, from
    // where it was.
    if (!this._sound.on) return this._start(track, track.live ? 0 : this._told.position);
    await this._sound.resume(track.uri, this._told.position);
  }

  private async _seek(seconds: number): Promise<void> {
    await this._sound.seek(seconds);
    this._told = { ...this._told, position: seconds, at: Date.now() };
  }

  /** Start a song, from `from` seconds in. Rejects with the reason when it can't even
   * be asked for; a file or stream that then won't play says so through `_cant`. */
  private async _start(track: Track, from = 0): Promise<void> {
    const mine = ++this._serial;
    this._note = "";
    this._told = { playing: false, position: from, duration: track.duration, at: Date.now() };
    this._save();
    this._changed();

    if (track.uri.startsWith("spotify:")) await this._sound.spotify(track.uri, from);
    else {
      const { url } = await this._send({ type: `${DOMAIN}/phone/address`, uri: track.uri, secure: location.protocol === "https:" });
      if (mine !== this._serial) return; // something else was asked for meanwhile
      await this._sound.audio(url.startsWith("/") ? (this._hass!.hassUrl?.(url) ?? url) : url, from);
    }
    if (mine === this._serial) this._lockScreen(track);
  }

  /** The player said where it is. Spotify's also says what the song is, which fills in
   * what the queue didn't know of it. */
  private _heardTold(now: Told): void {
    this._told = { ...now, at: Date.now() };
    if (now.playing) [this._fails, this._note] = [0, ""];
    const track = this._current();
    if (track && !track.live) {
      const said: Partial<Track> = { title: now.title || track.title, artist: now.artist || track.artist, album: now.album || track.album, picture: track.picture ?? now.picture, duration: track.duration ?? now.duration };
      if ((Object.keys(said) as (keyof Track)[]).some((key) => said[key] !== track[key])) {
        Object.assign(track, said);
        this._save();
        this._lockScreen(track);
      }
    }
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = now.playing ? "playing" : "paused";
    this._changed();
  }

  /** The song ended, or can't be played: on to the next, or to rest at the queue's end. */
  private _advance(ended: boolean): void {
    if (this._station) return this._lost("The station's stream ended. Press play to start it again.");
    const next = after(this._line, ended);
    Promise.resolve()
      .then(() => this._go(next))
      .catch((err) => this._cant(reason(err)))
      .finally(() => (this._save(), this._changed()));
  }

  /** This song can't be played, said by a player or by its start. Tried once more from
   * where it was (a link to a file runs out), then said, and the next song is tried,
   * unless too many in a row have failed. */
  private _cant(why: string): void {
    const track = this._current();
    if (!track || this._failed === this._serial) return;
    if (this._retried !== this._serial && !track.uri.startsWith("spotify:") && this._told.position > 0) {
      // The second start has a number of its own, which is the one not to try again.
      this._retried = this._serial + 1;
      this._start(track, track.live ? 0 : this._position()).catch((err) => this._cant(reason(err)));
      return;
    }
    this._failed = this._serial;
    const name = track.title ? `“${track.title}”` : "This song";
    this._trouble = `${name} couldn't be played: ${why.replace(/\.$/, "")}.`;
    if (track.live || ++this._fails >= FAILS) {
      if (!track.live) this._trouble += ` Stopped, as ${FAILS} songs in a row couldn't be played.`;
      this._sound.stop();
      this._told = { ...this._told, playing: false, at: Date.now() };
      return this._changed();
    }
    this._advance(false);
  }

  /** The sound has stopped for a reason that isn't the song's: said, and nothing skipped. */
  private _lost(why: string): void {
    [this._trouble, this._note] = [why, ""];
    this._told = { ...this._told, position: this._position(), playing: false, at: Date.now() };
    this._changed();
  }

  /** The phone's lock screen and the buttons on its earbuds: what is playing, and what
   * the buttons do. Without this they would work the phone's own player on one song,
   * not Jukebox's queue (measured, 2026-11-24). */
  private _lockScreen(track: Track): void {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    const picture = track.picture ? [{ src: new URL(track.picture, location.href).href }] : [];
    session.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: track.live ? "Radio" : track.album, artwork: picture });
    if (this._session) return;
    this._session = true;
    const ask = (action: string) => (details: MediaSessionActionDetails) => void this.do(this._hass!, action, { value: details.seekTime }).catch((err) => this._lost(reason(err)));
    for (const [button, action] of [["play", "play"], ["pause", "pause"], ["nexttrack", "next"], ["previoustrack", "previous"], ["seekto", "seek"]] as const) {
      try {
        session.setActionHandler(button, ask(action));
      } catch {
        // A button this browser doesn't have.
      }
    }
  }

  /** Jukebox's sign-in to Spotify, asked for again when it is about to run out. */
  private async _spotifyToken(): Promise<string> {
    const now = Date.now() / 1000;
    if (this._token && this._token.until > now + 60) return this._token.token;
    const { token, expires } = await this._send({ type: `${DOMAIN}/phone/token` });
    this._token = { token, until: expires };
    return token;
  }
}

/** The one room that is this device, for every player on the page. */
export const phone = new Phone();
