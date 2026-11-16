// The Console's panel, the same in every era: a chassis for each room, with a lamp that
// glows with the room's lights, a meter for its temperature, a knob for each device with
// a level that can be set, a switch for each that is only on or off, a screen for each
// camera and thumbwheels for an alarm (in an era that has them, a fader is a knob that is slid). Scenes are switches along the top, Sensor Watch's
// alerts are lamps, and a room's history is a recorder. It is built on what every family
// shares (../family.ts), and draws with its era's kit (kit.ts): Bakelite's is the 1950s.
// A card that shows less of it (cards.ts) names its view: one room, one instrument, or the
// lamps alone.
import { html, nothing, type TemplateResult } from "lit";
import { fire } from "../../ha.ts";
import { ALERTS, Family, SIGHTINGS } from "../family.ts";
import { DEGREES, sighted, type Device, type Options, type Room, type Seen, type Sighting } from "../house.ts";
import { recorded, type Change } from "../record.ts";
import { NOMINAL, RANK, clock, flip, type Alert } from "../stories.ts";
import { widths } from "./balance.ts";
import { face, type Kit } from "./kit.ts";

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
// How a screen reader is told these kinds stand: when on, and when off.
const STANDS: Record<string, [string, string]> = { lock: ["locked", "unlocked"], cover: ["open", "closed"], valve: ["open", "closed"], siren: ["sounding", "silent"] };
// What a guarded switch's two ends are lettered: thrown, and at rest.
const ENDS: Record<string, [string, string]> = { lock: ["Unlocked", "Locked"], cover: ["Open", "Shut"], valve: ["Open", "Shut"], siren: ["On", "Off"] };
const ARMED = 6000; // ms: how long a lifted guard waits for the press that throws its switch, and then for the device to answer
const SWEEP = 270; // degrees: how far a knob turns from nothing to full, as it is drawn (styles.ts)
const MOVED = 4; // px: a press that travels less than this is a press, not a drag
const THROWN = 1200; // ms: how long a knife switch stays closed once thrown
const WANTED = 5000; // ms: how long a knob stays where it was put, waiting for its light to say it is there
// The top of the mains meter's scale, in kW: the first that the house's draw fits under.
const MAINS = [3, 6, 12, 24, 48];
// A sensor shown alone, by its device class: the ends of its meter's scale, and its unit.
// A room's temperature has its scale on the panel; power has the mains meter's.
const SCALES: Record<string, [number, number, string]> = { temperature: [5, 30, "°C"], humidity: [0, 100, "%"] };

export type View = "panel" | "room" | "instrument" | "lamps";
export type Config = Options & { type?: string; view?: View; backing?: boolean };

const dims = (d: Device) => d.dims && !d.away;
const alarm = (d: Device) => d.kind === ALARM;
const camera = (d: Device) => d.kind === CAMERA;
const switched = (d: Device) => !dims(d) && !alarm(d) && !camera(d);
/** How a device is named in what the page says of it: by its room too, if it has one. */
const said = (d: Device) => (d.room ? `${d.room} ${d.name}` : d.name);

/** Where a pointer is round the middle of the knob it is on, in degrees. */
function bearing(e: PointerEvent) {
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return (Math.atan2(e.clientY - (box.top + box.height / 2), e.clientX - (box.left + box.width / 2)) * 180) / Math.PI;
}

export class Panel extends Family {
  protected kit!: Kit; // the era's controls: set by the era's own class
  declare protected _config: Config;
  static properties = { _want: { state: true }, _thrown: { state: true }, _armed: { state: true }, _code: { state: true }, _alerts: { state: true }, _heard: { state: true }, _seen: { state: true }, _chart: { state: true } };
  _heard = false; // Sensor Watch's feed has said what it holds: until then, no lamp says all is well
  _want?: { id: string; level: number }; // where a knob was put, until its light says it is there
  _thrown = ""; // the scene whose knife switch is closed
  _armed = ""; // the device whose switch has its guard lifted
  // The code on an alarm's thumbwheels: the place each wheel stands at, counted on and on
  // as it is turned (kit.ts's `face` says what a place shows).
  _code?: { id: string; wheels: number[] };
  private _hiding?: ReturnType<typeof setTimeout>;
  private _dropping?: ReturnType<typeof setTimeout>; // when a lifted guard drops again
  _alerts: Alert[] = []; // what Sensor Watch has said of each sensor it has spoken of
  _seen: Seen[] = []; // what the cameras have seen lately
  // The chart recorder that is open: for which room, the day up to when, and each device's record as it comes.
  _chart?: { room: string; at: number; records: Record<string, Change[]>; fault: string };

