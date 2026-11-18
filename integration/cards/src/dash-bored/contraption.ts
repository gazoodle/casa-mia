// Contraption: a room as one absurd machine that ducks go through, where what happens to
// a duck says what a device is doing. The duck is the engine: a device being on is its
// clutch being in, and a tap on its tile throws it. This first build shows one room. Its
// brief, with what is decided and what is left, is docs/design/dash-bored-contraption.md.
// It is built on what every family shares (family.ts). In contraption/: tile.ts is a
// tile's rule and light.ts, group.ts, carriers.ts and devices.ts the tiles; layout.ts
// lays a room out; run.ts runs the machine; sprites.ts makes its drawings into bitmaps
// and stage.ts places them; faults.ts and bot.ts are what works loose and what mends it;
// skins.ts and styles.ts are the look.
import { html, nothing } from "lit";
import { fire } from "../ha.ts";
import { route, type Step } from "./contraption/layout.ts";
import { Machine } from "./contraption/run.ts";
import { SKINS, worn, type Skin } from "./contraption/skins.ts";
import type { Pen } from "./contraption/stage.ts";
import { STYLES } from "./contraption/styles.ts";
import { S, type Dev } from "./contraption/tile.ts";
import { ALARM, said } from "./digs/chest.ts";
import { Family, PAGE } from "./family.ts";
import type { Device, Options, Room, Survey } from "./house.ts";
import { clock, flip } from "./stories.ts";

export const CARD = "dash-bored-contraption";
const REMEMBERED = "dash-bored-contraption-skin"; // this browser's choice of skin
// ponytail: the first build shows one room, the kitchen, found by its name in English.
// A card can name another (`rooms`). It goes when the whole house is one sheet.
const KITCHEN = /kitchen/i;
const [SMALL, BIG] = [140, 520]; // px: the least a tile is drawn to fit, and the most the slider gives
const SHARP = 2; // the most px of the screen to one of CSS: a phone's three would make an atlas of twice the size for little to see
// ponytail: the atlas is made no finer than this many px to the drawing's unit, so that a
// room's is never more than a few pages. Zoomed in past it, the bitmaps are drawn enlarged.
const FINE = 2;
// Seconds a duck spends in a tile. Anyone who has asked for less movement gets a slow one.
const PERIOD = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? 8 : 2.6);
// A light's colour modes in which it has a colour of its own, not a shade of white.
const COLOURED = new Set(["hs", "rgb", "rgbw", "rgbww", "xy"]);

const air = (r: Room) => [r.temp === undefined ? "" : `${r.temp}° within${r.target === undefined ? "" : ` (${r.target}° wanted)`}`, r.humidity === undefined ? "" : `the air ${r.humidity}% damp`].filter(Boolean).join(", ");

export class Contraption extends Family {
  static styles = [PAGE, STYLES];
  static properties = { _skin: { state: true }, _size: { state: true }, _tile: { state: true }, _rate: { state: true }, _room: { state: true } };
  declare protected _config: Options & { type?: string; style?: string };
  _skin = SKINS[0].id;
  _size = 0; // px: how big a tile is drawn, by the slider (0: to fit the screen)
  _tile = SMALL; // px: how big it is drawn now
  _rate = ""; // how it is going, in words
  _room?: Room; // the room shown
  private _built?: Survey; // the survey the machine was built for
  private _way?: Step[]; // the room's way round, waiting to be made a machine
  private _machine?: Machine;
  private _devs = new Map<string, Dev>(); // each device as its tile holds it, changed in place
  private _pen?: Pen;
  private _baked = ""; // the scale and the skin the atlas was made for
  private _dirty = false; // the canvas is to be fitted again
  private _raf = 0;
  private _last = 0;
  private _frames = 0;

  setConfig(config: Options & { type?: string; style?: string }) {
    super.setConfig(config);
    this._wear();
  }

  /** Which skin: the card's own (`style`), else the one this browser last chose. */
  private _wear() {
    let skin = this._config.style;
    try {
      skin ??= localStorage.getItem(REMEMBERED) ?? undefined;
    } catch {
      // No storage here (a private window): the first skin, then.
    }
    this._dress(SKINS.find((s) => s.id === skin)?.id ?? SKINS[0].id, false);
  }

