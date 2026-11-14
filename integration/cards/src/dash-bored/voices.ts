// The voices: how each paper words the stories. A voice is data and nothing else: text
// with {placeholders} that stories.ts fills, and pools of headlines to take turns from.
// Keep it so. Then a settings page or a translation can replace any of it later without
// touching the ranking or the page, and a new paper is one more entry here and a block
// of CSS (styles.ts).
import type { Device, Kind } from "./house.ts";
import type { Alert, Notice, Story } from "./stories.ts";
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
  titles: { more: string; briefs: string; late: string; archive: string; temps: string; board: string; notices: string; elsewhere: string; gaps: string; personal: string }; // archive: the last half hour's sightings; elsewhere: the rooms on no floor
  join: string; // between a room's devices
  end: string;
  nothing: string; // the late news before anything has happened
  rest: string; // a big house: the rooms with nothing to report, counted
  gaps: Record<string, string>; // what Home Assistant isn't told about the house, by a Gap's kind, counted
  mend: string; // under them: what to do about it
  words: Record<string, string>; // one device, by `kind.state`; `kind.many` is a room's count of them, in a big house; `percent` and `degrees` are how a level is said, and are a clause's {level}
  polls: Record<string, { ask: string; less: string; more: string }>; // by kind: the question over a level's scale, and its two votes
  acts: Record<string, string>; // on a device's clipping: the button that puts it the other way, by `kind.on` or `kind.off` as it stands
  clipping: { since: string; record: string; wait: string; none: string; ago: string; now: string; reads: string; playing: string; sure: string; more: string; shut: string }; // the rest of a clipping's words; `ago` and `now` are the ends of the record's band, `reads` is a thermostat's own reading, `playing` what a player has on, and `sure` is the second press that unlocks or opens
  wire: { trouble: string; clear: string }; // an alert in the late news
  personal: Record<string, string>; // the Personal column, by a Notice's kind; `song` and `tune` are how a song is named, with its artist and without
  notices: string[]; // under each scene, in turn
  stories: Record<string, Entry>; // by `kind.variant`, else `kind`
};
export type Told = { kicker: string; head: string; deck: string; body: string; act: string };

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
  };
}

/** A level as this paper says it: "80 per cent", or for a thermostat "21°". */
export const amount = (voice: Voice, kind: Kind, level: number) => fill(voice.words[kind === "climate" ? "degrees" : "percent"], { n: String(level) });

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
  return { name, lamp, camera, is: plural ? "are" : "is", v: plural ? "" : "s" };
}

/** The readers' poll on a device's level: a question, and the vote for less and for more. */
export function poll(voice: Voice, d: Device) {
  const { ask, less, more } = voice.polls[d.kind];
  return { ask: fill(ask, named(d)), less, more };
}

