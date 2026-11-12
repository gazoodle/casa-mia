// How a commander's camera names look, and where its Talk chips go: the same settings the
// compositor draws the names from (app/src/casa_mia/modules/compositor/labels.py), for
// what the browser draws itself: the Camera Commander card's caption over a live main
// camera and its Talk chips, and the admin page's preview. The options and their
// defaults are labels.json's.
import LABELS from "../../../app/src/casa_mia/labels.json" with { type: "json" };

export const OPTIONS = LABELS.labels;
/** A font's file in the casa_mia component's www/fonts ("standard" has none: it is the
 * compositor's built-in font, and the browser's own sans-serif here). */
export const FILES: Record<string, string> = LABELS.fonts;

export type Style = "bar" | "pill" | "none";
export type Place = "top-left" | "top-centre" | "top-right" | "bottom-left" | "bottom-centre" | "bottom-right";
export type Labels = {
  font: string;
  tile_size: number;
  main_size: number;
  colour: string;
  tint: string;
  opacity: number;
  tile_style: Style;
  main_style: Style;
  talk_status: Place;
  talk_status_x: number;
  talk_status_y: number;
  talk_buttons: Place;
  talk_buttons_x: number;
  talk_buttons_y: number;
};

export const DEFAULTS = Object.fromEntries(Object.entries(OPTIONS).map(([k, o]) => [k, o.default])) as unknown as Labels;

/** A commander's labels, each setting it lacks at its default (one saved before there
 * were any has none). */
export const labelsOf = (own?: Partial<Labels> | null): Labels => ({ ...DEFAULTS, ...own });

const face = (font: string) => `Casa Mia ${font}`;

/** The CSS font family of a font. */
export const family = (font: string) => (font in FILES ? `"${face(font)}", sans-serif` : "sans-serif");

/** The background behind a name, as a CSS colour: its tint at its opacity. */
export function back(l: Labels): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(l.tint.slice(i, i + 2), 16));
  return `rgb(${r} ${g} ${b} / ${l.opacity / 100})`;
}

const asked = new Set<string>();
/** Have the page load a font's file, once: `url` gives a file's address (the card's is
 * Home Assistant's, the admin page's the app's). A file that won't load is said in
 * the console, and the name is then in the browser's sans-serif. */
export function useFont(font: string, url: (file: string) => string): void {
  if (!(font in FILES) || asked.has(font) || typeof FontFace === "undefined") return;
  asked.add(font);
  const loading = new FontFace(face(font), `url("${url(FILES[font])}")`);
  document.fonts.add(loading);
  loading.load().catch((err: unknown) => console.warn(`casa-mia: the label font ${font} (${url(FILES[font])}) didn't load: ${err}`));
}

/** The edge of the main camera the chips keep clear of, px. */
const EDGE = 10;

/** How far up from the main camera's foot chips at `place` sit, px: clear of its name
 * when that is a bar across the foot, or a pill in the same corner. */
export function footOf(l: Labels, place: Place): number {
  if (l.main_style === "bar") return Math.round(l.main_size * 1.9) + 6;
  if (l.main_style === "pill" && place === "bottom-left") return EDGE + Math.round(l.main_size * 1.2) + 4 + 6;
  return EDGE;
}

/** Where a group of chips goes over the main camera, as CSS: its corner, and which way
 * its rows gather (--cm-just). */
export function corner(place: Place, foot = EDGE): Record<string, string> {
  const [v, h] = place.split("-");
  const across: Record<string, Record<string, string>> = {
    left: { left: `${EDGE}px`, alignItems: "flex-start", "--cm-just": "flex-start" },
    centre: { left: "50%", transform: "translateX(-50%)", alignItems: "center", "--cm-just": "center" },
    right: { right: `${EDGE}px`, alignItems: "flex-end", "--cm-just": "flex-end" },
  };
  return { ...(v === "top" ? { top: `${EDGE}px` } : { bottom: `${foot}px` }), ...across[h] };
}

/** A group of chips moved from its corner by its nudge, as CSS: across (to the right)
 * and down, in px. */
export const nudge = (l: Labels, which: "talk_status" | "talk_buttons"): Record<string, string> => ({
  transform: `translate(${l[`${which}_x`]}px, ${l[`${which}_y`]}px)`,
});

/** The part of a cropped main camera that is kept (a commander's `main_keep`): the option. */
export const KEEP = LABELS.picture.main_keep;

/** Where a cropped main camera is cropped about, as CSS object-position: the compositor's
 * `keep` (labels.py). "0% 0%" keeps the top left; the middle when none is set. */
export function keepPosition(part: string = KEEP.default): string {
  const across = part.includes("left") ? 0 : part.includes("right") ? 100 : 50;
  const down = part.includes("top") ? 0 : part.includes("bottom") ? 100 : 50;
  return `${across}% ${down}%`;
}
