// Spotify's player for web pages, driven from here. Spotify's own player, which decodes
// and plays, runs in a frame of Spotify's (FRAME), on Spotify's origin, apart from Home
// Assistant's page; it is told what to do by messages. Spotify's script for web pages
// (https://sdk.scdn.co/spotify-player.js) is only a messenger to that frame, and putting
// it into Home Assistant's page would run code fetched from Spotify with the access of
// whoever is signed in (hacs/default#14999). So this page speaks to the frame itself.
//
// The messages, as Spotify's script v1.10.0-58e81af sends them (read 2026-11-27). There
// is no handshake, key or version. Each is `{type: "SP_MESSAGE", body: {topic, data},
// seq}`; an answer carries the question's `seq` as `data.ref`.
// - The frame says LOADED; it is then sent INIT {name, volume}.
// - It asks GET_TOKEN whenever it needs the sign-in, answered by TOKEN {token, ref}.
// - CONNECT is answered by CONNECTED {connected, ref}, GET_CURRENT_STATE by
//   CURRENT_STATE {state, ref}.
// - PAUSE, RESUME, SEEK (ms), ACTIVATE_ELEMENT and DISCONNECT have no answer.
// - Everything else it says as EVENT {name, eventData}, such as PLAYER_READY.
// If Spotify changes them, the player stops connecting, which the page says (sound.ts),
// and the fix is to read Spotify's script again.

const FRAME = "https://sdk.scdn.co/embedded/index.html";
const ORIGIN = "https://sdk.scdn.co";
const KIND = "SP_MESSAGE";

/** The way to Spotify's frame: what is sent to it, and everything it says. */
export type Link = { send(message: object): void; hear(heard: (message: any) => void): void };

/** What the page tells Spotify's player. */
export type Options = { name: string; volume: number; getOAuthToken(use: (token: string) => void): void };

/** Spotify's frame, hidden in the page, as Spotify's own script puts it there. */
function frame(): Link {
  const element = Object.assign(document.createElement("iframe"), { src: FRAME, allow: "encrypted-media; autoplay", title: "Spotify's player", tabIndex: -1 });
  element.style.cssText = "position: absolute !important; left: -1px !important; width: 0 !important; height: 0 !important; border: none !important";
  element.setAttribute("aria-hidden", "true");
  document.body.append(element);
  return {
    send: (message) => element.contentWindow?.postMessage(message, ORIGIN),
    hear: (heard) =>
      addEventListener("message", (event) => {
        // Only Spotify's frame is heard: any other window could say anything.
        if (event.source === element.contentWindow && event.origin === ORIGIN) heard(event.data);
      }),
  };
}

export class Player {
  private _link: Link;
  private _seq = 0;
  /** Sent nothing until the frame has loaded, as Spotify's own script waits. */
  private _loaded: Promise<void>;
  /** Whoever waits for an answer, by the number of the question. */
  private _asked = new Map<number, (data: any) => void>();
  /** Whoever listens to each of the frame's events, by its name (PLAYER_READY). */
  private _listeners = new Map<string, ((data: any) => void)[]>();

  constructor(options: Options, link: Link = frame()) {
    this._link = link;
    let loaded!: () => void;
    this._loaded = new Promise((done) => (loaded = done));

    link.hear((message) => {
      if (message?.type !== KIND || typeof message.body?.topic !== "string") return;
      const { topic, data } = message.body;
      if (topic === "LOADED") {
        this._send("INIT", { name: options.name, volume: options.volume });
        loaded();
      } else if (topic === "GET_TOKEN") options.getOAuthToken((token) => this._send("TOKEN", { token, ref: message.seq }));
      else if (topic === "EVENT") for (const heard of this._listeners.get(data?.name) ?? []) heard(data.eventData);
      else if (this._asked.has(data?.ref)) {
        this._asked.get(data.ref)!(data);
        this._asked.delete(data.ref);
      }
    });
  }

  private _send(topic: string, data?: unknown): number {
    const seq = this._seq++;
    this._link.send({ type: KIND, body: { topic, data }, seq });
    return seq;
  }

  /** Tell the frame something with no answer, once it has loaded. */
  private async _tell(topic: string, data?: unknown): Promise<void> {
    await this._loaded;
    this._send(topic, data);
  }

  /** Ask the frame something, once it has loaded: its answer. */
  private async _ask(topic: string): Promise<any> {
    await this._loaded;
    const seq = this._send(topic);
    return new Promise((done) => this._asked.set(seq, done));
  }

  addListener(name: string, heard: (data: any) => void): void {
    this._listeners.set(name, [...(this._listeners.get(name) ?? []), heard]);
  }

  /** Whether Spotify took this page as a device of the account. */
  async connect(): Promise<boolean> {
    return (await this._ask("CONNECT")).connected;
  }

  /** What is playing, or null when this page isn't the device playing. */
  async getCurrentState(): Promise<any> {
    return (await this._ask("GET_CURRENT_STATE")).state;
  }

  disconnect = () => this._tell("DISCONNECT");
  activateElement = () => this._tell("ACTIVATE_ELEMENT");
  pause = () => this._tell("PAUSE");
  resume = () => this._tell("RESUME");
  seek = (ms: number) => this._tell("SEEK", ms);
}
