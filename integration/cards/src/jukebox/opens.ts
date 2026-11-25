// The big player, opened by any button of a dashboard (owner, 2026-11-25): Home
// Assistant's own Tile, Button or Picture card, or anyone else's, given this tap action:
//
//   tap_action:
//     action: fire-dom-event
//     casa_mia_jukebox:
//       room: media_player.kitchen
//       tab: favourites        # optional: queue, rooms, favourites or search
//
// So a look Jukebox's own cards don't have is made from another card, and not asked of
// them as one more option. Home Assistant sends the action's words to the window as
// `ll-custom`; Jukebox's file is in every page, so it is heard whatever the page shows.
import { fire, type Hass } from "../ha.ts";
import { TABS, type Tab, open } from "./big.ts";
import { wanted } from "./common.ts";

const LISTENING = "casaMiaJukeboxListening";

/** Hear such buttons for as long as the page lasts; once, however often this file loads. */
export function listen(): void {
  const page = window as unknown as Record<string, unknown>;
  if (page[LISTENING]) return;
  page[LISTENING] = true;

  window.addEventListener("ll-custom", (ev) => {
    const order = wanted((ev as CustomEvent).detail, TABS.map(([tab]) => tab));
    if (order === undefined) return;

    // Home Assistant's own element has `hass`, and shows its toasts.
    const home = document.querySelector("home-assistant") as (HTMLElement & { hass?: Hass }) | null;
    if (typeof order === "string" || !home?.hass) {
      const why = typeof order === "string" ? order : "Home Assistant isn't ready";
      console.warn(`CASA-MIA CARDS: Jukebox: ${why}`);
      if (home) fire(home, "hass-notification", { message: `Jukebox: ${why}` });
      return;
    }
    open(home.hass, order.room, order.tab as Tab | undefined);
  });
}
