// What this file can know by itself, with no Casa Mia integration to ask. Tablet Layout,
// garnish and the Over layer are in two files from these same sources: cm-cards.js, which
// Casa Mia's integration loads, and casa-mia-tablet-layout.js, published by itself as a
// dashboard plugin (alone.ts) for a house without Casa Mia.
const url = new URL(import.meta.url);

/** This is the file published by itself. */
export const ALONE = url.pathname.includes("casa-mia-tablet-layout");

/** The dashboard settings to use when the integration doesn't answer. Casa Mia's Settings
 * page has them otherwise; alone, they are on the file's own address in the dashboard's
 * resources (`…/casa-mia-tablet-layout.js?garnish_everywhere=1&screen_orientation=0`).
 * In cm-cards.js both are off, as they were before there was a second file. */
export const OWN = {
  garnish_everywhere: url.searchParams.get("garnish_everywhere") === "1",
  screen_orientation: ALONE && url.searchParams.get("screen_orientation") !== "0",
};

/** Says which file is in charge when both are loaded: the first one defines the elements
 * (ha.ts `define` leaves a tag that is taken), so the other is running nothing. */
export function claim(source: string): void {
  const w = window as any;
  const first = (w.casaMiaLayout ||= source);
  if (first !== source)
    console.warn(
      `CASA-MIA CARDS: ${source} loaded after ${first}, which is the Tablet Layout in use.` +
        " Remove casa-mia-tablet-layout.js from the dashboard resources: Casa Mia has its own copy.",
    );
}
