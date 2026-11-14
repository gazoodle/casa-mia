// Dash-Bored's bundle: its page in the sidebar (shell.ts), which shows one family of
// dashboard at a time, and each family, which is also a dashboard card: the Gazette
// (gazette.ts) and Bakelite (bakelite.ts). house.ts reads the house from Home Assistant
// for them all, and family.ts is what their elements are built on.
// Built into the integration's own www/cards.js, since it works without Casa Mia's.
import { offerReload } from "../connection.ts";
import { define, register } from "../ha.ts";
import { Bakelite, CARD as BAKELITE } from "./bakelite.ts";
import { CARD, Gazette } from "./gazette.ts";
import { PAGE, Shell } from "./shell.ts";

// The address this file was loaded from carries the version served (?v=).
const VERSION = new URL(import.meta.url).searchParams.get("v") || "dev";

define(CARD, Gazette);
define(BAKELITE, Bakelite);
define(PAGE, Shell);
register(CARD, "Casa Mia Dash-Bored Gazette", "Your house as a newspaper: what matters most is the headline, and every underlined fact is a switch. Best in a panel view.");
register(BAKELITE, "Casa Mia Dash-Bored Bakelite", "Your house as a 1950s instrument panel: a knob for each dimmer, a tumbler switch for each light and switch, and a meter for each room's temperature. Best in a panel view.");
offerReload("Dash-Bored", "casa_mia_dash_bored/cards", VERSION);
