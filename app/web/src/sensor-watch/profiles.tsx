/** The profiles: each a named set of levels many sensors follow, with how many do. Make
 * one here (or from a sensor's editor), edit its levels, have more sensors follow it,
 * see who follows it, or delete it (its followers then keep a copy of its levels). */

import { useState } from "react";
import { AreaHead } from "../page";
import { Dialog, Field, Segmented } from "../ui";
import { summary, swApi, type Profile, type WatchView } from "./common";
import { LevelFields, useLevels, type Kind } from "./levels";
import css from "./sensor-watch.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";

type Change = (action: () => Promise<WatchView>, done: string) => Promise<boolean>;

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
          <button className={ui.button} onClick={() => onEdit()}>
            + New profile
          </button>
        }
      />
      {profiles.length > 0 && (
        <div className={css.table}>
          {profiles.map((p) => (
            <div key={p.id} className={`${css.row} ${css.compact} ${css.profileRow}`}>
              <button
                className={`${css.level} ${css.lv_none} ${css.followers}`}
                disabled={!p.followers}
                onClick={() => onFollowers(p)}
                aria-label={`Show the ${p.followers} sensors following ${p.name}`}
              >
                {p.followers} following
              </button>
              <span className={css.what}>
                <strong>{p.name}</strong>
                <span className={css.note}>
                  {p.kind === "binary" ? "on/off" : p.kind === "state" ? "exact states" : "bands"} · {summary(p)}
                </span>
              </span>
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
];
const STARTER = { kind: "numeric" as const, bands: [{ from: null, to: null, level: "nominal" as const, message: "" }] };

/** A profile's name and levels: `profile` to edit, or none for a new one. */
export function ProfileDialog({ profile, onClose, change }: { profile?: Profile; onClose: () => void; change: Change }) {
  const L = useLevels(profile ?? STARTER, "numeric");
  const [name, setName] = useState(profile?.name ?? "");
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
      title={profile ? `Edit the profile ${profile.name}` : "New profile"}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} disabled={saving} onClick={save}>
            {profile ? "Save" : "Make it"}
          </button>
        </>
      }
    >
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
