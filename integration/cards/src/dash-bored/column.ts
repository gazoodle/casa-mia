// The agent's column, where the house runs ZenOS-AI (github.com/nathan-curtis/zenos-ai).
// Dash-Bored's integration has a model write it from what the house's agent has written
// about it, once per new summary and in each paper's voice (column.py), and feeds it to
// the page. Nothing here reads ZenOS.

/** One paper's column: its headline, the body's paragraphs, and up to three items. */
export type Paper = { head: string; body: string[]; items: string[] };
/** The column as the feed tells it, its times in seconds. Empty where the house has none
 * (no ZenOS, or switched off). `at`: the time of the summary it was written from;
 * `writing`: since when a newer one has been under way; `late`: why there is no newer one. */
export type Column = { by?: string | null; at?: number | null; papers?: Record<string, Paper> | null; writing?: number | null; late?: { reason: string; since: number } | null };
/** What the desk prints for one paper, its times in ms. No `paper`: the copy is awaited. */
export type Desk = { by?: string; paper?: Paper; at?: number; lapsed: boolean; writing?: number; late?: { reason: string; since: number } };

// ZenOS writes the summary at least four times an hour. A column from one older than
// this is not how the house stands now, and the desk says since when.
const FRESH = 60 * 60_000;
const ms = (s?: number | null) => (s ? s * 1000 : undefined);

/** The desk for the paper in `style`, or undefined where the house has no column. */
export function desk(column: Column | undefined, style: string, now: number): Desk | undefined {
  if (!column || !("papers" in column)) return undefined;
  const paper = column.papers?.[style];
  const at = paper ? ms(column.at) : undefined;
  return {
    by: column.by ?? undefined,
    paper,
    at,
    lapsed: !!at && now - at > FRESH,
    writing: ms(column.writing),
    late: column.late ? { reason: column.late.reason, since: column.late.since * 1000 } : undefined,
  };
}
