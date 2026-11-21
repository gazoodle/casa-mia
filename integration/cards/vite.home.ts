import { readFileSync } from "node:fs";

// Where a bundle's cards send people for help: Home Assistant's card picker links each card
// to its `documentationURL` (register in src/ha.ts). A component published by itself has
// its own repository, and its cards point there, not at Casa Mia (Frenck, reviewing
// hacs/default#14085, 2026-11-20). An integration's is its manifest's `documentation`, so
// it is said once.
export const home = (url: string) => ({ __CM_HOME__: JSON.stringify(url) });
export const homeOf = (domain: string) =>
  home(JSON.parse(readFileSync(`../custom_components/${domain}/manifest.json`, "utf8")).documentation);
