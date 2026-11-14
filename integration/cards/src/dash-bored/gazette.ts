// The Gazette: the house as a newspaper. One element, used two ways: it is Dash-Bored's
// page in the sidebar, and a dashboard card. house.ts reads the house, stories.ts ranks
// what is worth saying, voices.ts words it, and styles.ts is the look; this file draws
// the page and acts on what is pressed.
import { LitElement, html, nothing, type TemplateResult } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { live } from "lit/directives/live.js";
import { fire, navigate, type Hass } from "../ha.ts";
import { clipping, type Open } from "./clipping.ts";
import { DEGREES, read, sighted, survey, type Device, type House, type Options, type Room, type Seen, type Sighting, type Survey } from "./house.ts";
import { recorded } from "./record.ts";
import { NOMINAL, RECOVERED, cap, clock, counted, flavourOf, flip, personal, setting, stories, type Alert, type Press, type Rated, type Story } from "./stories.ts";
import { STYLES } from "./styles.ts";
import { FIXES, VOICES, amount, announce, clause, fill, poll, tell, wired, words, type Told } from "./voices.ts";

export const CARD = "dash-bored-gazette";
const ALERTS = "casa_mia_dash_bored/alerts"; // the integration's feeds: Sensor Watch's alerts (alerts.py)
const SIGHTINGS = "casa_mia_dash_bored/sightings"; // what the cameras have seen (sightings.py)
const PERSONAL = "casa_mia_dash_bored/personal"; // and the songs people have rated (personal.py)
const ARCHIVE = 30 * 60_000; // ms: how far back the column of past sightings goes
const PAST = 10; // and how many of them it lists
const REMEMBERED = "dash-bored-style"; // this browser's choice of paper
// The broadsheet's masthead (Manufacturing Consent, Open Font Licence), served by the
// integration beside this file. It is a textura, the English blackletter of a Victorian
// paper's nameplate; a Fraktur, which it once was, is the German kind and looks it. A shadow root can't declare a font, so the document is given it, once.
const MASTHEAD = "/casa_mia_dash_bored/fonts/ManufacturingConsent-Regular.ttf";
let mastheadAsked = false;
function masthead() {
  if (mastheadAsked) return;
  mastheadAsked = true;
  const face = new FontFace("Dash-Bored Masthead", `url(${MASTHEAD})`);
  document.fonts.add(face);
  // Without it the masthead is set in the headline's face: said in the console, not hidden.
  face.load().catch((err) => console.error("Dash-Bored: the masthead's font could not be loaded", err));
}
// A house with more devices than this can't be reported device by device: the page was
// many screens long on a phone for a large one. Its report is of what is on, unlocked or
// not answering, and its switchboard, which still has everything, goes across the foot.
const BIG = 30;
const MANY = 3; // more lights lit in one of its rooms than this are a count, not a list
const ARMED = 6000; // ms: how long a first press to unlock or open waits for its second
const SETTLE = 350; // ms: a level on the scale is asked for once it has been still this long
// What a big house's report tells of: a lock that is open, a thing that is on, a thing
// in a phase of its own (a mower in trouble, an alarm sounding). A thermostat or a water
// heater at work, a camera watching and an alarm set are how things should be, and no news.
const UNREMARKABLE = new Set(["climate", "camera", "water_heater", "alarm_control_panel"]);
const AT_REST = new Set(["docked"]);
const notable = (d: Device) => d.away || (!!d.phase && !AT_REST.has(d.phase)) || (!UNREMARKABLE.has(d.kind) && (d.kind === "lock" ? !d.on : d.on));
// A camera is in the report only when it stops answering: "keeps watch" for each is noise.
const reportable = (d: Device) => d.kind !== "camera" || d.away;
// The heating, the hot water, the music, a robot and an alarm are not switched by a press
// on a sentence or a chip: that opens the clipping, as it does for a lock.
const OPENS = new Set(["climate", "media_player", "camera", "water_heater", "vacuum", "lawn_mower", "alarm_control_panel"]);
type Config = Options & { type?: string; style?: string };
type Line = { time: number; device?: Device; alert?: Alert; seen?: Sighting };

