// Dash-Bored's bundle: its page in the sidebar (shell.ts), which shows one family of
// dashboard at a time, and each family, which is also a dashboard card: the Gazette
// (gazette.ts) and the Console (console/host.ts), whose eras are elements too: Bakelite
// (console/bakelite.ts) is the 1950s, Nixie (console/nixie.ts) the 1960s, Silverface
// (console/silverface.ts) the 1970s, Bargraph (console/bargraph.ts) the 1980s and Beige
// (console/beige.ts) the 1990s.
// The Fridge (fridge.ts) is the third family, Aurora (aurora.ts) the fourth and Digs (digs.ts) the fifth. house.ts reads the house from Home Assistant
// for them all, and family.ts is what their elements are built on. Contraption (contraption.ts) is the sixth.
// Built into the integration's own www/cards.js, since it works without Casa Mia's.
import { offerReload } from "../connection.ts";
import { define, register } from "../ha.ts";
import { CARD as AURORA, Aurora } from "./aurora.ts";
import { Bakelite, CARD as BAKELITE } from "./console/bakelite.ts";
import { Bargraph, CARD as BARGRAPH } from "./console/bargraph.ts";
import { Beige, CARD as BEIGE } from "./console/beige.ts";
import { INSTRUMENT, Instrument, LAMPS, Lamps, METERS, MeterPanel, ROOM, RoomCard, editor } from "./console/cards.ts";
import { CARD as CONSOLE, Console } from "./console/host.ts";
import { CARD as NIXIE, Nixie } from "./console/nixie.ts";
import { CARD as SILVERFACE, Silverface } from "./console/silverface.ts";
import { CARD as CONTRAPTION, Contraption } from "./contraption.ts";
import { CARD as DIGS, Digs } from "./digs.ts";
import { CARD as FRIDGE, Fridge } from "./fridge.ts";
import { CARD, Gazette } from "./gazette.ts";
import { roomCard, roomEditor } from "./room.ts";
import { PAGE, Shell } from "./shell.ts";
import { ALMANAC, SEASONAL, SKINS as SKIES } from "./aurora/skins.ts";
import { SKINS as INKS } from "./contraption/skins.ts";
import { SKINS as HOUSEHOLDS } from "./fridge/skins.ts";

// The address this file was loaded from carries the version served (?v=).
const VERSION = new URL(import.meta.url).searchParams.get("v") || "dev";

define(CARD, Gazette);
define(BAKELITE, Bakelite);
define(BARGRAPH, Bargraph);
define(BEIGE, Beige);
define(CONSOLE, Console);
define(NIXIE, Nixie);
define(SILVERFACE, Silverface);
define(FRIDGE, Fridge);
define(AURORA, Aurora);
define(DIGS, Digs);
define(CONTRAPTION, Contraption);
define(PAGE, Shell);
for (const [tag, card] of [[INSTRUMENT, Instrument], [ROOM, RoomCard], [LAMPS, Lamps], [METERS, MeterPanel]] as const) {
  define(tag, card);
  define(`${tag}-editor`, editor(tag));
}
// A room's card for each family that has one (room.ts): its element, what the card picker
// calls it and says of it, and the styles its editor offers. The Console's is among its
// part cards above, and the Gazette has none.
const named = (skins: { id: string; name: string }[]): [string, string][] => skins.map((s) => [s.id, s.name]);
const ROOMS: [whole: string, element: CustomElementConstructor, name: string, says: string, styles?: [string, string][]][] = [
  [FRIDGE, roomCard(Fridge, `${FRIDGE}-room`), "Fridge", "One room on a piece of the fridge door: its polaroid, a magnet for each of its devices and its scenes as word magnets.", HOUSEHOLDS.map((s) => [s.id, s.label])],
  [AURORA, roomCard(Aurora, `${AURORA}-room`), "Aurora", "One room in the current web style: a fader or a key for each of its devices, its scenes and its cameras, on glass over a sky that warms as its lights come on.", [...named(SKIES), [ALMANAC, "Almanac"], ...named(SEASONAL)]],
  [DIGS, roomCard(Digs, `${DIGS}-room`), "Digs", "One room built of square blocks: a block to hit for each of its devices, lit by its lamps, with its scenes along the bottom."],
  [CONTRAPTION, roomCard(Contraption, `${CONTRAPTION}-room`), "Contraption", "One room as an absurd machine that ducks go through: each duck is the engine of the device it is passing, and a tap on a device throws its clutch.", named(INKS)],
];
for (const [whole, element, name, says, styles] of ROOMS) {
  define(`${whole}-room`, element);
  define(`${whole}-room-editor`, roomEditor(styles));
  register(`${whole}-room`, `Casa Mia Dash-Bored ${name} room`, `${says} For a page that is about that room.`);
}
register(CARD, "Casa Mia Dash-Bored Gazette", "Your house as a newspaper: what matters most is the headline, and every underlined fact is a switch. Best in a panel view.");
register(CONSOLE, "Casa Mia Dash-Bored Console", "Your house as a control panel, in the style of a decade, with a switch to choose which. Every decade from the 1950s to the 1990s is built. Best in a panel view.");
// Bakelite's own card is no longer offered in the card picker (owner, 2026-11-16): the
// Console card shows every era. A dashboard that has custom:dash-bored-bakelite keeps it.
register(FRIDGE, "Casa Mia Dash-Bored Fridge", "Your house as a fridge door: a polaroid for each room, a magnet for each device, sticky notes for what is wrong and the cameras' pictures held up by a butterfly. Dress it as a young family's, a pair of yuppies' or grandparents'. Best in a panel view.");
register(AURORA, "Casa Mia Dash-Bored Aurora", "Your house in the current web style: glass tiles over a sky that warms as the lights come on, with the scenes, the power being drawn and a thermostat. A room's tile has a dot for each device and grows into a sheet of faders. Best in a panel view.");
register(DIGS, "Casa Mia Dash-Bored Digs", "Your house in section, built of square blocks: a block to hit for each device, lit by its lamps, with the household walking about in the lit rooms, hearts for what is wrong and the scenes along the bottom. Best in a panel view.");
register(CONTRAPTION, "Casa Mia Dash-Bored Contraption", "One room as an absurd machine that ducks go through: each duck is the engine of the device it is passing, and a tap on a device throws its clutch. The first build shows one room, the kitchen unless you name another. Best in a panel view.");
register(INSTRUMENT, "Casa Mia Dash-Bored Console instrument", "One light, switch, thermostat, lock, camera, alarm, scene or sensor as an instrument on the Console, in the style of a decade: a knob, a switch, a screen or a meter. On its era's panel, or on the dashboard's own card.");
register(ROOM, "Casa Mia Dash-Bored Console room", "One room as a chassis on the Console, in the style of a decade: a lamp for its lights, a meter for its temperature, and a control for each of its devices.");
register(LAMPS, "Casa Mia Dash-Bored Console warning lamps", "Sensor Watch's warnings as the Console's warning lamps, in the style of a decade, the worst first. A green lamp says when all is well.");
register(METERS, "Casa Mia Dash-Bored Console meter panel", "An electricity meter as a chassis on the Console, in the style of a decade: a meter for each phase's voltage, current and power, and a register for each total of energy. Choose the meter's device; several make several chassis.");
// Dash-Bored's page is often a wall tablet's, with nobody there to press Reload: it reloads
// by itself once nobody has touched it for a minute. A dashboard may be half-way through an
// edit, so a card alone never does.
offerReload("Dash-Bored", "casa_mia_dash_bored/cards", VERSION, () => Shell.shown > 0);
