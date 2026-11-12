/** The guided set-up, offered while nothing is watched and from "Set up…": a group for
 * each kind of thing the house has many of, Scan my house for the one-offs, the notify
 * automation, and a list of what was made. Everything it makes is ordinary (profiles,
 * groups, an automation from the blueprint) and is edited afterwards where those are. */

import { useEffect, useState } from "react";
import { Select } from "../controls";
import { Dialog } from "../ui";
import ui from "../ui.module.css";
import { LEVELS, LEVEL_NAMES, summary, swApi, type Level, type SetupClass, type WatchRecord, type WatchView } from "./common";
import { ScanDialog } from "./dialogs";
import { ha, hass } from "./ha";
import css from "./sensor-watch.module.css";

/** The Notify blueprint, as Home Assistant names it (the integration's blueprint.py AT). */
const BLUEPRINT = "casa_mia/sensor_watch_notify.yaml";
const STEPS = ["What's in your house", "The one-offs", "Telling you", "Done"];

type Made = {
  groups: { id: string; name: string; joined: number }[];
  profiles: string[]; // taken from the library, by name
  scanned: number;
  automation?: { id: string; alias: string };
};

/** Why Home Assistant refused (its REST API answers {body: {message}}; the rest throw Errors). */
const why = (err: unknown) => (err as { body?: { message?: string } })?.body?.message ?? (err as Error)?.message ?? String(err);

