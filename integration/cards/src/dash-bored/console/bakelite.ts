// Bakelite: the Console as a 1950s instrument panel. Valves, moving-coil meters, fluted
// knobs, tumbler switches and knife switches, on hammer-finish enamel. The panel itself
// is ../panel.ts; this is its kit and its look.
import * as kit from "./bakelite/kit.ts";
import { recorder } from "./bakelite/recorder.ts";
import { STYLES } from "./bakelite/styles.ts";
import { Panel } from "./panel.ts";

export const CARD = "dash-bored-bakelite";

export class Bakelite extends Panel {
  static styles = STYLES;
  protected kit = { ...kit, recorder };
}
