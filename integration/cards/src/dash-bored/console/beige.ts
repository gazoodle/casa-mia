// Beige: the Console as the moulded plastic of the 1990s, a desktop computer or a
// building's controller. Grey LCDs with every segment to be seen, jog dials, rocker
// switches (beside a keylock where a press must not be an accident), function keys under
// a paper strip, rubber buttons and a chart in a window. Nothing on it moves unless it is
// pressed. The panel itself is ../panel.ts; this is its kit and its look.
import * as kit from "./beige/kit.ts";
import { STYLES } from "./beige/styles.ts";
import { PAGE } from "../family.ts";
import { Panel } from "./panel.ts";
import { VIEWS } from "./views.ts";
import { scope } from "./scope.ts";

export const CARD = "dash-bored-beige";

export class Beige extends Panel {
  static styles = [PAGE, VIEWS, STYLES];
  protected kit = { ...kit, recorder: scope(kit.label, kit.push) };
}
