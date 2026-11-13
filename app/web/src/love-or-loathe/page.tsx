/** Love it or Loathe it's page: each entry (some players, treated alike) with what its
 * players are playing now, its groups of songs and its stations. Every change is made at
 * once, in Home Assistant, and comes back by the feed. */

import { useCallback, useState, type ReactNode } from "react";
import { confirmBox } from "../confirm";
import { Select } from "../controls";
import { AreaHead, Empty, Shell } from "../page";
import { Segmented, Switch, Toasts, type Toast } from "../ui";
import guest from "../guest.module.css";
import ui from "../ui.module.css";
import css from "./love-or-loathe.module.css";
import { FEELINGS, HEAD, IN_HA, KINDS, TONE, change, holds, inShort, nameOf, rate, songs, type Entry, type Fed, type Feeling, type Group, type Playing, type Station, type View } from "./common";
import { GroupDialog, PlayersDialog, StationDialog, type StationBody } from "./dialogs";

/** Do something in Home Assistant; whether it was done. Refused, the reason is shown. */
type Act = (run: () => Promise<void>, done?: string) => Promise<boolean>;

/** `fed`: the feed, which the app's Home page follows for the tile too. */
export function LoveOrLoathePage({ fed }: { fed: Fed }) {
  const { view, problem, absent } = fed;
  const [dialog, setDialog] = useState<ReactNode>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 6000);
  }, []);

  const act: Act = async (run, done) => {
    try {
      await run();
      if (done) toast(done);
      return true;
    } catch (err) {
      toast((err as Error).message, "bad");
      return false;
    }
  };

  const setUp = (
    <>
      Add it in Home Assistant: Settings → Devices &amp; services → Add integration → <strong>Love it or Loathe it</strong>, and choose the media players to watch. Its groups
      and stations can then be made here.
    </>
  );

  return (
    <Shell {...HEAD}>
      {problem && <div className={guest.warning}>{problem}</div>}
      {absent && <Empty>Love it or Loathe it isn't set up in Home Assistant yet. {setUp}</Empty>}
      {!view && !problem && !absent && <p className={guest.notice}>Loading…</p>}
      {view?.entries.length === 0 && <Empty>Nothing is being watched. {setUp}</Empty>}

      {view?.entries.map((entry) => (
        <EntryArea key={entry.id} entry={entry} view={view} current={!problem} act={act} show={setDialog} />
      ))}

      {!!view?.entries.length && (
        <p className={guest.notice}>
          The groups and stations of an entry apply to all its players. To treat other players differently,{" "}
          <a href={IN_HA} target="_top">
            add the integration again
          </a>{" "}
          with those players; an entry is deleted there too.
        </p>
      )}
      {dialog}
      <Toasts toasts={toasts} />
    </Shell>
  );
}

