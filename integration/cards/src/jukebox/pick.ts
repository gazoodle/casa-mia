// Choosing a Sonos playlist to put a song in: a radio song added (big.ts), or a song of
// one playlist moved or copied to another (big.ts, editor.ts). The playlist this device chose last
// is offered first, so someone who always adds to their own list finds it at the top.
// A new playlist can be named there too, and a song the playlist holds already is asked
// about before it is put in a second time.
import { css, html, nothing } from "lit";
import { type Favourite, type Song, ask } from "./common.ts";

/** Where this device keeps the playlist it chose last. A convenience only: a browser that
 * won't keep it (a private window) lists them in Sonos's order. */
const LAST = "casa-mia-jukebox-last-playlist";

/** What a chooser is for: its heading, what will happen, a playlist not to offer (the
 * one the song is in), and what to do with the playlist chosen. */
export type Pick = { title: string; text: string; except?: string; pick: (playlist: Favourite) => void };
/** A question put before something is done, as the player and the editor ask theirs. */
export type Sure = { warn: string; text: string; keep: string; go: string; run: () => void };
/** What Jukebox answered (`{}` when it had nothing to say), or none when it couldn't. */
export type Told = Record<string, unknown> | undefined;

/** Put a song in a playlist, asking first when it is in there already. `run` asks Jukebox
 * with what it is given, and has said so itself when it couldn't be done; `sure` puts the
 * question to the person; `done` is called once the song is in. */
export async function put(run: (data: object) => Promise<Told>, data: object, already: { text: string; go: string }, sure: (asked: Sure) => void, done: () => void): Promise<void> {
  const told = await run({ ...data, again: false });
  if (!told) return;
  if (!told.already) return done();
  const again = async () => {
    if (await run({ ...data, again: true })) done();
  };
  sure({ warn: "It is in there already", text: already.text, keep: "Leave it", go: already.go, run: again });
}

/** Make an empty Sonos playlist called `name`, and give it as the favourite it will be
 * listed as. It is the playlist chosen last from then on. Rejects with Jukebox's reason. */
export async function create(hass: Parameters<typeof ask>[0], room: string, name: string): Promise<Favourite> {
  const told = (await ask(hass, "playlist_new", room, { name })) as { playlist: string };
  const made: Favourite = { folder: "Playlists", title: name, live: false, playlist: true, picture: null, media_content_id: told.playlist, media_content_type: "favorite_item_id" };
  remember(made);
  return made;
}

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
    already: (into: Favourite) => ({ text: `“${name}” is in ${into.title} already.`, go: copy ? "Copy it anyway" : "Move it anyway" }),
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
 * while they are being fetched, and a string when they couldn't be. `make` is given the
 * name typed for a new one. */
export function chooser(found: Favourite[] | string | undefined, asked: Pick, cancel: () => void, make: (name: string) => void) {
  const named = (e: SubmitEvent) => {
    e.preventDefault();
    const name = String(new FormData(e.target as HTMLFormElement).get("name") ?? "").trim();
    if (name) make(name);
  };
  const before = last();
  const lists = Array.isArray(found) ? offered(found, before, asked.except) : [];
  const said =
    found === undefined
      ? html`<p>Fetching the playlists you have…</p>`
      : typeof found === "string"
        ? html`<p class="lost">The playlists couldn't be fetched: ${found}</p>`
        : lists.length
          ? nothing
          : html`<p>There is no ${asked.except ? "other " : ""}playlist yet. Name a new one below.</p>`;
  return html`<div class="sheet" role="dialog" aria-label=${asked.title}>
    <h4>${asked.title}</h4>
    <p>${asked.text}</p>
    ${said}
    <div class="acts picks">
      ${lists.map((p) => html`<button class=${p.media_content_id === before ? "main" : ""} @click=${() => (remember(p), asked.pick(p))}>${p.title}</button>`)}
    </div>
    <form class="new" @submit=${named}>
      <input name="name" maxlength="60" required autocomplete="off" placeholder="Or name a new playlist" aria-label="A name for a new playlist" />
      <button type="submit">New playlist</button>
    </form>
    <div class="acts"><button class="sep" @click=${cancel}>Cancel</button></div>
  </div>`;
}

/** The chooser's own look, for whatever shows it, on top of that one's sheets. */
export const PICK = css`
  .sheet .picks { max-height: 32vh; overflow: auto; }
  .sheet .lost { color: #ff9a8f; }
  .sheet .new { display: flex; gap: 8px; margin-top: 10px; }
  .sheet .new input { flex: 1; min-width: 0; margin: 0; padding: 13px 14px; border: 1px solid rgb(255 255 255 / 14%); border-radius: 14px; background: rgb(255 255 255 / 8%); color: #fff; font: inherit; font-size: 16px; }
  .sheet .new button { flex: none; padding: 0 16px; border-radius: 14px; background: rgb(255 255 255 / 10%); font-weight: 700; }
`;
