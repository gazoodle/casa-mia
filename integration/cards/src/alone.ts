// Tablet Layout, garnish and the Over layer by themselves, one file
// (casa-mia-tablet-layout.js) published as a dashboard plugin for a house without Casa Mia
// (docs/design/marketplace-mirrors.md). The same sources as cm-cards.js (main.ts), without
// the cards that need the app. Alone, Casa Mia's two settings for them are on (own.ts).
import { claim } from "./own.ts";
import "./view/index.ts";
import "./garnish-editor.ts";
import "./garnish-sections.ts";
import "./screen-condition.ts";
import "./over-layer/index.ts";

// The marker is kept whole in the built file, where its version is stamped.
const STAMP = __CM_STAMP__;
const VERSION = STAMP.slice(STAMP.indexOf("@") + 1);

console.info(`%cCASA-MIA TABLET LAYOUT%c ${VERSION}`, "color: green; font-weight: bold;", "");

claim(`casa-mia-tablet-layout.js ${VERSION}`);
