// The queue of the room that is this device (phone.ts): its songs, which one is playing,
// and what comes next. A Sonos room's queue is its speaker's; this room has no speaker,
// so the page keeps the queue itself. Nothing here plays anything or touches the page,
// so it is tested by itself. Songs are counted from 0 here, and from 1 by whoever asks
// (as a speaker counts them).
import type { Song } from "./common.ts";

/** A song this device can play: `uri` is Spotify's name for it (`spotify:track:…`), or
 * the speaker's address of a library file or a station, which Jukebox turns into one
 * the browser can fetch. A station is `live`: it has no end and no place in a queue. */
export type Track = Song & { uri: string; live?: boolean };
export type Lineup = { songs: Track[]; /** The song that is playing or would be: none in an empty queue. */ at: number; shuffle: boolean; repeat: "off" | "all" | "one" };

export const EMPTY: Lineup = { songs: [], at: -1, shuffle: false, repeat: "off" };

/** Put songs in before song number `index`. The song that is playing stays the one it was. */
function inserted(line: Lineup, songs: Track[], index: number): Lineup {
  const all = [...line.songs.slice(0, index), ...songs, ...line.songs.slice(index)];
  return { ...line, songs: all, at: line.at < 0 ? (all.length ? 0 : -1) : line.at >= index ? line.at + songs.length : line.at };
}

/** Songs into the queue where Jukebox's players say (feed.py has the same four): in
 * place of it, straight after the song playing, at its end, or after the song playing
 * and played now, which is also what no word means. With `to`, to be song number `to`
 * counted from 1. Gives the queue, and whether the song at `at` is to be started. */
export function put(line: Lineup, songs: Track[], where?: string, to?: number): [Lineup, boolean] {
  if (where === "replace") return [{ ...line, songs, at: songs.length ? 0 : -1 }, songs.length > 0];
  if (!songs.length) return [line, false];
  if (to !== undefined) return [inserted(line, songs, Math.max(0, Math.min(line.songs.length, to - 1))), false];
  if (where === "add") return [inserted(line, songs, line.songs.length), false];
  const next = inserted(line, songs, line.at + 1);
  return where === "next" ? [next, false] : [{ ...next, at: line.at + 1 }, true];
}

/** Move song number `from` to be number `to`, both counted from 1. */
export function move(line: Lineup, from: number, to: number): Lineup {
  const [a, b] = [from - 1, to - 1];
  if (a === b || !line.songs[a] || !line.songs[b]) return line;
  const songs = [...line.songs];
  songs.splice(b, 0, ...songs.splice(a, 1));
  // The song that is playing is followed to wherever it now is.
  const at = line.at === a ? b : a < line.at && b >= line.at ? line.at - 1 : a > line.at && b <= line.at ? line.at + 1 : line.at;
  return { ...line, songs, at };
}

/** Take out song number `n`, counted from 1. Gives the queue, and whether that was the
 * song playing: the one after it is then the one to play. */
export function remove(line: Lineup, n: number): [Lineup, boolean] {
  const index = n - 1;
  if (!line.songs[index]) return [line, false];
  const songs = line.songs.filter((_, i) => i !== index);
  const at = index < line.at ? line.at - 1 : Math.min(line.at, songs.length - 1);
  return [{ ...line, songs, at }, index === line.at];
}

/** The song to play after this one, or none at the end of the queue. `ended` is that
 * the song played to its end, which is what "repeat one" repeats: Next still moves on. */
export function after(line: Lineup, ended: boolean, random: () => number = Math.random): number | null {
  const count = line.songs.length;
  if (!count) return null;
  if (ended && line.repeat === "one") return line.at;
  if (line.shuffle && count > 1) {
    // ponytail: any other song, so one may come round again before all have played.
    // Keep the order played in if that is noticed.
    const other = Math.floor(random() * (count - 1));
    return other >= line.at ? other + 1 : other;
  }
  if (line.at + 1 < count) return line.at + 1;
  return line.repeat === "all" ? 0 : null;
}

/** The song before this one; the first stays the first. */
export const before = (line: Lineup): number => Math.max(0, line.at - 1);
