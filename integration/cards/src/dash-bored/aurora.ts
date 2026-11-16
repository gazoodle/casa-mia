// Aurora: the house in the current web style. Glass tiles over a sky that warms as the
// lights come on: a greeting that says how the house stands, the house's scenes, the power being
// drawn with its last hour, a thermostat's ring, and a tile for each room, which grows
// into a sheet of its scenes, and faders and keys for what is in it. After the mock-up,
// docs/design/dash-bored/aurora.html. It is built on what every family shares (family.ts);
// aurora/words.ts is what it says, and aurora/styles.ts the look and where it leaves the
// mock-up for a tablet's sake.
import { html, nothing } from "lit";
import { fire } from "../ha.ts";
import { SPRING, STYLES } from "./aurora/styles.ts";
import type { Placed } from "./aurora/bento.ts";
import { ALERTS as ALERTED, CLIMATE, ENERGY, HERO, ROOM, SCENES, SPLIT, dots, holds, screens, splits, zoom, type Screen, type Split } from "./aurora/pages.ts";
import { glow, greeting, said, spark, thinned } from "./aurora/words.ts";
import { ALERTS, Family, PAGE } from "./family.ts";
import { AGAIN, STANDS } from "./fridge.ts";
import { picture } from "./fridge/magnets.ts";
import { DEGREES, lights, type Device, type Room, type Scene, type Survey } from "./house.ts";
import type { Row } from "./record.ts";
import { CHOOSE } from "./shell.ts";
import { NOMINAL, RANK, clock, flip, type Alert } from "./stories.ts";

export const CARD = "dash-bored-aurora";
const HUES = [70, 45, 150, 200, 320, 130]; // the colour a room glows, by its place on the page
// How the kinds the Fridge has no words for are said to stand: when on, and when off.
const SAID: Record<string, [string, string]> = { ...STANDS, alarm_control_panel: ["set", "unset"], camera: ["look", "look"] };
// These open Home Assistant's own dialog: a picture to look at, and a code to type.
const THEIRS = new Set(["camera", "alarm_control_panel"]);
const ARMED = 6000; // ms: how long a first press to unlock or open waits for its second
const WANTED = 5000; // ms: how long a level stays where it was put, waiting for its device to say it is there
const THROWN = 1500; // ms: how long a scene's button shows that it was pressed
const HOUR = 3_600_000; // ms: how far back the power's line goes
const GAP = 30_000; // ms: the least between two points of that line, so it has 120 at most
const MINUTE = 60_000;

const things = (n: number, what: string) => `${n} ${what}${n === 1 ? "" : "s"}`;
/** Where a tile is on its screen's grid, as a style. */
const place = (p: Placed) => `grid-area: ${p.row + 1} / ${p.col + 1} / span ${p.h} / span ${p.w}`;

export class Aurora extends Family {
  static styles = [PAGE, STYLES];
  static properties = { _alerts: { state: true }, _open: { state: true }, _want: { state: true }, _armed: { state: true }, _dragging: { state: true }, _find: { state: true }, _thrown: { state: true }, _trace: { state: true }, _now: { state: true }, _at: { state: true }, _wide: { state: true } };
  _alerts: Alert[] = []; // what Sensor Watch has said of each sensor it has spoken of
  _open = ""; // the room whose sheet is open
  _want?: { id: string; level: number }; // where a level was put, until its device says it is there
  _armed = ""; // the guarded device whose key has had its first press
  _dragging = ""; // the device whose fader a finger is on
  _find = ""; // what is typed in the search
  _thrown = ""; // the scene that was just pressed
  _trace: [number, number][] = []; // the house's power over the last hour: [ms, kW]
  _now = Date.now(); // ms: the minute the clock shows
  _at = 0; // the screen the pager is on
  _wide = 0; // px: how wide the element is
  private _traced = ""; // the power sensor whose last hour was asked for
  private _laid?: { found: Survey; wide: number; tall: number; screens: Screen[]; entries: { name: string; splits: string[]; first: number; parts: number }[]; sets: Map<string, Split> };
  private _kept = ""; // the layout the pager was last put in place for
  private _again = () => this.requestUpdate(); // the window is another size: the page may be another height
  private _dropping?: ReturnType<typeof setTimeout>;
  private _waiting?: ReturnType<typeof setTimeout>;

