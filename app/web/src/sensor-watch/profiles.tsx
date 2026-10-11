/** The profiles: each a named set of levels many sensors follow, with how many do. Edit
 * a profile's levels from any sensor that follows it (its editor); here, rename or
 * delete one (its followers then keep a copy of its levels). */

import { AreaHead } from "../page";
import { levelsOf, summary, swApi, type Profile, type WatchView } from "./common";
import css from "./sensor-watch.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";

export function ProfilesSection({
  profiles,
  change,
}: {
  profiles: Profile[];
  change: (action: () => Promise<WatchView>, done: string) => Promise<boolean>;
}) {
  if (profiles.length === 0) return null;
  const rename = (p: Profile) => {
    const name = prompt(`Rename the profile "${p.name}":`, p.name)?.trim();
    if (!name || name === p.name) return;
    const { followers: _f, id: _i, ...levels } = { ...p, ...levelsOf(p) };
    change(() => swApi.put<WatchView>(`profiles/${p.id}`, { ...levels, name }), `${p.name} is now ${name}`);
  };
  const remove = (p: Profile) => {
    const keep = p.followers ? ` Its ${p.followers} followers keep a copy of its levels as their own.` : "";
    if (confirm(`Delete the profile "${p.name}"?${keep}`)) change(() => swApi.del<WatchView>(`profiles/${p.id}`), `${p.name} deleted`);
  };
  return (
    <section className={guest.area}>
      <AreaHead
        title="Profiles"
        blurb="The same levels for many sensors, said once. Edit one from any sensor that follows it; every follower changes with it."
      />
      <div className={css.table}>
        {profiles.map((p) => (
          <div key={p.id} className={`${css.row} ${css.compact} ${css.profileRow}`}>
            <span className={`${css.level} ${css.lv_none}`}>{p.followers} following</span>
            <span className={css.what}>
              <strong>{p.name}</strong>
              <span className={css.note}>
                {p.kind === "binary" ? "on/off" : p.kind === "state" ? "exact states" : "bands"} · {summary(p)}
              </span>
            </span>
            <span className={css.rowActions}>
              <button className={`${ui.button} ${ui.small}`} onClick={() => rename(p)}>
                Rename
              </button>
              <button className={`${ui.danger} ${ui.small}`} onClick={() => remove(p)}>
                Delete
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