function EntryArea({ entry, view, current, act, show }: { entry: Entry; view: View; current: boolean; act: Act; show: (dialog: ReactNode) => void }) {
  const close = () => show(null);
  const names = entry.players.map((p) => nameOf(view.players, p)).join(", ");

  /** Save from a dialog, which stays open if Home Assistant refuses. */
  const save = (name: string, fields: object, done: string) => act(() => change(name, entry, fields), done).then((ok) => ok && close());

  /** Move one of `among` (the groups, or the stations) up or down; the other kind keeps
   * its places. */
  const move = (among: { id: string }[], at: number, by: number) => {
    const ids = among.map((s) => s.id);
    [ids[at], ids[at + by]] = [ids[at + by], ids[at]];
    const others = (among === entry.groups ? entry.stations : entry.groups).map((s) => s.id);
    return act(() => change("order", entry, { order: [...ids, ...others] }));
  };

  const group = (g?: Group) =>
    show(<GroupDialog group={g} entry={entry} view={view} onClose={close} onSave={(body) => save("save_group", { ...body, ...(g ? { subentry_id: g.id } : {}) }, `${body.name} saved`)} />);
  const station = (s?: Station, from?: StationBody) =>
    show(
      <StationDialog
        station={s}
        from={from}
        entry={entry}
        view={view}
        onClose={close}
        onSave={(body) => save("save_station", { ...body, ...(s ? { subentry_id: s.id } : {}) }, `${body.name} saved`)}
      />,
    );
  const remove = async (what: { id: string; name: string }, question: string) =>
    (await confirmBox(question, { action: "Remove", danger: true })) && act(() => change("remove", entry, { subentry_id: what.id }), `${what.name} removed`);

  return (
    <section className={guest.area}>
      <AreaHead
        title={entry.title}
        blurb={`Watching ${names || "no players"}${entry.delay ? `, acting ${entry.delay} s after a new track` : ""}.`}
        action={
          <span className={css.headControls}>
            <Switch on={entry.enabled} label={`${entry.title} is watching its players`} onChange={(on) => act(() => change("enable", entry, { enabled: on }), on ? `${entry.title} is watching` : `${entry.title} is switched off`)} />
            <button className={ui.button} onClick={() => show(<PlayersDialog entry={entry} view={view} onClose={close} onSave={(body) => save("save_entry", body, `${body.name} saved`)} />)}>
              Players
            </button>
          </span>
        }
      />
      {!entry.running && <div className={guest.warning}>This entry isn't running in Home Assistant, so nothing is being watched. Its groups and stations can still be changed.</div>}
      {entry.running && !entry.enabled && <div className={guest.warning}>Switched off: nothing is watched and nothing is done until it is switched on again, here or with its Watching switch in Home Assistant.</div>}

      {entry.running && entry.enabled && current && <NowPlaying entry={entry} view={view} act={act} station={(from) => station(undefined, from)} />}

      <div className={css.subHead}>
        <h3 className={css.sub}>Groups of songs</h3>
        <button className={`${ui.primary} ${ui.small}`} onClick={() => group()}>
          + Add a group
        </button>
      </div>
      {entry.groups.length === 0 ? (
        <Empty>No groups yet. A group is some songs, how you feel about them now, and what to do when one comes on.</Empty>
      ) : (
        <ul className={css.rows}>
          {entry.groups.map((g, at) => (
            <li key={g.id} className={css.row} role="button" tabIndex={0} onClick={(e) => !(e.target as Element).closest("button") && group(g)} onKeyDown={(e) => e.target === e.currentTarget && e.key === "Enter" && group(g)}>
              <Mover at={at} of={entry.groups.length} name={g.name} onMove={(by) => move(entry.groups, at, by)} />
              <span className={css.main}>
                <span className={css.title}>
                  {g.name}
                  {g.person && <span className={guest.badge}>{nameOf(view.people, g.person)}</span>}
                </span>
                <span className={guest.rowMeta}>
                  {holds(g)}
                  {g.feeling !== "ignore" && ` · ${inShort(g[g.feeling])}`}
                </span>
              </span>
              <span className={css.controls}>
                <Segmented
                  value={g.feeling}
                  options={FEELINGS}
                  onChange={(feeling: Feeling) => {
                    const { id, home: _home, ...body } = g;
                    act(() => change("save_group", entry, { ...body, feeling, subentry_id: id }));
                  }}
                />
                <button className={`${ui.danger} ${ui.small}`} onClick={() => remove(g, `Remove the group ${g.name} and its ${songs(g.patterns)} songs?`)}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {entry.groups.length > 1 && <p className={guest.notice}>When a song is in two groups: a line with no * beats one with a *, then a loved group beats a loathed one, then the group higher up here.</p>}

      <div className={css.subHead}>
        <h3 className={css.sub}>Stations to switch to</h3>
        <button className={`${ui.primary} ${ui.small}`} onClick={() => station()}>
          + Add a station
        </button>
      </div>
      {entry.stations.length === 0 ? (
        <Empty>No stations yet. They are where a player goes when a group's action is to switch station.</Empty>
      ) : (
        <ul className={css.rows}>
          {entry.stations.map((s, at) => (
            <li key={s.id} className={css.row} role="button" tabIndex={0} onClick={(e) => !(e.target as Element).closest("button") && station(s)} onKeyDown={(e) => e.target === e.currentTarget && e.key === "Enter" && station(s)}>
              <Mover at={at} of={entry.stations.length} name={s.name} onMove={(by) => move(entry.stations, at, by)} />
              <span className={css.main}>
                <span className={css.title}>{s.name}</span>
                <span className={guest.rowMeta}>{s.media_content_id}</span>
              </span>
              <button className={`${ui.danger} ${ui.small}`} onClick={() => remove(s, `Remove the station ${s.name}?`)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {entry.stations.length > 1 && <p className={guest.notice}>Stations are tried from the top, skipping the one that is playing.</p>}

      <div className={css.subHead}>
        <h3 className={css.sub}>What happened</h3>
      </div>
      {entry.trail.length === 0 ? (
        <Empty>Nothing yet since Home Assistant started.</Empty>
      ) : (
        <ul className={css.trail}>
          {entry.trail.map((line, n) => (
            <li key={`${line.at}${n}`}>
              <time dateTime={line.at} title={new Date(line.at).toLocaleString()}>
                {new Date(line.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </time>
              <span className={`cm-pill ${KINDS[line.kind]?.[1] ?? "cm-muted"}`}>{KINDS[line.kind]?.[0] ?? line.kind}</span>
              <span>
                {line.player && <strong>{nameOf(view.players, line.player)}: </strong>}
                {line.text}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className={guest.notice}>
        A match is a song that a group has; the line after it says what was done, or why nothing was. This list holds the last 100 lines since Home Assistant started; its Logbook keeps
        them all, under this entry's Last match sensor.
      </p>
    </section>
  );
}

/** Up and down, for a row in a list whose order matters. */
function Mover({ at, of, name, onMove }: { at: number; of: number; name: string; onMove: (by: number) => void }) {
  if (of < 2) return null;
  return (
    <span className={css.move}>
      <button className="cm-chip cm-icon cm-quiet" disabled={at === 0} aria-label={`Move ${name} up`} title="Move up" onClick={() => onMove(-1)}>
        ▲
      </button>
      <button className="cm-chip cm-icon cm-quiet" disabled={at === of - 1} aria-label={`Move ${name} down`} title="Move down" onClick={() => onMove(1)}>
        ▼
      </button>
    </span>
  );
}

const STATES: Record<string, string> = { paused: "Paused", idle: "Idle", off: "Off", standby: "Standby", buffering: "Buffering", unavailable: "Unavailable", unknown: "Unknown", on: "On" };

/** What each player is playing, which group has it, and Love and Loathe for it. */
function NowPlaying({ entry, view, act, station }: { entry: Entry; view: View; act: Act; station: (from: StationBody) => void }) {
  // Whose song a rating is: one of the people the entry lets rate. Their first loved or
  // loathed song makes that group for them. "Me" is whoever is signed in, who must be
  // one of them too; Home Assistant says so if not.
  const [as, setAs] = useState("");
  const person = entry.raters.includes(as) ? as : "";
  const rated = entry.raters.length > 0;

  return (
    <>
      <div className={css.subHead}>
        <h3 className={css.sub}>Playing now</h3>
        {rated && (
          <label className={css.rateAs}>
            Rate as
            <Select value={person} onChange={setAs} aria-label="Whose song a rating is">
              <option value="">Me</option>
              {entry.raters.map((p) => (
                <option key={p} value={p}>
                  {nameOf(view.people, p)}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>
      <ul className={css.rows}>
        {entry.players.map((id) => {
          const playing: Playing = entry.playing[id] ?? { state: null };
          const name = nameOf(view.players, id);
          const on = playing.state === "playing";
          const group = entry.groups.find((g) => g.id === playing.group);
          const away = entry.away[id];
          const known = entry.stations.some((s) => s.media_content_id === playing.media_content_id);
          return (
            <li key={id} className={`${css.row} ${css.fixed}`}>
              <span className={css.main}>
                <span className={css.title}>
                  {name}
                  {playing.state === null ? (
                    <span className="cm-pill cm-bad">Not in Home Assistant</span>
                  ) : !on ? (
                    <span className="cm-pill">{STATES[playing.state] ?? playing.state}</span>
                  ) : group ? (
                    <span className={`cm-pill ${TONE[group.feeling]}`}>
                      {group.feeling === "love" ? "Loved" : "Loathed"}: {group.name}
                      {!!playing.repeats && ` (played ${playing.repeats} times)`}
                    </span>
                  ) : null}
                  {away && <span className="cm-pill cm-warn">Away until {new Date(away).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                </span>
                <span className={css.song}>
                  {!on ? "Nothing playing" : playing.title ? `${playing.title}${playing.artist ? ` by ${playing.artist}` : ""}` : "Playing, but it reports no title, so nothing can be matched"}
                </span>
              </span>
              {on && (
                <span className={css.controls}>
                  {rated && playing.title && (
                    <>
                      <button className="cm-chip cm-good" onClick={() => act(() => rate(id, "love", person), `Loved: ${playing.title}`)}>
                        Love it
                      </button>
                      <button className="cm-chip cm-bad" onClick={() => act(() => rate(id, "loathe", person), `Loathed: ${playing.title}`)}>
                        Loathe it
                      </button>
                    </>
                  )}
                  {playing.media_content_id && !known && !away && (
                    <button
                      className={`${ui.button} ${ui.small}`}
                      title="Add what this player is on as a station to switch to"
                      onClick={() => station({ name: "", media_content_id: playing.media_content_id!, media_content_type: playing.media_content_type || "music" })}
                    >
                      Make it a station
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {!rated && <p className={guest.notice}>Nobody may rate songs here yet. Choose who under Players: Who may rate.</p>}
    </>
  );
}
