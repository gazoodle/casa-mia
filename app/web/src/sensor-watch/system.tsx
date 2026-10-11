/** Home Assistant itself: what Sensor Watch counts beside the sensors (the Recorder and
 * History, integrations failing to set up), with switches for it and an Ignore for
 * each failing integration. */

import { AreaHead, Empty } from "../page";
import { Switch } from "../ui";
import { LEVEL_NAMES, swApi, type LevelsView, type SystemSettings, type WatchView } from "./common";
import css from "./sensor-watch.module.css";
import guest from "../guest.module.css";
import ui from "../ui.module.css";

const OWN = /^(homeassistant|integration)\./;

export function SystemSection({
  system,
  live,
  change,
}: {
  system: SystemSettings;
  live?: LevelsView;
  change: (action: () => Promise<WatchView>, done: string) => Promise<boolean>;
}) {
  // Ignored or switched off here: gone at once, before the integration has caught up.
  const shown = (key: string) =>
    key.startsWith("integration.") ? system.integrations && !(key.slice("integration.".length) in system.ignore) : system.core;
  const rows = Object.values(live?.levels ?? {})
    .filter((l) => OWN.test(l.entity_id) && shown(l.entity_id))
    .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
  const ignored = Object.entries(system.ignore);
  const set = (key: "core" | "integrations", on: boolean, what: string) =>
    change(() => swApi.put<WatchView>("system", { [key]: on }), `${what} ${on ? "watched" : "no longer watched"}`);

  return (
    <section className={guest.area}>
      <AreaHead
        title="Home Assistant itself"
        blurb="Counted beside your sensors, so Sensor Watch never says all is well while Home Assistant is broken."
      />
      <div className={css.switches}>
        <label className={css.switchRow}>
          <Switch on={system.core} label="Watch the Recorder and History" onChange={(on) => set("core", on, "The Recorder and History")} />
          <span>
            <strong>The Recorder and History</strong>
            <span className={css.note}>Critical when not running: no history or statistics anywhere in Home Assistant.</span>
          </span>
        </label>
        <label className={css.switchRow}>
          <Switch on={system.integrations} label="Watch integrations that fail to set up" onChange={(on) => set("integrations", on, "Failing integrations")} />
          <span>
            <strong>Integrations that fail to set up</strong>
            <span className={css.note}>An error after five minutes failing (an error, retrying, not loaded). Ignored discoveries and disabled ones never count.</span>
          </span>
        </label>
      </div>
      {rows.length === 0 ? (
        <Empty>Nothing to show yet: the integration checks once Home Assistant has started, then each minute.</Empty>
      ) : (
        <div className={css.table}>
          {rows.map((r) => {
            const entryId = r.entity_id.startsWith("integration.") ? r.entity_id.slice("integration.".length) : null;
            return (
              <div key={r.entity_id} className={css.row}>
                <span className={`${css.level} ${css[`lv_${r.level}`]}`}>{LEVEL_NAMES[r.level]}</span>
                <span className={css.what}>
                  <strong>{r.name}</strong>
                  <span className={css.note}>
                    {r.message ?? r.value} · since {new Date(r.since).toLocaleString()}
                  </span>
                </span>
                <span className={css.rowActions}>
                  {entryId && (
                    <button
                      className={`${ui.button} ${ui.small}`}
                      onClick={() => change(() => swApi.post<WatchView>("system/ignore", { entry_id: entryId, name: r.name }), `${r.name}: ignored`)}
                    >
                      Ignore
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {ignored.length > 0 && (
        <>
          <p className={css.note}>Integrations you've told Sensor Watch to ignore:</p>
          <div className={css.table}>
            {ignored.map(([id, name]) => (
              <div key={id} className={css.row}>
                <span className={`${css.level} ${css.lv_none}`}>Ignored</span>
                <span className={css.what}>
                  <strong>{name}</strong>
                  <code>{id}</code>
                </span>
                <span className={css.rowActions}>
                  <button className={`${ui.button} ${ui.small}`} onClick={() => change(() => swApi.del<WatchView>(`system/ignore/${id}`), `${name}: watched again`)}>
                    Watch again
                  </button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