  private get _view(): View {
    return this._config.view ?? "panel";
  }

  /** The lamps alone are no part of the house. */
  protected get _reads() {
    return this._view !== "lamps";
  }

  /** The feeds: Sensor Watch's alerts, for the warning lamps, and the cameras' sightings,
   * for their screens, each for a view that shows them. Each says all it holds at first,
   * then each item as it changes. */
  protected _listen() {
    super._listen();
    const view = this._view;
    if (view === "panel" || view === "lamps")
      this._follow(ALERTS, "Sensor Watch's alerts", (alerts: Alert[]) => {
        const held = new Map(this._alerts.map((a) => [a.entity_id, a]));
        for (const a of alerts) held.set(a.entity_id, a);
        this._alerts = [...held.values()];
        this._heard = true;
      });
    if (view === "panel" || view === "room" || this._config.entity?.startsWith(`${CAMERA}.`)) this._follow(SIGHTINGS, "The cameras' sightings", (seen: Seen[]) => {
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
  private _grip?: { id: string; level: number; angle: number; x: number; y: number; at: number; moved: boolean };
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
    const { label, push, wheels } = this.kit;
    const mine = this._code?.id === d.id ? this._code.wheels : Array<number>(WHEELS).fill(0);
    // The code is never logged, nor kept anywhere but on the wheels.
    const code = mine.map(face).join("");
    const ask = (service: string, what: string) => () => this._call({ domain: ALARM, service, ids: [d.id], data: code ? { code } : undefined }, `${said(d)} (${what})`);
    const sets = SETS.filter(([, bit]) => has.supported_features & bit);
    const buttons = d.on || d.phase ? [push("Unset", ask("alarm_disarm", "unset"))] : sets.map(([service, , name]) => push(name, ask(service, name.toLowerCase())));
    return html`<div class="alarm ${stands}">
      ${label(`${d.name}: ${stands}`)}
      ${has.code_format === "number" && !d.away ? wheels(d.name, mine, (i, by) => this._spin(d, i, by)) : nothing}
      ${d.away ? nothing : html`<div class="pushes">${buttons}</div>`}
    </div>`;
  }

  /** A press on a guarded switch (a lock, a garage door, a valve). Its guard is shut only
   * while the device is at rest: locked, shut, silent (owner, 2026-11-15). From rest it
   * takes two presses: the first lifts the guard, for a few seconds, and the second throws
   * the switch. The second must be on the switch itself (the kit's `.throw`): one anywhere
   * else is a change of mind, and the guard drops (owner, 2026-11-15). From a keyboard
   * there is no where, so the second press throws. `thrown`, it takes one press anywhere
   * on it: the guard is shut, which knocks the switch back. The guard is drawn from how
   * the device stands, so it shuts when the device says it is at rest again, and not before. */
  private _guarded(d: Device, thrown: boolean, e: Event) {
    if (thrown) return this._call(flip(d), said(d));
    if (this._armed === d.id) {
      const meant = (e as MouseEvent).detail === 0 || !!(e.target as Element).closest?.(".throw");
      if (!meant) return void (this._armed = "");
      this._call(flip(d), said(d));
    }

    // The guard is up: until the next press, and once the switch is thrown until the
    // device answers. If neither comes, it drops again.
    this._armed = d.id;
    clearTimeout(this._dropping);
    this._timers.delete(this._dropping!);
    this._dropping = setTimeout(() => {
      this._timers.delete(this._dropping!);
      if (this._armed === d.id) this._armed = "";
    }, ARMED);
    this._timers.add(this._dropping);
  }

  /** A press anywhere on the panel that is not on a guarded switch drops a lifted guard. */
  private _elsewhere = (e: Event) => {
    if (this._armed && !(e.target as Element).closest?.(".dolly.shut, .dolly.up")) this._armed = "";
  };

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
          this._grip = { id: d.id, level: stands(), angle: bearing(e), x: e.clientX, y: e.clientY, at: e.clientY, moved: false };
        },
        // The knob is cranked: it turns as far as the finger has gone round its middle,
        // clockwise for more. Each move adds the little it turned since the last, so a
        // finger may go right round, and at either end the knob stops with it.
        move: (e: PointerEvent) => {
          const grip = this._grip;
          if (grip?.id !== d.id) return;
          grip.moved ||= Math.hypot(e.clientX - grip.x, e.clientY - grip.y) > MOVED;
          if (!grip.moved) return;
          // An era's fader (its kit's `slide`) is slid, not cranked: it goes as far up its
          // track, which is as tall as its element, as the finger has gone since the last move.
          const track = e.currentTarget as HTMLElement;
          const slid = track.classList.contains("slide") ? (grip.at - e.clientY) / track.getBoundingClientRect().height : undefined;
          grip.at = e.clientY;
          const angle = bearing(e);
          const turned = ((angle - grip.angle + 540) % 360) - 180;
          grip.angle = angle;
          grip.level = Math.min(max, Math.max(min, grip.level + (slid ?? turned / SWEEP) * (max - min)));
          this._turn(d, snap(grip.level));
        },
        // Let go: a knob that was turned asks for its level, and one that was only pressed switches its device.
        up: () => {
          const grip = this._grip;
          this._grip = undefined;
          if (grip?.id !== d.id) return;
          if (grip.moved && this._want) this._ask(d, this._want.level);
          else this._call(flip(d), said(d));
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
            this._call(flip(d), said(d));
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

  /** The devices of a room the panel shows: an alarm whose code is words can't be set on wheels. */
  private _shows(r: Room) {
    return r.devices.filter((d) => !(alarm(d) && this._hass!.states[d.id]?.attributes.code_format === "text"));
  }

  /** What each camera saw last, if it was lately: it is on that camera's screen. */
  private _sights() {
    const now = Date.now();
    const seen = new Map<string, Sighting>();
    for (const s of this._survey ? sighted(this._survey, this._seen) : []) if (now - s.at < RECENT && s.at >= (seen.get(s.camera)?.at ?? 0)) seen.set(s.camera, s);
    return seen;
  }

  private _look = (id: string) => () => fire(this, "hass-more-info", { entityId: id });

  /** A knob for a device whose level can be set. */
  private _knob(d: Device) {
    const dial = this._dial(d);
    const [sort, what] = KNOBS[d.kind];
    // The heating's plate says what it is set to, and under it what it reads; a player's says what is on.
    const degrees = DEGREES.has(d.kind);
    const plate = degrees ? (d.on ? `${d.name} ${dial.level}°` : `${d.name}: off`) : d.kind === "humidifier" ? `${d.name} ${dial.level}%` : d.name;
    const note = d.title ?? (degrees && d.temp !== undefined ? `now ${d.temp}°` : "");
    return this.kit.knob(plate, sort, what, dial.turn, dial.held, degrees ? `${dial.level} degrees` : `${dial.level} per cent`, note, dial.on, [d.span.min, d.span.max], d.temp);
  }

  /** A switch for a device that is only on or off. */
  private _dolly(d: Device) {
    const { dolly } = this.kit;
    // A robot's switch says where it has got to: returning, docked.
    const name = d.phase ? `${d.name}: ${d.phase}` : d.name;
    const says = STANDS[d.kind] ? `: ${STANDS[d.kind][d.on ? 0 : 1]}` : "";
    if (!d.guarded) return dolly(name, d.on, d.away, () => d.away || this._call(flip(d), said(d)), "", says);
    // A guarded switch is thrown when its device is away from rest: a lock unlocked, a
    // door or a valve open, a siren sounding. Its guard is up then, and while it waits for its second press.
    const thrown = d.kind === "lock" ? !d.on : d.on;
    const up = thrown || this._armed === d.id;
    const next = thrown ? "press to shut it, which puts the switch back" : up ? "press the switch to throw it, or anywhere else to shut the guard" : "press to lift it";
    return dolly(name, thrown, d.away, (e) => d.away || this._guarded(d, thrown, e), up ? "up" : "shut", `${says}. Under a guard: ${next}`, ENDS[d.kind]);
  }

  /** A camera's screen, with what it saw lately. */
  private _screen(d: Device, seen: Map<string, Sighting>) {
    const s = seen.get(d.id);
    return this.kit.tv(s ? `${d.name}: ${s.kind} ${clock(s.at)}` : d.away ? `${d.name}: not answering` : d.name, s?.photo ?? (d.away ? "" : (d.picture ?? "")), this._look(d.id));
  }

  /** The rooms' chassis, with a plate for each floor between them where the house has floors. */
  private _rooms(rooms: Room[], seen: Map<string, Sighting>, floors: boolean) {
    const { label, meter, valve } = this.kit;
    // A room with many controls has a wider chassis, so that none is far taller than the rest.
    const wide = widths(rooms.map((r) => ({ knobs: this._shows(r).filter(dims).length, dollies: this._shows(r).filter(switched).length, alarms: this._shows(r).filter(alarm).length, tvs: this._shows(r).filter(camera).length, meter: r.temp !== undefined })));
    // A meter is lit while Home Assistant is answering: a dark one is not to be believed.
    const live = !this._lost;
    let beat = 1; // the meters are numbered as they are drawn, the two at the top first: see kit.ts
    const chassis = (r: Room, i: number) => {
      const shown = this._shows(r);
      if (!shown.length && r.temp === undefined) return nothing;
      const lights = shown.filter((d) => d.kind === "light" && !d.away);
      const lit = lights.reduce((sum, d) => sum + (d.on ? (d.level ?? 100) : 0), 0) / (lights.length * 100 || 1);
      const more = r.devices.length - shown.length;
      const charts = shown.filter((d) => !camera(d)); // a camera has no day to chart
      return html`<section class="room" style="--wide: ${wide[i]}">
        ${valve(lit ? 0.35 + lit * 0.65 : 0)}${label(r.name)}
        <div class="works">${r.temp === undefined ? nothing : meter(`${r.temp.toFixed(1)}°`, 5, 30, r.temp, "°C", ++beat, live)}
        <div class="dials">${shown.filter(dims).map((d) => this._knob(d))}</div>
        <div class="dollies">${shown.filter(switched).map((d) => this._dolly(d))}</div>
        ${shown.filter(camera).map((d) => this._screen(d, seen))}${shown.filter(alarm).map((d) => this._alarm(d))}</div>
        ${more ? html`<div class="more" title="An alarm whose code is not in digits is not on this panel.">${label(`and ${more} more`)}</div>` : nothing}
        ${charts.length ? html`<button class="rec" aria-label="${r.name}: chart of the last day" @click=${() => this._record(r, charts)}>${label("Chart")}</button>` : nothing}
      </section>`;
    };
    // Rooms come sorted by floor (house.ts). A house with no floors has no plates for them.
    const floored = floors && rooms.some((r) => r.floor);
    return rooms.map((r, i) => {
      const drawn = chassis(r, i);
      const first = floored && drawn !== nothing && r.floor !== rooms[i - 1]?.floor;
      return html`${first ? html`<div class="floor">${label(r.floor ?? "Elsewhere")}</div>` : nothing}${drawn}`;
    });
  }

  /** The sensors in trouble, the worst first, each a lamp. The feed counts in seconds. The
   * lamps shown alone (`always`) say so when none is lit, once the feed has said so. */
  private _lamps(always: boolean) {
    const { jewel, label } = this.kit;
    const lamps = this._alerts.filter((a) => a.level !== NOMINAL).sort((a, b) => (RANK[b.level] ?? 0) - (RANK[a.level] ?? 0) || a.began - b.began);
    if (lamps.length) return html`<div class="lamps">${lamps.map((a) => html`<div class="alert" role="status">${jewel(a.level)}${label(`${a.name}: ${a.message || a.level}, since ${clock(a.began * 1000)}`)}</div>`)}</div>`;
    if (!always) return nothing;
    return html`<div class="lamps"><div class="alert" role="status">${jewel(this._heard ? NOMINAL : "")}${label(this._heard ? "Sensor Watch: all well" : "Waiting for Sensor Watch")}</div></div>`;
  }

  /** One room's chassis, alone. The survey has kept that room and no other (cards.ts). */
  private _room(rooms: Room[]) {
    if (rooms[0]) return html`<div class="rooms">${this._rooms(rooms.slice(0, 1), this._sights(), false)}</div>`;
    return this.kit.label(this._config.rooms?.length ? "This room has nothing the Console can show" : "Choose a room in the card's options");
  }

  /** One entity's control, alone: a device's as on the panel, a scene's knife switch, or a
   * sensor's meter. The survey has read that entity and no other (house.ts). */
  private _instrument(devices: Device[], scenes: { id: string; name: string }[]) {
    const { knife, label, meter } = this.kit;
    const id = this._config.entity;
    if (!id) return label("Choose an entity in the card's options");
    const state = this._hass!.states[id];
    if (!state) return label(`${id} is not in Home Assistant`);

    const d = devices.find((d) => d.id === id);
    if (d && alarm(d) && state.attributes.code_format === "text") return label(`${d.name}: its code is in words, and the Console has only thumbwheels for digits`);
    if (d) return camera(d) ? this._screen(d, this._sights()) : alarm(d) ? this._alarm(d) : dims(d) ? html`<div class="dials">${this._knob(d)}</div>` : html`<div class="dollies">${this._dolly(d)}</div>`;
    const scene = scenes.find((s) => s.id === id);
    if (scene) return html`<div class="knives">${knife(scene.name, this._thrown === id, () => this._throw(scene))}</div>`;

    // A sensor: its reading, on the meter for its class. Its own words say it, as Home Assistant has them.
    const name = state.attributes.friendly_name ?? id;
    const kind = state.attributes.device_class;
    const unit = state.attributes.unit_of_measurement ?? "";
    const value = Number(state.state);
    if (kind !== "power" && !SCALES[kind]) return label(`${name}: the Console has no meter for this`);
    if (state.state === "" || !Number.isFinite(value)) return label(`${name}: not answering`);
    // Each meter wavers at its own pace (kit.ts): one alone takes its pace from its name.
    const beat = [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const reading = `${name}: ${state.state} ${unit}`.trim();
    if (kind !== "power") return meter(reading, SCALES[kind][0], SCALES[kind][1], value, SCALES[kind][2], beat, !this._lost);
    const kw = unit === "kW" ? value : value / 1000;
    return meter(reading, 0, MAINS.find((top) => kw <= top) ?? MAINS.at(-1)!, kw, "kW", beat, !this._lost);
  }

  /** The whole house: the meters, screens and scenes along the top, then the rooms. */
  private _whole() {
    const { knife, meter, tv } = this.kit;
    const house = this._house!;
    // What a camera that is in no room saw has a screen at the top.
    const seen = this._sights();
    const placed = new Set(house.rooms.flatMap((r) => r.devices.filter(camera).map((d) => d.id)));
    const live = !this._lost;
    return html`${this._lamps(false)}
      <div class="top">
        ${house.kw === undefined ? nothing : meter("Mains draw", 0, MAINS.find((top) => house.kw! <= top) ?? MAINS.at(-1)!, house.kw, "kW", 0, live)}
        ${house.outside ? meter("Outside air", -10, 30, house.outside.temp, "°C", 1, live) : nothing}
        ${[...seen.values()].filter((s) => !placed.has(s.camera)).map((s) => tv(`${s.name}: ${s.kind} ${clock(s.at)}`, s.photo ?? "", this._look(s.camera)))}
        ${house.scenes.length ? html`<div class="knives">${house.scenes.map((s) => knife(s.name, this._thrown === s.id, () => this._throw(s)))}</div>` : nothing}
        <slot name="era"></slot>
      </div>
      <div class="rooms">${this._rooms(house.rooms, seen, true)}</div>`;
  }

  render() {
    const { DEFS, label, recorder } = this.kit;
    const view = this._view;
    const house = this._house;
    // The panel's frame, whatever it shows: its class names the view, and an instrument
    // may be drawn on the dashboard's own card with no panel behind it.
    const frame = (body: TemplateResult | string | typeof nothing) => html`<div class="panel as-${view} ${view === "instrument" && this._config.backing === false ? "bare" : ""}" @click=${this._elsewhere}>
      ${DEFS}
      ${this._lost ? html`<div class="warn"><span class="lamp"></span>${label(`No connection to Home Assistant since ${clock(this._lost)}. What is shown is as it was then.`)}</div>` : nothing}
      ${this._fault ? html`<div class="warn"><span class="lamp"></span>${label(this._fault)}</div>` : nothing}
      ${body}
    </div>`;
    if (!this._hass) return frame(label("Waiting for Home Assistant"));
    if (view === "lamps") return frame(this._lamps(true));
    if (!house) return frame(label("Waiting for Home Assistant"));
    if (view === "instrument") return frame(this._instrument(house.rooms.flatMap((r) => r.devices), house.scenes));

    // The chart recorder, if it is open: a lane for each of its room's devices.
    const charted = house.rooms.find((r) => r.name === this._chart?.room);
    const chart = this._chart && charted
      ? recorder(charted.name, this._shows(charted).filter((d) => !camera(d)).map((d) => ({ name: d.name, lo: d.span.min, hi: d.span.max, changes: this._chart!.records[d.id] })), this._chart.at, this._chart.fault, () => (this._chart = undefined))
      : nothing;
    return frame(html`${view === "room" ? this._room(house.rooms) : this._whole()}${chart}`);
  }
}
