import { useEffect, useState, type ReactNode } from "react";
import { ago } from "../format";
import { Empty } from "../page";
import { CopyButton, Dialog, Field, Segmented, type Toast } from "../ui";
import css from "../cameras.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";
import { Backup, CARDS, HAUser, Store, get, post } from "./common";
import { EntityInput } from "../cameras";

export function Settings({
  store,
  users,
  onChange,
}: {
  store: Store;
  users: HAUser[];
  onChange: (change: (s: Store) => void) => void;
}) {
  const text = (key: keyof Store, label: string, help: ReactNode, placeholder?: string) => (
    <Field label={label} help={help}>
      <input value={store[key] as string} placeholder={placeholder} onChange={(e) => onChange((s) => ((s[key] as string) = e.target.value))} />
    </Field>
  );
  return (
    <div className={css.settings}>
      <div className={css.two}>
        {text("dashboard", "Dashboard URL", <>It goes to /{store.dashboard}; the preview to /{store.dashboard}-preview. Created if missing.</>)}
        {text("title", "Title", "The dashboard's name, and its first page's.")}
        {text("home", "Home", "Where the Home button goes.")}
        {text("help", "Help", "Where the Help button goes.")}
        <Field label="Navigation" help="Back, Home and Help (and the page controls) as header badges, or as a row of tiles.">
          <Segmented
            value={store.nav_style}
            options={[
              ["badges", "Badges"],
              ["tiles", "Tiles"],
            ]}
            onChange={(v) => onChange((s) => (s.nav_style = v))}
          />
        </Field>
        {text("theme", "Theme", "A Home Assistant theme for every page; blank for the default.")}
        <Field label="Tile entity" help="Tiles need an entity; this input_button helper stands in for the navigation and preset tiles.">
          <EntityInput domain="input_button" value={store.placeholder} onChange={(v) => onChange((s) => (s.placeholder = v))} />
        </Field>
        <Field label="Live card (wall tablets and phones)">
          <select value={store.live_card} onChange={(e) => onChange((s) => (s.live_card = e.target.value))}>
            {CARDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Live card (everyone else)">
          <select value={store.hi_live_card} onChange={(e) => onChange((s) => (s.hi_live_card = e.target.value))}>
            <option value="">The same</option>
            {CARDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        {text("portrait_query", "Portrait screens", "A media query: the screens held upright (for commanders made for them).")}
        {text("phone_query", "Phones", "A media query: these get the medium channel.")}
      </div>
      <Field label="Wall tablets" help="Home Assistant users that are wall tablets: they get the medium channel.">
        <div className={css.users}>
          {users.map((u) => (
            <label key={u.id} className={css.user}>
              <input
                type="checkbox"
                checked={store.wall_users.includes(u.id)}
                onChange={(e) =>
                  onChange((s) => (s.wall_users = e.target.checked ? [...s.wall_users, u.id] : s.wall_users.filter((x) => x !== u.id)))
                }
              />
              {u.name}
            </label>
          ))}
          {store.wall_users
            .filter((id) => !users.some((u) => u.id === id))
            .map((id) => (
              <label key={id} className={css.user} title="Not one of Home Assistant's users">
                <input type="checkbox" checked onChange={() => onChange((s) => (s.wall_users = s.wall_users.filter((x) => x !== id)))} />
                <code>{id.slice(0, 8)}…</code>
              </label>
            ))}
        </div>
      </Field>
    </div>
  );
}

export function YamlDialog({ onClose }: { onClose: () => void }) {
  const [target, setTarget] = useState<"live" | "preview">("live");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`api/camera-dashboard/yaml?target=${target}`, { cache: "no-store" }).then(async (r) => {
      if (r.ok) {
        setText(await r.text());
        setError("");
      } else setError((await r.json().catch(() => ({}))).error ?? `The app answered ${r.status}.`);
    });
  }, [target]);
  return (
    <Dialog
      title="Dashboard YAML"
      wide
      onClose={onClose}
      footer={
        <>
          <CopyButton className={ui.button} text={text} disabled={!text} />
          <button className={ui.primary} onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <p className={css.muted}>
        The saved draft, as it would be deployed. To set it by hand: the dashboard's ⋮ → Edit dashboard → ⋮ → Raw configuration
        editor, and replace everything.
      </p>
      <Segmented
        value={target}
        options={[
          ["live", "Live"],
          ["preview", "Preview"],
        ]}
        onChange={setTarget}
      />
      {error ? <div className={guest.warning}>{error}</div> : <pre className={css.yaml}>{text}</pre>}
    </Dialog>
  );
}

export function Backups({ toast, stamp }: { toast: (t: string, tone?: Toast["tone"]) => void; stamp: number }) {
  const [backups, setBackups] = useState<Backup[]>();
  useEffect(() => {
    get<{ backups: Backup[] }>("backups").then((b) => setBackups(b.backups), () => setBackups([]));
  }, [stamp]);
  if (!backups) return null;
  if (!backups.length) return <Empty>None kept yet: each live deploy keeps the config it replaces.</Empty>;
  return (
    <ul className={css.backups}>
      {backups.map((b) => (
        <li key={b.name}>
          <span>
            /{b.url_path} <span className={css.muted}>as it was {ago(b.saved)} ({b.saved.replace("T", " ")})</span>
          </span>
          <button
            className={`${ui.button} ${ui.small}`}
            onClick={() =>
              confirm(`Put /${b.url_path} back as it was then? Its current config is kept first.`) &&
              post<{ backups: Backup[] }>("restore", { name: b.name }).then(
                (r) => {
                  setBackups(r.backups);
                  toast(`/${b.url_path} restored`);
                },
                (err) => toast((err as Error).message, "bad"),
              )
            }
          >
            Restore
          </button>
        </li>
      ))}
    </ul>
  );
}
