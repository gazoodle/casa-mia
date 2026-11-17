// Tablet Layout, garnish and the Over layer by themselves, one file
// (casa-mia-tablet-layout.js) published as a dashboard plugin for a house without Casa Mia
// (docs/design/marketplace-mirrors.md). The same sources as cm-cards.js (main.ts), without
// the cards that need the app. Casa Mia's settings for them come from own.ts.
import { claim } from "./own.ts";
import "./view/index.ts";
import "./garnish-editor.ts";
import "./garnish-sections.ts";
import "./screen-condition.ts";
import "./over-layer/index.ts";

console.info("%cCASA-MIA TABLET LAYOUT", "color: green; font-weight: bold;");

claim("casa-mia-tablet-layout.js");
