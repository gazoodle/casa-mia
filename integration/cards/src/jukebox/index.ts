// Jukebox's page and its small card, in a file of their own (cards.js) in its integration,
// which works without Casa Mia's: it loads the file into every Home Assistant page itself,
// and shows the page from it. The parts: common.ts (the house's music and the way to ask
// for anything), parts.ts (icons, artwork, the slider), mini.ts and big.ts (the two
// players), queue.ts (the big player's queue), find.ts (its search), page.ts and card.ts.
import { offerReload } from "../connection.ts";
import { define, register } from "../ha.ts";
import { BIG, Big } from "./big.ts";
import { CARD, JukeboxCard } from "./card.ts";
import { CARDS_VERSION, VERSION } from "./common.ts";
import { MINI, Mini } from "./mini.ts";
import { PAGE, Page } from "./page.ts";
import { SLIDER, Slider } from "./parts.ts";
import { QUEUE, Queue } from "./queue.ts";
import { FIND, Find } from "./find.ts";

define(SLIDER, Slider);
define(MINI, Mini);
define(QUEUE, Queue);
define(FIND, Find);
define(BIG, Big);
define(PAGE, Page);
define(CARD, JukeboxCard);
register(CARD, "Casa Mia Jukebox", "What is playing on the Sonos speakers, with pause, skip and volume. A tap opens the big player.");
offerReload("Jukebox", CARDS_VERSION, VERSION);
