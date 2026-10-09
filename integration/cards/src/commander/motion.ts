// Motion on a commander's tiles: a small pulsing dot the card draws (CSS) on a camera's tile
// while its motion sensor is on, and `motion_linger` seconds after; the compositor draws
// nothing for it. The sensors are the integration's (its Main camera select's `motion`
// attribute: camera -> sensor), as Track motion finds them. A tooltip says when.
import { css, html, nothing, type TemplateResult } from "lit";
import type { Hass } from "../ha.ts";
import type { Config } from "./common.ts";

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** The motion options' defaults (a card's own, set in its editor). */
export const MOTION = {
  motion_dot: true,
  motion_colour: [255, 59, 48] as [number, number, number],
  motion_size: 10, // CSS px across
  motion_pulse: 1.5, // seconds a pulse takes; 0: steady
  motion_linger: 10, // seconds the dot stays once the motion has stopped
  motion_corner: "top-right" as Corner,
};

/** A camera's motion to show: since when, and until when once it has stopped. */
type Seen = { since?: number; until?: number };

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const tip = ({ since, until }: Seen) =>
  until === undefined
    ? `Motion since ${clock(since!)}`
    : since !== undefined
      ? `Motion ${clock(since)} to ${clock(until)}`
      : `Motion until ${clock(until)}`;

/** Follows the sensors' states for one card: when each motion began (as seen, so a dot
 * that lingers can still say it), and when the next lingering dot is due to go. */
export class Motion {
  private began = new Map<string, number>(); // sensor -> when it last turned on
  private timer: ReturnType<typeof setTimeout> | undefined;

  /** Each camera's motion to show now; `again` is called when a lingering dot is due to go. */
  seen(hass: Hass, sensors: Record<string, string>, config: Config, again: () => void): Map<string, Seen> {
    const o = { ...MOTION, ...config };
    const out = new Map<string, Seen>();
    clearTimeout(this.timer);
    if (!o.motion_dot) return out;
    const now = Date.now();
    let next = Infinity;
    for (const [camera, sensor] of Object.entries(sensors)) {
      const st = hass.states[sensor];
      const changed = Date.parse(st?.last_changed ?? "");
      if (!st || Number.isNaN(changed)) continue;
      if (st.state === "on") {
        this.began.set(sensor, changed);
        out.set(camera, { since: changed });
      } else if (now - changed < o.motion_linger * 1000) {
        out.set(camera, { since: this.began.get(sensor), until: changed });
        next = Math.min(next, changed + o.motion_linger * 1000);
      }
    }
    if (next < Infinity) this.timer = setTimeout(again, next - now + 50);
    return out;
  }

  stop() {
    clearTimeout(this.timer);
  }
}

/** The dot on one tile (`at`: the tile's place, as the card's tap zones); a tap on it is a
 * tap on the tile. */
export function dot(seen: Seen | undefined, at: string, config: Config, tap: () => void): TemplateResult | typeof nothing {
  if (!seen) return nothing;
  const o = { ...MOTION, ...config };
  const [r, g, b] = o.motion_colour;
  const [v, h] = o.motion_corner.split("-");
  return html`<div class="motion-tile" style=${at}>
    <span
      class="motion ${o.motion_pulse > 0 ? "pulse" : ""}"
      title=${tip(seen)}
      style="${v}:6px;${h}:6px;--cm-motion:rgb(${r},${g},${b});--cm-motion-size:${o.motion_size}px;--cm-motion-pulse:${o.motion_pulse}s"
      @click=${tap}
    ></span>
  </div>`;
}

export const motionStyles = css`
  .motion-tile {
    position: absolute;
    pointer-events: none;
  }
  .motion {
    position: absolute;
    width: var(--cm-motion-size);
    height: var(--cm-motion-size);
    border-radius: 50%;
    background: var(--cm-motion);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
    pointer-events: auto;
    cursor: pointer;
  }
  .motion.pulse {
    animation: cm-motion var(--cm-motion-pulse) ease-out infinite;
  }
  @keyframes cm-motion {
    0% {
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 0 0 var(--cm-motion);
    }
    100% {
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 0 calc(var(--cm-motion-size) * 0.9) transparent;
    }
  }
`;
