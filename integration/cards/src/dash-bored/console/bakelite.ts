// Bakelite: the Console as a 1950s instrument panel. Valves, moving-coil meters, fluted
// knobs, tumbler switches and knife switches, on hammer-finish enamel. The panel itself
// is ../panel.ts; this is its kit and its look.
import * as kit from "./bakelite/kit.ts";
import { recorder } from "./bakelite/recorder.ts";
import { STYLES } from "./bakelite/styles.ts";
import { barometer, calendar } from "./bakelite/weather.ts";
import { typeface } from "../family.ts";
import { PAGE } from "../family.ts";
import { register } from "./metered.ts";
import { Panel } from "./panel.ts";
import { VIEWS } from "./views.ts";

export const CARD = "dash-bored-bakelite";

export class Bakelite extends Panel {
  static styles = [PAGE, VIEWS, STYLES];
  protected kit = { ...kit, recorder, barometer, calendar, register: register(kit.label, kit.counter) };

  connectedCallback() {
    super.connectedCallback();
    // The hand the alerts' cards are written in (Homemade Apple, Apache Licence 2.0).
    typeface("Dash-Bored Hand", "HomemadeApple-Regular.ttf");
  }
}
