/** Topology's dialogs: an exit, a building, a site. Each hands back what was chosen; the
 * page saves it, and a dialog stays open if Home Assistant refuses. */

import { useState, type ReactNode } from "react";
import { Select } from "../controls";
import { Dialog, Field } from "../ui";
import ui from "../ui.module.css";
import { DIRECTIONS, opposite, wayName, type Area, type Building, type Connection, type Registry, type Site } from "./common";

type Done = Promise<unknown>;

/** Cancel and Save (Add, for something new); Remove too, for something that exists. */
function Footer({ onClose, ready, label, onSave, onRemove }: { onClose: () => void; ready: boolean; label: string; onSave: () => Done; onRemove?: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      {onRemove && (
        <button className={ui.danger} onClick={onRemove}>
          Remove
        </button>
      )}
      <button className={ui.button} onClick={onClose}>
        Cancel
      </button>
      <button className={ui.primary} disabled={!ready || busy} onClick={() => (setBusy(true), onSave().finally(() => setBusy(false)))}>
        {label}
      </button>
    </>
  );
}

const ways = DIRECTIONS.map(([w, name]) => (
  <option key={w} value={w}>
    {name}
  </option>
));

/** The rooms to choose from, under their floors. */
function roomOptions({ areas, floors }: Registry, skip: (a: Area) => boolean): ReactNode {
  const under = (floor: string | null) => areas.filter((a) => a.floor === floor && !skip(a)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>);
  return (
    <>
      {floors.map((f) => (
        <optgroup key={f.id} label={f.name}>
          {under(f.id)}
        </optgroup>
      ))}
      <optgroup label="On no floor">{under(null)}</optgroup>
    </>
  );
}

/** A way out of `from`, new or (`given`, with `a` as `from`) changed. `joined`: the rooms
 * it already leads to, which can't be chosen again. */
export function ExitDialog({
  from,
  given,
  joined,
  registry,
  onClose,
  onSave,
  onRemove,
}: {
  from: Area;
  given?: Connection;
  joined: string[];
  registry: Registry;
  onClose: () => void;
  onSave: (c: Connection) => Done;
  onRemove?: () => void;
}) {
  const [to, setTo] = useState(given?.b ?? "");
  const [way, setWay] = useState(given?.way ?? "");
  const [back, setBack] = useState(given?.back ?? "");
  const there = registry.areas.find((a) => a.id === to)?.name ?? "the other room";

  return (
    <Dialog
      title={given ? `The way from ${from.name} to ${there}` : `A way out of ${from.name}`}
      onClose={onClose}
      footer={<Footer onClose={onClose} ready={!!to} label={given ? "Save" : "Add"} onSave={() => onSave({ a: from.id, b: to, way: way || null, back: back || null })} onRemove={onRemove} />}
    >
      <Field label="Leads to" help="It is added to both rooms.">
        <Select value={to} onChange={setTo} disabled={!!given} placeholder="Choose a room…">
          {roomOptions(registry, (a) => a.id === from.id || (joined.includes(a.id) && a.id !== given?.b))}
        </Select>
      </Field>
      <Field label={`Which way, leaving ${from.name}`} help="Optional. Up and down are for stairs.">
        <Select value={way} onChange={setWay}>
          <option value="">No direction</option>
          {ways}
        </Select>
      </Field>
      <Field label={`Which way back, leaving ${there}`} help="A passage that bends comes back another way.">
        <Select value={back} onChange={setBack}>
          <option value="">{way ? `The opposite (${wayName(opposite(way))})` : "No direction"}</option>
          {ways}
        </Select>
      </Field>
    </Dialog>
  );
}

/** Field's look round a list of ticks, which can't sit inside its <label>. */
function Group({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div className={ui.field}>
      <span className={ui.fieldLabel}>{label}</span>
      {children}
      {help && <span className={ui.help}>{help}</span>}
    </div>
  );
}

/** A building, new or changed: its floors, and the rooms on no floor that are in it. A
 * floor or room in another building is shown, and can't be chosen. */
export function BuildingDialog({
  given,
  others,
  sites,
  registry,
  onClose,
  onSave,
  onRemove,
}: {
  given?: Building;
  others: Building[];
  sites: Site[];
  registry: Registry;
  onClose: () => void;
  onSave: (b: Omit<Building, "id">) => Done;
  onRemove?: () => void;
}) {
  const [name, setName] = useState(given?.name ?? "");
  const [site, setSite] = useState(given?.site ?? "");
  const [floors, setFloors] = useState(given?.floors ?? []);
  const [areas, setAreas] = useState(given?.areas ?? []);
  const holder = (kind: "floors" | "areas", id: string) => others.find((b) => b[kind].includes(id))?.name;

  const choices = (kind: "floors" | "areas", all: { id: string; name: string }[], chosen: string[], set: (ids: string[]) => void) =>
    all.length ? (
      <div className={ui.choices}>
        {all.map(({ id, name }) => {
          const elsewhere = holder(kind, id);
          return (
            <label key={id} className={ui.choice}>
              <input type="checkbox" disabled={!!elsewhere} checked={chosen.includes(id)} onChange={(e) => set(e.target.checked ? [...chosen, id] : chosen.filter((x) => x !== id))} />
              <span>
                {name}
                {elsewhere && <span className={ui.choiceWhy}>In {elsewhere}</span>}
              </span>
            </label>
          );
        })}
      </div>
    ) : (
      <p className={ui.help}>{kind === "floors" ? "Home Assistant has no floors." : "Every room is on a floor."}</p>
    );

  return (
    <Dialog
      title={given ? given.name : "A new building"}
      onClose={onClose}
      footer={<Footer onClose={onClose} ready={!!name.trim()} label={given ? "Save" : "Add"} onSave={() => onSave({ name: name.trim(), site: site || null, floors, areas })} onRemove={onRemove} />}
    >
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Annexe" />
      </Field>
      {sites.length > 0 && (
        <Field label="Site">
          <Select value={site} onChange={setSite}>
            <option value="">None</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Group label="Its floors">{choices("floors", registry.floors, floors, setFloors)}</Group>
      <Group label="Rooms on no floor" help="A one-room outbuilding, such as a shed, is a room on no floor put in a building of its own.">
        {choices("areas", registry.areas.filter((a) => !a.floor), areas, setAreas)}
      </Group>
    </Dialog>
  );
}

/** A site (a group of buildings, such as a farm's), new or renamed. */
export function SiteDialog({ given, onClose, onSave, onRemove }: { given?: Site; onClose: () => void; onSave: (name: string) => Done; onRemove?: () => void }) {
  const [name, setName] = useState(given?.name ?? "");
  return (
    <Dialog title={given ? given.name : "A new site"} onClose={onClose} footer={<Footer onClose={onClose} ready={!!name.trim()} label={given ? "Save" : "Add"} onSave={() => onSave(name.trim())} onRemove={onRemove} />}>
      <Field label="Name" help="A site holds buildings: the farm, the house and its grounds.">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home" />
      </Field>
    </Dialog>
  );
}
