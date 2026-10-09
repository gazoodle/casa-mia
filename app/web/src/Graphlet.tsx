/** A graphlet: a small history graph, for any page. A status dot, a title and the value
 * now; the latest samples as columns of squares (square, newest at the right: the
 * room it is given decides how much history shows), each column its series stacked from the
 * bottom (each series its colour), against a scale whose top and bottom are labelled; and
 * a legend when there is more than one series. It knows nothing of what it shows: it is
 * given its series, scale and words. */

import css from "./graphlet.module.css";

export type Series = {
  name: string;
  /** Any CSS colour (a theme token such as var(--accent) keeps light and dark right). */
  color: string;
  /** One value a sample, oldest first, in the scale's units. */
  values: number[];
};

export function Graphlet({
  title,
  value,
  series,
  max,
  top,
  bottom = "0",
  tone = "good",
  rows = 8,
}: {
  title: string;
  /** The value now, as words ("12%", "1.4 GB free"). */
  value: string;
  series: Series[];
  /** The scale's top, in the series' units (the bottom is 0). */
  max: number;
  /** The scale's labels. */
  top: string;
  bottom?: string;
  /** The dot: all well, a warning, or bad. */
  tone?: "good" | "warn" | "bad";
  /** Squares a column. */
  rows?: number;
}) {
  const length = Math.max(0, ...series.map((s) => s.values.length));
  // Each column: the series stacked, in whole squares, from the bottom.
  const cells: (string | null)[][] = Array.from({ length }, (_, i) => {
    const column: (string | null)[] = Array(rows).fill(null);
    let filled = 0;
    let sum = 0;
    for (const s of series) {
      sum += Math.max(0, s.values[i] ?? 0);
      const upTo = Math.min(rows, Math.round((sum / (max || 1)) * rows));
      for (let r = filled; r < upTo; r++) column[r] = s.color;
      filled = Math.max(filled, upTo);
    }
    return column;
  });
  return (
    <div className={css.graphlet}>
      <span className={`${css.dot} ${css[tone]}`} aria-hidden="true" />
      <div className={css.words}>
        <strong>{title}</strong>
        <span>{value}</span>
        {series.length > 1 && (
          <span className={css.legend}>
            {series.map((s) => (
              <span key={s.name}>
                <i style={{ background: s.color }} aria-hidden="true" />
                {s.name}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className={css.graph}>
        <div className={css.grid} style={{ "--rows": rows } as React.CSSProperties} role="img" aria-label={`${title}: ${value}`}>
          {cells.map((column, c) => (
            <div key={c} className={css.column}>
              {column.map((color, r) => (
                <span key={r} style={color ? { background: color } : undefined} />
              ))}
            </div>
          ))}
        </div>
        <div className={css.scale}>
          <span>{top}</span>
          <span>{bottom}</span>
        </div>
      </div>
    </div>
  );
}
