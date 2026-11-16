// Nixie: the Console as a rack of 1960s test instruments. Blue-grey plates on a
// wrinkle-finish frame, nixie tubes, a magic eye for a room's lights, skirted instrument
// knobs, lever keys (under a red cover where a press must not be an accident), round lit
// pushes and an oscilloscope. The panel itself is ../panel.ts; this is its kit and its look.
import * as kit from "./nixie/kit.ts";
import { STYLES } from "./nixie/styles.ts";
import { Panel } from "./panel.ts";
import { VIEWS } from "./views.ts";
import { scope } from "./scope.ts";

export const CARD = "dash-bored-nixie";

export class Nixie extends Panel {
  static styles = [VIEWS, STYLES];
  protected kit = { ...kit, recorder: scope(kit.label, kit.push) };
}
