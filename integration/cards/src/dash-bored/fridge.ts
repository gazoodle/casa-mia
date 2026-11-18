// The Fridge: the house as what is stuck to a fridge door. A polaroid for each room, with
// a button magnet under it for each of its devices; a camera's picture as a photograph
// held by a butterfly; Sensor Watch's alerts as sticky notes; scenes as word magnets; and
// a notepad of the day. It can be dressed as one of three households (fridge/skins.ts).
// It is built on what every family shares (family.ts); fridge/magnets.ts draws the
// magnets, and fridge/styles.ts is the door and how things sit on it.
import { html, nothing, type TemplateResult } from "lit";
import { fire } from "../ha.ts";
import { ALERTS, Family, PAGE, SIGHTINGS, typeface } from "./family.ts";
import { DEFS, button, novelty, pick, tilt } from "./fridge/magnets.ts";
import { columns, laid } from "./fridge/rows.ts";
import { bays } from "./pack.ts";
import { SKINS, type Skin } from "./fridge/skins.ts";
import { today } from "./fridge/today.ts";
import { STYLES } from "./fridge/styles.ts";
import { DEGREES, sighted, type Device, type Options, type Room, type Scene, type Seen, type Sighting } from "./house.ts";
import { NOMINAL, RANK, clock, flip, type Alert } from "./stories.ts";

export const CARD = "dash-bored-fridge";
const REMEMBERED = "dash-bored-fridge"; // this browser's choice of household
const ALARM = "alarm_control_panel";
const CAMERA = "camera";
// These keep their setting while they are off or paused, so their strip stays where it was put.
const KEEPS = new Set(["climate", "water_heater", "humidifier", "media_player"]);
// How these kinds are said to stand: when on, and when off. Aurora says the same (aurora.ts).
export const STANDS: Record<string, [string, string]> = { lock: ["locked", "unlocked"], cover: ["open", "shut"], valve: ["open", "shut"], siren: ["sounding", "quiet"], vacuum: ["cleaning", "home"], lawn_mower: ["mowing", "home"], media_player: ["playing", "paused"] };
// What the second press on a guarded magnet does, for the note that asks for it.
export const AGAIN: Record<string, string> = { lock: "unlock", cover: "open", valve: "open", siren: "sound" };
// An alarm's ways of being set: Home Assistant's service, the bit of the alarm's supported features that says it has it, and its word magnet.
const SETS: [string, number, string][] = [["alarm_arm_away", 2, "away"], ["alarm_arm_home", 1, "home"], ["alarm_arm_night", 4, "night"]];
const ARMED = 6000; // ms: how long a first press to unlock or open waits for its second
const WANTED = 5000; // ms: how long a strip stays where it was put, waiting for its device to say it is there
const SHOWING = 30_000; // ms: how long an alarm's code stays on the door with nothing pressed
const RECENT = 30 * 60_000; // ms: how long what a camera saw stays on the door
const CODE = 8; // the most figures an alarm's code is taken to have

type Config = Options & { type?: string; style?: string };

export class Fridge extends Family {
  static styles = [PAGE, STYLES];
  static properties = { _cols: { state: true }, _skin: { state: true }, _alerts: { state: true }, _seen: { state: true }, _armed: { state: true }, _want: { state: true }, _code: { state: true }, _tapped: { state: true } };
  _skin = SKINS[0].id;
  _alerts: Alert[] = []; // what Sensor Watch has said of each sensor it has spoken of
  _seen: Seen[] = []; // what the cameras have seen lately
  _armed = ""; // the guarded device whose magnet has had its first press
  _want?: { id: string; level: number }; // where a strip was put, until its device says it is there
  _code?: { id: string; figures: string }; // the figures pressed for an alarm's code
  _tapped = ""; // the magnet that was just pressed, which wobbles
  _cols = 1; // how many columns of rooms the door has room for across
  private _rows?: { key: string; placed: ReturnType<typeof laid> }; // the rooms' rows, kept while the rooms and the columns are the same
  declare protected _config: Config;
  private _dropping?: ReturnType<typeof setTimeout>;
  private _waiting?: ReturnType<typeof setTimeout>;
  private _hiding?: ReturnType<typeof setTimeout>;

  setConfig(config: Config) {
    super.setConfig(config);
    this._recall();
  }

