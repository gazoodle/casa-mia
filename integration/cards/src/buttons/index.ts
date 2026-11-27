// Casa Mia Buttons: a few compact buttons as the style guide's chips. The parts: common.ts
// (what a button does and shows), card.ts, editor.ts.
import { define, register } from "../ha.ts";
import { ButtonsCard } from "./card.ts";
import { ButtonsEditor } from "./editor.ts";

define("casa-mia-buttons", ButtonsCard);
define("casa-mia-buttons-editor", ButtonsEditor);
register("casa-mia-buttons", "Casa Mia Buttons", "A few small buttons (a light, a gate, another page), small enough for a Camera Commander's last place.");
