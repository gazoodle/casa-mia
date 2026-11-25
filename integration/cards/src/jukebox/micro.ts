// The micro player: the picture of what a room is playing and nothing else, small enough
// for a sidebar. It shows; it doesn't control (owner, 2026-11-25: it must not look like a
// button for the player), so what it marks on the picture are signs and never the glyphs of
// a transport: bars that move while music plays and stand still while it is paused, a
// crossed speaker when it is muted, a warning when something is wrong. A tap anywhere on
// it opens the big player (big.ts), unless the card is given a tap action of its own. With
// a room chosen it is always that room's; with none it is one picture for each thing
// playing in the house.
//
// The picture has one of three sizes whatever the width of its card, and sits in one of
// nine places in it (owner, 2026-11-25), so that a card the width of a sidebar can hold a
// small picture in its middle. Its editor is micro-editor.ts.
//
// It is drawn in a card as Home Assistant's own are, with their background and border,
// unless it is asked for the picture alone: the same choice, made the same way, as the
// Markdown card's `text_only` (owner, 2026-11-25).
import { type TemplateResult, css, html, nothing } from "lit";
import { type Anchor, placement } from "../anchors.ts";
import { type Hass, fire, navigate } from "../ha.ts";
import { open } from "./big.ts";
import { type Group, type House, type Standing, groupOf, names, playing, position, standing } from "./common.ts";
import { Following } from "./page.ts";
import { Clock, icon, plate, shared, sleeve } from "./parts.ts";

export const MICRO = "casa-mia-jukebox-micro";
export const MICRO_EDITOR = `${MICRO}-editor`;
export type Size = "small" | "medium" | "large";
export type Config = {
  type?: string;
  /** The room whose music is shown. */
  entity?: string;
  size?: Size;
  /** Where the picture sits in its card. */
  anchor?: Anchor;
  /** What a tap does, as Home Assistant's own cards say it; none: the big player. */
  tap_action?: { action: string; [key: string]: unknown };
  /** The picture with no card round it: no background and no border. */
  picture_only?: boolean;
  /** What stands for a room playing nothing: an icon of Home Assistant's, or a picture
   * by its address, in the speaker's place. */
  quiet_icon?: string;
  quiet_image?: string;
};
/** Each option's default: shown in the editor, and never saved. */
export const DEFAULTS = { size: "small" as Size, anchor: "center" as Anchor, picture_only: false };
/** The space between a card's border and its picture, in px. */
const EDGE = 8;
/** How tall a card of each size is, in px, and how many rows of a section that is: a row
 * is 56 px and the gap between two is 8, so each size is a whole number of rows and lines
 * up with the cards beside it. The picture alone is this size; in a card with a border it
 * is smaller by the space round it, so that the card stays on its rows. `columns` is what
 * a new card takes of a section's 12. */
export const SIZES: Record<Size, { px: number; rows: number; columns: number }> = {
  small: { px: 120, rows: 2, columns: 3 },
  medium: { px: 184, rows: 3, columns: 6 },
  large: { px: 248, rows: 4, columns: 6 },
};
/** One picture: `asking` is before Home Assistant's first answer, which is no fault yet.
 * `part` is how far through its song it is, from 0 to 1. `room` is what a tap action of
 * the card's own is about. */
type Tile = { picture: TemplateResult; state: Standing | "asking"; says: string; tap: () => void; part?: number; room?: string };

const BARS = html`<span class="mark eq"><i></i><i></i><i></i></span>`;
const MARK: Partial<Record<Tile["state"], TemplateResult>> = {
  playing: BARS,
  paused: BARS,
  muted: html`<span class="mark">${icon("muted")}</span>`,
  trouble: html`<span class="mark warn">${icon("warn")}</span>`,
};
/** What the words for a screen reader, and the tooltip, add to the song's name. */
const SAID: Partial<Record<Standing, string>> = { paused: ", paused", muted: ", muted" };

export class MicroCard extends Following {
  static properties = { ...Following.properties, _config: { state: true } };
  _config?: Config;

  constructor() {
    super();
    new Clock(this); // the song's place moves on by itself
  }

  /** A new card is for one room, so that it is one small picture from the start (owner,
   * 2026-11-25: with every room it didn't look micro): a Sonos room that is playing, or
   * the first there is. */
  static getStubConfig(hass: Hass) {
    const rooms = Object.keys(hass.states).filter((id) => id.startsWith("media_player.") && hass.entities?.[id]?.platform === "sonos");
    const entity = rooms.find((id) => hass.states[id].state === "playing") ?? rooms[0];
    return entity ? { entity } : {};
  }

