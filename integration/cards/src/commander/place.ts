// The cards in a commander's last place (docs/design/commander-responsive-layout.md, "A
// place for a card"): Lovelace cards of the dashboard's own choosing, which the Camera
// Commander card draws over the cell its picture leaves clear. The first one showing fills
// the place, so their order is the priority: alerts first, a clock last.
//
// Each is in Home Assistant's own card wrapper (hui-card), which applies its Visibility
// conditions and hides it when the card hides itself (nothing to show), by its `hidden`
// attribute; the card's CSS shows the first not hidden (styles.ts). While the dashboard is
// edited, hui-card shows every card, so the first fills the place.
import type { CardConfig, Hass, HuiCard } from "../ha.ts";

/** The configs to show: the list, or b19's single `card`, as a list of one. A config with
 * no type is one being made in the editor: none yet. */
export function cardsOf(config: { cards?: CardConfig[]; card?: CardConfig } | undefined): CardConfig[] {
  return (config?.cards ?? (config?.card ? [config.card] : [])).filter((c) => c?.type);
}

/** How the wrapper is made, and whether it is defined: the page's, or a test's. */
export type Wrapper = {
  defined(): boolean;
  whenDefined(): Promise<unknown>;
  make(config: CardConfig): HuiCard;
};

const PAGE: Wrapper = {
  defined: () => Boolean(customElements.get("hui-card")),
  whenDefined: () => customElements.whenDefined("hui-card"),
  make: (config) => {
    const el = document.createElement("hui-card") as HuiCard;
    el.config = config;
    el.load();
    return el;
  },
};

/** How long a page may take to define hui-card before the place says it can't. */
export const WRAPPER_MS = 10_000;

export class PlaceCards {
  private els: HuiCard[] = [];
  private keys: string[] = []; // each element's config, as JSON
  private waiting = false;
  /** Why the cards can't be drawn, "" while there is nothing to say. */
  failed = "";
  private changed: () => void;
  private wrapper: Wrapper;

  /** `changed` is called when the cards can be drawn after all, or can't. */
  constructor(changed: () => void, wrapper: Wrapper = PAGE) {
    this.changed = changed;
    this.wrapper = wrapper;
  }

  /** The cards for `configs`, given the states as they are now. An element is kept for
   * each config that hasn't changed, so a redraw of the commander, or an edit to one card,
   * never rebuilds the others. */
  elements(configs: CardConfig[], hass: Hass, preview: boolean): HuiCard[] {
    if (!configs.length) return (this.els = []), (this.keys = []), [];
    if (!this.wrapper.defined()) {
      this.wait();
      return [];
    }

    const before = new Map(this.keys.map((key, i) => [key, this.els[i]]));
    this.keys = configs.map((c) => JSON.stringify(c));
    this.els = this.keys.map((key, i) => {
      const kept = before.get(key);
      before.delete(key); // a second card with the same config gets an element of its own
      return kept ?? this.wrapper.make(configs[i]);
    });

    for (const el of this.els) {
      el.hass = hass;
      el.preview = preview;
    }
    return this.els;
  }

  /** hui-card not defined yet (a page that hasn't loaded HA's cards): wait for it, once,
   * and say so if it never comes. */
  private wait() {
    if (this.waiting || this.failed) return;
    this.waiting = true;
    let gone = 0;
    const late = new Promise<never>((_, fail) => {
      gone = setTimeout(() => fail(new Error("Home Assistant's card wrapper (hui-card) is not on this page")), WRAPPER_MS) as unknown as number;
    });
    Promise.race([this.wrapper.whenDefined(), late])
      .catch((err) => {
        this.failed = err instanceof Error ? err.message : String(err);
        console.error(`CASA-MIA CARDS: the commander's cards in the last place can't be drawn: ${this.failed}`);
      })
      .finally(() => {
        clearTimeout(gone);
        this.waiting = false;
        this.changed();
      });
  }
}
