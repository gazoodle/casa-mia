/** The watched sensors, kept in reach however many: a scrolling box under one toolbar
 * (a live search, level chips with counts, filter chips, the sort), so the rest of the
 * page stays reachable. */

import { Fragment, useMemo, useState } from "react";
import { Empty } from "../page";
import { FilterChips, KINDS, LevelChips, type ChipOptions, type Choice } from "./chips";
import { LEVELS, LEVEL_NAMES, NO_FILTERS, searched, summary, type Filters, type Group, type Level, type LevelsView, type WatchRecord, FITS, type Profile } from "./common";
import css from "./sensor-watch.module.css";
import ui from "../ui.module.css";

const PAGE = 200; // rows drawn, then "Show more" at the foot of the box
const MANUAL = "Manual"; // the heading for those watched one by one, not by a group
/** Does a watched sensor pass the filters (and every word of the search)? `skip`: a
 * filter left out, to offer what the others leave (the devices, say). */
function passes(r: WatchRecord, f: Filters, skip?: keyof Filters): boolean {
  const m = r.meta ?? {};
  const hay = `${(r.label ?? "").toLowerCase()} ${r.entity_id} ${(m.device ?? "").toLowerCase()}`;
  const is = (key: keyof Filters, actual: string | null | undefined) => key === skip || !f[key] || actual === f[key];
  return (
    searched(hay, f.q) &&
    is("area", m.area_id) &&
    (skip === "label" || !f.label || (m.labels ?? []).includes(f.label)) &&
    is("platform", m.platform) &&
    is("device", m.device_id) &&
    is("device_class", m.device_class) &&
    is("kind", r.kind) &&
    is("domain", m.domain ?? r.entity_id.split(".")[0]) &&
    is("profile", r.profile ?? "") &&
    is("group", r.group ?? "")
  );
}