  connectedCallback() {
    super.connectedCallback();
    this._tick();
    window.addEventListener("keydown", this._slash);
    window.addEventListener("resize", this._again);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._slash);
    window.removeEventListener("resize", this._again);
  }

  /** The clock: a date coming due, not a poll. It is set again at the turn of each minute. */
  private _tick = () => {
    this._now = Date.now();
    this._after(MINUTE - (this._now % MINUTE) + 50, this._tick);
  };

  /** A press on / goes to the search, unless something is being typed into already. */
  private _slash = (event: KeyboardEvent) => {
    const at = event.composedPath()[0];
    if (event.key !== "/" || (at instanceof HTMLElement && (at.matches("input, textarea, select") || at.isContentEditable))) return;
    const ask = this.renderRoot.querySelector<HTMLInputElement>(".ask input");
    if (!ask) return;
    event.preventDefault();
    ask.focus();
  };

  /** Sensor Watch's alerts: all it holds at first, then each as it changes. */
  protected _listen() {
    super._listen();
    this._follow(ALERTS, "Sensor Watch's alerts", (alerts: Alert[]) => {
      const held = new Map(this._alerts.map((a) => [a.entity_id, a]));
      for (const a of alerts) held.set(a.entity_id, a);
      this._alerts = [...held.values()];
    });
  }

  /** The house was read again: the power's line gains a point if the power has changed
   * and the last point is old enough. Its last hour is asked for once, when the sensor
   * is first known. */
  protected _surveyed() {
    const id = this._survey?.power;
    if (!id || this._sample) return;
    if (this._traced !== id) {
      this._traced = id;
      this._trace = [];
      void this._recall(id);
    }

    const kw = this._house?.kw;
    const now = Date.now();
    const last = this._trace.at(-1);
    if (kw !== undefined && (!last || (last[1] !== kw && now - last[0] >= GAP))) this._trace = [...this._trace.filter(([at]) => at > now - HOUR), [now, kw]];
  }

  /** The power's last hour, from Home Assistant's history, put before what has been seen since. */
  private async _recall(id: string) {
    const now = Date.now();
    try {
      const found: Record<string, Row[]> = await this._hass!.connection.sendMessagePromise({ type: "history/history_during_period", start_time: new Date(now - HOUR).toISOString(), entity_ids: [id], minimal_response: true, no_attributes: true });
      const per = this._hass!.states[id]?.attributes.unit_of_measurement === "kW" ? 1 : 1000;
      // The first row is how it stood when the hour began, which may be long before.
      const rows = (found[id] ?? []).filter((row) => row.s !== "" && Number.isFinite(Number(row.s))).map((row): [number, number] => [Math.max(row.lu * 1000, now - HOUR), Number(row.s) / per]);
      if (this._traced === id) this._trace = thinned([...rows, ...this._trace.filter(([at]) => at >= now)], GAP);
    } catch (err: any) {
      console.error("Dash-Bored: the power's last hour could not be read", err);
      this._fault = `The last hour of the house's power could not be read (${err?.message ?? err}).`;
    }
  }

  protected _moved(d: Device) {
    // Not while a finger is on its fader: the device answers each level asked for on the
    // way, and the fader would jump back to it under the finger.
    if (this._want?.id === d.id && this._dragging !== d.id) this._want = undefined;
    if (this._armed === d.id) this._armed = "";
  }

  /** Where a device's level stands, in its own units: where it was just put, else where the device says. */
  private _level(d: Device) {
    return this._want?.id === d.id ? this._want.level : (d.level ?? (d.on ? d.span.max : d.span.min));
  }

  /** Put a device's level somewhere on its scale. It stays there on the page, and the
   * device is asked for it; if the device has not answered in a few seconds, the page
   * goes back to where the device really is. */
  private _set(d: Device, level: number) {
    const { min, max, step } = d.span;
    const to = Number(Math.min(max, Math.max(min, Math.round(level / step) * step)).toFixed(2));
    this._want = { id: d.id, level: to };
    this._waiting = this._instead(this._waiting, WANTED, () => this._dragging || (this._want = undefined));
    this._ask(d, to);
  }

  /** A finger on a fader, or moving on it: the level is where the finger is. */
  private _drag(d: Device, event: PointerEvent) {
    const fader = event.currentTarget as HTMLElement;
    if (event.type === "pointerdown") {
      fader.setPointerCapture(event.pointerId);
      this._dragging = d.id;
    } else if (this._dragging !== d.id) return;

    const box = fader.getBoundingClientRect();
    this._set(d, d.span.min + ((box.bottom - event.clientY) / box.height) * (d.span.max - d.span.min));
  }

  private _drop() {
    this._dragging = "";
    this._waiting = this._instead(this._waiting, WANTED, () => (this._want = undefined));
  }

  /** A press on a device's dot or key: it is put the other way. A lock, a garage door, a
   * valve or a siren takes two presses to unlock, open or sound, and a camera or an alarm
   * opens Home Assistant's dialog, which is not shown over a sheet: the sheet is shut first. */
  private _press(d: Device) {
    if (d.away) return;
    if (THEIRS.has(d.kind)) {
      this._open = "";
      return fire(this, "hass-more-info", { entityId: d.id });
    }
    const risky = d.guarded && (d.kind === "lock" ? d.on : !d.on);
    if (risky && this._armed !== d.id) {
      this._armed = d.id;
      this._dropping = this._instead(this._dropping, ARMED, () => this._armed === d.id && (this._armed = ""));
      return;
    }
    this._armed = "";
    this._call(flip(d), `${d.room} ${d.name}`);
  }

  private _throw(scene: Scene) {
    this._call({ domain: "scene", service: "turn_on", ids: [scene.id] }, scene.full);
    this._thrown = scene.id;
    this._after(THROWN, () => this._thrown === scene.id && (this._thrown = ""));
  }

  /** The sheet grows out of its room's tile, or shrinks back into it. Nothing moves for
   * somebody who has asked for less motion, or if the tile is not on the page. */
  private _grow(sheet: HTMLDialogElement, back: boolean) {
    const tile = [...this.renderRoot.querySelectorAll<HTMLElement>(".room")].find((el) => el.dataset.room === this._open);
    if (!tile || matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const from = tile.getBoundingClientRect();
    const to = sheet.getBoundingClientRect();
    const small = { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, opacity: 0.4 };
    const whole = { transform: "none", opacity: 1 };
    const spring = CSS.supports("transition-timing-function", SPRING) ? SPRING : "ease-out";
    return sheet.animate(back ? [whole, small] : [small, whole], back ? { duration: 220, easing: "ease-in" } : { duration: 550, easing: spring });
  }

  private _shut() {
    const sheet = this.renderRoot.querySelector("dialog");
    const done = () => {
      this._open = "";
      this._armed = "";
    };
    const going = sheet && this._grow(sheet, true);
    if (going) going.finished.then(done, done);
    else done();
  }

  /** A dialog is modal only when opened by its method, not by being drawn. */
  protected updated() {
    const sheet = this.renderRoot.querySelector("dialog");
    if (sheet && !sheet.open) {
      sheet.showModal();
      this._grow(sheet, false);
    }
    // When the screens have been laid out again, or are another size, the pager is put
    // back on the screen it was showing. Not at any other time: it would fight a swipe.
    const pages = this.renderRoot.querySelector<HTMLElement>(".pages");
    const key = this._laid ? `${this._laid.screens.length} ${this._wide}x${this._tall}` : "";
    if (pages && key !== this._kept) {
      this._kept = key;
      pages.scrollLeft = Math.min(this._at, this._laid!.screens.length - 1) * pages.clientWidth;
    }
  }

  /** The glass catches the light where a mouse is over it. */
  private _shine(event: PointerEvent) {
    const glass = event.pointerType === "mouse" ? (event.target as Element).closest<HTMLElement>(".glass") : null;
    if (!glass) return;
    const box = glass.getBoundingClientRect();
    // As shares of the glass, not px: a tile's own px are enlarged with it (pages.ts `zoom`).
    glass.style.setProperty("--mx", `${((event.clientX - box.left) / box.width) * 100}%`);
    glass.style.setProperty("--my", `${((event.clientY - box.top) / box.height) * 100}%`);
  }

  /** A scene's button. `name` is what it is called where it is shown. */
  private _scene(s: Scene, name: string) {
    return html`<button class=${this._thrown === s.id ? "thrown" : ""} @click=${() => this._throw(s)}>${name}</button>`;
  }

  private _stands(d: Device) {
    if (d.away) return "not answering";
    if (d.dims && d.on && d.kind !== "media_player") return DEGREES.has(d.kind) ? `${this._level(d)}°` : `${Math.round(this._level(d))}%`;
    return d.phase ?? SAID[d.kind]?.[d.on ? 0 : 1] ?? (d.on ? "on" : "off");
  }

  private _pic(d: Device) {
    return html`<svg class="pic" viewBox="0 0 24 24" aria-hidden="true">${picture(d.kind, d.kind === "lock" && !d.on)}</svg>`;
  }

  /** One device on a room's sheet: a fader for a level, steps for a temperature, and a key for the rest. */
  private _control(d: Device) {
    const level = this._level(d);
    const said = this._stands(d);
    if (d.dims && !d.away && DEGREES.has(d.kind)) {
      return html`<div class="key ${d.on ? "on" : ""}">
        <b>${this._pic(d)}</b><span class="deg">${level}°</span>
        <div class="steps"><button aria-label="${d.name}: cooler" @click=${() => this._set(d, level - d.span.step)}>−</button><button aria-label="${d.name}: warmer" @click=${() => this._set(d, level + d.span.step)}>+</button></div>
        <span>${d.name}<em>${d.on ? (d.temp === undefined ? "" : `now ${d.temp}°`) : "off"}</em></span>
      </div>`;
    }
    if (d.dims && !d.away) {
      const key = (event: KeyboardEvent) => {
        const by = ({ ArrowUp: d.span.vote, ArrowDown: -d.span.vote } as Record<string, number>)[event.key];
        if (!by) return;
        event.preventDefault();
        this._set(d, level + by);
      };
      const drag = (event: PointerEvent) => this._drag(d, event);
      // The lettering is drawn twice: once on the track, and once in the fill, which is over it and shows as much of its own as it covers.
      const face = html`<span class="face" aria-hidden="true"><b>${this._pic(d)}${level > d.span.min ? `${Math.round(level)}%` : said}</b><span>${d.name}</span></span>`;
      return html`<div class="fader ${this._dragging === d.id ? "drag" : ""}" role="slider" tabindex="0" aria-label=${d.name} aria-valuemin=${d.span.min} aria-valuemax=${d.span.max} aria-valuenow=${level}
        style="--lvl: ${(level - d.span.min) / (d.span.max - d.span.min)}" @pointerdown=${drag} @pointermove=${drag} @pointerup=${this._drop} @pointercancel=${this._drop} @keydown=${key}>
        ${face}<i>${face}</i>
      </div>`;
    }
    const armed = this._armed === d.id;
    return html`<button class="key ${d.on ? "on" : ""} ${d.away ? "away" : ""} ${armed ? "armed" : ""}" aria-pressed=${d.on} ?disabled=${d.away} @click=${() => this._press(d)}>
      <b>${this._pic(d)}</b><span>${d.name}<em role=${armed ? "status" : nothing}>${armed ? `again to ${AGAIN[d.kind]}?` : said}</em></span>
    </button>`;
  }

  /** The element is `px` wide (family.ts says so, and again whenever it changes): a screen is as many cells across as fit. */
  protected _resized(px: number) {
    this._wide = px;
  }

  /** How tall a screen is. Dash-Bored's page fills the window, the card picker's specimen
   * fills its own, and a card is in proportion to its width. */
  private get _tall() {
    return this.hasAttribute("panel") ? window.innerHeight : this._sample ? 400 : Math.round(Math.min(760, Math.max(440, this._wide * 0.62)));
  }

  /** The screens, worked out again only when the registries or the screen's size have
   * changed: not when a light is switched, which is when the page is otherwise drawn. */
  private _lay(found: Survey) {
    const [wide, tall] = [this._wide, this._tall];
    if (this._laid?.found === found && this._laid.wide === wide && this._laid.tall === tall) return this._laid;
    const all = screens(found, wide, tall);
    // The bar has one entry for the home screen and one for each set of rooms, however many screens the set has.
    const entries = all.flatMap((s, first) => (s.part === 0 ? [{ name: s.name, splits: s.splits, first, parts: s.parts }] : []));
    return (this._laid = { found, wide, tall, screens: all, entries, sets: new Map(splits(found).map((set) => [set.id, set])) });
  }

  /** The pager was swiped, or is on its way somewhere: the screen nearest the middle is the one it is on. */
  private _scrolled(event: Event) {
    const pages = event.currentTarget as HTMLElement;
    const at = Math.round(pages.scrollLeft / pages.clientWidth);
    if (at !== this._at) this._at = at;
  }

  private _go(at: number) {
    const pages = this.renderRoot.querySelector<HTMLElement>(".pages");
    pages?.scrollTo({ left: at * pages.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  /** A room's tile: its name, its lights in words, its temperature, and a round button for as many of its devices as its size has room for. */
  private _tile(r: Room, p: Placed, hue: number, dim: boolean, cell: [wide: number, tall: number, gap: number]) {
    const lamps = r.devices.filter((d) => d.kind === "light" && !d.away);
    const on = lamps.filter((d) => d.on).length;
    const share = glow(lamps);
    const sub = lamps.length ? (on ? `${on} of ${things(lamps.length, "light")} on` : lamps.length === 1 ? "Light off" : "All lights off") : r.devices.length ? things(r.devices.length, "device") : "";
    // Lights first: they are what a round button is most often pressed for. When there are more than fit, the last place says how many more.
    const first = [...r.devices].sort((a, b) => Number(b.kind === "light") - Number(a.kind === "light"));
    const room = dots(p);
    const more = first.length > room ? first.length - (room - 1) : 0;
    const show = () => (this._open = r.id);

    // A tile with the room for them has the room's own controls, as its sheet has, and no round buttons.
    const whole = holds(p.w * cell[0] + (p.w - 1) * cell[2], p.h * cell[1] + (p.h - 1) * cell[2], r.devices.length);

    return html`<article class="room glass w${Math.min(p.w, 2)} h${Math.min(p.h, 2)} ${dim ? "dim" : ""}" data-room=${r.id} style="${place(p)}; --hue: ${hue}; --lit: ${share ? (0.35 + share * 0.65).toFixed(2) : 0}">
      <button class="open" aria-label="${r.name}${sub ? `: ${sub}` : ""}. Open its controls" @click=${show}></button>
      <div class="head"><div><h2>${r.name}</h2><span class="sub">${sub}</span></div>${r.temp === undefined ? nothing : html`<div class="temp">${r.temp.toFixed(1)}°</div>`}</div>
      ${whole ? html`<div class="controls" style="--tall: ${whole}px">${r.devices.map((d) => this._control(d))}</div>` : html`<div class="dots">
        ${(more ? first.slice(0, room - 1) : first).map((d) => html`<button class="dot ${d.kind === "light" ? "lamp" : ""} ${d.on ? "on" : ""} ${d.away ? "away" : ""}" title=${d.name} aria-label="${d.name}: ${this._stands(d)}" aria-pressed=${d.on} ?disabled=${d.away}
          @click=${() => (d.guarded ? show() : this._press(d))}>${this._pic(d)}</button>`)}
        ${more ? html`<button class="dot" aria-label="${more} more in ${r.name}" @click=${show}>+${more}</button>` : nothing}
      </div>`}
    </article>`;
  }

  render() {
    const house = this._house;
    const hass = this._hass;
    const found = this._survey;
    const tall = this._tall;
    const looks = `aurora ${hass?.themes?.darkMode ? "dark" : ""} ${this._wide < 520 ? "narrow" : ""}`;
    if (!hass || !house || !found) return html`<div class=${looks} style="height: ${tall}px"><div class="urgent over">Waiting for Home Assistant…</div></div>`;

    const laid = this._lay(found);
    // A screen's cell in px and the gap between two (the screen less its edges and the
    // bar's room, shared out: styles.ts), as its tiles see them, and how much the tiles' contents are enlarged.
    const [edge, gap, foot] = this._wide < 520 ? [12, 10, 84] : [18, 14, 88];
    const sized = (s: Screen) => {
      const [wide, high] = [(this._wide - 2 * edge - (s.cols - 1) * gap) / s.cols, (tall - edge - foot - (s.rows - 1) * gap) / s.rows];
      const by = zoom(wide, high);
      return { by, cell: [wide / by, high / by, gap / by] as [number, number, number] };
    };
    const at = Math.min(this._at, laid.screens.length - 1);
    const now = Date.now();
    const when = new Date(this._now);
    const rooms = new Map(house.rooms.map((r, i) => [r.id, { r, hue: HUES[i % HUES.length] }]));
    // The sensors in trouble, the worst first. The feed counts in seconds.
    const notes = this._alerts.filter((a) => a.level !== NOMINAL).sort((a, b) => (RANK[b.level] ?? 0) - (RANK[a.level] ?? 0) || a.began - b.began);
    // The first thermostat in the house's own order of rooms has the ring.
    const stat = house.rooms.flatMap((r) => r.devices).find((d) => d.kind === "climate" && d.dims && !d.away);
    const line = spark(this._trace, now - HOUR, now);
    const find = this._find.trim().toLowerCase();
    const hit = (r?: Room) => !!r && (!find || [r.name, ...r.devices.map((d) => d.name), ...r.scenes.map((sc) => sc.name)].some((name) => name.toLowerCase().includes(find)));
    const title = (s: Screen) => (s.parts > 1 ? `${s.name} ${s.part + 1}` : s.name);
    const outside = (event: MouseEvent) => {
      const box = (event.currentTarget as Element).getBoundingClientRect();
      return event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
    };

    // The home screen's tiles, each by its id.
    const home: Record<string, (p: Placed) => unknown> = {
      [HERO]: (p) => html`<section class="hero glass" style=${place(p)}>
        <time>${when.toLocaleString(hass.locale?.language, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</time>
        <h1>${greeting(when.getHours())}</h1>
        <p>${said(house).map(([text, strong]) => (strong ? html`<b>${text}</b>` : text))}</p>
      </section>`,
      // Whether Sensor Watch is there at all is said, so that an empty tile is never taken for a house with nothing wrong.
      [ALERTED]: (p) => html`<section class="alerts glass" style=${place(p)}><span class="label">Sensor Watch</span>
        ${notes.length
          ? notes.map((a) => html`<div class="note ${a.level}" role="status"><b>${a.name}</b>${a.message || a.level}<small>since ${clock(a.began * 1000)}</small></div>`)
          : html`<div class="none">${hass.config?.components?.includes("casa_mia_sensor_watch") ? "Nothing needs attention." : "Sensor Watch is not installed, so nothing is watched from here."}</div>`}
      </section>`,
      [SCENES]: (p) => html`<nav class="scenes glass" style=${place(p)} aria-label="Scenes">${house.scenes.map((s) => this._scene(s, s.floor ? s.full : s.name))}</nav>`,
      [ENERGY]: (p) => html`<section class="energy glass" style=${place(p)}><span class="label">Drawing now</span>
        ${house.kw === undefined
          ? html`<div class="none">The power sensor is not answering.</div>`
          : html`<div class="big">${house.kw.toFixed(2)}<small>kW</small></div>
              ${line
                ? html`<svg viewBox="0 0 300 90" preserveAspectRatio="none" role="img" aria-label="The power drawn over the last hour">
                    <defs><linearGradient id="aurora-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
                    <path d=${line.area} fill="url(#aurora-fade)"/><path d=${line.line} fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`
                : html`<div class="none">No readings from the last hour yet.</div>`}`}
      </section>`,
      [CLIMATE]: (p) => html`<section class="climate glass" style=${place(p)}>
        ${stat
          ? html`<div class="ringwrap"><div class="ring" style="--pct: ${(this._level(stat) - stat.span.min) / (stat.span.max - stat.span.min)}"></div>
                <div class="read"><b>${this._level(stat)}°</b><span>${stat.room}${stat.on ? (stat.temp === undefined ? "" : ` · now ${stat.temp.toFixed(1)}°`) : " · off"}</span></div></div>
              <div class="steps"><button aria-label="${stat.room} ${stat.name}: cooler" @click=${() => this._set(stat, this._level(stat) - stat.span.step)}>−</button><button aria-label="${stat.room} ${stat.name}: warmer" @click=${() => this._set(stat, this._level(stat) + stat.span.step)}>+</button></div>`
          : html`<div class="none">No thermostat here takes a target just now.</div>`}
      </section>`,
    };
    // A set of rooms on the home screen: a press goes to its first screen.
    const set = (p: Placed) => {
      const one = laid.sets.get(p.id.slice(SPLIT.length))!;
      const inside = one.rooms.flatMap((id) => (rooms.has(id) ? [rooms.get(id)!.r] : []));
      const lamps = inside.flatMap((r) => r.devices).filter((d) => d.kind === "light" && !d.away);
      const on = lamps.filter((d) => d.on).length;
      const share = glow(lamps);
      return html`<button class="set glass ${find && !inside.some(hit) ? "dim" : ""}" style="${place(p)}; --hue: 60; --lit: ${share ? (0.35 + share * 0.65).toFixed(2) : 0}" @click=${() => this._go(laid.entries.find((e) => e.splits.includes(one.id))!.first)}>
        <span><h2>${one.name}</h2><span class="sub">${things(inside.length, "room")}${lamps.length ? ` · ${on ? `${things(on, "light")} on` : "lights off"}` : ""}</span></span>
        <span class="in">${inside.map((r) => {
          const lit = r.devices.filter((d) => d.kind === "light" && d.on && !d.away).length;
          return html`<span class=${lit ? "lit" : ""}>${r.name}${lit ? html`<b>${lit}</b>` : nothing}</span>`;
        })}</span>
      </button>`;
    };
    const tile = (p: Placed, cell: [number, number, number]) => {
      if (p.id.startsWith(SPLIT)) return set(p);
      if (!p.id.startsWith(ROOM)) return home[p.id](p);
      const here = rooms.get(p.id.slice(ROOM.length));
      return here ? this._tile(here.r, p, here.hue, !hit(here.r), cell) : nothing;
    };
    // Enter in the search goes to the first screen with a room that matches.
    const seek = (event: KeyboardEvent) => {
      const to = event.key === "Enter" && find ? laid.screens.findIndex((s) => s.tiles.some((t) => t.id.startsWith(ROOM) && hit(rooms.get(t.id.slice(ROOM.length))?.r))) : -1;
      if (to >= 0) this._go(to);
    };
    const open = house.rooms.find((r) => r.id === this._open);
    const urgent = [this._lost ? `No connection to Home Assistant since ${clock(this._lost)}. What is shown is as it was then.` : "", this._fault].filter(Boolean);

    return html`<div class=${looks} style="height: ${tall}px; --warm: ${glow(lights(house)).toFixed(3)}" @pointermove=${this._shine}>
      <div class="sky" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="pages" @scroll=${this._scrolled}>
        ${laid.screens.map((s) => {
          const { by, cell } = sized(s);
          return html`<div class="page" role="group" aria-label=${title(s)} style="--cols: ${s.cols}; --rows: ${s.rows}; --zoom: ${by.toFixed(3)}">${s.tiles.map((p) => tile(p, cell))}</div>`;
        })}
      </div>
      ${urgent.length ? html`<div class="urgent over" role="alert">${urgent.map((text) => html`<div>${text}</div>`)}</div>` : nothing}
      ${at > 0 ? html`<button class="edge left" aria-label="Back to ${title(laid.screens[at - 1])}" @click=${() => this._go(at - 1)}>${title(laid.screens[at - 1])}</button>` : nothing}
      ${at < laid.screens.length - 1 ? html`<button class="edge right" aria-label="On to ${title(laid.screens[at + 1])}" @click=${() => this._go(at + 1)}>${title(laid.screens[at + 1])}</button>` : nothing}
      <nav class="bar" aria-label="Screens">
        ${laid.entries.map((e) => {
          const here = at >= e.first && at < e.first + e.parts;
          const none = !!find && e.splits.length > 0 && !e.splits.some((id) => laid.sets.get(id)!.rooms.some((room) => hit(rooms.get(room)?.r)));
          return html`<button class="${here ? "here" : ""} ${none ? "dim" : ""}" aria-current=${here ? "page" : nothing} @click=${() => this._go(e.first)}>${e.name}${e.parts > 1 ? html`<i>${Array.from({ length: e.parts }, (_, part) => html`<b class=${e.first + part === at ? "on" : ""}></b>`)}</i>` : nothing}</button>`;
        })}
        ${this._sample || house.rooms.length < 2
          ? nothing
          : html`<label class="ask"><input placeholder="Find…" aria-label="Find a room, a device or a scene" autocomplete="off" .value=${this._find} @input=${(e: Event) => (this._find = (e.target as HTMLInputElement).value)} @keydown=${seek} /><kbd>/</kbd></label>`}
        ${this.hasAttribute("panel")
          ? html`<button class="other" aria-label="Choose another style of Dash-Bored" title="Another style" @click=${() => fire(this, CHOOSE)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4,4 h7 v7 h-7 z M13,4 h7 v7 h-7 z M4,13 h7 v7 h-7 z M13,13 h7 v7 h-7 z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>`
          : nothing}
      </nav>
      ${open
        ? html`<dialog class="sheet glass" aria-label=${open.name} @cancel=${(e: Event) => (e.preventDefault(), this._shut())} @click=${(e: MouseEvent) => outside(e) && this._shut()}>
            <header><h2>${open.name}</h2><button class="close" @click=${this._shut}>Done</button></header>
            ${this._fault ? html`<div class="urgent" role="alert">${this._fault}</div>` : nothing}
            ${open.scenes.length ? html`<nav class="scenes" aria-label="${open.name}'s scenes">${open.scenes.map((s) => this._scene(s, s.name))}</nav>` : nothing}
            <div class="controls">${open.devices.map((d) => this._control(d))}</div>
            ${open.devices.length || open.scenes.length ? nothing : html`<p class="none">Nothing in this room can be worked from here.</p>`}
          </dialog>`
        : nothing}
    </div>`;
  }
}
