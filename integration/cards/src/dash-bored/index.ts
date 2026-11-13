// Dash-Bored's bundle: the Gazette, which is both its page in the sidebar and a dashboard
// card. The parts: house.ts (the house, read from Home Assistant), stories.ts (what is
// worth saying, ranked), voices.ts (how each paper says it), styles.ts and gazette.ts.
// Built into the integration's own www/cards.js, since it works without Casa Mia's.
import { offerReload } from "../connection.ts";
import { define, register } from "../ha.ts";
import { CARD, Gazette } from "./gazette.ts";

// The address this file was loaded from carries the version served (?v=).
const VERSION = new URL(import.meta.url).searchParams.get("v") || "dev";

define(CARD, Gazette);
register(CARD, "Dash-Bored Gazette", "Your house as a newspaper: what matters most is the headline, and every underlined fact is a switch. Best in a panel view.");
offerReload("Dash-Bored", "casa_mia_dash_bored/cards", VERSION);
