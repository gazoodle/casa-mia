/** Kiosk mode: kiosk-mode's settings (github.com/NemesisRE/kiosk-mode) for each dashboard,
 * without the YAML. The dashboards that have it are cards; the chosen one opens below as a
 * grid, kiosk-mode's options down the side (kiosk_mode.json, shared with the app) and who
 * they apply to across the top: everyone, non-admins, admins, and named users. Anything the
 * grid has no control for stays YAML in the box under it, checked as it is typed. Nothing is
 * saved until Save. */

import { useCallback, useEffect, useMemo, useState } from "react";
import CATALOGUE from "../../src/casa_mia/kiosk_mode.json";
import { api } from "./api";
import { KioskModeIcon } from "./icons";
import { AreaHead, Empty, Shell } from "./page";
import { Dialog, Segmented, Toasts, type Toast } from "./ui";
import css from "./kiosk-mode.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";

const { get, post, put, del } = api("kiosk-mode");

type Option = { label: string; help?: string; danger?: boolean };
type Role = "everyone" | "non_admin_settings" | "admin_settings";
type Users = { users: string[]; on: string[] };
type Ui = Record<Role, string[]> & { users: Users[] };
type Board = {
  id: string;
  title: string;
  path: string;
  mode: "storage" | "yaml" | "auto";
  editable: boolean;
  why: string | null;
  enabled: boolean;
  ui?: Ui;
  extras?: string;
  summary?: string;
};
type HAUser = { name: string; is_admin: boolean };
type View = { resource: { url: string } | null; dashboards: Board[]; users: HAUser[]; error: string | null };
type Draft = { ui: Ui; yaml: string };

const GROUPS = CATALOGUE.groups as unknown as { title: string; options: Record<string, Option> }[];
const SCOPES = CATALOGUE.scopes as unknown as Record<Role, { title: string; help: string }>;
const ROLES: Role[] = ["everyone", "non_admin_settings", "admin_settings"];
const README = "https://github.com/NemesisRE/kiosk-mode#config-options";
const PLACEHOLDER = `# kiosk-mode's other options, as in its README. For example:
mobile_settings:
  hide_header: true
  custom_width: 768`;

const HEAD = {
  icon: <KioskModeIcon />,
  title: "Kiosk mode",
  blurb: "What each dashboard hides, and from whom: Home Assistant's header, sidebar, menus and more.",
};

/** A column of the grid: a role, or the n-th group of named users. */
type Column = { key: string; title: string; help: string; get: (u: Ui) => string[]; set: (u: Ui, on: string[]) => Ui; users?: number };

function columns(draft: Ui): Column[] {
  return [
    ...ROLES.map((role) => ({
      key: role,
      title: SCOPES[role].title,
      help: SCOPES[role].help,
      get: (u: Ui) => u[role],
      set: (u: Ui, on: string[]) => ({ ...u, [role]: on }),
    })),
    ...draft.users.map((entry, n) => ({
      key: `users${n}`,
      title: entry.users.join(", "),
      help: "Just these users, by name. The most specific row wins: for them, only this column counts.",
      get: (u: Ui) => u.users[n]?.on ?? [],
      set: (u: Ui, on: string[]) => ({ ...u, users: u.users.map((e, i) => (i === n ? { ...e, on } : e)) }),
      users: n,
    })),
  ];
}

