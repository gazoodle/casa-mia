/** Topology's page: each room with its ways out, the buildings and sites, what is broken,
 * and a picture of it all. Each change saves the whole record at once, in Home Assistant,
 * and comes back by the feed, as a change made anywhere does. */

import { useState, type ReactNode } from "react";
import { confirmBox } from "../confirm";
import { AreaHead, Empty, Shell } from "../page";
import { Toasts, useToasts } from "../ui";
import guest from "../guest.module.css";
import ui from "../ui.module.css";
import css from "./topology.module.css";
import { HEAD, connectionsOf, idFor, mermaidOf, opposite, save, savedOf, useRegistry, wayName, type Area, type Connection, type Fed, type Feed, type Registry, type Saved } from "./common";
import { BuildingDialog, ExitDialog, SiteDialog } from "./dialogs";
import { Picture } from "./picture";

/** Save the record as `change` makes it; whether it was kept. Refused, the reason is shown. */
type Keep = (change: (saved: Saved) => Saved, done: string) => Promise<boolean>;
type Show = (dialog: ReactNode) => void;
type Parts = { feed: Feed; registry: Registry; keep: Keep; show: Show; name: (id: string) => string };

/** `fed`: the feed, which the app's Home page follows for the tile too. */
export function TopologyPage({ fed }: { fed: Fed }) {
  const { feed, problem, absent } = fed;
  const [dialog, show] = useState<ReactNode>(null);
  const { registry, problem: unread } = useRegistry();
  const [toasts, toast] = useToasts();

  const keep: Keep = async (change, done) => {
    if (!feed) return false;
    try {
      await save(feed.rev, change(savedOf(feed)));
      toast(done);
      return true;
    } catch (err) {
      toast((err as Error).message, "bad");
      return false;
    }
  };
  const names = new Map(registry?.areas.map((a) => [a.id, a.name]));
  const name = (id: string) => names.get(id) ?? id;

  return (
    <Shell {...HEAD}>
      {problem && <div className={guest.warning}>{problem}</div>}
      {unread && <div className={guest.warning}>{unread}</div>}
      {absent && (
        <Empty>
          Topology is kept by Casa Mia's integration in Home Assistant, and the one there is older than Topology. Update the app, and restart Home Assistant when it
          asks.
        </Empty>
      )}
      {!(feed && registry) && !problem && !unread && !absent && <p className={guest.notice}>Loading…</p>}

      {feed && registry && (
        <>
          <BrokenArea feed={feed} keep={keep} name={name} />
          <RoomsArea {...{ feed, registry, keep, show, name }} />
          <BuildingsArea {...{ feed, registry, keep, show, name }} />
          <Picture text={mermaidOf(feed, registry)} />
        </>
      )}
      {dialog}
      <Toasts toasts={toasts} />
    </Shell>
  );
}

/** What names something Home Assistant no longer has: shown, with what it pointed at,
 * and left out of what dashboards are sent. A save can't keep it, so the next one drops it. */
