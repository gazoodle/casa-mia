// The Gazette: the house as a newspaper. One element, used two ways: it is Dash-Bored's
// page in the sidebar, and a dashboard card. house.ts reads the house, stories.ts ranks
// what is worth saying, voices.ts words it, and styles.ts is the look; this file draws
// the page and acts on what is pressed.
import { LitElement, html, nothing, type TemplateResult } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { fire, navigate, type Hass } from "../ha.ts";
import { read, survey, type Device, type House, type Options, type Room, type Survey } from "./house.ts";
import { NOMINAL, RECOVERED, cap, clock, counted, flavourOf, stories, type Alert, type Press } from "./stories.ts";
import { STYLES } from "./styles.ts";
import { FIXES, VOICES, fill, tell, wired, words, type Told } from "./voices.ts";

export const CARD = "dash-bored-gazette";
const ALERTS = "casa_mia_dash_bored/alerts"; // the integration's feed (alerts.py)
const REMEMBERED = "dash-bored-style"; // this browser's choice of paper
// A house with more devices than this can't be reported device by device: the page was
// many screens long on a phone for a large one. Its report is of what is on, unlocked or
// not answering, and its switchboard, which still has everything, goes across the foot.
const BIG = 30;
const MANY = 3; // more lights lit in one of its rooms than this are a count, not a list
const notable = (d: Device) => d.away || (d.kind === "lock" ? !d.on : d.on);
type Config = Options & { type?: string; style?: string };
type Line = { time: number; device?: Device; alert?: Alert };

export class Gazette extends LitElement {
  static styles = STYLES;
  static properties = { narrow: { type: Boolean }, _house: { state: true }, _style: { state: true }, _alerts: { state: true }, _fault: { state: true }, _lost: { state: true } };
  narrow = false;
  _house?: House;
  _style = "broadsheet";
  _alerts: Alert[] = [];
  _fault = ""; // an action Home Assistant refused, or a feed that failed, in words
  _lost = 0; // ms: since when there has been no connection (0: connected)
  private _hass?: Hass;
  private _config: Config = {};
  private _survey?: Survey;
  private _late: Line[] = [];
  private _turn = new Map<string, number>();
  private _showing = new Set<string>();
  private _feed?: Promise<() => void>;
  private _primed = false;
  private _timers = new Set<ReturnType<typeof setTimeout>>();

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
      if (old && (old.on !== d.on || old.level !== d.level || old.away !== d.away)) this._note({ time: Date.now(), device: d });
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._choose();
    if (this._hass?.connected !== false) this._listen();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._feed?.then((stop) => stop()).catch(() => undefined);
    this._feed = undefined;
    this._primed = false;
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

