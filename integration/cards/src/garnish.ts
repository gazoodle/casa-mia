// A panel's cards: content keeps it open, garnish dresses it without holding it open; and
// which kinds fill it on their own.
import type { CardConfig } from "./ha.ts";

export const counts = (card: CardConfig) => card.view_layout?.garnish !== true && card.view_layout?.counts !== false;

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

/** Write only the new spelling, retaining the card's other layout options. */
export function setGarnish(card: CardConfig, on: boolean): CardConfig {
  const { view_layout: old = {}, ...rest } = card;
  const { counts: _counts, garnish: _garnish, ...layout } = old;
  if (on) layout.garnish = true;
  return { ...rest, ...(Object.keys(layout).length && { view_layout: layout }) };
}

/** HA's card path: numeric view/section/card indices, or its newer property path. */
export function cardPath(path: (string | number)[]): (string | number)[] {
  if (path.length === 3 && path.every((p) => typeof p === "number")) return ["views", path[0], "sections", path[1], "cards", path[2]];
  return path[0] === "views" ? path : ["views", ...path];
}
