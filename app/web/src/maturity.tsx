/** A module's maturity, from the one list (casa_mia/maturity.json, also written into the
 * app's option descriptions and the docs by tools/maturity.py). */

import MATURITY from "../../src/casa_mia/maturity.json";
import css from "./maturity.module.css";

type Level = keyof typeof MATURITY.levels;

/** The level's name, with its meaning written out beside it (`full`) or as a tooltip. */
export function Maturity({ module, full }: { module?: string; full?: boolean }) {
  const id = (MATURITY.modules as Record<string, { level: Level }>)[module ?? ""]?.level;
  if (!id) return null;
  const { name, meaning } = MATURITY.levels[id];
  const chip = (
    <span className={`${css.chip} ${css[id]}`} title={full ? undefined : meaning}>
      {name}
    </span>
  );
  return full ? (
    <p className={css.line}>
      {chip} {meaning}
    </p>
  ) : (
    chip
  );
}
