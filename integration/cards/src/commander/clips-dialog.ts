// The Camera Commander card's clips dialog: a camera's recordings in UniFi Protect, one kind
// at a time, newest first (docs/design/commander-detections.md, step 3; the fetching is
// clips.ts). A press on the main camera's name or a chip opens it (live.ts: caption), on
// the pressed chip's kind, and the card draws it while it is open.
//
// It is one size from the moment it opens (owner, 2026-11-27). On a landscape screen at
// least 700 px wide, the list is on the left and the preview on the right, and the
// preview, at the camera's shape, sets the dialog's height; otherwise the dialog fills the
// screen up to a cap, the preview above the list (clips-styles.ts). The preview starts on the newest
// clip's picture, which plays at a press. The list is tiles or rows, remembered on this
// device, and the day before is fetched whenever the end of the list is in view, until
// EMPTY_STOP empty days in a row (clips.ts: goesOn). Its leaving the page
// (disconnectedCallback) stops the video, any fetch and the watch on the list's end, and
// gives back a clip held in memory.
import { html, LitElement, nothing } from "lit";
import type { Hass } from "../ha.ts";
import { PILLS } from "../pills.ts";
import { clipsStyles } from "./clips-styles.ts";
import {
  type Clip,
  dayClips,
  dayName,
  download,
  EMPTY_STOP,
  emptyRun,
  FOLDERS,
  goesOn,
  nextDay,
  nothingOn,
  parts,
  reason,
  resolve,
  type Shelf,
  SHELVES,
  type Shown,
  truncated,
} from "./clips.ts";

/** The clip playing: its address once resolved (in memory after the fallback), how much
 * has arrived while it is fetched whole, or why it can't be played. */
type Playing = { id: string; src?: string; whole?: boolean; got?: number; of?: number; failed?: string };

/** Tiles or rows, remembered on this device for every camera. */
type View = "tiles" | "rows";
const VIEW = "casa-mia-clips-view";

/** How far below the list's end the next day is fetched, so it is there on arrival. */
const AHEAD_PX = 300;

const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

export class ClipsDialog extends LitElement {
  static properties = {
    _shelf: { state: true },
    _days: { state: true },
    _chosen: { state: true },
    _playing: { state: true },
    _broken: { state: true },
    _lost: { state: true },
    _view: { state: true },
  };
  // Set by the card as it opens the dialog. Not reactive: a new hass (every state change in
  // the house) must not redraw a long list.
  hass!: Hass;
  camera = "";
  name = "";
  /** The kind it opens on (the pressed chip's). */
  shelf: Shelf = "smart";
  doorbell = false;
  /** The camera's picture's shape (width / height), which the preview takes. */
  shape = 16 / 9;

  _shelf: Shelf = "smart";
  _days: Shown[] = [];
  /** The clip in the preview: the newest at first, then the one pressed. */
  _chosen: Clip | null = null;
  _playing: Playing | null = null;
  /** The clips whose thumbnail failed to load: an icon in its place. */
  _broken = new Set<string>();
  /** Why the camera's recordings can't be found ("" while they can). */
  _lost = "";
  _view: View = localStorage.getItem(VIEW) === "rows" ? "rows" : "tiles";
  /** Where the count of empty days starts: Look further back starts it again. */
  private from = 0;
  private folder = "";
  private list = 0; // the list shown: a reply for an older one (another kind) is dropped
  private plays = 0; // the clip asked for: likewise
  private fetching?: AbortController;
  private blob = "";
  private watch?: IntersectionObserver;

  async firstUpdated() {
    this.renderRoot.querySelector("dialog")!.showModal();
    try {
      this.folder = await FOLDERS.of(this.hass, this.camera);
      if (!this.folder) return this.lose("UniFi Protect's media library has no folder for this camera");
    } catch (err) {
      return this.lose(`UniFi Protect's recordings could not be listed (${reason(err)}). Close this and open it again to try again`);
    }
    // Closed while it looked: nothing more starts (more() would go on, as off the page every
    // position is 0, so the end always looks in view).
    if (!this.isConnected) return;
    // The kind first (show sets it at once), so the watch's first look is for its list.
    const shown = this.show(this.shelf === "ring" && !this.doorbell ? "smart" : this.shelf);
    this.watch = new IntersectionObserver((seen) => seen.some((e) => e.isIntersecting) && this.more(), {
      root: this.renderRoot.querySelector(".list"),
      rootMargin: `0px 0px ${AHEAD_PX}px 0px`,
    });
    this.watch.observe(this.renderRoot.querySelector(".end")!);
    await shown;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.watch?.disconnect();
    this.stop();
    this.list++;
  }

