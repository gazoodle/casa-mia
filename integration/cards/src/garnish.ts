// A panel's content keeps it open; garnish dresses it without holding it open.
import type { CardConfig } from "./ha.ts";

export const counts = (card: CardConfig) => card.view_layout?.garnish !== true && card.view_layout?.counts !== false;

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
