// The mini player: one thing that is playing, with its picture, its rooms, pause, skip and
// one volume for all of its rooms. A tap on it opens the big player (big.ts). The page
// shows one for each thing playing, and the card is one by itself.
import { LitElement, css, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { open } from "./big.ts";
import { type Group, type House, ask, average, colours, latest, names, playing, position, reason } from "./common.ts";
import { Clock, art, icon, shared } from "./parts.ts";

export const MINI = "casa-mia-jukebox-mini";

export class Mini extends LitElement {
  static properties = { hass: { attribute: false }, house: { attribute: false }, group: { attribute: false } };
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

  private _ask(action: string) {
    ask(this.hass!, action, this.group!.id).catch((err) => this._failed(err));
  }

  render() {
    const { hass, house, group } = this;
    if (!hass || !house || !group) return nothing;
    const { title, by } = playing(group);
    const at = position(group, Date.now());
    const on = group.state === "playing";
    const show = () => open(hass, group.id);
    return html`<div class="mini" style="--a:${colours(title)[0]}">
      <button class="pic" @click=${show} aria-label="Open the player">${art(hass, group.picture, title)}</button>
      <button class="meta" @click=${show}>
        <b>${title}</b><span>${by}</span><small>${names(house, group)}</small>
      </button>
      <span class="tp">
        <button class="ib" ?disabled=${group.kind === "nothing"} @click=${() => this._ask(on ? "pause" : "play")} aria-label=${on ? "Pause" : "Play"}>${icon(on ? "pause" : "play")}</button>
        ${group.kind === "queue" ? html`<button class="ib" @click=${() => this._ask("next")} aria-label="Next song">${icon("next")}</button>` : nothing}
      </span>
      <div class="vol">
        ${icon("volume")}
        <casa-mia-jukebox-slider .value=${average(house, group)} label="Volume" @jb-slide=${(e: CustomEvent) => this._volume(e.detail.value)} @jb-set=${(e: CustomEvent) => this._volume(e.detail.value)}></casa-mia-jukebox-slider>
      </div>
      ${at !== null && group.duration ? html`<i class="prog" style="width:${(100 * at) / group.duration}%"></i>` : nothing}
    </div>`;
  }

  static styles = [
    shared,
    css`
      :host { display: block; }
      .mini { position: relative; overflow: hidden; display: grid; grid-template-columns: 60px minmax(0, 1fr) auto; gap: 8px 12px; align-items: center; padding: 12px; border-radius: 18px; border: 1px solid var(--divider-color, #8884);
        color: var(--primary-text-color); background: linear-gradient(100deg, color-mix(in srgb, var(--a) 26%, var(--card-background-color, #fff)), var(--card-background-color, #fff) 75%); }
      .meta { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; }
      .meta b, .meta span, .meta small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .meta b { font-size: 15px; }
      .meta span { color: var(--secondary-text-color); }
      .meta small { margin-top: 3px; font-size: 12px; font-weight: 600; color: color-mix(in srgb, var(--a) 55%, var(--primary-text-color)); }
      .tp { display: flex; gap: 2px; }
      .vol { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; color: var(--secondary-text-color); --jb-fill: #c4552d; }
      .vol svg { width: 18px; height: 18px; flex: none; }
      .prog { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--a); }
    `,
  ];
}
