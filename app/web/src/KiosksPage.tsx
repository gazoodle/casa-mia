/** Kiosk Satellites: every tablet found, its version and state, its admin page (through
 * the app, so it works away from home), and the backups the app keeps of each one's
 * settings or full config (taken on a timer; click a tablet to see and restore them). */

import { useCallback, useEffect, useState } from "react";
import { api, type Kiosk, type KioskBackup, type KioskKind, type KiosksView } from "./api";
import { ago } from "./format";
import { TabletIcon } from "./icons";
import { AreaHead, Empty, Shell } from "./page";
import { Dialog, Field, Segmented, Toasts, type Toast } from "./ui";
import css from "./kiosks.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";

const { get, post, put, del } = api("kiosks");
const EVERY: Record<number, string> = { 6: "6 hours", 12: "12 hours", 24: "Daily", 168: "Weekly" };
const POLL_MS = 10000;

const HEAD = {
  icon: <TabletIcon />,
  title: "Kiosk Satellites",
  blurb: "The wall tablets: found through Home Assistant and each other.",
};

export function KiosksPage({ state }: { state?: string }) {
  const [view, setView] = useState<KiosksView>();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loggingIn, setLoggingIn] = useState(false);
  const [panel, setPanel] = useState<string>(); // the kiosk whose backups are shown
  const [address, setAddress] = useState("");

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);

  const load = useCallback(() => get<KiosksView>("").then(setView, (err) => toast((err as Error).message, "bad")), [toast]);

  useEffect(() => {
    if (state !== "running") return;
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [state, load]);

  const change = async (action: () => Promise<KiosksView>, done: string) => {
    try {
      setView(await action());
      toast(done);
      return true;
    } catch (err) {
      toast((err as Error).message, "bad");
      return false;
    }
  };

  if (state && state !== "running") {
    return (
      <Shell {...HEAD} state={state}>
        <p className={guest.notice}>
          Kiosk Satellites is {state === "disabled" ? "switched off" : state}. Turn on <strong>Kiosk Satellites</strong> in
          the app's Configuration tab to use it.
        </p>
      </Shell>
    );
  }
  if (!view) return <Shell {...HEAD} state={state}><p className={guest.notice}>Loading…</p></Shell>;
  const needLogin = view.kiosks.filter((k) => !k.logged_in).length;

  return (
    <Shell {...HEAD} state={state}>
      {view.ha_error && <div className={guest.warning}>Home Assistant's devices could not be read ({view.ha_error}).</div>}
      <section className={guest.area}>
        <AreaHead
          title="Kiosks"
          blurb={
            <>
              {view.kiosks.length} found · latest release <strong>{view.latest ?? "unknown"}</strong> · looked{" "}
              {ago(view.last_scan) ?? "not yet"}
            </>
          }
          action={
            <span className={css.headActions}>
              <button
                className={ui.button}
                onClick={() => post("scan").then(() => toast("Looking for kiosks"), (e) => toast((e as Error).message, "bad"))}
              >
                Look now
              </button>
              <button className={needLogin ? ui.primary : ui.button} onClick={() => setLoggingIn(true)}>
                Log in{needLogin ? ` (${needLogin})` : ""}
              </button>
            </span>
          }
        />
        {view.kiosks.length === 0 ? (
          <Empty>
            None found yet. Kiosks are found through Home Assistant (their ESPHome devices) and through each other once
            one is logged in; or add one by address below.
          </Empty>
        ) : (
          <div className={css.list}>
            {fleets(view.kiosks).map(([k, follower]) => (
              <KioskRow
                key={k.id}
                kiosk={k}
                follower={follower}
                leaderName={view.kiosks.find((l) => follows(k, l))?.name ?? k.follows ?? undefined}
                latest={view.latest}
                onPanel={() => setPanel(k.id)}
                onUpdate={async () => {
                  try {
                    const r = await post<{ version: string | null }>(`${k.id}/update`);
                    toast(`${k.name} is updating${r.version ? ` to ${r.version}` : ""}; it restarts when done`);
                  } catch (err) {
                    toast((err as Error).message, "bad");
                  }
                }}
                onLogout={() =>
                  confirm(`Forget the app's login for ${k.name}? Log in again for backups, updates or to open it logged in.`) &&
                  change(() => del<KiosksView>(`${k.id}/login`), `Login for ${k.name} forgotten`)
                }
                onForget={() =>
                  confirm(`Forget ${k.name}? It is taken off this list with its login, and comes back at the next look if it is still found.`) &&
                  change(() => del<KiosksView>(k.id), `${k.name} forgotten`)
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className={guest.area}>
        <AreaHead
          title="Backups"
          blurb="The app takes each logged-in tablet's setup into its own data (so Home Assistant backups have it too), and keeps a new copy only when something changed. Click a tablet to see its copies and restore one."
        />
        <div className={css.backupSettings}>
          <span>What</span>
          <Segmented
            value={view.backup.kind}
            options={Object.entries(view.kinds) as [KioskKind, string][]}
            onChange={(kind) => change(() => put<KiosksView>("backup", { ...view.backup, kind }), `Backing up ${view.kinds[kind].toLowerCase()}`)}
          />
          <span>Keep</span>
          <Segmented
            value={String(view.backup.keep)}
            options={Array.from({ length: view.max_keep }, (_, n) => [String(n + 1), String(n + 1)] as [string, string])}
            onChange={(keep) => change(() => put<KiosksView>("backup", { ...view.backup, keep: Number(keep) }), `Keeping ${keep} per tablet`)}
          />
          <span>Check</span>
          <Segmented
            value={String(view.backup.every_hours)}
            options={view.every_hours.map((h) => [String(h), EVERY[h] ?? `${h} h`] as [string, string])}
            onChange={(every) =>
              change(() => put<KiosksView>("backup", { ...view.backup, every_hours: Number(every) }), `Checking ${(EVERY[Number(every)] ?? every).toLowerCase()}`)
            }
          />
        </div>
        <p className={guest.checkHelp}>
          {view.kinds.config}: every setting with its secrets (the Home Assistant token too) and the page's stored data.{" "}
          {view.kinds.settings}: the settings alone. Lowering Keep removes the older copies now.
        </p>
      </section>

      <section className={guest.area}>
        <AreaHead title="Add a kiosk" blurb="Only needed for a kiosk neither Home Assistant nor the other kiosks know." />
        <form
          className={css.addRow}
          onSubmit={async (e) => {
            e.preventDefault();
            if (await change(() => post<KiosksView>("addresses", { address }), `${address} added`)) setAddress("");
          }}
        >
          <input placeholder="192.168.1.50 or ks-kitchen.local" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button className={ui.button} disabled={!address.trim()}>
            Add
          </button>
        </form>
      </section>

      {loggingIn && (
        <LoginDialog
          onClose={() => setLoggingIn(false)}
          onDone={(next) => {
            setView(next);
            setLoggingIn(false);
            const results = Object.entries(next.results ?? {});
            const ok = results.filter(([, r]) => r === "ok").length;
            const name = (id: string) => next.kiosks.find((k) => k.id === id)?.name ?? id;
            const bad = results.filter(([, r]) => r !== "ok").map(([id, r]) => `${name(id)}: ${r}`);
            toast(`Logged in to ${ok} of ${results.length}${bad.length ? ` (${bad.join(", ")})` : ""}`, bad.length ? "bad" : "good");
          }}
          onError={(text) => toast(text, "bad")}
        />
      )}
      {panel && view.kiosks.some((k) => k.id === panel) && (
        <BackupsPanel
          kiosk={view.kiosks.find((k) => k.id === panel)!}
          kinds={view.kinds}
          onClose={() => {
            setPanel(undefined);
            load();
          }}
          toast={toast}
        />
      )}
      <Toasts toasts={toasts} />
    </Shell>
  );
}

/** Whether `k` follows `leader`. Kiosk Satellite names the leader in `follows` (its name
 * today, e.g. "Kitchen"); the id is accepted too in case that changes. */
const follows = (k: Kiosk, leader: Kiosk) => !!k.follows && (k.follows === leader.id || k.follows === leader.name);

/** Leaders first, each followed by its followers (indented), then everyone else. */
function fleets(kiosks: Kiosk[]): [Kiosk, boolean][] {
  const byName = (a: Kiosk, b: Kiosk) => a.name.localeCompare(b.name);
  const leaders = kiosks.filter((k) => k.leader).sort(byName);
  const out: [Kiosk, boolean][] = [];
  for (const leader of leaders) {
    out.push([leader, false]);
    for (const f of kiosks.filter((k) => follows(k, leader)).sort(byName)) out.push([f, true]);
  }
  const placed = new Set(out.map(([k]) => k.id));
  return [...out, ...kiosks.filter((k) => !placed.has(k.id)).sort(byName).map((k): [Kiosk, boolean] => [k, false])];
}

function KioskRow({
  kiosk: k,
  follower,
  leaderName,
  latest,
  onPanel,
  onUpdate,
  onLogout,
  onForget,
}: {
  kiosk: Kiosk;
  follower: boolean;
  leaderName?: string;
  latest: string | null;
  onPanel: () => void;
  onUpdate: () => void;
  onLogout: () => void;
  onForget: () => void;
}) {
  const facts = [
    k.model,
    k.battery != null ? `battery ${k.battery}%${k.charging ? " charging" : ""}` : "",
    k.rssi != null ? `Wi-Fi ${k.rssi} dBm` : "",
  ].filter(Boolean);
  return (
    <div className={`${css.kiosk} ${k.online ? "" : css.offline} ${follower ? css.follower : ""}`}>
      <button className={css.main} onClick={onPanel} title="Its backups">
        <div className={css.title}>
          <span className={`${css.dot} ${k.online ? css.on : css.off}`} title={k.online ? "Online" : "Not answering"} />
          <strong>{k.name}</strong>
          <span className={`${css.version} ${k.behind ? css.behind : ""}`} title={k.behind ? `Latest is ${latest}` : "Up to date"}>
            {k.version ?? "?"}
            {k.behind && " ↑"}
          </span>
          {k.leader && <span className={`${guest.badge} ${css.leader}`} title="Leads a fleet: pushes its settings to the kiosks that follow it">leader</span>}
          {k.follows && !follower && (
            <span className={guest.badge} title="Follows a leader that is not on this list">follows {leaderName ?? "another kiosk"}</span>
          )}
          {!k.logged_in && <span className={guest.badge}>needs login</span>}
        </div>
        <div className={css.meta}>
          <span className={css.ip}>{k.ip ?? k.address}</span>
          {facts.length > 0 && <span>{facts.join(" · ")}</span>}
          {!k.online && <span>last seen {ago(k.last_seen) ?? "never"}</span>}
        </div>
        <div className={css.meta}>
          {k.backup_error ? (
            <span className={css.backupBad}>backup: {k.backup_error}</span>
          ) : (
            <span>
              {k.backups} backup{k.backups === 1 ? "" : "s"}
              {k.last_backup && ` · last change ${ago(k.last_backup)}`}
              {k.checked && ` · checked ${ago(k.checked)}`}
            </span>
          )}
        </div>
      </button>
      <div className={css.actions}>
        <a
          className={`${ui.primary} ${ui.small}`}
          href={`#/kiosks/${k.id}`}
          aria-disabled={!k.online}
          title="Its own admin page, here in the panel (works away from home)"
        >
          Open
        </a>
        {k.lan_url && (
          <a
            className={`${ui.button} ${ui.small}`}
            href={k.lan_url}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!k.online}
            title="Its admin page directly, in a new browser tab (at home only)"
          >
            Visit ↗
          </a>
        )}
        {k.behind && k.logged_in && k.online && (
          <button
            className={`${ui.primary} ${ui.small}`}
            onClick={() => confirm(`Update ${k.name} to ${latest}? It downloads from the firmware server and restarts.`) && onUpdate()}
            title={`Install ${latest} from the firmware server; the tablet restarts`}
          >
            Update
          </button>
        )}
        {k.logged_in && (
          <button
            className={`${ui.button} ${ui.small}`}
            onClick={onLogout}
            title="Forget the app's 10-year login for this tablet (nothing changes on the tablet)"
          >
            Log out
          </button>
        )}
        <button
          className={`${ui.danger} ${ui.small}`}
          onClick={onForget}
          title="Take it off this list with its login; it comes back at the next look if it is still found"
        >
          Forget
        </button>
      </div>
    </div>
  );
}

function LoginDialog({
  onClose,
  onDone,
  onError,
}: {
  onClose: () => void;
  onDone: (view: KiosksView) => void;
  onError: (text: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      title="Log in to the kiosks"
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button
            className={ui.primary}
            disabled={!password || busy}
            onClick={async () => {
              setBusy(true);
              try {
                onDone(await post<KiosksView>("login", { password }));
              } catch (err) {
                onError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Logging in…" : "Log in"}
          </button>
        </>
      }
    >
      <Field
        label="Remote admin password"
        help="The password set under Remote Administration on the kiosks. The app logs in to each kiosk that answers and keeps a 10-year login for it; the password itself is not kept."
      >
        <input type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
    </Dialog>
  );
}

/** One tablet's kept backups, newest first: what changed in each, and Restore. */
function BackupsPanel({
  kiosk: k,
  kinds,
  onClose,
  toast,
}: {
  kiosk: Kiosk;
  kinds: Record<KioskKind, string>;
  onClose: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
}) {
  const [backups, setBackups] = useState<KioskBackup[]>();
  const [busy, setBusy] = useState("");

  useEffect(() => {
    get<{ backups: KioskBackup[] }>(`${k.id}/backups`).then(
      (r) => setBackups(r.backups),
      (err) => toast((err as Error).message, "bad"),
    );
  }, [k.id, toast]);

  const getLatest = async () => {
    setBusy("latest");
    try {
      const r = await post<{ saved: boolean; changes: string[]; backups: KioskBackup[] }>(`${k.id}/backups`);
      setBackups(r.backups);
      toast(r.saved ? (r.changes.length ? `Kept: ${r.changes.length} change${r.changes.length === 1 ? "" : "s"}` : "Kept the first backup") : "No change since the last backup");
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy("");
    }
  };

  const restore = async (b: KioskBackup) => {
    if (!confirm(`Restore ${k.name} to its ${kinds[b.kind].toLowerCase()} from ${stamp(b.at)}? Its current setup is replaced.`)) return;
    setBusy(b.name);
    try {
      await post(`${k.id}/backups/${b.name}`);
      toast(`${k.name} restored to ${stamp(b.at)}`);
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy("");
    }
  };

  const download = async (b: KioskBackup) => {
    // The Home Assistant app on iPhone, iPad and Mac never saves a download made inside the
    // panel (Android's does). Say so rather than fail silently; see BACKLOG.
    if (/Home Assistant\//.test(navigator.userAgent) && !/Android/.test(navigator.userAgent)) {
      toast("The Home Assistant app can't save downloads. Open this panel in a browser to download it.", "bad");
      return;
    }
    try {
      const response = await fetch(`api/kiosks/${k.id}/backups/${b.name}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Download failed: the app answered ${response.status}`);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(await response.blob());
      link.download = `${k.name}-${b.name}`;
      link.click();
      // Safari saves the file after click() returns; revoking now cancels it (NSURLError -999).
      setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  };

  const live = k.logged_in && k.online;
  return (
    <Dialog
      title={`${k.name}: backups`}
      wide
      onClose={onClose}
      footer={
        <button className={ui.primary} onClick={onClose}>
          Done
        </button>
      }
    >
      <div className={css.panelHead}>
        <p className={guest.checkHelp}>
          {live ? "Kept in the app's data, newest first. A copy is kept only when something changed." : k.logged_in ? `${k.name} is not answering.` : `Log in to ${k.name} first.`}
        </p>
        <button className={ui.button} disabled={!live || !!busy} onClick={getLatest} title="Take its setup now; kept if it changed">
          {busy === "latest" ? "Getting…" : "Get latest"}
        </button>
      </div>
      {!backups ? (
        <p className={guest.notice}>Loading…</p>
      ) : backups.length === 0 ? (
        <Empty>None yet. Get latest takes the first.</Empty>
      ) : (
        <ul className={css.backups}>
          {backups.map((b) => (
            <li key={b.name}>
              <div className={css.backupMain}>
                <strong>{stamp(b.at)}</strong>
                <span className={css.meta}>
                  {kinds[b.kind]} · {Math.max(1, Math.round(b.size / 1024))} KB · {ago(b.at)}
                </span>
                <span className={css.changes} title={b.changes?.join("\n")}>
                  {b.changes === null ? "first kept" : b.changes.length === 0 ? "no material change" : changed(b.changes)}
                </span>
              </div>
              <span className={css.actions}>
                <button className={`${ui.button} ${ui.small}`} onClick={() => download(b)} title="Download this copy">
                  Download
                </button>
                <button
                  className={`${ui.danger} ${ui.small}`}
                  disabled={!live || !!busy}
                  onClick={() => restore(b)}
                  title={`Send this copy back to ${k.name}, replacing its current setup`}
                >
                  {busy === b.name ? "Restoring…" : "Restore"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

/** "settings/screen.brightness, settings/volume and 3 more" */
function changed(keys: string[]): string {
  const shown = keys.slice(0, 3).join(", ");
  return `changed ${shown}${keys.length > 3 ? ` and ${keys.length - 3} more` : ""}`;
}

/** 2026-10-02 21:15, in local time. */
function stamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** A kiosk's own admin page, through the app (ingress), filling the panel. */
export function KioskFrame({ id }: { id: string }) {
  const [kiosk, setKiosk] = useState<Kiosk>();
  useEffect(() => {
    get<KiosksView>("").then((v) => setKiosk(v.kiosks.find((k) => k.id === id)), () => undefined);
  }, [id]);
  const src = `kiosk/${id}/`;
  return (
    <div className={css.frame}>
      <nav className={css.frameBar}>
        <a href="#/kiosks" className={guest.back}>
          ← Kiosks
        </a>
        <strong>{kiosk?.name ?? id}</strong>
        {kiosk && <span className={css.ip}>{kiosk.ip ?? kiosk.address}</span>}
      </nav>
      <iframe src={src} title={`${kiosk?.name ?? id} admin page`} />
    </div>
  );
}
