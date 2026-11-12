// The Camera Commander card's full screen (Tap on the main camera: Full screen): the
// camera's controls along the edge set for the screen's shape on the Cameras page. A
// tap on one is Home Assistant's own toggle, as on the camera dashboard's tiles
// (auto_dashboards/dashboard.py: control_tile), so a lock, a cover or a button does
// what it does there.
import { css, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { controlsAt } from "../../../../app/web/src/cameras/controls.ts";
import type { Card } from "./common.ts";

/** States a control can't be used in: shown dimmed and said, never a dead button. */
const OUT = new Set(["unavailable", "unknown"]);

export function controlsBar(el: HTMLElement, hass: Hass, camera: Card["cameras"][string]) {
  const controls = camera.controls ?? [];
  if (!controls.length) return nothing;
  const at = controlsAt(camera.controls_at);
  return html`<div class="controls" data-landscape=${at.landscape} data-portrait=${at.portrait}>
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
  .controls {
    position: absolute;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    padding: 16px;
  }
  .control {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 56px;
    padding: 8px 18px;
    border: none;
    border-radius: 28px;
    background: rgb(0 0 0 / 0.6);
    color: #fff;
    font: 500 16px/1.2 var(--ha-font-family-body, sans-serif);
    cursor: pointer;
  }
  .control.on {
    background: var(--state-active-color, var(--primary-color));
  }
  .control:disabled {
    opacity: 0.7;
    cursor: default;
  }
  /* The edge for the screen's shape now: set on the Cameras page. */
  @media (orientation: landscape) {
    .controls[data-landscape="top"] { top: 0; left: 0; right: 0; }
    .controls[data-landscape="bottom"] { bottom: 0; left: 0; right: 0; }
    .controls[data-landscape="left"] { left: 0; top: 0; bottom: 0; flex-direction: column; flex-wrap: nowrap; }
    .controls[data-landscape="right"] { right: 0; top: 0; bottom: 0; flex-direction: column; flex-wrap: nowrap; }
  }
  @media (orientation: portrait) {
    .controls[data-portrait="top"] { top: 0; left: 0; right: 0; }
    .controls[data-portrait="bottom"] { bottom: 0; left: 0; right: 0; }
    .controls[data-portrait="left"] { left: 0; top: 0; bottom: 0; flex-direction: column; flex-wrap: nowrap; }
    .controls[data-portrait="right"] { right: 0; top: 0; bottom: 0; flex-direction: column; flex-wrap: nowrap; }
  }
`;
