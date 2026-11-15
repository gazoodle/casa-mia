// What the house's own agent has written about it, where the house runs ZenOS-AI
// (github.com/nathan-curtis/zenos-ai). Its summarizers reduce each part of the house to a
// "Kata", a summary in a fixed shape, and the whole house to one "zen_summary". Both are
// drawers in the attributes of one sensor, so they reach a page as its state changes.
// Nothing here needs ZenOS: a house without it has no such sensor, and no column.

/** The label ZenOS gives the sensor that holds the Katas. */
export const KATAS = "zen_kata_cabinet";
/** And the one that holds what each part of the house is: its name, and its tier. */
export const DOJO = "zen_dojo_cabinet";
/** Where ZenOS keeps its agent's name: the column's by-line. */
export const PERSONA = "input_text.zenos_persona_name";
const WHOLE = "zen_summary";
// The whole-house piece is rewritten at least four times an hour. One older than this
// is not how the house stands now, and the column says since when.
const FRESH = 60 * 60_000;
const UNSURE = 0.5; // a model's own confidence below this is said beside what it wrote

/** One part of the house, as the agent sees it. `failed`: it wrote no account, and the
 * text is its reason. */
export type Piece = { id: string; name: string; text: string; attention?: string; urgency: number; unsure: boolean; failed: boolean; at: number };
export type Lead = { text: string; attention?: string; objective?: string; urgency: number; unsure: boolean; errors: string[]; at: number };
export type Desk = { by?: string; lead?: Lead; pieces: Piece[] };

const said = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const sure = (v: unknown) => (Number(v) || 0) < UNSURE;
const titled = (id: string) => id[0].toUpperCase() + id.slice(1).replace(/_/g, " ");

/** Whether the whole-house piece is too old to be how things stand. */
export const lapsed = (lead: Lead, now: number) => now - lead.at > FRESH;

type Cabinet = { attributes?: Record<string, any> };

/** The agent's column, from the Kata sensor's state, the agent's name and the sensor that
 * says what each part is. Undefined where there is no Kata sensor, or it holds nothing
 * that says anything. */
export function filed(cabinet?: Cabinet, persona?: string, dojo?: Cabinet): Desk | undefined {
  const drawers = cabinet?.attributes?.variables;
  if (!drawers || typeof drawers !== "object") return undefined;
  const parts = dojo?.attributes?.variables ?? {};

  const pieces = Object.entries<any>(drawers)
    .flatMap(([id, drawer]): Piece[] => {
      // A component's Kata is known by its shape. ZenOS's own bookkeeping and its
      // templates are drawers in the same cabinet, and have none of it at the top.
      const kata = drawer?.value;
      if (id.startsWith("_") || !kata || typeof kata !== "object" || !("watchlist" in kata)) return [];
      // ZenOS's account of itself (its pipeline, its index of the others) is no news of the house.
      const part = parts[id]?.value;
      if (id.startsWith("zen_") || part?.pipeline_tier === "system") return [];
      // A run that found nothing to read writes a Kata of nulls: nothing to print. One
      // that says why it has nothing is printed as that, not passed over.
      const text = said(kata.subjective) ?? said(kata.general_inference) ?? said(kata.attention);
      const error = said(kata.error);
      if (!text && !error) return [];
      const attention = said(kata.attention);
      return [{ id, name: said(part?.friendly_name) ?? titled(id), text: text ?? error!, attention: text && attention !== text ? attention : undefined, urgency: Number(kata.urgency) || 0, unsure: sure(kata.confidence), failed: !text, at: Date.parse(drawer.timestamp) || 0 }];
    })
    .sort((a, b) => b.urgency - a.urgency || b.at - a.at);

  const whole = drawers[WHOLE]?.value?.zen_summary;
  const text = said(whole?.summary);
  const lead: Lead | undefined = text
    ? { text, attention: said(whole.attention), objective: said(whole.objective), urgency: Number(whole.urgency) || 0, unsure: sure(whole.confidence), errors: (Array.isArray(whole.errors) ? whole.errors : []).flatMap((e: unknown) => said(e) ?? []), at: Date.parse(whole.timestamp ?? drawers[WHOLE].timestamp) || 0 }
    : undefined;
  if (!lead && !pieces.length) return undefined;

  const by = said(persona);
  return { by: by === "unknown" || by === "unavailable" ? undefined : by, lead, pieces };
}
