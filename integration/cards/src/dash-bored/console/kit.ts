// What every era of the Console shares about its controls: the kit an era draws them
// with, and what a thumbwheel's places are. An era (Bakelite is the 1950s) is a kit to
// this shape and a stylesheet; panel.ts puts the controls on the panel and acts on what
// is pressed, the same in every era.

/** The controls an era draws. Bakelite's kit is the pattern: each is a function of what
 * it shows, and its file says what each argument is. `recorder` is a room's history. */
export type Kit = Pick<typeof import("./bakelite/kit.ts"), "DEFS" | "label" | "meter" | "valve" | "dolly" | "knob" | "tv" | "wheels" | "push" | "knife" | "jewel"> & { recorder: typeof import("./bakelite/recorder.ts").recorder };

// A thumbwheel has eleven places round it: a blank, then the digits.
const PLACES = 11;
/** What a thumbwheel shows at a place: nothing at its blank, then the digits. A wheel's
 * place is counted on and on as it is turned, so any whole number is one. */
export const face = (place: number) => {
  const at = ((place % PLACES) + PLACES) % PLACES;
  return at ? String(at - 1) : "";
};