  connectedCallback() {
    super.connectedCallback();
    this._recall();
    // The grandparents' handwriting (Homemade Apple, Apache Licence 2.0), which the integration serves.
    typeface("Dash-Bored Hand", "HomemadeApple-Regular.ttf");
  }

  /** Whose fridge: the card's own, else the one this browser last chose. */
  private _recall() {
    let skin = this._config.style;
    try {
      skin ??= localStorage.getItem(REMEMBERED) ?? undefined;
    } catch {
      // No storage here (a private window): the first household, then.
    }
    if (SKINS.some((s) => s.id === skin)) this._skin = skin!;
  }

  private _dress(skin: string) {
    this._skin = skin;
    try {
      localStorage.setItem(REMEMBERED, skin);
    } catch {
      // Not remembered, that is all.
    }
  }

  /** The feeds: Sensor Watch's alerts, for the sticky notes, and the cameras' sightings,
   * for their photographs. Each says all it holds at first, then each item as it changes. */
  /** The door is as many columns across as fit in the width its rooms have: read from the
   * page once they are drawn, and guessed from the element's width before that. */
  protected _resized(px: number) {
    const cols = columns(this.renderRoot?.querySelector(".photos")?.clientWidth || px - 102);
    if (cols !== this._cols) this._cols = cols;
  }

