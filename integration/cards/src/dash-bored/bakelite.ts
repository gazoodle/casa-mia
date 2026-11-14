// Bakelite: the house as a 1950s instrument panel. A chassis for each room, with a valve
// that glows with the room's lights, a meter for its temperature, a knob for each device
// with a level that can be set, a tumbler switch for each that is only on or off, a
// television screen for each camera and thumbwheels for an alarm. Scenes are knife
// switches, Sensor Watch's alerts are lamps, and a room's history is a chart recorder
// (bakelite/recorder.ts). It is built on what every family shares (family.ts), and draws
// with the controls in bakelite/kit.ts.
import { html, nothing } from "lit";
import { fire } from "../ha.ts";
import { widths } from "./bakelite/balance.ts";
import { DEFS, dolly, face, jewel, knife, knob, label, meter, push, tv, valve, wheels } from "./bakelite/kit.ts";
import { recorder } from "./bakelite/recorder.ts";
import { STYLES } from "./bakelite/styles.ts";
import { ALERTS, Family, SIGHTINGS } from "./family.ts";
import { DEGREES, sighted, type Device, type Room, type Seen, type Sighting } from "./house.ts";
import { recorded, type Change } from "./record.ts";
import { NOMINAL, RANK, clock, flip, type Alert } from "./stories.ts";

export const CARD = "dash-bored-bakelite";
const ALARM = "alarm_control_panel";
const CAMERA = "camera";
// Each kind's knob, for one whose level can be set: its class in styles.ts, and the word
// for what it sets.
const KNOBS: Record<string, [string, string]> = { light: ["", "dimmer"], cover: ["wind", "position"], climate: ["heat", "target"], water_heater: ["heat", "target"], media_player: ["sound", "volume"], fan: ["air", "speed"], humidifier: ["air", "target"] };
// These keep their setting while they are off or paused, so their knob stays where it was put.
const KEEPS = new Set(["climate", "water_heater", "humidifier", "media_player"]);
const RECENT = 30 * 60_000; // ms: how long what a camera saw stays on its screen
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
const THROWN = 1200; // ms: how long a knife switch stays closed once thrown
const WANTED = 5000; // ms: how long a knob stays where it was put, waiting for its light to say it is there
// The top of the mains meter's scale, in kW: the first that the house's draw fits under.
const MAINS = [3, 6, 12, 24, 48];

/** Where a pointer is round the middle of the knob it is on, in degrees. */
function bearing(e: PointerEvent) {
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return (Math.atan2(e.clientY - (box.top + box.height / 2), e.clientX - (box.left + box.width / 2)) * 180) / Math.PI;
}

export class Bakelite extends Family {
  static styles = STYLES;
  static properties = { _want: { state: true }, _thrown: { state: true }, _armed: { state: true }, _code: { state: true }, _alerts: { state: true }, _seen: { state: true }, _chart: { state: true } };
  _want?: { id: string; level: number }; // where a knob was put, until its light says it is there
  _thrown = ""; // the scene whose knife switch is closed
  _armed = ""; // the device whose switch has its guard lifted
  // The code on an alarm's thumbwheels: the place each wheel stands at, counted on and on
  // as it is turned (kit.ts's `face` says what a place shows).
  _code?: { id: string; wheels: number[] };
  private _hiding?: ReturnType<typeof setTimeout>;
  _alerts: Alert[] = []; // what Sensor Watch has said of each sensor it has spoken of
  _seen: Seen[] = []; // what the cameras have seen lately
  // The chart recorder that is open: for which room, the day up to when, and each device's record as it comes.
  _chart?: { room: string; at: number; records: Record<string, Change[]>; fault: string };

  /** The feeds: Sensor Watch's alerts, for the warning lamps, and the cameras' sightings,
   * for their screens. Each says all it holds at first, then each item as it changes. */
  protected _listen() {
    super._listen();
    this._follow(ALERTS, "Sensor Watch's alerts", (alerts: Alert[]) => {
      const held = new Map(this._alerts.map((a) => [a.entity_id, a]));
      for (const a of alerts) held.set(a.entity_id, a);
      this._alerts = [...held.values()];
    });
    this._follow(SIGHTINGS, "The cameras' sightings", (seen: Seen[]) => {
      const held = new Map(this._seen.map((s) => [s.id, s]));
      const now = Date.now();
      for (const s of seen) {
        held.set(s.id, s);
        this._later(RECENT - (now - s.at * 1000));
      }
      this._seen = [...held.values()].filter((s) => now - s.at * 1000 < RECENT);
    });
  }

