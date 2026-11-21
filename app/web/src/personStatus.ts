/** The line under each person on the People page: what their date of birth says, in
 * words that use their pronouns ("She is 42, and turns 43 in 12 days, on 3 December.").
 * The app works out the age and the days to the birthday (people.about(), as the People
 * action does), so the 29 February rule lives in one place; this only words them. No
 * imports, so node runs it as it is (tests/test_person_status.py). */

export type Pronouns = { subject: string; object: string; determiner: string; possessive: string; reflexive: string; plural: boolean };

/** What the app says of a person beside the record (people.about()). */
export type About = { pronouns: Pronouns; age: number | null; days_to_birthday: number | null };

/** Within this many days, a birthday says how many days off it is; past it, only the date. */
const SOON = 31;

const ORDINAL = new Intl.PluralRules("en-GB", { type: "ordinal" });
const SUFFIX: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long" });

/** The year, month and day of a stored date of birth (1984, 1984-03, 1984-03-07 or --03-07),
 * as the dialog's fields hold them: "" for each part unknown. */
export function bornParts(born: string | null) {
  const m = /^(\d{4}|-)(?:-(\d\d)(?:-(\d\d))?)?$/.exec(born ?? "");
  return { year: m && m[1] !== "-" ? m[1] : "", month: m?.[2] ? String(+m[2]) : "", day: m?.[3] ? String(+m[3]) : "" };
}

const ordinal = (n: number) => `${n}${SUFFIX[ORDINAL.select(n)]}`;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The sentence for a person, or null when nothing of their date of birth is known. */
export function personStatus(born: string | null, about: About, today: Date = new Date()): string | null {
  const parts = bornParts(born);
  const [year, month, day] = [Number(parts.year), Number(parts.month), Number(parts.day)];
  const { pronouns: p, age, days_to_birthday: days } = about;

  // The words that follow the pronouns: "she is", "they are", "xe turns", "they turn".
  const they = capital(p.subject);
  const their = p.determiner;
  const is = p.plural ? "are" : "is";
  const was = p.plural ? "were" : "was";
  const turns = p.plural ? "turn" : "turns";
  // The next birthday's own date, from the app's count: 1 March for 29 February in
  // other years, as the count has it.
  const next = days === null ? "" : DAY_MONTH.format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days));

  // The whole date: the age now, and the birthday.
  if (year && day && age !== null && days !== null) {
    if (days === 0) return age === 0 ? `${they} ${was} born today.` : `It's ${their} ${ordinal(age)} birthday today.`;
    const now = age === 0 ? `${they} ${is} under a year old` : `${they} ${is} ${age}`;
    if (days === 1) return `${now}, and ${turns} ${age + 1} tomorrow.`;
    if (days <= SOON) return `${now}, and ${turns} ${age + 1} in ${days} days, on ${next}.`;
    return `${now}. ${capital(their)} next birthday is on ${next}.`;
  }

  // The year, with or without the month: the age they reach this year, which a year
  // alone can't put more exactly than that.
  if (year) {
    const reach = today.getFullYear() - year;
    const thisMonth = today.getMonth() + 1;
    const named = month ? MONTH.format(new Date(2000, month - 1, 1)) : "";
    if (!month) return reach === 0 ? `${they} ${was} born this year.` : `${they} ${turns} ${reach} this year.`;
    if (reach === 0) return `${they} ${was} born ${month === thisMonth ? "this month" : `in ${named}`}.`;
    if (month === thisMonth) return `${they} ${turns} ${reach} this month.`;
    return month > thisMonth ? `${they} ${turns} ${reach} in ${named}.` : `${they} turned ${reach} in ${named}.`;
  }

  // The day and month: a birthday with no age.
  if (day && days !== null) {
    if (days === 0) return `It's ${their} birthday today.`;
    if (days === 1) return `${capital(their)} birthday is tomorrow.`;
    return `${capital(their)} birthday is on ${next}${days <= SOON ? `, in ${days} days` : ""}.`;
  }
  return null;
}
