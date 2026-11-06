// The Talk tile card: HA's own tile card for a doorbell's call sensor, with its name, icon
// and colour saying what a tap will do here (common.ts: talkLook), which a plain tile can't:
// whether this page is the one talking is known only on this page. Everything else is the
// tile's: the card's config is passed through, so it looks and behaves as the owner's other
// tiles. A tap fires Talk's toggle to the Commander card (talk.ts), unless tap_action says
// otherwise.
import type { CardConfig, Hass } from "../ha.ts";
import { callSensors } from "../commander/common.ts";
import { type Config, tileConfig } from "./common.ts";

type Tile = HTMLElement & { hass?: Hass; setConfig(c: CardConfig): void; getCardSize?(): number; getGridOptions?(): object };

export class TalkTileCard extends HTMLElement {
  private config?: Config;
  private _hass?: Hass;
  private tile?: Tile;
  private shown = ""; // the tile config last given, as JSON
  private helpers?: { createCardElement(c: CardConfig): Tile };

  connectedCallback() {
    this.style.display = "block";
    this.style.height = "100%"; // the tile fills its grid cell, as on its own
  }

  static getStubConfig(hass: Hass): Partial<Config> {
    return { entity: callSensors(hass)[0] ?? "" };
  }

  static getConfigElement() {
    return document.createElement("casa-mia-talk-tile-editor");
  }

  setConfig(config: Config) {
    if (!config.entity) throw new Error("Choose the doorbell's call sensor (entity).");
    this.config = config;
    this.follow();
  }

  set hass(hass: Hass) {
    this._hass = hass;
    this.follow();
  }

  getCardSize() {
    return this.tile?.getCardSize?.() ?? 1;
  }

  getGridOptions() {
    return this.tile?.getGridOptions?.() ?? { columns: 6, rows: this.config?.vertical ? 2 : 1 };
  }

  /** The tile made (once HA's card helpers load), its config set when the call or the
   * card's config changes it, and HA's state passed on. */
  private follow() {
    const hass = this._hass;
    if (!this.config || !hass) return;
    if (!this.helpers) {
      (window as any).loadCardHelpers().then(
        (h: typeof this.helpers) => {
          this.helpers = h;
          this.follow();
        },
        (err: unknown) => console.error(`CASA-MIA CARDS: the Talk tile can't load HA's card helpers: ${err}`),
      );
      return;
    }

    const want = tileConfig(this.config, hass.states[this.config.entity], hass.user?.name);
    const key = JSON.stringify(want);
    if (key !== this.shown) {
      this.shown = key;
      this.place(want);
    }
    this.tile!.hass = hass;
  }

  /** The tile given its new config; made afresh when there is none yet, it refuses it, or
   * HA's error card stands in its place (it said why; a new config may fix it). */
  private place(want: CardConfig) {
    try {
      if (this.tile?.localName !== "hui-tile-card") throw new Error("no tile yet");
      this.tile.setConfig(want);
    } catch {
      this.tile = this.helpers!.createCardElement(want);
      this.replaceChildren(this.tile);
    }
  }
}
