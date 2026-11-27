// The sound of the room that is this device (phone.ts): the two players a browser has.
// A file of the music library and a radio station play in an <audio> element. A song
// from Spotify plays in Spotify's own player for web pages, in a frame of Spotify's that
// spotify.ts drives, which makes this page a device of the Spotify account and is told
// what to play through Spotify's web API.
//
// Measured on an iPhone (2026-11-24, Safari and Home Assistant's app) with a throwaway
// page, which is where each oddity below comes from:
// - A browser starts sound only from a tap. A moment of silence played in the tap lets
//   the page start each later song by itself, the phone locked or not (`unlock`).
// - Spotify's player has no "song ended": a song that has ended is paused at 0:00 after
//   having been heard playing.
// - A page that plays nothing is put to sleep, and after 42 s asleep Spotify had dropped
//   its player with no word: asked to play, it answers 404. Then the player connects
//   again, and that is said meanwhile.
import { Player } from "./spotify.ts";

/** What a player says of itself: at each change, never on a timer. Spotify's also says
 * what the song is, which is more than a list of an album's songs knows of it. */
export type Told = { playing: boolean; position: number; duration: number | null; title?: string; artist?: string; album?: string; picture?: string | null };
/** Whoever is listening to the players: the phone's room. */
export type Hears = {
  told(now: Told): void;
  /** The song played to its end. */
  ended(): void;
  /** This song can't be played: the next one may be. */
  failed(why: string): void;
  /** The sound has stopped for a reason that isn't this song's, and a press on play may bring it back. */
  lost(why: string): void;
  /** Something is taking a while, said while it does; empty when it is over. */
  note(text: string): void;
};

const PLAY = "https://api.spotify.com/v1/me/player/play";
/** How long Spotify's player may take to connect, in ms. */
const READY = 15_000;
/** Why Spotify's player won't start, in words to show, for each of its own reasons. */
const WHY: Record<string, string> = {
  PLAYER_INIT_ERROR: "This browser can't run Spotify's player",
  AUTH_ERROR: "Spotify refused Jukebox's sign-in",
  ACCOUNT_ERROR: "Spotify plays in a page only for a Premium account",
};

/** A tenth of a second of silence, as a sound file: what `unlock` plays. */
function silence(): string {
  const samples = 800;
  const wav = new Uint8Array(44 + samples);
  const view = new DataView(wav.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true); // the size of what follows
  view.setUint16(20, 1, true); // plain samples
  view.setUint16(22, 1, true); // one channel
  view.setUint32(24, 8000, true); // samples a second
  view.setUint32(28, 8000, true); // bytes a second
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true); // bits a sample
  text(36, "data");
  view.setUint32(40, samples, true);
  wav.fill(128, 44);
  return URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
}

export class Sound {
  /** Which player has the song: none before the first, and after Stop. */
  on: "" | "audio" | "spotify" = "";
  private _hears: Hears;
  /** Jukebox's sign-in to Spotify, asked for whenever Spotify's player wants it. */
  private _token: () => Promise<string>;
  private _audio?: HTMLAudioElement;
  private _silence?: string;
  /** Spotify's player, made once for the page. */
  private _player?: Player;
  /** How Spotify knows this page's player: empty while it isn't connected. */
  private _device = "";
  private _connecting?: Promise<Player>;
  /** Whoever is waiting for the player to say it is ready. */
  private _wait?: { done: () => void; failed: (err: Error) => void };
  /** Spotify's song has been heard playing, so "paused at 0:00" is its end. */
  private _heard = false;

  constructor(hears: Hears, token: () => Promise<string>) {
    [this._hears, this._token] = [hears, token];
  }

  /** Called in a tap, before anything else is waited for: lets both players start
   * sound by themselves afterwards. */
  unlock(): void {
    // Spotify's player has its own way of being let, if it has been made by now.
    void this._player?.activateElement();
    if (this._audio) return;
    const audio = this._listen(new Audio());
    audio.src = this._silence = silence();
    audio.play().catch(() => undefined); // refused: the first song's own start says so
  }

  private _listen(audio: HTMLAudioElement): HTMLAudioElement {
    this._audio = audio;
    const mine = () => this.on === "audio" && audio.src !== this._silence;
    const tell = () => mine() && this._hears.told({ playing: !audio.paused, position: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : null });
    for (const kind of ["playing", "pause", "seeked", "durationchange"]) audio.addEventListener(kind, tell);
    audio.addEventListener("playing", () => mine() && this._hears.note(""));
    audio.addEventListener("waiting", () => mine() && this._hears.note("Waiting for the sound to arrive…"));
    audio.addEventListener("ended", () => mine() && this._hears.ended());
    audio.addEventListener("error", () => {
      if (!mine()) return;
      // The browser's reason is a number, and sometimes a few words of its own as well.
      const why = { 2: "it stopped arriving", 3: "it can't be read", 4: "this browser can't fetch it, or doesn't play that kind of file" }[audio.error?.code ?? 0] ?? "the browser gave no reason";
      this._hears.failed(audio.error?.message ? `${why} (${audio.error.message})` : why);
    });
    return audio;
  }

  /** Play what is at a web address, from `from` seconds in. */
  async audio(url: string, from = 0): Promise<void> {
    if (this.on === "spotify") void this._player?.pause();
    const audio = this._audio ?? this._listen(new Audio());
    this.on = "audio";
    audio.src = url;
    if (from) audio.currentTime = from;
    try {
      await audio.play();
    } catch (err: any) {
      // Not a fault of the song: the page was opened again and nothing has been tapped.
      if (err?.name === "NotAllowedError") throw new Error("The browser starts sound only from a tap. Press play.");
      // Anything else the element says for itself (`error`, above), or is no fault: a
      // song asked for while this one was starting.
    }
  }

