// Casa Mia Clock: the time, filling its space, digital or analogue. The parts: common.ts
// (the time to show), card.ts, editor.ts.
import { define, register } from "../ha.ts";
import { ClockCard } from "./card.ts";
import { ClockEditor } from "./editor.ts";

define("casa-mia-clock", ClockCard);
define("casa-mia-clock-editor", ClockEditor);
register("casa-mia-clock", "Casa Mia Clock", "The time, digital or analogue, filling whatever space it is given: a Camera Commander's last place, a Tablet Layout panel.");
