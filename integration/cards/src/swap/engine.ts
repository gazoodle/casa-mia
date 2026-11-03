/** The swap's rules, one engine: every rule's matches found in one pass over the text and
 * replaced, so a replacement is never replaced again. The twin of the app's
 * app/src/casa_mia/swap/engine.py, which says what the modes do; both must pass
 * tests/swap_cases.json. */

export const MODES = ["exact", "case", "regex"] as const;
export type Mode = (typeof MODES)[number];

export interface SwapRule {
  match: string;
  replace: string;
  mode?: Mode;
  enabled?: boolean;
}

/** A match to replace: where it starts and ends, and what replaces it. */
export type Span = [start: number, end: number, replacement: string];

const LETTERS = /\p{L}+/gu;

// In a regex rule's replacement: $$, $&, $1 to $99 and $<name>.
const TOKEN = /\$(?:(\$)|(&)|(\d\d?)|<([^>]*)>)/g;

/** Each run of letters capitalised, the rest of it lower case. */
const title = (text: string) =>
  text.replace(LETTERS, (word) => {
    const [first, ...rest] = word;
    return first.toUpperCase() + rest.join("").toLowerCase();
  });

/** `text` in the case of `found`: lower, Title, UPPER, or as written. */
function cased(found: string, text: string): string {
  const lower = found.toLowerCase();
  const upper = found.toUpperCase();
  if (found === lower && found === upper) return text; // no letters to go by
  if (found === lower) return text.toLowerCase();
  if (found === title(found)) return title(text); // before UPPER, so a lone "A" is Title
  if (found === upper) return text.toUpperCase();
  return text;
}

/** A regex rule's replacement for match `m`; a token naming no group stays as it is. */
function expand(template: string, m: RegExpExecArray): string {
  const groups = m.length - 1;
  return template.replace(TOKEN, (token, dollar, whole, num: string, name: string) => {
    if (dollar) return "$";
    if (whole) return m[0];
    if (num) {
      // $12 is group 12 when there is one, else group 1 and a "2"
      let n = Number(num);
      let rest = "";
      if (n > groups) [n, rest] = [Number(num[0]), num.slice(1)];
      return n > 0 && n <= groups ? (m[n] ?? "") + rest : token;
    }
    if (m.groups && name in m.groups) return m.groups[name] ?? "";
    return token;
  });
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A rule's compiled pattern; throws when it can't be. */
export function pattern(rule: SwapRule): RegExp {
  const { match, mode = "exact" } = rule;
  if (typeof match !== "string" || !match) throw new Error("nothing to match");
  if (mode === "regex") return new RegExp(match, "gu");
  if (!MODES.includes(mode)) throw new Error(`unknown mode '${mode}'`);
  // Not inside a longer word: no letter either side.
  return new RegExp(`(?<!\\p{L})${escape(match)}(?!\\p{L})`, mode === "case" ? "giu" : "gu");
}

/** The rule's first match at or after `pos` that matches something (never empty). */
function next(p: RegExp, text: string, pos: number): RegExpExecArray | null {
  while (pos <= text.length) {
    p.lastIndex = pos;
    const m = p.exec(text);
    if (!m || m[0].length) return m;
    pos = m.index + 1;
  }
  return null;
}

/** The enabled rules, compiled. A rule that won't compile is left out and listed in
 * `errors` (its index, why), for the caller to report. */
export class Rules {
  readonly errors: [number, string][] = [];
  private readonly rules: [RegExp, SwapRule][] = [];

  constructor(rules: SwapRule[]) {
    rules.forEach((rule, i) => {
      if (rule.enabled === false) return;
      try {
        this.rules.push([pattern(rule), rule]);
      } catch (err) {
        this.errors.push([i, String((err as Error).message ?? err)]);
      }
    });
  }

  private replacement(rule: SwapRule, m: RegExpExecArray): string {
    const text = String(rule.replace ?? "");
    if (rule.mode === "case") return cased(m[0], text);
    if (rule.mode === "regex") return expand(text, m);
    return text;
  }

  /** Each match to replace, in order. */
  *spans(text: string): Generator<Span> {
    const found = this.rules.map(([p]) => next(p, text, 0));
    let pos = 0;
    for (;;) {
      // Each rule's next match from pos; the earliest, then longest, then first rule.
      let best = -1;
      this.rules.forEach(([p], i) => {
        let m = found[i];
        if (m && m.index < pos) m = found[i] = next(p, text, pos);
        const b = best < 0 ? null : found[best]!;
        if (m && (!b || m.index < b.index || (m.index === b.index && m[0].length > b[0].length))) best = i;
      });
      if (best < 0) return;
      const m = found[best]!;
      const end = m.index + m[0].length;
      yield [m.index, end, this.replacement(this.rules[best][1], m)];
      pos = end;
    }
  }

  /** The text with every match replaced. */
  out(text: string): string {
    let out = "";
    let pos = 0;
    for (const [start, end, replacement] of this.spans(text)) {
      out += text.slice(pos, start) + replacement;
      pos = end;
    }
    return pos ? out + text.slice(pos) : text;
  }
}