  private lose(why: string) {
    console.warn(`casa-mia: ${this.camera}: ${why}`);
    this._lost = why;
  }

  /** A kind's list, from today. What plays goes on playing; otherwise the new list's
   * newest is chosen. */
  private show = async (shelf: Shelf) => {
    if (shelf === this._shelf && this._days.length) return;
    this.list++;
    this._shelf = shelf;
    this._days = [];
    this.from = 0;
    if (!this._playing?.src) {
      this.stop();
      this._chosen = null;
    }
    await this.updateComplete;
    await this.more();
  };

  /** The day before, when the end of the list is in view and the list goes on by itself;
   * then again, while the end is still in view (a short list leaves room). The watch on
   * the end calls it as it scrolls into view. Never off the page. */
  private more = async () => {
    if (!this.isConnected || !this.folder || !goesOn(this._days, this.from) || !this.endInView()) return;
    const shown: Shown = { day: nextDay(this._days.map((s) => s.day), this.hass.config?.time_zone) };
    this._days = [...this._days, shown];
    if (!(await this.fill(shown))) return;
    await this.updateComplete;
    await this.more();
  };

  private endInView(): boolean {
    const end = this.renderRoot.querySelector(".end")?.getBoundingClientRect();
    const list = this.renderRoot.querySelector(".list")?.getBoundingClientRect();
    return Boolean(end && list && end.top <= list.bottom + AHEAD_PX);
  }

  /** A day's clips, or why they couldn't be listed; false when the list changed meanwhile.
   * Then, once and not waited for, whether Protect's list of it was cut short, which,
   * failing, is logged and not shown. */
  private async fill(shown: Shown): Promise<boolean> {
    const list = this.list;
    const shelf = this._shelf;
    try {
      shown.clips = await dayClips(this.hass, this.folder, shelf, shown.day);
    } catch (err) {
      shown.failed = reason(err);
      console.warn(`casa-mia: ${this.camera}: its ${shelf} recordings of ${dayName(shown.day)} could not be listed: ${shown.failed}`);
    }
    if (list !== this.list) return false;
    if (!this._chosen && shown.clips?.length) this._chosen = shown.clips[0];
    this.requestUpdate();
    if (shown.clips) void this.checkCut(shown, list, shelf);
    return true;
  }

  private async checkCut(shown: Shown, list: number, shelf: Shelf) {
    try {
      shown.cut = await truncated(this.hass, this.folder, shelf, shown.day);
      if (list === this.list) this.requestUpdate();
    } catch (err) {
      console.warn(`casa-mia: ${this.camera}: whether Protect listed all its ${shelf} recordings of ${dayName(shown.day)} could not be checked: ${reason(err)}`);
    }
  }

  /** Try again, on a day that failed: it is fetched again, and the list goes on. */
  private retry = async (shown: Shown) => {
    shown.failed = undefined;
    this.requestUpdate();
    if (!(await this.fill(shown))) return;
    await this.updateComplete;
    await this.more();
  };

  /** Look further back, after EMPTY_STOP empty days: as many again. */
  private further = async () => {
    this.from = this._days.length;
    this.requestUpdate();
    await this.updateComplete;
    await this.more();
  };

  private setView(view: View) {
    this._view = view;
    localStorage.setItem(VIEW, view);
  }

  /** A clip pressed: chosen, and its address resolved, its Play chip saying it is loading
   * meanwhile. */
  private play = async (clip: Clip) => {
    this.stop();
    this._chosen = clip;
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
   * None plays after, so a player failing as its clip is given back says nothing. */
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
    const view = (v: View, icon: string, label: string) =>
      html`<button class="cm-chip cm-icon ${this._view === v ? "cm-on" : ""}" title=${label} aria-label=${label} aria-pressed=${this._view === v} @click=${() => this.setView(v)}>
        <ha-icon icon=${icon}></ha-icon>
      </button>`;
    // The dialog is only the margin round its body: a press there is outside.
    return html`<dialog aria-label="${this.name}: recordings" style="--shape:${this.shape}" @close=${this.closed} @click=${(e: Event) => e.target === e.currentTarget && this.shut()}>
      <div class="body">
        <header>
          <h2>${this.name}</h2>
          ${view("tiles", "mdi:view-grid-outline", "Tiles")}${view("rows", "mdi:view-list-outline", "List")}
          <button class="cm-chip" autofocus @click=${this.shut}>Close</button>
          <nav>
            ${shelves.map((s) => html`<button class="cm-chip ${s.kind === this._shelf ? "cm-on" : ""}" aria-pressed=${s.kind === this._shelf} @click=${() => this.show(s.kind)}>${s.label}</button>`)}
          </nav>
        </header>
        ${this._lost ? html`<p class="callout bad lost" role="alert">${this._lost}.</p>` : this.preview()}
        <div class="list">${parts(this._days).map((p) => ("empty" in p ? html`<p class="note">${nothingOn(p.empty)}</p>` : this.day(p.shown)))}${this.tail()}<div class="end"></div></div>
      </div>
    </dialog>`;
  }

