/** Groups that keep themselves up to date: saved filters and a profile. Everything that
 * matches is watched, following the profile, and whatever matches later joins by itself;
 * a member stopped by hand stays out until let back in. */

import { useState } from "react";
import { AreaHead } from "../page";
import { Dialog, Field } from "../ui";
import { FITS, NO_FILTERS, swApi, type Filters, type Group, type Profile, type WatchRecord, type WatchView } from "./common";
import { useCandidates } from "./dialogs";
import { FilterBar } from "./filters";
import css from "./sensor-watch.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";

type Change = <V extends WatchView>(action: () => Promise<V>, done: string | ((v: V) => string)) => Promise<boolean>;
type Joined = WatchView & { joined: number };
/** A group's "profile" that sets each member up by what it is (groups.py DEFAULTS). */
const DEFAULTS = "defaults";
const follows = (id: string, profiles: Profile[]) =>
  id === DEFAULTS ? "the defaults, by what it is" : (profiles.find((p) => p.id === id)?.name ?? "a missing profile");

const FILTER_NAMES: Partial<Record<keyof Filters, string>> = {
  q: "search",
  domain: "domain",
  area: "area",
  label: "label",
  platform: "integration",
  device: "device",
  device_class: "device class",
  kind: "kind",
};

/** A group's filters in words: `device class voltage · integration shelly`. */
function described(g: Group, labels: Record<string, string>): string {
  return Object.entries(g.filters)
    .map(([k, v]) => `${FILTER_NAMES[k as keyof Filters] ?? k} ${k === "label" ? (labels[v as string] ?? v) : k === "q" ? `"${v}"` : v}`)
    .join(" · ");
}