export function SetupDialog({
  view,
  onView,
  onClose,
  onGroup,
  onAccepted,
}: {
  view: WatchView;
  /** The records after a change made here, for the page behind. */
  onView: (v: WatchView) => void;
  onClose: () => void;
  /** Leave the set-up for this group's editor. */
  onGroup: (id: string) => void;
  /** Watch what a scan suggested, as the page's own scan does. */
  onAccepted: (records: WatchRecord[]) => Promise<boolean>;
}) {
  const [step, setStep] = useState(0);
  const [made, setMade] = useState<Made>({ groups: [], profiles: [], scanned: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [scanning, setScanning] = useState(false);

  // Step 1: the classes on offer, asked again after some are made (those drop out).
  const [offer, setOffer] = useState<{ classes: SetupClass[]; country: string | null }>();
  const [round, setRound] = useState(0);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  useEffect(() => {
    swApi.get<{ classes: SetupClass[]; country: string | null }>("setup").then(
      (got) => {
        setOffer(got);
        setTicked(new Set(round ? [] : got.classes.map((c) => c.name))); // all, to start
      },
      (err) => setError((err as Error).message),
    );
  }, [round]);

  const makeGroups = async () => {
    setBusy(true);
    setError(undefined);
    let profiles = view.profiles;
    try {
      for (const c of offer?.classes.filter((k) => ticked.has(k.name)) ?? []) {
        // Mains: the library's profile, taken once (one of that name here is used as it is).
        let profile = c.profile;
        if (c.library) {
          const name = c.library.name;
          profile = profiles.find((p) => p.name.toLowerCase() === name.toLowerCase())?.id;
          if (!profile) {
            const took = await swApi.post<WatchView & { created: string }>("profiles", c.library);
            [profile, profiles] = [took.created, took.profiles];
            setMade((m) => ({ ...m, profiles: [...m.profiles, name] }));
          }
        }
        const v = await swApi.post<WatchView & { created: string; joined: number }>("groups", { name: c.name, filters: c.filters, profile, left: c.left });
        onView(v);
        setMade((m) => ({ ...m, groups: [...m.groups, { id: v.created, name: c.name, joined: v.joined }] }));
      }
      setStep(1);
    } catch (err) {
      // Those made before it stay made, and are listed at the end.
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setRound((r) => r + 1);
    }
  };

  // Step 3: the automations there are from the blueprint, and one more made here.
  const [have, setHave] = useState<{ count: number } | { error: string }>();
  const [notify, setNotify] = useState("");
  const [level, setLevel] = useState<Level>("warning");
  useEffect(() => {
    if (step !== 2) return;
    ha()
      .sendMessagePromise<{ automation?: string[] }>({ type: "search/related", item_type: "automation_blueprint", item_id: BLUEPRINT })
      .then(
        (found) => setHave({ count: found.automation?.length ?? 0 }),
        (err) => setHave({ error: why(err) }),
      );
  }, [step]); // asked at each visit, not after making one here: that one is said beside the button
  // A phone with Home Assistant's app first: that is what most want told.
  const phone = (n: string) => (n.startsWith("mobile_app_") ? 0 : 1);
  const actions = Object.keys(step === 2 ? (hass().services.notify ?? {}) : {})
    .filter((n) => n !== "send_message") // takes a notify entity, not a message alone
    .sort((a, b) => phone(a) - phone(b) || a.localeCompare(b));

  const alias = `Sensor Watch: tell ${notify}`;
  const makeAutomation = async () => {
    setBusy(true);
    setError(undefined);
    const id = String(Date.now()); // as Home Assistant's own editor names a new one
    try {
      await hass().callApi("POST", `config/automation/config/${id}`, {
        alias,
        description: "Made by Sensor Watch's set-up, from its Notify blueprint.",
        use_blueprint: { path: BLUEPRINT, input: { level, notify } },
      });
      setMade((m) => ({ ...m, automation: { id, alias } }));
    } catch (err) {
      setError(`Home Assistant didn't make the automation: ${why(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const flip = (name: string) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const go = (to: number) => {
    setError(undefined);
    setStep(to);
  };

  if (scanning)
    return (
      <ScanDialog
        profiles={view.profiles}
        onClose={() => setScanning(false)}
        onAccepted={async (records) => {
          const ok = await onAccepted(records);
          if (ok) setMade((m) => ({ ...m, scanned: m.scanned + records.length }));
          return ok;
        }}
      />
    );

  const nothing = !made.groups.length && !made.profiles.length && !made.scanned && !made.automation;
  return (
    <Dialog
      wide
      tall
      title={`Set up, step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
      onClose={onClose}
      footer={
        <>
          {step < STEPS.length - 1 && (
            <button className={`${ui.button} ${css.footLeft}`} onClick={onClose}>
              Close
            </button>
          )}
          {step > 0 && (
            <button className={ui.button} disabled={busy} onClick={() => go(step - 1)}>
              Back
            </button>
          )}
          {step === 0 && ticked.size > 0 ? (
            <button className={ui.primary} disabled={busy} onClick={makeGroups}>
              {busy ? "Making…" : `Make the ticked groups (${ticked.size})`}
            </button>
          ) : step < STEPS.length - 1 ? (
            <button className={ui.primary} disabled={busy} onClick={() => go(step + 1)}>
              Next
            </button>
          ) : (
            <button className={ui.primary} onClick={onClose}>
              Done
            </button>
          )}
        </>
      }
    >
      {error && <p className={css.problem}>{error}</p>}

      {step === 0 && (
        <>
          <p className={css.note}>
            A group watches everything of one kind, and whatever of that kind you add later joins it by itself. These are the kinds found in your house that
            aren't watched yet. Untick any you don't want; a group can be changed or deleted afterwards under Groups.
          </p>
          {offer && !offer.country && (
            <p className={css.note}>
              Home Assistant has no country set (Settings → System → General), so no group is offered for mains voltage or frequency: their levels differ by
              country.
            </p>
          )}
          {offer?.classes.length === 0 && <p className={css.note}>Nothing here has a group to offer now. The next step looks at sensors one by one.</p>}
          <ul className={`${css.scanList} ${css.whole}`}>
            {offer?.classes.map((c) => (
              <li key={c.name}>
                <label className={css.scanRow}>
                  <input type="checkbox" checked={ticked.has(c.name)} disabled={busy} onChange={() => flip(c.name)} />
                  <span>
                    <strong>{c.name}</strong>
                    <span className={css.note}>
                      {c.count} not watched yet · {c.library ? `levels from the library's profile ${c.library.name}` : "built-in levels, by what each is"} ·{" "}
                      {summary(c.record)}
                      {c.left.length > 0 && ` · ${c.left.length} left out (not reading like the mains now)`}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {step === 1 && (
        <>
          <p className={css.note}>
            Things you have one of (a boiler's pressure, the freezer's temperature) need levels of their own. Scan my house reads each sensor's history and
            suggests them. Nothing is watched until you accept it, and you can scan again at any time from the page.
          </p>
          <div className={css.selectBar}>
            <button className={ui.button} onClick={() => setScanning(true)}>
              Scan my house…
            </button>
            {made.scanned > 0 && <span className={css.note}>{made.scanned} sensors watched from scans so far.</span>}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className={css.note}>
            A level reaches you through an automation made from the Notify on Sensor Watch blueprint. Choose where to send it and from which level; the
            automation is an ordinary one, and its other options (one group only, saying when it's back) are in its editor.
          </p>
          {have && "error" in have && <p className={css.problem}>Couldn't see whether you have one already: {have.error}</p>}
          {have && "count" in have && have.count > 0 && (
            <p className={css.note}>
              You have {have.count} from this blueprint already (
              <a href={`/config/automation/dashboard?blueprint=${encodeURIComponent(BLUEPRINT)}`} target="_top">
                see {have.count === 1 ? "it" : "them"}
              </a>
              ). Another one for the same phone would tell you twice.
            </p>
          )}
          {actions.length === 0 ? (
            <p className={css.note}>
              Home Assistant has no notify actions yet. Install its app on a phone and sign in, then make the automation from{" "}
              <a href="/config/blueprint/dashboard" target="_top">
                Blueprints
              </a>
              , or come back here.
            </p>
          ) : (
            <div className={css.selectBar}>
              <Select value={notify} onChange={setNotify} placeholder="Choose where to send it…" aria-label="Notify action" className={css.profilePick}>
                {actions.map((n) => (
                  <option key={n} value={`notify.${n}`}>
                    notify.{n}
                  </option>
                ))}
              </Select>
              <Select value={level} onChange={(l) => setLevel(l as Level)} aria-label="At this level or worse" className={css.profilePick}>
                {LEVELS.slice(1).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_NAMES[l]} or worse
                  </option>
                ))}
              </Select>
              {/* Not the same one twice: it would tell you twice. */}
              <button className={ui.button} disabled={busy || !notify || made.automation?.alias === alias} onClick={makeAutomation}>
                Make the automation
              </button>
            </div>
          )}
          {made.automation && <p className={css.note}>Made: {made.automation.alias}. It is listed in the last step.</p>}
        </>
      )}

      {step === 3 && (
        <>
          {nothing && <p className={css.note}>Nothing was made this time.</p>}
          <ul className={`${css.scanList} ${css.whole}`}>
            {made.groups.map((g) => (
              <li key={g.id} className={css.selectBar}>
                <span className={css.note}>
                  The group <strong>{g.name}</strong>: {g.joined} watched.
                </span>
                <button className={`${ui.button} ${ui.small}`} onClick={() => onGroup(g.id)}>
                  Open it
                </button>
              </li>
            ))}
            {made.profiles.map((p) => (
              <li key={p} className={css.note}>
                The profile <strong>{p}</strong>, from the library. It is under Profiles on the page.
              </li>
            ))}
            {made.scanned > 0 && <li className={css.note}>{made.scanned} sensors watched from scans, each with its own levels, in the watched list.</li>}
            {made.automation && (
              <li className={css.note}>
                The automation{" "}
                <a href={`/config/automation/edit/${made.automation.id}`} target="_top">
                  {made.automation.alias}
                </a>
                .
              </li>
            )}
          </ul>
          <p className={css.note}>
            <strong>On a dashboard.</strong> Sensor Watch doesn't change your dashboards. To add its cards, edit a dashboard, choose Add card and search for
            Sensor Watch: there is a list of what needs attention (<code>custom:casa-mia-sensor-watch</code>) and a gauge for one sensor (
            <code>custom:casa-mia-sensor-watch-gauge</code>).
          </p>
        </>
      )}
    </Dialog>
  );
}
