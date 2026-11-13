// The voices: how each paper words the stories. A voice is data and nothing else: text
// with {placeholders} that stories.ts fills, and pools of headlines to take turns from.
// Keep it so. Then a settings page or a translation can replace any of it later without
// touching the ranking or the page, and a new paper is one more entry here and a block
// of CSS (styles.ts).
import type { Device } from "./house.ts";
import type { Alert, Story } from "./stories.ts";
import { NOMINAL } from "./stories.ts";

/** How one kind of story is told. `flavours` are headlines for a particular sort of
 * sensor; `plain` is the body for a sensor with no reading to quote (one that is only
 * on or off); `worse` is added to the body when the trouble has escalated. */
export type Entry = { kicker: string; head: string[]; flavours?: Record<string, string[]>; deck: string; body?: string; plain?: string; worse?: string; act?: string };
export type Voice = {
  label: string; // on the button that chooses it
  name: string; // the masthead
  strap: string;
  price: string;
  flash: string; // the word before breaking news
  titles: { more: string; briefs: string; late: string; temps: string; board: string; notices: string; elsewhere: string; gaps: string }; // elsewhere: the rooms on no floor
  join: string; // between a room's devices
  end: string;
  nothing: string; // the late news before anything has happened
  rest: string; // a big house: the rooms with nothing to report, counted
  gaps: Record<string, string>; // what Home Assistant isn't told about the house, by a Gap's kind, counted
  mend: string; // under them: what to do about it
  words: Record<string, string>; // one device, by `kind.state`; `kind.many` is a room's count of them, in a big house
  wire: { trouble: string; clear: string }; // an alert in the late news
  notices: string[]; // under each scene, in turn
  stories: Record<string, Entry>; // by `kind.variant`, else `kind`
};
export type Told = { kicker: string; head: string; deck: string; body: string; act: string };

export const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");

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
  };
}