  /** Follow Sensor Watch's alerts through the integration. Home Assistant's connection
   * subscribes again by itself after a break, and the feed then says them all again. */
  private _listen() {
    const connection = this._hass?.connection;
    if (this._feed || !connection || !this.isConnected) return;
    const feed: Promise<() => void> = connection.subscribeMessage((alerts: Alert[]) => this._take(alerts), { type: ALERTS });
    this._feed = feed;
    feed.catch((err: any) => {
      this._feed = undefined;
      console.error("Dash-Bored: the alerts feed failed", err);
      this._fault = `Sensor Watch's alerts are not reaching this page (${err?.message ?? err}).`;
    });
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
      // A date coming due, not a poll: the recovery leaves the paper when its time is up.
      else {
        const timer = setTimeout(() => {
          this._timers.delete(timer);
          this.requestUpdate();
        }, RECOVERED + 1000);
        this._timers.add(timer);
      }
    }
    this._primed = true;
    this._alerts = [...held.values()];
  }

  private _note(line: Line) {
    this._late = [line, ...this._late].slice(0, 8);
  }

  private _call(press: Press, what: string) {
    this._hass!.callService(press.domain, press.service, { entity_id: press.ids }).then(
      () => (this._fault = ""),
      (err: any) => {
        console.error(`Dash-Bored: ${press.domain}.${press.service} refused`, err);
        this._fault = `${what}: Home Assistant refused (${err?.message ?? err}).`;
      },
    );
  }

  private _press(d: Device) {
    // A lock or a garage door is never moved from a sentence, and a device that isn't
    // answering can't be: Home Assistant's own dialog, with its own confirmation.
    if (d.guarded || d.away) fire(this, "hass-more-info", { entityId: d.id });
    else this._call({ domain: d.kind, service: "toggle", ids: [d.id] }, `${d.room} ${d.name}`);
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

    const running = stories(house, this._alerts, Date.now());
    // A story that was not in the last edition takes the next wording from its pool.
    for (const s of running) if (!this._showing.has(s.id)) this._turn.set(s.id, (this._turn.get(s.id) ?? -1) + 1);
    this._showing = new Set(running.map((s) => s.id));
    const told = running.map((s) => ({ s, ...tell(voice, s, this._turn.get(s.id)!) }));
    const [lead, ...rest] = told;
    const alert = told.find((t) => t.s.kind === "alert");

    const act = (t: Told & { s: (typeof running)[number] }) => (t.act ? html`<button class="act" @click=${() => this._call(t.s.press!, t.head)}>${t.act}</button>` : nothing);
    const fact = (d: Device, first: boolean): TemplateResult =>
      html`<span class="fact ${d.away ? "away" : ""}" role="button" tabindex="0" @click=${() => this._press(d)} @keydown=${this._key}>${first ? cap(words(voice, d)) : words(voice, d)}</span>`;
    const warm = house.rooms.filter((r) => r.temp !== undefined);

    const rooms = house.rooms.filter((r) => r.devices.length);
    const big = rooms.reduce((n, r) => n + r.devices.length, 0) > BIG;
    const reported = big ? rooms.map((r) => ({ ...r, devices: r.devices.filter(notable) })).filter((r) => r.devices.length) : rooms;
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
      return html`<p><b>${r.name}.</b> ${parts.map((part, i) => html`${i ? voice.join : ""}${part}`)}${voice.end}</p>`;
    };
    const board = html`<h3>${voice.titles.board}</h3>
      ${byFloor(rooms, (r) => html`<div class="row"><span>${r.name}</span>${r.devices.map((d) =>
        html`<button class="chip ${d.on ? "on" : ""} ${d.away ? "away" : ""}" aria-pressed=${d.on} @click=${() => this._press(d)}>${d.name}</button>`)}</div>`,
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
          <div class="copy">
            ${lead.body ? html`<p>${lead.body}</p>` : nothing}
            ${byFloor(reported, report)}
            ${rooms.length > reported.length ? html`<p>${fill(voice.rest, counted(rooms.length - reported.length))}</p>` : nothing}
            ${rooms.length ? nothing : html`<p>No areas with lights, switches, covers or locks were found. Give your devices areas in Home Assistant's settings and this page fills itself in.</p>`}
          </div>
        </article>
        ${rest.length
          ? html`<section>
              <h3>${voice.titles.more}</h3>
              ${rest.slice(0, 3).map((t) => html`<div class="item"><p class="kicker">${t.kicker}</p><h4>${t.head}</h4><p>${t.deck}</p>${act(t)}</div>`)}
              ${rest.length > 3 ? html`<h3>${voice.titles.briefs}</h3><ul>${rest.slice(3).map((t) => html`<li><b>${t.head}.</b> ${t.deck}</li>`)}</ul>` : nothing}
            </section>`
          : nothing}
        <aside>
          <h3>${voice.titles.late}</h3>
          <ol>${this._late.length
            ? this._late.map((l) => html`<li><time>${clock(l.time)}</time>${l.alert ? wired(voice, l.alert) : `${l.device!.room}: ${words(voice, l.device!)}`}</li>`)
            : html`<li>${voice.nothing}</li>`}</ol>
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
    </div>`;
  }
}
