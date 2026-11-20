// Aurora's cameras: a camera's picture with what it says under it, and on a room's sheet
// what Casa Mia's Cameras page set up for it (house.ts `Lens`): where it can be turned
// to, its zoom, and what belongs with what it sees. aurora.ts says where they go.
import { html, nothing } from "lit";
import type { Control, Device, House, Preset, Sighting } from "../house.ts";
import { clock } from "../stories.ts";

/** A camera's picture as it is shown: its address ("" if there is none to show) and what is said of it. */
export type Shot = { d: Device; src: string; says: string; at: number };
/** What the page does for a picture: look at its camera live, and note that a picture came or did not. */
export type Looks = { look(d: Device): void; came(src: string): void; failed(src: string): void };
/** What the page does for a camera's own controls on a sheet. */
export type Works = { turn(d: Device, to: Preset): void; zoom(d: Device, level: number): void; press(d: Device, c: Control): void; device(d: Device): unknown };

export const cameras = (house: House): Device[] => house.rooms.flatMap((r) => r.devices).filter((d) => d.kind === "camera");

/** A camera's picture: what it saw lately if that was photographed, else its latest still.
 * A still is no live picture, so it says when this page was given it (`came`, by its
 * address); one that could not be fetched says so, and a camera that is away shows none. */
export function shot(d: Device, seen: Map<string, Sighting>, came: Map<string, number>, failed: Set<string>): Shot {
  const saw = seen.get(d.id);
  const src = saw?.photo ?? (d.away ? "" : (d.picture ?? ""));
  if (d.away) return { d, src: "", says: "not answering", at: 0 };
  if (!src) return { d, src, says: saw ? `${saw.kind} ${clock(saw.at)}` : "no picture", at: saw?.at ?? 0 };
  if (failed.has(src)) return { d, src: "", says: "its picture could not be fetched", at: saw?.at ?? 0 };
  return { d, src, says: saw ? `${saw.kind} ${clock(saw.at)}` : came.has(src) ? `as at ${clock(came.get(src)!)}` : "", at: saw?.at ?? 0 };
}

/** The picture itself, for wherever it goes. */
export const still = (s: Shot, on: Looks, how = "") =>
  s.src ? html`<img class=${how} src=${s.src} alt="" loading="lazy" @load=${() => on.came(s.src)} @error=${() => on.failed(s.src)} />` : nothing;

/** A camera's picture with its name and what it says: a press shows the camera live. */
export const frame = (s: Shot, on: Looks) =>
  html`<button class="shot" aria-label="${s.d.name}${s.says ? `: ${s.says}` : ""}. See it live" ?disabled=${s.d.away} @click=${() => on.look(s.d)}>
    ${still(s, on)}<span><b>${s.d.name}</b>${s.says}</span>
  </button>`;

/** What Casa Mia set up for a camera, under its picture on a sheet. Nothing for a camera it does not list. */
export function extras(d: Device, on: Works) {
  const zoom = d.zoom;
  return html`${d.presets?.length
      ? html`<nav class="scenes" aria-label="${d.name}: where it can be turned to">${d.presets.map((p) => html`<button @click=${() => on.turn(d, p)}>${p.name}</button>`)}</nav>`
      : nothing}
    ${zoom
      ? html`<label class="zoomer">Zoom<input type="range" min=${zoom.span.min} max=${zoom.span.max} step=${zoom.span.step} .value=${String(zoom.level)}
            @change=${(e: Event) => on.zoom(d, Number((e.target as HTMLInputElement).value))} /></label>`
      : nothing}
    ${d.controls?.length
      ? html`<div class="controls">${d.controls.map((c) =>
          c.device ? on.device(c.device) : html`<button class="key ${c.away ? "away" : ""}" ?disabled=${c.away} @click=${() => on.press(d, c)}><b></b><span>${c.name}<em>${c.away ? "not answering" : "press"}</em></span></button>`,
        )}</div>`
      : nothing}`;
}
