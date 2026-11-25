/** Jukebox's music for Casa Mia's Home tile. Jukebox is an integration of its own in Home
 * Assistant, which the app knows nothing of: the tile follows its feed of the house's
 * music (its page.py), as Sensor Watch's tile follows its summary, and is shown only where
 * Jukebox is set up. */

import { useEffect, useState } from "react";
import { homeConnection } from "./home";
import { follow } from "./sensor-watch/ha";

type Group = { rooms: string[]; quiet: boolean; state: string; title: string; channel: string };
type House = { groups: Group[]; rooms: Record<string, { name: string }> };

/** What the tile shows (modules.tsx). Empty until Jukebox answers, and for good where it
 * isn't set up: no tile. */
export type Music = { rooms?: number; playing?: number; now?: string; problem?: string };

/** The house's music, pushed at each change. */
export function useMusic(): Music {
  const [music, setMusic] = useState<Music>({});
  useEffect(() => {
    const asked = homeConnection();
    if (!asked) return; // not inside Home Assistant: nothing to ask, so no tile

    let over = false;
    let stop = () => {};
    const heard = (house: House) => {
      const playing = house.groups.filter((g) => !g.quiet && g.state === "playing");
      const first = playing[0];
      const where = first?.rooms.map((room) => house.rooms[room]?.name ?? room).join(" + ");
      setMusic({
        rooms: Object.keys(house.rooms).length,
        playing: playing.reduce((n, g) => n + g.rooms.length, 0),
        now: first && `${first.channel || first.title || "Something"} in ${where}`,
      });
    };
    asked.then(
      ({ conn }) => {
        if (over) return;
        stop = follow<House>(conn, { type: "casa_mia_jukebox/house" }, heard, (why, code) => {
          if (code !== "unknown_command") setMusic({ problem: `Home Assistant refused: ${why}` }); // else: not set up
        });
      },
      (err) => setMusic({ problem: `No connection to Home Assistant (${err})` }),
    );
    return () => {
      over = true;
      stop();
    };
  }, []);
  return music;
}
