// What every Dash-Bored family's element is built on: the house as Home Assistant has it
// now, the house's settings from the integration, and the calls that change a device.
// A family (the Gazette, Bakelite) extends this and draws the house its own way. It is a
// page when the shell shows it (shell.ts) and a dashboard card when a dashboard does.
import { LitElement, css, type PropertyDeclarations } from "lit";
import type { Hass } from "../ha.ts";
import { days, read, sighted, survey, type Day, type Device, type House, type Lens, type Options, type Seen, type Sighting, type Survey } from "./house.ts";
import { setting, type Press } from "./stories.ts";

// The integration's feed of Sensor Watch's alerts (alerts.py). A family follows it as it
// likes: each shows trouble in its own way.
export const ALERTS = "casa_mia_dash_bored/alerts";
export const SIGHTINGS = "casa_mia_dash_bored/sightings"; // and of what the cameras have seen (sightings.py)
const SETTINGS = "casa_mia_dash_bored/settings"; // the integration's feed of the house's settings (settings.py)
// Casa Mia's own integration, where the house has it, and its feed of the app's cameras.
// Dash-Bored stands alone: it knows these two names of Casa Mia's and nothing else.
const CASA_MIA = "casa_mia";
const CAMERAS = "casa_mia/cameras/subscribe";
const FORECAST = "weather/subscribe_forecast"; // Home Assistant's own: a weather entity's forecast, pushed
const RECENT = 30 * 60_000; // ms: how long what a camera saw stays with its camera
const SETTLE = 350; // ms: a level is asked for once it has been still this long

/** What every family's element is on the page: a block, and as Dash-Bored's page at least a
 * screen tall, so that it is the page itself that scrolls. A family that made itself one
 * screen tall and scrolled inside that box stuttered on an iPad, where Safari stopped for
 * over a second at a time to paint it (measured with the owner, 2026-11-16). */
export const PAGE = css`
  :host { display: block; }
  :host([panel]) > :first-child { min-height: 100vh; }
  /* In the card picker (picked below) a window on the top of the specimen: in its narrow
     column even one room of a family is about 1,000 px tall. */
  :host([sample]) { max-height: 400px; overflow: hidden; }
`;

/** Whether Home Assistant's card picker is showing this element: it is then a specimen of
 * the card, among every other card there is, and draws a sample of the house and follows
 * no feed. The picker tells a card nothing, so this goes by the element it is put in
 * (found 2026-11-16, Home Assistant 2026.11). Should that be renamed, the card is drawn
 * whole there, as it was before. */
export const picked = (el: Element) => ((el.getRootNode() as ShadowRoot).host as Element | undefined)?.localName === "hui-card-picker";

const typefaces = new Set<string>();
/** Give the document a typeface the integration serves beside this file (www/fonts),
 * once. A shadow root can't declare a font, so the document is given it. Without it the
 * text is set in the next face its style names: said in the console, not hidden. */
export function typeface(name: string, file: string) {
  if (typefaces.has(name)) return;
  typefaces.add(name);
  const face = new FontFace(name, `url(/casa_mia_dash_bored/fonts/${file})`);
  document.fonts.add(face);
  face.load().catch((err) => console.error(`Dash-Bored: the typeface ${name} could not be loaded`, err));
}

export class Family extends LitElement {
  static properties: PropertyDeclarations = { narrow: { type: Boolean }, _house: { state: true }, _days: { state: true }, _fault: { state: true }, _lost: { state: true } };
  narrow = false;
  _house?: House;
  _days: Day[] = []; // the forecast, by the day, for a family that follows it (_outlook)
  _fault = ""; // an action Home Assistant refused, or a feed that failed, in words
  _lost = 0; // ms: since when there has been no connection (0: connected)
  protected _hass?: Hass;
  protected _config: Options & { type?: string } = {};
  protected _settings: Options = {}; // the house's, from the integration: a card's own come before them
  protected _cameras: Lens[] = []; // Casa Mia's cameras, where it is installed: they come before the ones found
  protected _survey?: Survey;
  protected _forecastOf?: string; // the weather entity whose forecast is followed
  protected _spotted: Seen[] = []; // what the cameras have seen lately, for a family that watches (_watch)
  protected _feeds = new Map<string, Promise<() => void>>(); // by the feed's command
  protected _timers = new Set<ReturnType<typeof setTimeout>>();
  protected _asking?: ReturnType<typeof setTimeout>; // the level waiting to be asked for: see _ask
  private _picked = false; // in Home Assistant's card picker: see `picked`
  private _sizes?: ResizeObserver; // watches the element's width while it is on the page

