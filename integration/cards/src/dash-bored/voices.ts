// The voices: how each paper words the stories. A voice is data and nothing else: text
// with {placeholders} that stories.ts fills, and pools of headlines to take turns from.
// Keep it so. Then a settings page or a translation can replace any of it later without
// touching the ranking or the page, and a new paper is one more entry here and a block
// of CSS (styles.ts).
import { DEGREES, type Device, type Kind } from "./house.ts";
import type { Alert, Billing, Notice, Story } from "./stories.ts";
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
  ticker: string; // the word before a ticker of the headlines; empty in a paper that has none
  titles: { more: string; briefs: string; late: string; archive: string; temps: string; board: string; notices: string; elsewhere: string; gaps: string; personal: string; celebrity: string }; // archive: the last half hour's sightings; elsewhere: the rooms on no floor
  join: string; // between a room's devices
  end: string;
  nothing: string; // the late news before anything has happened
  rest: string; // a big house: the rooms with nothing to report, counted
  gaps: Record<string, string>; // what Home Assistant isn't told about the house, by a Gap's kind, counted
  mend: string; // under them: what to do about it
  words: Record<string, string>; // one device, by `kind.on`, `kind.off`, `kind.plain` (on, with a level that isn't known) or `kind.<phase>`; `kind.many` is a room's count of them, in a big house; `percent` and `degrees` are how a level is said, and are a clause's {level}
  polls: Record<string, { ask: string; less: string; more: string }>; // by kind: the question over a level's scale, and its two votes
  acts: Record<string, string>; // on a device's clipping: the button that puts it the other way, by `kind.on` or `kind.off` as it stands
  clipping: { since: string; record: string; wait: string; none: string; ago: string; now: string; reads: string; playing: string; sure: string; more: string; shut: string; closer: string; live: string }; // the rest of a clipping's words; `ago` and `now` are the ends of the record's band, `reads` is a thermostat's own reading, `playing` what a player has on, and `sure` is the second press that unlocks or opens
  wire: { trouble: string; clear: string }; // an alert in the late news
  celebrity: Record<string, string>; // the celebrity column, by a Billing's kind, `kind.live` while it is on, and a rating's kind for what was said of it
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
  ticker: "",
  titles: { more: "Other news", briefs: "In brief", late: "Late news", archive: "Thirty minutes ago", temps: "The temperatures", board: "The switchboard", notices: "Notices", elsewhere: "Elsewhere", gaps: "Corrections and clarifications", personal: "Personal", celebrity: "Amusements" },
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
    "fan.on": "the {name} turn{v} at {level}",
    "fan.plain": "the {name} {is} turning",
    "fan.off": "the {name} {is} still",
    "valve.on": "the {name} stand{v} {level} open",
    "valve.plain": "the {name} {is} open",
    "valve.off": "the {name} {is} shut",
    "vacuum.on": "the {name} is cleaning",
    "vacuum.off": "the {name} is at rest",
    "vacuum.docked": "the {name} is docked",
    "vacuum.returning": "the {name} is on its way home",
    "vacuum.paused": "the {name} has paused",
    "vacuum.error": "the {name} has come to grief",
    "lawn_mower.on": "the {name} is mowing",
    "lawn_mower.off": "the {name} is at rest",
    "lawn_mower.docked": "the {name} is docked",
    "lawn_mower.returning": "the {name} is on its way home",
    "lawn_mower.paused": "the {name} has paused",
    "lawn_mower.error": "the {name} has come to grief",
    "water_heater.on": "the {name} is set to {level}",
    "water_heater.plain": "the {name} is heating",
    "water_heater.off": "the {name} is off",
    "humidifier.on": "the {name} is set to {level}",
    "humidifier.plain": "the {name} is running",
    "humidifier.off": "the {name} is off",
    "siren.on": "the {name} is sounding",
    "siren.off": "the {name} is silent",
    "alarm_control_panel.on": "the {alarm} is set",
    "alarm_control_panel.off": "the {alarm} is not set",
    "alarm_control_panel.arming": "the {alarm} is being set",
    "alarm_control_panel.pending": "the {alarm} is about to sound",
    "alarm_control_panel.triggered": "the {alarm} is sounding",
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
    fan: { ask: "Readers are invited to say whether the {name} turn{v} too fast.", less: "Too fast", more: "Not fast enough" },
    water_heater: { ask: "Readers are invited to say whether the {name} is set too hot.", less: "Too hot", more: "Not hot enough" },
    humidifier: { ask: "Readers are invited to say whether the {name} is set too damp.", less: "Too damp", more: "Too dry" },
  },
  acts: { "light.on": "Put it out", "light.off": "Light it", "switch.on": "Switch it off", "switch.off": "Switch it on", "cover.on": "Close it", "cover.off": "Open it", "lock.on": "Unlock it", "lock.off": "Lock it",
    "climate.on": "Turn it off", "climate.off": "Turn it on", "media_player.on": "Pause it", "media_player.off": "Play on",
    "fan.on": "Stop it", "fan.off": "Start it", "valve.on": "Shut it", "valve.off": "Open it", "vacuum.on": "Send it home", "vacuum.off": "Set it cleaning",
    "lawn_mower.on": "Send it home", "lawn_mower.off": "Set it mowing", "water_heater.on": "Turn it off", "water_heater.off": "Turn it on",
    "humidifier.on": "Turn it off", "humidifier.off": "Turn it on", "siren.on": "Silence it", "siren.off": "Sound it" },
  clipping: { since: "So it has stood since {at}.", record: "The record", wait: "Our archivist is consulting the files.", none: "Nothing is recorded of the last day.", ago: "This time yesterday", now: "Now", reads: "The glass reads {temp}°.", playing: "On the air: {title}.",
    sure: "Press again to confirm", more: "Home Assistant's own page", shut: "Fold away", closer: "Pinch, or tap twice, for a closer look.", live: "See the camera as it is now" },
  celebrity: { song: "{song} was heard in the {room}.", "song.live": "{song} is being heard in the {room}.", show: "“{title}” was shown in the {room}.", "show.live": "“{title}” is being shown in the {room}.",
    love: "Admired by {name}.", loathe: "Deplored by {name}." },
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
    triggered: { kicker: "Stop press", head: ["The alarm is sounding"], deck: "The {name} alarm was set off in the {room}. Readers are urged to look at once." },
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
  ticker: "",
  titles: { more: "Also today", briefs: "Quick ones", late: "Latest", archive: "Rewind", temps: "Hot or not", board: "Flick a switch", notices: "Do it now", elsewhere: "Everywhere else", gaps: "Sort it out", personal: "Goss", celebrity: "Showbiz" },
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
    "fan.on": "{name} SPINNING at {level}",
    "fan.plain": "{name} spinning",
    "fan.off": "{name} off",
    "valve.on": "{name} {level} open",
    "valve.plain": "{name} OPEN",
    "valve.off": "{name} shut",
    "vacuum.on": "{name} HOOVERING",
    "vacuum.off": "{name} slacking",
    "vacuum.docked": "{name} docked",
    "vacuum.returning": "{name} heading home",
    "vacuum.paused": "{name} on a break",
    "vacuum.error": "{name} STUCK!",
    "lawn_mower.on": "{name} MOWING",
    "lawn_mower.off": "{name} slacking",
    "lawn_mower.docked": "{name} docked",
    "lawn_mower.returning": "{name} heading home",
    "lawn_mower.paused": "{name} on a break",
    "lawn_mower.error": "{name} STUCK!",
    "water_heater.on": "{name} set to {level}",
    "water_heater.plain": "{name} ON",
    "water_heater.off": "{name} off",
    "humidifier.on": "{name} set to {level}",
    "humidifier.plain": "{name} ON",
    "humidifier.off": "{name} off",
    "siren.on": "{name} WAILING!",
    "siren.off": "{name} quiet",
    "alarm_control_panel.on": "{alarm} SET",
    "alarm_control_panel.off": "{alarm} off",
    "alarm_control_panel.arming": "{alarm} setting…",
    "alarm_control_panel.pending": "{alarm} about to GO OFF",
    "alarm_control_panel.triggered": "{alarm} GOING OFF!",
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
    fan: { ask: "{name}: TOO FAST? You decide!", less: "Slow down", more: "Faster!" },
    water_heater: { ask: "{name}: TOO HOT? You decide!", less: "Cool it", more: "Hotter!" },
    humidifier: { ask: "{name}: TOO DAMP? You decide!", less: "Dry it out", more: "Damper!" },
  },
  acts: { "light.on": "Kill it", "light.off": "Light it up", "switch.on": "Off!", "switch.off": "On!", "cover.on": "Shut it", "cover.off": "Open up", "lock.on": "Unlock it", "lock.off": "Lock it",
    "climate.on": "Kill the heat", "climate.off": "Heat on!", "media_player.on": "Shush!", "media_player.off": "Play it!",
    "fan.on": "Kill it", "fan.off": "Spin it", "valve.on": "Shut it", "valve.off": "Open up", "vacuum.on": "Go home!", "vacuum.off": "Get hoovering",
    "lawn_mower.on": "Go home!", "lawn_mower.off": "Get mowing", "water_heater.on": "Kill the heat", "water_heater.off": "Heat on!",
    "humidifier.on": "Off!", "humidifier.off": "On!", "siren.on": "SHUT IT UP", "siren.off": "Sound it" },
  clipping: { since: "Been that way since {at}.", record: "The story so far", wait: "Digging the dirt…", none: "Nothing all day. Dull!", ago: "Yesterday", now: "Now", reads: "It's {temp}° in there.", playing: "Now playing: {title}.",
    sure: "SURE? Press again", more: "Home Assistant's page", shut: "Bin it", closer: "Pinch or double-tap to ZOOM IN", live: "Watch it LIVE" },
  celebrity: { song: "{song} rocked the {room}", "song.live": "ON NOW in the {room}: {song}", show: "“{title}” was on in the {room}", "show.live": "ON NOW in the {room}: “{title}”",
    love: "{name} LOVES it", loathe: "{name} HATES it" },
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
    triggered: { kicker: "Red alert", head: ["ALARM!", "Burglars?!", "It's going off!"], deck: "{name} alarm GOING OFF in the {room}. Go and LOOK." },
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

