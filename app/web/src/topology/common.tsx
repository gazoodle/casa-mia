/** Topology's page: what it is sent, and how it saves (docs/design/topology.md). Home
 * Assistant keeps the record (casa_mia's topology, which works with no app) and pushes
 * the feed at each change; the names of rooms and floors are Home Assistant's own
 * registries', never copied into the record. The page keeps nothing of its own. */

import { useEffect, useState } from "react";
import { homeConnection } from "../home";
import { TopologyIcon } from "../icons";
import { follow, type Conn } from "../sensor-watch/ha";

export const HEAD = {
  icon: <TopologyIcon />,
  title: "Topology",
  module: "topology",
  blurb: "How the home fits together: which buildings and sites its floors are in, and which room leads to which.",
};

export type Site = { id: string; name: string };
export type Building = { id: string; name: string; site: string | null; floors: string[]; areas: string[] };
export type Exit = { to: string; way?: string };
export type Broken = { kind: "building"; id: string; ref: string; why: string } | { kind: "connection"; a: string; b: string; ref: string; why: string };
/** casa_mia/topology/subscribe, as the contract says. */
export type Feed = { rev: number; sites: Site[]; buildings: Building[]; exits: Record<string, Exit[]>; broken: Broken[] };
/** One connection as it is saved: `back` null is the opposite of `way`. */
export type Connection = { a: string; b: string; way: string | null; back: string | null };
export type Saved = { sites: Site[]; buildings: Building[]; connections: Connection[] };

export type Area = { id: string; name: string; floor: string | null };
export type Floor = { id: string; name: string; level: number | null };
export type Registry = { areas: Area[]; floors: Floor[] };

/** The sixteen points in order round the compass, then up and down (model.py's). */
export const DIRECTIONS: [string, string][] = [
  ["n", "North"], ["nne", "North-north-east"], ["ne", "North-east"], ["ene", "East-north-east"],
  ["e", "East"], ["ese", "East-south-east"], ["se", "South-east"], ["sse", "South-south-east"],
  ["s", "South"], ["ssw", "South-south-west"], ["sw", "South-west"], ["wsw", "West-south-west"],
  ["w", "West"], ["wnw", "West-north-west"], ["nw", "North-west"], ["nnw", "North-north-west"],
  ["up", "Up"], ["down", "Down"],
]; // prettier-ignore
const WORD = Object.fromEntries(DIRECTIONS);
export const wayName = (way: string | null | undefined) => (way ? (WORD[way] ?? way) : "");

/** The point half way round; up and down swap. */
export function opposite(way: string): string {
  if (way === "up" || way === "down") return way === "up" ? "down" : "up";
  return DIRECTIONS[(DIRECTIONS.findIndex(([w]) => w === way) + 8) % 16][0];
}

/** The connections the feed's exits were worked out from, each once. The feed leaves out
 * what is broken, so a save made from them drops it: the save would be refused with it,
 * since it names what Home Assistant no longer has. The page says so beside it. */
export function connectionsOf(exits: Feed["exits"]): Connection[] {
  const out: Connection[] = [];
  const seen = new Set<string>();
  for (const [a, all] of Object.entries(exits)) {
    for (const { to, way } of all) {
      const pair = [a, to].sort().join("\n");
      if (seen.has(pair)) continue;
      seen.add(pair);
      const back = exits[to]?.find((e) => e.to === a)?.way ?? null;
      out.push({ a, b: to, way: way ?? null, back: way && back === opposite(way) ? null : back });
    }
  }
  return out;
}

export const savedOf = (feed: Feed): Saved => ({ sites: feed.sites, buildings: feed.buildings, connections: connectionsOf(feed.exits) });

