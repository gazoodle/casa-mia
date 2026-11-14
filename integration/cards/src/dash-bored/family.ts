// What every Dash-Bored family's element is built on: the house as Home Assistant has it
// now, the house's settings from the integration, and the calls that change a device.
// A family (the Gazette, Bakelite) extends this and draws the house its own way. It is a
// page when the shell shows it (shell.ts) and a dashboard card when a dashboard does.
import { LitElement, type PropertyDeclarations } from "lit";
import type { Hass } from "../ha.ts";
import { read, survey, type Device, type House, type Options, type Survey } from "./house.ts";
import { setting, type Press } from "./stories.ts";

const SETTINGS = "casa_mia_dash_bored/settings"; // the integration's feed of the house's settings (settings.py)
const SETTLE = 350; // ms: a level is asked for once it has been still this long

export class Family extends LitElement {
  static properties: PropertyDeclarations = { narrow: { type: Boolean }, _house: { state: true }, _fault: { state: true }, _lost: { state: true } };
  narrow = false;
  _house?: House;
  _fault = ""; // an action Home Assistant refused, or a feed that failed, in words
  _lost = 0; // ms: since when there has been no connection (0: connected)
  protected _hass?: Hass;
  protected _config: Options & { type?: string } = {};
  protected _settings: Options = {}; // the house's, from the integration: a card's own come before them
  protected _survey?: Survey;
  protected _feeds = new Map<string, Promise<() => void>>(); // by the feed's command
  protected _timers = new Set<ReturnType<typeof setTimeout>>();
  protected _asking?: ReturnType<typeof setTimeout>; // the level waiting to be asked for: see _ask

  static getStubConfig() {
    return {};
  }

  setConfig(config: Options & { type?: string }) {
    this._config = { ...config };
    this._survey = undefined;
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

    if (!this._survey || !was || was.entities !== hass.entities || was.areas !== hass.areas || was.devices !== hass.devices || was.floors !== hass.floors) this._survey = survey(hass, { ...this._settings, ...this._config });
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
    if (this._hass?.connected !== false) this._listen();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const feed of this._feeds.values()) feed.then((stop) => stop()).catch(() => undefined);
    this._feeds.clear();
    for (const timer of this._timers) clearTimeout(timer);
    this._timers.clear();
  }

  /** Follow one of the integration's feeds, once. Home Assistant's connection subscribes
   * again by itself after a break, and each feed then says all it holds again. */
  protected _follow<T>(type: string, what: string, take: (items: T[]) => void) {
    const connection = this._hass?.connection;
    if (!connection || !this.isConnected || this._feeds.has(type)) return;
    const feed: Promise<() => void> = connection.subscribeMessage(take, { type });
    this._feeds.set(type, feed);
    feed.catch((err: any) => {
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
  }

  protected _call(press: Press, what: string) {
    this._hass!.callService(press.domain, press.service, { entity_id: press.ids, ...press.data }).then(
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
  protected _ask(d: Device, level: number) {
    clearTimeout(this._asking);
    this._timers.delete(this._asking!);
    this._asking = setTimeout(() => {
      this._timers.delete(this._asking!);
      this._call(setting(d, level), `${d.room} ${d.name}`);
    }, SETTLE);
    this._timers.add(this._asking);
  }
}