// A rolling news site: plain and present-tense, with what a live page says of itself
// ("what we know so far", "update"). The jokes are the other two papers' business.
const LIVE: Entry = { kicker: "Breaking", head: ["{name}: what we know so far", "Live: {name}"], deck: "{message}",
  body: "The latest reading in the {area} is {reading}. It began at {since}.", plain: "It began in the {area} at {since}.", worse: "Update: it has got worse." };

const rolling: Voice = {
  label: "Rolling news",
  name: "The Thermostat",
  strap: "Live from every room",
  price: "Free to read",
  flash: "Breaking",
  ticker: "Headlines",
  titles: { more: "Top stories", briefs: "More headlines", late: "Live updates", archive: "Last 30 minutes", temps: "Temperatures", board: "Controls", notices: "Quick actions", elsewhere: "Other rooms", gaps: "Needs attention", personal: "People", celebrity: "Now playing" },
  join: ", ",
  end: ".",
  nothing: "No updates yet.",
  rest: "Nothing to report from {n} room{s}.",
  gaps: { loose: "{n} device{s} without a room", plumbing: "{n} setting{s} listed as devices", clash: "{n} device{s} with a name another has", floorless: "{n} room{s} not on a floor", cold: "{n} room{s} with no temperature sensor" },
  mend: "Select one to put it right in Home Assistant: an area, a floor, a name or a temperature sensor.",
  words: {
    percent: "{n}%",
    degrees: "{n}°",
    "climate.on": "the {name} is set to {level}",
    "climate.plain": "the {name} is on",
    "climate.off": "the {name} is off",
    "media_player.on": "the {name} is playing at {level}",
    "media_player.plain": "the {name} is playing",
    "media_player.off": "the {name} is not playing",
    "camera.off": "the {camera} is watching",
    "fan.on": "the {name} {is} running at {level}",
    "fan.plain": "the {name} {is} running",
    "fan.off": "the {name} {is} off",
    "valve.on": "the {name} {is} {level} open",
    "valve.plain": "the {name} {is} open",
    "valve.off": "the {name} {is} shut",
    "vacuum.on": "the {name} is cleaning",
    "vacuum.off": "the {name} is idle",
    "vacuum.docked": "the {name} is docked",
    "vacuum.returning": "the {name} is returning to its dock",
    "vacuum.paused": "the {name} is paused",
    "vacuum.error": "the {name} has reported a problem",
    "lawn_mower.on": "the {name} is mowing",
    "lawn_mower.off": "the {name} is idle",
    "lawn_mower.docked": "the {name} is docked",
    "lawn_mower.returning": "the {name} is returning to its dock",
    "lawn_mower.paused": "the {name} is paused",
    "lawn_mower.error": "the {name} has reported a problem",
    "water_heater.on": "the {name} is set to {level}",
    "water_heater.plain": "the {name} is heating",
    "water_heater.off": "the {name} is off",
    "humidifier.on": "the {name} is set to {level}",
    "humidifier.plain": "the {name} is on",
    "humidifier.off": "the {name} is off",
    "siren.on": "the {name} is sounding",
    "siren.off": "the {name} is silent",
    "alarm_control_panel.on": "the {alarm} is set",
    "alarm_control_panel.off": "the {alarm} is not set",
    "alarm_control_panel.arming": "the {alarm} is being set",
    "alarm_control_panel.pending": "the {alarm} is about to sound",
    "alarm_control_panel.triggered": "the {alarm} is sounding",
    "light.on": "the {lamp} {is} on at {level}",
    "light.plain": "the {lamp} {is} on",
    "light.off": "the {lamp} {is} off",
    "light.many": "{n} lights are on",
    "switch.many": "{n} switches are on",
    "cover.on": "the {name} {is} {level} open",
    "cover.plain": "the {name} {is} open",
    "cover.off": "the {name} {is} closed",
    "lock.on": "the {name} {is} locked",
    "lock.off": "the {name} {is} unlocked",
    "switch.on": "the {name} {is} on",
    "switch.off": "the {name} {is} off",
    away: "the {name} {is} not responding",
  },
  polls: {
    light: { ask: "Have your say: {is} the {lamp} too bright?", less: "Too bright", more: "Too dim" },
    cover: { ask: "Have your say: {is} the {name} open too far?", less: "Too far", more: "Not far enough" },
    climate: { ask: "Have your say: is the {name} set too warm?", less: "Too warm", more: "Too cold" },
    media_player: { ask: "Have your say: is the {name} too loud?", less: "Too loud", more: "Too quiet" },
    fan: { ask: "Have your say: {is} the {name} too fast?", less: "Too fast", more: "Too slow" },
    water_heater: { ask: "Have your say: is the {name} set too hot?", less: "Too hot", more: "Not hot enough" },
    humidifier: { ask: "Have your say: is the {name} set too damp?", less: "Too damp", more: "Too dry" },
  },
  acts: { "light.on": "Turn off", "light.off": "Turn on", "switch.on": "Turn off", "switch.off": "Turn on", "cover.on": "Close", "cover.off": "Open", "lock.on": "Unlock", "lock.off": "Lock",
    "climate.on": "Turn off", "climate.off": "Turn on", "media_player.on": "Pause", "media_player.off": "Play",
    "fan.on": "Turn off", "fan.off": "Turn on", "valve.on": "Shut", "valve.off": "Open", "vacuum.on": "Send home", "vacuum.off": "Start cleaning",
    "lawn_mower.on": "Send home", "lawn_mower.off": "Start mowing", "water_heater.on": "Turn off", "water_heater.off": "Turn on",
    "humidifier.on": "Turn off", "humidifier.off": "Turn on", "siren.on": "Silence", "siren.off": "Sound" },
  clipping: { since: "Since {at}.", record: "Timeline", wait: "Loading the timeline…", none: "No changes in the last 24 hours.", ago: "24 hours ago", now: "Now", reads: "It is {temp}° in the room.", playing: "Now playing: {title}.",
    sure: "Press again to confirm", more: "Open in Home Assistant", shut: "Close", closer: "Pinch or double-tap to zoom.", live: "Watch live" },
  celebrity: { song: "{song} played in the {room}", "song.live": "Live in the {room}: {song}", show: "“{title}” was on in the {room}", "show.live": "Live in the {room}: “{title}”",
    love: "{name} loved it", loathe: "{name} loathed it" },
  wire: { trouble: "{name}: {message}", clear: "{name}: back to normal" },
  personal: { home: "{name} arrived home", left: "{name} left home", zone: "{name} arrived at {place}",
    love: "{name} loved {song}", loathe: "{name} loathed {song}", song: "“{title}” by {artist}", tune: "“{title}”" },
  notices: ["Tap to run", "Runs at once", "One tap", "Ready to run"],
  stories: {
    alert: LIVE,
    "alert.warning": { ...LIVE, kicker: "Developing", head: ["{name} needs checking", "{name}: what we know so far"] },
    "alert.task": { kicker: "To do", head: ["{name} needs attention"], deck: "{message}", body: "Outstanding since {since}." },
    recovered: { kicker: "Update", head: ["{name} is back to normal"], deck: "It began at {since} in the {area}. Nothing more needs doing." },
    "sighting.alarm": { kicker: "Breaking", head: ["An alarm has been heard"], deck: "The {name} heard a smoke or carbon monoxide alarm at {at}. Check now." },
    "sighting.doorbell": { kicker: "At the door", head: ["Someone is at the door"], deck: "The doorbell rang at {at}. Picture from the {name}." },
    "sighting.person": { kicker: "On camera", head: ["A person has been seen"], deck: "Picture from the {name} at {at}. Not yet identified." },
    "sighting.vehicle": { kicker: "On camera", head: ["A vehicle has been seen"], deck: "Picture from the {name} at {at}." },
    "sighting.animal": { kicker: "On camera", head: ["An animal has been seen"], deck: "Picture from the {name} at {at}." },
    triggered: { kicker: "Breaking", head: ["The alarm is sounding"], deck: "The {name} alarm was triggered in the {room}. Check now." },
    unlocked: { kicker: "Security", head: ["{name} is unlocked"], deck: "Reported in: {room}.", act: "Lock it" },
    offline: { kicker: "Outage", head: ["{N} device{s} not responding"], deck: "Not responding since {since}: {names}." },
    appliance: { kicker: "Energy", head: ["{name} is using {kw} kW"], deck: "Reported in: {room}.", act: "Turn it off" },
    ablaze: { kicker: "Energy", head: ["{N} lights are on at once"], deck: "Most of the lights in the house are on.", act: "Turn them all off" },
    lights: { kicker: "At home", head: ["{N} light{s} on"], deck: "Everything else is as expected.", act: "Turn off" },
    dark: { kicker: "At home", head: ["All the lights are off"], deck: "No light is on anywhere in the house." },
    cold: { kicker: "Heating", head: ["{room} is {short}° below its target"], deck: "It is {temp}° there now." },
    power: { kicker: "Energy", head: ["The house is using {kw} kW"], deck: "A live reading." },
    weather: { kicker: "Weather", head: ["{temp}° outside"], deck: "Mild." },
    "weather.freezing": { kicker: "Weather", head: ["{temp}° outside"], deck: "Freezing. There may be ice." },
    "weather.cold": { kicker: "Weather", head: ["{temp}° outside"], deck: "Cold." },
    "weather.hot": { kicker: "Weather", head: ["{temp}° outside"], deck: "Hot." },
    quiet: { kicker: "At home", head: ["Nothing to report"], deck: "No changes. Devices watched: {n}." },
  },
};

export const VOICES: Record<string, Voice> = { broadsheet, tabloid, rolling };
