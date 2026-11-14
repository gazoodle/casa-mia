// Bakelite: the house as a 1950s instrument panel. A chassis for each room, with a valve
// that glows with the room's lights, a meter for its temperature, a knob for each light
// that dims and a tumbler switch for each other light and switch. Scenes are knife
// switches. It is built on what every family shares (family.ts), and draws with the
// controls in bakelite/kit.ts.
import { html, nothing } from "lit";
import { widths } from "./bakelite/balance.ts";
import { DEFS, dolly, knife, knob, label, meter, push, valve, wheels } from "./bakelite/kit.ts";
import { STYLES } from "./bakelite/styles.ts";
import { Family } from "./family.ts";
import type { Device, Room } from "./house.ts";
import { clock, flip } from "./stories.ts";

export const CARD = "dash-bored-bakelite";
// ponytail: the panel has the kinds that a knob or a tumbler switch can work, and alarms.
// Each other kind (the heating, a player, a camera) needs a control drawn for it in kit.ts; until
// then a room says how many of its devices are not on the panel.
const SHOWN = new Set(["light", "switch", "cover", "lock", "valve", "siren", "alarm_control_panel"]);
const ALARM = "alarm_control_panel";
// An alarm's ways of being set, in the order of their buttons: Home Assistant's service,
// the bit of the alarm's supported features that says it has it, and the button's plate.
const SETS: [string, number, string][] = [["alarm_arm_away", 2, "Away"], ["alarm_arm_home", 1, "Home"], ["alarm_arm_night", 4, "Night"]];
const WHEELS = 6; // thumbwheels for a code: a shorter code leaves some blank
const SHOWING = 30_000; // ms: how long a code stays on its wheels with nothing pressed
// What a screen reader is told a guarded switch does when it is down, and when it is up.
const STANDS: Record<string, [string, string]> = { lock: ["locked", "unlocked"], cover: ["open", "closed"], valve: ["open", "closed"], siren: ["sounding", "silent"] };
const ARMED = 6000; // ms: how long a lifted guard waits for the press that throws its switch
const SWEEP = 270; // degrees: how far a knob turns from nothing to full, as it is drawn (styles.ts)
const MOVED = 4; // px: a press that travels less than this is a press, not a drag
const NUDGE = 10; // per cent: an arrow key's step
const THROWN = 1200; // ms: how long a knife switch stays closed once thrown
const WANTED = 5000; // ms: how long a knob stays where it was put, waiting for its light to say it is there
// The top of the mains meter's scale, in kW: the first that the house's draw fits under.
const MAINS = [3, 6, 12, 24, 48];

/** What a thumbwheel shows at a place on it: nothing at its blank, then the digits. */
const face = (w: number) => (w ? String(w - 1) : "");

/** Where a pointer is round the middle of the knob it is on, in degrees. */
function bearing(e: PointerEvent) {
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return (Math.atan2(e.clientY - (box.top + box.height / 2), e.clientX - (box.left + box.width / 2)) * 180) / Math.PI;
}

export class Bakelite extends Family {
  static styles = STYLES;
  static properties = { _want: { state: true }, _thrown: { state: true }, _armed: { state: true }, _code: { state: true } };
  _want?: { id: string; level: number }; // where a knob was put, until its light says it is there
  _thrown = ""; // the scene whose knife switch is closed
  _armed = ""; // the device whose switch has its guard lifted
  // The code on an alarm's thumbwheels: each wheel is 0 for blank, or one more than its digit.
  _code?: { id: string; wheels: number[] };
  private _hiding?: ReturnType<typeof setTimeout>;
  private _grip?: { id: string; level: number; angle: number; x: number; y: number; moved: boolean };
  private _waiting?: ReturnType<typeof setTimeout>;

  protected _moved(d: Device) {
    if (this._want?.id === d.id) this._want = undefined;
    if (this._armed === d.id) this._armed = "";
    // The alarm has answered: its code is not left on the wheels.
    if (this._code?.id === d.id) this._code = undefined;
  }

  /** Turn one of an alarm's thumbwheels. A code that is left on the wheels is cleared
   * after a while, so that it is not there for the next person to read. */
  private _spin(d: Device, i: number, by: number) {
    const was = this._code?.id === d.id ? this._code.wheels : Array<number>(WHEELS).fill(0);
    this._code = { id: d.id, wheels: was.map((w, at) => (at === i ? (w + by + 11) % 11 : w)) };
    clearTimeout(this._hiding);
    this._timers.delete(this._hiding!);
    this._hiding = setTimeout(() => {
      this._timers.delete(this._hiding!);
      this._code = undefined;
    }, SHOWING);
    this._timers.add(this._hiding);
  }

