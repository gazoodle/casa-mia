// Casa Mia's Lovelace cards, one file (cm-cards.js) the integration loads into every HA page:
// Camera Commander, Section, Tablet Layout. Source of the built www/cm-cards.js.
import "./section.ts";
import "./commander.ts";
import "./view.ts";

console.info(
  `%cCASA-MIA CARDS\n%ccommander, section, tablet layout (${new URL(import.meta.url).searchParams.get("v") || "dev"})`,
  "color: green; font-weight: bold;",
  "",
);
