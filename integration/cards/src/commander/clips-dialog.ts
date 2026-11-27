// The Camera Commander card's clips dialog: a camera's recordings in UniFi Protect, one kind
// and one day at a time, newest first, each playing at the top with the list below
// (docs/design/commander-detections.md, step 3; the fetching is clips.ts). A press on the
// main camera's name or a detection chip opens it (live.ts: caption), and the card draws it
// while it is open. Its leaving the page (disconnectedCallback) stops the video and any
// fetch, and gives back a clip held in memory.
import { css, html, LitElement, nothing } from "lit";
import type { Hass } from "../ha.ts";
import { PILLS } from "../pills.ts";
import { type Clip, type Day, dayClips, dayName, download, FOLDERS, nextDay, reason, resolve, type Shelf, SHELVES, truncated } from "./clips.ts";

/** One day of the list: its clips once listed, or why they couldn't be, and whether
 * Protect's list of it was cut short. */
type Shown = { day: Day; clips?: Clip[]; failed?: string; cut?: boolean };

/** The clip chosen: its address once resolved (in memory after the fallback), how much has
 * arrived while it is fetched whole, or why it can't be played. */
type Playing = { id: string; src?: string; whole?: boolean; got?: number; of?: number; failed?: string };

const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

export class ClipsDialog extends LitElement {
  static properties = { _shelf: { state: true }, _days: { state: true }, _playing: { state: true }, _broken: { state: true }, _lost: { state: true } };
  // Set by the card as it opens the dialog. Not reactive: a new hass (every state change in
  // the house) must not redraw a long list.
  hass!: Hass;
  camera = "";
  name = "";
  doorbell = false;

  _shelf: Shelf = "smart";
  _days: Shown[] = [];
  _playing: Playing | null = null;
  /** The clips whose thumbnail failed to load: an icon in its place. */
  _broken = new Set<string>();
  /** Why the camera's recordings can't be found ("" while they can). */
  _lost = "";
  private folder = "";
  private list = 0; // the list shown: a reply for an older one (another kind) is dropped
  private plays = 0; // the clip chosen: likewise
  private fetching?: AbortController;
  private blob = "";

