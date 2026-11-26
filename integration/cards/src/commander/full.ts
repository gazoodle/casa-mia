// The Camera Commander card's controls bar, on its full screen (Tap on the main camera:
// Full screen) and over its main area (Config.main_controls): the camera's controls
// along the edge set for the place's shape on the Cameras page, its PTZ presets, its zoom,
// and the card's own buttons (Sound, Full screen). A
// tap on a control is Home Assistant's own toggle, as on the camera dashboard's tiles
// (auto_dashboards/dashboard.py: control_tile), so a lock, a cover or a button does
// what it does there. A tap on a preset is the camera's PTZ action with that preset, as
// the app built it (cameras.py: preset_calls).
import { css, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { barFit, controlsAt, controlsStyle, zoomOf, zoomPct, zoomStep } from "../../../../app/web/src/cameras/controls.ts";
import type { Card, Preset } from "./common.ts";

/** States a control can't be used in: shown dimmed and said, never a dead button. */
const OUT = new Set(["unavailable", "unknown"]);

/** How long "why a preset or a zoom didn't go" stays with the controls. */
export const PTZ_NOTE_MS = 10_000;
/** How long a zoom level asked for is shown as on its way: a lens takes a second or two,
 * and a lease, so a camera that never gets there doesn't say "→ 60%" for ever. */
export const ZOOM_PENDING_MS = 6_000;

/** One of the card's own buttons, where it offers them (Config.sound_button,
 * screen_button): what it says and shows in its state now, and its tap. */
export type Own = { on: boolean; icon: string; label: string; title: string; toggle: () => void };

/** The lines a bar can open out on the picture's side of it: the PTZ presets (where they
 * are behind the PTZ button) and the zoom's stepper. One at a time. */
export type Line = "ptz" | "zoom";

/** The card's side of a camera's presets and zoom: the line opened out ("" for none), a
 * tap on the PTZ or the Zoom button (`show`: opens its line, or puts it away), a preset's
 * tap, a zoom level to go to, the level asked for and not yet reached (null: none), and
 * why the last preset or zoom didn't go ("" when it did, or after PTZ_NOTE_MS). */
export type Lines = {
  open: Line | "";
  show: (line: Line) => void;
  go: (preset: Preset) => void;
  zoom: (entity: string, value: number) => void;
  zoomTo: number | null;
  failed: string;
};

/** The camera's controls and presets (after the card's own buttons) along their edge of
 * `place`: the full screen, or the main area (Config.main_controls), `size` px. The wide
 * or the tall edge goes by the shape of that place, not the screen's: a main area can be
 * wide on an upright tablet. The pills' height is the camera's size where there is room and
 * less in a small place, down to a floor (controls.ts: pillHeight), and what then doesn't
 * fit gives way (controls.ts: barFit): the presets go behind one PTZ button,
 * which opens them out as a second line on the picture's side of the bar (under a bar at
 * the top, left of one on the right), then the names go and the pills are icons. A camera
 * with a zoom always has one Zoom button (owner, 2026-11-27), which opens its stepper the
 * same way: out, the level, in, and Reset (all the way out). */
export function controlsBar(el: HTMLElement, hass: Hass, camera: Card["cameras"][string], place: string, size: [number, number], own: Own[], lines: Lines) {
  // a mouse needs no finger-sized button (controls.ts: PILL_FINE)
  const fine = matchMedia("(pointer: fine)").matches;
  const controls = camera.controls ?? [];
  const presets = camera.presets ?? [];
  if (!controls.length && !own.length && !presets.length && !camera.zoom) return nothing;
  const at = controlsAt(camera.controls_at);
  // Its zoom: the level is the entity's own, never the one asked for, so it is right
  // after a preset has moved the lens too.
  const zst = camera.zoom ? hass.states[camera.zoom] : undefined;
  const zoom = zst ? zoomOf(zst.state, zst.attributes) : null;
  const zoomOut = !camera.zoom ? "" : !zst ? "Not found" : zoom ? "" : "Unavailable";
  const zoomName = zoom ? `Zoom ${zoomPct(zoom, zoom.value)}%` : "Zoom";
  const edge = size[0] >= size[1] ? at.landscape : at.portrait;
  const nameOf = (c: (typeof controls)[number]) => c.name || (hass.states[c.entity]?.attributes.friendly_name as string | undefined) || c.entity;
  const named = [...own.map((b) => b.label), ...controls.map(nameOf), ...(camera.zoom ? [zoomName] : [])];
  const bar = barFit(at, size, edge, named, presets.map((p) => p.name), fine);
  // Its size, place along the edge and background, as the Cameras page previews them.
  const look = Object.entries(controlsStyle(at, bar.height))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  const folded = bar.fold && presets.length > 0;
  const preset = (p: Preset) =>
    html`<button class="control" title="Move the camera to ${p.name}" @click=${() => lines.go(p)}>
      <ha-icon icon="mdi:camera-control"></ha-icon>
      <span>${p.name}</span>
    </button>`;
  const opened = lines.open === "ptz" ? folded : lines.open === "zoom" ? Boolean(zoom) : false;
  // The zoom's stepper. Each tap goes on from the level asked for, where one is on its
  // way, so three quick taps are three steps and not one.
  const stepper = () => {
    const to = lines.zoomTo !== null && lines.zoomTo !== zoom!.value ? lines.zoomTo : null;
    const from = to ?? zoom!.value;
    const send = (value: number) => lines.zoom(camera.zoom!, value);
    return html`<div class="controls-line">
      <button class="control" ?disabled=${from <= zoom!.min} title="Zoom out a step" @click=${() => send(zoomStep(zoom!, from, -1))}>
        <ha-icon icon="mdi:magnify-minus-outline"></ha-icon>
        <span>Out</span>
      </button>
      <span class="control level" title="The camera's zoom now${to === null ? "" : ", and the level it is going to"}">
        ${zoomPct(zoom!, zoom!.value)}%${to === null ? "" : ` → ${zoomPct(zoom!, to)}%`}
      </span>
      <button class="control" ?disabled=${from >= zoom!.max} title="Zoom in a step" @click=${() => send(zoomStep(zoom!, from, 1))}>
        <ha-icon icon="mdi:magnify-plus-outline"></ha-icon>
        <span>In</span>
      </button>
      <button class="control" ?disabled=${from <= zoom!.min} title="Zoom all the way out" @click=${() => send(zoom!.min)}>
        <ha-icon icon="mdi:backup-restore"></ha-icon>
        <span>Reset</span>
      </button>
    </div>`;
  };
  // A tap that misses a button, between two or just beside one, lands on the group they
  // stand in and does nothing: it was going through to the picture, which opened the
  // camera full screen (owner, 2026-11-27). While a line is opened out, a tap
  // anywhere else in the place puts it away, and does no more than that.
  return html`<div class="controls-area" style=${place}>
    ${opened ? html`<div class="controls-away" @click=${() => lines.show(lines.open as Line)}></div>` : nothing}
    <div class="controls ${bar.names ? "" : "icons"}" style=${look} data-edge=${edge}>
     <div class="controls-group">
      <div class="controls-line">
        ${own.map(
          (b) =>
            html`<button class="control ${b.on ? "on" : ""}" title=${b.title} aria-label=${b.label} @click=${b.toggle}>
              <ha-icon icon=${b.icon}></ha-icon>
              <span>${b.label}</span>
            </button>`,
        )}
        ${controls.map((c) => {
          const st = hass.states[c.entity];
          const name = nameOf(c);
          const out = !st ? "Not found" : OUT.has(st.state) ? "Unavailable" : "";
          return html`<button
            class="control ${st?.state === "on" || st?.state === "open" || st?.state === "unlocked" ? "on" : ""}"
            ?disabled=${Boolean(out)}
            title=${out ? `${c.entity}: ${out}` : name}
            aria-label=${name}
            @click=${() => fire(el, "hass-action", { config: { entity: c.entity, tap_action: { action: "toggle" } }, action: "tap" })}
          >
            ${st
              ? html`<ha-state-icon .hass=${hass} .stateObj=${st} .icon=${c.icon}></ha-state-icon>`
              : html`<ha-icon icon="mdi:alert-circle-outline"></ha-icon>`}
            <span>${name}</span>
            ${out ? html`<span class="cm-pill cm-filled cm-bad">${out}</span>` : nothing}
          </button>`;
        })}
        ${folded
          ? html`<button
              class="control ${lines.open === "ptz" ? "on" : ""}"
              title=${lines.open === "ptz" ? "Put the presets away" : `Its ${presets.length} PTZ presets`}
              aria-label="PTZ"
              aria-expanded=${lines.open === "ptz"}
              @click=${() => lines.show("ptz")}
            >
              <ha-icon icon="mdi:camera-control"></ha-icon>
              <span>PTZ</span>
            </button>`
          : presets.map(preset)}
        ${camera.zoom
          ? html`<button
              class="control ${lines.open === "zoom" && zoom ? "on" : ""}"
              ?disabled=${Boolean(zoomOut)}
              title=${zoomOut ? `${camera.zoom}: ${zoomOut}` : lines.open === "zoom" ? "Put the zoom away" : "Zoom in or out"}
              aria-label=${zoomName}
              aria-expanded=${lines.open === "zoom" && Boolean(zoom)}
              @click=${() => lines.show("zoom")}
            >
              <ha-icon icon=${zst ? "mdi:magnify" : "mdi:alert-circle-outline"}></ha-icon>
              <span>${zoomName}</span>
              ${zoomOut ? html`<span class="cm-pill cm-filled cm-bad">${zoomOut}</span>` : nothing}
            </button>`
          : nothing}
        ${lines.failed ? html`<span class="cm-pill cm-filled cm-bad failed">${lines.failed}</span>` : nothing}
      </div>
      ${!opened ? nothing : lines.open === "zoom" ? stepper() : html`<div class="controls-line">${presets.map(preset)}</div>`}
     </div>
    </div>
  </div>`;
}

export const fullStyles = css`
  /* Over the whole screen, Home Assistant's own header and sidebar too. */
  .full {
    position: fixed;
    inset: 0;
    z-index: 10;
    background: #000;
  }
  /* Sized from the pill's height (controls.ts: controlsStyle), as the page's preview is.
     Along its edge, the group of buttons sits at the start, the middle or the end. The
     group is only as big as its buttons and the room round them, and takes the taps that
     miss one. Its lines stand side by side from the edge inwards: the bar itself, then
     the PTZ presets when they are opened out. */
  .controls {
    position: absolute;
    display: flex;
    justify-content: var(--cm-pill-align);
  }
  .controls-group {
    display: flex;
    box-sizing: border-box;
    max-width: 100%;
    max-height: 100%;
    gap: calc(var(--cm-pill-height) * 0.2);
    padding: calc(var(--cm-pill-height) * 0.3);
    pointer-events: auto;
  }
  /* Over the whole place while the presets are opened out: a tap on it puts them away. */
  .controls-away {
    position: absolute;
    inset: 0;
    pointer-events: auto;
  }
  .controls-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: var(--cm-pill-align);
    gap: calc(var(--cm-pill-height) * 0.2);
  }
  /* The style guide's chip (pills.css: cm-chip) at the pill's height: its text, ends and
     gap in the guide's proportions (controls.ts: CHIP), in capitals. Its colours are its
     own: white on a black of the camera's chosen strength, to be read over a picture. */
  .control {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--cm-pill-gap);
    height: var(--cm-pill-height);
    padding: 0 var(--cm-pill-pad);
    border: none;
    border-radius: calc(var(--cm-pill-height) / 2);
    background: rgb(0 0 0 / var(--cm-pill-alpha));
    color: #fff;
    font: 500 var(--cm-pill-font) / 1.2 var(--ha-font-family-body, sans-serif);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    --mdc-icon-size: var(--cm-pill-icon);
  }
  .control.on {
    background: color-mix(in srgb, var(--state-active-color, var(--primary-color)) var(--cm-pill-alpha), transparent);
  }
  .control:disabled {
    opacity: 0.7;
    cursor: default;
  }
  /* A pill drawn small (a phone's main area) is still as easy to hit as a 44 px one: its
     tap area reaches past it, across the bar, and half-way to the next pill along it. */
  .control::after {
    content: "";
    position: absolute;
    inset: min(0px, calc((var(--cm-pill-height) - 44px) / 2)) calc(var(--cm-pill-height) * -0.1);
  }
  .controls[data-edge="left"] .control::after,
  .controls[data-edge="right"] .control::after {
    inset: calc(var(--cm-pill-height) * -0.1) min(0px, calc((var(--cm-pill-height) - 44px) / 2));
  }
  /* No room for the names (controls.ts: barFit): the bar's pills are their icons alone,
     round, each still named to a screen reader and on a pointer's hover. The presets,
     when opened out, keep their names. */
  .controls.icons .controls-line:first-child .control {
    justify-content: center;
    width: var(--cm-pill-height);
    padding: 0;
  }
  .controls.icons .controls-line:first-child .control span {
    display: none;
  }
  /* The zoom's level, between its two steps: a pill that says, and is not pressed. */
  .control.level {
    justify-content: center;
    min-width: calc(var(--cm-pill-height) * 1.6);
    cursor: default;
    font-variant-numeric: tabular-nums;
  }
  /* Why a preset didn't go: wraps, so a long reason stays on a narrow card. */
  .controls .failed {
    white-space: normal;
  }
  /* Its place (the full screen or the main area) lets taps through to the picture
     under it, but for the buttons themselves. */
  .controls-area {
    position: absolute;
    pointer-events: none;
  }
  .control {
    pointer-events: auto;
  }
  /* The edge for its place's shape: set on the Cameras page. The second line is on the
     picture's side of the first. */
  .controls[data-edge="top"] { top: 0; left: 0; right: 0; }
  .controls[data-edge="bottom"] { bottom: 0; left: 0; right: 0; }
  .controls[data-edge="left"] { left: 0; top: 0; bottom: 0; flex-direction: column; }
  .controls[data-edge="right"] { right: 0; top: 0; bottom: 0; flex-direction: column; }
  .controls[data-edge="top"] .controls-group { flex-direction: column; }
  .controls[data-edge="bottom"] .controls-group { flex-direction: column-reverse; }
  .controls[data-edge="left"] .controls-group { flex-direction: row; }
  .controls[data-edge="right"] .controls-group { flex-direction: row-reverse; }
  .controls[data-edge="left"] .controls-line,
  .controls[data-edge="right"] .controls-line { flex-direction: column; flex-wrap: nowrap; align-items: stretch; }
`;
