// The Camera Commander card's CSS.
import { css } from "lit";
import { motionStyles } from "./motion.ts";
import { detectStyles } from "./detect.ts";

export const styles = [motionStyles, detectStyles, css`
    :host {
      display: block;
      height: 100%;
    }
    /* All of its width; its height from the rule (render). Width set: with only a height,
       aspect-ratio would make the width from it (wider than its space). */
    ha-card {
      position: relative;
      width: 100%;
      overflow: hidden;
      background: none;
      border: none;
      box-shadow: none;
    }
    .box,
    .seen {
      position: absolute;
      inset: 0;
    }
    /* What the Security look covers (its filter here): taps go to the zones over it. */
    .seen {
      pointer-events: none;
    }
    .picture,
    .still {
      display: block;
      width: 100%;
      height: 100%;
    }
    /* A still while editing: hatched, so it is not taken for the live picture. */
    .hatch {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding: 8px;
      background: repeating-linear-gradient(45deg, rgb(255 255 255 / 0.18) 0 4px, rgb(0 0 0 / 0.18) 4px 14px);
      pointer-events: none;
    }
    .hatch span {
      padding: 2px 6px;
      background: rgb(0 0 0 / 0.63);
      color: #fff;
      font: 13px/1.2 sans-serif;
    }
    .zone,
    .highlight,
    .live,
    .caption {
      position: absolute;
      box-sizing: border-box;
    }
    /* The last place, kept clear by the picture for a card of the dashboard's own
       (place.ts). The card fills it, and what doesn't fit is cut off at its edge. A note
       there (nothing set, or it can't be drawn) sits in the middle and wraps. */
    .place {
      position: absolute;
      box-sizing: border-box;
      display: flex;
      overflow: hidden;
    }
    .place > * {
      flex: 1;
      min-width: 0;
    }
    /* Its cards, each in HA's hui-card: one its Visibility (or the card itself) hides has
       the hidden attribute, and the first not hidden is the one shown. */
    .place > hui-card {
      display: block;
    }
    .place > hui-card[hidden],
    .place > hui-card:not([hidden]) ~ hui-card {
      display: none !important;
    }
    .place > .cm-pill {
      flex: none;
      max-width: 100%;
      margin: auto;
      white-space: normal;
      text-align: center;
    }
    /* The live main camera over the picture (its drawn main area shows until it plays). */
    .live {
      pointer-events: none;
      background: transparent;
      transition: opacity 0.3s;
    }
    /* Its caption, as the compositor draws a main camera's: along the foot, on the left. */
    .caption {
      display: flex;
      flex-wrap: wrap;
      align-content: flex-end;
      align-items: flex-end;
      gap: 4px 6px;
      /* in step with the name: 10 px for a name of 20 */
      padding: 0 calc(var(--cm-label-size) / 2) calc(var(--cm-label-size) / 2);
      pointer-events: none;
    }
    /* Its font, size and colours are the commander's labels (labels.ts), set on the box:
       one size on every device (labels.ts: nameSize). A name too long for its place is cut
       short with …, as the compositor's was (labels.py: fitted). The detection chips are
       the style guide's (detect.ts), not these. */
    .caption :is(.title, .lost, .clock) {
      box-sizing: border-box;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 2px 6px;
      background: var(--cm-label-back);
      color: var(--cm-label-colour);
      font: var(--cm-label-size) / 1.2 var(--cm-label-font);
    }
    /* The clock at the right of the foot, as the picture drew it: on the picture itself,
       or on the bar. */
    .caption .clock {
      flex: none;
      margin-left: auto;
      background: none;
    }
    /* A pill: rounded ends, as the style guide's pills have. */
    .caption.pill :is(.title, .lost) {
      padding: 0.1em 0.5em;
      border-radius: 999px;
    }
    /* A bar: the name and the clock across the foot, anything said beside it standing
       above. */
    .caption.bar {
      padding: 0;
    }
    .caption.bar .foot {
      flex: 1 0 100%;
      display: flex;
      min-width: 0;
      background: var(--cm-label-back);
    }
    .caption.bar .foot > * {
      padding: 0.35em 0.5em;
      background: none;
    }
    .caption.bar .title {
      flex: 1 1 auto;
      min-width: 0;
    }
    .caption.bar .lost {
      margin-left: 0.5em;
    }
    .caption.none .title {
      display: none;
    }
    /* No live video: said in red beside the title, wrapping on a narrow card (RULE FIVE). */
    .caption .lost {
      background: rgb(200 30 30 / 0.9);
      color: #fff;
      font-weight: 600;
    }
    /* The picture failing (common.ts: pictureDown): said over the card, top left, wrapping. */
    .down {
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      pointer-events: none;
    }
    .down span {
      white-space: normal;
    }
    .zone {
      cursor: pointer;
    }
    .highlight {
      pointer-events: none;
    }
    /* Its pulse, every --cm-pulse seconds: "breathe", the glow swelling to its full blur and
       back; "ripple", a ring spreading out from the border and fading. Steady for a viewer
       who asked for less motion. */
    .highlight.breathe {
      animation: cm-breathe var(--cm-pulse) ease-in-out infinite;
    }
    .highlight.ripple {
      animation: cm-ripple var(--cm-pulse) ease-out infinite;
    }
    @keyframes cm-breathe {
      0%,
      100% {
        box-shadow: 0 0 calc(var(--cm-blur) / 4) 0 color-mix(in srgb, var(--cm-colour) 30%, transparent);
      }
      50% {
        box-shadow: 0 0 var(--cm-blur) 2px color-mix(in srgb, var(--cm-colour) 70%, transparent);
      }
    }
    @keyframes cm-ripple {
      0% {
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--cm-colour) 60%, transparent);
      }
      70%,
      100% {
        box-shadow: 0 0 0 max(6px, var(--cm-blur)) color-mix(in srgb, var(--cm-colour) 0%, transparent);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .highlight {
        animation: none !important;
      }
    }
    /* Debug: the card's own figures, 70% down the middle (the compositor's are 30% down),
       clear of the corners and the crossing. */
    .debug {
      position: absolute;
      left: 50%;
      top: 70%;
      transform: translate(-50%, -50%);
      padding: 4px 10px;
      background: #000;
      font: 13px/1.4 ui-monospace, monospace;
      text-align: center;
      /* as wide as its longest line, or the card: its lines wrap on a phone */
      width: max-content;
      max-width: calc(100% - 20px);
      pointer-events: none;
    }
    .note {
      padding: 16px;
      color: var(--secondary-text-color);
    }
`];