  static getStubConfig() {
    return {};
  }

  setConfig(config: Options & { type?: string }) {
    this._config = { ...config };
    this._survey = undefined;
    // An editor changes the options as they are typed: the house is read again by them now.
    if (this._hass) this.hass = this._hass;
  }

  /** The options as a property: the Console gives them in its template (console/host.ts). */
  set config(config: Options & { type?: string }) {
    this.setConfig(config);
  }

  /** Whether this is a specimen in the card picker: by where it is, or told so by the
   * Console that holds it (console/host.ts). */
  protected get _sample() {
    return this._picked || !!this._config.sample;
  }

  /** Whether this element shows the house at all: one that shows only a feed reads none of it. */
  protected get _reads() {
    return true;
  }

  getCardSize() {
    return 12;
  }

  getGridOptions() {
    return { columns: "full" };
  }

  /** Set when the element is Dash-Bored's page, not a card. */
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
    if (!this._reads) {
      if (!was) this.requestUpdate();
      return;
    }

    if (!this._survey || !was || was.entities !== hass.entities || was.areas !== hass.areas || was.devices !== hass.devices || was.floors !== hass.floors) this._survey = survey(hass, { ...this._settings, ...this._config, cameras: this._cameras, sample: this._sample });
    // ponytail: `hass` is set at every state change in the house, and the page isn't told
    // which entity changed, so this looks at each watched one. If that ever shows in a
    // profile, follow the entities with a subscription of our own instead.
    else if (was.states === hass.states || !this._survey.watched.some((id) => was.states[id] !== hass.states[id])) return;

