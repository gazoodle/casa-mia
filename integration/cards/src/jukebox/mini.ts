// The mini player: one thing that is playing, with its picture, its rooms, pause, skip and
// one volume for all of its rooms. A title, artist or list of rooms too long for its line
// slides along it. Where there is no next song to skip to (a station, or
// music that is paused) the second button is Stop, which the player asks about in place
// before it clears itself. A tap on it opens the big player (big.ts). The page
// shows one for each thing playing, and the card is one by itself.
import { LitElement, css, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { open } from "./big.ts";
import { type Group, type House, ask, average, colours, latest, muted, names, playing, position, reason } from "./common.ts";
import { Busy, Clock, art, icon, shared } from "./parts.ts";

export const MINI = "casa-mia-jukebox-mini";

export class Mini extends LitElement {
  static properties = { hass: { attribute: false }, house: { attribute: false }, group: { attribute: false }, _stopping: { state: true } };
  /** Stop was pressed and the player is asking, in place, whether it was meant: Stop
   * empties the queue. It stops asking by itself after a moment. */
  _stopping = false;
  private _unasked?: ReturnType<typeof setTimeout>;
  hass?: Hass;
  house?: House;
  group?: Group;
  private _volume = latest<number>(
    (value) => ask(this.hass!, "group_volume", this.group!.id, { value }),
    (err) => this._failed(err),
  );

  constructor() {
    super();
    new Clock(this); // the song's place moves on by itself
  }

  /** Home Assistant's own toast: a failure is said, never swallowed. */
  private _failed(err: unknown) {
    fire(this, "hass-notification", { message: `Jukebox: ${reason(err)}` });
  }

  private _busy = new Busy(this);

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._unasked);
  }

  /** Ask whether Stop was meant (or stop asking), here on the player that was pressed. */
  private _sure(asking: boolean) {
    clearTimeout(this._unasked);
    this._stopping = asking;
    if (asking) this._unasked = setTimeout(() => (this._stopping = false), 8000);
  }

  private _ask(action: string, key = action, data: object = {}) {
    this._busy.during(key, ask(this.hass!, action, this.group!.id, data)).catch((err) => this._failed(err));
  }

  render() {
    const { hass, house, group } = this;
    if (!hass || !house || !group) return nothing;
    const { title, by } = playing(group);
    const at = position(group, Date.now());
    const on = group.state === "playing";
    const hush = muted(house, group);
    const show = () => open(hass, group.id);
    if (this._stopping)
      return html`<div class="mini" style="--a:${colours(title)[0]}">
        <span class="pic">${art(hass, group.picture, title)}</span>
        <span class="meta"><b>Stop and clear?</b><span>Empties the queue</span><small>${names(house, group)}</small></span>
        <span class="tp">
          <button class="say" @click=${() => this._sure(false)}>Keep</button>
          <button class="say stop" @click=${() => (this._sure(false), this._ask("stop"))}>Stop</button>
        </span>
      </div>`;
    return html`<div class="mini" style="--a:${colours(title)[0]}">
      <button class="pic" @click=${show} aria-label="Open the player">${art(hass, group.picture, title)}</button>
      <button class="meta" @click=${show}>
        <b><casa-mia-jukebox-marquee .text=${title}></casa-mia-jukebox-marquee></b>
        <span><casa-mia-jukebox-marquee .text=${by}></casa-mia-jukebox-marquee></span>
        <small><casa-mia-jukebox-marquee .text=${`${names(house, group)}${group.party ? " · Party" : ""}`}></casa-mia-jukebox-marquee></small>
      </button>
      <span class="tp">
        <button class="ib ${this._busy.on("play")}" ?disabled=${group.kind === "nothing"} @click=${() => this._ask(on ? "pause" : "play", "play")} aria-label=${on ? "Pause" : "Play"}>${icon(on ? "pause" : "play")}</button>
        ${on && group.kind === "queue"
          ? html`<button class="ib ${this._busy.on("next")}" @click=${() => this._ask("next")} aria-label="Next song">${icon("next")}</button>`
          : html`<button class="ib ${this._busy.on("stop")}" @click=${() => this._sure(true)} aria-label="Stop the music here and clear the player">${icon("stop")}</button>`}
      </span>
      <div class="vol ${hush ? "hush" : ""}">
        <button class=${this._busy.on("mute")} @click=${() => this._ask("group_mute", "mute", { on: !hush })} aria-label=${hush ? "Unmute" : "Mute"} aria-pressed=${hush}>${icon(hush ? "muted" : "volume")}</button>
        <casa-mia-jukebox-slider .value=${average(house, group)} label="Volume" @jb-slide=${(e: CustomEvent) => this._volume(e.detail.value)} @jb-set=${(e: CustomEvent) => this._volume(e.detail.value)}></casa-mia-jukebox-slider>
      </div>
      ${at !== null && group.duration ? html`<i class="prog" style="width:${(100 * at) / group.duration}%"></i>` : nothing}
    </div>`;
  }

  static styles = [
    shared,
    css`
      /* Its own font, so it looks the same on Jukebox's page and in any dashboard. */
      :host { display: block; font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
      .mini { position: relative; overflow: hidden; display: grid; grid-template-columns: 60px minmax(0, 1fr) auto; gap: 8px 12px; align-items: center; padding: 12px; border-radius: 18px; border: 1px solid var(--divider-color, #8884);
        color: var(--primary-text-color); background: linear-gradient(100deg, color-mix(in srgb, var(--a) 26%, var(--card-background-color, #fff)), var(--card-background-color, #fff) 75%); }
      .meta { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; }
      /* Each line slides along when it is too long (the marquee), so it is never cut. */
      .meta b, .meta span, .meta small { min-width: 0; }
      .meta b { font-size: 15px; }
      .meta span { color: var(--secondary-text-color); }
      .meta small { margin-top: 3px; font-size: 12px; font-weight: 600; color: color-mix(in srgb, var(--a) 55%, var(--primary-text-color)); }
      .tp { display: flex; gap: 2px; --jb-glow: var(--primary-color, #c4552d); }
      .tp:has(.say) { gap: 8px; }
      .say { padding: 10px 14px; border-radius: 999px; background: color-mix(in srgb, currentColor 12%, transparent); font-size: 13px; font-weight: 700; }
      .say.stop { background: var(--error-color, #db4437); color: #fff; }
      .meta > b, .meta > span, .meta > small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .vol { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; color: var(--secondary-text-color); --jb-fill: #c4552d; }
      .vol svg { width: 18px; height: 18px; flex: none; }
      /* A finger's worth to press, taking no more of the line than the picture did. */
      .vol button { display: grid; place-items: center; flex: none; width: 34px; height: 34px; margin: -8px; border-radius: 50%; }
      .prog { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--a); }
    `,
  ];
}