export class Gazette extends LitElement {
  static styles = STYLES;
  static properties = { narrow: { type: Boolean }, _house: { state: true }, _style: { state: true }, _alerts: { state: true }, _seen: { state: true }, _fault: { state: true }, _lost: { state: true }, _scale: { state: true }, _open: { state: true }, _rated: { state: true } };
  narrow = false;
  _house?: House;
  // The one scale that is open: for which device, and the level asked for that the
  // device has not yet said it has come to. It is under the device's sentence, or in
  // its clipping when that is open.
  _scale?: { id: string; want?: number };
  _open?: Open; // the clipping that is open: see clipping.ts
  _style = "broadsheet";
  _alerts: Alert[] = [];
  _seen: Seen[] = []; // the feed's sightings of the last half hour
  _rated: Rated[] = []; // the feed's rated songs
  _fault = ""; // an action Home Assistant refused, or a feed that failed, in words
  _lost = 0; // ms: since when there has been no connection (0: connected)
  private _hass?: Hass;
  private _config: Config = {};
  private _survey?: Survey;
  private _late: Line[] = [];
  private _turn = new Map<string, number>();
  private _showing = new Set<string>();
  private _feeds = new Map<string, Promise<() => void>>(); // by the feed's command
  private _primed = false;
  private _seenPrimed = false;
  private _timers = new Set<ReturnType<typeof setTimeout>>();
  private _asking?: ReturnType<typeof setTimeout>; // the level waiting to be asked for: see _ask

  static getStubConfig() {
    return {};
  }

  setConfig(config: Config) {
    this._config = { ...config };
    this._survey = undefined;
    this._choose();
  }

  getCardSize() {
    return 12;
  }

  getGridOptions() {
    return { columns: "full" };
  }

  /** Home Assistant sets this when the element is the sidebar's page, not a card. */
  set panel(_panel: unknown) {
    this.toggleAttribute("panel", true);
  }

  set hass(hass: Hass) {
    const was = this._hass;
    this._hass = hass;
    // Without a connection what is shown is a memory: say so, with since when.
    if (hass.connected === false) {
      this._lost ||= Date.now();
      return;
    }
    this._lost = 0;
    this._listen();

    if (!this._survey || !was || was.entities !== hass.entities || was.areas !== hass.areas || was.devices !== hass.devices || was.floors !== hass.floors) this._survey = survey(hass, this._config);
    // ponytail: `hass` is set at every state change in the house, and the page isn't told
    // which entity changed, so this looks at each watched one. If that ever shows in a
    // profile, follow the entities with a subscription of our own instead.
    else if (was.states === hass.states || !this._survey.watched.some((id) => was.states[id] !== hass.states[id])) return;

    const before = new Map(this._house?.rooms.flatMap((r) => r.devices).map((d) => [d.id, d]));
    this._house = read(this._survey, hass);
    for (const d of this._house.rooms.flatMap((r) => r.devices)) {
      const old = before.get(d.id);
      if (!old || (old.on === d.on && old.phase === d.phase && old.level === d.level && old.away === d.away)) continue;
      this._note({ time: Date.now(), device: d });
      // The device has moved: what was asked of it is answered, and the scale shows where it is.
      if (this._scale?.id === d.id) this._scale = { ...this._scale, want: undefined };
      // Its clipping's record goes on, and a press that was waiting for its second is forgotten.
      if (this._open?.id === d.id) this._open = { ...this._open, armed: false, record: this._open.record && [...this._open.record, { at: Date.now(), on: d.on, phase: d.phase, level: d.level, away: d.away }] };
    }
  }

