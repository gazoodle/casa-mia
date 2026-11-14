// What a voice is made of: the shape every paper fills in. voices.ts has what is done with one.
/** How one kind of story is told. `flavours` are headlines for a particular sort of
 * sensor; `plain` is the body for a sensor with no reading to quote (one that is only
 * on or off); `worse` is added to the body when the trouble has escalated; `vote` is
 * on the button for the story's gentler remedy, beside `act`. */
export type Entry = { kicker: string; head: string[]; flavours?: Record<string, string[]>; deck: string; body?: string; plain?: string; worse?: string; act?: string; vote?: string };
export type Voice = {
  label: string; // on the button that chooses it
  name: string; // the masthead
  strap: string;
  price: string;
  flash: string; // the word before breaking news
  ticker: string; // the word before a ticker of the headlines; empty in a paper that has none
  titles: { more: string; briefs: string; late: string; archive: string; temps: string; board: string; notices: string; elsewhere: string; gaps: string; personal: string; celebrity: string; weather: string }; // archive: the last half hour's sightings; elsewhere: the rooms on no floor
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
  forecast: { now: string; today: string }; // the weather column: the weather at present, and what the forecast's first day is called
  skies: Record<string, string>; // Home Assistant's word for the weather (its condition), as this paper says it
  celebrity: Record<string, string>; // the celebrity column, by a Billing's kind, `kind.live` while it is on, and a rating's kind for what was said of it
  personal: Record<string, string>; // the Personal column, by a Notice's kind; `song` and `tune` are how a song is named, with its artist and without
  notices: string[]; // under each scene, in turn
  stories: Record<string, Entry>; // by `kind.variant`, else `kind`
};
export type Told = { kicker: string; head: string; deck: string; body: string; act: string; vote: string };
