// Silverface: the Console as the hi-fi and bench instruments of the 1970s. Brushed
// aluminium faceplates in a teak cabinet, machined knobs, chrome toggle switches (under
// red flip-up covers where a press must not be an accident), back-lit meters, red LEDs
// and an oscilloscope. The panel itself is ../panel.ts; this is its kit and its look.
import { Panel } from "./panel.ts";
import * as kit from "./silverface/kit.ts";
import { recorder } from "./silverface/recorder.ts";
import { STYLES } from "./silverface/styles.ts";

export const CARD = "dash-bored-silverface";

export class Silverface extends Panel {
  static styles = STYLES;
  protected kit = { ...kit, recorder };
}