  /** Its own editor, as a form drawn by Home Assistant has no grid of nine places. */
  static getConfigElement() {
    return document.createElement(MICRO_EDITOR);
  }

  setConfig(config: Config) {
    this._config = { ...config };
    const at = placement(config.anchor ?? DEFAULTS.anchor);
    this.style.setProperty("--jb-size", `${this._size.px - (config.picture_only ? 0 : 2 * EDGE)}px`);
    this.style.setProperty("--jb-justify", at.justify);
    this.style.setProperty("--jb-align", at.align);
  }

  /** The size chosen; a size that isn't one (a typo in YAML) is small. */
  private get _size() {
    return SIZES[this._config?.size ?? DEFAULTS.size] ?? SIZES.small;
  }

  getCardSize() {
    return Math.ceil(this._size.px / 50);
  }

  /** One room's card is as tall as its picture, and no shorter. A card for everything
   * playing is as tall as its pictures need, however many rows of them there are. */
  getGridOptions() {
    const { rows, columns } = this._size;
    return this._config?.entity ? { columns, rows, min_columns: 2, min_rows: rows } : { columns: 12, min_columns: 2 };
  }

  /** What a tap does: the card's own tap action where it has one, which Home Assistant
   * carries out; otherwise `usual`. */
  private _tap(room: string | undefined, usual: () => void) {
    const action = this._config?.tap_action;
    return action ? () => fire(this, "hass-action", { config: { entity: room, tap_action: action }, action: "tap" }) : usual;
  }

  /** The picture of a room that is playing nothing, or can't be asked: the icon or the
   * picture the card was given for it, or the speaker the quiet rooms have on Jukebox's
   * page. Never the initials of its name (owner, 2026-11-25: a room's gave "KS"). It is
   * a picture as a cover is, so the size, the place and the card round it are the same. */
  private _plate(name: string) {
    const { quiet_icon, quiet_image } = this._config!;
    return plate(this._hass!, name, quiet_icon ? html`<ha-icon .icon=${quiet_icon}></ha-icon>` : icon("rooms"), quiet_image);
  }

  /** Jukebox's page, for a picture that stands for no one room. */
  private _page = () => navigate("/jukebox");

  /** The picture to show before the house is known, or when it can't be. */
  private _unknown(room: string | undefined): Tile {
    const hass = this._hass!;
    const name = room ? (hass.states[room]?.attributes.friendly_name ?? room) : "Jukebox";
    const asking = this._connected && !this._why;
    return { picture: this._plate(name), state: asking ? "asking" : "trouble", says: `${name}: ${this._trouble}`, tap: room ? () => open(hass, room) : this._page, room };
  }

  private _group(house: House, group: Group, room: string | undefined): Tile {
    const hass = this._hass!;
    const state = standing(house, group, this._connected);
    const { title, by } = playing(group);
    const where = names(house, group);

    const what = state === "quiet" ? "nothing playing" : `${title}${by ? ` by ${by}` : ""}${SAID[state] ?? ""}`;
    const why = state === "trouble" ? `. ${group.trouble ?? this._trouble}` : "";
    // A song's place is shown only while the house is heard from: the clock would carry
    // it on by itself.
    const at = state === "trouble" || state === "quiet" ? null : position(group, Date.now());

    return {
      // A quiet room has no picture of its own.
      picture: state === "quiet" ? this._plate(where) : sleeve(hass, group, title),
      state,
      says: `${where}: ${what}${why}`,
      // The room, where one was chosen: the big player follows it if its group changes.
      tap: () => open(hass, room ?? group.id, state === "quiet" ? "favourites" : undefined),
      part: at !== null && group.duration ? at / group.duration : undefined,
      room: room ?? group.id,
    };
  }

  private _tiles(house: House, room: string | undefined): Tile[] {
    const hass = this._hass!;
    if (room) {
      const group = groupOf(house, room);
      if (group) return [this._group(house, group, room)];
      const name = house.rooms[room]?.name ?? room;
      return [{ picture: this._plate(name), state: "trouble", says: `${name} isn't answering`, tap: () => open(hass, room), room }];
    }

    const groups = house.groups.filter((g) => !g.quiet);
    if (groups.length) return groups.map((g) => this._group(house, g, undefined));
    // Nothing is playing: the card keeps its place, as the way to Jukebox's page.
    const [state, says] = this._connected ? (["quiet", "Nothing is playing"] as const) : (["trouble", this._trouble!] as const);
    return [{ picture: this._plate("Jukebox"), state, says: `Jukebox: ${says}`, tap: this._page }];
  }

