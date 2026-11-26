// The Camera Commander card's controls bar, on its full screen (Tap on the main camera:
// Full screen) and over its main area (Config.main_controls): the camera's controls
// along the edge set for the place's shape on the Cameras page, its PTZ presets, and the
// card's own buttons (Sound, Full screen). A
// tap on a control is Home Assistant's own toggle, as on the camera dashboard's tiles
// (auto_dashboards/dashboard.py: control_tile), so a lock, a cover or a button does
// what it does there. A tap on a preset is the camera's PTZ action with that preset, as
// the app built it (cameras.py: preset_calls).
import { css, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { barFit, controlsAt, controlsStyle } from "../../../../app/web/src/cameras/controls.ts";
import type { Card, Preset } from "./common.ts";

/** States a control can't be used in: shown dimmed and said, never a dead button. */
const OUT = new Set(["unavailable", "unknown"]);

/** How long "why a preset didn't go" stays with the controls. */
export const PTZ_NOTE_MS = 10_000;

/** One of the card's own buttons, where it offers them (Config.sound_button,
 * screen_button): what it says and shows in its state now, and its tap. */
export type Own = { on: boolean; icon: string; label: string; title: string; toggle: () => void };

/** The card's side of a camera's PTZ presets: whether they are opened out (where they
 * are behind the PTZ button), the PTZ button's tap, a preset's tap, and why the last one
 * didn't go ("" when it did, or after PTZ_NOTE_MS). */
export type Ptz = { open: boolean; toggle: () => void; go: (preset: Preset) => void; failed: string };

/** The camera's controls and presets (after the card's own buttons) along their edge of
 * `place`: the full screen, or the main area (Config.main_controls), `size` px. The wide
 * or the tall edge goes by the shape of that place, not the screen's: a main area can be
 * wide on an upright tablet. The pills' height is a share of the place's shorter side, so
 * the bar is in proportion in a phone's main area and on a large screen alike, and what
 * doesn't fit gives way (controls.ts: barFit): the presets go behind one PTZ button,
 * which opens them out as a second line on the picture's side of the bar (under a bar at
 * the top, left of one on the right), then the names go and the pills are icons. */
export function controlsBar(el: HTMLElement, hass: Hass, camera: Card["cameras"][string], place: string, size: [number, number], own: Own[], ptz: Ptz) {
  const controls = camera.controls ?? [];
  const presets = camera.presets ?? [];
  if (!controls.length && !own.length && !presets.length) return nothing;
  const at = controlsAt(camera.controls_at);
  const edge = size[0] >= size[1] ? at.landscape : at.portrait;
  const nameOf = (c: (typeof controls)[number]) => c.name || (hass.states[c.entity]?.attributes.friendly_name as string | undefined) || c.entity;
  const bar = barFit(at, size, edge, [...own.map((b) => b.label), ...controls.map(nameOf)], presets.map((p) => p.name));
  // Its size, place along the edge and background, as the Cameras page previews them.
  const look = Object.entries(controlsStyle(at, bar.height))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  const folded = bar.fold && presets.length > 0;
  const preset = (p: Preset) =>
    html`<button class="control" title="Move the camera to ${p.name}" @click=${() => ptz.go(p)}>
      <ha-icon icon="mdi:camera-control"></ha-icon>
      <span>${p.name}</span>
    </button>`;
  return html`<div class="controls-area" style=${place}>
    <div class="controls ${bar.names ? "" : "icons"}" style=${look} data-edge=${edge}>
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
              class="control ${ptz.open ? "on" : ""}"
              title=${ptz.open ? "Put the presets away" : `Its ${presets.length} PTZ presets`}
              aria-expanded=${ptz.open}
              @click=${ptz.toggle}
            >
              <ha-icon icon="mdi:camera-control"></ha-icon>
              <span>PTZ</span>
            </button>`
          : presets.map(preset)}
        ${ptz.failed ? html`<span class="cm-pill cm-filled cm-bad failed">${ptz.failed}</span>` : nothing}
      </div>
      ${folded && ptz.open ? html`<div class="controls-line">${presets.map(preset)}</div>` : nothing}
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
     The bar's lines stand side by side from its edge inwards: the bar itself, then the
     PTZ presets when they are opened out. */
  .controls {
    position: absolute;
    display: flex;
    gap: calc(var(--cm-pill-height) * 0.2);
    padding: calc(var(--cm-pill-height) * 0.3);
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
  .controls[data-edge="top"] { top: 0; left: 0; right: 0; flex-direction: column; }
  .controls[data-edge="bottom"] { bottom: 0; left: 0; right: 0; flex-direction: column-reverse; }
  .controls[data-edge="left"] { left: 0; top: 0; bottom: 0; flex-direction: row; }
  .controls[data-edge="right"] { right: 0; top: 0; bottom: 0; flex-direction: row-reverse; }
  .controls[data-edge="left"] .controls-line,
  .controls[data-edge="right"] .controls-line { flex-direction: column; flex-wrap: nowrap; align-items: stretch; }
`;
