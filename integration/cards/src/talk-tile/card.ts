// The Talk tile card: HA's own tile card for a doorbell's call sensor, with its name, icon
// and colour saying what a tap will do here (common.ts: talkLook), which a plain tile can't:
// whether this page is the one talking is known only on this page. Everything else is the
// tile's: the card's config is passed through, so it looks and behaves as the owner's other
// tiles. A tap fires Talk's toggle to the Commander card (talk.ts), unless tap_action says
// otherwise.
// As Hold to talk (button: hold) it follows the Commander's announced talk state
// (talk-rules.ts) and only reports the finger: press on pointerdown, release on pointerup or
// pointercancel. The Commander owns the microphone and ends a hold on every other path.
import type { CardConfig, Hass } from "../ha.ts";
import { callSensors } from "../commander/common.ts";
import { type TalkState, NO_GRAB, followTalk, holdLook, order } from "../commander/talk-rules.ts";
import { type Config, tileConfig } from "./common.ts";

type Tile = HTMLElement & { hass?: Hass; setConfig(c: CardConfig): void; getCardSize?(): number; getGridOptions?(): object };

export class TalkTileCard extends HTMLElement {
  private config?: Config;
  private _hass?: Hass;
  private tile?: Tile;
  private shown = ""; // the tile config last given, as JSON
  private helpers?: { createCardElement(c: CardConfig): Tile };
  private talk: TalkState = "off"; // the Commander's, as announced
  private unfollow?: () => void;

  constructor() {
    super();
    this.addEventListener("pointerdown", this.down);
    this.addEventListener("pointerup", this.up);
    this.addEventListener("pointercancel", this.up);
    this.addEventListener("contextmenu", (ev) => this.holding() && ev.preventDefault());
  }

  connectedCallback() {
    this.style.display = "block";
    this.style.height = "100%"; // the tile fills its grid cell, as on its own
    this.listen();
  }

  disconnectedCallback() {
    this.unfollow?.();
    this.unfollow = undefined;
  }

  /** The Commander's talk state followed, for the commander picked (again when it
   * changes), while on the page. */
  private listen() {
    this.unfollow?.();
    this.unfollow = this.isConnected
      ? followTalk(window, this.config?.commander, (talk) => {
          this.talk = talk;
          this.follow();
        })
      : undefined;
  }

  private holding() {
    return this.config?.button === "hold";
  }

  /** As Hold to talk: the hold is the page's, not the browser's (talk-rules.ts: NO_GRAB). */
  private hostStyle() {
    const hold = this.holding();
    for (const [p, v] of Object.entries(NO_GRAB)) this.style.setProperty(p, hold ? v : "");
  }

  private order(talk: "press" | "release") {
    this.dispatchEvent(new CustomEvent("ll-custom", { bubbles: true, composed: true, detail: { casa_mia_commander: order(talk, { entity: this.config?.commander }) } }));
  }

  /** Pressed: held only where the Commander is silent (answered here in half duplex);
   * greyed out, presses are ignored. Captured, so the lift comes here wherever it is. */
  private down = (ev: PointerEvent) => {
    if (!this.holding() || !holdLook(this.talk).enabled) return;
    ev.preventDefault();
    this.setPointerCapture(ev.pointerId);
    this.order("press");
  };

  private up = () => this.holding() && this.order("release");

  static getStubConfig(hass: Hass): Partial<Config> {
    return { entity: callSensors(hass)[0] ?? "" };
  }

  static getConfigElement() {
    return document.createElement("casa-mia-talk-tile-editor");
  }

  setConfig(config: Config) {
    if (!config.entity) throw new Error("Choose the doorbell's call sensor (entity).");
    const commander = this.config?.commander;
    this.config = config;
    if (config.commander !== commander) this.listen();
    this.hostStyle();
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

    const want = tileConfig(this.config, hass.states[this.config.entity], hass.user?.name, this.talk);
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