function BrokenArea({ feed, keep, name }: { feed: Feed; keep: Keep; name: (id: string) => string }) {
  if (!feed.broken.length) return null;
  const building = (id: string) => feed.buildings.find((b) => b.id === id)?.name ?? id;
  return (
    <section className={guest.area}>
      <AreaHead
        title="Broken"
        blurb="These name a room or floor that Home Assistant no longer has, or a room that has since been put on a floor (its floor's building now says where it is). Dashboards aren't given them, and the next change saved here drops them."
        action={
          <button className={ui.button} onClick={() => keep((saved) => saved, "The broken entries are dropped")}>
            Drop them
          </button>
        }
      />
      <ul className={css.rows}>
        {feed.broken.map((b, i) => (
          <li key={i} className={`${css.row} ${css.fixed}`}>
            <span className="cm-pill cm-bad">{b.why === "gone" ? "Gone" : "On a floor"}</span>
            <span className={css.main}>
              {b.kind === "connection"
                ? `The way from ${name(b.a)} to ${name(b.b)}: Home Assistant no longer has ${name(b.ref)}.`
                : b.why === "gone"
                  ? `${building(b.id)} names ${b.ref}, which Home Assistant no longer has.`
                  : `${building(b.id)} names ${name(b.ref)}, a room that is now on a floor.`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A connection as seen from `room`: `a` is the room, `way` the way out of it. */
function seenFrom(room: string, c: Connection): Connection {
  if (c.a === room) return c;
  const way = c.back ?? (c.way ? opposite(c.way) : null);
  return { a: room, b: c.a, way, back: way && c.way === opposite(way) ? null : c.way };
}

const samePair = (c: Connection, x: string, y: string) => (c.a === x && c.b === y) || (c.a === y && c.b === x);

function RoomsArea({ feed, registry, keep, show, name }: Parts) {
  const close = () => show(null);
  const fromDialog = (change: (s: Saved) => Saved, done: string) => keep(change, done).then((ok) => ok && close());
  const inBuilding = (floor: string) => feed.buildings.find((b) => b.floors.includes(floor))?.name;
  const groups: [string, Area[]][] = [
    ...registry.floors.map((f): [string, Area[]] => [inBuilding(f.id) ? `${f.name} · ${inBuilding(f.id)}` : f.name, registry.areas.filter((a) => a.floor === f.id)]),
    ["On no floor", registry.areas.filter((a) => !a.floor)] as [string, Area[]],
  ].filter(([, rooms]) => rooms.length);

  const open = (room: Area, to?: string) => {
    const found = to ? connectionsOf(feed.exits).find((c) => samePair(c, room.id, to)) : undefined;
    const given = found && seenFrom(room.id, found);
    const others = (s: Saved) => s.connections.filter((c) => !to || !samePair(c, room.id, to));
    show(
      <ExitDialog
        from={room}
        given={given}
        joined={(feed.exits[room.id] ?? []).map((e) => e.to)}
        registry={registry}
        onClose={close}
        onSave={(c) => fromDialog((s) => ({ ...s, connections: [...others(s), c] }), `${room.name} to ${name(c.b)} saved`)}
        onRemove={
          to
            ? async () => {
                if (await confirmBox(`Remove the way between ${room.name} and ${name(to)}? It goes from both rooms.`, { action: "Remove", danger: true }))
                  await fromDialog((s) => ({ ...s, connections: others(s) }), `${room.name} to ${name(to)} removed`);
              }
            : undefined
        }
      />,
    );
  };

  return (
    <section className={guest.area}>
      <AreaHead title="Rooms" blurb="Each room's ways out. A way added to one room is added to the other too. Rooms are Home Assistant's areas, and are added and named there." />
      {!groups.length && <Empty>Home Assistant has no areas yet.</Empty>}
      {groups.map(([title, rooms]) => (
        <div key={title}>
          <h3 className={css.sub}>{title}</h3>
          <ul className={css.rows}>
            {rooms.map((room) => {
              const exits = feed.exits[room.id] ?? [];
              return (
                <li key={room.id} className={`${css.row} ${css.fixed}`}>
                  <span className={css.main}>
                    <span className={css.title}>{room.name}</span>
                    <span className={css.exits}>
                      {exits.length === 0 && <span className="cm-pill cm-warn">No way in</span>}
                      {exits.map((e) => (
                        <button key={e.to} className="cm-chip" title="Change or remove this way" onClick={() => open(room, e.to)}>
                          {e.way ? `${wayName(e.way)} to ${name(e.to)}` : `To ${name(e.to)}`}
                        </button>
                      ))}
                    </span>
                  </span>
                  <button className={ui.button} onClick={() => open(room)}>
                    Add a way
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function BuildingsArea({ feed, registry, keep, show, name }: Parts) {
  const close = () => show(null);
  const fromDialog = (change: (s: Saved) => Saved, done: string) => keep(change, done).then((ok) => ok && close());
  const floorName = (id: string) => registry.floors.find((f) => f.id === id)?.name ?? id;
  const siteName = (id: string | null) => feed.sites.find((s) => s.id === id)?.name;
  const taken = [...feed.sites, ...feed.buildings].map((x) => x.id);
  const removing = async (what: string, change: (s: Saved) => Saved, also = "") =>
    (await confirmBox(`Remove ${what}?${also}`, { action: "Remove", danger: true })) && (await fromDialog(change, `${what} removed`));

  const building = (given?: Feed["buildings"][number]) =>
    show(
      <BuildingDialog
        given={given}
        others={feed.buildings.filter((b) => b.id !== given?.id)}
        sites={feed.sites}
        registry={registry}
        onClose={close}
        onSave={(b) =>
          fromDialog(
            (s) => ({
              ...s,
              buildings: given ? s.buildings.map((x) => (x.id === given.id ? { ...b, id: given.id } : x)) : [...s.buildings, { ...b, id: idFor(b.name, taken) }],
            }),
            `${b.name} saved`,
          )
        }
        onRemove={given && (() => removing(given.name, (s) => ({ ...s, buildings: s.buildings.filter((x) => x.id !== given.id) }), " Its floors and rooms stay in Home Assistant."))}
      />,
    );
  const site = (given?: Feed["sites"][number]) =>
    show(
      <SiteDialog
        given={given}
        onClose={close}
        onSave={(n) =>
          fromDialog(
            (s) => ({ ...s, sites: given ? s.sites.map((x) => (x.id === given.id ? { ...x, name: n } : x)) : [...s.sites, { id: idFor(n, taken), name: n }] }),
            `${n} saved`,
          )
        }
        onRemove={
          given &&
          (() =>
            removing(
              given.name,
              (s) => ({ ...s, sites: s.sites.filter((x) => x.id !== given.id), buildings: s.buildings.map((b) => (b.site === given.id ? { ...b, site: null } : b)) }),
              " Its buildings stay, on no site.",
            ))
        }
      />,
    );

  const row = (key: string, title: string, meta: string, onClick: () => void) => (
    <li key={key}>
      <button className={`${css.row} ${css.pick}`} onClick={onClick}>
        <span className={css.main}>
          <span className={css.title}>{title}</span>
          <span className={css.meta}>{meta}</span>
        </span>
      </button>
    </li>
  );

  return (
    <section className={guest.area}>
      <AreaHead
        title="Buildings and sites"
        blurb="Home Assistant has floors but nothing above them. A building holds floors, and rooms on no floor such as a shed; a site holds buildings."
        action={
          <span className={css.controls}>
            <button className={ui.button} onClick={() => site()}>
              Add a site
            </button>
            <button className={ui.primary} onClick={() => building()}>
              Add a building
            </button>
          </span>
        }
      />
      {!feed.buildings.length && !feed.sites.length && <Empty>No buildings yet. Dashboards then take the house to be one building.</Empty>}
      <ul className={css.rows}>
        {feed.sites.map((s) =>
          row(`s_${s.id}`, s.name, `Site · ${feed.buildings.filter((b) => b.site === s.id).map((b) => b.name).join(", ") || "no buildings"}`, () => site(s)),
        )}
        {feed.buildings.map((b) =>
          row(
            `b_${b.id}`,
            b.name,
            [siteName(b.site), ...b.floors.map(floorName), ...b.areas.map(name)].filter(Boolean).join(" · ") || "Nothing in it yet",
            () => building(b),
          ),
        )}
      </ul>
    </section>
  );
}
