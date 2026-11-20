// Aurora's controls: what a press, a drag or a step does to a device, and the fader, the
// steps and the key it is drawn as. A level stays where it was put until its device says
// it is there; a lock, a door, a valve or a siren takes two presses. aurora.ts is built
// on this, and says where the controls go.
import { html, nothing, type PropertyDeclarations } from "lit";
import { fire } from "../../ha.ts";
import { Family } from "../family.ts";
import { AGAIN, STANDS } from "../fridge.ts";
import { picture } from "../fridge/magnets.ts";
import { DEGREES, type Device, type Scene } from "../house.ts";
import { flip } from "../stories.ts";

// How the kinds the Fridge has no words for are said to stand: when on, and when off.
const SAID: Record<string, [string, string]> = { ...STANDS, alarm_control_panel: ["set", "unset"], camera: ["look", "look"] };
// These open Home Assistant's own dialog: a picture to look at, and a code to type.
const THEIRS = new Set(["camera", "alarm_control_panel"]);
const ARMED = 6000; // ms: how long a first press to unlock or open waits for its second
const WANTED = 5000; // ms: how long a level stays where it was put, waiting for its device to say it is there
const THROWN = 1500; // ms: how long a scene's button shows that it was pressed

export class Controls extends Family {
  static properties: PropertyDeclarations = { _open: { state: true }, _want: { state: true }, _armed: { state: true }, _dragging: { state: true }, _thrown: { state: true } };
  _open = ""; // the room whose sheet is open
  _want?: { id: string; level: number }; // where a level was put, until its device says it is there
  _armed = ""; // the guarded device whose key has had its first press
  _dragging = ""; // the device whose fader a finger is on
  _thrown = ""; // the scene that was just pressed
  protected _dropping?: ReturnType<typeof setTimeout>;
  protected _waiting?: ReturnType<typeof setTimeout>;

  protected _moved(d: Device) {
    // Not while a finger is on its fader: the device answers each level asked for on the
    // way, and the fader would jump back to it under the finger.
    if (this._want?.id === d.id && this._dragging !== d.id) this._want = undefined;
    if (this._armed === d.id) this._armed = "";
  }

  /** Where a device's level stands, in its own units: where it was just put, else where the device says. */
  protected _level(d: Device) {
    return this._want?.id === d.id ? this._want.level : (d.level ?? (d.on ? d.span.max : d.span.min));
  }

  /** Put a device's level somewhere on its scale. It stays there on the page, and the
   * device is asked for it; if the device has not answered in a few seconds, the page
   * goes back to where the device really is. */
  protected _set(d: Device, level: number) {
    const { min, max, step } = d.span;
    const to = Number(Math.min(max, Math.max(min, Math.round(level / step) * step)).toFixed(2));
    this._want = { id: d.id, level: to };
    this._waiting = this._instead(this._waiting, WANTED, () => this._dragging || (this._want = undefined));
    this._ask(d, to);
  }

  /** A finger on a fader, or moving on it: the level is where the finger is. */
  protected _drag(d: Device, event: PointerEvent) {
    const fader = event.currentTarget as HTMLElement;
    if (event.type === "pointerdown") {
      fader.setPointerCapture(event.pointerId);
      this._dragging = d.id;
    } else if (this._dragging !== d.id) return;

    const box = fader.getBoundingClientRect();
    this._set(d, d.span.min + ((box.bottom - event.clientY) / box.height) * (d.span.max - d.span.min));
  }

  protected _drop() {
    this._dragging = "";
    this._waiting = this._instead(this._waiting, WANTED, () => (this._want = undefined));
  }

  /** A press on a device's dot or key: it is put the other way. A lock, a garage door, a
   * valve or a siren takes two presses to unlock, open or sound, and a camera or an alarm
   * opens Home Assistant's dialog, which is not shown over a sheet: the sheet is shut first. */
  protected _press(d: Device) {
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

  protected _throw(scene: Scene) {
    this._call({ domain: "scene", service: "turn_on", ids: [scene.id] }, scene.full);
    this._thrown = scene.id;
    this._after(THROWN, () => this._thrown === scene.id && (this._thrown = ""));
  }

  /** A scene's button. `name` is what it is called where it is shown. */
  protected _scene(s: Scene, name: string) {
    return html`<button class=${this._thrown === s.id ? "thrown" : ""} @click=${() => this._throw(s)}>${name}</button>`;
  }

  protected _stands(d: Device) {
    if (d.away) return "not answering";
    if (d.dims && d.on && d.kind !== "media_player") return DEGREES.has(d.kind) ? `${this._level(d)}°` : `${Math.round(this._level(d))}%`;
    return d.phase ?? SAID[d.kind]?.[d.on ? 0 : 1] ?? (d.on ? "on" : "off");
  }

  protected _pic(d: Device) {
    return html`<svg class="pic" viewBox="0 0 24 24" aria-hidden="true">${picture(d.kind, d.kind === "lock" && !d.on)}</svg>`;
  }

  /** One device on a room's sheet: a fader for a level, steps for a temperature, and a key for the rest. */
  protected _control(d: Device) {
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
}