  /** An alarm: how it stands, its thumbwheels if it takes a code in digits, and its buttons. */
  private _alarm(d: Device) {
    const has = this._hass!.states[d.id]?.attributes ?? {};
    const stands = d.away ? "not answering" : d.phase === "triggered" ? "sounding" : (d.phase ?? (d.on ? "set" : "unset"));
    const mine = this._code?.id === d.id ? this._code.wheels : Array<number>(WHEELS).fill(0);
    // The code is never logged, nor kept anywhere but on the wheels.
    const code = mine.filter(Boolean).map((w) => w - 1).join("");
    const ask = (service: string, what: string) => () => this._call({ domain: ALARM, service, ids: [d.id], data: code ? { code } : undefined }, `${d.room} ${d.name} (${what})`);
    const sets = SETS.filter(([, bit]) => has.supported_features & bit);
    const buttons = d.on || d.phase ? [push("Unset", ask("alarm_disarm", "unset"))] : sets.map(([service, , name]) => push(name, ask(service, name.toLowerCase())));
    return html`<div class="alarm ${stands}">
      ${label(`${d.name}: ${stands}`)}
      ${has.code_format === "number" && !d.away ? wheels(d.name, mine.map((w) => [face((w + 10) % 11), face(w), face((w + 1) % 11)]), (i, by) => this._spin(d, i, by)) : nothing}
      ${d.away ? nothing : html`<div class="pushes">${buttons}</div>`}
    </div>`;
  }

  /** A press on a guarded switch (a lock, a garage door, a valve). The first lifts its
   * guard, for a few seconds; the second throws the switch. */
  private _guarded(d: Device) {
    if (this._armed === d.id) {
      this._armed = "";
      return this._call(flip(d), `${d.room} ${d.name}`);
    }
    this._armed = d.id;
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      if (this._armed === d.id) this._armed = "";
    }, ARMED);
    this._timers.add(timer);
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
          this._grip = { id: d.id, level: stands(), angle: bearing(e), x: e.clientX, y: e.clientY, moved: false };
        },
        // The knob is cranked: it turns as far as the finger has gone round its middle,
        // clockwise for more. Each move adds the little it turned since the last, so a
        // finger may go right round, and at either end the knob stops with it.
        move: (e: PointerEvent) => {
          const grip = this._grip;
          if (grip?.id !== d.id) return;
          grip.moved ||= Math.hypot(e.clientX - grip.x, e.clientY - grip.y) > MOVED;
          if (!grip.moved) return;
          const angle = bearing(e);
          const turned = ((angle - grip.angle + 540) % 360) - 180;
          grip.angle = angle;
          grip.level = Math.min(100, Math.max(0, grip.level + (turned / SWEEP) * 100));
          this._turn(d, Math.round(grip.level));
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

    const dims = (d: Device) => d.dims && !d.away;
    // An alarm whose code is words can't be set on wheels: it stays off the panel.
    const shows = (r: Room) => r.devices.filter((d) => SHOWN.has(d.kind) && !(d.kind === ALARM && this._hass!.states[d.id]?.attributes.code_format === "text"));
    const alarm = (d: Device) => d.kind === ALARM;
    // A room with many controls has a wider chassis, so that none is far taller than the rest.
    const wide = widths(house.rooms.map((r) => ({ knobs: shows(r).filter(dims).length, dollies: shows(r).filter((d) => !dims(d) && !alarm(d)).length, alarms: shows(r).filter(alarm).length, meter: r.temp !== undefined })));
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
          return knob(d.name, d.kind === "light" ? "dimmer" : "position", dial.level, dial.held, dial.on);
        })}</div>
        <div class="dollies">${shown.filter((d) => !dims(d) && !alarm(d)).map((d) => {
          const says = STANDS[d.kind] ? `: ${STANDS[d.kind][d.on ? 0 : 1]}` : "";
          if (!d.guarded) return dolly(d.name, d.on, d.away, () => d.away || this._call(flip(d), `${r.name} ${d.name}`), "", says);
          const up = this._armed === d.id;
          return dolly(d.name, d.on, d.away, () => d.away || this._guarded(d), up ? "up" : "shut", `${says}. Under a guard: ${up ? "press again to throw it" : "press to lift it"}`);
        })}</div>${shown.filter(alarm).map((d) => this._alarm(d))}</div>
        ${more ? html`<div class="more" title="The heating, players, cameras and some other kinds are not on this panel yet.">${label(`and ${more} more`)}</div>` : nothing}
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