export function clause(voice: Voice, d: Device): [string, string, string] {
  // A kind that has a level has a plain way of being on, for when the level isn't known.
  const state = d.away ? "away" : !d.on ? `${d.kind}.off` : d.level === undefined && `${d.kind}.plain` in voice.words ? `${d.kind}.plain` : `${d.kind}.on`;
  const said = fill(voice.words[state], { ...named(d), level: "\0" });
  // "The ann's lamp" is "ann's lamp".
  const [before, after] = said.replace(/^the (?=\S+['’]s )/, "").split("\0");
  return after === undefined ? [before, "", ""] : [before, amount(voice, d.kind, d.level!), after];
}

/** One device as a clause: "the ceiling light burns at 80 per cent". */
export const words = (voice: Voice, d: Device) => clause(voice, d).join("");

/** A line of the Personal column. */
export function announce(voice: Voice, notice: Notice): string {
  const song = fill(notice.vars.artist ? voice.personal.song : voice.personal.tune, notice.vars);
  return fill(voice.personal[notice.kind], { ...notice.vars, song });
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
  titles: { more: "Other news", briefs: "In brief", late: "Late news", archive: "Thirty minutes ago", temps: "The temperatures", board: "The switchboard", notices: "Notices", elsewhere: "Elsewhere", gaps: "Corrections and clarifications", personal: "Personal" },
  join: "; ",
  end: ".",
  nothing: "Nothing has happened yet.",
  rest: "In {n_word} room{s} nothing is switched on.",
  gaps: { loose: "{N} device{s} of no fixed abode", plumbing: "{N} suspected of being plumbing", clash: "{N} device{s} sharing a name with a neighbour", floorless: "{N} room{s} on no floor", cold: "{N} room{s} without a thermometer" },
  mend: "Each opens where it is put right. An area, a floor, a name or a temperature sensor in Home Assistant, and this paper reports the better for it.",
  words: {
    percent: "{n} per cent",
    degrees: "{n}°",
    "climate.on": "the {name} is set to {level}",
    "climate.plain": "the {name} is at work",
    "climate.off": "the {name} is off",
    "media_player.on": "the {name} is playing at {level}",
    "media_player.plain": "the {name} is playing",
    "media_player.off": "the {name} is silent",
    "camera.off": "the {camera} keeps watch",
    "light.on": "the {lamp} burn{v} at {level}",
    "light.plain": "the {lamp} {is} lit",
    "light.off": "the {lamp} {is} out",
    "light.many": "{n_word} lights are lit",
    "switch.many": "{n_word} switches are running",
    "cover.on": "the {name} stand{v} {level} open",
    "cover.plain": "the {name} {is} open",
    "cover.off": "the {name} {is} closed",
    "lock.on": "the {name} {is} locked",
    "lock.off": "the {name} stand{v} unlocked",
    "switch.on": "the {name} {is} running",
    "switch.off": "the {name} {is} idle",
    away: "the {name} {is} not answering",
  },
  polls: {
    light: { ask: "Readers are invited to say whether the {lamp} {is} too bright.", less: "Too bright", more: "Not bright enough" },
    cover: { ask: "Readers are invited to say whether the {name} stand{v} too far open.", less: "Too far", more: "Not far enough" },
    climate: { ask: "Readers are invited to say whether the {name} is set too warm.", less: "Too warm", more: "Too cold" },
    media_player: { ask: "Readers are invited to say whether the {name} is too loud.", less: "Too loud", more: "Not loud enough" },
  },
  acts: { "light.on": "Put it out", "light.off": "Light it", "switch.on": "Switch it off", "switch.off": "Switch it on", "cover.on": "Close it", "cover.off": "Open it", "lock.on": "Unlock it", "lock.off": "Lock it",
    "climate.on": "Turn it off", "climate.off": "Turn it on", "media_player.on": "Pause it", "media_player.off": "Play on" },
  clipping: { since: "So it has stood since {at}.", record: "The record", wait: "Our archivist is consulting the files.", none: "Nothing is recorded of the last day.", ago: "This time yesterday", now: "Now", reads: "The glass reads {temp}°.", playing: "On the air: {title}.",
    sure: "Press again to confirm", more: "Home Assistant's own page", shut: "Fold away" },
  wire: { trouble: "{name}: {message}", clear: "{name}: all is well again." },
  personal: { home: "{name} has arrived home.", left: "{name} has left the house.", zone: "{name} has arrived at {place}.",
    love: "{name} wishes it known that {song} is greatly to their liking.", loathe: "{name} begs that {song} be played no more.", song: "“{title}” by {artist}", tune: "“{title}”" },
  notices: ["Arranged at a touch. Apply within.", "By appointment to the household.", "Satisfaction assured.", "Enquire at this office."],
  stories: {
    alert: ALARM,
    "alert.warning": { ...ALARM, kicker: "Late report", head: ["{name} gives cause for concern"] },
    "alert.task": { kicker: "Notice", head: ["{name} wants attention"], deck: "{message}", body: "It has been so since {since}." },
    recovered: { kicker: "Resolved", head: ["{name} returns to normal"], deck: "Calm is restored in the {area}. The trouble began at {since}." },
    "sighting.alarm": { kicker: "Alarm heard", head: ["An alarm is heard sounding"], deck: "A smoke or carbon monoxide alarm was heard by the {name} at {at}. Readers are urged to look at once." },
    "sighting.doorbell": { kicker: "At the door", head: ["A caller rings the bell", "A visitor presents at the door"], deck: "The bell was rung at {at}, and the {name} obliged with a likeness." },
    "sighting.person": { kicker: "Person seen", head: ["A figure is observed", "Person seen on the premises"], deck: "Photographed by the {name} at {at}. Identity unconfirmed as this edition went to press." },
    "sighting.vehicle": { kicker: "Vehicle seen", head: ["A vehicle draws up", "Motor traffic is reported"], deck: "Photographed by the {name} at {at}." },
    "sighting.animal": { kicker: "Nature notes", head: ["Wildlife reported in the grounds", "A creature is observed"], deck: "Photographed by the {name} at {at}. It declined to comment." },
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
  titles: { more: "Also today", briefs: "Quick ones", late: "Latest", archive: "Rewind", temps: "Hot or not", board: "Flick a switch", notices: "Do it now", elsewhere: "Everywhere else", gaps: "Sort it out", personal: "Goss" },
  join: " • ",
  end: "",
  nothing: "Nothing yet. Give it a minute.",
  rest: "{n} room{s} with NOTHING ON!",
  gaps: { loose: "{n} device{s} HOMELESS!", plumbing: "{n} FAKE gadget{s} exposed", clash: "{n} device{s} in name mix-up", floorless: "{n} room{s} floating in mid-air", cold: "{n} room{s}: hot or not? No idea" },
  mend: "Tap one to fix it. Give it an area, a floor, a name or a thermometer in Home Assistant.",
  words: {
    percent: "{n}%",
    degrees: "{n}°",
    "climate.on": "{name} set to {level}",
    "climate.plain": "{name} ON",
    "climate.off": "{name} off",
    "media_player.on": "{name} BLARING at {level}",
    "media_player.plain": "{name} playing",
    "media_player.off": "{name} quiet",
    "camera.off": "{camera} watching",
    "light.on": "{lamp} ON at {level}",
    "light.plain": "{lamp} ON",
    "light.off": "{lamp} off",
    "light.many": "{n} lights ON",
    "switch.many": "{n} switches ON",
    "cover.on": "{name} {level} open",
    "cover.plain": "{name} open",
    "cover.off": "{name} shut",
    "lock.on": "{name} locked",
    "lock.off": "{name} UNLOCKED!",
    "switch.on": "{name} ON",
    "switch.off": "{name} off",
    away: "{name} GONE QUIET",
  },
  polls: {
    light: { ask: "{lamp}: TOO BRIGHT? You decide!", less: "Dim it", more: "Crank it up" },
    cover: { ask: "{name}: TOO OPEN? You decide!", less: "Shut it a bit", more: "Open up" },
    climate: { ask: "{name}: TOO HOT? You decide!", less: "Cool it", more: "Warm it up" },
    media_player: { ask: "{name}: TOO LOUD? You decide!", less: "Pipe down", more: "Louder!" },
  },
  acts: { "light.on": "Kill it", "light.off": "Light it up", "switch.on": "Off!", "switch.off": "On!", "cover.on": "Shut it", "cover.off": "Open up", "lock.on": "Unlock it", "lock.off": "Lock it",
    "climate.on": "Kill the heat", "climate.off": "Heat on!", "media_player.on": "Shush!", "media_player.off": "Play it!" },
  clipping: { since: "Been that way since {at}.", record: "The story so far", wait: "Digging the dirt…", none: "Nothing all day. Dull!", ago: "Yesterday", now: "Now", reads: "It's {temp}° in there.", playing: "Now playing: {title}.",
    sure: "SURE? Press again", more: "Home Assistant's page", shut: "Bin it" },
  wire: { trouble: "{name}: {level}!", clear: "{name}: PANIC OVER" },
  personal: { home: "{name}'s HOME!", left: "{name} has LEFT the building", zone: "{name} spotted at {place}",
    love: "{name} LOVES {song}", loathe: "{name} can't STAND {song}", song: "“{title}” by {artist}", tune: "“{title}”" },
  notices: ["Go on, press it.", "One tap. Job done.", "You know you want to.", "Easy as that."],
  stories: {
    alert: SHOCK,
    "alert.warning": { ...SHOCK, kicker: "Uh-oh" },
    "alert.task": { kicker: "To-do", head: ["Job for you", "Sort it out", "Chop chop"], deck: "{name}: {message}", body: "Waiting since {since}." },
    recovered: { kicker: "Phew", head: ["Panic over", "And relax", "Stand down"], deck: "{name} back to normal. The drama started at {since}." },
    "sighting.alarm": { kicker: "Alarm", head: ["ALARM!", "Hear that?"], deck: "{name} heard a smoke or CO alarm at {at}. Go and LOOK." },
    "sighting.doorbell": { kicker: "Ding dong", head: ["Ding dong!", "Who's there?", "Knock knock"], deck: "Someone's at the door. {name} got the snap at {at}." },
    "sighting.person": { kicker: "Spotted", head: ["Who goes there?", "Caught on camera", "Smile!"], deck: "{name} snaps mystery figure at {at}." },
    "sighting.vehicle": { kicker: "Wheels", head: ["Park life", "Vroom!", "On the drive"], deck: "Motor caught on {name} at {at}." },
    "sighting.animal": { kicker: "Beast", head: ["Paws for thought", "Beast on the loose", "Fur real"], deck: "Creature caught on {name} at {at}." },
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
