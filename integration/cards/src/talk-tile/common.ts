// The Talk tile's rules, pure: what the tile says for a call (the call sensor's state and
// this tablet's user), and the tile card config that follows from it and the card's own.
import type { CardConfig, State } from "../ha.ts";

/** The four looks the tile can have; also the keys of `icons:` and `colors:`. */
export type Look = "talk" | "ringing" | "hang_up" | "answered_elsewhere";
export const LOOKS: Look[] = ["talk", "ringing", "hang_up", "answered_elsewhere"];

export const ICONS: Record<Look, string> = {
  talk: "mdi:microphone",
  ringing: "mdi:bell-ring",
  hang_up: "mdi:phone-hangup",
  answered_elsewhere: "mdi:microphone-off",
};

export type Config = CardConfig & {
  entity: string; // the intercom_talkback call sensor
  commander?: string; // a Commander's Main camera select: only that card talks
  name?: string; // replaces "Talk" only
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
  if (st?.state === "answered") {
    const by = st.attributes.answered_by;
    if (by && by === user) return { look: "hang_up", name: "Hang up" };
    return { look: "answered_elsewhere", name: `Answered by ${by ?? "someone"}` };
  }
  if (st?.state === "ringing") return { look: "ringing", name: null };
  return { look: "talk", name: null };
}

/** The HA tile card's config for a call: the card's config passed through, with only the
 * name, icon and colour set from the call, and the tap defaulting to Talk's toggle. */
export function tileConfig(config: Config, st: State | undefined, user: string | undefined): CardConfig {
  const { type: _, commander, icons, colors, ...tile } = config;
  const { look, name } = talkLook(st, user);
  const tap = config.tap_action ?? {
    action: "fire-dom-event",
    casa_mia_commander: { talk: "toggle", ...(commander ? { entity: commander } : {}) },
  };
  const color = colors?.[look] ?? config.color;
  const out: CardConfig = {
    ...tile,
    type: "tile",
    name: name ?? config.name ?? "Talk",
    icon: config.icon ?? icons?.[look] ?? ICONS[look],
    tap_action: tap,
    icon_tap_action: config.icon_tap_action ?? tap,
  };
  if (color) out.color = color;
  else delete out.color;
  return out;
}

/** The layout options' defaults, as HA's tile card has them: never saved. */
export const DEFAULTS = { vertical: false, hide_state: false, features_position: "bottom" };

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
