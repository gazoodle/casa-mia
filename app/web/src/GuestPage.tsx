/** Guest login: the endpoints (one per QR code) with the selected one's QR code, and the
 * logins (HA users) the endpoints sign visitors in as. Every change applies at once. */

import { useCallback, useEffect, useState } from "react";
import { del, get, post, put, type Endpoint, type GuestConfig, type HAChoices, type Login } from "./api";
import { ago } from "./format";
import { EndpointDialog, LoginDialog, PasswordDialog, SettingsDialog } from "./GuestDialogs";
import { GuestIcon } from "./icons";
import { AreaHead, Empty, Shell } from "./page";
import { copyText, Switch, Toasts, type Toast } from "./ui";
import css from "./guest.module.css";
import ui from "./ui.module.css";

const POLL_MS = 5000;

const HEAD = {
  icon: <GuestIcon />,
  title: "Guest login",
  module: "guest_login",
  blurb: "QR codes that sign guests and engineers straight into their own dashboard.",
};

type Editing =
  | { kind: "endpoint"; endpoint?: Endpoint }
  | { kind: "login" }
  | { kind: "password"; login: Login }
  | { kind: "settings" }
  | null;

export function GuestPage({ state }: { state?: string }) {
  const [config, setConfig] = useState<GuestConfig>();
  const [ha, setHa] = useState<HAChoices>();
  const [selected, setSelected] = useState<string>();
  const [editing, setEditing] = useState<Editing>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);

  const load = useCallback(async () => {
    try {
      setConfig(await get<GuestConfig>("config"));
    } catch (err) {
      if (state === "running") toast(String((err as Error).message), "bad");
    }
  }, [state, toast]);

  useEffect(() => {
    if (state !== "running") return;
    load();
    get<HAChoices>("ha").then(setHa, () => setHa({ users: [], dashboards: [], error: "Could not ask Home Assistant." }));
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [state, load]);

  /** Run a change; the API answers with the whole new config. */
  const change = async (action: () => Promise<GuestConfig>, done?: string) => {
    setBusy(true);
    try {
      setConfig(await action());
      if (done) toast(done);
      return true;
    } catch (err) {
      toast((err as Error).message, "bad");
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (state && state !== "running") {
    return (
      <Shell {...HEAD} state={state}>
        <p className={css.notice}>
          Guest login is {state === "disabled" ? "switched off" : state}. Turn on <strong>Guest login</strong> in
          the app's Configuration tab to set it up.
        </p>
      </Shell>
    );
  }
  if (!config) return <Shell {...HEAD} state={state}><p className={css.notice}>Loading…</p></Shell>;

  const current = config.endpoints.find((e) => e.id === selected) ?? config.endpoints[0];
  const noLogins = config.logins.length === 0;

  return (
    <Shell
      {...HEAD}
      state={state}
      action={
        <button className={ui.button} onClick={() => setEditing({ kind: "settings" })}>
          Settings
        </button>
      }
    >
      {ha?.error && (
        <div className={css.warning}>
          Home Assistant's users and dashboards could not be read ({ha.error}). You can still type them in.
        </div>
      )}

      <section className={css.area}>
        <AreaHead
          title="Endpoints"
          blurb="One per QR code. Each is off until you open it, here or from an automation."
          action={
            <button
              className={ui.primary}
              disabled={noLogins}
              title={noLogins ? "Add a login first" : undefined}
              onClick={() => setEditing({ kind: "endpoint" })}
            >
              + Add endpoint
            </button>
          }
        />
        {config.endpoints.length === 0 ? (
          <Empty>
            {noLogins
              ? "Start with a login below: the Home Assistant user visitors are signed in as. Then add an endpoint for each QR code."
              : "No endpoints yet. Add one for each QR code: a guest suite, a KNX panel, the plant room."}
          </Empty>
        ) : (
          <div className={css.split}>
            <ul className={css.list}>
              {config.endpoints.map((e) => (
                <li key={e.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`${css.row} ${current?.id === e.id ? css.rowOn : ""}`}
                    onClick={() => setSelected(e.id)}
                    onKeyDown={(k) => k.key === "Enter" && setSelected(e.id)}
                  >
                    <div className={css.rowMain}>
                      <span className={css.rowTitle}>
                        {e.label}
                        <span className={e.type === "engineer" ? css.badgeEng : css.badge}>
                          {e.type === "engineer" ? "Engineer" : "Guest"}
                        </span>
                      </span>
                      <span className={css.rowMeta}>
                        {e.account ?? config.default_login} · {e.logins ?? 0} logins
                        {e.last_login ? ` · last ${ago(e.last_login)}` : ""}
                      </span>
                    </div>
                    <span className={css.stateText}>{openLabel(e)}</span>
                    <Switch
                      on={!!e.enabled}
                      busy={busy}
                      label={`${e.label} open`}
                      onChange={(on) =>
                        change(() => post<GuestConfig>(`endpoints/${e.id}/${on ? "on" : "off"}`), `${e.label} ${on ? "opened" : "closed"}`)
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
            {current && (
              <Detail
                endpoint={current}
                defaultLogin={config.default_login}
                hosts={config.hosts}
                busy={busy}
                onEdit={() => setEditing({ kind: "endpoint", endpoint: current })}
                onOpen={(minutes) =>
                  change(
                    () => post<GuestConfig>(`endpoints/${current.id}/on${minutes ? `?minutes=${minutes}` : ""}`),
                    `${current.label} open${minutes ? ` for ${minutes / 60} h` : ""}`,
                  )
                }
                onClose={() => change(() => post<GuestConfig>(`endpoints/${current.id}/off`), `${current.label} closed`)}
                onDelete={() =>
                  confirm(`Delete ${current.label}? Its QR code stops working and its device leaves Home Assistant.`) &&
                  change(() => del<GuestConfig>(`endpoints/${current.id}`), `${current.label} deleted`)
                }
                toast={toast}
              />
            )}
          </div>
        )}
      </section>

      <section className={css.area}>
        <AreaHead
          title="Logins"
          blurb="The Home Assistant users that visitors are signed in as. Use non-admin users."
          action={
            <button className={ui.button} onClick={() => setEditing({ kind: "login" })}>
              + Add login
            </button>
          }
        />
        {noLogins ? (
          <Empty>No logins yet. Link an existing Home Assistant user, or create one here.</Empty>
        ) : (
          <div className={css.logins}>
            {config.logins.map((l) => (
              <LoginCard
                key={l.name}
                login={l}
                isDefault={l.name === config.default_login}
                admin={ha?.users.find((u) => u.id === l.user_id)?.is_admin}
                onPassword={() => setEditing({ kind: "password", login: l })}
                onDefault={() => change(() => put<GuestConfig>("settings", { default_login: l.name }), `${l.name} is now the default`)}
                onDelete={() =>
                  confirm(`Remove the login ${l.name}? The Home Assistant user itself is kept.`) &&
                  change(() => del<GuestConfig>(`logins/${l.name}`), `${l.name} removed`)
                }
                toast={toast}
              />
            ))}
          </div>
        )}
      </section>

      {editing?.kind === "endpoint" && (
        <EndpointDialog
          endpoint={editing.endpoint}
          config={config}
          ha={ha}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const ok = await change(
              () => (editing.endpoint ? put<GuestConfig>(`endpoints/${editing.endpoint.id}`, body) : post<GuestConfig>("endpoints", body)),
              `${body.label} saved`,
            );
            if (ok) {
              setSelected(body.id);
              setEditing(null);
            }
          }}
        />
      )}
      {editing?.kind === "login" && (
        <LoginDialog
          config={config}
          ha={ha}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            if (await change(() => post<GuestConfig>("logins", body), `Login ${body.name} added`)) setEditing(null);
          }}
        />
      )}
      {editing?.kind === "password" && (
        <PasswordDialog
          login={editing.login}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            if (await change(() => put<GuestConfig>(`logins/${editing.login.name}`, body), "Password changed")) setEditing(null);
          }}
        />
      )}
      {editing?.kind === "settings" && (
        <SettingsDialog
          config={config}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            if (await change(() => put<GuestConfig>("settings", body), "Settings saved")) setEditing(null);
          }}
        />
      )}
      <Toasts toasts={toasts} />
    </Shell>
  );
}

