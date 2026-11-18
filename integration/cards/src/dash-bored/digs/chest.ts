// A room's list in Digs: everything in the room, each block with its name and how it
// stands, and the room's own scenes. A chandelier or a chest in the room opens it: it is
// where a room with too many lights for a lamp each has them all, and where a device's
// name can be read without pressing it. How a device is said to stand is here too.
import { html, nothing, type TemplateResult } from "lit";
import { STANDS } from "../fridge.ts";
import { DEGREES, type Device, type Room, type Scene } from "../house.ts";
import { say } from "./textures.ts";

export const ALARM = "alarm_control_panel";
/** A level in a device's own units, as it is said. */
export const shown = (d: Device, level: number) => (DEGREES.has(d.kind) ? `${level}°` : `${Math.round(level)}%`);

/** How a device stands, in words: for the tip, a room's list, and those who can't see the blocks. */
export function said(d: Device) {
  if (d.away) return "not answering";
  if (d.kind === "camera") return "camera"; // it is neither on nor off
  const stands = d.phase ?? STANDS[d.kind]?.[d.on ? 0 : 1] ?? (d.kind === ALARM ? (d.on ? "set" : "unset") : d.on ? "on" : "off");
  const level = d.on && d.level !== undefined ? ` ${shown(d, d.level)}` : "";
  const also = d.title ?? (d.temp !== undefined ? `now ${d.temp}°` : "");
  return `${stands}${level}${also ? `, ${also}` : ""}`;
}

/** What the list is given: how a device's block is drawn, and what throwing a scene and shutting the list do. */
export type Chest = { block: (d: Device) => TemplateResult; throw: (s: Scene) => void; shut: () => void };

export const chest = (room: Room, does: Chest) => html`<div class="chest" @click=${(e: Event) => e.target === e.currentTarget && does.shut()}>
  <div class="inv" role="dialog" aria-label="${room.name}: everything in it">
    <div class="head">${say(room.name)}<button class="box" aria-label="Shut" @click=${does.shut}>${say("x")}</button></div>
    ${room.scenes.length ? html`<div class="scenes">${room.scenes.map((s) => html`<button class="box" aria-label="Scene: ${s.full}" @click=${() => does.throw(s)}>${say(s.name)}</button>`)}</div>` : nothing}
    <div class="cells">${room.devices.map((d) => html`<div class="cell">${does.block(d)}<span>${say(d.name)}${say(said(d))}</span></div>`)}</div>
  </div>
</div>`;
