// A route left for the admin page by Home Assistant's own page (the eye in an entity's
// dialog, in the integration's cm-cards.js, which imports this file too). HA's app panel
// loads the page at its base, dropping any #route, but the page is on HA's origin, so the
// route comes through the browser's storage: written there, taken once here, and only
// while fresh.

export const OPEN = "casa-mia:open";
const FRESH = 60_000; // ms

/** The note asking the page to open an entity's watch (new or not); `at` also makes each
 * ask a new route, so the same entity asked twice opens twice. */
export function openNote(entityId: string, at: number): string {
  return JSON.stringify({ hash: `#/sensor-watch?watch=${encodeURIComponent(entityId)}&at=${at}`, at });
}

/** Go where a fresh note asks, once. */
export function takeOpen(): void {
  try {
    const note = localStorage.getItem(OPEN);
    if (!note) return;
    localStorage.removeItem(OPEN);
    const { hash, at } = JSON.parse(note);
    if (typeof hash === "string" && hash.startsWith("#/") && Date.now() - at < FRESH) location.hash = hash;
  } catch (err) {
    console.warn(`Casa Mia: couldn't read the route left by Home Assistant's page (${err})`);
  }
}
