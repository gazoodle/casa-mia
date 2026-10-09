// A panel's cards: content keeps it open, garnish dresses it without holding it open; and
// which kinds fill it on their own.
import type { CardConfig } from "./ha.ts";

export const counts = (card: CardConfig) => card.view_layout?.garnish !== true;

/** A section's content (HA's cards, badges, sections: each `hidden` while its visibility
 * hides it, `config` its config) of which all that shows is garnish: HA hides a section
 * whose content is all hidden; with garnish, one left with only garnish showing hides too.
 * False when nothing shows (HA's own rule has hidden it) or nothing is in it. */
export const onlyGarnish = (content: { hidden?: boolean; config?: CardConfig }[]): boolean => {
  const shown = content.filter((c) => !c.hidden);
  return shown.length > 0 && shown.every((c) => !!c.config && !counts(c.config));
};

/** Whether an element is inside a Tablet Layout view (through shadow roots), whose panels
 * have their own rule for showing (view.ts). */
export function inTablet(el: Element): boolean {
  for (let n: Node | null = el; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null))
    if (["CASA-MIA-TABLET-LAYOUT", "CASA-MIA-TABLET-VIEW"].includes((n as Element).tagName)) return true;
  return false;
}

/** Card types made to fill a panel on their own: cameras, pictures, maps, pages. A lone
 * tile or button keeps its own size, as in any Sections view. */
const FILLERS = new Set([
  "custom:casa-mia-commander",
  "picture",
  "picture-entity",
  "picture-glance",
  "map",
  "iframe",
  "custom:advanced-camera-card",
  "custom:webrtc-camera",
]);

/** Whether a card alone in its panel fills it: its `view_layout: {fill}`, else its type. */
export const fills = (card: CardConfig): boolean => card.view_layout?.fill ?? FILLERS.has(card.type);

/** Set or clear a card's garnish, keeping its other layout options. */
export function setGarnish(card: CardConfig, on: boolean): CardConfig {
  const { view_layout: old = {}, ...rest } = card;
  const { garnish: _garnish, ...layout } = old;
  if (on) layout.garnish = true;
  return { ...rest, ...(Object.keys(layout).length && { view_layout: layout }) };
}

/** HA's card path: numeric view/section/card indices, or its newer property path. */
export function cardPath(path: (string | number)[]): (string | number)[] {
  if (path.length === 3 && path.every((p) => typeof p === "number")) return ["views", path[0], "sections", path[1], "cards", path[2]];
  return path[0] === "views" ? path : ["views", ...path];
}
