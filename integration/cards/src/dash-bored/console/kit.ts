// What every era of the Console shares about its controls: the kit an era draws them
// with, and what a thumbwheel's places are. An era (Bakelite is the 1950s) is a kit to
// this shape and a stylesheet; panel.ts puts the controls on the panel and acts on what
// is pressed, the same in every era.

/** The controls an era draws. Bakelite's kit is the pattern: each is a function of what
 * it shows, and its file says what each argument is. `recorder` is a room's history. */
export type Kit = Pick<typeof import("./bakelite/kit.ts"), "DEFS" | "label" | "meter" | "valve" | "dolly" | "knob" | "tv" | "wheels" | "push" | "knife" | "jewel"> & { recorder: typeof import("./bakelite/recorder.ts").recorder }
  // The weather's two instruments: Bakelite's own, and every later era's from ./weather.ts.
  & Pick<typeof import("./bakelite/weather.ts"), "barometer" | "calendar">;

// How long each needle meter's pointer takes to waver through its seven places, in units
// of 16 ms. They are primes so that no two meters fall into step with each other; the
// eleventh meter on a panel shares the first's.
export const BEATS = [53, 97, 61, 83, 71, 59, 89, 67, 79, 73];

// A thumbwheel has eleven places round it: a blank, then the digits.
const PLACES = 11;
/** What a thumbwheel shows at a place: nothing at its blank, then the digits. A wheel's
 * place is counted on and on as it is turned, so any whole number is one. */
export const face = (place: number) => {
  const at = ((place % PLACES) + PLACES) % PLACES;
  return at ? String(at - 1) : "";
};
