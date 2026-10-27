/** Sensor Watch: the watched sensors with their level now (from the integration, in
 * watched.tsx), Home Assistant itself, and the ways to add more. */

import { useCallback, useEffect, useRef, useState } from "react";
import { MODULES } from "../modules";
import { AreaHead, Empty, Shell } from "../page";
import { Toasts, type Toast } from "../ui";
import { levelsOf, NO_FILTERS, swApi, type Filters, type LevelsView, type Profile, type WatchRecord, type WatchView } from "./common";
import { ApplyDialog, PickDialog, ScanDialog } from "./dialogs";
import { RecordDialog } from "./editor";
import { GroupsSection } from "./groups";
import { ProfileDialog, ProfilesSection } from "./profiles";
import { SystemSection } from "./system";
import { WatchedList } from "./watched";
import css from "./sensor-watch.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";
import { confirmBox } from "../confirm";

// The Home tile's own words and icon (modules.tsx), so the two say the same.
const { icon, title, blurb } = MODULES.sensor_watch;
const HEAD = { icon, title, blurb, module: "sensor_watch" };

/** `watch`: an entity whose watch to open (new or not), asked at `at` (the eye in its
 * Home Assistant dialog; open.ts). */
export function SensorWatchPage({ state, watch, at }: { state?: string; watch?: string; at?: string }) {
  const [view, setView] = useState<WatchView>();
  const [live, setLive] = useState<LevelsView>();
  const [missing, setMissing] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ entityId: string; record?: WatchRecord }>();
  const [picking, setPicking] = useState(false);
  const [scanning, setScanning] = useState(false);
  // A profile being edited (null: a new one), or followed by more sensors.
  const [profileEditing, setProfileEditing] = useState<Profile | null>();
  const [profileCopy, setProfileCopy] = useState<Profile>();
  const [applying, setApplying] = useState<Profile>();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const watchedRef = useRef<HTMLElement>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);

  useEffect(() => {
    swApi.get<WatchView>("").then(setView, (err) => toast((err as Error).message, "bad"));
    swApi.get<{ missing: string[] }>("check").then((c) => setMissing(c.missing), () => undefined);
  }, [toast]);

  // An entity's watch asked for: open, once the records are here (so a watched one opens
  // as it is), and the ask taken off the address, so a reload doesn't open it again.
  const loaded = !!view;
  useEffect(() => {
    if (!watch || !loaded) return;
    setEditing({ entityId: watch, record: view?.records.find((r) => r.entity_id === watch) });
    history.replaceState(null, "", `${location.pathname}#/sensor-watch`); // not against <base>
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per ask, not per view
  }, [watch, at, loaded]);

  // The live levels, pushed: each ask is held by the app until something changes in
  // Home Assistant (or 25 s pass), then asked again at once.
  useEffect(() => {
    let open = true;
    (async () => {
      let rev = -1;
      while (open) {
        try {
          const asked = Date.now();
          const got = await swApi.get<LevelsView>(`levels?after=${rev}`);
          rev = got.rev;
          if (open) setLive(got);
          // Values move many times a second (a mains voltage, a CPU): ask at most once a
          // second, or the page does nothing but fetch and redraw (Safari hung on it).
          await new Promise((r) => setTimeout(r, Math.max(0, 1000 - (Date.now() - asked))));
        } catch {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    })();
    return () => {
      open = false;
    };
  }, []);

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

  if (!view) return <Shell {...HEAD} state={state}><p className={guest.notice}>Loading…</p></Shell>;

  // Watched (not disabled) but no level from the integration yet: unavailable and
  // waiting out its hold-off, or unavailable and set to Ignore. A diagnostic.
  const levelless = live ? view.records.filter((r) => !r.disabled && !live.levels[r.entity_id]).length : 0;
  return (
    <Shell
      {...HEAD}
      state={state}
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
      {view.error && <div className={guest.warning}>sensor-watch.json could not be read ({view.error}), so nothing is watched. Fix or remove the file.</div>}
      {live?.error && <div className={guest.warning}>{live.error}</div>}
      <section className={guest.area} ref={watchedRef}>
        <AreaHead
          title="Watched sensors"
          blurb={view.records.length ? `${view.records.length} watched; the chips filter them and give the counts.` : "Nothing watched yet."}
          action={
            <span className={css.actions}>
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
          <Empty>Watch an entity to give it bands, or scan the house for suggestions from history.</Empty>
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
            onStop={async (r) =>
              (await confirmBox(`Stop watching ${r.label}?`, { action: "Stop watching", danger: true })) && change(() => swApi.del<WatchView>(encodeURIComponent(r.entity_id)), `${r.label}: no longer watched`)
            }
          />
        )}
      </section>

      <GroupsSection
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
