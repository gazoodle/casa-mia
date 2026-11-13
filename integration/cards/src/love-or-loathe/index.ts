// Love it or Loathe it's card: thumbs for the song a media player is playing. The parts:
// common.ts (the options and the feed), thumbs.ts (the two thumbs, whole in themselves),
// card.ts and editor.ts, and dialog.ts (the thumbs in a media player's own dialog). Built into the integration's own www/cards.js, since the
// integration works without Casa Mia's.
import { offerReload } from "../connection.ts";
import { define, register } from "../ha.ts";
import { LoveOrLoatheCard } from "./card.ts";
import { CARD, CARDS_VERSION, VERSION } from "./common.ts";
import "./dialog.ts";
import { LoveOrLoatheEditor } from "./editor.ts";
import { TAG, Thumbs } from "./thumbs.ts";

define(TAG, Thumbs);
define(CARD, LoveOrLoatheCard);
define(`${CARD}-editor`, LoveOrLoatheEditor);
register(CARD, "Casa Mia Love it or Loathe it", "A thumb up and a thumb down for the song a media player is playing, for whoever is signed in.");
offerReload("Love it or Loathe it", CARDS_VERSION, VERSION);