export function GroupsSection({
  groups,
  profiles,
  records,
  labels,
  change,
  onMembers,
}: {
  groups: Group[];
  profiles: Profile[];
  /** The watched sensors (to tell a group's members from those watched otherwise). */
  records: WatchRecord[];
  labels: Record<string, string>;
  change: Change;
  /** Show its members in the watched list. */
  onMembers: (g: Group) => void;
}) {
  const [editing, setEditing] = useState<Group | null>();
  const joined = (v: Joined) => (v.joined ? `; ${v.joined} joined` : "");
  return (
    <section className={guest.area}>
      <AreaHead
        title="Groups"
        blurb="Saved filters and a profile: everything matching is watched, and what matches later joins by itself (a new plug, say). More than two of the same kind is a group; a single thing is a watch."
        action={
          <button className={ui.button} onClick={() => setEditing(null)}>
            + New group
          </button>
        }
      />
      {groups.length > 0 && (
        <div className={css.table}>
          {groups.map((g) => (
            <div key={g.id} className={`${css.row} ${css.compact} ${css.profileRow}`}>
              <button className={`${css.level} ${css.lv_none} ${css.followers}`} disabled={!g.members} onClick={() => onMembers(g)}>
                {g.members} in it
              </button>
              <span className={css.what}>
                <strong>{g.name}</strong>
                <span className={css.note}>
                  {described(g, labels)} · follows {follows(g.profile, profiles)}
                  {g.left.length > 0 && ` · ${g.left.length} left out by hand`}
                </span>
              </span>
              <span className={css.rowActions}>
                {g.left.length > 0 && (
                  <button
                    className={`${ui.button} ${ui.small}`}
                    onClick={() => change(() => swApi.post<Joined>(`groups/${g.id}/readmit`), (v) => `${g.name}: let back in${joined(v)}`)}
                  >
                    Let them back
                  </button>
                )}
                <button className={`${ui.button} ${ui.small}`} onClick={() => setEditing(g)}>
                  Edit
                </button>
                <button
                  className={`${ui.danger} ${ui.small}`}
                  onClick={() =>
                    confirm(`Delete the group "${g.name}"? Its ${g.members} members stay watched, as they are; new ones stop joining.`) &&
                    change(() => swApi.del<WatchView>(`groups/${g.id}`), `${g.name} deleted`)
                  }
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {editing !== undefined && (
        <GroupDialog
          group={editing ?? undefined}
          profiles={profiles}
          records={records}
          onClose={() => setEditing(undefined)}
          onSave={(body) =>
            change(
              () => (editing ? swApi.put<Joined>(`groups/${editing.id}`, body) : swApi.post<Joined>("groups", body)),
              (v) => `${body.name} saved${joined(v)}`,
            )
          }
        />
      )}
    </section>
  );
}

function GroupDialog({
  group,
  profiles,
  records,
  onClose,
  onSave,
}: {
  group?: Group;
  profiles: Profile[];
  records: WatchRecord[];
  onClose: () => void;
  onSave: (body: { name: string; filters: Partial<Filters>; profile: string; left: string[] }) => Promise<boolean>;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [profile, setProfile] = useState(group?.profile ?? DEFAULTS);
  const [filters, setFilters] = useState<Filters>({ ...NO_FILTERS, ...group?.filters });
  const [saving, setSaving] = useState(false);
  const { view, error } = useCandidates(filters);
  const chosen = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && k in FILTER_NAMES));
  const kind = profiles.find((p) => p.id === profile)?.kind;
  // Who each match would be: a member, or passed over (another kind, or watched already).
  const owner = new Map(records.map((r) => [r.entity_id, r.group]));
  const left = new Set(group?.left ?? []);
  const why = (eid: string, k: string, hasDefault?: boolean) =>
    profile === DEFAULTS && !hasDefault
      ? "no default for it: passed over"
      : kind && !(FITS[k] ?? []).includes(kind)
        ? "another kind: passed over"
        : left.has(eid)
          ? "stopped by hand: left out"
          : owner.has(eid) && owner.get(eid) !== group?.id
            ? "watched already: keeps its own levels"
            : null;
  const shown = view?.sensors ?? [];
  const save = async () => {
    setSaving(true);
    const ok = await onSave({ name: name.trim(), filters: chosen, profile, left: [...left] });
    setSaving(false);
    if (ok) onClose();
  };
  return (
    <Dialog
      wide
      title={group ? `Edit the group ${group.name}` : "New group"}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} disabled={saving || !name.trim() || !Object.keys(chosen).length} onClick={save}>
            {group ? "Save" : "Make it"}
          </button>
        </>
      }
    >
      <Field label="Name" help="What it gathers, e.g. Mains voltage or Leak sensors. The list service takes it as `group`.">
        <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus={!group} />
      </Field>
      <Field
        label="Members follow"
        help="The defaults set each member up by what it is (a cover closed, a lock locked, a leak critical), passing over what has no default. A profile gives them all the same levels; those it doesn't fit (another kind) are passed over."
      >
        <select value={profile} onChange={(e) => setProfile(e.target.value)}>
          <option value={DEFAULTS}>The defaults, by what it is</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.kind === "binary" ? "on/off" : p.kind === "state" ? "exact states" : "bands"})
            </option>
          ))}
        </select>
      </Field>
      <p className={css.note}>What it takes: at least one filter. Checked each minute, so new matches join by themselves.</p>
      <FilterBar value={filters} options={view?.options} onChange={setFilters} />
      {error && <p className={css.problem}>{error}</p>}
      {view && Object.keys(chosen).length > 0 && (
        <>
          <p className={css.note}>
            {view.total} match{view.total > shown.length ? `; the first ${shown.length} shown, narrow the filters to see the rest` : ""}. Anything here that
            shouldn't be? Rule it out in the search with a minus word (<code>-vcc</code>), so it stays out as new ones arrive too.
          </p>
          <ul className={css.scanList}>
            {shown.map((c) => {
              const passed = why(c.entity_id, c.kind, c.has_default);
              return (
                <li key={c.entity_id}>
                  <div className={`${css.scanRow} ${passed ? css.passed : ""}`}>
                    <span>
                      <strong>{c.name}</strong> <code>{c.entity_id}</code>
                      <span className={css.note}>
                        {c.state} {c.unit}
                        {c.area && ` · ${c.area}`}
                        {c.device && ` · ${c.device}`}
                        {passed && ` · ${passed}`}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Dialog>
  );
}
