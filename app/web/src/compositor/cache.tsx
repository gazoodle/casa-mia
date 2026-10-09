import { useState } from "react";
import { BinIcon } from "../icons";
import { AreaHead } from "../page";
import { Dialog, Segmented } from "../ui";
import guest from "../guest.module.css";
import pipe from "../pipeline.module.css";
import ui from "../ui.module.css";
import { Act, Cache, Channel, ENGINES, State, StateBadge, Status, Table, Use, mb, ms, plural, seconds } from "./common";

/** A picture in the cache: a camera channel's (from the gatherer) or a composite (a
 * picture a generator drew). */
export type Item = {
  id: string;
  name: string;
  sub: string;
  kind: "camera" | "composite";
  age: number | null; // s; null while waiting for its first
  size: string;
  state?: State;
  note: string;
  uses: Use[];
  /** Its thumbnail's address, width wide: it changes only when a new picture comes (so the
   * browser fetches one only then). */
  src: (width: number) => string;
  purge: () => void;
};

export function born(age: number | null): string {
  return age == null ? "w" : String(Math.round(Date.now() / 1000 - age));
}

export function cacheItems(status: Status, act: Act): Item[] {
  const cameras = status.gatherer.channels.map(
    (c): Item => ({
      id: `c ${c.camera}`,
      name: c.title,
      sub: c.channel,
      kind: "camera",
      age: c.waiting ? null : c.age_s,
      size: c.picture ? `${c.picture[0]} × ${c.picture[1]}` : c.width ? `${c.width} × ${c.height}` : "size ?",
      state: c.state,
      note: [
        c.waiting ? "waiting for its first" : c.source === "stream" ? "stream" : "snapshot",
        // a picture not its channel's size (it would be drawn softer)
        c.picture && c.width && (c.picture[0] !== c.width || c.picture[1] !== c.height) ? `channel ${c.width} × ${c.height}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      uses: c.uses,
      src: (w) => `api/compositor/thumb/${encodeURIComponent(c.camera)}?w=${w}&whole=1&r=${born(c.waiting ? null : c.age_s)}`,
      purge: () => act("cache/forget", `Purged ${c.title} (${c.channel})`, { camera: c.camera }),
    }),
  );
  const composites = ENGINES.flatMap(([key, name]) =>
    (status[key]?.pictures ?? []).map(
      (p): Item => ({
        id: `p ${key} ${p.key}`,
        name: p.commander,
        sub: `${name.toLowerCase()}, ${p.width} × ${p.height}${p.asked ? ` at ${p.scale}×` : ""}`,
        kind: "composite",
        age: p.age_s,
        size: `${p.width} × ${p.height}`,
        note: `${p.kb} kB, drawn in ${p.draw_ms} ms`,
        uses: [],
        src: (w) => `api/compositor/thumb/${encodeURIComponent(p.key)}?engine=${key}&w=${w}&whole=1&r=${born(p.age_s)}`,
        purge: () => act("cache/forget", `Purged ${p.commander} (${name.toLowerCase()})`, { engine: key, picture: p.key }),
      }),
    ),
  );
  return [...cameras, ...composites];
}

export type View = "tiles" | "list";

export type Sort = "name" | "age";

/** A per-viewer choice kept in this browser (try: storage may be blocked). */
export function useKept<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T) || fallback;
    } catch {
      return fallback;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, v);
    } catch {
      /* not kept: fine */
    }
  };
  return [value, set];
}

export function CacheArea({
  items,
  cache,
  stale,
  busy,
  act,
  onShow,
}: {
  items: Item[];
  cache: Cache;
  stale: number;
  busy: boolean;
  act: Act;
  onShow: (id: string) => void;
}) {
  const [view, setView] = useKept<View>("cm.cache.view", "tiles");
  const [sort, setSort] = useKept<Sort>("cm.cache.sort", "name");
  const sorted = [...items].sort((a, b) =>
    sort === "age" ? (a.age ?? Infinity) - (b.age ?? Infinity) : a.name.localeCompare(b.name) || a.sub.localeCompare(b.sub),
  );
  const ageNote = (i: Item) => (i.age == null ? "" : `${seconds(i.age)} old`);
  const ageStyle = (i: Item) => (i.age != null && i.age > stale ? { color: "var(--warn)" } : undefined);
  const bin = (i: Item) => (
    <button
      className={ui.iconButton}
      disabled={busy}
      onClick={i.purge}
      title={i.kind === "camera" ? "Purge this picture: fetched afresh, “(Waiting …)” until then (its size is kept)" : "Purge this picture: drawn afresh at its next turn"}
      aria-label={`Purge ${i.name}, ${i.sub}`}
    >
      <BinIcon />
    </button>
  );
  return (
    <section className={guest.area}>
      <AreaHead
        title="Cache"
        blurb={`Every picture kept: each camera channel's newest (“(Waiting …)” until its first comes) and each composite the generators drew. ${plural(cache.pictures, "picture")} (${cache.cameras} cameras', ${cache.composites} composites; ${cache.waiting} channels waiting) and ${plural(cache.thumbnails, "thumbnail")}: ${mb(cache.bytes)}. Tap one for a live view; a bin purges it.`}
        action={
          <button className={ui.button} disabled={busy} onClick={() => act("cache/purge", "Cache purged")}>
            Purge all
          </button>
        }
      />
      <div className={pipe.controls}>
        <Segmented value={view} options={[["tiles", "Tiles"], ["list", "List"]]} onChange={setView} />
        <Segmented value={sort} options={[["name", "By name"], ["age", "Newest first"]]} onChange={setSort} />
      </div>
      {view === "tiles" ? (
        <div className={pipe.grid}>
          {sorted.map((i) => (
            <div key={i.id} className={pipe.card}>
              <button className={pipe.thumb} onClick={() => onShow(i.id)} title="A live view of this picture">
                <img src={i.src(240)} alt={`${i.name}, ${i.sub}`} loading="lazy" />
              </button>
              <div className={pipe.meta}>
                <strong>
                  {i.name} <span className={guest.rowMeta}>{i.sub}</span>
                </strong>
                <span>
                  {i.state ? <StateBadge state={i.state} /> : <span className={guest.badge}>composite</span>} {i.size}
                </span>
                <span className={guest.rowMeta} style={ageStyle(i)}>
                  {[ageNote(i), i.note].filter(Boolean).join(" · ")}
                </span>
                {i.uses.map((u) => (
                  <span key={`${u.picture} ${u.place}`} className={pipe.use} style={u.enlarged != null && u.enlarged > 1 ? { color: "var(--bad)" } : undefined}>
                    {u.picture}, {u.place} {u.width} × {u.height}
                    {u.enlarged == null ? "" : ` ×${u.enlarged}`}
                  </span>
                ))}
              </div>
              {bin(i)}
            </div>
          ))}
        </div>
      ) : (
        <Table head={["", "Name", "", "Kind", "Size", "Age", "", ""]}>
          {sorted.map((i) => (
            <tr key={i.id}>
              <td>
                <button className={pipe.mini} onClick={() => onShow(i.id)} title="A live view of this picture">
                  <img src={i.src(64)} alt="" loading="lazy" />
                </button>
              </td>
              <td>{i.name}</td>
              <td>{i.sub}</td>
              <td>{i.state ? <StateBadge state={i.state} /> : <span className={guest.badge}>composite</span>}</td>
              <td>{i.size}</td>
              <td style={ageStyle(i)}>{i.age == null ? "waiting" : seconds(i.age)}</td>
              <td className={guest.rowMeta}>{i.note}</td>
              <td>{bin(i)}</td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}

/** A channel's last surveys: what came of each, and why not its stream. */
export function Surveys({ c, onClose }: { c?: Channel; onClose: () => void }) {
  if (!c) return null;
  return (
    <Dialog
      title={`${c.title}, ${c.channel}: its surveys`}
      wide
      onClose={onClose}
      footer={
        <button className={ui.primary} onClick={onClose}>
          Close
        </button>
      }
    >
      <p className={pipe.use}>
        <code>{c.camera}</code>: its last five surveys, newest first. Each opens its stream for a first frame (through
        Home Assistant's go2rtc), else takes its snapshot.
      </p>
      <Table head={["When", "Came", "Took", "CPU", "Size", "Why not its stream"]}>
        {c.surveys.map((r) => (
          <tr key={r.at}>
            <td>{new Date(r.at * 1000).toLocaleTimeString()}</td>
            <td style={r.outcome === "stream" || r.outcome === "read" ? undefined : { color: "var(--warn)" }}>
              {r.outcome === "read" ? "being read anyway" : r.outcome}
            </td>
            <td>{seconds(r.took_s)}</td>
            <td>{r.cpu_ms != null ? ms(r.cpu_ms) : ""}</td>
            <td>{r.size ? `${r.size[0]} × ${r.size[1]}` : ""}</td>
            <td style={{ whiteSpace: "normal" }}>{r.why}</td>
          </tr>
        ))}
      </Table>
    </Dialog>
  );
}

/** One cached picture, larger, as it changes (with the page's polling). */
export function Preview({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <Dialog
      title={`${item.name}, ${item.sub}`}
      wide
      onClose={onClose}
      footer={
        <button className={ui.primary} onClick={onClose}>
          Close
        </button>
      }
    >
      <img className={pipe.big} src={item.src(1280)} alt={`${item.name}, ${item.sub}`} />
      <p className={pipe.use}>
        {item.state ? <StateBadge state={item.state} /> : <span className={guest.badge}>composite</span>} {item.size},{" "}
        {item.age == null ? "waiting for its first picture" : `${seconds(item.age)} old`}, {item.note}.
      </p>
    </Dialog>
  );
}