export function KioskModePage({ state }: { state?: string }) {
  const [view, setView] = useState<View>();
  const [chosen, setChosen] = useState<string>();
  const [draft, setDraft] = useState<Draft>();
  const [adding, setAdding] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);

  const load = useCallback(
    (v: View, pick?: string) => {
      setView(v);
      const on = v.dashboards.filter((d) => d.enabled);
      const id = pick ?? (on.some((d) => d.id === chosen) ? chosen : on[0]?.id);
      setChosen(id);
      const board = v.dashboards.find((d) => d.id === id);
      setDraft(board?.ui ? { ui: board.ui, yaml: board.extras ?? "" } : undefined);
    },
    [chosen],
  );

  useEffect(() => {
    get<View>("").then((v) => load(v), (err) => toast((err as Error).message, "bad"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!view) return <Shell {...HEAD} state={state}><p className={guest.notice}>Asking Home Assistant…</p></Shell>;

  const enabled = view.dashboards.filter((d) => d.enabled);
  const board = view.dashboards.find((d) => d.id === chosen && d.enabled);
  const dirty = !!board?.ui && !!draft && JSON.stringify({ ui: board.ui, yaml: board.extras ?? "" }) !== JSON.stringify(draft);

  const choose = (id: string) => {
    if (dirty && !confirm("Discard the changes to this dashboard?")) return;
    const b = view.dashboards.find((d) => d.id === id);
    setChosen(id);
    setDraft(b?.ui ? { ui: b.ui, yaml: b.extras ?? "" } : undefined);
  };

  const save = async () => {
    if (!board || !draft) return;
    try {
      load(await put<View>(board.id, draft), board.id);
      toast(`${board.title} saved. Refresh its screens to see it.`);
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  };

  const remove = async () => {
    if (!board || !confirm(`Remove kiosk mode from ${board.title}? Everything it hid comes back, for everyone.`)) return;
    try {
      load(await del<View>(board.id));
      toast(`Kiosk mode removed from ${board.title}`);
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  };

  return (
    <Shell {...HEAD} state={state}>
      {view.error && <div className={guest.warning}>Home Assistant could not be asked: {view.error}</div>}
      {!view.error && !view.resource && (
        <div className={guest.warning}>
          kiosk-mode was not found among the dashboards' resources, so these settings do nothing yet. Install it from HACS (search for{" "}
          <em>Kiosk Mode</em>), or see{" "}
          <a href="https://github.com/NemesisRE/kiosk-mode#installation" target="_blank" rel="noreferrer">
            its installation notes ↗
          </a>
          . (Loaded through <code>extra_module_url</code> instead, it works but cannot be seen from here.)
        </div>
      )}

      <section className={guest.area}>
        <AreaHead
          title="Dashboards"
          blurb="Each dashboard has its own kiosk mode. Guest login leans on it: a guest's dashboard should be all they can reach."
          action={
            <button className={ui.primary} onClick={() => setAdding(true)}>
              + Add a dashboard
            </button>
          }
        />
        {enabled.length === 0 ? (
          <Empty>No dashboard has kiosk mode yet. Add one to hide its header and sidebar.</Empty>
        ) : (
          <div className={css.cards}>
            {enabled.map((d) => (
              <button key={d.id} className={`${css.card} ${d.id === chosen ? css.cardOn : ""}`} onClick={() => choose(d.id)}>
                <span className={css.cardTitle}>
                  {d.title}
                  {!d.editable && <span className={guest.badge}>{d.mode === "yaml" ? "YAML" : "read only"}</span>}
                </span>
                <span className={css.cardPath}>{d.path}</span>
                <span className={css.cardSummary}>{d.summary}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {board && draft && (
        <Editor
          board={board}
          draft={draft}
          users={view.users}
          dirty={dirty}
          onChange={setDraft}
          onSave={save}
          onDiscard={() => setDraft({ ui: board.ui!, yaml: board.extras ?? "" })}
          onRemove={remove}
        />
      )}

      {adding && (
        <AddDialog
          boards={view.dashboards.filter((d) => !d.enabled)}
          onClose={() => setAdding(false)}
          onAdd={async (id, preset) => {
            const roles: Ui = { everyone: [], non_admin_settings: [], admin_settings: [], users: [] };
            if (preset !== "none") roles[preset] = ["hide_header", "hide_sidebar"];
            try {
              load(await put<View>(id, { ui: roles, yaml: "" }), id);
              setAdding(false);
              toast("Kiosk mode added");
            } catch (err) {
              toast((err as Error).message, "bad");
            }
          }}
        />
      )}
      <Toasts toasts={toasts} />
    </Shell>
  );
}

function Editor({
  board,
  draft,
  users,
  dirty,
  onChange,
  onSave,
  onDiscard,
  onRemove,
}: {
  board: Board;
  draft: Draft;
  users: HAUser[];
  dirty: boolean;
  onChange: (d: Draft) => void;
  onSave: () => void;
  onDiscard: () => void;
  onRemove: () => void;
}) {
  const [naming, setNaming] = useState<number | "new" | null>(null);
  const [open, setOpen] = useState<Set<string>>(() => new Set(GROUPS.filter((g, i) => i === 0 || used(g, draft.ui)).map((g) => g.title)));
  const [check, setCheck] = useState<{ ok: boolean; error?: string }>({ ok: true });
  const cols = useMemo(() => columns(draft.ui), [draft.ui]);
  const locked = !board.editable;

  useEffect(() => {
    const timer = setTimeout(() => {
      post<{ ok: boolean }>("check", { yaml: draft.yaml }).then(
        () => setCheck({ ok: true }),
        (err) => setCheck({ ok: false, error: (err as Error).message }),
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [draft.yaml]);

  const tick = (col: Column, key: string, on: boolean) => {
    const opt = GROUPS.flatMap((g) => Object.entries(g.options)).find(([k]) => k === key)?.[1];
    if (on && opt?.danger && !confirm(`${opt.label}: ${opt.help}\n\nTurn it on?`)) return;
    const now = col.get(draft.ui);
    onChange({ ...draft, ui: col.set(draft.ui, on ? [...now, key] : now.filter((k) => k !== key)) });
  };
  const toggleGroup = (title: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    <section className={guest.area}>
      <AreaHead
        title={board.title}
        blurb={
          <>
            {board.path} ·{" "}
            <a href={board.path} target="_blank" rel="noreferrer">
              open it ↗
            </a>
          </>
        }
        action={
          !locked && (
            <button className={`${ui.danger} ${ui.small}`} onClick={onRemove}>
              Remove kiosk mode
            </button>
          )
        }
      />
      {board.why && <div className={guest.warning}>{board.why}</div>}

      <p className={css.rule}>
        kiosk-mode uses the most specific row that matches the person looking: named users first, then Admins or Non-admins, then Everyone. A row that
        matches replaces the others; it does not add to them.
      </p>

      <div className={css.gridWrap}>
        <table className={css.grid}>
          <thead>
            <tr>
              <th className={css.optionHead}>Hide or block</th>
              {cols.map((c) => (
                <th key={c.key} title={c.help} className={c.users !== undefined ? css.userHead : ""}>
                  {c.users !== undefined && !locked ? (
                    <button className={css.userButton} onClick={() => setNaming(c.users!)} title="Change who, or remove">
                      {c.title}
                    </button>
                  ) : (
                    c.title
                  )}
                </th>
              ))}
              {!locked && (
                <th className={css.addHead}>
                  <button className={`${ui.button} ${ui.small}`} onClick={() => setNaming("new")} title="A column for some users, by name">
                    + Users
                  </button>
                </th>
              )}
            </tr>
          </thead>
          {GROUPS.map((g) => {
            const isOpen = open.has(g.title);
            const count = cols.reduce((n, c) => n + c.get(draft.ui).filter((k) => k in g.options).length, 0);
            return (
              <tbody key={g.title}>
                <tr className={css.groupRow} onClick={() => toggleGroup(g.title)}>
                  <th colSpan={cols.length + (locked ? 1 : 2)}>
                    <span className={css.chevron}>{isOpen ? "▾" : "▸"}</span>
                    {g.title}
                    <span className={css.groupMeta}>
                      {Object.keys(g.options).length} options{count ? ` · ${count} on` : ""}
                    </span>
                  </th>
                </tr>
                {isOpen &&
                  Object.entries(g.options).map(([key, opt]) => (
                    <tr key={key} className={css.optionRow}>
                      <th className={css.option}>
                        <span className={opt.danger ? css.danger : ""}>{opt.label}</span>
                        {opt.help && <span className={css.optionHelp}>{opt.help}</span>}
                        <code className={css.key}>{key}</code>
                      </th>
                      {cols.map((c) => (
                        <td key={c.key}>
                          <input
                            type="checkbox"
                            disabled={locked}
                            checked={c.get(draft.ui).includes(key)}
                            aria-label={`${opt.label}: ${c.title}`}
                            onChange={(e) => tick(c, key, e.target.checked)}
                          />
                        </td>
                      ))}
                      {!locked && <td />}
                    </tr>
                  ))}
              </tbody>
            );
          })}
        </table>
      </div>

      <div className={css.yamlHead}>
        <h3>Other options (YAML)</h3>
        <span className={check.ok ? css.yamlOk : css.yamlBad}>{check.ok ? "✓ valid YAML" : check.error}</span>
      </div>
      <p className={css.yamlHelp}>
        Anything the grid has no control for: mobile settings, entity settings, templates in place of on, new options. Paste examples from{" "}
        <a href={README} target="_blank" rel="noreferrer">
          kiosk-mode's options ↗
        </a>{" "}
        as they are, <code>kiosk_mode:</code> line and all. Where the YAML and the grid both set something, the YAML wins.
      </p>
      <textarea
        className={css.yaml}
        spellCheck={false}
        disabled={locked}
        placeholder={PLACEHOLDER}
        value={draft.yaml}
        rows={Math.max(6, draft.yaml.split("\n").length + 1)}
        onChange={(e) => onChange({ ...draft, yaml: e.target.value })}
      />

      {!locked && (
        <div className={`${css.saveBar} ${dirty ? css.saveBarOn : ""}`}>
          <span>{dirty ? "Unsaved changes" : "Saved"}</span>
          <button className={ui.button} disabled={!dirty} onClick={onDiscard}>
            Discard
          </button>
          <button className={ui.primary} disabled={!dirty || !check.ok} onClick={onSave}>
            Save
          </button>
        </div>
      )}

      {naming !== null && (
        <UsersDialog
          users={users}
          chosen={naming === "new" ? [] : draft.ui.users[naming].users}
          onClose={() => setNaming(null)}
          onRemove={
            naming === "new"
              ? undefined
              : () => {
                  onChange({ ...draft, ui: { ...draft.ui, users: draft.ui.users.filter((_, i) => i !== naming) } });
                  setNaming(null);
                }
          }
          onSave={(names) => {
            const users =
              naming === "new"
                ? [...draft.ui.users, { users: names, on: ["hide_header", "hide_sidebar"] }]
                : draft.ui.users.map((e, i) => (i === naming ? { ...e, users: names } : e));
            onChange({ ...draft, ui: { ...draft.ui, users } });
            setNaming(null);
          }}
        />
      )}
    </section>
  );
}

/** Any option of this group on, for anyone. */
function used(g: { options: Record<string, Option> }, u: Ui): boolean {
  return [...ROLES.flatMap((r) => u[r]), ...u.users.flatMap((e) => e.on)].some((k) => k in g.options);
}

function AddDialog({
  boards,
  onClose,
  onAdd,
}: {
  boards: Board[];
  onClose: () => void;
  onAdd: (id: string, preset: Role | "none") => void;
}) {
  const ready = boards.filter((b) => b.editable);
  const [id, setId] = useState(ready[0]?.id ?? "");
  const [preset, setPreset] = useState<Role | "none">("non_admin_settings");
  return (
    <Dialog
      title="Add kiosk mode to a dashboard"
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} disabled={!id} onClick={() => onAdd(id, preset)}>
            Add
          </button>
        </>
      }
    >
      {boards.length === 0 ? (
        <Empty>Every dashboard has kiosk mode already.</Empty>
      ) : (
        <div className={css.pick}>
          {boards.map((b) => (
            <label key={b.id} className={`${css.pickRow} ${b.editable ? "" : css.pickOff}`} title={b.why ?? ""}>
              <input type="radio" name="board" disabled={!b.editable} checked={id === b.id} onChange={() => setId(b.id)} />
              <span>
                <strong>{b.title}</strong> <span className={css.cardPath}>{b.path}</span>
                {b.why && <span className={css.optionHelp}>{b.why}</span>}
              </span>
            </label>
          ))}
        </div>
      )}
      <p className={css.yamlHelp}>Start by hiding the header and sidebar for:</p>
      <Segmented
        value={preset}
        options={[
          ["non_admin_settings", "Non-admins"],
          ["everyone", "Everyone"],
          ["none", "Nobody yet"],
        ]}
        onChange={setPreset}
      />
    </Dialog>
  );
}

function UsersDialog({
  users,
  chosen,
  onClose,
  onSave,
  onRemove,
}: {
  users: HAUser[];
  chosen: string[];
  onClose: () => void;
  onSave: (names: string[]) => void;
  onRemove?: () => void;
}) {
  const known = new Set(users.map((u) => u.name));
  const [names, setNames] = useState<string[]>(chosen.filter((n) => known.has(n)));
  const [other, setOther] = useState(chosen.filter((n) => !known.has(n)).join(", "));
  const all = [...names, ...other.split(",").map((s) => s.trim()).filter(Boolean)];
  return (
    <Dialog
      title={onRemove ? "Who this column is for" : "A column for named users"}
      onClose={onClose}
      footer={
        <>
          {onRemove && (
            <button className={ui.danger} onClick={onRemove}>
              Remove column
            </button>
          )}
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} disabled={!all.length} onClick={() => onSave(all)}>
            {onRemove ? "Save" : "Add"}
          </button>
        </>
      }
    >
      <p className={css.yamlHelp}>kiosk-mode matches a user's name as Home Assistant shows it (Settings, People, Users), not their username.</p>
      <div className={css.pick}>
        {users.map((u) => (
          <label key={u.name} className={css.pickRow}>
            <input
              type="checkbox"
              checked={names.includes(u.name)}
              onChange={(e) => setNames(e.target.checked ? [...names, u.name] : names.filter((n) => n !== u.name))}
            />
            <span>
              {u.name} {u.is_admin && <span className={guest.badge}>admin</span>}
            </span>
          </label>
        ))}
      </div>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>Other names</span>
        <input value={other} placeholder="Comma between names" onChange={(e) => setOther(e.target.value)} />
        <span className={ui.help}>For a user Home Assistant did not list.</span>
      </label>
    </Dialog>
  );
}
