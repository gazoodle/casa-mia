// Bargraph: the Console as the black hi-fi separates of the 1980s. Faders with LED
// ladders, soft-touch keys (under a flap of smoked perspex where a press must not be an
// accident), needle meters with a fluorescent display among them, a tuner's presets and
// a spectrum analyser. The panel itself is ../panel.ts; this is its kit and its look.
import * as kit from "./bargraph/kit.ts";
import { recorder } from "./bargraph/recorder.ts";
import { STYLES } from "./bargraph/styles.ts";
import { PAGE } from "../family.ts";
import { Panel } from "./panel.ts";
import { VIEWS } from "./views.ts";

export const CARD = "dash-bored-bargraph";

export class Bargraph extends Panel {
  static styles = [PAGE, VIEWS, STYLES];
  protected kit = { ...kit, recorder };
}
