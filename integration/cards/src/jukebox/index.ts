// Jukebox's page and its small card, in a file of their own (cards.js) in its integration,
// which works without Casa Mia's: it loads the file into every Home Assistant page itself,
// and shows the page from it. The parts: common.ts (the house's music and the way to ask
// for anything), parts.ts (icons, artwork, the slider), mini.ts and big.ts (the two
// players), queue.ts (the big player's queue), find.ts (its search), page.ts, and the cards: card.ts (the players), micro.ts (a
// room's picture alone, with its editor, micro-editor.ts) and pieces.ts (the quiet rooms, a shortcut, and the big player in
// place), with rooms.ts for the quiet rooms themselves.
import { AnchorGrid } from "../anchor-grid.ts";
import { offerReload } from "../connection.ts";
import { define, register } from "../ha.ts";
import { BIG, Big } from "./big.ts";
import { CARD, JukeboxCard } from "./card.ts";
import { CARDS_VERSION, VERSION } from "./common.ts";
import { EDITOR, Editor } from "./editor.ts";
import { MICRO, MICRO_EDITOR, MicroCard } from "./micro.ts";
import { ANCHOR_GRID, MicroEditor } from "./micro-editor.ts";
import { MINI, Mini } from "./mini.ts";
import { PAGE, Page } from "./page.ts";
import { MARQUEE, Marquee, SLIDER, Slider } from "./parts.ts";
import { QUEUE, Queue } from "./queue.ts";
import { FIND, Find } from "./find.ts";
import { NOW, NowCard, QUIET, QuietCard, SHORTCUT, ShortcutCard } from "./pieces.ts";
import { ROOMS, Rooms } from "./rooms.ts";

define(SLIDER, Slider);
define(MARQUEE, Marquee);
define(MINI, Mini);
define(QUEUE, Queue);
define(FIND, Find);
define(ROOMS, Rooms);
define(BIG, Big);
define(EDITOR, Editor);
define(PAGE, Page);
define(CARD, JukeboxCard);
define(QUIET, QuietCard);
define(SHORTCUT, ShortcutCard);
define(NOW, NowCard);
define(MICRO, MicroCard);
define(MICRO_EDITOR, MicroEditor);
define(ANCHOR_GRID, AnchorGrid);
register(CARD, "Casa Mia Jukebox: players", "What is playing on the Sonos speakers, with pause, skip and volume. A tap opens the big player.");
register(MICRO, "Casa Mia Jukebox: micro player", "Only the picture of what a room is playing, small enough for a sidebar, marked when it is playing, paused or muted. A tap opens the big player.");
register(QUIET, "Casa Mia Jukebox: quiet rooms", "The rooms that are playing nothing, each a tap from its favourites.");
register(SHORTCUT, "Casa Mia Jukebox: shortcut", "A button that plays one favourite in the rooms you choose.");
register(NOW, "Casa Mia Jukebox: now playing", "The whole player for one room, in place: artwork, controls, queue, rooms, favourites and search.");
offerReload("Jukebox", CARDS_VERSION, VERSION);