  /** The clip chosen, large: playing, or its picture with Play; under it what it was and
   * when, and anything said about playing it. */
  private preview() {
    const c = this._chosen;
    // The lines under the picture (what, then when) are there before a clip is, so in
    // landscape the dialog doesn't grow by them when the first one comes.
    if (!c)
      return html`<div class="preview">
        <div class="stage"><span class="note">${this._days.some((s) => s.clips?.length) ? "" : "No recording to show yet"}</span></div>
        <p class="said"><span class="what">&nbsp;</span><span class="when">&nbsp;</span></p>
      </div>`;
    const p = this._playing?.id === c.id ? this._playing : null;
    const waiting = p && !p.src && !p.failed && p.got === undefined;
    return html`<div class="preview">
      ${p?.src
        ? html`<video class="stage" src=${p.src} controls autoplay playsinline @error=${this.failed}></video>`
        : html`<div class="stage">
            ${this.picture(c, "big")}
            ${p?.failed || p?.got !== undefined
              ? nothing
              : html`<button class="cm-chip cm-on cm-accent play" @click=${() => this.play(c)}><ha-icon icon="mdi:play"></ha-icon>${waiting ? "Loading…" : "Play"}</button>`}
          </div>`}
      <p class="said"><span class="what">${c.what}</span> <span class="when">${c.when}</span></p>
      ${p?.got !== undefined
        ? html`<p class="note">It didn't play from Home Assistant's address, so it is being fetched whole: ${mb(p.got)}${p.of ? ` of ${mb(p.of)}` : ""}.</p>`
        : nothing}
      ${p?.failed ? html`<p class="callout bad" role="alert">This clip can't be played: ${p.failed}.</p>` : nothing}
    </div>`;
  }

  private day(s: Shown) {
    return html`<h3>${dayName(s.day)}</h3>
      ${s.cut
        ? html`<p class="callout warn">The console had more recordings that day than Home Assistant's UniFi Protect integration lists (its "max media" option), so this list may be incomplete.</p>`
        : nothing}
      ${s.failed
        ? html`<p class="callout bad" role="alert">This day could not be listed: ${s.failed}.</p>
            <button class="cm-chip" @click=${() => this.retry(s)}>Try again</button>`
        : !s.clips
          ? html`<p class="note">Loading…</p>`
          : html`<div class=${this._view}>${s.clips.map((c) => this.item(c))}</div>`}`;
  }

  /** At the end, after EMPTY_STOP empty days in a row: said, and a way to go on. */
  private tail() {
    if (emptyRun(this._days, this.from) < EMPTY_STOP) return nothing;
    return html`<p class="note">It stops looking after ${EMPTY_STOP} days in a row with nothing recorded.</p>
      <button class="cm-chip" @click=${this.further}>Look further back</button>`;
  }

  private item(c: Clip) {
    const chosen = this._chosen?.id === c.id;
    const p = this._playing?.id === c.id ? this._playing : null;
    const waiting = p && !p.src && !p.failed && p.got === undefined;
    return html`<button class="item ${chosen ? "chosen" : ""}" aria-current=${chosen ? "true" : nothing} @click=${() => this.play(c)}>
      ${this.picture(c, "thumb")}
      <span class="text">
        <span class="what">${c.icon ? html`<ha-icon icon=${c.icon}></ha-icon>` : nothing}${c.what}</span>
        <span class="when">${waiting ? "Loading…" : c.when}</span>
      </span>
    </button>`;
  }

  /** A clip's picture, or, where it didn't load, its kind's icon in its place. */
  private picture(c: Clip, cls: string) {
    return c.thumb && !this._broken.has(c.id)
      ? html`<img class=${cls} src=${c.thumb} alt="" loading="lazy" @error=${() => this.broke(c.id)} />`
      : html`<span class="${cls} none"><ha-icon icon=${c.icon || SHELVES.find((s) => s.kind === this._shelf)!.icon}></ha-icon></span>`;
  }

  static styles = [PILLS, clipsStyles];
}