    const before = new Map(this._house?.rooms.flatMap((r) => r.devices).map((d) => [d.id, d]));
    this._house = read(this._survey, hass);
    this._surveyed();
    for (const d of this._house.rooms.flatMap((r) => r.devices)) {
      const old = before.get(d.id);
      if (old && (old.on !== d.on || old.phase !== d.phase || old.level !== d.level || old.away !== d.away)) this._moved(d);
    }
  }

  /** The house has been read again: for a family that follows something by what it holds. */
  protected _surveyed() {}

  /** A device is on or off, at a level or answering, where it was not before. */
  protected _moved(_d: Device) {}

  connectedCallback() {
    super.connectedCallback();
    // The picker gives a card its house before it puts it on the page: read it again, cut down.
    if (picked(this) !== this._picked) {
      this._picked = !this._picked;
      this.toggleAttribute("sample", this._picked);
      this._survey = undefined;
      if (this._hass) this.hass = this._hass;
    }
    if (this._hass?.connected !== false) this._listen();
    // The element's width, for a family that lays its rooms out by it: now, and whenever it changes.
    this._resized(this.clientWidth || window.innerWidth);
    this._sizes = new ResizeObserver(([box]) => this._resized(box.contentRect.width));
    this._sizes.observe(this);
  }

  /** The element is `px` wide: for a family that chooses its rooms' rows by its width (pack.ts). */
  protected _resized(_px: number) {}

  disconnectedCallback() {
    super.disconnectedCallback();
    this._sizes?.disconnect();
    for (const feed of this._feeds.values()) feed.then((stop) => stop()).catch(() => undefined);
    this._feeds.clear();
    this._forecastOf = undefined;
    for (const timer of this._timers) clearTimeout(timer);
    this._timers.clear();
  }

  /** Follow one of the integration's feeds, once. Home Assistant's connection subscribes
   * again by itself after a break, and each feed then says all it holds again. */
  protected _follow<T>(type: string, what: string, take: (items: T[]) => void, newer = false) {
    const connection = this._hass?.connection;
    if (!connection || !this.isConnected || this._feeds.has(type) || this._sample) return;
    const feed: Promise<() => void> = connection.subscribeMessage(take, { type });
    this._feeds.set(type, feed);
    feed.catch((err: any) => {
      // Another integration's feed that its installed version does not have yet (`newer`)
      // is no fault of this page's: it is said once in the console, and not asked for again.
      if (newer && err?.code === "unknown_command") {
        this._feeds.set(type, Promise.resolve(() => undefined));
        console.info(`Dash-Bored: ${what} are not fed by the version installed (${type})`);
        return;
      }
      this._feeds.delete(type);
      console.error(`Dash-Bored: the feed ${type} failed`, err);
      this._fault = `${what} are not reaching this page (${err?.message ?? err}).`;
    });
  }

  /** The feeds this element follows. A family adds its own to the house's settings. */
  protected _listen() {
    // The settings come whole each time they are saved: the latest stands, and the house is read again by it.
    this._follow(SETTINGS, "Dash-Bored's settings", (settings: Options[]) => {
      this._settings = settings.at(-1) ?? this._settings;
      this._survey = undefined;
      if (this._hass) this.hass = this._hass;
    });
    // Casa Mia's cameras, whole at each change: the house is read again by them. With no
    // Casa Mia the cameras are the ones Home Assistant has, as before.
    if (this._hass?.config?.components?.includes(CASA_MIA))
      this._follow(CAMERAS, "Casa Mia's cameras", (cameras: Lens[]) => {
        this._cameras = cameras;
        this._survey = undefined;
        if (this._hass) this.hass = this._hass;
      }, true);
  }

  /** Follow the forecast of the weather entity the page reads, if it gives one by the day:
   * for a family to call from its `_surveyed`. Home Assistant pushes it, at subscribing
   * and whenever it changes. */
  protected _outlook() {
    const connection = this._hass?.connection;
    const outside = this._house?.outside;
    const entity = outside?.daily ? outside.id : undefined;
    if (!connection || !this.isConnected || entity === this._forecastOf) return;

    // Another entity, or none: the old forecast is no longer this page's.
    this._feeds.get(FORECAST)?.then((stop) => stop()).catch(() => undefined);
    this._feeds.delete(FORECAST);
    this._forecastOf = entity;
    this._days = [];
    if (!entity) return;
    const feed: Promise<() => void> = connection.subscribeMessage((told: { forecast?: unknown }) => (this._days = days(told.forecast)), { type: FORECAST, forecast_type: "daily", entity_id: entity });
    this._feeds.set(FORECAST, feed);
    feed.catch((err: any) => {
      this._feeds.delete(FORECAST);
      console.error(`Dash-Bored: the forecast of ${entity} failed`, err);
      this._fault = `The weather forecast is not reaching this page (${err?.message ?? err}).`;
    });
  }

  /** Follow what the cameras have seen: for a family to call from its `_listen`. The
   * Console and the Fridge each have this written out of their own, from before it was here. */
  protected _watch() {
    this._follow(SIGHTINGS, "The cameras' sightings", (seen: Seen[]) => {
      const held = new Map(this._spotted.map((s) => [s.id, s]));
      const now = Date.now();
      for (const s of seen) {
        held.set(s.id, s);
        // A date coming due, not a poll: what a camera saw leaves the page when its time is up.
        this._after(RECENT - (now - s.at * 1000) + 1000, () => this.requestUpdate());
      }
      this._spotted = [...held.values()].filter((s) => now - s.at * 1000 < RECENT);
      this.requestUpdate();
    });
  }

  /** The latest thing each camera saw that is still recent, by the camera's id. */
  protected _sighted(now = Date.now()) {
    const seen = new Map<string, Sighting>();
    for (const s of this._survey ? sighted(this._survey, this._spotted) : []) if (now - s.at < RECENT && s.at >= (seen.get(s.camera)?.at ?? 0)) seen.set(s.camera, s);
    return seen;
  }

  /** Do something once `ms` have passed, unless the element has gone by then. */
  protected _after(ms: number, then: () => void) {
    if (ms <= 0) return undefined;
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      then();
    }, ms);
    this._timers.add(timer);
    return timer;
  }

  /** The same, in place of an earlier wait of the same kind. */
  protected _instead(was: ReturnType<typeof setTimeout> | undefined, ms: number, then: () => void) {
    clearTimeout(was);
    this._timers.delete(was!);
    return this._after(ms, then);
  }

  protected _call(press: Press, what: string) {
    // A call that names no entity (a camera's preset names its camera in its own data) is sent none.
    this._hass!.callService(press.domain, press.service, { ...(press.ids.length ? { entity_id: press.ids } : {}), ...press.data }).then(
      () => (this._fault = ""),
      (err: any) => {
        console.error(`Dash-Bored: ${press.domain}.${press.service} refused`, err);
        this._fault = `${what}: Home Assistant refused (${err?.message ?? err}).`;
      },
    );
  }

  /** Ask a device for a level, once the level has stopped changing: a drag asks when the
   * handle is let go, but an arrow key held down reports a change at every step, and a
   * bus of real dimmers would be sent them all. */
  protected _ask(d: Device, level: number, press: (d: Device, level: number) => Press = setting) {
    clearTimeout(this._asking);
    this._timers.delete(this._asking!);
    this._asking = setTimeout(() => {
      this._timers.delete(this._asking!);
      this._call(press(d, level), `${d.room} ${d.name}`);
    }, SETTLE);
    this._timers.add(this._asking);
  }
}
