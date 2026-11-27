// The card in a commander's last place (docs/design/commander-responsive-layout.md, "A
// place for a card"): one Lovelace card of the dashboard's own choosing, made by Home
// Assistant, which the Camera Commander card draws over the cell its picture leaves clear.
import type { CardConfig, Hass } from "../ha.ts";

type Made = HTMLElement & { hass?: Hass };
type Helpers = { createCardElement(config: CardConfig): Made };

export class PlaceCard {
  private made = ""; // the config the element was made for
  private el?: Made;
  /** Why the card could not be made, "" while there is nothing to say. Home Assistant
   * draws a config it can't use as its own error card, so this is only its helpers
   * failing to load. */
  failed = "";

  private changed: () => void;
  private helpers: () => Promise<Helpers>;

  /** `changed` is called when the card has been made, or could not be. */
  constructor(changed: () => void, helpers: () => Promise<Helpers> = () => (window as any).loadCardHelpers()) {
    this.changed = changed;
    this.helpers = helpers;
  }

  /** The card for `config`, given the states as they are now. It is made once for a
   * config and kept, so a redraw of the commander never rebuilds it. Undefined with no
   * config, and until Home Assistant has made it (`changed` is then called). */
  element(config: CardConfig | undefined, hass: Hass): Made | undefined {
    const key = JSON.stringify(config ?? null);
    if (key !== this.made) {
      this.made = key;
      this.el = undefined;
      this.failed = "";
      if (config) void this.make(key, config);
    }

    if (this.el) this.el.hass = hass;
    return this.el;
  }

  private async make(key: string, config: CardConfig) {
    try {
      const helpers = await this.helpers();
      if (key !== this.made) return; // the config changed meanwhile: that one is on its way
      this.el = helpers.createCardElement(config);
    } catch (err) {
      if (key !== this.made) return;
      this.failed = err instanceof Error ? err.message : String(err);
      console.error(`CASA-MIA CARDS: the commander's card in the last place could not be made: ${this.failed}`);
    }
    this.changed();
  }
}
