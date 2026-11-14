// The Gazette's page, its lowest layer above what every family shares (family.ts): what
// the paper holds beside the house, and how that reaches it. The integration's feeds and
// the forecast are followed here. acts.ts does what is pressed, and gazette.ts draws it.
import type { Open, Shot } from "../clipping.ts";
import { Family } from "../family.ts";
import { days, sighted, type Day, type Device, type Options, type Seen, type Sighting } from "../house.ts";
import { NOMINAL, RECOVERED, flavourOf, type Alert, type Played, type Rated } from "../stories.ts";
import { STYLES } from "../styles.ts";
import { VOICES } from "../voices.ts";

const ALERTS = "casa_mia_dash_bored/alerts"; // the integration's feeds: Sensor Watch's alerts (alerts.py)
const SIGHTINGS = "casa_mia_dash_bored/sightings"; // what the cameras have seen (sightings.py)
const PERSONAL = "casa_mia_dash_bored/personal"; // the songs people have rated (personal.py)
const PLAYING = "casa_mia_dash_bored/playing"; // what the players have played (playing.py)
const FORECAST = "weather/subscribe_forecast"; // Home Assistant's own: a weather entity's forecast, pushed
export const ARCHIVE = 30 * 60_000; // ms: how far back the column of past sightings goes
export const PAST = 10; // and how many of them it lists
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
export type Config = Options & { type?: string; style?: string };
export type Line = { time: number; device?: Device; alert?: Alert; seen?: Sighting };

export class Page extends Family {
  static styles = STYLES;
  static properties = { _style: { state: true }, _alerts: { state: true }, _seen: { state: true }, _scale: { state: true }, _open: { state: true }, _shot: { state: true }, _rated: { state: true }, _played: { state: true }, _days: { state: true } };
  // The one scale that is open: for which device, and the level asked for that the
  // device has not yet said it has come to. It is under the device's sentence, or in
  // its clipping when that is open.
  _scale?: { id: string; want?: number };
  _open?: Open; // the clipping that is open: see clipping.ts
  _shot?: Shot; // or the photograph that is
  _played: Played[] = []; // the feed's songs and programmes
  _days: Day[] = []; // the forecast, by the day
  protected _forecastOf?: string; // the weather entity whose forecast is followed
  _style = "broadsheet";
  _alerts: Alert[] = [];
  _seen: Seen[] = []; // the feed's sightings of the last half hour
  _rated: Rated[] = []; // the feed's rated songs
  declare protected _config: Config;
  protected _late: Line[] = [];
  protected _turn = new Map<string, number>();
  protected _showing = new Set<string>();
  protected _primed = false;
  protected _seenPrimed = false;

  setConfig(config: Config) {
    super.setConfig(config);
    this._choose();
  }

  protected _surveyed() {
    this._outlook();
  }

  protected _moved(d: Device) {
    this._note({ time: Date.now(), device: d });
    // The device has moved: what was asked of it is answered, and the scale shows where it is.
    if (this._scale?.id === d.id) this._scale = { ...this._scale, want: undefined };
    // Its clipping's record goes on, and a press that was waiting for its second is forgotten.
    if (this._open?.id === d.id) this._open = { ...this._open, armed: false, record: this._open.record && [...this._open.record, { at: Date.now(), on: d.on, phase: d.phase, level: d.level, away: d.away }] };
  }

  connectedCallback() {
    super.connectedCallback();
    masthead();
    this._choose();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._primed = this._seenPrimed = false;
    this._forecastOf = undefined;
  }

  /** Which paper: the card's own, else the one this browser last chose. */
  protected _choose() {
    let style = this._config.style;
    try {
      style ??= localStorage.getItem(REMEMBERED) ?? undefined;
    } catch {
      // No storage here (a private window): the broadsheet, then.
    }
    if (style && style in VOICES) this._style = style;
  }

  protected _dress(style: string) {
    this._style = style;
    try {
      localStorage.setItem(REMEMBERED, style);
    } catch {
      // Not remembered, that is all.
    }
  }

  /** The paper's own feeds: Sensor Watch's alerts, the cameras' sightings, and the columns'. */
  protected _listen() {
    super._listen();
    this._follow(ALERTS, "Sensor Watch's alerts", (alerts: Alert[]) => this._take(alerts));
    this._follow(SIGHTINGS, "The cameras' sightings", (seen: Seen[]) => this._sight(seen));
    // A feed says all it holds again after a break, so each item is kept once.
    const once = <T>(items: T[], key: (item: T) => string) => [...new Map(items.map((item) => [key(item), item])).values()];
    this._follow(PERSONAL, "The Personal column's announcements", (rated: Rated[]) => (this._rated = once([...this._rated, ...rated], (r) => `${r.at} ${r.name} ${r.title}`)));
    this._follow(PLAYING, "What the players have played", (played: Played[]) => (this._played = once([...this._played, ...played], (p) => p.id)));
  }

  /** Follow the forecast of the weather entity the page reads, if it gives one by the day.
   * Home Assistant pushes it, at subscribing and whenever it changes. */
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

  /** Sightings from the feed: all it holds at first, then each as it comes, and again
   * (under the same id) when its kind or its photograph changes. */
  protected _sight(items: Seen[]) {
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

  protected _take(alerts: Alert[]) {
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
  protected _later(ms: number) {
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      this.requestUpdate();
    }, ms + 1000);
    this._timers.add(timer);
  }

  protected _note(line: Line) {
    this._late = [line, ...this._late].slice(0, 8);
  }
}
