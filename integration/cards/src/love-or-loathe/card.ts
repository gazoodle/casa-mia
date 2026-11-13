// The Love it or Loathe it card: a media player's song with a thumb up and a thumb down
// for whoever is signed in (or the person the card names). The thumbs are thumbs.ts.
import { LitElement, css, html, nothing } from "lit";
import { type Hass, inPicker } from "../ha.ts";
import { CARD, type Config, type Song, unusable } from "./common.ts";
import { TAG } from "./thumbs.ts";

export class LoveOrLoatheCard extends LitElement {
  static properties = { _config: { state: true }, _song: { state: true }, _why: { state: true } };
  _config?: Config;
  _song?: Song;
  _why?: string;
  private _hass?: Hass;

  /** The first media player there is, so a new card shows something at once. */
  static getStubConfig(hass: Hass) {
    return { entity: Object.keys(hass.states).find((id) => id.startsWith("media_player.")) ?? "" };
  }

  static getConfigElement() {
    return document.createElement(`${CARD}-editor`);
  }

  setConfig(config: Config) {
    this._config = { ...config };
  }

  set hass(hass: Hass) {
    const id = this._config?.entity;
    const was = this._hass;
    this._hass = hass;
    // Drawn again only for its own player: `hass` is set at every state change in the house.
    if (!was || !id || was.states[id] !== hass.states[id] || was.connected !== hass.connected) this.requestUpdate();
  }

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    return this._config?.compact ? { columns: 3, rows: 1, min_columns: 3 } : { columns: 12, rows: 1, min_columns: 6 };
  }

  render() {
    const config = this._config;
    const hass = this._hass;
    if (!config || !hass) return nothing;
    const id = config.entity;
    if (!id)
      return html`<ha-card><div class="row"><div class="words"><span class="name">Love it or Loathe it</span><span class="song">${inPicker(this) ? "Thumbs for the song a player is playing" : "Choose a media player in the card's options"}</span></div></div></ha-card>`;

    const state = hass.states[id];
    const connected = hass.connected !== false;
    const why = unusable(this._song, this._why, connected);
    const title = state?.attributes.media_title;
    const artist = state?.attributes.media_artist;
    // The reason the thumbs are greyed out stands in for the song; a song is shown as it is.
    const line = why && why !== "Nothing is playing" ? why : title && state?.state === "playing" ? `${title}${artist ? ` by ${artist}` : ""}` : "Nothing is playing";
    return html`<ha-card>
      <div class="row ${config.compact ? "compact" : ""}">
        ${config.compact
          ? nothing
          : html`<div class="words">
              <span class="name">${config.name || state?.attributes.friendly_name || id}</span>
              <span class="song" title=${line}>${line}</span>
            </div>`}
        <casa-mia-thumbs
          .hass=${hass}
          .entityId=${id}
          .person=${config.person || undefined}
          .connected=${connected}
          @cm-song=${(ev: CustomEvent) => ([this._song, this._why] = [ev.detail.song, ev.detail.why])}
        ></casa-mia-thumbs>
      </div>
    </ha-card>`;
  }

  static styles = css`
    ha-card {
      height: 100%;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 100%;
      box-sizing: border-box;
      padding: 6px 8px 6px 16px;
    }
    .row.compact {
      justify-content: center;
      padding: 6px;
    }
    .words {
      display: grid;
      flex: 1;
      min-width: 0;
    }
    .name {
      font-weight: 500;
    }
    .name,
    .song {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .song {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
  `;
}

// The thumbs are defined with the card (index.ts); named here so the template's tag and
// the element can't drift apart.
void TAG;