  render() {
    const [hass, house, config] = [this._hass, this._house, this._config];
    if (!hass || !config) return nothing;
    const tiles = house ? this._tiles(house, config.entity) : [this._unknown(config.entity)];

    const pictures = tiles.map(({ picture, state, says, tap, part, room }) => {
      const still = state !== "playing" && state !== "muted";
      return html`<button class="tile ${state} ${still ? "still" : ""}" title=${says} aria-label=${says} @click=${this._tap(room, tap)}>
        ${picture} ${MARK[state] ?? nothing}
        ${part === undefined ? nothing : html`<i class="prog" style="width:${100 * part}%"></i>`}
      </button>`;
    });
    return html`<ha-card class=${config.picture_only ? "picture-only" : ""}>${pictures}</ha-card>`;
  }

  static styles = [
    shared,
    css`
      /* The pictures in a row that wraps, placed in the card as the nine places say: across
         by justify, and down (in a card taller than they are) by align. */
      :host { display: block; height: 100%; }
      ha-card { display: flex; flex-wrap: wrap; gap: 8px; height: 100%; padding: ${EDGE}px; justify-content: var(--jb-justify, center); align-content: var(--jb-align, center); }
      /* The picture alone: what Home Assistant's Markdown card takes off for text only. */
      ha-card.picture-only { padding: 0; background: none; border: none; box-shadow: none; backdrop-filter: none; }
      /* No border, no raised edge and no hover: it is a picture that can be tapped, not a
         button of the player. Its size is the one chosen, less in a card too narrow for
         it. The marks are measured from its width. */
      .tile { position: relative; display: block; flex: none; width: min(var(--jb-size, 120px), 100%); overflow: hidden; border-radius: 12px; container-type: inline-size; }
      .tile:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .art { transition: filter 0.3s; }
      /* Not playing, or not known to be: the picture loses its colour. Muted music is
         still playing, and keeps it. */
      .still .art { filter: grayscale(0.85) brightness(0.65); }
      /* A picture the card was given for a quiet room is shown as it is: it says quiet by
         being there, and a logo with its colours taken off is no longer the logo. */
      .still .art.plate:has(img) { filter: none; }

      /* A sign on the picture: square-cornered and too small for a finger, so it isn't
         taken for something to press. A tap on it is a tap on the picture. */
      .mark { position: absolute; top: 5%; left: 5%; display: grid; place-items: center; width: clamp(16px, 28cqw, 30px); height: clamp(16px, 28cqw, 30px); border-radius: 22%; background: rgb(0 0 0 / 60%); color: #fff; pointer-events: none;
        /* A light edge, so the mark is still a mark on a cover that is black itself. */
        box-shadow: 0 0 0 1px rgb(255 255 255 / 22%); }
      .mark svg { width: 70%; height: 70%; }
      .mark.warn { background: var(--error-color, #db4437); }

      /* The bars move only while the house says music is playing: only their height is
         changed, by a transform, which costs a wall tablet nothing to draw. */
      .mark.eq { display: flex; align-items: center; justify-content: center; gap: 9%; }
      /* Sized as parts of the mark itself: a padding in % would be of the whole picture's
         width, and left the bars no room at all. */
      .eq i { width: 14%; height: 56%; border-radius: 1px; background: currentColor; transform-origin: bottom; transform: scaleY(0.3); }
      .playing .eq i { animation: bar 0.9s ease-in-out infinite alternate; }
      .playing .eq i:nth-child(2) { animation-delay: -0.3s; }
      .playing .eq i:nth-child(3) { animation-delay: -0.6s; }
      @keyframes bar { to { transform: scaleY(1); } }
      /* Where a device asks for less movement the bars stand at different heights, which
         still tells playing from paused. */
      @media (prefers-reduced-motion: reduce) {
        .playing .eq i { animation: none; transform: scaleY(0.6); }
        .playing .eq i:nth-child(2) { transform: scaleY(1); }
      }

      .prog { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--primary-color, #c4552d); }
    `,
  ];
}
