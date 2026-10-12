/** The profiles: each a named set of levels many sensors follow, with how many do. Make
 * one here (or from a sensor's editor), edit its levels, have more sensors follow it,
 * see who follows it, or delete it (its followers then keep a copy of its levels).
 * Shared as JSON: export them, import a file, or take some from the library shipped. */

import { useRef, useState } from "react";
import { AreaHead } from "../page";
import { Dialog, Field, Segmented } from "../ui";
import { MODE_NAMES, summary, swApi, type Profile, type WatchView } from "./common";
import { LevelFields, useLevels, type Kind } from "./levels";
import css from "./sensor-watch.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";

type Change = <V extends WatchView>(action: () => Promise<V>, done: string | ((v: V) => string)) => Promise<boolean>;

export function ProfilesSection({
  profiles,
  change,
  onEdit,
  onApply,
  onFollowers,
}: {
  profiles: Profile[];
  change: Change;
  /** Edit this profile, or make a new one (undefined). */
  onEdit: (p?: Profile) => void;
  /** Choose sensors to follow it. */
  onApply: (p: Profile) => void;
  /** Show its followers in the watched list. */
  onFollowers: (p: Profile) => void;
}) {
  const [offered, setOffered] = useState<{ title: string; profiles: Shared[]; library?: boolean }>();
  const file = useRef<HTMLInputElement>(null);

  const fromLibrary = () =>
    swApi.get<{ profiles: Shared[] }>("profiles/library").then(
      (got) => setOffered({ title: "Profiles from the library", profiles: got.profiles, library: true }),
      (err) => change(() => Promise.reject(err), ""),
    );
  const fromFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      const list = Array.isArray(data) ? data : data?.profiles;
      if (!Array.isArray(list) || !list.length) throw new Error(`${f.name} has no profiles in it.`);
      setOffered({ title: `Profiles in ${f.name}`, profiles: list });
    } catch (err) {
      change(() => Promise.reject(err instanceof SyntaxError ? new Error(`${f.name} isn't JSON.`) : err), "");
    }
  };
  const remove = (p: Profile) => {
    const keep = p.followers ? ` Its ${p.followers} followers keep a copy of its levels as their own.` : "";
    if (confirm(`Delete the profile "${p.name}"?${keep}`)) change(() => swApi.del<WatchView>(`profiles/${p.id}`), `${p.name} deleted`);
  };
  return (
    <section className={guest.area}>
      <AreaHead
        title="Profiles"
        blurb="The same levels for many sensors, said once: edit a profile and every sensor that follows it changes with it."
        action={
          <span className={css.actions}>
            <button className={ui.button} onClick={fromLibrary}>
              From the library…
            </button>
            <button className={ui.button} onClick={() => file.current?.click()}>
              Import…
            </button>
            <button className={ui.button} disabled={!profiles.length} onClick={() => exportAs()}>
              Export all
            </button>
            <button className={ui.button} onClick={() => onEdit()}>
              + New profile
            </button>
          </span>
        }
      />
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) fromFile(f);
        }}
      />
      {offered && (
        <ImportDialog
          title={offered.title}
          offered={offered.profiles}
          library={offered.library}
          existing={profiles}
          onClose={() => setOffered(undefined)}
          onImport={(chosen) =>
            change(
              () => swApi.post<WatchView & { added: string[]; replaced: string[] }>("profiles/import", { profiles: chosen }),
              (v) => [v.added.length && `Added ${v.added.join(", ")}`, v.replaced.length && `replaced ${v.replaced.join(", ")}`].filter(Boolean).join("; "),
            )
          }
        />
      )}
      {profiles.length > 0 && (
        <div className={css.table}>
          {profiles.map((p) => (
            <div key={p.id} className={`${css.row} ${css.compact} ${css.named}`}>
              <span className={css.what}>
                <strong>{p.name}</strong>
                <span className={css.note}>
                  {MODE_NAMES[p.kind]} · {summary(p)}
                </span>
              </span>
              <button
                className={`${css.level} ${css.lv_none} ${css.followers}`}
                disabled={!p.followers}
                onClick={() => onFollowers(p)}
                aria-label={`Show the ${p.followers} sensors following ${p.name}`}
              >
                {p.followers} following
              </button>
              <span className={css.rowActions}>
                <button className={`${ui.button} ${ui.small}`} onClick={() => onEdit(p)}>
                  Edit
                </button>
                <button className={`${ui.button} ${ui.small}`} onClick={() => onApply(p)}>
                  Apply to…
                </button>
                <button className={`${ui.danger} ${ui.small}`} onClick={() => remove(p)}>
                  Delete
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const KINDS: [Kind, string][] = [
  ["numeric", "Bands (a range)"],
  ["binary", "On/off"],
  ["state", "Exact states"],
  ["available", "Available"],
];
const STARTER = { kind: "numeric" as const, bands: [{ from: null, to: null, level: "nominal" as const, message: "" }] };

/** Save the profiles as a file to share: one (by name, as last saved), or all. */
async function exportAs(one?: Profile) {
  const data = await swApi.get<{ profiles: Shared[] }>("profiles/export");
  if (one) data.profiles = data.profiles.filter((p) => p.name === one.name);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = one ? `${one.name.replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "")}.json` : "sensor-watch-profiles.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

/** A profile's name and levels: `profile` to edit, `copyOf` to start a new one from
 * (Duplicate…), or neither for a new one. */
export function ProfileDialog({
  profile,
  copyOf,
  onDuplicate,
  onClose,
  change,
}: {
  profile?: Profile;
  copyOf?: Profile;
  /** Start a new profile from this one's levels (as they are saved). */
  onDuplicate?: (p: Profile) => void;
  onClose: () => void;
  change: Change;
}) {
  const L = useLevels(profile ?? copyOf ?? STARTER, "numeric");
  const [name, setName] = useState(profile?.name ?? (copyOf ? `${copyOf.name} (copy)` : ""));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!L.sane()) return;
    setSaving(true);
    const body = { name: name.trim(), ...L.body() };
    const ok = await change(
      () => (profile ? swApi.put<WatchView>(`profiles/${profile.id}`, body) : swApi.post<WatchView>("profiles", body)),
      profile ? `${body.name} saved${profile.followers ? `; ${profile.followers} sensors follow it` : ""}` : `New profile ${body.name}`,
    );
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog
      wide
      tall
      title={profile ? `Edit the profile ${profile.name}` : copyOf ? `Duplicate ${copyOf.name}` : "New profile"}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          {profile && (
            <button className={ui.button} onClick={() => exportAs(profile)} title="Save this profile, as last saved, as a file to share">
              Export…
            </button>
          )}
          {profile && onDuplicate && (
            <button className={ui.button} onClick={() => onDuplicate(profile)} title="A new profile starting from this one's saved levels">
              Duplicate…
            </button>
          )}
          <button className={ui.primary} disabled={saving} onClick={save}>
            {profile ? "Save" : "Make it"}
          </button>
        </>
      }
    >
      {copyOf && <p className={css.note}>A new profile, starting from {copyOf.name}'s levels: rename it and change what differs. Nothing follows it yet.</p>}
      {profile && profile.followers > 0 && (
        <p className={css.note}>
          {profile.followers} sensors follow it: saving changes them all.
        </p>
      )}
      <Field label="Name" help="What it's for, e.g. Mains voltage or Pool pH.">
        <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus={!profile} />
      </Field>
      <Segmented value={L.kind} options={KINDS} onChange={L.setKind} />
      <LevelFields L={L} />
    </Dialog>
  );
}

/** A profile as shared: its levels and name, and in the library what it's about. */
export type Shared = Omit<Profile, "id" | "followers"> & { about?: string; source?: string; category?: string; score?: number };

/** Choose which shared profiles to take: new ones ticked; one named as a profile of
 * yours replaces its levels (and its followers'), so it starts unticked. */
function ImportDialog({
  title,
  offered,
  library,
  existing,
  onClose,
  onImport,
}: {
  title: string;
  offered: Shared[];
  /** The library: nothing ticked to start (a file's new profiles start ticked). */
  library?: boolean;
  existing: Profile[];
  onClose: () => void;
  onImport: (chosen: Shared[]) => Promise<boolean>;
}) {
  const mine = (p: Shared) => existing.find((e) => e.name.toLowerCase() === String(p.name ?? "").toLowerCase());
  const [ticked, setTicked] = useState(() => new Set(library ? [] : offered.map((p, i) => (mine(p) ? -1 : i)).filter((i) => i >= 0)));
  const [busy, setBusy] = useState(false);
  const [find, setFind] = useState("");
  const words = find.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const shows = (p: Shared) => words.every((w) => `${p.name} ${p.category ?? ""} ${p.about ?? ""}`.toLowerCase().includes(w));
  const flip = (i: number) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const go = async () => {
    setBusy(true);
    const ok = await onImport(offered.filter((_, i) => ticked.has(i)));
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Dialog
      wide
      tall
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} disabled={busy || ticked.size === 0} onClick={go}>
            Take the ticked ({ticked.size})
          </button>
        </>
      }
    >
      <p className={css.note}>Tick the profiles to take. One with the name of a profile you have replaces its levels, and every sensor following it changes.</p>
      {offered.length > 6 && (
        <input type="search" className={css.find} placeholder="Search: a country, voltage, pH…" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Search the profiles" />
      )}
      <ul className={css.scanList}>
        {offered.map((p, i) => {
          const same = mine(p);
          if (!shows(p)) return null;
          // A heading where the library's category changes (it comes in order).
          const heading = p.category && p.category !== offered.slice(0, i).filter(shows).at(-1)?.category;
          return (
            <li key={i}>
              {heading && <h4 className={css.category}>{p.category}</h4>}
              <label className={css.scanRow}>
                <input type="checkbox" checked={ticked.has(i)} onChange={() => flip(i)} />
                <span>
                  <strong>{p.name}</strong>
                  {same && <span className={css.problem}> replaces yours{same.followers ? ` (${same.followers} following)` : ""}</span>}
                  <span className={css.note}>
                    {MODE_NAMES[p.kind]} · {summary(p)} · hold-off {p.hold_off ?? 60} s
                  </span>
                  {p.about && <span className={css.note}>{p.about}</span>}
                  {p.source && (
                    <a className={css.note} href={p.source} target="_blank" rel="noreferrer">
                      Source ↗
                    </a>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
