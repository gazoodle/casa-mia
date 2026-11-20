// What this file can know by itself, with no Casa Mia integration to ask. Tablet Layout,
// garnish and the Over layer are in two files from these same sources: cm-cards.js, which
// Casa Mia's integration loads, and casa-mia-tablet-layout.js, published by itself as a
// dashboard plugin (alone.ts) for a house without Casa Mia.

/** This is the file published by itself. It is also the answer for the two dashboard
 * settings Casa Mia's Settings page has, when no integration answers: alone, garnish on
 * every Sections dashboard and the screen orientation conditions are both on, with
 * nothing to set (owner, 2026-11-18). They are not parameters on the file's address,
 * because HACS replaces that address at every update. In cm-cards.js both are off without
 * the integration, as they were before there was a second file. */
export const ALONE = new URL(import.meta.url).pathname.includes("casa-mia-tablet-layout");

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
