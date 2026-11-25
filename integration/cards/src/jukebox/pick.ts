// Choosing a Sonos playlist to put a song in: a radio song added (big.ts), or a song of
// one playlist moved or copied to another (big.ts, editor.ts). The playlist this device chose last
// is offered first, so someone who always adds to their own list finds it at the top.
import { html, nothing } from "lit";
import type { Favourite, Song } from "./common.ts";

/** Where this device keeps the playlist it chose last. A convenience only: a browser that
 * won't keep it (a private window) lists them in Sonos's order. */
const LAST = "casa-mia-jukebox-last-playlist";

/** What a chooser is for: its heading, what will happen, a playlist not to offer (the
 * one the song is in), and what to do with the playlist chosen. */
export type Pick = { title: string; text: string; except?: string; pick: (playlist: Favourite) => void };

/** A song of the playlist `from` (number `at`, counted from 0) moved or copied to
 * another: the action asked for, what is sent with it, what is said when it is done, and
 * the chooser's words. */
export function sent(from: Favourite, at: number, song: Song, copy: boolean) {
  const name = song.title || "This song";
  const [action, verb, out] = copy ? ["playlist_copy", "Copied", ` It stays in ${from.title} too.`] : ["playlist_send", "Moved", ` It is taken out of ${from.title}.`];
  return {
    action,
    // The title goes with the number: Jukebox refuses if another song is there by now.
    data: (into: Favourite) => ({ playlist: from.media_content_id, value: at + 1, name: song.title.slice(0, 60), into: into.media_content_id }),
    said: (into: Favourite) => `${verb} to ${into.title}: ${name}`,
    pick: { title: `${copy ? "Copy" : "Move"} to another playlist`, text: `“${name}” goes at the end of the playlist you choose.${out}`, except: from.media_content_id },
  };
}

function last(): string | null {
  try {
    return localStorage.getItem(LAST);
  } catch {
    return null;
  }
}

function remember(playlist: Favourite) {
  try {
    localStorage.setItem(LAST, playlist.media_content_id);
  } catch {
    // Not kept on this device: the list keeps Sonos's order next time.
  }
}

/** The Sonos playlists among the favourites to offer: the one chosen `before` first, and
 * never `except`. */
export function offered(found: Favourite[], before: string | null, except?: string): Favourite[] {
  const all = found.filter((f) => f.playlist && f.media_content_id !== except);
  return [...all.filter((f) => f.media_content_id === before), ...all.filter((f) => f.media_content_id !== before)];
}

/** The sheet that asks which playlist, for the favourites as they were fetched: none
 * while they are being fetched, and a string when they couldn't be. */
export function chooser(found: Favourite[] | string | undefined, asked: Pick, cancel: () => void) {
  const before = last();
  const lists = Array.isArray(found) ? offered(found, before, asked.except) : [];
  const said =
    found === undefined
      ? html`<p>Fetching the playlists you have…</p>`
      : typeof found === "string"
        ? html`<p class="lost">The playlists couldn't be fetched: ${found}</p>`
        : lists.length
          ? nothing
          : html`<p class="lost">There is no ${asked.except ? "other " : ""}playlist to put it in. Save a queue as a playlist first.</p>`;
  return html`<div class="sheet" role="dialog" aria-label=${asked.title}>
    <h4>${asked.title}</h4>
    <p>${asked.text}</p>
    ${said}
    <div class="acts picks">
      ${lists.map((p) => html`<button class=${p.media_content_id === before ? "main" : ""} @click=${() => (remember(p), asked.pick(p))}>${p.title}</button>`)}
    </div>
    <div class="acts"><button class="sep" @click=${cancel}>Cancel</button></div>
  </div>`;
}
