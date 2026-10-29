// The Heating Flow card: the heating and hot water as a live diagram. The parts: engine.ts
// (geometry and colour), draw.ts (pipes as one network), parts.ts (pumps, valves, tanks…),
// system.ts (the System view), common.ts (options and readings), card.ts, editor.ts.
import { define, register } from "../ha.ts";
import { HeatingFlowCard } from "./card.ts";
import { HeatingFlowEditor } from "./editor.ts";

define("casa-mia-heating-flow", HeatingFlowCard);
define("casa-mia-heating-flow-editor", HeatingFlowEditor);
register(
  "casa-mia-heating-flow",
  "Casa Mia Heating Flow",
  "The heating and hot water as a live diagram: colour is temperature, chevrons are flow, and anything not current says so.",
);
