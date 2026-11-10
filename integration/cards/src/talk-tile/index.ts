// The Talk tile card: HA's tile card on a doorbell's call sensor, saying what a tap will do
// on this page (Talk, Hang up, Answered by …). The parts: common.ts (its rules), card.ts,
// editor.ts.
import { define, register } from "../ha.ts";
import { TalkTileCard } from "./card.ts";
import { TalkTileEditor } from "./editor.ts";

define("casa-mia-talk-tile", TalkTileCard);
define("casa-mia-talk-tile-editor", TalkTileEditor);
register("casa-mia-talk-tile", "Casa Mia Talk tile", "A tile for a doorbell's call: Talk, Hang up or Answered by …, as a tap here would do.");