/** A new id from a name, unlike any in `taken`: "Potting Shed" is potting_shed. */
export function idFor(name: string, taken: string[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "place";
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}_${n}`;
  return id;
}

/** What Home Assistant says when it refuses: {code, message}. */
const why = (err: unknown) => (err as { message?: string })?.message ?? String(err);

/** Save the whole record, based on the feed's `rev`. The new feed comes by the feed, as a
 * change made anywhere does; refused, the error says why (another save got there first:
 * the page already shows it). */
export async function save(rev: number, record: Saved): Promise<void> {
  const asked = homeConnection();
  if (!asked) throw new Error("This page isn't inside Home Assistant.");
  try {
    await (await asked).conn.sendMessagePromise({ type: "casa_mia/topology/save", rev, ...record });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    throw new Error(code === "stale" ? "Someone else saved a change first. The page now shows theirs: please make yours again." : why(err));
  }
}

/** The feed. `problem`: why what is shown may not be current, or why there is nothing.
 * `absent`: this isn't inside Home Assistant, or its Casa Mia integration is older than
 * Topology. */
export type Fed = { feed?: Feed; problem?: string; absent?: boolean };

/** Follow one of Home Assistant's feeds while mounted; `use` gets the connection. */
function useConn(use: (conn: Conn) => () => void, onAbsent: () => void, onFailed: (problem: string) => void) {
  useEffect(() => {
    const asked = homeConnection();
    if (!asked) return onAbsent();
    let over = false;
    let stop = () => {};
    asked.then(
      ({ conn }) => {
        if (!over) stop = use(conn);
      },
      (err) => onFailed(`No connection to Home Assistant (${err})`),
    );
    return () => {
      over = true;
      stop();
    };
  }, []);
}

export function useTopology(): Fed {
  const [fed, setFed] = useState<Fed>({});
  useConn(
    (conn) => {
      // Home Assistant's connection subscribes again by itself once it is back, and the
      // feed then sends everything: until it does, what is shown isn't being kept current.
      const lost = () => setFed((was) => ({ ...was, problem: "The connection to Home Assistant is lost, so this may not be how things are now." }));
      conn.addEventListener("disconnected", lost);
      const unfollow = follow<Feed>(conn, { type: "casa_mia/topology/subscribe" }, (feed) => setFed({ feed }), (reason, code) =>
        setFed(code === "unknown_command" ? { absent: true } : { problem: `Home Assistant refused: ${reason}` }),
      );
      return () => {
        conn.removeEventListener("disconnected", lost);
        unfollow();
      };
    },
    () => setFed({ absent: true }),
    (problem) => setFed({ problem }),
  );
  return fed;
}

type HaArea = { area_id: string; name: string; floor_id: string | null };
type HaFloor = { floor_id: string; name: string; level: number | null };

/** Home Assistant's areas and floors, by name, listed again whenever either registry
 * changes (pushed: its own registry events). */
export function useRegistry(): { registry?: Registry; problem?: string } {
  const [got, setGot] = useState<{ registry?: Registry; problem?: string }>({});
  useConn(
    (conn) => {
      const list = () =>
        Promise.all([
          conn.sendMessagePromise<HaArea[]>({ type: "config/area_registry/list" }),
          conn.sendMessagePromise<HaFloor[]>({ type: "config/floor_registry/list" }),
        ]).then(
          ([areas, floors]) =>
            setGot({
              registry: {
                areas: areas.map((a) => ({ id: a.area_id, name: a.name, floor: a.floor_id })).sort((x, y) => x.name.localeCompare(y.name)),
                floors: floors
                  .map((f) => ({ id: f.floor_id, name: f.name, level: f.level }))
                  .sort((x, y) => (x.level ?? 0) - (y.level ?? 0) || x.name.localeCompare(y.name)),
              },
            }),
          (err) => setGot((was) => ({ ...was, problem: `Home Assistant's areas couldn't be read: ${why(err)}` })),
        );
      const failed = (reason: string) => setGot((was) => ({ ...was, problem: `Changes to Home Assistant's areas aren't being followed: ${reason}` }));
      const stops = ["area_registry_updated", "floor_registry_updated"].map((event_type) => follow(conn, { type: "subscribe_events", event_type }, list, failed));
      void list();
      return () => stops.forEach((stop) => stop());
    },
    () => undefined, // the feed says this page isn't inside Home Assistant
    (problem) => setGot({ problem }),
  );
  return got;
}

/** Mermaid's quotes are its own: a name with " in it would end the label. */
const label = (text: string) => `"${text.replace(/"/g, "#quot;")}"`;

/** The picture as Mermaid text, made from the feed and never read back: sites, buildings
 * and floors are nested boxes, rooms are nodes, connections lines with their directions.
 * Every room is drawn, so one with no way in stands apart. */
export function mermaidOf(feed: Feed, { areas, floors }: Registry): string {
  const out = ["flowchart TB"];
  const room = (a: Area) => `  a_${a.id}[${label(a.name)}]`;
  const floorBox = (f: Floor) => [`subgraph f_${f.id}[${label(f.name)}]`, ...areas.filter((a) => a.floor === f.id).map(room), "end"];
  const placed = new Set(feed.buildings.flatMap((b) => b.floors));
  const building = (b: Building) => {
    const inside = [...floors.filter((f) => b.floors.includes(f.id)).flatMap(floorBox), ...areas.filter((a) => b.areas.includes(a.id)).map(room)];
    // An empty box is drawn by Mermaid as a stray name: an empty building is a box of its own.
    return inside.length ? [`subgraph b_${b.id}[${label(b.name)}]`, ...inside, "end"] : [`  b_${b.id}[${label(`${b.name} (nothing in it)`)}]`];
  };

  for (const s of feed.sites) {
    const inside = feed.buildings.filter((b) => b.site === s.id).flatMap(building);
    out.push(...(inside.length ? [`subgraph s_${s.id}[${label(s.name)}]`, ...inside, "end"] : [`  s_${s.id}[${label(`${s.name} (nothing in it)`)}]`]));
  }
  out.push(...feed.buildings.filter((b) => !feed.sites.some((s) => s.id === b.site)).flatMap(building));
  out.push(...floors.filter((f) => !placed.has(f.id)).flatMap(floorBox));
  const inBuilding = new Set(feed.buildings.flatMap((b) => b.areas));
  out.push(...areas.filter((a) => !a.floor && !inBuilding.has(a.id)).map(room));

  for (const c of connectionsOf(feed.exits)) {
    const back = c.back ?? (c.way ? opposite(c.way) : null);
    out.push(c.way || back ? `a_${c.a} ---|${label(`${c.way ?? "?"} / ${back ?? "?"}`)}| a_${c.b}` : `a_${c.a} --- a_${c.b}`);
  }
  return out.join("\n");
}
