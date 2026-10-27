/** A sensor's history with its bands shaded behind it, so a suggestion (or an edit) can
 * be checked against what the sensor really did. */

import { margin, type Accuracy, type Band } from "./common";
import css from "./sensor-watch.module.css";

const W = 600;
const H = 160;

export function HistoryChart({ points, bands, unit, accuracy }: { points: [number, number][]; bands: Band[]; unit: string; accuracy?: Accuracy }) {
  if (points.length < 2) return <p className={css.note}>Not enough history to draw.</p>;
  const values = points.map((p) => p[1]);
  const edges = bands.flatMap((b) => [b.from, b.to]).filter((v): v is number => v !== null);
  let low = Math.min(...values);
  let high = Math.max(...values);
  // Show the bands near the data too, but not so far that the line goes flat.
  const reach = (high - low || Math.abs(high) || 1) * 0.6;
  for (const e of edges) if (e >= low - reach && e <= high + reach) [low, high] = [Math.min(low, e), Math.max(high, e)];
  const pad = (high - low || 1) * 0.06;
  low -= pad;
  high += pad;
  const t0 = points[0][0];
  const t1 = points[points.length - 1][0];
  const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * W;
  const y = (v: number) => H - ((v - low) / (high - low)) * H;
  const line = points.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <figure className={css.chart}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="History, with the bands behind it">
        {bands.map((b, i) => {
          const top = y(Math.min(b.to ?? high, high));
          const bottom = y(Math.max(b.from ?? low, low));
          return bottom > top ? <rect key={i} x={0} width={W} y={top} height={bottom - top} className={css[`band_${b.level}`]} /> : null;
        })}
        {[...new Set(edges)].map((e) => {
          const m = margin(e, accuracy);
          const top = y(Math.min(e + m, high));
          const bottom = y(Math.max(e - m, low));
          return m > 0 && bottom > top ? <rect key={`m${e}`} x={0} width={W} y={top} height={bottom - top} className={css.margin} /> : null;
        })}
        <polyline points={line} className={css.line} vectorEffect="non-scaling-stroke" />
      </svg>
      {/* Each value where it is: the top's at the top, the bottom's under the chart. */}
      <span className={css.axisTop}>
        {high.toPrecision(4)} {unit}
      </span>
      <figcaption className={css.axis}>
        <span>
          {low.toPrecision(4)} {unit}
        </span>
        <span>
          {new Date(t0).toLocaleDateString()} – {new Date(t1).toLocaleDateString()}
        </span>
      </figcaption>
    </figure>
  );
}