function openLabel(e: Endpoint): string {
  if (!e.enabled) return "Closed";
  if (e.until) {
    const t = new Date(e.until * 1000);
    return `Open until ${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return "Open";
}

function Detail({
  endpoint: e,
  defaultLogin,
  hosts,
  busy,
  onEdit,
  onOpen,
  onClose,
  onDelete,
  toast,
}: {
  endpoint: Endpoint;
  defaultLogin: string;
  hosts: string[];
  busy: boolean;
  onEdit: () => void;
  onOpen: (minutes?: number) => void;
  onClose: () => void;
  onDelete: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
}) {
  const qr = `api/guest/qr/${e.id}`;
  const trial = tryUrl(e.url, hosts);
  const v = encodeURIComponent(e.url); // a changed address must not show a cached image
  const saveToMedia = async () => {
    try {
      const out = await post<{ file: string; media_source: string }>(`qr/${e.id}/media`);
      await copyText(out.media_source).catch(() => undefined);
      toast(`Saved to ${out.file}. Its media-source address is copied, ready for a dashboard picture card.`);
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  };
  return (
    <aside className={css.detail}>
      <div className={css.detailHead}>
        <div>
          <h3>{e.label}</h3>
          <span className={e.enabled ? css.open : css.closed}>{openLabel(e)}</span>
        </div>
        <button className={`${ui.button} ${ui.small}`} onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className={css.qrFrame}>
        <img className={css.qr} src={`${qr}.svg?v=${v}`} alt={`QR code for ${e.label}`} />
      </div>
      <button
        className={css.url}
        title="Copy the address"
        onClick={() => copyText(e.url).then(() => toast("Address copied"), () => toast("Couldn't copy: select it by hand", "bad"))}
      >
        {e.url}
      </button>
      <p className={css.lands}>
        Lands on <code>{e.dashboard}</code> as <strong>{e.account ?? defaultLogin}</strong>
        {e.legacy && " · answers the printed QR code"}
      </p>
      <div className={css.actions}>
        <a className={`${ui.button} ${ui.small}`} href={`${qr}.png?v=${v}`} download={`${e.id}-qr.png`}>
          Download PNG
        </a>
        <a className={`${ui.button} ${ui.small}`} href={`${qr}.svg?v=${v}`} download={`${e.id}-qr.svg`}>
          SVG
        </a>
        <button className={`${ui.button} ${ui.small}`} onClick={saveToMedia}>
          Save to HA media
        </button>
      </div>
      <div className={css.tryRow}>
        <a className={`${ui.button} ${ui.small}`} href={trial.url} target="_blank" rel="noopener noreferrer">
          Try it ↗
        </a>
        <span className={css.tryHelp}>
          {!e.enabled
            ? "It is closed, so this shows the Not available page. Open it first to try the whole sign-in."
            : trial.clash
              ? `Runs the whole sign-in and counts as a login. This box has no other name to use, so it would replace your own login at ${location.hostname}: use a private window.`
              : `Runs the whole sign-in, as a scan would, and counts as a login. The visitor lands on Home Assistant at ${trial.host}, so your own login at ${location.hostname} is untouched.`}
        </span>
      </div>
      <div className={css.openRow}>
        {e.enabled ? (
          <button className={`${ui.button} ${ui.small}`} disabled={busy} onClick={onClose}>
            Close now
          </button>
        ) : (
          <button className={`${ui.primary} ${ui.small}`} disabled={busy} onClick={() => onOpen()}>
            Open
          </button>
        )}
        <span className={css.openFor}>Open for</span>
        {[60, 240, 1440].map((m) => (
          <button key={m} className={`${ui.button} ${ui.small}`} disabled={busy} onClick={() => onOpen(m)}>
            {m < 1440 ? `${m / 60} h` : "1 day"}
          </button>
        ))}
      </div>
      <button className={`${ui.danger} ${ui.small} ${css.delete}`} onClick={onDelete}>
        Delete endpoint
      </button>
    </aside>
  );
}

/** HA keeps one login per address in a browser. When the QR address is the one this
 * browser uses for Home Assistant, the guest page (still at the QR address: the app's ports
 * answer on IPv4 only, and a .local name may resolve to IPv6 first) is told to send the
 * browser to HA under one of the box's other names, so the admin's own login is left alone. */
function tryUrl(url: string, hosts: string[]): { url: string; host: string; clash: boolean } {
  const u = new URL(url);
  const mine = location.hostname;
  if (u.hostname !== mine) return { url, host: u.hostname, clash: false };
  const other = hosts.find((h) => h !== mine);
  if (!other) return { url, host: u.hostname, clash: true };
  u.searchParams.set("ha_host", other);
  return { url: u.href, host: other, clash: false };
}

function LoginCard({
  login: l,
  isDefault,
  admin,
  onPassword,
  onDefault,
  onDelete,
  toast,
}: {
  login: Login;
  isDefault: boolean;
  admin?: boolean;
  onPassword: () => void;
  onDefault: () => void;
  onDelete: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
}) {
  const [testing, setTesting] = useState(false);
  const test = async () => {
    setTesting(true);
    try {
      const out = await post<{ ok: boolean; message: string }>(`logins/${l.name}/test`);
      toast(out.message, out.ok ? "good" : "bad");
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setTesting(false);
    }
  };
  return (
    <article className={css.login}>
      <div className={css.loginHead}>
        <span className={css.avatar}>{(l.display ?? l.name).slice(0, 1).toUpperCase()}</span>
        <div>
          <h3>
            {l.name}
            {isDefault && <span className={css.badge}>Default</span>}
          </h3>
          <span className={css.rowMeta}>
            {l.display ? `${l.display} · ` : ""}user <code>{l.username}</code>
          </span>
        </div>
      </div>
      {admin && <p className={css.adminWarn}>This is an administrator. Visitors would get full control: use a non-admin user.</p>}
      <p className={css.rowMeta}>
        {l.endpoints === 0 ? "Not used by any endpoint" : `Used by ${l.endpoints} endpoint${l.endpoints === 1 ? "" : "s"}`}
      </p>
      <div className={css.actions}>
        <button className={`${ui.button} ${ui.small}`} disabled={testing} onClick={test}>
          {testing ? "Testing…" : "Test"}
        </button>
        <button className={`${ui.button} ${ui.small}`} onClick={onPassword}>
          Password
        </button>
        {!isDefault && (
          <button className={`${ui.button} ${ui.small}`} onClick={onDefault}>
            Make default
          </button>
        )}
        <button className={`${ui.danger} ${ui.small}`} onClick={onDelete}>
          Remove
        </button>
      </div>
    </article>
  );
}
