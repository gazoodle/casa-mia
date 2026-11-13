// The thumbs: up and down for the song a player is playing, lit when the person already
// loves or loathes it. A tap rates the song (the integration's rate action); a tap on the
// lit one takes the rating away. Whole in itself (it follows its own feed), so it can sit
// in the card and anywhere else a player is shown.
import { LitElement, css, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { type Feeling, type Song, follow, rate, unusable } from "./common.ts";

export const TAG = "casa-mia-thumbs";

export class Thumbs extends LitElement {
  static properties = { entityId: {}, person: {}, connected: { type: Boolean }, quiet: { type: Boolean }, _song: { state: true }, _why: { state: true }, _busy: { state: true } };
  entityId?: string;
  person?: string;
  /** Home Assistant's connection is up: without it the feed is silent, and what the
   * thumbs show is not known to be current. */
  connected = true;
  /** Nothing at all where the thumbs could never be used: the player isn't watched, this
   * login may not rate (it isn't one of the people chosen), or the integration isn't there. For where they are added
   * unasked (the entity dialog); a card, which was asked for, greys them and says why. */
  quiet = false;
  hass?: Hass; // for its connection and the rate action; not drawn from, so not a property
  _song?: Song;
  _why?: string;
  _busy = false;
  private _for?: string; // the player and person followed
  private _off?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.requestUpdate(); // back on the page (HA moves cards about): follow again
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unfollow();
  }

  protected updated() {
    const want = this.entityId ? `${this.entityId} ${this.person ?? ""}` : undefined;
    if (this.isConnected && this.hass?.connection && want !== this._for) this._follow(want);
  }

  private _follow(want?: string) {
    this._unfollow();
    this._for = want;
    if (!want) return;
    this._off = follow(this.hass!.connection, this.entityId!, this.person, (song, why) => {
      [this._song, this._why] = [song, why];
      // For whatever holds the thumbs (the card says why they can't be used).
      fire(this, "cm-song", { song, why });
    });
  }

  private _unfollow() {
    this._off?.();
    this._off = this._for = this._song = this._why = undefined;
  }

  private async _rate(feeling: Feeling) {
    if (!this.hass || !this.entityId) return;
    this._busy = true;
    try {
      // The lit one again: no rating at all.
      await rate(this.hass, this.entityId, this._song?.feeling === feeling ? "clear" : feeling, this.person);
    } catch (err: any) {
      // Refused, with the reason, in Home Assistant's own toast.
      fire(this, "hass-notification", { message: err?.message ?? String(err), duration: 8000 });
    } finally {
      this._busy = false;
    }
  }

  render() {
    if (this.quiet && !(this._song?.watched && !this._song.refused)) return nothing;
    const why = unusable(this._song, this._why, this.connected);
    const thumb = (feeling: Feeling, icon: string, word: string, done: string) => {
      const lit = !why && this._song?.feeling === feeling;
      const said = why ?? (lit ? `${done}: tap to take that back` : word);
      return html`<button class=${feeling} aria-pressed=${lit} title=${said} aria-label=${said} ?disabled=${!!why || this._busy} @click=${() => this._rate(feeling)}>
        <ha-icon icon=${lit ? icon : `${icon}-outline`}></ha-icon>
      </button>`;
    };
    return html`${thumb("love", "mdi:thumb-up", "Love it", "Loved")}${thumb("loathe", "mdi:thumb-down", "Loathe it", "Loathed")}`;
  }

  static styles = css`
    :host {
      display: inline-flex;
      gap: 4px;
    }
    button {
      display: grid;
      place-items: center;
      width: 44px; /* a finger's width, on a wall tablet too */
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: none;
      color: var(--secondary-text-color);
      cursor: pointer;
    }
    button:not(:disabled):hover,
    button:focus-visible {
      outline: none;
      background: var(--secondary-background-color);
    }
    button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .love[aria-pressed="true"] {
      color: var(--success-color, #43a047);
    }
    .loathe[aria-pressed="true"] {
      color: var(--error-color, #db4437);
    }
  `;
}
