// Digs: the house in section, built of square blocks, standing in its garden. A block for
// each device, lit by its lamps; the household walking about the house; hearts for
// the house's health and a bar for its power; the scenes along the bottom; and a sky that
// keeps the time and the weather. After the mock-up, docs/design/dash-bored/digs.html.
// It is built on what every family shares (family.ts): digs/world.ts lays the house out,
// digs/textures.ts paints the blocks and the lettering, digs/chest.ts is a room's list,
// digs/shots.ts draws the cameras' pictures, digs/prank.ts is the imp's show,
// digs/walk.ts walks the household about, digs/follow.ts has the view follow them when
// nobody is touching it, and digs/styles.ts is the look.
import { html, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { fire, room as below, watchRoom } from "../ha.ts";
import { ALARM, chest, said, shown } from "./digs/chest.ts";
import { Tour } from "./digs/follow.ts";
import { GOES, Prank } from "./digs/prank.ts";
import { SHOT, shots } from "./digs/shots.ts";
import { STYLES } from "./digs/styles.ts";
import { BUILDS, bg, figure, say, texture, type Shape } from "./digs/textures.ts";
import { Walks, about } from "./digs/walk.ts";
import { CHEST, LAMPS, build, cutout, lamp, shades, type Slot, type World } from "./digs/world.ts";
import { ALERTS, Family, PAGE } from "./family.ts";
import { AGAIN } from "./fridge.ts";
import type { Device, House, Kind, Person, Room, Survey } from "./house.ts";
import { CHOOSE } from "./shell.ts";
import { NOMINAL, clock, flip, type Alert } from "./stories.ts";

export const CARD = "dash-bored-digs";
// The feed of what Casa Mia's People says of each person (household.py in the integration).
const HOUSEHOLD = "casa_mia_dash_bored/household";
type Aged = { person: string; band: "baby" | "toddler" | "child" | null; birthday: boolean };
// How much longer each step takes than a grown-up's (walk.ts pace): a toddler toddles, a baby crawls.
const PACES: Record<Shape, number> = { grown: 1, child: 1, toddler: 1.5, baby: 2.5 };
const ARMED = 3000; // ms: how long a cracked block waits for its second hit
const CHOSEN = 8000; // ms: how long a block stays chosen with nothing pressed
const ROOM = "room:"; // before a room's id in `_sel`: its name is what is chosen
const MINUTE = 60_000;
const DUSK = 0.3; // daylight under which nobody goes out of doors
const HEARTS = 10;
const BOLT = 0.3; // kW: what each bolt of the power bar stands for
const LEVELS = 10; // blocks in a level's stack
const TIGHT = 0.75; // the least a room's name and temperature are shrunk to, to fit over the room
const BLOCK = 32; // px: a block on a dashboard's card; the page's is fitted to the screen's height
const [SMALL, BIG] = [16, 64]; // px: the least and the most a block is on the page
const ROOMY = 48; // px: the most a block is on a room's card, which is fitted to the card's width
const MAP = 2; // px: a block on the map

// Each kind's block, on and off. A kind not here is a machine.
const FACES: Partial<Record<Kind, [on: string, off: string]>> = {
  light: ["lampOn", "lampOff"], lock: ["door", "doorOpen"], cover: ["doorOpen", "door"], climate: ["stoveOn", "stoveOff"], water_heater: ["stoveOn", "stoveOff"],
  camera: ["camera", "camera"], [ALARM]: ["alarmOn", "alarmOff"],
};
// Each kind of light's drawing indoors, by world.ts `lamp`: the textures' names without On or Off.
const LAMP_FACES = { pendant: "lamp", spot: "spot", strip: "strip", standing: "standing" } as const;
// What a level's stack is built of, by kind: embers for any not here.
const FILLS: Partial<Record<Kind, string>> = { light: "lanternOn", cover: "slat" };
// Home Assistant's words for the weather that fall from the sky, and those under which the sky is clear.
const FALLS: Record<string, "rain" | "snow"> = { rainy: "rain", pouring: "rain", "lightning-rainy": "rain", hail: "rain", snowy: "snow", "snowy-rainy": "snow" };
const CLEAR = new Set(["sunny", "clear-night", "partlycloudy", "windy"]);
/** The sky in a word of our own: what falls, or whether there is cloud. */
const weather = (sky: string) => FALLS[sky] ?? (CLEAR.has(sky) && sky !== "partlycloudy" ? "clear" : "cloud");
const ICONS = { rain: "skyRain", snow: "skySnow", clear: "skySun", cloud: "skyCloud" };
/** Whether the sky is dull: anything but clear or partly so. It takes a fifth of the daylight and hides the sun. */
const overcast = (house?: House) => !!house?.outside && !CLEAR.has(house.outside.sky);
const [NIGHT, DAY, DULL] = [[10, 15, 44], [127, 178, 255], [125, 135, 148]];
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const things = (n: number, what: string) => `${n} ${what}${n === 1 ? "" : "s"}`;
/** Where something is in the world, in blocks, as a style. */
const place = (x: number, y: number, w = 1, h = 1) => `--x:${x};--y:${y};--cw:${w};--ch:${h}`;
/** Whether less movement is asked for: nobody walks, no prank, and the view stays where it is put. */
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export class Digs extends Family {
  static styles = [PAGE, STYLES];
  static properties = { _alerts: { state: true }, _sel: { state: true }, _armed: { state: true }, _hurt: { state: true }, _told: { state: true }, _open: { state: true }, _now: { state: true }, _b: { state: true } };
  _alerts: Alert[] = []; // what Sensor Watch has said of each sensor it has spoken of
  // The device chosen (or ROOM and a room's id): the tip and the tag are about it, the level's stack is its, and its next press switches it.
  _sel = "";
  _armed = ""; // the guarded device whose block has had its first hit
  _hurt = -1; // which of the lost hearts the tip is telling of (-1: none)
  _told = ""; // what the notice said when it was pressed, for the tip
  _open = ""; // the room whose list is open, by its id
  _now = Date.now(); // ms: the minute the clock shows
  _b = BLOCK; // px: a block
  private _world?: World;
  private _built?: Survey; // the survey the world was built for
  private _day = 1; // how much daylight there is, from 0 to 1
  private _dropping?: ReturnType<typeof setTimeout>;
  private _lapsing?: ReturnType<typeof setTimeout>;
  private _unwatch?: () => void;
  // The imp and its crate (digs/prank.ts): told what it may know of the page, and no more.
  private _prank = new Prank({
    after: (ms, then) => void this._after(ms, then),
    requestUpdate: () => this.requestUpdate(),
    world: () => this._world,
    seen: () => {
      const scroll = this.renderRoot.querySelector(".scroll");
      return scroll ? [Math.ceil(scroll.scrollLeft / this._b), Math.floor((scroll.scrollLeft + scroll.clientWidth) / this._b) - 1] : [0, 0];
    },
    still: () => this._sample || this._alone || !!this._open || calm(),
    began: () => this._tour.imp(),
  });
  // The household walking about (digs/walk.ts), and the view following them when nobody is touching it (digs/follow.ts).
  private _walks = new Walks({
    after: (ms, then) => void this._after(ms, then),
    requestUpdate: () => this.requestUpdate(),
    world: () => this._world,
    homely: (world) => this._lived(world),
    outdoors: () => this._day >= DUSK && !(this._house?.outside && FALLS[this._house.outside.sky]),
    still: () => this._sample || calm(),
    arrived: (id) => this._tour.arrived(id),
    setOff: (id) => this._tour.setOff(id),
    pace: (id) => PACES[this._shape(id)],
    crawls: (id) => this._shape(id) === "baby",
  });
  private _tour = new Tour({
    scroller: () => this.renderRoot?.querySelector<HTMLElement>(".scroll"),
    block: () => this._b,
    instead: (was, ms, then) => this._instead(was, ms, then),
    able: () => this.hasAttribute("panel") && !this._alone && !this._sample && !calm(),
    target: (who) => {
      const imp = this._prank.spot;
      return imp ? { x: imp.x, moving: false } : this._walks.where(who);
    },
    pick: (not) => this._walks.pick(not),
    requestUpdate: () => this.requestUpdate(),
  });
  // What Casa Mia's People says of each person, by their person entity: empty without it.
  private _aged = new Map<string, Aged>();
  private _synced?: [House | undefined, World | undefined]; // the house and world the walks were last told of
  private _hands?: AbortController; // the listeners for a touch, which hands the view back

  connectedCallback() {
    super.connectedCallback();
    this._tick();
    this._prank.start();
    this._walks.start();
    this._synced = undefined;
    this._unwatch = watchRoom(this._fit);
    // Anything the viewer does stops the tour at once, before the press itself is handled.
    this._hands = new AbortController();
    for (const type of ["pointerdown", "wheel", "keydown"]) this.addEventListener(type, this._tour.touched, { capture: true, passive: true, signal: this._hands.signal });
    this._tour.touched();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unwatch?.();
    this._hands?.abort();
    this._tour.stop();
  }

  /** The clock: a date coming due, not a poll. It is set again at the turn of each minute. */
  private _tick = () => {
    this._now = Date.now();
    this._after(MINUTE - (this._now % MINUTE) + 50, this._tick);
  };

  /** A room's card (room.ts) shows the world cut down to its one room (world.ts `cutout`):
   * the tip and the room's scenes are over the earth under it. */
  private get _cut() {
    return this._alone && this._world ? cutout(this._world) : undefined;
  }

  /** As the page, a block is as big as lets the whole world's height on the screen, and the sky has what is left over. */
  private _fit = () => {
    // In half texels: a block of 50 px would have texels of quite different sizes side by side.
    const cut = this._cut;
    // A room's card is fitted to its width, less a block for the level's stack down its right edge.
    const b = cut && this.clientWidth ? clamp(Math.floor(this.clientWidth / (cut.w + 1) / 8) * 8, SMALL, ROOMY)
      : this.hasAttribute("panel") && this._world ? clamp(Math.floor(below(this) / this._world.h / 8) * 8, SMALL, BIG) : BLOCK;
    if (b !== this._b) this._b = b;
    this._framed();
  };

  protected _resized() {
    this._fit();
  }

  /** Sensor Watch's alerts, each a heart lost: all it holds at first, then each as it changes. */
  protected _listen() {
    super._listen();
    // The hearts are the whole house's health: a room's card has none.
    if (!this._alone)
      this._follow(ALERTS, "Sensor Watch's alerts", (alerts: Alert[]) => {
        const held = new Map(this._alerts.map((a) => [a.entity_id, a]));
        for (const a of alerts) held.set(a.entity_id, a);
        this._alerts = [...held.values()];
      });
    // The household's ages, for each figure's size: the whole household in each item.
    if (!this._alone)
      this._follow(HOUSEHOLD, "Casa Mia's People", (told: { people: Aged[] }[]) => {
        const last = told.at(-1);
        if (!last) return;
        this._aged = new Map(last.people.map((p) => [p.person, p]));
        this.requestUpdate();
      });
  }

  /** The world is built once for a survey: the registries changed, not a state. */
  protected _surveyed() {
    if (this._built !== this._survey) {
      this._built = this._survey;
      this._world = build(this._house!.rooms, !this._alone && !!this._survey?.weather);
      this._fit();
    }
    // The forecast's signs are in the garden, which a room's card does not show.
    if (!this._alone) this._outlook();
  }

  protected _moved(d: Device) {
    if (this._armed === d.id) this._armed = "";
  }

  /** How somebody is drawn: by the band their age falls in, and grown without Casa Mia's People. */
  private _shape(id: string): Shape {
    return this._aged.get(id)?.band ?? "grown";
  }

  /** Who is about the house: everybody Home Assistant has at home, and everybody it can't
   * place at all (walk.ts `about`). `house.people` leaves the second out, as the other
   * families can't say where they are. */
  private _household(): Person[] {
    return (this._survey?.people ?? []).flatMap((id) => {
      const state = this._hass?.states[id];
      return about(state?.state) ? [{ id, name: state?.attributes.friendly_name ?? id, place: "home", since: 0 }] : [];
    });
  }

  /** The rooms the household is most likely in: Home Assistant says only that somebody is
   * at home, so they are where a light is on, or on the ground floor when none is. */
  private _lived(world: World) {
    const lit = world.zones.filter((z) => this._house?.rooms.find((r) => r.id === z.id)?.devices.some((d) => d.kind === "light" && d.on));
    return lit.length ? lit : world.zones.filter((z) => z.storey === 0);
  }

  /** Something was pressed: the tip is about that now, and nothing else. What is chosen
   * stays so for a few seconds after the last press and then is not: a block chosen
   * yesterday must not switch at one press while the one beside it takes two. */
  private _point(sel = "", told = "") {
    this._sel = sel;
    this._told = told;
    this._hurt = -1;
    this._lapsing = this._instead(this._lapsing, sel || told ? CHOSEN : 0, () => this._point());
  }

  /** A press on a device's block. The blocks have no names on them, so the first press
   * only chooses a block and says what it is, and a press on the chosen block switches it
   * (owner, 2026-11-18). `named`: in a room's list each has its name, and one press
   * switches. A lock, a garage door, a valve or a siren then cracks, and is unlocked,
   * opened or sounded by one press more within three seconds. A camera or an alarm opens
   * Home Assistant's own dialog at once: that changes nothing in the house. */
  private _press(d: Device, named = false) {
    const chosen = named || this._sel === d.id;
    this._point(d.id);
    if (d.away) return;
    if (d.kind === "camera" || d.kind === ALARM) return fire(this, "hass-more-info", { entityId: d.id });
    if (!chosen) return;

    const risky = d.guarded && (d.kind === "lock" ? d.on : !d.on);
    if (risky && this._armed !== d.id) {
      this._armed = d.id;
      this._dropping = this._instead(this._dropping, ARMED, () => this._armed === d.id && (this._armed = ""));
      return;
    }
    this._armed = "";
    this._call(flip(d), `${d.room} ${d.name}`);
  }

  /** What each lost heart is for: a door left unlocked, an alert of Sensor Watch's, a device not answering. */
  private _hurts(devices: Device[]) {
    return [
      ...devices.filter((d) => d.kind === "lock" && !d.on && !d.away).map((d) => `${d.room} ${d.name} unlocked`),
      ...this._alerts.filter((a) => a.level !== NOMINAL).map((a) => `${a.name}: ${a.message || a.level}`),
      ...devices.filter((d) => d.away).map((d) => `${d.room} ${d.name} not answering`),
    ];
  }

  /** What the tip says while the view is touring (digs/follow.ts): whom it follows, and that a touch ends it. */
  private _touring(house: House) {
    const who = this._tour.following;
    if (who === undefined) return undefined;
    const name = this._prank.spot ? "the imp" : (house.people.find((p) => p.id === who)?.name ?? "");
    return name ? `Following ${name}, touch to take over` : undefined;
  }

  /** One device's block: in the world at `at`, or in a room's list. A plain switch is a lever, and one that is an outlet a machine. */
  private _block = (d: Device, at?: Slot) => {
    const window = d.kind === "cover" && !d.guarded;
    const outlet = d.kind === "switch" && this._hass!.states[d.id]?.attributes.device_class === "outlet";
    // A light indoors is a pendant, a spotlight, a strip or a standing lamp by its name
    // (world.ts `lamp`); out of doors, on its post, a lantern.
    const light = d.kind === "light" ? (at && this._world?.zone[at.y]?.[at.x] === "out" ? "lantern" : LAMP_FACES[lamp(d.name)]) : "";
    const faces = light ? [`${light}On`, `${light}Off`] : d.kind === "switch" && !outlet ? ["leverOn", "leverOff"] : (FACES[d.kind] ?? ["machOn", "machOff"]);
    const face = d.away ? "dead" : window ? "glass" : faces[d.on || d.phase === "triggered" ? 0 : 1];
    const armed = this._armed === d.id;
    // A lit lamp in the world casts a pool of light under it, as bright as the lamp is turned up.
    const glow = light && d.on && !d.away && at ? `--lit:${(0.35 + (0.65 * (d.level ?? 100)) / 100).toFixed(2)};` : "";
    // In a room's list a standing lamp, two blocks tall, is shown whole in its square.
    const fit = !at && light === "standing" ? "background-size:auto 100%;background-position:center;" : "";
    // In the world a camera is a picture of what it last saw, with its name: one camera's block is otherwise like another's.
    if (at?.w && !d.away)
      return html`<button class="at dev painting" style="${place(at.x, at.y, at.w, at.h)};background-image:${bg("frame")}" aria-label="${d.room} ${d.name}: camera. Open" @click=${() => this._press(d, !at)}>
        <canvas class="shot" width=${SHOT[0]} height=${SHOT[1]} data-src=${d.picture ?? ""}></canvas>${say(d.name)}
      </button>`;
    return html`<button class="${at ? "at" : ""} dev ${glow ? `lamp ${light}` : ""} ${armed ? "cracked" : ""} ${d.phase === "triggered" ? "sounding" : ""}" style="${at ? `${place(at.x, at.y, at.w, at.h)};` : ""}${glow}${fit}background-image:${bg(face)}"
      aria-pressed=${d.on} aria-label="${d.room} ${d.name}: ${said(d)}${armed ? `. Hit again to ${AGAIN[d.kind]}` : ""}" @click=${() => this._press(d, !at)}>
      ${window && !d.away ? html`<span class="blind" style="height:${d.on ? 100 - (d.level ?? 100) : 100}%;background-image:${bg("slat")}"></span>` : nothing}
    </button>`;
  };

  /** A room's chandelier (all its lights, where there are too many for a lamp each) or its chest: either opens the room's list. */
  private _crowd(id: string, at: Slot, room?: Room) {
    if (!room) return nothing;
    const lights = room.devices.filter((d) => d.kind === "light");
    const on = lights.filter((d) => d.on).length;
    const [face, label] = id.startsWith(LAMPS) ? [on ? "chandelierOn" : "chandelierOff", `${room.name} lights: ${on} of ${lights.length} on`] : ["chest", `${room.name}: everything in it`];
    return html`<button class="at dev" style="${place(at.x, at.y)};background-image:${bg(face)}" aria-label="${label}. Open" @click=${() => (this._open = room.id)}></button>`;
  }

  /** The level of the device pressed last, as a stack of ten blocks: a press on one sets it. */
  private _levels(d: Device) {
    const { min, max, step } = d.span;
    const lit = d.on && d.level !== undefined ? ((d.level - min) / (max - min)) * LEVELS : 0;
    return html`<div class="levels">
      ${Array.from({ length: LEVELS }, (_, i) => {
        const level = Math.round((min + ((max - min) * (i + 1)) / LEVELS) / step) * step;
        return html`<button style="background-image:${bg(lit >= i + 0.5 ? (FILLS[d.kind] ?? "ember") : "ghost")}" aria-label="${d.name} to ${shown(d, level)}" @click=${() => (this._point(d.id), this._ask(d, level))}></button>`;
      })}
    </div>`;
  }

  /** A press on the map goes there. */
  private _jump = (event: MouseEvent) => {
    const scroll = this.renderRoot.querySelector(".scroll")!;
    const box = (event.currentTarget as Element).getBoundingClientRect();
    scroll.scrollTo({ left: ((event.clientX - box.left) / box.width) * scroll.scrollWidth - scroll.clientWidth / 2, behavior: "smooth" });
  };

  /** The map is there only while the world is wider than the screen, with a frame round the part that is on it. */
  private _framed = () => {
    const scroll = this.renderRoot?.querySelector<HTMLElement>(".scroll"), map = this.renderRoot?.querySelector<HTMLElement>(".map");
    if (!scroll || !map) return;
    map.hidden = scroll.scrollWidth <= scroll.clientWidth + 1;
    map.style.setProperty("--from", `${(scroll.scrollLeft / scroll.scrollWidth) * 100}%`);
    map.style.setProperty("--seen", `${(scroll.clientWidth / scroll.scrollWidth) * 100}%`);
  };

  protected willUpdate() {
    // How much daylight: the sun is up from six to six, and a dull sky takes a fifth of it.
    // ponytail: the same hours all year. Home Assistant's sun entity has the real ones.
    const date = new Date(this._now), hour = date.getHours() + date.getMinutes() / 60;
    this._day = clamp(Math.sin((Math.PI * (hour - 6)) / 12) * 1.5 + 0.15, 0, 1) * (overcast(this._house) ? 0.8 : 1);

    // Who is at home, told to the walks when the house or its world is new, and not at every frame of a walk.
    // A room's card shows nobody.
    const [house, world] = this._synced ?? [];
    if (!this._alone && (!this._synced || house !== this._house || world !== this._world)) {
      this._synced = [this._house, this._world];
      this._walks.sync(this._household());
    }
  }

  /** The blocks are drawn once for a world, and the dark over them and the map at each change. */
  protected updated() {
    const world = this._world;
    shots(this.renderRoot);
    // Somebody set off, or the imp turned up: the view follows, if it is the tour's.
    this._tour.kick();
    const [blocks, dark, map] = [".world", ".dark", ".map canvas"].map((c) => this.renderRoot.querySelector<HTMLCanvasElement & { world?: World }>(c));
    if (!world || !this._house || !blocks || !dark || !map) return;
    if (blocks.world !== world) {
      blocks.world = world;
      const g = blocks.getContext("2d")!;
      g.clearRect(0, 0, blocks.width, blocks.height);
      world.blocks.forEach((row, y) => row.forEach((t, x) => t && g.drawImage(texture(t), x * 16, y * 16)));
      for (const [t, x, y] of world.deco) g.drawImage(texture(t), x * 16, y * 16);
      // A world wider than the screen is first seen with the first building's wall two fifths of the way across: the garden is a walk to the left.
      const wall = Math.min(...world.zones.map((z) => z.x0)) - 1;
      const scroll = this.renderRoot.querySelector(".scroll")!;
      if (Number.isFinite(wall) && !this._alone) scroll.scrollLeft = wall * this._b - scroll.clientWidth * 0.4;
    }

    const g = dark.getContext("2d")!;
    g.clearRect(0, 0, world.w, world.h);
    shades(world, this._house.rooms, this._day, !this._prank.blown).forEach((row, y) =>
      row.forEach((a, x) => {
        if (a <= 0) return;
        g.fillStyle = `rgba(6,8,26,${a})`;
        g.fillRect(x, y, 1, 1);
      }),
    );

    // The map: the blocks and the dark over them in small, and a light for each lamp that is on.
    const m = map.getContext("2d")!;
    m.imageSmoothingEnabled = false;
    m.clearRect(0, 0, map.width, map.height);
    m.drawImage(blocks, 0, 0, map.width, map.height);
    m.drawImage(dark, 0, 0, map.width, map.height);
    m.fillStyle = "#ffe9a0";
    for (const room of this._house.rooms) {
      const lit = room.devices.filter((d) => d.kind === "light" && d.on);
      const all = world.slots.get(LAMPS + room.id);
      for (const at of all ? (lit.length ? [all] : []) : lit.flatMap((d) => world.slots.get(d.id) ?? [])) m.fillRect(at.x * MAP, at.y * MAP, MAP, MAP);
    }
    this._framed();
  }

  render() {
    const house = this._house, world = this._world;
    if (!house || !world) return nothing;
    const alone = this._alone, cut = this._cut;
    if (alone && !cut) return html`<div class="digs"><div class="fault">${this._vacant}</div></div>`;
    const rooms = new Map(house.rooms.map((r) => [r.id, r]));
    const devices = house.rooms.flatMap((r) => r.devices);
    const byId = new Map(devices.map((d) => [d.id, d]));
    const sel = byId.get(this._sel);
    const picked = this._sel.startsWith(ROOM) ? rooms.get(this._sel.slice(ROOM.length)) : undefined;
    const lamps = picked?.devices.filter((d) => d.kind === "light" && !d.away) ?? [];
    const armed = byId.get(this._armed);
    const hurts = this._hurts(devices);
    const hurt = hurts[this._hurt];
    // Along the bottom: the house's scenes, or on a room's card that room's.
    const hot = alone ? house.rooms[0].scenes : house.scenes;
    const latest = hot.reduce((at, s) => Math.max(at, s.at), 0);
    const open = rooms.get(this._open);
    const throwing = (s: { id: string; name: string }) => this._call({ domain: "scene", service: "turn_on", ids: [s.id] }, s.name);

    // What the house is missing, on a board in the garden: rooms on no floor, devices in no area.
    const gap = (kind: string) => house.gaps.find((g) => g.kind === kind)?.items.length ?? 0;
    const [floorless, loose] = [gap("floorless"), gap("loose")];
    const missing = [floorless ? `${things(floorless, "room")} on no floor` : "", loose ? `${things(loose, "device")} in no area` : ""].filter(Boolean).join(", ");

    // The sky: the sun from six to six and the moon the other half, across and back down.
    const date = new Date(this._now), hour = date.getHours() + date.getMinutes() / 60, up = hour >= 6 && hour < 18, across = ((hour + (up ? 18 : 6)) % 24) / 12;
    const sky = house.outside ? weather(house.outside.sky) : "clear";
    const dull = overcast(house);
    const colour = mix(mix(NIGHT, DAY, this._day / (dull ? 0.8 : 1)), DULL, dull ? 0.5 : 0);

    // A room's name over it, which switches its lights at its second press, as a block is switched. The lettering is made a little smaller to fit; the temperature goes if the room is too narrow even so.
    const label = (id: string, name: string, x: number, y: number, wide: number) => {
      const room = rooms.get(id);
      const texels = wide * 16 - 2;
      const full = `${name}${room?.temp === undefined ? "" : ` ${room.temp.toFixed(1)}°`}`;
      const text = full.length * 4 * TIGHT <= texels ? full : name;
      const lights = room?.devices.filter((d) => d.kind === "light" && !d.away) ?? [];
      const lit = lights.some((d) => d.on);
      const chosen = this._sel === ROOM + id;
      return html`<button class="at label ${chosen ? "sel" : ""}" style=${place(x, y, wide)} ?disabled=${!lights.length} aria-label="${full}: ${lights.length ? `lights ${lit ? "on" : "off"}. ${chosen ? "Press" : "Press twice"} to turn them all ${lit ? "off" : "on"}` : "no lights"}"
        @click=${() => {
          if (room && chosen) this._lights(room);
          this._point(ROOM + id);
        }}>${say(text, Math.min(1, texels / (text.length * 4)))}</button>`;
    };

    const tip = this._lost ? `No connection since ${clock(this._lost)}` : armed ? `Hit again to ${AGAIN[armed.kind]}` : hurt ? `${this._hurt + 1}/${hurts.length} ${hurt}` : this._told
      || (sel ? `${sel.room} ${sel.name}: ${said(sel)}` : picked ? `${picked.name}: ${lamps.filter((d) => d.on).length} of ${lamps.length} lights on` : this._touring(house) ?? "Press a block to name it, again to switch it");
    // What stands in the garden: the signpost, the board that says what the house is missing, the forecast's signs, and the
    // board that has the view follow the imp (prank.ts chase), lit while it does and gone from its posts while it is in bits.
    const chasing = this._prank.chasing;
    const chase = () => {
      if (!chasing) this._prank.chase();
      this._point("", chasing ? `The imp has ${things(chasing, "go")} left` : `Following the imp for ${GOES} goes`);
    };
    const garden = () => html`
        ${this.hasAttribute("panel")
          ? html`<button class="at board" style="${place(world.sign.x, world.sign.y, 2)};background-image:${bg("board")}" aria-label="Choose another Dash-Bored" @click=${() => fire(this, CHOOSE)}>${say("Dash")}${say("Bored")}</button>`
          : html`<div class="at board" style="${place(world.sign.x, world.sign.y, 2)};background-image:${bg("board")}">${say("Dash")}${say("Bored")}</div>`}
        ${missing
          ? html`<button class="at board" style="${place(world.notice.x, world.notice.y, 3)};background-image:${bg("board")}" aria-label="What the house is missing: ${missing}" @click=${() => this._point("", missing)}>
              ${floorless ? say(`No floor ${floorless}`) : nothing}${loose ? say(`No area ${loose}`) : nothing}
            </button>`
          : nothing}
        ${this._prank.blown || calm() || this._sample
          ? nothing
          : html`<button class="at board ${chasing ? "sel" : ""}" style="${place(world.chase.x, world.chase.y, 2)};background-image:${bg("board")}" aria-pressed=${!!chasing} aria-label="Follow the imp" @click=${chase}>${say("Follow")}${say("the imp")}</button>`}
        ${this._days.slice(0, world.signs.length).map((day, i) => {
          const { x, y } = world.signs[i];
          const [name, high] = [new Date(day.at).toLocaleDateString("en", { weekday: "short" }), `${Math.round(day.high)}°`];
          return html`<div class="at icon" style="${place(x, y - 1)};background-image:${bg(ICONS[weather(day.sky)])}"></div>
            <div class="at board" role="img" aria-label="${name}: ${day.sky}, ${high}" style="${place(x, y)};background-image:${bg("board")}">${say(name)}${say(high)}</div>`;
        })}`;
    const stage = html`<div class="stage ${this._prank.shaking ? "shake" : ""}" style="--crack:${bg("crack")}">
        <canvas class="world" .width=${world.w * 16} .height=${world.h * 16}></canvas>
        ${world.zones.map((z) => label(z.id, z.name, z.x0, z.y0 - 1, z.x1 - z.x0 + 1))}
        ${world.plots.map((p) => label(p.id, p.name, p.x0, p.y, p.x1 - p.x0 + 1))}
        ${alone ? nothing : garden()}
        ${[...world.slots].map(([id, at]) => (byId.has(id) ? this._block(byId.get(id)!, at) : this._crowd(id, at, rooms.get(id.replace(LAMPS, "").replace(CHEST, "")))))}
        ${this._prank.draw()}
        ${alone
          ? nothing
          : repeat(this._walks.list(), (w) => w.id, (w) => {
              // Feet on the floor whatever the height; a party hat on a birthday. The first name only: two
              // whole names side by side ran into each other on a tablet.
              const shape = this._shape(w.id), tall = BUILDS[shape].h / 16, birthday = !!this._aged.get(w.id)?.birthday;
              return html`<div class="at who ${shape} ${w.ms ? (w.climbing ? "climbing" : "walking") : ""} ${w.left ? "left" : ""} ${birthday ? "birthday" : ""}"
                style="${place(w.at.x, w.at.y + 1 - tall, 1, tall)};--ms:${w.ms}ms;--fig:${figure(w.name, shape)}${birthday ? `;--hat:${bg("hat")}` : ""}">${say(w.name.split(" ")[0])}</div>`;
            })}
        <canvas class="dark" .width=${world.w} .height=${world.h}></canvas>
        ${sel && world.slots.has(sel.id) ? html`<div class="at tag" style=${place(world.slots.get(sel.id)!.x, world.slots.get(sel.id)!.y, world.slots.get(sel.id)!.w, world.slots.get(sel.id)!.h)}>${say(sel.name)}</div>` : nothing}
      </div>`;
    return html`<div class="digs ${alone ? "alone" : ""}" style="--b:${this._b}px;--w:${world.w};--h:${world.h};--sky:rgb(${colour.join()})${cut ? `;--rx:${cut.x};--ry:${cut.y};--rw:${cut.w};--rh:${cut.h}` : ""}">
      <div class="sky">
        ${dull || alone ? nothing : html`<div class="orb" style="background-image:${bg(up ? "sun" : "moon")};left:calc((100% - var(--b) * 2) * ${across});top:${85 - Math.sin(Math.PI * across) * 78}%"></div>`}
        ${alone ? nothing : html`<div class="cloud" style="top:8%"></div><div class="cloud" style="top:18%;animation-delay:-80s"></div>`}
        ${(sky === "rain" || sky === "snow") && !alone ? html`<div class="fall ${sky}" style="background-image:${bg(sky)}"></div>` : nothing}
      </div>
      <div class="scroll" @scroll=${this._framed}>${cut ? html`<div class="cut">${stage}</div>` : stage}</div>
      <div class="hud">
        ${alone ? nothing : html`<button class="bar hearts" aria-label="${hurts.length ? `${hurts.length} wrong: ${hurts.join("; ")}` : "Nothing is wrong"}" @click=${() => {
          const next = hurts.length ? (this._hurt + 1) % hurts.length : -1;
          this._point();
          this._hurt = next;
        }}>
          ${Array.from({ length: HEARTS }, (_, i) => html`<i style="background-image:${bg(i < HEARTS - hurts.length ? "heart" : "heart0")}"></i>`)}
        </button>
        ${house.kw === undefined
          ? nothing
          : html`<div class="bar power">${Array.from({ length: 10 }, (_, i) => html`<i style="background-image:${bg(i < Math.round(house.kw! / BOLT) ? "bolt" : "bolt0")}"></i>`)}${say(` ${house.kw.toFixed(2)} kW`)}</div>`}
        <div class="row top"><div class="box">${say(clock(this._now))}</div>${house.outside ? html`<div class="box">${say(`${sky} ${house.outside.temp.toFixed(1)}°`)}</div>` : nothing}</div>`}
        <div class="tips">
          ${this._fault ? html`<div class="fault" role="alert">${this._fault}</div>` : nothing}
          <div class="tip" role="status">${say(tip)}</div>
          <button class="map" hidden aria-label="Map of the house. Press to go there" @click=${this._jump}><canvas .width=${world.w * MAP} .height=${world.h * MAP}></canvas><i></i></button>
        </div>
        <div class="row hot">${hot.map((s) => html`<button class="box ${latest && s.at === latest ? "sel" : ""}" aria-label="Scene: ${s.name}" @click=${() => throwing(s)}>${say(s.name)}</button>`)}</div>
        ${open ? chest(open, { block: this._block, throw: throwing, shut: () => (this._open = "") }) : nothing}
        ${sel?.dims && !sel.away ? this._levels(sel) : nothing}
      </div>
    </div>`;
  }
}
