// What is pressed on the Gazette's page: a device switched or set, a clipping opened and
// folded away. The layer between the page's data (page.ts) and its drawing (gazette.ts).
import { fire } from "../../ha.ts";
import type { Open, Shot } from "../clipping.ts";
import type { Device } from "../house.ts";
import { recorded } from "../record.ts";
import { flip } from "../stories.ts";
import { Page } from "./page.ts";

const ARMED = 6000; // ms: how long a first press to unlock or open waits for its second
// The heating, the hot water, the music, a robot and an alarm are not switched by a press
// on a sentence or a chip: that opens the clipping, as it does for a lock.
const OPENS = new Set(["climate", "media_player", "camera", "water_heater", "vacuum", "lawn_mower", "alarm_control_panel"]);

export class Acts extends Page {
  protected _press(d: Device) {
    // A lock or a garage door is never moved from a sentence, and a device that isn't
    // answering can't be: its clipping, where unlocking or opening takes two presses.
    if (d.guarded || d.away || OPENS.has(d.kind)) this._story(d);
    else this._call(flip(d), `${d.room} ${d.name}`);
  }

  /** Open a device's clipping, and ask Home Assistant for its record. */
  protected _story(d: Device) {
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

  protected _shut() {
    this._open = this._scale = this._shot = undefined;
  }

  /** Home Assistant's own dialog for an entity. It would open beneath a modal one, so the
   * clipping is folded away first. */
  protected _live(entityId: string) {
    this._shut();
    fire(this, "hass-more-info", { entityId });
  }

  /** Open a photograph as a clipping, in place of whichever clipping was open. */
  protected _look(shot: Shot) {
    this._shut();
    this._shot = shot;
  }

  /** The clipping's button. To unlock a lock, or open a garage door or a gate, it must
   * be pressed twice: the first press arms it, for a few seconds. */
  protected _flip(d: Device) {
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

  /** Open the scale for a device, or close it if it is the one that is open. */
  protected _measure(d: Device) {
    this._scale = this._scale?.id === d.id ? undefined : { id: d.id };
  }

  protected _key(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).click();
  }
}
