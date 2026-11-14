// Bakelite: the house as a 1950s instrument panel. A chassis for each room, with a valve
// that glows with the room's lights, a meter for its temperature, a knob for each light
// that dims and a tumbler switch for each other light and switch. Scenes are knife
// switches. It is built on what every family shares (family.ts), and draws with the
// controls in bakelite/kit.ts.
import { html, nothing } from "lit";
import { widths } from "./bakelite/balance.ts";
import { DEFS, dolly, knife, knob, label, meter, valve } from "./bakelite/kit.ts";
import { STYLES } from "./bakelite/styles.ts";
import { Family } from "./family.ts";
import type { Device, Room } from "./house.ts";
import { clock, flip } from "./stories.ts";

export const CARD = "dash-bored-bakelite";
// ponytail: this first panel has lights and switches. Each other kind (a blind, a lock,
// the heating) needs a control drawn for it in kit.ts; until then a room says how many
// of its devices are not on the panel.
const SHOWN = new Set(["light", "switch"]);
const DRAG = 0.8; // per cent for each pixel a knob is dragged up
const MOVED = 4; // px: a press that travels less than this is a press, not a drag
const NUDGE = 10; // per cent: an arrow key's step
const THROWN = 1200; // ms: how long a knife switch stays closed once thrown
const WANTED = 5000; // ms: how long a knob stays where it was put, waiting for its light to say it is there
// The top of the mains meter's scale, in kW: the first that the house's draw fits under.
const MAINS = [3, 6, 12, 24, 48];

export class Bakelite extends Family {
  static styles = STYLES;
  static properties = { _want: { state: true }, _thrown: { state: true } };
  _want?: { id: string; level: number }; // where a knob was put, until its light says it is there
  _thrown = ""; // the scene whose knife switch is closed
  private _grip?: { id: string; from: number; y: number; moved: boolean };
  private _waiting?: ReturnType<typeof setTimeout>;

  protected _moved(d: Device) {
    if (this._want?.id === d.id) this._want = undefined;
  }

  /** Put a knob at a level and ask its light for it. The knob goes back to where the
   * light really is if the light has not answered in a few seconds. */
  private _turn(d: Device, level: number) {
    this._want = { id: d.id, level };
    clearTimeout(this._waiting);
    this._timers.delete(this._waiting!);
    this._waiting = setTimeout(() => {
      this._timers.delete(this._waiting!);
      if (!this._grip) this._want = undefined;
    }, WANTED);
    this._timers.add(this._waiting);
  }

  private _dial(d: Device) {
    const stands = () => (this._want?.id === d.id ? this._want.level : d.on ? (d.level ?? 100) : 0);
    return {
      level: stands(),
      held: this._grip?.id === d.id,
      on: {
        down: (e: PointerEvent) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          this._grip = { id: d.id, from: stands(), y: e.clientY, moved: false };
        },
        move: (e: PointerEvent) => {
          const grip = this._grip;
          if (grip?.id !== d.id) return;
          const up = grip.y - e.clientY;
          grip.moved ||= Math.abs(up) > MOVED;
          if (grip.moved) this._turn(d, Math.round(Math.min(100, Math.max(0, grip.from + up * DRAG))));
        },
        // Let go: a knob that was turned asks for its level, and one that was only pressed switches its light.
        up: () => {
          const grip = this._grip;
          this._grip = undefined;
          if (grip?.id !== d.id) return;
          if (grip.moved && this._want) this._ask(d, this._want.level);
          else this._call(flip(d), `${d.room} ${d.name}`);
        },
        drop: () => {
          this._grip = this._want = undefined;
        },
        key: (e: KeyboardEvent) => {
          const step = { ArrowUp: NUDGE, ArrowRight: NUDGE, ArrowDown: -NUDGE, ArrowLeft: -NUDGE }[e.key];
          if (step) {
            e.preventDefault();
            const to = Math.min(100, Math.max(0, stands() + step));
            this._turn(d, to);
            this._ask(d, to);
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this._call(flip(d), `${d.room} ${d.name}`);
          }
        },
      },
    };
  }

  private _throw(scene: { id: string; name: string }) {
    this._call({ domain: "scene", service: "turn_on", ids: [scene.id] }, scene.name);
    this._thrown = scene.id;
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      if (this._thrown === scene.id) this._thrown = "";
    }, THROWN);
    this._timers.add(timer);
  }

  render() {
    const house = this._house;
    if (!this._hass || !house) return html`<div class="panel">${label("Waiting for Home Assistant")}</div>`;

    const dims = (d: Device) => d.kind === "light" && d.dims && !d.away;
    const shows = (r: Room) => r.devices.filter((d) => SHOWN.has(d.kind) && !d.guarded);
    // A room with many controls has a wider chassis, so that none is far taller than the rest.
    const wide = widths(house.rooms.map((r) => ({ knobs: shows(r).filter(dims).length, dollies: shows(r).filter((d) => !dims(d)).length, meter: r.temp !== undefined })));
    const chassis = (r: Room, i: number) => {
      const shown = shows(r);
      if (!shown.length && r.temp === undefined) return nothing;
      const lights = shown.filter((d) => d.kind === "light" && !d.away);
      const lit = lights.reduce((sum, d) => sum + (d.on ? (d.level ?? 100) : 0), 0) / (lights.length * 100 || 1);
      const more = r.devices.length - shown.length;
      return html`<section class="room" style="--wide: ${wide[i]}">
        ${valve(lit ? 0.35 + lit * 0.65 : 0)}${label(r.name)}
        <div class="works">${r.temp === undefined ? nothing : meter(`${r.temp.toFixed(1)}°`, 5, 30, r.temp, "°C")}
        <div class="dials">${shown.filter(dims).map((d) => {
          const dial = this._dial(d);
          return knob(d.name, dial.level, dial.held, dial.on);
        })}</div>
        <div class="dollies">${shown.filter((d) => !dims(d)).map((d) => dolly(d.name, d.on, d.away, () => d.away || this._call(flip(d), `${r.name} ${d.name}`)))}</div></div>
        ${more ? html`<div class="more" title="This panel has lights and switches so far.">${label(`and ${more} more`)}</div>` : nothing}
      </section>`;
    };
    // Rooms come sorted by floor (house.ts). A house with no floors has no plates for them.
    const floored = house.rooms.some((r) => r.floor);
    const rooms = house.rooms.map((r, i) => {
      const drawn = chassis(r, i);
      const first = floored && drawn !== nothing && r.floor !== house.rooms[i - 1]?.floor;
      return html`${first ? html`<div class="floor">${label(r.floor ?? "Elsewhere")}</div>` : nothing}${drawn}`;
    });

    return html`<div class="panel">
      ${DEFS}
      ${this._lost ? html`<div class="warn"><span class="lamp"></span>${label(`No connection to Home Assistant since ${clock(this._lost)}. What is shown is as it was then.`)}</div>` : nothing}
      ${this._fault ? html`<div class="warn"><span class="lamp"></span>${label(this._fault)}</div>` : nothing}
      <div class="top">
        ${house.kw === undefined ? nothing : meter("Mains draw", 0, MAINS.find((top) => house.kw! <= top) ?? MAINS.at(-1)!, house.kw, "kW")}
        ${house.outside ? meter("Outside air", -10, 30, house.outside.temp, "°C") : nothing}
        ${house.scenes.length ? html`<div class="knives">${house.scenes.map((s) => knife(s.name, this._thrown === s.id, () => this._throw(s)))}</div>` : nothing}
      </div>
      <div class="rooms">${rooms}</div>
    </div>`;
  }
}
