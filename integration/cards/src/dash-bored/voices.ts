// The voices: how each paper words the stories. A voice is data and nothing else: text
// with {placeholders} that stories.ts fills, and pools of headlines to take turns from.
// Keep it so. Then a settings page or a translation can replace any of it later without
// touching the ranking or the page. Each paper is a file of its own in voices/, to the
// shape in voices/voice.ts: a new one is another file there, an entry in VOICES below
// and a block of CSS (styles.ts).
import { DEGREES, type Device, type Kind } from "./house.ts";
import type { Alert, Billing, Notice, Story } from "./stories.ts";
import { NOMINAL, cap } from "./stories.ts";
import { broadsheet } from "./voices/broadsheet.ts";
import { rolling } from "./voices/rolling.ts";
import { tabloid } from "./voices/tabloid.ts";
import type { Told, Voice } from "./voices/voice.ts";

export type { Entry, Told, Voice } from "./voices/voice.ts";

export const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");

/** Where a setting that is shown as a device is put right, by the integration it comes
 * from. Instructions, so the same in every paper. */
export const FIXES: Record<string, string> = {
  esphome: "ESPHome. Add entity_category: config (or diagnostic) to each in its device's YAML",
  knx: "KNX. Add entity_category: config to each in the KNX YAML",
  "": "Give each the label Dash-Bored hide, or hide it in Home Assistant",
};

/** One story in a voice. `turn` moves on each time the story comes round again, so the
 * same headline is not used twice running. */
export function tell(voice: Voice, story: Story, turn: number): Told {
  const entry = voice.stories[`${story.kind}.${story.variant}`] ?? voice.stories[story.kind];
  const pool = entry.flavours?.[story.flavour] ?? entry.head;
  const worse = story.vars.escalated && entry.worse ? " " + entry.worse : "";
  return {
    kicker: entry.kicker,
    head: fill(pool[turn % pool.length], story.vars),
    deck: fill(entry.deck, story.vars),
    body: entry.body ? fill(story.vars.reading === "" && entry.plain ? entry.plain : entry.body, story.vars) + worse : "",
    act: story.press && entry.act ? entry.act : "",
    vote: story.vote && entry.vote ? entry.vote : "",
  };
}

/** A level as this paper says it: "80 per cent", or for a temperature "21°". */
export const amount = (voice: Voice, kind: Kind, level: number) => fill(voice.words[DEGREES.has(kind) ? "degrees" : "percent"], { n: String(level) });

/** One device as a clause, in three pieces: what comes before its level, the level, and
 * what comes after ("the ceiling light burns at ", "80 per cent", ""). The level is its
 * own piece so that the page can make it the thing to press to change it; with no level
 * the clause is all in the first. */
/** What a voice's sentences about one device are filled from. */
function named(d: Device) {
  // "Blinds - left" are plural too: it is the thing that counts, not which one.
  const name = d.name.toLowerCase();
  const lamp = /lamp|light/i.test(name) ? name : `${name} light`;
  const plural = /s$/i.test((d.kind === "light" ? lamp : name).split(" - ")[0]);
  // "Entrance" is a camera's name, and not what keeps watch.
  const camera = /cam/i.test(name) ? name : `${name} camera`;
  const alarm = /alarm/i.test(name) ? name : `${name} alarm`;
  return { name, lamp, camera, alarm, is: plural ? "are" : "is", v: plural ? "" : "s" };
}

/** The readers' poll on a device's level: a question, and the vote for less and for more. */
export function poll(voice: Voice, d: Device) {
  const { ask, less, more } = voice.polls[d.kind];
  return { ask: fill(ask, named(d)), less, more };
}

export function clause(voice: Voice, d: Device): [string, string, string] {
  // A phase has words of its own where the paper has any. A kind that has a level has a
  // plain way of being on, for when the level isn't known.
  const has = (state: string) => `${d.kind}.${state}` in voice.words;
  const state = d.away ? "away" : d.phase && has(d.phase) ? `${d.kind}.${d.phase}` : !d.on ? `${d.kind}.off` : d.level === undefined && has("plain") ? `${d.kind}.plain` : `${d.kind}.on`;
  const said = fill(voice.words[state], { ...named(d), level: "\0" });
  // "The ann's lamp" is "ann's lamp".
  const [before, after] = said.replace(/^the (?=\S+['’]s )/, "").split("\0");
  return after === undefined ? [before, "", ""] : [before, amount(voice, d.kind, d.level!), after];
}

/** One device as a clause: "the ceiling light burns at 80 per cent". */
export const words = (voice: Voice, d: Device) => clause(voice, d).join("");

/** The weather as this paper says it. A condition the paper has no word for is given as Home Assistant has it. */
export const sky = (voice: Voice, condition: string) => voice.skies[condition] ?? cap(condition.replace(/[-_]/g, " "));

/** A line of the celebrity column: what was played, and what each person said of it. */
export function billed(voice: Voice, b: Billing): [string, string[]] {
  const song = fill(b.vars.artist ? voice.personal.song : voice.personal.tune, b.vars);
  return [fill(voice.celebrity[b.live ? `${b.kind}.live` : b.kind], { ...b.vars, song }), b.marks.map((r) => fill(voice.celebrity[r.kind], { name: r.name }))];
}

/** A line of the Personal column. */
export function announce(voice: Voice, notice: Notice): string {
  const song = fill(notice.vars.artist ? voice.personal.song : voice.personal.tune, notice.vars);
  return fill(voice.personal[notice.kind], { ...notice.vars, song });
}

/** An alert as a line of late news. */
export const wired = (voice: Voice, a: Alert) =>
  fill(a.level === NOMINAL ? voice.wire.clear : voice.wire.trouble, { name: a.name, message: a.message || a.level, level: a.level.toUpperCase() });

export const VOICES: Record<string, Voice> = { broadsheet, tabloid, rolling };