function choices(records: WatchRecord[], pick: (r: WatchRecord) => [string, string][]): Choice[] {
  const all = new Map(records.flatMap(pick).filter(([id, name]) => id && name));
  return [...all].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function WatchedList({
  records,
  live,
  labels,
  profiles,
  groups,
  filters,
  setFilters,
  onFollow,
  onEdit,
  onStop,
  onStopMany,
}: {
  records: WatchRecord[];
  live?: LevelsView;
  labels: Record<string, string>;
  profiles: Profile[];
  groups: Group[];
  /** The filters (the page's, so a profile's "following" can set them). */
  filters: Filters;
  setFilters: (f: Filters) => void;
  /** These watched sensors follow that profile. */
  onFollow: (rs: WatchRecord[], profile: Profile) => void;
  onEdit: (r: WatchRecord) => void;
  onStop: (r: WatchRecord) => void;
  /** Stop watching these (already confirmed by the user). */
  onStopMany: (rs: WatchRecord[]) => void;
}) {
  const [levels, setLevels] = useState<Set<Level>>(new Set());
  const [sort, setSort] = useState<"level" | "name">("level");
  // Under a heading per group (and Manual for the rest), sorted within each; remembered.
  const [grouped, setGrouped] = useState(() => {
    try {
      return localStorage.getItem("sw-grouped") !== "0";
    } catch {
      return true;
    }
  });
  // Groups folded away (by heading), remembered as the grouping is.
  const [folded, setFolded] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("sw-folded") || "[]"));
    } catch {
      return new Set();
    }
  });
  const fold = (name: string) => {
    const next = new Set(folded);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setFolded(next);
    try {
      localStorage.setItem("sw-folded", JSON.stringify([...next]));
    } catch {
      // a private window: just not remembered
    }
  };
  const group = (on: boolean) => {
    setGrouped(on);
    try {
      localStorage.setItem("sw-grouped", on ? "1" : "0");
    } catch {
      // a private window: just not remembered
    }
  };
  const [shown, setShown] = useState(PAGE);
  const levelOf = (r: WatchRecord) => live?.levels[r.entity_id]?.level;

  // Each filter offers what the others leave, so the choices narrow as you go.
  const options: ChipOptions = useMemo(() => {
    const leave = (skip: keyof Filters) => records.filter((r) => passes(r, filters, skip));
    return {
      area: choices(leave("area"), (r) => [[r.meta?.area_id ?? "", r.meta?.area ?? ""]]),
      label: choices(leave("label"), (r) => (r.meta?.labels ?? []).map((id) => [id, labels[id] ?? id] as [string, string])),
      platform: choices(leave("platform"), (r) => [[r.meta?.platform ?? "", r.meta?.platform ?? ""]]),
      device: choices(leave("device"), (r) => [[r.meta?.device_id ?? "", r.meta?.device ?? ""]]),
      device_class: choices(leave("device_class"), (r) => [[r.meta?.device_class ?? "", (r.meta?.device_class ?? "").replaceAll("_", " ")]]),
      domain: choices(leave("domain"), (r) => {
        const d = r.meta?.domain ?? r.entity_id.split(".")[0];
        return [[d, d]];
      }),
      kind: KINDS.filter((k) => leave("kind").some((r) => r.kind === k.id)),
      profile: profiles.filter((p) => leave("profile").some((r) => r.profile === p.id)).map((p) => ({ id: p.id, name: p.name })),
      group: groups.filter((g) => leave("group").some((r) => r.group === g.id)).map((g) => ({ id: g.id, name: g.name })),
    };
  }, [records, filters, labels, profiles, groups]);

  const matched = useMemo(() => records.filter((r) => passes(r, filters)), [records, filters]);
  const counts = matched.reduce<Record<string, number>>((n, r) => {
    const l = levelOf(r);
    return l ? { ...n, [l]: (n[l] ?? 0) + 1 } : n;
  }, {});
  const rank = (r: WatchRecord) => {
    const l = levelOf(r);
    return l ? LEVELS.indexOf(l) : -1; // not known yet: after nominal
  };
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const section = (r: WatchRecord) => (grouped ? (r.group && groupName.get(r.group)) || MANUAL : "");
  // Manual first, then the groups by name; the sort applies within each.
  const sectionOrder = (a: string, b: string) => (a === b ? 0 : a === MANUAL ? -1 : b === MANUAL ? 1 : a.localeCompare(b));
  const rows = matched
    .filter((r) => levels.size === 0 || levels.has(levelOf(r) as Level))
    .sort((a, b) => sectionOrder(section(a), section(b)) || (sort === "level" ? rank(b) - rank(a) : 0) || (a.label ?? "").localeCompare(b.label ?? ""));
  const inSection = rows.reduce<Record<string, number>>((n, r) => ({ ...n, [section(r)]: (n[section(r)] ?? 0) + 1 }), {});
  const first = (r: WatchRecord, i: number, list: WatchRecord[]) => i === 0 || section(list[i - 1]) !== section(r);
  const isFolded = (r: WatchRecord) => grouped && folded.has(section(r));
  // A folded group keeps its first row, to carry its heading.
  const visible = rows.filter((r, i) => !isFolded(r) || first(r, i, rows));
  const filtering = levels.size > 0 || Object.values(filters).some(Boolean);

  return (
    <>
      <div className={css.toolbar}>
        <input
          type="search"
          className={css.find}
          placeholder="Search names, entity ids, devices; -word to rule out"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          aria-label="Search the watched sensors"
        />
        <LevelChips counts={counts} value={levels} onChange={setLevels} />
        <FilterChips value={filters} options={options} onChange={setFilters} />
        {filtering && (
          <button
            type="button"
            className={css.chip}
            onClick={() => {
              setFilters(NO_FILTERS);
              setLevels(new Set());
            }}
          >
            Clear all
          </button>
        )}
        <button
          type="button"
          className={`${css.chip} ${css.sort}`}
          onClick={() => setSort(sort === "level" ? "name" : "level")}
          title="Tap to sort the other way"
        >
          Sort: {sort === "level" ? "level" : "name"} ↕
        </button>
        <button type="button" aria-pressed={grouped} className={`${css.chip} ${grouped ? css.chipOn : ""}`} onClick={() => group(!grouped)}>
          {grouped ? "☑" : "☐"} Grouped
        </button>
      </div>
      {rows.length !== records.length && (
        <p className={css.note}>
          {rows.length} of {records.length} shown
        </p>
      )}
      <div className={css.scroll}>
        {rows.length === 0 ? (
          <Empty>None match.</Empty>
        ) : (
          <div className={css.table}>
            {visible.slice(0, shown).map((r, i, page) => {
              const now = live?.levels[r.entity_id];
              const heading = grouped && first(r, i, page);
              return (
                <Fragment key={r.entity_id}>
                  {heading && (
                    <h4 className={`${css.category} ${css.sectionHead}`}>
                      <button type="button" className={css.fold} aria-expanded={!isFolded(r)} onClick={() => fold(section(r))}>
                        <span className={css.foldMark}>{isFolded(r) ? "▸" : "▾"}</span> {section(r)} · {inSection[section(r)]}
                      </button>
                    </h4>
                  )}
                  {!isFolded(r) && (
                <div className={`${css.row} ${css.compact}`}>
                  <span className={`${css.level} ${css[`lv_${now?.level ?? "none"}`]}`}>{now ? LEVEL_NAMES[now.level] : "…"}</span>
                  <span className={css.what}>
                    <span className={css.nameLine}>
                      <strong>{r.label}</strong> <code>{r.entity_id}</code>
                    </span>
                    <span className={css.note}>
                      {now ? `${now.value ?? "?"}${now.message ? ` · ${now.message}` : ""} · ` : ""}
                      {summary(r)}
                      {r.meta?.area && ` · ${r.meta.area}`}
                      {r.profile && ` · follows ${profiles.find((p) => p.id === r.profile)?.name ?? "a profile"}`}
                      {r.group && ` · in ${groups.find((g) => g.id === r.group)?.name ?? "a group"}`}
                    </span>
                  </span>
                  <span className={css.rowActions}>
                    <button className={`${ui.button} ${ui.small}`} onClick={() => onEdit(r)}>
                      Edit
                    </button>
                    <button className={`${ui.danger} ${ui.small}`} onClick={() => onStop(r)}>
                      Stop watching
                    </button>
                  </span>
                </div>
                  )}
                </Fragment>
              );
            })}
            {visible.length > shown && (
              <button className={ui.button} onClick={() => setShown(shown + PAGE)}>
                Show {Math.min(PAGE, visible.length - shown)} more of {visible.length}
              </button>
            )}
          </div>
        )}
      </div>
      <div className={css.bulk}>
        {profiles.length > 0 && rows.length > 0 && (
          <select
            className={css.profilePick}
            value=""
            aria-label="Follow a profile"
            onChange={(e) => {
              const p = profiles.find((x) => x.id === e.target.value);
              if (!p) return;
              const fit = rows.filter((r) => (FITS[r.meta?.kind ?? r.kind] ?? []).includes(p.kind));
              const skipped = rows.length - fit.length;
              if (confirm(`Have ${fit.length} sensors follow ${p.name}?${skipped ? ` ${skipped} others can't (a different kind).` : ""} Their own levels are replaced.`))
                onFollow(fit, p);
            }}
          >
            <option value="">Follow a profile ({rows.length} shown)…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {filtering && rows.length > 0 && rows.length < records.length && (
          <button
            className={`${ui.danger} ${ui.small}`}
            onClick={() => confirm(`Stop watching the ${rows.length} sensors shown?`) && onStopMany(rows)}
          >
            Stop watching these {rows.length}
          </button>
        )}
        <button
          className={`${ui.danger} ${ui.small}`}
          onClick={() => confirm(`Stop watching all ${records.length} sensors? Their bands are forgotten.`) && onStopMany(records)}
        >
          Stop watching all {records.length}
        </button>
      </div>
    </>
  );
}
