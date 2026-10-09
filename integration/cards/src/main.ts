// Casa Mia's Lovelace cards, one file (cm-cards.js) the integration loads into every HA page:
// Camera Commander, Section, Tablet Layout. Source of the built www/cm-cards.js.
import "./section.ts";
import { VERSION } from "./commander.ts";
import "./view.ts";

console.info(
  `%cCASA-MIA CARDS\n%ccommander, section, tablet layout (${VERSION})`,
  "color: green; font-weight: bold;",
  "",
);
