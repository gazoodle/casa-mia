// Casa Mia's Lovelace cards, one file (cm-cards.js) the integration loads into every HA page:
// Camera Commander, Tablet Layout, Over layer, QR code, Heating Flow, the Talk tile, a guest's goodbye. Source of the built
// www/cm-cards.js. Sensor Watch's card is built by itself, for its own integration
// (vite.sensor-watch.config.ts).
import { VERSION } from "./commander/index.ts";
import { offerReload } from "./connection.ts";
import "./view/index.ts";
import "./garnish-editor.ts";
import "./garnish-sections.ts";
import "./screen-condition.ts";
import "./over-layer/index.ts";
import "./qr-code/index.ts";
import "./heating-flow/index.ts";
import "./swap/index.ts";
import "./talk-tile/index.ts";
import { watchForGoodbye } from "./guest-goodbye.ts";

console.info(
  `%cCASA-MIA CARDS\n%ccommander, tablet layout (${VERSION})`,
  "color: green; font-weight: bold;",
  "",
);

offerReload("Casa Mia", "casa_mia/cards", VERSION);

watchForGoodbye();
