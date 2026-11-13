/** Love it or Loathe it's page: what it is sent, and how it asks for a change. It keeps
 * nothing of its own. Home Assistant holds the entries, groups and stations (the
 * integration, which works with no app), sends the page everything it shows in one feed,
 * pushed at each change, and makes each change the page asks for (the integration's
 * admin.py), so this page and Home Assistant's own screens edit the one thing. */

import { useEffect, useState } from "react";
import { homeConnection } from "../home";
import { HeartIcon } from "../icons";
import { follow } from "../sensor-watch/ha";

const DOMAIN = "casa_mia_love_or_loathe";
/** The integration's page in Home Assistant, where an entry is added or deleted. */
export const IN_HA = `/config/integrations/integration/${DOMAIN}`;

export const HEAD = {
  icon: <HeartIcon />,
  title: "Love it or Loathe it",
  module: "love_or_loathe",
  blurb: "Acts when a song you love or loathe comes on a media player: turn it up, mute it, or go to another station for a few minutes.",
};

export type Feeling = "love" | "loathe" | "ignore";
export type Action = "volume" | "mute" | "switch" | "event";
export type Act = { action: Action; amount: number; minutes: number };
export type Group = {
  id: string;
  name: string;
  feeling: Feeling;
  /** Love or loathe: which list it is, even while ignored. */
  home: Feeling;
  patterns?: string;
  person?: string;
  /** It also has any song played `times` times in the last `hours` hours (0: it doesn't). */
  repeats?: Repeats;
  love: Act;
  loathe: Act;
};
export type Repeats = { times: number; hours: number };
export const NO_REPEATS: Repeats = { times: 0, hours: 4 };
export type Station = { id: string; name: string; media_content_id: string; media_content_type: string };
export type Playing = {
  /** Home Assistant's state for the player; null when it has none. */
  state: string | null;
  title?: string;
  artist?: string;
  /** The group that has the track. */
  group?: string | null;
  /** How many times it has been played lately, when that is why the group has it. */
  repeats?: number;
  media_content_id?: string | null;
  media_content_type?: string | null;
};
export type Last = { entity_id: string; title: string; artist: string; group: string; feeling: Feeling; action: string; result: string; at: string };
export type Entry = {
  id: string;
  title: string;
  running: boolean;
  players: string[];
  delay: number;
  groups: Group[];
  stations: Station[];
  playing: Record<string, Playing>;
  /** Each player on another station, and when it goes back. */
  away: Record<string, string>;
  last: Last | null;
};
export type Named = { entity_id: string; name: string };
export type View = {
  entries: Entry[];
  libraries: Record<string, { name: string; patterns: string[] }>;
  players: Named[];
  people: Named[];
};

export const FEELINGS: [Feeling, string][] = [
  ["love", "Love"],
  ["loathe", "Loathe"],
  ["ignore", "Ignore"],
];
export const TONE: Record<Feeling, string> = { love: "cm-good", loathe: "cm-bad", ignore: "cm-muted" };
export const ACTIONS: [Action, string][] = [
  ["volume", "Change the volume until the next track"],
  ["mute", "Mute until the next track"],
  ["switch", "Switch station for some minutes"],
  ["event", "Only fire the event"],
];
/** What a new group is offered (the integration's DEFAULT_ACTS). */
export const USUAL: Record<"love" | "loathe", Act> = {
  love: { action: "volume", amount: 10, minutes: 5 },
  loathe: { action: "mute", amount: -50, minutes: 5 },
};

/** "volume +10%", "mute", "another station for 5 min". */
export function inShort(act: Act): string {
  if (act.action === "volume") return `volume ${act.amount > 0 ? "+" : ""}${act.amount}%`;
  if (act.action === "switch") return `another station for ${act.minutes} min`;
  return act.action === "mute" ? "mute" : "event only";
}

export const nameOf = (all: Named[], id: string) => all.find((n) => n.entity_id === id)?.name ?? id;

/** "3 songs", "any song played 3 times in 4 h", or both. */
export function holds(group: Group): string {
  const named = songs(group.patterns);
  const often = group.repeats?.times ? `any song played ${group.repeats.times} times in ${group.repeats.hours} h` : "";
  const names = `${named} ${named === 1 ? "song" : "songs"}`;
  return often ? (named ? `${names} · ${often}` : often) : names;
}

/** How many songs a group names. */
export const songs = (patterns?: string) => (patterns ?? "").split("\n").filter((line) => line.trim() && !line.trim().startsWith("#")).length;

/** What Home Assistant says when it refuses: {code, message}. */
const why = (err: unknown) => (err as { message?: string })?.message ?? String(err);

async function ask(message: object): Promise<void> {
  const asked = homeConnection();
  if (!asked) throw new Error("This page isn't inside Home Assistant.");
  try {
    await (await asked).conn.sendMessagePromise(message);
  } catch (err) {
    throw new Error(why(err));
  }
}

/** One of the integration's changes (admin.py); refused, its error says why. The page is
 * then sent what changed by the feed, as it is for a change made anywhere. */
export const change = (name: string, entry: Entry, fields: object = {}) => ask({ type: `${DOMAIN}/${name}`, entry_id: entry.id, ...fields });

/** Add the song a player is playing to a person's loved or loathed group; with no person,
 * to the group of whoever is signed in here. */
export const rate = (player: string, feeling: Feeling, person: string) =>
  ask({ type: "call_service", domain: DOMAIN, service: "rate", service_data: { entity_id: player, feeling, ...(person ? { person } : {}) } });

/** The feed. `view`: as last sent. `problem`: why what is shown may not be current (the
 * connection is lost), or why there is nothing. `absent`: the integration isn't set up in
 * Home Assistant, or this isn't inside Home Assistant. */
export type Fed = { view?: View; problem?: string; absent?: boolean };

export function useView(): Fed {
  const [fed, setFed] = useState<Fed>({});
  useEffect(() => {
    const asked = homeConnection();
    if (!asked) return setFed({ absent: true });

    let over = false;
    let stop = () => {};
    // Home Assistant's connection subscribes again by itself once it is back, and the
    // feed then sends everything: until it does, what is shown isn't being kept current.
    const lost = () => setFed((was) => ({ ...was, problem: "The connection to Home Assistant is lost, so this may not be how things are now." }));
    asked.then(
      ({ conn }) => {
        if (over) return;
        conn.addEventListener("disconnected", lost);
        const unfollow = follow<View>(conn, { type: `${DOMAIN}/view` }, (view) => setFed({ view }), (reason, code) =>
          setFed(code === "unknown_command" ? { absent: true } : { problem: `Home Assistant refused: ${reason}` }),
        );
        stop = () => {
          conn.removeEventListener("disconnected", lost);
          unfollow();
        };
      },
      (err) => setFed({ problem: `No connection to Home Assistant (${err})` }),
    );
    return () => {
      over = true;
      stop();
    };
  }, []);
  return fed;
}