  private _dress(skin: string, remember = true) {
    this._skin = skin;
    this._dirty = true;
    if (!remember) return;
    try {
      localStorage.setItem(REMEMBERED, skin);
    } catch {
      // Not remembered, that is all.
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._wear();
    // In the capture phase: a scroll does not bubble, and Home Assistant scrolls a view in a box of its own.
    window.addEventListener("scroll", this._look, { passive: true, capture: true });
    this._raf = requestAnimationFrame(this._frame);
    this._after(1000, this._count);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("scroll", this._look, { capture: true });
    cancelAnimationFrame(this._raf);
  }

  protected _resized() {
    this._dirty = true;
    this.requestUpdate();
  }

  /** The room to show: the first a card names, else the kitchen, else the first with anything in it. */
  private _pick() {
    const rooms = this._house!.rooms.filter((r) => r.devices.length);
    return (this._config.rooms?.length ? undefined : rooms.find((r) => KITCHEN.test(r.name))) ?? rooms[0];
  }

  /** A device as its tile is to see it. One that is not answering is not on. */
  private _view(d: Device, group?: string): Dev {
    const state = this._hass!.states[d.id]?.attributes ?? {}, rgb = state.rgb_color;
    const colour = d.kind === "light" && COLOURED.has(state.color_mode) && Array.isArray(rgb) ? `rgb(${rgb.map(Number).join()})` : undefined;
    return { id: d.id, name: d.name, kind: d.kind, on: d.on && !d.away, level: d.level ?? 100, dims: d.dims, colour, group };
  }

  /** The machine is built once for a survey and a room: the registries changed, not a state. */
  protected _surveyed() {
    const room = this._pick();
    this._room = room;
    if (this._built === this._survey) return this._told();
    this._built = this._survey;
    Object.assign(this, { _machine: undefined, _way: undefined, _pen: undefined, _baked: "" });
    if (!room) return;

    // Lights switched together are one machine: in Home Assistant that is a group of
    // lights, which names its lights. The group's own entity then has no tile, since
    // each of its lights has one, and they stand together, where the first of them was.
    const states = this._hass!.states, group = new Map<string, string>(), here = new Set(room.devices.map((d) => d.id));
    for (const d of room.devices) {
      const lights: unknown = d.kind === "light" ? states[d.id]?.attributes.entity_id : undefined;
      const mine = Array.isArray(lights) ? lights.filter((id) => here.has(id) && !group.has(id)) : [];
      if (mine.length > 1) for (const id of mine) group.set(id, d.name);
    }
    const names = new Set(group.values()), first = (d: Device, i: number) => (group.has(d.id) ? room.devices.findIndex((o) => group.get(o.id) === group.get(d.id)) : i);
    const shown = room.devices.map((d, i) => ({ d, at: first(d, i) })).filter(({ d }) => !(names.has(d.name) && Array.isArray(states[d.id]?.attributes.entity_id))).sort((a, b) => a.at - b.at);

    this._devs = new Map(shown.map(({ d }) => [d.id, this._view(d, group.get(d.id))]));
    try {
      this._way = route(room.id, [...this._devs.values()]);
    } catch (err) {
      this._stopped(err);
    }
  }

  /** Something in the machine failed: it is said on the page, and the machine is taken down, not left half drawn. */
  private _stopped = (err: unknown) => {
    console.error("Dash-Bored: Contraption has stopped", err);
    Object.assign(this, { _machine: undefined, _way: undefined });
    this._fault = `Contraption has stopped (${(err as Error)?.message ?? err}).`;
  };

  /** Tell the machine how the room stands now: each device, the words under it, and the air. */
  private _told(first = false) {
    const machine = this._machine, room = this._room;
    if (!machine || !room) return;
    for (const d of room.devices) {
      const dev = this._devs.get(d.id);
      if (!dev) continue;
      Object.assign(dev, this._view(d, dev.group));
      machine.caption(d.id, d.away ? "" : said(d)); // the sign over the sheet says it
      machine.glow(d.id, dev.colour);
      if (first && d.away) machine.answers(d.id, clock(d.since), true);
    }
    machine.note(air(room));
  }

  protected _moved(d: Device) {
    this._machine?.answers(d.id, d.away ? clock(d.since) : "");
  }

  /** A tap on a device's tile switches it. One that is not answering shakes its sign.
   * Where a lock, a garage door or an alarm go in the machine is not designed yet: until
   * it is, a tap on one of those, or on a camera, opens Home Assistant's own dialog, so
   * that a finger on a tile never unlocks a door. */
  private _press(d: Device) {
    if (d.away) return this._machine?.shake(d.id);
    if (d.guarded || d.kind === "camera" || d.kind === ALARM) return fire(this, "hass-more-info", { entityId: d.id });
    this._call(flip(d), `${d.room} ${d.name}`);
  }

  /** How it is going, once a second: how many tiles there are, how many are in view, and
   * how many frames were drawn. A readout of the page's own counter, not a poll of anything. */
  private _count = () => {
    this._after(1000, this._count);
    const machine = this._machine;
    this._rate = machine?.ready ? `${machine.cells.length} tiles, ${machine.seen} in view, ${this._frames} frames a second, ${machine.made.pages} ${machine.made.pages === 1 ? "page" : "pages"} of bitmaps` : "";
    this._frames = 0;
  };

  /** The canvas made to fit: as wide as what is seen of the sheet, and the bitmaps made for the size the tiles are now. */
  private _fit() {
    const machine = this._machine, scroll = this.renderRoot.querySelector<HTMLElement>(".scroll"), canvas = this.renderRoot.querySelector("canvas");
    if (!machine || !scroll || !canvas || !scroll.clientWidth) return;
    this._dirty = false;
    const skin = SKINS.find((s) => s.id === this._skin)!, sharp = Math.min(devicePixelRatio, SHARP);
    // Until the slider is moved the sheet fits the screen, with tiles no smaller than can be read.
    this._tile = this._size || Math.max(SMALL, Math.min(S, Math.floor((scroll.clientWidth * S) / machine.wide)));

    const k = this._tile / S, wide = Math.min(scroll.clientWidth, Math.ceil(machine.wide * k)), high = Math.ceil(machine.high * k);
    Object.assign(canvas, { width: Math.round(wide * sharp), height: Math.round(high * sharp) });
    Object.assign(canvas.style, { width: `${wide}px`, height: `${high}px` });
    this._pen = { g: canvas.getContext("2d")!, k: k * sharp, ox: 0, line: skin.line, w: skin.w };

    const scale = Math.min(k * sharp, FINE), baked = `${scale}|${skin.id}`;
    if (baked !== this._baked) {
      this._baked = baked;
      machine.bake(scale, skin);
    }
    this._look();
  }

  /** Which of the sheet is on the screen: asked at a scroll or a change of size, never frame by frame. */
  private _look = () => {
    const machine = this._machine, scroll = this.renderRoot?.querySelector<HTMLElement>(".scroll"), pen = this._pen;
    if (!machine || !scroll || !pen) return;
    const box = scroll.getBoundingClientRect(), u = S / this._tile;
    pen.ox = scroll.scrollLeft * (pen.k / (this._tile / S));
    machine.look(scroll.scrollLeft * u, (scroll.scrollLeft + scroll.clientWidth) * u, -box.top * u, (window.innerHeight - box.top) * u);
  };

  private _frame = (ms: number) => {
    this._raf = requestAnimationFrame(this._frame);
    const now = ms / 1000, dt = Math.min(0.05, now - this._last), machine = this._machine;
    this._last = now;
    if (!machine?.ready || !this._pen) return;

    try {
      machine.frame(this._pen, dt, now, !!this._lost);
      this._frames++;
    } catch (err) {
      this._stopped(err);
    }
  };

  /** The machine is made once its drawing's bench is on the page, and the canvas fitted when its size may have changed. */
  protected updated() {
    const bench = this.renderRoot.querySelector<SVGSVGElement>(".bench");
    if (this._way && !this._machine && bench && this._room) {
      try {
        this._machine = new Machine(bench, this._way, this._devs, `The ${this._room.name}, by duck`, PERIOD(), this._stopped);
      } catch (err) {
        return this._stopped(err);
      }
      this._told(true);
      this._dirty = true;
      this.requestUpdate(); // the tiles' buttons, now that there are tiles
      return;
    }
    if (this._dirty) this._fit();
  }

  render() {
    if (!this._house) return nothing;
    const room = this._room, machine = this._machine, skin = SKINS.find((s) => s.id === this._skin) as Skin;
    const devices = new Map(room?.devices.map((d) => [d.id, d]));
    const notices = [
      this._lost ? `No word from the house since ${clock(this._lost)}. The ducks are asleep, and nothing shown here is current.` : "",
      this._fault,
      room ? "" : "There is no room with a device in it to make a machine of.",
    ].filter(Boolean);
    const sized = (e: Event) => {
      this._size = Number((e.target as HTMLInputElement).value);
      this._dirty = true;
    };

    return html`<div class="contraption ${this._lost ? "stale" : ""}" data-skin=${skin.id} style=${worn(skin)}>
      <header>
        <h1>${room ? `The ${room.name}, by duck` : "Contraption"}</h1>
        <p>The ducks go through every device in turn and are its engine. Tap a device to throw its clutch.</p>
        <label class="size">Tile size <input type="range" min="100" max=${BIG} step="10" .value=${String(this._tile)} @change=${sized} /> <output>${this._size ? `${this._size} px` : "to fit"}</output></label>
        <output class="rate">${this._rate}</output>
        ${this._config.style || this._sample ? nothing : html`<div class="skins">${SKINS.map((s) => html`<button aria-pressed=${s.id === skin.id} @click=${() => this._dress(s.id)}>${s.name}</button>`)}</div>`}
      </header>
      ${notices.map((words) => html`<p class="notice" role="status">${words}</p>`)}
      <div class="scroll" @scroll=${this._look}>
        ${machine
          ? html`<div class="sheet" style="--t:${this._tile}px;width:${(machine.wide * this._tile) / S}px;height:${(machine.high * this._tile) / S}px">
              <canvas></canvas>
              ${machine.cells.map((c) => {
                const d = c.d && devices.get(c.d.id);
                return d ? html`<button class="hit" style="left:${(c.x * this._tile) / S}px;top:${(c.y * this._tile) / S}px" aria-pressed=${d.on} aria-label="${d.name}: ${said(d)}" @click=${() => this._press(d)}></button>` : nothing;
              })}
            </div>`
          : nothing}
      </div>
      <svg class="bench ink" aria-hidden="true"></svg>
    </div>`;
  }
}
