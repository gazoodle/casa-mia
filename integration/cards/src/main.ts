// Casa Mia's Lovelace cards, one file (cm-cards.js) the integration loads into every HA page:
// Tablet layout, Camera Commander, Section. Source of the built www/cm-cards.js.
import "./section.ts";
import "./commander.ts";
import "./tablet.ts";

console.info(
  `%cCASA-MIA CARDS\n%ctablet layout, commander, section (${new URL(import.meta.url).searchParams.get("v") || "dev"})`,
  "color: green; font-weight: bold;",
  "",
);