  /** Spotify's player can't go on, for a reason that isn't a song's: told to whoever is
   * waiting for it to connect, or else to the room. */
  private _cant(err: Error): void {
    if (this._wait) this._wait.failed(err);
    else if (this.on === "spotify") this._hears.lost(err.message);
  }

  /** Spotify's player, with everything it may say listened to. */
  private _make(): Player {
    if (this._player) return this._player;
    const player = (this._player = new Player({ name: "Jukebox", volume: 1, getOAuthToken: (use) => void this._token().then(use, (err) => this._cant(err)) }));
    player.addListener("PLAYER_READY", (now: { device_id: string }) => {
      this._device = now.device_id;
      this._wait?.done();
    });
    player.addListener("PLAYER_NOT_READY", () => (this._device = ""));
    for (const kind of Object.keys(WHY))
      player.addListener(kind, (said: { message: string }) => this._cant(new Error(`${WHY[kind]} (${said.message})`)));
    player.addListener("PLAYBACK_ERROR", (said: { message: string }) => this.on === "spotify" && this._hears.failed(`Spotify says: ${said.message}`));
    player.addListener("AUTOPLAY_FAILED", () => this.on === "spotify" && this._hears.lost("The browser starts sound only from a tap. Press play."));
    player.addListener("PLAYER_STATE_CHANGED", (state: any) => this._spotifySaid(state));
    return player;
  }

  /** Spotify's player, connected: Spotify knows this page as a device. `afresh` drops
   * the connection there was first, for when Spotify has forgotten the device. */
  private _connect(afresh = false): Promise<Player> {
    return (this._connecting ??= Promise.resolve(this._make())
      .then(async (player) => {
        if (afresh) {
          player.disconnect();
          this._device = "";
        }
        if (this._device) return player;
        let late: ReturnType<typeof setTimeout> | undefined;
        try {
          await new Promise<void>((done, failed) => {
            this._wait = { done, failed };
            late = setTimeout(() => failed(new Error("Spotify's player didn't connect in 15 seconds")), READY);
            player.connect().then((ok: boolean) => ok || failed(new Error("Spotify's player wouldn't connect")), failed);
          });
        } finally {
          clearTimeout(late);
          this._wait = undefined;
        }
        return player;
      })
      .finally(() => (this._connecting = undefined)));
  }

  /** Have Spotify's player ready before it is wanted, so that the tap that plays the
   * first song can let it sound (`unlock`). */
  ready(): Promise<unknown> {
    return this._connect();
  }

  /** Play a song from Spotify (`spotify:track:…`), from `from` seconds in. */
  async spotify(uri: string, from = 0, again = true): Promise<void> {
    this._audio?.pause();
    await this._connect();
    [this.on, this._heard] = ["spotify", false];
    const answer = await fetch(`${PLAY}?device_id=${this._device}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${await this._token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris: [uri], position_ms: Math.round(from * 1000) }),
    });
    if (answer.status === 404 && again) {
      // Spotify has forgotten this page's player while the page slept.
      this._hears.note("Connecting to Spotify again…");
      await this._connect(true);
      return this.spotify(uri, from, false);
    }
    if (!answer.ok) {
      const said = await answer.json().then(
        (body) => body?.error?.message,
        () => undefined,
      );
      throw new Error(`Spotify wouldn't play it (${said || answer.status})`);
    }
  }

  private _spotifySaid(state: any): void {
    if (this.on !== "spotify") return;
    // No state at all: the account's music has been moved to another device.
    if (!state) return this._hears.lost("Spotify is playing somewhere else on this account now, so it stopped here. Press play to bring it back.");
    const song = state.track_window?.current_track;
    this._hears.told({
      playing: !state.paused,
      position: state.position / 1000,
      duration: state.duration ? state.duration / 1000 : null,
      ...(song ? { title: song.name, artist: (song.artists ?? []).map((a: { name: string }) => a.name).join(", "), album: song.album?.name, picture: song.album?.images?.[0]?.url } : {}),
    });
    if (!state.paused && state.position > 0) this._heard = true;
    else if (state.paused && state.position === 0 && this._heard) {
      this._heard = false;
      this._hears.ended();
    }
  }

  async pause(): Promise<void> {
    if (this.on === "spotify") await this._make().pause();
    else this._audio?.pause();
  }

  /** Carry on with the song that was paused. Spotify's is asked for again, from where it
   * was, if this page is no longer the device playing it. */
  async resume(uri: string, at: number): Promise<void> {
    if (this.on !== "spotify") return void (await this._audio?.play());
    const player = await this._connect();
    if (await player.getCurrentState()) await player.resume();
    else await this.spotify(uri, at);
  }

  async seek(seconds: number): Promise<void> {
    if (this.on === "spotify") {
      // Back at 0:00 and paused is how an ended song looks: this one hasn't ended.
      if (!seconds) this._heard = false;
      await this._make().seek(Math.round(seconds * 1000));
    } else if (this._audio) this._audio.currentTime = seconds;
  }

  /** Silence, and nothing loaded: a station left loaded would go on being fetched. */
  stop(): void {
    if (this.on === "spotify") void this._player?.pause();
    this.on = "";
    if (!this._audio) return;
    this._audio.pause();
    this._audio.removeAttribute("src");
    this._audio.load();
  }
}