  /** Draw the panel again once `ms` have passed. A date coming due, not a poll: what a
   * camera saw leaves its screen when its time is up. */
  private _later(ms: number) {
    if (ms <= 0) return;
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      this.requestUpdate();
    }, ms + 1000);
    this._timers.add(timer);
  }

  /** Open the chart recorder for a room, and ask Home Assistant for each device's day. */
  private _record(r: Room, devices: Device[]) {
    const at = Date.now();
    this._chart = { room: r.name, at, records: {}, fault: "" };
    const mine = () => this._chart?.at === at;
    for (const d of devices)
      recorded(this._hass!, d, at).then(
        (changes) => mine() && (this._chart = { ...this._chart!, records: { ...this._chart!.records, [d.id]: changes } }),
        (err: any) => {
          console.error(`Dash-Bored: the history of ${d.id} could not be read`, err);
          if (mine()) this._chart = { ...this._chart!, fault: err?.message ?? String(err) };
        },
      );
  }

  /** A dialog is modal only when opened by its method, not by being drawn. */
  protected updated() {
    const chart = this.renderRoot.querySelector("dialog");
    if (chart && !chart.open) chart.showModal();
  }
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
    this._code = { id: d.id, wheels: was.map((w, at) => (at === i ? w + by : w)) };
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
    const code = mine.map(face).join("");
    const ask = (service: string, what: string) => () => this._call({ domain: ALARM, service, ids: [d.id], data: code ? { code } : undefined }, `${d.room} ${d.name} (${what})`);
    const sets = SETS.filter(([, bit]) => has.supported_features & bit);
    const buttons = d.on || d.phase ? [push("Unset", ask("alarm_disarm", "unset"))] : sets.map(([service, , name]) => push(name, ask(service, name.toLowerCase())));
    return html`<div class="alarm ${stands}">
      ${label(`${d.name}: ${stands}`)}
      ${has.code_format === "number" && !d.away ? wheels(d.name, mine, (i, by) => this._spin(d, i, by)) : nothing}
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

  /** Put a knob at a level and ask its device for it. The knob goes back to where the
   * device really is if it has not answered in a few seconds. */
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

  /** A knob for a device: where it stands, in the device's own units (per cent, or
   * degrees) and as a part of the knob's travel, and what a finger or a key does to it. */
  private _dial(d: Device) {
    const { min, max, step, vote } = d.span;
    const rest = KEEPS.has(d.kind) ? (d.level ?? min) : d.on ? (d.level ?? max) : min;
    const stands = () => (this._want?.id === d.id ? this._want.level : rest);
    // A level the device will take: within its span, and on one of its steps.
    const snap = (level: number) => +(Math.round(Math.min(max, Math.max(min, level)) / step) * step).toFixed(2);
    return {
      level: stands(),
      turn: ((stands() - min) / (max - min)) * 100,
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
          grip.level = Math.min(max, Math.max(min, grip.level + (turned / SWEEP) * (max - min)));
          this._turn(d, snap(grip.level));
        },
        // Let go: a knob that was turned asks for its level, and one that was only pressed switches its device.
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
          const by = { ArrowUp: vote, ArrowRight: vote, ArrowDown: -vote, ArrowLeft: -vote }[e.key];
          if (by) {
            e.preventDefault();
            const to = snap(stands() + by);
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
    const shows = (r: Room) => r.devices.filter((d) => !(d.kind === ALARM && this._hass!.states[d.id]?.attributes.code_format === "text"));
    const alarm = (d: Device) => d.kind === ALARM;
    const camera = (d: Device) => d.kind === CAMERA;
    const switched = (d: Device) => !dims(d) && !alarm(d) && !camera(d);
    // A room with many controls has a wider chassis, so that none is far taller than the rest.
    const wide = widths(house.rooms.map((r) => ({ knobs: shows(r).filter(dims).length, dollies: shows(r).filter(switched).length, alarms: shows(r).filter(alarm).length, tvs: shows(r).filter(camera).length, meter: r.temp !== undefined })));
    // What each camera saw last, if it was lately: it is on that camera's screen. One from
    // a camera that is in no room has a screen at the top.
    const now = Date.now();
    const seen = new Map<string, Sighting>();
    for (const s of this._survey ? sighted(this._survey, this._seen) : []) if (now - s.at < RECENT && s.at >= (seen.get(s.camera)?.at ?? 0)) seen.set(s.camera, s);
    const placed = new Set(house.rooms.flatMap((r) => r.devices.filter(camera).map((d) => d.id)));
    const look = (id: string) => () => fire(this, "hass-more-info", { entityId: id });
    // A meter is lit while Home Assistant is answering: a dark one is not to be believed.
    const live = !this._lost;
    // The sensors in trouble, the worst first. The feed counts in seconds.
    const lamps = this._alerts.filter((a) => a.level !== NOMINAL).sort((a, b) => (RANK[b.level] ?? 0) - (RANK[a.level] ?? 0) || a.began - b.began);
    // The chart recorder, if it is open: a lane for each of its room's devices.
    const charted = house.rooms.find((r) => r.name === this._chart?.room);
    const chart = this._chart && charted
      ? recorder(charted.name, shows(charted).filter((d) => !camera(d)).map((d) => ({ name: d.name, lo: d.span.min, hi: d.span.max, changes: this._chart!.records[d.id] })), this._chart.at, this._chart.fault, () => (this._chart = undefined))
      : nothing;
    let beat = 1; // the meters are numbered as they are drawn, the two at the top first: see kit.ts
    const chassis = (r: Room, i: number) => {
      const shown = shows(r);
      if (!shown.length && r.temp === undefined) return nothing;
      const lights = shown.filter((d) => d.kind === "light" && !d.away);
      const lit = lights.reduce((sum, d) => sum + (d.on ? (d.level ?? 100) : 0), 0) / (lights.length * 100 || 1);
      const more = r.devices.length - shown.length;
      const charts = shown.filter((d) => !camera(d)); // a camera has no day to chart
      return html`<section class="room" style="--wide: ${wide[i]}">
        ${valve(lit ? 0.35 + lit * 0.65 : 0)}${label(r.name)}
        <div class="works">${r.temp === undefined ? nothing : meter(`${r.temp.toFixed(1)}°`, 5, 30, r.temp, "°C", ++beat, live)}
        <div class="dials">${shown.filter(dims).map((d) => {
          const dial = this._dial(d);
          const [sort, what] = KNOBS[d.kind];
          // The heating's plate says what it is set to, and under it what it reads; a player's says what is on.
          const degrees = DEGREES.has(d.kind);
          const plate = degrees ? (d.on ? `${d.name} ${dial.level}°` : `${d.name}: off`) : d.kind === "humidifier" ? `${d.name} ${dial.level}%` : d.name;
          const note = d.title ?? (degrees && d.temp !== undefined ? `now ${d.temp}°` : "");
          return knob(plate, sort, what, dial.turn, dial.held, degrees ? `${dial.level} degrees` : `${dial.level} per cent`, note, dial.on);
        })}</div>
        <div class="dollies">${shown.filter(switched).map((d) => {
          // A robot's switch says where it has got to: returning, docked.
          const name = d.phase ? `${d.name}: ${d.phase}` : d.name;
          const says = STANDS[d.kind] ? `: ${STANDS[d.kind][d.on ? 0 : 1]}` : "";
          if (!d.guarded) return dolly(name, d.on, d.away, () => d.away || this._call(flip(d), `${r.name} ${d.name}`), "", says);
          const up = this._armed === d.id;
          return dolly(name, d.on, d.away, () => d.away || this._guarded(d), up ? "up" : "shut", `${says}. Under a guard: ${up ? "press again to throw it" : "press to lift it"}`);
        })}</div>
        ${shown.filter(camera).map((d) => {
          const s = seen.get(d.id);
          return tv(s ? `${d.name}: ${s.kind} ${clock(s.at)}` : d.away ? `${d.name}: not answering` : d.name, s?.photo ?? (d.away ? "" : (d.picture ?? "")), look(d.id));
        })}${shown.filter(alarm).map((d) => this._alarm(d))}</div>
        ${more ? html`<div class="more" title="An alarm whose code is not in digits is not on this panel.">${label(`and ${more} more`)}</div>` : nothing}
        ${charts.length ? html`<button class="rec" aria-label="${r.name}: chart of the last day" @click=${() => this._record(r, charts)}>${label("Chart")}</button>` : nothing}
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
      ${lamps.length ? html`<div class="lamps">${lamps.map((a) => html`<div class="alert" role="status">${jewel(a.level)}${label(`${a.name}: ${a.message || a.level}, since ${clock(a.began * 1000)}`)}</div>`)}</div>` : nothing}
      <div class="top">
        ${house.kw === undefined ? nothing : meter("Mains draw", 0, MAINS.find((top) => house.kw! <= top) ?? MAINS.at(-1)!, house.kw, "kW", 0, live)}
        ${house.outside ? meter("Outside air", -10, 30, house.outside.temp, "°C", 1, live) : nothing}
        ${[...seen.values()].filter((s) => !placed.has(s.camera)).map((s) => tv(`${s.name}: ${s.kind} ${clock(s.at)}`, s.photo ?? "", look(s.camera)))}
        ${house.scenes.length ? html`<div class="knives">${house.scenes.map((s) => knife(s.name, this._thrown === s.id, () => this._throw(s)))}</div>` : nothing}
      </div>
      <div class="rooms">${rooms}</div>
      ${chart}
    </div>`;
  }
}
