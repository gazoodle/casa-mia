// The clock in the Camera Commander card's caption (live.ts), while its main camera isn't
// live video: Home Assistant's time, as the picture drew it beside the main camera's name
// until 2026.11.14-b24 (the compositor's drawing.py). The card draws the name now, so it
// draws the clock too. It redraws only itself, on each second, and only while it is on
// the page; the card around it is not redrawn for it.
import { LitElement } from "lit";
import { timeIn } from "../clock/common.ts";

export class CaptionClock extends LitElement {
  static properties = { zone: {} };
  /** The zone the time is in (the server's); this device's when not given. */
  zone?: string;
  private beat = 0;

  connectedCallback() {
    super.connectedCallback();
    this.tick();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.beat);
  }

  /** Redraw, and again at the next whole second. */
  private tick = () => {
    this.requestUpdate();
    this.beat = window.setTimeout(this.tick, 1000 - (Date.now() % 1000));
  };

  render() {
    return timeIn(new Date(), this.zone, false, true).text;
  }
}
