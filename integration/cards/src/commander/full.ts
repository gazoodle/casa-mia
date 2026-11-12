// The Camera Commander card's controls bar, on its full screen (Tap on the main camera:
// Full screen) and over its main area (Config.main_controls): the camera's controls
// along the edge set for the place's shape on the Cameras page, and the card's own
// buttons (Sound, Full screen). A
// tap on one is Home Assistant's own toggle, as on the camera dashboard's tiles
// (auto_dashboards/dashboard.py: control_tile), so a lock, a cover or a button does
// what it does there.
import { css, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { controlsAt, controlsStyle } from "../../../../app/web/src/cameras/controls.ts";
import type { Card } from "./common.ts";

/** States a control can't be used in: shown dimmed and said, never a dead button. */
const OUT = new Set(["unavailable", "unknown"]);

/** One of the card's own buttons, where it offers them (Config.sound_button,
 * screen_button): what it says and shows in its state now, and its tap. */
export type Own = { on: boolean; icon: string; label: string; title: string; toggle: () => void };

/** The camera's controls (after the card's own buttons) along their edge of `place`: the
 * full screen, or the main area (Config.main_controls). The wide or the tall edge goes by
 * the shape of that place, not the screen's: a main area can be wide on an upright tablet. */
export function controlsBar(el: HTMLElement, hass: Hass, camera: Card["cameras"][string], place: string, wide: boolean, own: Own[]) {
  const controls = camera.controls ?? [];
  if (!controls.length && !own.length) return nothing;
  const at = controlsAt(camera.controls_at);
  // Its size, place along the edge and background, as the Cameras page previews them.
  const look = Object.entries(controlsStyle(at))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return html`<div class="controls-area" style=${place}>
    <div class="controls" style=${look} data-edge=${wide ? at.landscape : at.portrait}>
      ${own.map(
        (b) =>
          html`<button class="control ${b.on ? "on" : ""}" title=${b.title} @click=${b.toggle}>
            <ha-icon icon=${b.icon}></ha-icon>
            <span>${b.label}</span>
          </button>`,
      )}
      ${controls.map((c) => {
        const st = hass.states[c.entity];
        const name = c.name || (st?.attributes.friendly_name as string | undefined) || c.entity;
        const out = !st ? "Not found" : OUT.has(st.state) ? "Unavailable" : "";
        return html`<button
          class="control ${st?.state === "on" || st?.state === "open" || st?.state === "unlocked" ? "on" : ""}"
          ?disabled=${Boolean(out)}
          title=${out ? `${c.entity}: ${out}` : name}
          @click=${() => fire(el, "hass-action", { config: { entity: c.entity, tap_action: { action: "toggle" } }, action: "tap" })}
        >
          ${st
            ? html`<ha-state-icon .hass=${hass} .stateObj=${st} .icon=${c.icon}></ha-state-icon>`
            : html`<ha-icon icon="mdi:alert-circle-outline"></ha-icon>`}
          <span>${name}</span>
          ${out ? html`<span class="cm-pill cm-filled cm-bad">${out}</span>` : nothing}
        </button>`;
      })}
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
  /* Sized from the pill's height (controls.ts: controlsStyle), as the page's preview is. */
  .controls {
    position: absolute;
    display: flex;
    flex-wrap: wrap;
    justify-content: var(--cm-pill-align);
    gap: calc(var(--cm-pill-height) * 0.2);
    padding: calc(var(--cm-pill-height) * 0.3);
  }
  .control {
    display: flex;
    align-items: center;
    gap: calc(var(--cm-pill-height) * 0.14);
    height: var(--cm-pill-height);
    padding: 0 calc(var(--cm-pill-height) * 0.32);
    border: none;
    border-radius: calc(var(--cm-pill-height) / 2);
    background: rgb(0 0 0 / var(--cm-pill-alpha));
    color: #fff;
    font: 500 calc(var(--cm-pill-height) * 0.29) / 1.2 var(--ha-font-family-body, sans-serif);
    white-space: nowrap;
    cursor: pointer;
    --mdc-icon-size: calc(var(--cm-pill-height) * 0.43);
  }
  .control.on {
    background: color-mix(in srgb, var(--state-active-color, var(--primary-color)) var(--cm-pill-alpha), transparent);
  }
  .control:disabled {
    opacity: 0.7;
    cursor: default;
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
  /* The edge for its place's shape: set on the Cameras page. */
  .controls[data-edge="top"] { top: 0; left: 0; right: 0; }
  .controls[data-edge="bottom"] { bottom: 0; left: 0; right: 0; }
  .controls[data-edge="left"] { left: 0; top: 0; bottom: 0; flex-direction: column; flex-wrap: nowrap; }
  .controls[data-edge="right"] { right: 0; top: 0; bottom: 0; flex-direction: column; flex-wrap: nowrap; }
`;
