// A list of Lovelace cards being edited (cards-editor.ts): what can be worked out without
// a page, kept apart so it can be tested without one.
import type { CardConfig } from "./ha.ts";

/** The list with the card at `i` moved `by` places, kept within the list. */
export function moved(cards: CardConfig[], i: number, by: number): CardConfig[] {
  const to = Math.max(0, Math.min(cards.length - 1, i + by));
  const out = [...cards];
  out.splice(to, 0, ...out.splice(i, 1));
  return out;
}

/** A card's name on its chip: a custom card's own (window.customCards), else its type in
 * words ("weather-forecast" is "Weather forecast"). */
export function nameOf(card: CardConfig, custom: { type: string; name?: string }[] = (globalThis as any).customCards ?? []): string {
  const type = String(card.type ?? "");
  const own = type.startsWith("custom:") ? custom.find((c) => `custom:${c.type}` === type)?.name : undefined;
  const words = type.replace(/^custom:/, "").replaceAll("-", " ");
  return own ?? (words ? words[0].toUpperCase() + words.slice(1) : "A card");
}
