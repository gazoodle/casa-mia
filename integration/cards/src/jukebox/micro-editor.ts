// The micro player's editor: its room, its size and what a tap does in Home Assistant's
// own form, and under it the grid of nine places (../anchor-grid.ts) for where the picture
// sits in its card. What is left at its default is left out of the YAML.
import { LitElement, css, html, nothing } from "lit";
import { type Hass, fire, haForm, withoutDefaults } from "../ha.ts";
import { type Config, DEFAULTS, SIZES } from "./micro.ts";
import { SONOS } from "./pieces.ts";

/** The grid's tag here: each bundle of cards defines the grid under a tag of its own. */
export const ANCHOR_GRID = "casa-mia-jukebox-anchors";

const rows = (n: number) => `${n} rows of a section`;
const SCHEMA = [
  { name: "entity", selector: SONOS },
  {
    name: "size",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "small", label: `Small: ${SIZES.small.px} px, ${rows(SIZES.small.rows)}` },
          { value: "medium", label: `Medium: ${SIZES.medium.px} px, ${rows(SIZES.medium.rows)}` },
          { value: "large", label: `Large: ${SIZES.large.px} px, ${rows(SIZES.large.rows)}` },
        ],
      },
    },
  },
  { name: "picture_only", selector: { boolean: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
  {
    type: "expandable",
    name: "",
    title: "A room that is playing nothing",
    flatten: true,
    schema: [
      { name: "quiet_icon", selector: { icon: { placeholder: "mdi:speaker" } } },
      { name: "quiet_image", selector: { text: {} } },
    ],
  },
];
const LABELS: Record<string, string> = { entity: "Room", size: "Size", picture_only: "The picture alone, with no card round it", tap_action: "Tap action", quiet_icon: "Icon", quiet_image: "Or a picture, by its address" };
const HELP: Record<string, string> = {
  entity: "Leave empty for a picture of everything that is playing.",
  size: "The height of the card. In a card with a border the picture is 16 px smaller, so the card still fills whole rows.",
  picture_only: "Off: the card has the background and border of Home Assistant's own cards. On: only the picture shows, as the Markdown card's text only does for words.",
  quiet_icon: "Shown in the picture's place while the room plays nothing. Empty: a speaker.",
  quiet_image: "Such as /local/quiet.png, for a file in Home Assistant's www folder. It is shown whole, in the icon's place, at the size chosen above.",
  tap_action: "Left at its default, a tap opens the big player. For Jukebox's page instead, choose Navigate and /jukebox.",
};

export class MicroEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true }, _ready: { state: true } };
  hass?: Hass;
  _config?: Config;
  _ready = false;

  setConfig(config: Config) {
    this._config = config;
  }

  connectedCallback() {
    super.connectedCallback();
    haForm().then(() => (this._ready = true));
  }

  /** Saved without what is at its default, and without a room or a tap action that was
   * emptied: an empty one would be taken for one that is set. */
  private _save(config: Config) {
    this._config = config;
    const kept = Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined && value !== ""));
    fire(this, "config-changed", { config: withoutDefaults(kept, DEFAULTS) });
  }

  render() {
    if (!this.hass || !this._config || !this._ready) return nothing;
    const o = { ...DEFAULTS, ...this._config };
    return html`<ha-form
        .hass=${this.hass}
        .data=${o}
        .schema=${SCHEMA}
        .computeLabel=${(s: { name: string }) => LABELS[s.name] ?? s.name}
        .computeHelper=${(s: { name: string }) => HELP[s.name]}
        @value-changed=${(ev: CustomEvent) => {
          ev.stopPropagation();
          this._save({ ...this._config!, ...ev.detail.value });
        }}
      ></ha-form>
      <h3>Where the picture sits in its card</h3>
      <div class="where">
        <casa-mia-jukebox-anchors
          label="Where the picture sits in its card"
          .value=${o.anchor}
          @anchor-changed=${(ev: CustomEvent) => {
            ev.stopPropagation();
            this._save({ ...this._config!, anchor: ev.detail.value });
          }}
        ></casa-mia-jukebox-anchors>
        <p class="note">Across always shows. Up and down shows only in a card that is taller than the picture: one given more rows on the Layout tab, or one filling a panel of a Tablet Layout.</p>
      </div>`;
  }

  static styles = css`
    h3 { margin: 16px 0 8px; font-size: 15px; }
    .where { display: flex; gap: 16px; align-items: center; }
    .note { flex: 1; margin: 0; color: var(--secondary-text-color); font-size: 13px; overflow-wrap: anywhere; }
  `;
}