/** One device as a clause: "the ceiling light burns at 80 per cent". */
export function words(voice: Voice, d: Device): string {
  // "Blinds - left" are plural too: it is the thing that counts, not which one.
  const name = d.name.toLowerCase();
  const lamp = /lamp|light/i.test(name) ? name : `${name} light`;
  const plural = /s$/i.test((d.kind === "light" ? lamp : name).split(" - ")[0]);
  const state = d.away ? "away" : !d.on ? `${d.kind}.off` : d.level === undefined && (d.kind === "light" || d.kind === "cover") ? `${d.kind}.plain` : `${d.kind}.on`;
  const said = fill(voice.words[state], { name, lamp, level: String(d.level ?? ""), is: plural ? "are" : "is", v: plural ? "" : "s" });
  // "The ann's lamp" is "ann's lamp".
  return said.replace(/^the (?=\S+['’]s )/, "");
}

/** An alert as a line of late news. */
export const wired = (voice: Voice, a: Alert) =>
  fill(a.level === NOMINAL ? voice.wire.clear : voice.wire.trouble, { name: a.name, message: a.message || a.level, level: a.level.toUpperCase() });

// A sensor in trouble, in each paper: the same telling at every level but for its kicker.
const ALARM: Entry = { kicker: "Stop press", head: ["{name} gives cause for alarm"], deck: "{message}",
  body: "The reading stood at {reading} in the {area} as this edition went to press, and the trouble dates from {since}.",
  plain: "The trouble in the {area} dates from {since}.", worse: "Matters have worsened since our earlier report." };
const SHOCK: Entry = { kicker: "Red alert", head: ["{name} shock", "{name} drama", "It's all kicking off"],
  flavours: { temperature: ["Meltdown!", "Hot stuff", "Too hot to handle"], moisture: ["Sink or swim", "What a drip", "Leak shock"], opening: ["Open season", "Draught dodgers", "Wide open"],
    battery: ["Flat out", "Out of juice", "Running on empty"], smoke: ["Smoke alarm!", "Up in smoke"] },
  deck: "{name}: {message}", body: "It's {reading} in the {area} and it's been going on since {since}.", plain: "It's been going on in the {area} since {since}.", worse: "And it's getting WORSE." };

const broadsheet: Voice = {
  label: "Broadsheet",
  name: "The Casa Courier",
  strap: "",
  price: "Price: nothing",
  flash: "Stop press",
  titles: { more: "Other news", briefs: "In brief", late: "Late news", temps: "The temperatures", board: "The switchboard", notices: "Notices", elsewhere: "Elsewhere", gaps: "Corrections and clarifications" },
  join: "; ",
  end: ".",
  nothing: "Nothing has happened yet.",
  rest: "In {n_word} room{s} nothing is switched on.",
  gaps: { loose: "{N} device{s} of no fixed abode", clash: "{N} device{s} sharing a name with a neighbour", floorless: "{N} room{s} on no floor", cold: "{N} room{s} without a thermometer" },
  mend: "Each opens where it is put right. An area, a floor, a name or a temperature sensor in Home Assistant, and this paper reports the better for it.",
  words: {
    "light.on": "the {lamp} burn{v} at {level} per cent",
    "light.plain": "the {lamp} {is} lit",
    "light.off": "the {lamp} {is} out",
    "light.many": "{n_word} lights are lit",
    "switch.many": "{n_word} switches are running",
    "cover.on": "the {name} stand{v} {level} per cent open",
    "cover.plain": "the {name} {is} open",
    "cover.off": "the {name} {is} closed",
    "lock.on": "the {name} {is} locked",
    "lock.off": "the {name} stand{v} unlocked",
    "switch.on": "the {name} {is} running",
    "switch.off": "the {name} {is} idle",
    away: "the {name} {is} not answering",
  },
  wire: { trouble: "{name}: {message}", clear: "{name}: all is well again." },
  notices: ["Arranged at a touch. Apply within.", "By appointment to the household.", "Satisfaction assured.", "Enquire at this office."],
  stories: {
    alert: ALARM,
    "alert.warning": { ...ALARM, kicker: "Late report", head: ["{name} gives cause for concern"] },
    "alert.task": { kicker: "Notice", head: ["{name} wants attention"], deck: "{message}", body: "It has been so since {since}." },
    recovered: { kicker: "Resolved", head: ["{name} returns to normal"], deck: "Calm is restored in the {area}. The trouble began at {since}." },
    unlocked: { kicker: "Security", head: ["{name} found unlocked"], deck: "{room} in uproar as the household is urged to turn the key.", act: "Lock it" },
    offline: { kicker: "Missing", head: ["{N} device{s} not answering"], deck: "Silent since {since}: {names}." },
    appliance: { kicker: "Industry", head: ["{name} draws {kw} kilowatts"], deck: "{room} sources confirm that the meter is spinning in a good cause.", act: "Switch it off" },
    ablaze: { kicker: "Economy", head: ["House ablaze with light"], deck: "With {n_word} lamps burning at once, questions are asked about the bill.", act: "Put them all out" },
    lights: { kicker: "Home affairs", head: ["{N} light{s} still burning at this hour"], deck: "The remainder of the house is reported quiet and in good order.", act: "Lights out" },
    dark: { kicker: "Home affairs", head: ["Darkness falls on entire household"], deck: "Not one lamp is left burning, our correspondent reports from the landing." },
    cold: { kicker: "Climate", head: ["{room} falls short of its target"], deck: "At {temp}°, the room is {short} degrees below what was asked of it." },
    power: { kicker: "Energy", head: ["House draws {kw} kilowatts"], deck: "The meter was read as this edition went to press." },
    weather: { kicker: "Outlook", head: ["{temp}° outside"], deck: "Fair." },
    "weather.freezing": { kicker: "Outlook", head: ["{temp}° outside"], deck: "Frost is likely. Mind the step." },
    "weather.cold": { kicker: "Outlook", head: ["{temp}° outside"], deck: "A coat is advised." },
    "weather.hot": { kicker: "Outlook", head: ["{temp}° outside"], deck: "Readers are advised to seek the shade." },
    quiet: { kicker: "Home affairs", head: ["All quiet in the house"], deck: "Nothing of note has occurred. {N} device{s} stand{v} ready." },
  },
};

const tabloid: Voice = {
  label: "Red-top",
  name: "Daily Fuse",
  strap: "The paper that's always switched on",
  price: "Still FREE!",
  flash: "Breaking",
  titles: { more: "Also today", briefs: "Quick ones", late: "Latest", temps: "Hot or not", board: "Flick a switch", notices: "Do it now", elsewhere: "Everywhere else", gaps: "Sort it out" },
  join: " • ",
  end: "",
  nothing: "Nothing yet. Give it a minute.",
  rest: "{n} room{s} with NOTHING ON!",
  gaps: { loose: "{n} device{s} HOMELESS!", clash: "{n} device{s} in name mix-up", floorless: "{n} room{s} floating in mid-air", cold: "{n} room{s}: hot or not? No idea" },
  mend: "Tap one to fix it. Give it an area, a floor, a name or a thermometer in Home Assistant.",
  words: {
    "light.on": "{lamp} ON at {level}%",
    "light.plain": "{lamp} ON",
    "light.off": "{lamp} off",
    "light.many": "{n} lights ON",
    "switch.many": "{n} switches ON",
    "cover.on": "{name} {level}% open",
    "cover.plain": "{name} open",
    "cover.off": "{name} shut",
    "lock.on": "{name} locked",
    "lock.off": "{name} UNLOCKED!",
    "switch.on": "{name} ON",
    "switch.off": "{name} off",
    away: "{name} GONE QUIET",
  },
  wire: { trouble: "{name}: {level}!", clear: "{name}: PANIC OVER" },
  notices: ["Go on, press it.", "One tap. Job done.", "You know you want to.", "Easy as that."],
  stories: {
    alert: SHOCK,
    "alert.warning": { ...SHOCK, kicker: "Uh-oh" },
    "alert.task": { kicker: "To-do", head: ["Job for you", "Sort it out", "Chop chop"], deck: "{name}: {message}", body: "Waiting since {since}." },
    recovered: { kicker: "Phew", head: ["Panic over", "And relax", "Stand down"], deck: "{name} back to normal. The drama started at {since}." },
    unlocked: { kicker: "Exclusive", head: ["Lock shock", "Come on in!", "Open house"], deck: "{name} left UNLOCKED as household carries on regardless.", act: "Lock it NOW" },
    offline: { kicker: "Vanished", head: ["Gone quiet", "Missing in action", "Hello? Anyone?"], deck: "{n} device{s} not answering since {since}: {names}." },
    appliance: { kicker: "Power mad", head: ["Full steam ahead", "Watt a whopper", "Going large"], deck: "{name} guzzles {kw}kW in {room} power binge.", act: "Pull the plug" },
    ablaze: { kicker: "Bill shock", head: ["Lit up like a Christmas tree", "Who's paying for this?", "Blaze of glory"], deck: "{n} lights on AT ONCE in bill-busting bonanza.", act: "Kill the lights" },
    lights: { kicker: "Still on", head: ["{n} and counting", "Left on again", "Switched on"], deck: "{n} light{s} burn{v} while the meter ticks.", act: "Kill the lights" },
    dark: { kicker: "Blackout", head: ["Lights out!", "Dark days", "Who turned out the lights?"], deck: "Not a single bulb on in the WHOLE house." },
    cold: { kicker: "Chilly", head: ["Brrr!", "Cold comfort", "Frozen out"], deck: "{room} shivers at {temp}°, a full {short}° short." },
    power: { kicker: "Kerching", head: ["Watt a carry on", "Meter madness", "Power trip"], deck: "House burns {kw}kW. Who's paying?" },
    weather: { kicker: "Weather", head: ["Not bad out", "Can't complain"], deck: "{temp}° outside." },
    "weather.freezing": { kicker: "Weather", head: ["Big freeze", "Brass monkeys"], deck: "{temp}° outside. Stay in." },
    "weather.cold": { kicker: "Weather", head: ["Coat weather", "Bit nippy", "Grey day"], deck: "{temp}° outside." },
    "weather.hot": { kicker: "Weather", head: ["What a scorcher", "Hot hot hot"], deck: "{temp}° outside. Ice creams all round." },
    quiet: { kicker: "Yawn", head: ["Slow news day", "Nothing to see here", "All quiet"], deck: "Nothing going on. {n} device{s} behaving." },
  },
};

export const VOICES: Record<string, Voice> = { broadsheet, tabloid };
