// What Love it or Loathe it's card and its thumbs share: the card's options, and the feed
// the thumbs follow (the integration's cards.py).
const DOMAIN = "casa_mia_love_or_loathe";
export const VERSION = new URL(import.meta.url).searchParams.get("v") || "dev";
export const CARDS_VERSION = `${DOMAIN}/cards`;
export const CARD = "casa-mia-love-or-loathe";

export type Config = {
  type?: string;
  /** The media player whose song is rated. */
  entity?: string;
  /** Whose song it is; without one, whoever is signed in (a wall tablet names one). */
  person?: string;
  /** Instead of the player's own name. */
  name?: string;
  /** Only the thumbs: no name and no song. */
  compact?: boolean;
};

export type Feeling = "love" | "loathe";

/** One player's song for one person, as the integration sends it. */
export type Song = {
  /** False: Love it or Loathe it doesn't watch this player. */
  watched: boolean;
  playing: boolean;
  title: string;
  artist: string;
  /** Whose rating this is; none when the login belongs to no person and none was named. */
  person: string | null;
  /** Already in that person's loved or loathed group. */
  feeling: Feeling | null;
  /** Why this login may not rate for that person here, in the integration's words (it is
   * not one of the people chosen, or it names someone else and isn't a screen that may);
   * none when it may. */
  refused: string | null;
};

/** Follow a player's song until the function returned is called. `heard` gets none, with
 * the reason, when Home Assistant refuses (the integration isn't set up). */
export function follow(conn: any, entityId: string, person: string | undefined, heard: (song: Song | undefined, why?: string) => void): () => void {
  const off: Promise<() => void> = conn.subscribeMessage((song: Song) => heard(song), {
    type: `${DOMAIN}/song`,
    entity_id: entityId,
    ...(person ? { person } : {}),
  });
  off.catch((err: any) => heard(undefined, err?.code === "unknown_command" ? "Love it or Loathe it isn't set up in Home Assistant" : (err?.message ?? String(err))));
  // Nothing to stop if it was refused, or the connection has gone.
  return () => void off.then((stop) => stop()).catch(() => undefined);
}

/** Rate the song playing; `clear` takes the rating away. Rejects with Home Assistant's
 * reason. */
export function rate(hass: { callService(domain: string, service: string, data?: object): Promise<unknown> }, entityId: string, feeling: Feeling | "clear", person?: string): Promise<unknown> {
  return hass.callService(DOMAIN, "rate", { entity_id: entityId, feeling, ...(person ? { person } : {}) });
}

/** Why the thumbs can't be used now; none when they can. */
export function unusable(song: Song | undefined, why: string | undefined, connected: boolean): string | undefined {
  if (!connected) return "No connection to Home Assistant";
  if (!song) return why ?? "Waiting for Home Assistant";
  if (!song.watched) return "Love it or Loathe it doesn't watch this player";
  if (song.refused) return song.refused;
  if (!song.playing) return "Nothing is playing";
  if (!song.title) return "The player reports no title, so there is nothing to rate";
  return undefined;
}
