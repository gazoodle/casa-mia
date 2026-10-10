// The Over layer: one card shown over the dashboard (the view, or the whole window) while
// its Visibility conditions hold, its backdrop taking the taps so what's beneath is seen and
// not touched: the wall tablets' disarm panel while the alarm is set, a visiting engineer's
// look-don't-touch, a cover at night, a warning that wants attention.
// The parts: common.ts (options, defaults), card.ts (the card and its layer), editor.ts.
import { define, register } from "../ha.ts";
import { OverLayerCard } from "./card.ts";
import { OverLayerEditor } from "./editor.ts";

define("casa-mia-over-layer", OverLayerCard);
define("casa-mia-over-layer-editor", OverLayerEditor);
register(
  "casa-mia-over-layer",
  "Casa Mia Over layer",
  "One card over the whole dashboard while its Visibility conditions hold; what's beneath can be seen but not touched.",
);
