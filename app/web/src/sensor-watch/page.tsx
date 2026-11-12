/** Sensor Watch: the watched sensors with their level now (from the integration, in
 * watched.tsx), Home Assistant itself, and the ways to add more. */

import { useCallback, useEffect, useRef, useState } from "react";
import { MODULES } from "../modules";
import { AreaHead, Shell, Loading } from "../page";
import { Toasts, type Toast } from "../ui";
import { About, Start } from "./about";
import { levelsOf, NO_FILTERS, swApi, type Filters, type Group, type Profile, type WatchRecord, type WatchView } from "./common";
import { ApplyDialog, PickDialog, ScanDialog } from "./dialogs";
import { RecordDialog } from "./editor";
import { GroupsSection } from "./groups";
import { useLevels } from "./live";
import { ProfileDialog, ProfilesSection } from "./profiles";
import { SystemSection } from "./system";
import { WatchedList } from "./watched";
import { SetupDialog } from "./wizard";
import css from "./sensor-watch.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";
import { confirmBox } from "../confirm";

// The Home tile's own words and icon (modules.tsx), so the two say the same.
const { icon, title, blurb } = MODULES.sensor_watch;
const HEAD = { icon, title, blurb, module: "sensor_watch" };

/** Drawn by the panel in Home Assistant's sidebar (panel.tsx). `menu`: opens the sidebar
 * while Home Assistant hides it (a phone). `watch`: an entity whose watch to open (new
 * or not), asked at `at` (the eye in its Home Assistant dialog, in the address). */
