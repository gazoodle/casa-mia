// The Talk tile's rules, pure: what the tile says for a call (the call sensor's state and
// this tablet's user), or as Hold to talk (the Commander's announced talk state), and the
// tile card config that follows from it and the card's own.
import type { CardConfig, State } from "../ha.ts";
import { type Duplex, type TalkState, WORDS, answeredHere, holdLook, order, startWord } from "../commander/talk-rules.ts";

/** The looks the tile can have; also the keys of `icons:` and `colors:`. An Answer tile
 * has the first four, a Hold to talk tile the last two. */
export type Look = "talk" | "ringing" | "hang_up" | "answered_elsewhere" | "hold" | "live";
export const LOOKS: Look[] = ["talk", "ringing", "hang_up", "answered_elsewhere"];
export const HOLD_LOOKS: Look[] = ["hold", "live"];

export const ICONS: Record<Look, string> = {
  talk: "mdi:microphone",
  ringing: "mdi:bell-ring",
  hang_up: "mdi:phone-hangup",
  answered_elsewhere: "mdi:microphone-off",
  hold: "mdi:microphone",
  live: "mdi:microphone",
};
const COLOURS: Partial<Record<Look, string>> = { live: "red" };

export type Config = CardConfig & {
  entity: string; // the Casa Mia Intercom call sensor
  commander?: string; // a Commander's Main camera select: only that card talks
  button?: "answer" | "hold"; // answer and hang up, or Hold to talk
  duplex?: Duplex; // answer only: half answers silent, for Hold to talk
  name?: string; // replaces "Talk" (or "Answer", or "Hold to talk") only
  icon?: string; // every state
  icons?: Partial<Record<Look, string>>;
  color?: string; // every state
  colors?: Partial<Record<Look, string>>;
};

/** What a tap will do, from the call: hang up (this user answered), nothing useful
 * (another user answered), or talk (ringing, or no call). `name` is null for Talk, which
 * the card's own name may replace; the others always show. One HA user per tablet makes
 * "this user answered" mean "this page is talking". */
export function talkLook(st: State | undefined, user: string | undefined): { look: Look; name: string | null } {
  if (answeredHere(st, user)) return { look: "hang_up", name: WORDS.hang_up };
  if (st?.state === "answered") return { look: "answered_elsewhere", name: `Answered by ${st.attributes.answered_by ?? "someone"}` };
  if (st?.state === "ringing") return { look: "ringing", name: null };
  return { look: "talk", name: null };
}

const NONE = { action: "none" };

/** The HA tile card's config: the card's config passed through, with only the name, icon
 * and colour set from the call (or from the talk state, for Hold to talk), and the tap
 * defaulting to Talk's toggle. Hold to talk takes no taps: the card reports the finger. */
export function tileConfig(config: Config, st: State | undefined, user: string | undefined, talk: TalkState = "off"): CardConfig {
  const { type: _, commander, icons, colors, button, duplex, ...tile } = config;
  const hold = button === "hold";
  // Hold to talk is greyed out, never hidden, where it isn't enabled (holdLook), so the
  // user knows where it is before they need it.
  const { look, name, enabled } = hold ? holdLook(talk) : { ...talkLook(st, user), enabled: true };
  const tap = hold ? NONE : (config.tap_action ?? { action: "fire-dom-event", casa_mia_commander: order("toggle", { entity: commander, duplex, call: config.entity }) });
  const color = enabled ? (colors?.[look] ?? config.color ?? COLOURS[look]) : "disabled";
  const out: CardConfig = {
    ...tile,
    type: "tile",
    name: name ?? config.name ?? (hold ? WORDS.hold : startWord(duplex === "half")),
    icon: config.icon ?? icons?.[look] ?? ICONS[look],
    tap_action: tap,
    icon_tap_action: hold ? NONE : (config.icon_tap_action ?? tap),
  };
  if (hold) Object.assign(out, { hold_action: NONE, double_tap_action: NONE });
  if (color) out.color = color;
  else delete out.color;
  return out;
}

/** The layout options' defaults, as HA's tile card has them: never saved. */
export const DEFAULTS = { button: "answer", duplex: "full", vertical: false, hide_state: false, features_position: "bottom" };

/** The config as saved from the editor: empty fields, empty groups (icons, colors) and
 * options at their default left out, so the YAML holds only what was set. */
export function cleaned(config: Config): Config {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (v === undefined || v === "" || v === null) continue;
    if (k in DEFAULTS && JSON.stringify(v) === JSON.stringify(DEFAULTS[k as keyof typeof DEFAULTS])) continue;
    if (k === "icons" || k === "colors") {
      const set = Object.fromEntries(Object.entries(v as object).filter(([, x]) => x !== undefined && x !== ""));
      if (Object.keys(set).length) out[k] = set;
      continue;
    }
    out[k] = v;
  }
  return out as Config;
}