  connectedCallback() {
    super.connectedCallback();
    masthead();
    this._choose();
    if (this._hass?.connected !== false) this._listen();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const feed of this._feeds.values()) feed.then((stop) => stop()).catch(() => undefined);
    this._feeds.clear();
    this._primed = this._seenPrimed = false;
    for (const timer of this._timers) clearTimeout(timer);
    this._timers.clear();
  }

  /** Which paper: the card's own, else the one this browser last chose. */
  private _choose() {
    let style = this._config.style;
    try {
      style ??= localStorage.getItem(REMEMBERED) ?? undefined;
    } catch {
      // No storage here (a private window): the broadsheet, then.
    }
    if (style && style in VOICES) this._style = style;
  }

  private _dress(style: string) {
    this._style = style;
    try {
      localStorage.setItem(REMEMBERED, style);
    } catch {
      // Not remembered, that is all.
    }
  }

  /** Follow the integration's feeds: Sensor Watch's alerts and the cameras' sightings.
   * Home Assistant's connection subscribes again by itself after a break, and each feed
   * then says all it holds again. */
  private _listen() {
    const connection = this._hass?.connection;
    if (!connection || !this.isConnected) return;
    const follow = <T>(type: string, what: string, take: (items: T[]) => void) => {
      if (this._feeds.has(type)) return;
      const feed: Promise<() => void> = connection.subscribeMessage(take, { type });
      this._feeds.set(type, feed);
      feed.catch((err: any) => {
        this._feeds.delete(type);
        console.error(`Dash-Bored: the feed ${type} failed`, err);
        this._fault = `${what} are not reaching this page (${err?.message ?? err}).`;
      });
    };
    follow(ALERTS, "Sensor Watch's alerts", (alerts: Alert[]) => this._take(alerts));
    follow(SIGHTINGS, "The cameras' sightings", (seen: Seen[]) => this._sight(seen));
    // The feed says all it holds again after a break, so each is kept once.
    follow(PERSONAL, "The Personal column's announcements", (rated: Rated[]) => (this._rated = [...new Map([...this._rated, ...rated].map((r) => [`${r.at} ${r.name} ${r.title}`, r])).values()]));
  }

  /** Sightings from the feed: all it holds at first, then each as it comes, and again
   * (under the same id) when its kind or its photograph changes. */
  private _sight(items: Seen[]) {
    const held = new Map(this._seen.map((s) => [s.id, s]));
    const now = Date.now();
    for (const s of items) {
      const known = held.has(s.id);
      held.set(s.id, s);
      const age = now - s.at * 1000;
      if (known || age >= RECOVERED) continue;

      // It leaves the front page when its time is up.
      this._later(RECOVERED - age);
      const [told] = this._seenPrimed && this._survey ? sighted(this._survey, [s]) : [];
      if (told) this._note({ time: told.at, seen: told });
    }
    this._seenPrimed = true;
    this._seen = [...held.values()].filter((s) => now - s.at * 1000 < ARCHIVE);
  }

  private _take(alerts: Alert[]) {
    const held = new Map(this._alerts.map((a) => [a.entity_id, a]));
    for (const raw of alerts) {
      // The feed counts in seconds, and knows nothing of what sort of sensor it is.
      const alert = { ...raw, at: raw.at * 1000, began: raw.began * 1000, flavour: flavourOf(this._hass?.states[raw.entity_id]?.attributes.device_class) };
      held.set(alert.entity_id, alert);
      if (!this._primed) continue;

      this._note({ time: alert.at, alert });
      if (alert.level !== NOMINAL) this.scrollIntoView({ block: "start", behavior: "smooth" }); // breaking news is no use below the fold
      else this._later(RECOVERED);
    }
    this._primed = true;
    this._alerts = [...held.values()];
  }

  /** Draw the page again once `ms` have passed. A date coming due, not a poll: a recovery
   * or a sighting leaves the paper when its time is up. */
  private _later(ms: number) {
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      this.requestUpdate();
    }, ms + 1000);
    this._timers.add(timer);
  }

  private _note(line: Line) {
    this._late = [line, ...this._late].slice(0, 8);
  }

  private _call(press: Press, what: string) {
    this._hass!.callService(press.domain, press.service, { entity_id: press.ids, ...press.data }).then(
      () => (this._fault = ""),
      (err: any) => {
        console.error(`Dash-Bored: ${press.domain}.${press.service} refused`, err);
        this._fault = `${what}: Home Assistant refused (${err?.message ?? err}).`;
      },
    );
  }

  private _press(d: Device) {
    // A lock or a garage door is never moved from a sentence, and a device that isn't
    // answering can't be: its clipping, where unlocking or opening takes two presses.
    if (d.guarded || d.away || OPENS.has(d.kind)) this._story(d);
    else this._call(flip(d), `${d.room} ${d.name}`);
  }

  /** Open a device's clipping, and ask Home Assistant for its record. */
  private _story(d: Device) {
    this._open = { id: d.id };
    this._scale = d.dims && !d.away ? { id: d.id } : undefined;
    const mine = (more: Partial<Open>) => {
      if (this._open?.id === d.id) this._open = { ...this._open, ...more };
    };
    if (d.kind === "camera") return;
    recorded(this._hass!, d, Date.now()).then(
      (record) => mine({ record }),
      (err: any) => {
        console.error(`Dash-Bored: the history of ${d.id} could not be read`, err);
        mine({ fault: err?.message ?? String(err) });
      },
    );
  }

  private _shut() {
    this._open = this._scale = undefined;
  }

  /** The clipping's button. To unlock a lock, or open a garage door or a gate, it must
   * be pressed twice: the first press arms it, for a few seconds. */
  private _flip(d: Device) {
    const open = this._open!;
    const risky = d.guarded && (d.kind === "lock" ? d.on : !d.on);
    if (risky && !open.armed) {
      this._open = { ...open, armed: true };
      const timer = setTimeout(() => {
        this._timers.delete(timer);
        if (this._open?.id === d.id) this._open = { ...this._open, armed: false };
      }, ARMED);
      this._timers.add(timer);
      return;
    }
    this._open = { ...open, armed: false };
    this._call(flip(d), `${d.room} ${d.name}`);
  }

  /** A dialog is modal only when opened by its method, not by being drawn. */
  protected updated() {
    const cutting = this.renderRoot.querySelector("dialog");
    if (cutting && !cutting.open) cutting.showModal();
  }

  /** Ask a device for a level, once the level has stopped changing: a drag asks when the
   * handle is let go, but an arrow key held down reports a change at every step, and a
   * bus of real dimmers would be sent them all. */
  private _ask(d: Device, level: number) {
    clearTimeout(this._asking);
    this._timers.delete(this._asking!);
    this._asking = setTimeout(() => {
      this._timers.delete(this._asking!);
      this._call(setting(d, level), `${d.room} ${d.name}`);
    }, SETTLE);
    this._timers.add(this._asking);
  }

  /** Open the scale for a device, or close it if it is the one that is open. */
  private _measure(d: Device) {
    this._scale = this._scale?.id === d.id ? undefined : { id: d.id };
  }

  private _key(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).click();
  }

  render() {
    const hass = this._hass;
    const house = this._house;
    const voice = VOICES[this._style];
    if (!hass || !house) return html`<div class="paper" data-style=${this._style}><p class="wait">Waiting for Home Assistant.</p></div>`;

    const now = Date.now();
    const sightings = sighted(this._survey!, this._seen).filter((s) => now - s.at < ARCHIVE);
    const past = [...sightings].sort((a, b) => b.at - a.at).slice(0, PAST);
    // What sort of sighting, in a word or two of this paper's: its story's kicker.
    const sort = (kind: string) => (voice.stories[`sighting.${kind}`]?.kicker ?? kind).toLowerCase();
    const running = stories(house, this._alerts, now, sightings);
    // A story that was not in the last edition takes the next wording from its pool.
    for (const s of running) if (!this._showing.has(s.id)) this._turn.set(s.id, (this._turn.get(s.id) ?? -1) + 1);
    this._showing = new Set(running.map((s) => s.id));
    const told = running.map((s) => ({ s, ...tell(voice, s, this._turn.get(s.id)!) }));
    const [lead, ...rest] = told;
    const alert = told.find((t) => t.s.kind === "alert");

    const act = (t: Told & { s: (typeof running)[number] }) => (t.act ? html`<button class="act" @click=${() => this._call(t.s.press!, t.head)}>${t.act}</button>` : nothing);
    // A device's clause switches it when pressed. Where its level can be set, the level
    // is a press of its own, which opens the scale.
    const fact = (d: Device, first: boolean): TemplateResult => {
      const [before, level, after] = d.dims && !d.away ? clause(voice, d) : [words(voice, d), "", ""];
      const part = (text: string, how: string, press: () => void) =>
        text ? html`<span class="fact ${how}" role="button" tabindex="0" @click=${press} @keydown=${this._key}>${text}</span>` : nothing;
      return html`${part(first ? cap(before) : before, d.away ? "away" : "", () => this._press(d))}${part(level, "level", () => this._measure(d))}${part(after, "", () => this._press(d))}`;
    };
    // The scale and its poll, for the device they are open for. In the report they are
    // inside the room's paragraph, so that the two stay in one column. The figure is the
    // device's own, with what was asked beside it until the device says it has moved.
    const scale = (d?: Device) => {
      const open = this._scale;
      if (!d || !open || open.id !== d.id || !d.dims || d.away) return nothing;
      const { min, max, step, vote: by } = d.span;
      const at = d.level ?? min;
      const ask = (event: Event) => Number((event.target as HTMLInputElement).value);
      // The readers' poll: each vote moves the level a step from where it was last asked
      // to be, so three votes in a row are one call for thirty per cent.
      const now = open.want ?? at;
      const asked = poll(voice, d);
      const vote = (words: string, move: number) => {
        const to = Math.min(max, Math.max(min, Math.round((now + move) * 10) / 10));
        return html`<button class="act" ?disabled=${to === now} @click=${() => ((this._scale = { ...open, want: to }), this._ask(d, to))}>${words}</button>`;
      };
      return html`<span class="scale">
        <span class="poll"><i>${cap(asked.ask)}</i>${vote(asked.less, -by)}${vote(asked.more, by)}</span>
        <input type="range" min=${min} max=${max} step=${step} aria-label=${d.name} .value=${live(String(now))}
          @input=${(e: Event) => (this._scale = { ...open, want: ask(e) })}
          @change=${(e: Event) => this._ask(d, ask(e))} />
        <output>${amount(voice, d.kind, at)}${open.want === undefined || open.want === at ? "" : ` → ${open.want}`}</output>
        <button aria-label="Close" @click=${() => (this._scale = undefined)}>×</button>
      </span>`;
    };
    // A photograph, where the story has one. Pressing it opens the camera that took it.
    const photo = (s: Story) =>
      s.photo
        ? html`<figure class="photo" role="button" tabindex="0" @click=${() => fire(this, "hass-more-info", { entityId: s.see })} @keydown=${this._key}>
            <img src=${s.photo} alt=${s.figure[1]} loading="lazy" @error=${() => (this._fault = `The photograph from ${s.figure[1]} could not be fetched.`)} />
            <figcaption>${s.figure[1]}, ${s.figure[0]}</figcaption>
          </figure>`
        : nothing;
    const warm = house.rooms.filter((r) => r.temp !== undefined);
    const column = personal(house.people, this._rated, now);

    const rooms = house.rooms.filter((r) => r.devices.length);
    const big = rooms.reduce((n, r) => n + r.devices.length, 0) > BIG;
    const reported = rooms.map((r) => ({ ...r, devices: r.devices.filter(big ? notable : reportable) })).filter((r) => r.devices.length);
    // Rooms come sorted by floor (house.ts). A house with no floors has no crossheads.
    const floored = rooms.some((r) => r.floor);
    const byFloor = (list: Room[], draw: (r: Room) => TemplateResult, wrap = (drawn: TemplateResult[]): unknown => drawn) => {
      const floors = new Map<string, Room[]>();
      for (const r of list) floors.set(r.floor ?? "", [...(floors.get(r.floor ?? "") ?? []), r]);
      return [...floors].map(([floor, on]) => html`${floored ? html`<h5>${floor || voice.titles.elsewhere}</h5>` : nothing}${wrap(on.map(draw))}`);
    };
    // A room's sentence. In a big house its lit lights, if many, are one fact that puts
    // them out; its running switches are a count and no more, since nobody means to stop
    // nine relays with one press.
    const report = (r: Room) => {
      const many = (kind: string) => {
        const on = r.devices.filter((d) => big && d.kind === kind && d.on && !d.away);
        return on.length > MANY ? on : [];
      };
      const lit = many("light");
      const running = many("switch");
      const parts: unknown[] = r.devices.filter((d) => !lit.includes(d) && !running.includes(d)).map((d, i) => fact(d, !i && !lit.length && !running.length));
      if (running.length) parts.unshift(lit.length ? fill(voice.words["switch.many"], counted(running.length)) : cap(fill(voice.words["switch.many"], counted(running.length))));
      if (lit.length)
        parts.unshift(html`<span class="fact" role="button" tabindex="0" @click=${() => this._call({ domain: "light", service: "turn_off", ids: lit.map((d) => d.id) }, r.name)} @keydown=${this._key}>${cap(fill(voice.words["light.many"], counted(lit.length)))}</span>`);
      return html`<p><b>${r.name}.</b> ${parts.map((part, i) => html`${i ? voice.join : ""}${part}`)}${voice.end}${this._open ? nothing : scale(r.devices.find((d) => d.id === this._scale?.id))}</p>`;
    };
    // A chip switches its device, and its tab opens the device's clipping. The tab shows
    // the level where there is one to set.
    const chip = (d: Device) =>
      html`<div class="pair"><button class="chip ${d.on ? "on" : ""} ${d.away ? "away" : ""}" aria-pressed=${d.on} @click=${() => this._press(d)}>${d.name}</button
        ><button class="chip tab" aria-label="${d.name}: its story" @click=${() => this._story(d)}>${d.dims && !d.away ? `${d.level ?? d.span.min}${DEGREES.has(d.kind) ? "°" : "%"}` : "›"}</button></div>`;
    const devices = new Map(house.rooms.flatMap((r) => r.devices).map((d) => [d.id, d]));
    const subject = this._open && devices.get(this._open.id);
    // What comes away with a clipping: the paper's own stories, from round where it was cut.
    const others = rest.length ? rest : told;
    const scraps = { above: others[0].deck, beside: [...others, ...told].map((t) => `${t.head}. ${t.deck}`).join(" "), below: others.at(-1)!.head };
    const board = html`<h3>${voice.titles.board}</h3>
      ${byFloor(rooms, (r) => html`<div class="row"><span>${r.name}</span>${r.devices.map(chip)}</div>`,
        (drawn) => html`<div class="rows">${drawn}</div>`)}`;

    return html`<div class="paper" data-style=${this._style}>
      ${this._lost ? html`<div class="fault" role="alert">Not connected to Home Assistant since ${clock(this._lost)}. What follows is how things stood then.</div>` : nothing}
      ${this._fault ? html`<div class="fault" role="alert">${this._fault}</div>` : nothing}
      ${alert ? keyed(alert.s.id + alert.s.variant, html`<div class="breaking" role="status"><b>${voice.flash}</b>${alert.head}${/[!?]$/.test(alert.head) ? "" : ":"} ${alert.s.vars.message}</div>`) : nothing}
      <header class="masthead"><h1>${voice.name}</h1><p>${voice.strap}</p></header>
      <div class="dateline">
        ${this.hasAttribute("panel") ? html`<ha-menu-button .hass=${hass} .narrow=${this.narrow}></ha-menu-button>` : nothing}
        <span>${new Date().toLocaleDateString(hass.locale?.language ?? "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        ${this._config.style
          ? nothing
          : html`<span class="styles">${Object.entries(VOICES).map(([id, v]) => html`<button aria-pressed=${id === this._style} @click=${() => this._dress(id)}>${v.label}</button>`)}</span>`}
        <span>${voice.price} · ${clock(Date.now())}</span>
      </div>
      <main class="page ${rest.length ? "" : "solo"}">
        <article>
          <div class="figure"><b>${lead.s.figure[0]}</b><span>${lead.s.figure[1]}</span></div>
          <p class="kicker">${lead.kicker}</p>
          ${keyed(lead.head, html`<h2>${lead.head}</h2>`)}
          <p class="deck">${lead.deck}</p>
          ${act(lead)}
          ${photo(lead.s)}
          <div class="copy">
            ${lead.body ? html`<p>${lead.body}</p>` : nothing}
            ${byFloor(reported, report)}
            ${rooms.length > reported.length ? html`<p>${fill(voice.rest, counted(rooms.length - reported.length))}</p>` : nothing}
            ${rooms.length ? nothing : html`<p>No areas with lights, switches or other devices were found. Give your devices areas in Home Assistant's settings and this page fills itself in.</p>`}
          </div>
        </article>
        ${rest.length
          ? html`<section>
              <h3>${voice.titles.more}</h3>
              ${rest.slice(0, 3).map((t) => html`<div class="item"><p class="kicker">${t.kicker}</p><h4>${t.head}</h4>${photo(t.s)}<p>${t.deck}</p>${act(t)}</div>`)}
              ${rest.length > 3 ? html`<h3>${voice.titles.briefs}</h3><ul>${rest.slice(3).map((t) => html`<li><b>${t.head}.</b> ${t.deck}</li>`)}</ul>` : nothing}
            </section>`
          : nothing}
        <aside>
          <h3>${voice.titles.late}</h3>
          <ol>${this._late.length
            ? this._late.map((l) => {
                // A line about a device opens that device's clipping.
                const d = l.device && devices.get(l.device.id);
                return html`<li role=${d ? "button" : nothing} tabindex=${d ? 0 : nothing} @click=${() => d && this._story(d)} @keydown=${this._key}><time>${clock(l.time)}</time>${l.alert ? wired(voice, l.alert) : l.seen ? `${l.seen.name}: ${sort(l.seen.kind)}` : `${l.device!.room}: ${words(voice, l.device!)}`}</li>`;
              })
            : html`<li>${voice.nothing}</li>`}</ol>
          ${past.length
            ? html`<h3>${voice.titles.archive}</h3>
                <ol class="archive">${past.map((s) =>
                  html`<li role="button" tabindex="0" @click=${() => fire(this, "hass-more-info", { entityId: s.camera })} @keydown=${this._key}>
                    ${s.photo ? html`<img src=${s.photo} alt="" loading="lazy" />` : html`<i></i>`}<span><time>${clock(s.at)}</time>${s.name}: ${sort(s.kind)}</span></li>`)}</ol>`
            : nothing}
          ${column.length ? html`<h3>${voice.titles.personal}</h3><ol>${column.map((n) => html`<li><time>${clock(n.at)}</time>${announce(voice, n)}</li>`)}</ol>` : nothing}
          ${warm.length
            ? html`<h3>${voice.titles.temps}</h3><table>${warm.map((r) => html`<tr><td>${r.name}</td><td>${r.temp!.toFixed(1)}° ${r.target === undefined ? "" : r.temp! < r.target - 0.5 ? "▼" : r.temp! > r.target + 0.5 ? "▲" : "="}</td></tr>`)}</table>`
            : nothing}
          ${big ? nothing : board}
          ${house.gaps.length
            ? html`<h3>${voice.titles.gaps}</h3>
                ${house.gaps.map((g) => html`<details><summary>${fill(voice.gaps[g.kind], counted(g.items.length))}</summary>
                  <ul>${g.items.map((item, i) =>
                    // An entity opens its own dialog, an area its page in the settings.
                    html`${g.kind === "plumbing" && item.via !== g.items[i - 1]?.via ? html`<li class="via">${FIXES[item.via ?? ""] ?? `${item.via}. ${FIXES[""]}`}:</li>` : nothing}<li><button class="mend" @click=${() => (g.kind === "floorless" || g.kind === "cold" ? navigate(`/config/areas/area/${item.id}`) : fire(this, "hass-more-info", { entityId: item.id }))}>${item.name}</button></li>`)}</ul></details>`)}
                <p class="mend">${voice.mend}</p>`
            : nothing}
          ${house.scenes.length
            ? html`<h3>${voice.titles.notices}</h3>${house.scenes.slice(0, 8).map((s, i) =>
                html`<button class="ad" @click=${() => this._call({ domain: "scene", service: "turn_on", ids: [s.id] }, s.name)}><b>${s.name}</b>${voice.notices[i % voice.notices.length]}</button>`)}`
            : nothing}
        </aside>
        ${big ? html`<section class="board">${board}</section>` : nothing}
      </main>
      ${subject
        ? clipping(voice, subject, this._open!, now, scale(subject), scraps, {
            flip: () => this._flip(subject),
            // Home Assistant's dialog would open beneath a modal one: this is folded away first.
            more: () => (this._shut(), fire(this, "hass-more-info", { entityId: subject.id })),
            shut: () => this._shut(),
          })
        : nothing}
    </div>`;
  }
}