  async firstUpdated() {
    this.renderRoot.querySelector("dialog")!.showModal();
    try {
      this.folder = await FOLDERS.of(this.hass, this.camera);
      if (!this.folder) this.lose("UniFi Protect's media library has no folder for this camera");
      else await this.show("smart");
    } catch (err) {
      this.lose(`UniFi Protect's recordings could not be listed (${reason(err)}). Close this and open it again to try again`);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
    this.list++;
  }

  private lose(why: string) {
    console.warn(`casa-mia: ${this.camera}: ${why}`);
    this._lost = why;
  }

  /** A kind's list, from today. */
  private show = async (shelf: Shelf) => {
    this.list++;
    this._shelf = shelf;
    this._days = [];
    await this.earlier();
  };

  /** The next day (today first) under its heading; then, once, whether Protect's list of
   * it was cut short, which, failing, is logged and not shown. */
  private earlier = async () => {
    const list = this.list;
    const shelf = this._shelf;
    const shown: Shown = { day: nextDay(this._days.map((s) => s.day), this.hass.config?.time_zone) };
    this._days = [...this._days, shown];

    try {
      shown.clips = await dayClips(this.hass, this.folder, shelf, shown.day);
    } catch (err) {
      shown.failed = reason(err);
      console.warn(`casa-mia: ${this.camera}: its ${shelf} recordings of ${dayName(shown.day)} could not be listed: ${shown.failed}`);
    }
    if (list !== this.list) return;
    this.requestUpdate();
    if (shown.failed) return;

    try {
      shown.cut = await truncated(this.hass, this.folder, shelf, shown.day);
      if (list === this.list) this.requestUpdate();
    } catch (err) {
      console.warn(`casa-mia: ${this.camera}: whether Protect listed all its ${shelf} recordings of ${dayName(shown.day)} could not be checked: ${reason(err)}`);
    }
  };

  /** A clip pressed: its address resolved, the tile saying it is loading meanwhile. */
  private play = async (clip: Clip) => {
    this.stop();
    const n = ++this.plays;
    this._playing = { id: clip.id };
    try {
      const src = await resolve(this.hass, clip.id);
      if (n === this.plays) this._playing = { id: clip.id, src };
    } catch (err) {
      if (n === this.plays) this.cannot(clip.id, `it could not be found (${reason(err)})`);
    }
  };

  /** The player failed. From Home Assistant's address, once: fetched whole and played from
   * memory, as Safari and the iOS app may not play it from the address (not known). From
   * memory too: said. */
  private failed = async (e: Event) => {
    const p = this._playing;
    if (!p?.src) return;
    const error = (e.target as HTMLVideoElement).error;
    const why = error?.message || `media error ${error?.code ?? "unknown"}`;
    if (p.whole) return this.cannot(p.id, `this device can't play it (${why})`);
    console.warn(`casa-mia: ${this.camera}: a clip didn't play from its address (${why}), so it is fetched whole`);

    const n = this.plays;
    const fetching = (this.fetching = new AbortController());
    this._playing = { id: p.id, got: 0, of: 0 };
    try {
      const blob = await download(p.src, fetching.signal, (got, of) => n === this.plays && (this._playing = { id: p.id, got, of }));
      if (n !== this.plays) return;
      this.blob = URL.createObjectURL(blob);
      this._playing = { id: p.id, src: this.blob, whole: true };
    } catch (err) {
      if (n === this.plays && !fetching.signal.aborted) this.cannot(p.id, `it could not be fetched (${reason(err)})`);
    }
  };

  private cannot(id: string, why: string) {
    console.warn(`casa-mia: ${this.camera}: a clip can't be played: ${why}`);
    this._playing = { id, failed: why };
  }

  /** Stop what plays: its fetch aborted, the video paused, a clip in memory given back.
   * None is chosen after, so a player failing as its clip is given back says nothing. */
  private stop() {
    this.plays++;
    this._playing = null;
    this.fetching?.abort();
    this.fetching = undefined;
    this.renderRoot.querySelector("video")?.pause();
    if (this.blob) URL.revokeObjectURL(this.blob);
    this.blob = "";
  }

  private broke(id: string) {
    if (!this._broken.size) console.warn(`casa-mia: ${this.camera}: a recording's thumbnail didn't load; its icon is shown instead`);
    this._broken = new Set(this._broken).add(id);
  }

  private shut = () => this.renderRoot.querySelector("dialog")?.close();
  /** Closed (Close, Escape, or a press outside it): the card takes it off the page. */
  private closed = () => {
    this.stop();
    this.dispatchEvent(new CustomEvent("closed"));
  };

  render() {
    const shelves = SHELVES.filter((s) => s.kind !== "ring" || this.doorbell);
    // The dialog is only the margin round its body: a press there is outside.
    return html`<dialog aria-label="${this.name}: recordings" @close=${this.closed} @click=${(e: Event) => e.target === e.currentTarget && this.shut()}>
      <div class="body">
        <header><h2>${this.name}</h2><button class="cm-chip" @click=${this.shut}>Close</button></header>
        ${this._lost
          ? html`<p class="callout bad" role="alert">${this._lost}.</p>`
          : html`<nav>
                ${shelves.map((s) => html`<button class="cm-chip ${s.kind === this._shelf ? "cm-on" : ""}" aria-pressed=${s.kind === this._shelf} @click=${() => this.show(s.kind)}>${s.label}</button>`)}
              </nav>
              ${this.player()}
              <div class="list">
                ${this._days.map((s) => this.day(s))}
                ${this._days.length ? html`<button class="cm-chip earlier" @click=${this.earlier}>Earlier</button>` : nothing}
              </div>`}
      </div>
    </dialog>`;
  }

  private player() {
    const p = this._playing;
    if (p?.failed) return html`<p class="callout bad" role="alert">This clip can't be played: ${p.failed}.</p>`;
    if (p?.src) return html`<video src=${p.src} controls autoplay playsinline @error=${this.failed}></video>`;
    if (p?.got !== undefined)
      return html`<p class="note">It didn't play from Home Assistant's address, so it is being fetched whole: ${mb(p.got)}${p.of ? ` of ${mb(p.of)}` : ""}.</p>`;
    return nothing; // none chosen, or its address on the way: its tile says so
  }

  private day(s: Shown) {
    return html`<h3>${dayName(s.day)}</h3>
      ${s.cut
        ? html`<p class="callout warn">The console had more recordings that day than Home Assistant's UniFi Protect integration lists (its "max media" option), so this list may be incomplete.</p>`
        : nothing}
      ${s.failed
        ? html`<p class="callout bad" role="alert">This day could not be listed: ${s.failed}.</p>`
        : !s.clips
          ? html`<p class="note">Loading…</p>`
          : s.clips.length
            ? html`<div class="tiles">${s.clips.map((c) => this.tile(c))}</div>`
            : html`<p class="note">Nothing recorded</p>`}`;
  }

  private tile(c: Clip) {
    const p = this._playing?.id === c.id ? this._playing : null;
    const icon = c.icon || SHELVES.find((s) => s.kind === this._shelf)!.icon;
    return html`<button class="tile ${p ? "chosen" : ""}" @click=${() => this.play(c)}>
      ${c.thumb && !this._broken.has(c.id)
        ? html`<img src=${c.thumb} alt="" loading="lazy" width="120" height="120" @error=${() => this.broke(c.id)} />`
        : html`<span class="thumb"><ha-icon icon=${icon}></ha-icon></span>`}
      <span class="what">${c.icon ? html`<ha-icon icon=${c.icon}></ha-icon>` : nothing}${c.what}</span>
      <span class="when">${c.when}</span>
      ${p && !p.src && !p.failed && p.got === undefined ? html`<span class="loading">Loading…</span>` : nothing}
    </button>`;
  }

  static styles = [
    PILLS,
    css`
      dialog {
        width: min(840px, calc(100vw - 16px));
        max-width: none;
        max-height: calc(100dvh - 16px);
        padding: 0;
        border: none;
        border-radius: 16px;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #212121);
        font: 14px / 1.4 var(--ha-font-family-body, Roboto, sans-serif);
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.6);
      }
      .body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-sizing: border-box;
        max-height: calc(100dvh - 16px);
        padding: 16px;
      }
      header {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      h2 {
        flex: 1;
        margin: 0;
        font-size: 18px;
        font-weight: 500;
        overflow-wrap: anywhere;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      video {
        width: 100%;
        max-height: 50dvh;
        border-radius: 8px;
        background: #000;
      }
      .list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
      }
      h3 {
        margin: 12px 0 8px;
        font-size: 14px;
        font-weight: 500;
      }
      h3:first-child {
        margin-top: 0;
      }
      .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fill, 120px);
        gap: 12px;
      }
      .tile {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 2px;
        width: 120px;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        font-size: 12px;
        line-height: 1.3;
        text-align: left;
        cursor: pointer;
      }
      .tile img,
      .thumb,
      .loading {
        box-sizing: border-box;
        width: 120px;
        height: 120px;
        border-radius: 8px;
      }
      .tile img {
        object-fit: cover;
        background: var(--secondary-background-color, #e5e5e5);
      }
      .thumb {
        display: grid;
        place-items: center;
        background: var(--secondary-background-color, #e5e5e5);
        color: var(--secondary-text-color, #727272);
        --mdc-icon-size: 40px;
      }
      .tile.chosen :is(img, .thumb) {
        outline: 3px solid var(--primary-color, #03a9f4);
        outline-offset: -3px;
      }
      .loading {
        position: absolute;
        top: 0;
        left: 0;
        display: grid;
        place-items: center;
        background: rgb(0 0 0 / 0.55);
        color: #fff;
      }
      .what {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;
        overflow-wrap: anywhere;
        --mdc-icon-size: 14px;
      }
      .when,
      .note {
        color: var(--secondary-text-color, #727272);
      }
      .note {
        margin: 0;
      }
      .earlier {
        margin-top: 16px;
      }
      /* The admin UI's callout (ui.module.css .callout, docs/design/chrome.html#callout),
         which a card can't import: something to know, in its tone. */
      .callout {
        margin: 0 0 8px;
        padding: 10px 14px;
        border: 1px solid color-mix(in srgb, var(--tone) 45%, var(--divider-color, #ddd));
        border-radius: 12px;
        background: color-mix(in srgb, var(--tone) 10%, var(--card-background-color, #fff));
        font-size: 13.5px;
        overflow-wrap: anywhere;
      }
      .callout.warn {
        --tone: var(--warning-color, #ffa600);
      }
      .callout.bad {
        --tone: var(--error-color, #db4437);
      }
    `,
  ];
}