  protected updated() {
    this._resized(this.clientWidth);
  }

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
        // A date coming due, not a poll: what a camera saw leaves the door when its time is up.
        this._after(RECENT - (now - s.at * 1000) + 1000, () => this.requestUpdate());
      }
      this._seen = [...held.values()].filter((s) => now - s.at * 1000 < RECENT);
    });
  }

  protected _moved(d: Device) {
    if (this._want?.id === d.id) this._want = undefined;
    if (this._armed === d.id) this._armed = "";
  }

  /** A press on a device's magnet. It wobbles, and its device is put the other way. A
   * lock, a garage door, a valve or a siren takes two presses to unlock, open or sound:
   * the first lifts the magnet, for a few seconds, and a note asks for the second. */
  private _press(d: Device) {
    if (d.away) return;
    this._tapped = d.id;
    this._after(520, () => this._tapped === d.id && (this._tapped = ""));
    const risky = d.guarded && (d.kind === "lock" ? d.on : !d.on);
    if (risky && this._armed !== d.id) {
      this._armed = d.id;
      this._dropping = this._instead(this._dropping, ARMED, () => this._armed === d.id && (this._armed = ""));
      return;
    }
    this._armed = "";
    this._call(flip(d), `${d.room} ${d.name}`);
  }

  /** Where a device's strip stands, in the device's own units. */
  private _level(d: Device) {
    if (this._want?.id === d.id) return this._want.level;
    return KEEPS.has(d.kind) ? (d.level ?? d.span.min) : d.on ? (d.level ?? d.span.max) : d.span.min;
  }

  /** A strip was slid: it stays there, and its device is asked for that. It goes back to
   * where the device really is if the device has not answered in a few seconds. */
  private _slide(d: Device, e: Event) {
    const level = Number((e.target as HTMLInputElement).value);
    this._want = { id: d.id, level };
    this._waiting = this._instead(this._waiting, WANTED, () => (this._want = undefined));
    this._ask(d, level);
  }

  /** A figure pressed for an alarm's code, or the last one taken off. The code is never
   * logged, nor kept anywhere but here, and it is cleared if it is left. */
  private _figure(d: Device, figure: string) {
    const was = this._code?.id === d.id ? this._code.figures : "";
    this._code = { id: d.id, figures: figure === "" ? was.slice(0, -1) : (was + figure).slice(0, CODE) };
    this._hiding = this._instead(this._hiding, SHOWING, () => (this._code = undefined));
  }

  private _throw(scene: { id: string; name: string }) {
    this._call({ domain: "scene", service: "turn_on", ids: [scene.id] }, scene.name);
    this._tapped = scene.id;
    this._after(520, () => this._tapped === scene.id && (this._tapped = ""));
  }

  /** One device, as a button magnet with its name, how it stands, and a strip to slide if it has a level to set. */
  private _magnet(d: Device, skin: Skin) {
    const degrees = DEGREES.has(d.kind);
    const level = this._level(d);
    const said = d.away
      ? "not answering"
      : d.dims
        ? degrees ? (d.on ? `${level}°` : "off") : d.kind === "media_player" ? (d.on ? `vol ${level}` : "paused") : d.on || KEEPS.has(d.kind) ? `${Math.round(level)}%` : STANDS[d.kind]?.[1] ?? "off"
        : (d.phase ?? STANDS[d.kind]?.[d.on ? 0 : 1] ?? (d.on ? "on" : "off"));
    const also = d.title ?? (degrees && d.temp !== undefined ? `now ${d.temp}°` : "");
    const armed = this._armed === d.id;
    return html`<div class="mag ${d.on ? "on" : ""} ${d.away ? "away" : ""} ${armed ? "armed" : ""} ${this._tapped === d.id ? "tapped" : ""}" style="--c: ${skin.colours[pick(d.id, skin.colours.length)]}; --r: ${tilt(d.id, 7)}deg">
      <button class="press" aria-pressed=${d.on} aria-label="${d.name}: ${said}${armed ? `. Press again to ${AGAIN[d.kind]}` : ""}" @click=${() => this._press(d)}>${button(d.kind, d.kind === "lock" && !d.on)}</button>
      <span class="name">${d.name}<small>${said}</small>${also ? html`<small class="also">${also}</small>` : nothing}</span>
      ${armed ? html`<span class="again" role="status">again to ${AGAIN[d.kind]}?</span>` : nothing}
      ${d.dims && !d.away
        ? html`<input class="strip" type="range" min=${d.span.min} max=${d.span.max} step=${d.span.step} .value=${String(level)} aria-label="${d.name}: ${degrees ? "temperature" : d.kind === "media_player" ? "volume" : "level"}" @input=${(e: Event) => this._slide(d, e)} />`
        : nothing}
    </div>`;
  }

  /** A camera: its latest picture as a photograph held to the door by a novelty magnet, or what it saw lately. */
  private _print(name: string, picture: string, caption: string, holder: string, id: string, away = false) {
    return html`<button class="print ${away ? "away" : ""}" style="--r: ${tilt(id, 5)}deg" aria-label="${name}${caption ? `: ${caption}` : ""}" @click=${() => fire(this, "hass-more-info", { entityId: id })}>
      <span class="photo worn${pick(id + "worn", 4)}">${picture ? html`<img src=${picture} alt="" loading="lazy" />` : html`<span class="blank">${away ? "no picture" : "…"}</span>`}</span>
      ${novelty(holder)}
      <span class="tab">${name}${caption ? html`<small>${caption}</small>` : nothing}</span>
    </button>`;
  }

  /** An alarm: a note of how it stands, number magnets for its code if it takes one in figures, and a word magnet for each thing it can be told. */
  private _alarm(d: Device, skin: Skin) {
    const has = this._hass!.states[d.id]?.attributes ?? {};
    const stands = d.away ? "not answering" : d.phase === "triggered" ? "SOUNDING" : (d.phase ?? (d.on ? "set" : "unset"));
    const figures = this._code?.id === d.id ? this._code.figures : "";
    // The code goes with the request and is then taken off the door, right or wrong. It is
    // not cleared when the alarm changes by itself (arming to set), which would wipe a code half pressed.
    const ask = (service: string, what: string) => () => {
      this._call({ domain: ALARM, service, ids: [d.id], data: figures ? { code: figures } : undefined }, `${d.room} ${d.name} (${what})`);
      this._code = undefined;
    };
    const words = d.on || d.phase ? [["alarm_disarm", "unset"]] : SETS.filter(([, bit]) => has.supported_features & bit).map(([service, , word]) => [service, word]);
    return html`<div class="alarm ${d.phase === "triggered" ? "sounding" : ""}" style="--r: ${tilt(d.id, 3)}deg">
      <div class="status">${d.name}: <b>${stands}</b></div>
      ${has.code_format === "number" && !d.away
        ? html`<div class="code" role="status" aria-label="Code: ${figures.length} figures">${figures || "code?"}</div>
            <div class="keys">${[..."1234567890"].map((n, i) => html`<button style="--c: ${skin.colours[i % skin.colours.length]}; --r: ${tilt(d.id + n, 9)}deg" aria-label="Figure ${n}" @click=${() => this._figure(d, n)}>${n}</button>`)}
              <button class="back" aria-label="Take the last figure off" @click=${() => this._figure(d, "")}>←</button></div>`
        : nothing}
      ${d.away ? nothing : html`<div class="words">${words.map(([service, word]) => html`<button style="--r: ${tilt(d.id + word, 5)}deg" @click=${ask(service, word)}>${word}</button>`)}</div>`}
    </div>`;
  }

  render() {
    const house = this._house;
    const skin = SKINS.find((s) => s.id === this._skin) ?? SKINS[0];
    if (!this._hass || !house) return html`<div class="door ${skin.id}"><div class="urgent">Waiting for Home Assistant…</div></div>`;

    const camera = (d: Device) => d.kind === CAMERA;
    // An alarm whose code is words can't be pressed out on number magnets: it is left off the door, and its room says so.
    const shows = (r: Room) => r.devices.filter((d) => !(d.kind === ALARM && this._hass!.states[d.id]?.attributes.code_format === "text"));
    // What each camera saw last, if it was lately: it is that camera's photograph. One from a camera in no room is with the notepad.
    const now = Date.now();
    const seen = new Map<string, Sighting>();
    for (const s of this._survey ? sighted(this._survey, this._seen) : []) if (now - s.at < RECENT && s.at >= (seen.get(s.camera)?.at ?? 0)) seen.set(s.camera, s);
    const placed = new Set(house.rooms.flatMap((r) => r.devices.filter(camera).map((d) => d.id)));
    let cameras = 0; // the first camera on the door has the butterfly, and the rest take turns with the others

    // A scene is a word magnet that can be pressed. `said` is what it is called where it is.
    const word = (s: Scene, said: string) => html`<button class=${this._tapped === s.id ? "tapped" : ""} style="--r: ${tilt(s.id, 5)}deg" aria-label="Scene: ${s.full}" @click=${() => this._throw(s)}>${said}</button>`;

    // The rooms stand in rows, each as many columns wide as keeps its row short, and small
    // ones one under another (fridge/rows.ts, which estimates). A floor's first room follows
    // the last of the floor before in the same row, where there is room.
    // Chosen once for these rooms at this many columns, not at every drawing.
    const drawn = house.rooms.filter((r) => shows(r).length || r.temp !== undefined || r.scenes.length);
    // Rooms come sorted by floor (house.ts). A floor's name is on a strip of masking tape; a house with no floors has none.
    const floored = drawn.some((r) => r.floor);
    const begins = (i: number) => floored && drawn[i].floor !== drawn[i - 1]?.floor;
    const loads = drawn.map((r) => {
      const shown = shows(r);
      const magnets = shown.filter((d) => !camera(d) && d.kind !== ALARM);
      return { magnets: magnets.length, strips: magnets.filter((d) => d.dims).length, prints: shown.filter(camera).length, alarms: shown.length - magnets.length - shown.filter(camera).length, words: r.scenes.length };
    });
    const key = JSON.stringify([this._cols, loads, drawn.map((r) => r.floor)]);
    if (this._rows?.key !== key) this._rows = { key, placed: laid(loads, this._cols, begins) };
    const clusters = bays(this._rows.placed);

    const room = (r: Room) => {
      const shown = shows(r);
      const lights = shown.filter((d) => d.kind === "light" && !d.away);
      const lit = lights.some((d) => d.on);
      const picture: string | undefined = (this._hass as any).areas?.[r.id]?.picture ?? undefined;
      const more = r.devices.length - shown.length;
      return html`<section class="room">
        <div class="snap" style="--r: ${tilt(r.id, 3)}deg">
          <div class="polaroid ${lit ? "lit" : ""} worn${pick(r.id + "worn", 4)}">
            <button class="pic" ?disabled=${!lights.length} aria-label="${r.name}: ${lights.length ? `lights ${lit ? "on" : "off"}. Press to turn them all ${lit ? "off" : "on"}` : "no lights"}" @click=${() => this._lights(r)}>
              ${picture ? html`<img src=${picture} alt="" loading="lazy" />` : html`<span class="scene"><i class="window"></i><i class="lamp"></i></span>`}
            </button>
            <div class="cap"><span>${r.name}</span>${r.temp === undefined ? nothing : html`<small>${r.temp.toFixed(1)}°</small>`}</div>
          </div>
          ${novelty(skin.holders[pick(r.id, skin.holders.length)])}
        </div>
        <div class="magnets">
          ${shown.filter(camera).map((d) => {
            const s = seen.get(d.id);
            return this._print(d.name, s?.photo ?? (d.away ? "" : (d.picture ?? "")), s ? `${s.kind} ${clock(s.at)}` : d.away ? "not answering" : "", skin.holders[cameras++ % skin.holders.length], d.id, d.away);
          })}
          ${shown.filter((d) => !camera(d) && d.kind !== ALARM).map((d) => this._magnet(d, skin))}
          ${shown.filter((d) => d.kind === ALARM).map((d) => this._alarm(d, skin))}
          ${more ? html`<span class="more">and ${more} more that the door has no magnet for</span>` : nothing}
        </div>
        ${r.scenes.length ? html`<div class="poetry">${r.scenes.map((s) => word(s, s.name))}</div>` : nothing}
      </section>`;
    };
    // Each row of rooms has a lane over it, for the tape of a floor that begins in it; a lane with no tape is no height.
    const rooms: TemplateResult[] = clusters.map((c) => {
      const floor = drawn[c.things[0]].floor;
      const tape = begins(c.things[0]) ? html`<div class="floor ${c.column > 1 ? "beside" : ""}" style="grid-row: ${c.row * 2 + 1}; grid-column: ${c.column} / span ${c.wide}"><span style="--r: ${tilt(floor ?? "elsewhere", 2)}deg">${floor ?? "Elsewhere"}</span></div>` : nothing;
      return html`${tape}<div class="bay" style="grid-row: ${c.row * 2 + 2}; grid-column: ${c.column} / span ${c.wide}">${c.things.map((i) => room(drawn[i]))}</div>`;
    });

    // The sensors in trouble, the worst first. The feed counts in seconds.
    const notes = this._alerts.filter((a) => a.level !== NOMINAL).sort((a, b) => (RANK[b.level] ?? 0) - (RANK[a.level] ?? 0) || a.began - b.began);
    // Word magnets for the house's scenes and its floors' (a room's are with the room), with the household's own words between them.
    const words = house.scenes.flatMap((s, i) => [skin.words[i % skin.words.length], s]);

    return html`<div class="door ${skin.id}">
      ${DEFS}
      <div class="wear" aria-hidden="true"><i class="fingers a"></i><i class="fingers b"></i><i class="fingers c"></i><i class="fingers d"></i><i class="smear"></i><i class="dab"></i><i class="streak"></i><i class="scribble"></i></div>
      <div class="handle" aria-hidden="true"></div>
      <div class="who" role="radiogroup" aria-label="Whose fridge this is">
        ${this._config.style ? nothing : SKINS.map((s) => html`<button role="radio" aria-checked=${s.id === skin.id} style="--r: ${tilt(s.id, 6)}deg" @click=${() => this._dress(s.id)}>${novelty(s.picker)}<span>${s.label}</span></button>`)}
      </div>
      ${this._lost ? html`<div class="urgent" role="alert">No connection to Home Assistant since ${clock(this._lost)}. What is on the door is as it was then.</div>` : nothing}
      ${this._fault ? html`<div class="urgent" role="alert">${this._fault}</div>` : nothing}
      ${notes.length
        ? html`<div class="notes">${notes.map((a) => html`<div class="postit ${a.level}" role="status" style="--r: ${tilt(a.entity_id, 4)}deg"><b>${a.name}</b>${a.message || a.level}<small>since ${clock(a.began * 1000)}</small></div>`)}</div>`
        : nothing}
      <div class="board">
        <aside class="side">
          <div class="pad"><h2>${skin.pad}</h2><ul>${today(house).map((line) => html`<li>${line}</li>`)}</ul><i class="ring" aria-hidden="true"></i></div>
          ${words.length
            ? html`<div class="poetry">${words.map((w, i) => (typeof w === "string" ? html`<span style="--r: ${tilt(w + i, 5)}deg">${w}</span>` : word(w, w.full)))}</div>`
            : nothing}
          ${[...seen.values()].filter((s) => !placed.has(s.camera)).map((s, i) => this._print(s.name, s.photo ?? "", `${s.kind} ${clock(s.at)}`, skin.holders[(cameras + i) % skin.holders.length], s.camera))}
          <div class="extra" style="--r: ${tilt(skin.extra.title, 4)}deg" aria-hidden="true"><b>${skin.extra.title}</b>${skin.extra.lines.map((line) => html`<span>${line}</span>`)}${novelty(skin.extra.holder)}</div>
        </aside>
        <div class="photos" style="--cols: ${this._cols}">${rooms}</div>
      </div>
    </div>`;
  }
}
