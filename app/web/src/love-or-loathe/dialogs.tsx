/** The page's three dialogs: a group of songs, a station, and an entry's players. Each
 * hands back what to save; the page sends it, and keeps the dialog open if it is refused. */

import { useState } from "react";
import { Select } from "../controls";
import { Dialog, Field, Segmented } from "../ui";
import guest from "../guest.module.css";
import ui from "../ui.module.css";
import css from "./love-or-loathe.module.css";
import { ACTIONS, FEELINGS, NO_REPEATS, USUAL, nameOf, type Act, type Action, type Entry, type Feeling, type Group, type Station, type View } from "./common";

function Buttons({ onClose, onSave, ready }: { onClose: () => void; onSave: () => void; ready: boolean }) {
  return (
    <>
      <button className={ui.button} onClick={onClose}>
        Cancel
      </button>
      <button className={ui.primary} disabled={!ready} onClick={onSave}>
        Save
      </button>
    </>
  );
}

const number = (text: string) => (Number.isFinite(Number(text)) ? Number(text) : 0);

/** What to do while the group is loved, or loathed: only the numbers its action uses. */
function ActEditor({ title, act, onChange, stations }: { title: string; act: Act; onChange: (act: Act) => void; stations: number }) {
  return (
    <div className={css.act}>
      <h3>{title}</h3>
      <Select value={act.action} onChange={(action) => onChange({ ...act, action: action as Action })} aria-label={`${title}: when one comes on`}>
        {ACTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      {act.action === "volume" && (
        <Field label="Volume change, in %" help="A percentage of the volume at the time: 10 turns it up a tenth, -50 halves it. It is put back at the next track.">
          <input type="number" min={-100} max={200} step={5} value={act.amount} onChange={(e) => onChange({ ...act, amount: number(e.target.value) })} />
        </Field>
      )}
      {act.action === "switch" && (
        <Field
          label="Minutes on the other station"
          help={stations ? "The player then goes back to what it was playing." : "There is no station to switch to yet: add one first."}
        >
          <input type="number" min={1} max={120} value={act.minutes} onChange={(e) => onChange({ ...act, minutes: number(e.target.value) })} />
        </Field>
      )}
    </div>
  );
}

export type GroupBody = Omit<Group, "id" | "home">;

export function GroupDialog({
  group,
  entry,
  view,
  onClose,
  onSave,
}: {
  group?: Group;
  entry: Entry;
  view: View;
  onClose: () => void;
  onSave: (body: GroupBody) => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [feeling, setFeeling] = useState<Feeling>(group?.feeling ?? "loathe");
  const [patterns, setPatterns] = useState(group?.patterns ?? "");
  const [person, setPerson] = useState(group?.person ?? "");
  const [love, setLove] = useState<Act>(group?.love ?? USUAL.love);
  const [loathe, setLoathe] = useState<Act>(group?.loathe ?? USUAL.loathe);
  const [repeats, setRepeats] = useState(group?.repeats ?? NO_REPEATS);
  const [shipped, setShipped] = useState("");

  // A shipped list fills the box, and from then on its songs are this group's own.
  const start = (key: string) => {
    setShipped(key);
    const list = view.libraries[key];
    if (!list) return;
    setPatterns(list.patterns.join("\n"));
    if (!name.trim()) setName(list.name);
  };

  return (
    <Dialog
      title={group ? `Change ${group.name}` : "Add a group of songs"}
      wide
      onClose={onClose}
      footer={<Buttons onClose={onClose} ready={!!name.trim()} onSave={() => onSave({ name: name.trim(), feeling, patterns, person, repeats, love, loathe })} />}
    >
      {!group && (
        <Field label="Start with" help="A shipped list is put into the Songs box below, and from then on the songs are yours to add to and cut.">
          <Select value={shipped} onChange={start}>
            <option value="">An empty list</option>
            {Object.entries(view.libraries).map(([key, list]) => (
              <option key={key} value={key}>
                {list.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Right now these songs are" help="Chooses which of the two actions below applies. Ignored, the group does nothing. An automation can change it with the group's select.">
        <Segmented value={feeling} options={FEELINGS} onChange={setFeeling} />
      </Field>
      <Field
        label="Songs"
        help="One per line: a title, or a title and an artist as Title | Artist. Use * for anything, for example *love* or * | Black Lace. Capitals and punctuation don't matter. It can be left empty for a person's list that fills up as they rate songs."
      >
        <textarea className={css.songs} value={patterns} spellCheck={false} onChange={(e) => setPatterns(e.target.value)} />
      </Field>
      <Field
        label="Songs played too often"
        help={
          repeats.times
            ? "For a station with a short playlist: any song is this group's the time it reaches this count, whatever the song. A song that a group names is treated as that group says."
            : "For a station with a short playlist: set a number of times, and any song played that often is this group's too. At 0 this is off."
        }
      >
        <span className={css.often}>
          <input type="number" min={0} max={20} value={repeats.times} aria-label="Times played" onChange={(e) => setRepeats({ ...repeats, times: number(e.target.value) })} />
          times in the last
          <input type="number" min={1} max={48} value={repeats.hours} aria-label="Hours" onChange={(e) => setRepeats({ ...repeats, hours: number(e.target.value) })} />
          hours
        </span>
      </Field>
      <Field label="Belongs to" help="Optional. Rating a song adds it to this person's loved group or loathed group. Give a person one group set to Love and one set to Loathe.">
        <Select value={person} onChange={setPerson}>
          <option value="">Nobody</option>
          {view.people.map((p) => (
            <option key={p.entity_id} value={p.entity_id}>
              {p.name}
            </option>
          ))}
          {person && !view.people.some((p) => p.entity_id === person) && <option value={person}>Unknown ({person})</option>}
        </Select>
      </Field>
      <ActEditor title="While loved" act={love} onChange={setLove} stations={entry.stations.length} />
      <ActEditor title="While loathed" act={loathe} onChange={setLoathe} stations={entry.stations.length} />
    </Dialog>
  );
}

export type StationBody = Omit<Station, "id">;

export function StationDialog({
  station,
  from,
  entry,
  view,
  onClose,
  onSave,
}: {
  station?: Station;
  /** A new one, started from what a player is playing. */
  from?: StationBody;
  entry: Entry;
  view: View;
  onClose: () => void;
  onSave: (body: StationBody) => void;
}) {
  const [name, setName] = useState(station?.name ?? from?.name ?? "");
  const [id, setId] = useState(station?.media_content_id ?? from?.media_content_id ?? "");
  const [type, setType] = useState(station?.media_content_type ?? from?.media_content_type ?? "music");
  // The players that say what they are playing: tune one to the station, then take it.
  const telling = entry.players.filter((p) => entry.playing[p]?.media_content_id);
  const take = (player: string) => {
    const playing = entry.playing[player];
    setId(playing.media_content_id ?? "");
    setType(playing.media_content_type || "music");
  };

  return (
    <Dialog
      title={station ? `Change ${station.name}` : "Add a station"}
      onClose={onClose}
      footer={<Buttons onClose={onClose} ready={!!name.trim() && !!id.trim() && !!type.trim()} onSave={() => onSave({ name: name.trim(), media_content_id: id.trim(), media_content_type: type.trim() })} />}
    >
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field
        label="Take it from a player"
        help={
          telling.length
            ? "Tune a player to the station, then choose the player here. To browse for a station instead, add it from the integration's page in Home Assistant."
            : "None of these players says what it is playing just now. Start the station on one of them, or add it from the integration's page in Home Assistant, which can browse for it."
        }
      >
        <Select value="" onChange={take} disabled={!telling.length} placeholder={telling.length ? "Choose a player…" : "Nothing is playing"}>
          {telling.map((p) => (
            <option key={p} value={p}>
              {`${nameOf(view.players, p)}: ${entry.playing[p].title || entry.playing[p].media_content_id}`}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="What to play" help="The media content id the player is given, as it reports it when the station is on.">
        <input value={id} spellCheck={false} onChange={(e) => setId(e.target.value)} />
      </Field>
      <Field label="Its type" help="The media content type that goes with it. For a radio station this is nearly always music.">
        <input value={type} spellCheck={false} onChange={(e) => setType(e.target.value)} />
      </Field>
    </Dialog>
  );
}

export type EntryBody = { name: string; players: string[]; delay: number };

export function PlayersDialog({ entry, view, onClose, onSave }: { entry: Entry; view: View; onClose: () => void; onSave: (body: EntryBody) => void }) {
  const [name, setName] = useState(entry.title);
  const [players, setPlayers] = useState(entry.players);
  const [delay, setDelay] = useState(entry.delay);
  // Another entry's players can't be taken: two acting on one would undo each other.
  const elsewhere = new Map(view.entries.filter((e) => e.id !== entry.id).flatMap((e) => e.players.map((p) => [p, e.title] as const)));
  // One that is watched but no longer in Home Assistant is still shown, to be unticked.
  const all = [...view.players, ...players.filter((p) => !view.players.some((n) => n.entity_id === p)).map((p) => ({ entity_id: p, name: p }))];

  return (
    <Dialog
      title={`${entry.title}: its players`}
      onClose={onClose}
      footer={<Buttons onClose={onClose} ready={!!name.trim() && players.length > 0} onSave={() => onSave({ name: name.trim(), players, delay })} />}
    >
      <Field label="Name" help="Shown on its device and entities in Home Assistant.">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Media players to watch" help="Any player that reports the title of what it is playing. For speakers playing as one group, only the group's leader acts.">
        <div className={css.players}>
          {all.map((p) => (
            <label key={p.entity_id} className={guest.check}>
              <input
                type="checkbox"
                checked={players.includes(p.entity_id)}
                disabled={elsewhere.has(p.entity_id)}
                onChange={(e) => setPlayers((was) => (e.target.checked ? [...was, p.entity_id] : was.filter((id) => id !== p.entity_id)))}
              />
              <span>
                {p.name}
                {elsewhere.has(p.entity_id) && <span className={guest.checkHelp}>Watched by {elsewhere.get(p.entity_id)}.</span>}
              </span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Delay, in seconds" help="How long to wait after a player reports a new track before acting. Leave it at 0 unless the title changes before the song does.">
        <input type="number" min={0} max={60} value={delay} onChange={(e) => setDelay(number(e.target.value))} />
      </Field>
    </Dialog>
  );
}