export function SensorWatchPage({ menu, watch, at }: { menu?: () => void; watch?: string; at?: string }) {
  const [view, setView] = useState<WatchView>();
  const [missing, setMissing] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ entityId: string; record?: WatchRecord }>();
  const [picking, setPicking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  // A profile being edited (null: a new one), or followed by more sensors.
  const [profileEditing, setProfileEditing] = useState<Profile | null>();
  const [profileCopy, setProfileCopy] = useState<Profile>();
  const [groupEditing, setGroupEditing] = useState<Group | null>(); // null: a new one
  const [groupSeed, setGroupSeed] = useState<Partial<Filters>>(); // a new one's filters
  const [applying, setApplying] = useState<Profile>();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const watchedRef = useRef<HTMLElement>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);

  // The records, read each time every level arrives: at the start, and again when Sensor
  // Watch starts after being down or the connection comes back, so the page recovers.
  const load = useCallback(() => {
    swApi.get<WatchView>("").then(setView, (err) => toast((err as Error).message, "bad"));
    swApi.get<{ missing: string[] }>("check").then((c) => setMissing(c.missing), () => undefined);
  }, [toast]);
  const live = useLevels(load);

  // An entity's watch asked for: open, once the records are here (so a watched one opens
  // as it is), and the ask taken off the address, so a reload doesn't open it again.
  const loaded = !!view;
  useEffect(() => {
    if (!watch || !loaded) return;
    setEditing({ entityId: watch, record: view?.records.find((r) => r.entity_id === watch) });
    // Home Assistant's address: this page is in an iframe whose own never changes.
    window.parent.history.replaceState(null, "", window.parent.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per ask, not per view
  }, [watch, at, loaded]);

  /** Run `action`, show the view it ends with, and say `done` (or what it says of the view). */
  const change = async <V extends WatchView>(action: () => Promise<V>, done: string | ((v: V) => string)) => {
    try {
      const v = await action();
      setView(v);
      toast(typeof done === "string" ? done : done(v));
      return true;
    } catch (err) {
      toast((err as Error).message, "bad");
      return false;
    }
  };

  const top = menu ? (
    <button className={`${ui.button} ${ui.small}`} onClick={menu} aria-label="Open Home Assistant's sidebar">
      ☰ Menu
    </button>
  ) : null;

  // No records yet: say why if the feed has (Sensor Watch isn't running), else wait.
  if (!view)
    return (
      <Shell {...HEAD} top={top}>
        {live?.error ? <div className={guest.warning}>{live.error}</div> : <Loading toasts={toasts} />}
      </Shell>
    );

  // Watched (not disabled) but no level from the integration yet: unavailable and
  // waiting out its hold-off, or unavailable and set to Ignore. A diagnostic.
  const levelless = live ? view.records.filter((r) => !r.disabled && !live.levels[r.entity_id]).length : 0;
  return (
    <Shell
      {...HEAD}
      top={top}
      action={
        <span className={css.actions}>
          {levelless > 0 && (
            <span className={css.levelless} role="status">
              {levelless} with no level yet
            </span>
          )}
          <button
            className={`${ui.button} ${ui.small}`}
            onClick={() => change(() => swApi.post<WatchView>("refresh"), "Every watch judged afresh")}
          >
            Refresh state
          </button>
        </span>
      }
    >
      {missing.length > 0 && (
        <div className={css.alarm} role="alert">
          <strong>Home Assistant isn't running its {missing.join(" or ")} integration.</strong> That's a serious fault in Home Assistant, not just here:
          without it there's no history and no statistics, so Sensor Watch can't suggest bands, and Home Assistant's own History panel and graphs
          don't work either. Look in Settings → System → Logs for why it didn't start. You can still set sensors up by hand meanwhile.
        </div>
      )}
      {view.error && <div className={guest.warning}>The saved records could not be read ({view.error}), so nothing is watched.</div>}
      {live?.error && <div className={guest.warning}>{live.error}</div>}
      <About empty={!view.records.length} />
      <section className={guest.area} ref={watchedRef}>
        <AreaHead
          title="Watched sensors"
          blurb={view.records.length ? `${view.records.length} watched; the chips filter them and give the counts.` : "Nothing watched yet."}
          action={
            <span className={css.actions}>
              <button className={ui.button} onClick={() => setSettingUp(true)}>
                Set up…
              </button>
              <button className={ui.button} onClick={() => setScanning(true)}>
                Scan my house
              </button>
              <button className={ui.primary} onClick={() => setPicking(true)}>
                + Watch an entity
              </button>
            </span>
          }
        />
        {view.records.length === 0 ? (
          <div className={`${ui.empty} ${css.emptyStart}`}>
            <Start
              actions={
                <span className={css.actions}>
                  <button className={ui.primary} onClick={() => setSettingUp(true)}>
                    Set up, step by step…
                  </button>
                  <button className={ui.button} onClick={() => setGroupEditing(null)}>
                    + New group
                  </button>
                  <button className={ui.button} onClick={() => setScanning(true)}>
                    Scan my house
                  </button>
                </span>
              }
          />
          </div>
        ) : (
          <WatchedList
            records={view.records}
            live={live}
            labels={view.labels ?? {}}
            profiles={view.profiles ?? []}
            groups={view.groups ?? []}
            filters={filters}
            setFilters={setFilters}
            onFollow={(rs, p) =>
              change(() => swApi.post<WatchView>(`profiles/${p.id}/apply`, { entity_ids: rs.map((r) => r.entity_id) }), `${rs.length} sensors follow ${p.name}`)
            }
            onEdit={(r) => setEditing({ entityId: r.entity_id, record: r })}
            onStopMany={(rs) =>
              change(() => swApi.post<WatchView>("forget", { entity_ids: rs.map((r) => r.entity_id) }), `${rs.length} sensors no longer watched`)
            }
            onEnable={(r) =>
              change(
                () =>
                  swApi.put<WatchView>(
                    encodeURIComponent(r.entity_id),
                    // As it was, watched again: its profile, or its own levels.
                    r.profile
                      ? { profile: r.profile, name: r.name, attribute: r.attribute, disabled: false }
                      : { ...levelsOf(r), name: r.name, attribute: r.attribute, disabled: false },
                  ),
                `${r.label}: watched again`,
              )
            }
          />
        )}
      </section>

      <GroupsSection
        editing={groupEditing}
        setEditing={(g) => {
          setGroupEditing(g);
          if (g === undefined) setGroupSeed(undefined);
        }}
        seed={groupSeed}
        groups={view.groups ?? []}
        profiles={view.profiles ?? []}
        records={view.records}
        labels={view.labels ?? {}}
        change={change}
        onMembers={(g) => {
          setFilters({ ...NO_FILTERS, group: g.id });
          watchedRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <ProfilesSection
        profiles={view.profiles ?? []}
        change={change}
        onEdit={(p) => setProfileEditing(p ?? null)}
        onApply={setApplying}
        onFollowers={(p) => {
          setFilters({ ...NO_FILTERS, profile: p.id });
          watchedRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <SystemSection system={view.system} live={live} change={change} />

      {picking && (
        <PickDialog
          onClose={() => setPicking(false)}
          onPick={(entityId) => {
            setPicking(false);
            setEditing({ entityId });
          }}
        />
      )}
      {editing && (
        <RecordDialog
          entityId={editing.entityId}
          record={editing.record}
          profiles={view.profiles ?? []}
          onClose={() => setEditing(undefined)}
          onStop={async (r) => {
            if (!(await confirmBox(`Stop watching ${r.label}?`, { action: "Stop watching", danger: true }))) return;
            if (await change(() => swApi.del<WatchView>(encodeURIComponent(r.entity_id)), `${r.label}: no longer watched`)) setEditing(undefined);
          }}
          onGroup={(f) => {
            setEditing(undefined);
            setGroupSeed(f);
            setGroupEditing(null);
          }}
          change={change}
        />
      )}
      {scanning && (
        <ScanDialog
          profiles={view.profiles ?? []}
          onClose={() => setScanning(false)}
          onAccepted={(records) => change(() => swApi.post<WatchView>("accept", { records }), `${records.length} sensors watched`)}
        />
      )}
      {settingUp && (
        <SetupDialog
          view={view}
          onView={setView}
          onClose={() => setSettingUp(false)}
          onGroup={(id) => {
            setSettingUp(false);
            setGroupEditing(view.groups.find((g) => g.id === id));
          }}
          onAccepted={(records) => change(() => swApi.post<WatchView>("accept", { records }), `${records.length} sensors watched`)}
        />
      )}
      {profileCopy && <ProfileDialog copyOf={profileCopy} onClose={() => setProfileCopy(undefined)} change={change} />}
      {profileEditing !== undefined && (
        <ProfileDialog
          profile={profileEditing ?? undefined}
          onDuplicate={(p) => {
            setProfileEditing(undefined);
            setProfileCopy(p);
          }}
          onClose={() => setProfileEditing(undefined)} change={change} />
      )}
      {applying && (
        <ApplyDialog
          profile={applying}
          onClose={() => setApplying(undefined)}
          onApply={(ids) =>
            change(
              () => swApi.post<WatchView & { followed: number; skipped: number }>(`profiles/${applying.id}/apply`, { entity_ids: ids }),
              (v) => `${v.followed} sensors follow ${applying.name}${v.skipped ? ` (${v.skipped} skipped: a kind it doesn't fit)` : ""}`,
            )
          }
        />
      )}
      <Toasts toasts={toasts} />
    </Shell>
  );
}
