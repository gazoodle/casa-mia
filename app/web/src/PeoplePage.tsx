/** People: everyone known to the home. A phone number with a Call and a Text tick, number
 * plates with a Gates tick, and a link to an HA person (any one of the three will do).
 * Every change applies at once. */

import { useCallback, useEffect, useState } from "react";
import { api, type Person, type PeopleView, type HAPerson, type NumberCheck, type PlateCheck } from "./api";
import { PersonDialog, pretty } from "./PersonDialog";
import { PeopleIcon } from "./icons";
import { AreaHead, Empty, Shell, Loading } from "./page";
import { Toasts, type Toast } from "./ui";
import css from "./people.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";
import { confirmBox } from "./confirm";

const { get, post, put, del } = api("people");

const HEAD = {
  icon: <PeopleIcon />,
  title: "People",
  module: "people",
  blurb: "Who is known to the home.",
};

export function PeoplePage() {
  const [view, setView] = useState<PeopleView>();
  const [persons, setPersons] = useState<{ persons: HAPerson[]; error: string | null }>();
  const [editing, setEditing] = useState<Person | "new" | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);

  useEffect(() => {
    get<PeopleView>("").then(setView, (err) => toast((err as Error).message, "bad"));
    get<{ persons: HAPerson[]; error: string | null }>("persons").then(setPersons, () =>
      setPersons({ persons: [], error: "Could not ask Home Assistant." }),
    );
  }, [toast]);

  const change = async (action: () => Promise<PeopleView>, done: string) => {
    try {
      setView(await action());
      toast(done);
      return true;
    } catch (err) {
      toast((err as Error).message, "bad");
      return false;
    }
  };

  if (!view) return <Shell {...HEAD}><Loading toasts={toasts} /></Shell>;
  const personName = (id: string | null) => persons?.persons.find((p) => p.id === id)?.name;

  return (
    <Shell {...HEAD}>
      {view.error && <div className={guest.warning}>people.json could not be read ({view.error}), so nobody is authorised. Fix or remove the file.</div>}
      <section className={guest.area}>
        <AreaHead
          title="People"
          blurb="A phone number, number plates, a Home Assistant person, or any of them together. Tick whether they may call and whether they may text the house (Phone and SMS); anyone else is an intrusion. Tick Gates for the cars that may open the gates (the check_plate action in Home Assistant)."
          action={
            <button className={ui.primary} onClick={() => setEditing("new")}>
              + Add person
            </button>
          }
        />
        {view.people.length === 0 ? (
          <Empty>Nobody yet, so every call and text is an intrusion. Add the people known to the home.</Empty>
        ) : (
          <div className={css.table}>
            <div className={`${css.row} ${css.head}`}>
              <span>Name</span>
              <span>Number</span>
              <span>Plates</span>
              <span className={css.tick}>Call</span>
              <span className={css.tick}>Text</span>
              <span className={css.tick}>Gates</span>
              <span />
            </div>
            {view.people.map((p) => (
              // The row opens its editor; its ticks and Remove do only their own thing.
              <div
                key={p.id}
                className={`${css.row} ${css.open}`}
                role="button"
                tabIndex={0}
                aria-label={`Edit ${p.name}`}
                onClick={(e) => !(e.target as Element).closest("label, button") && setEditing(p)}
                onKeyDown={(e) => e.target === e.currentTarget && e.key === "Enter" && setEditing(p)}
              >
                <span className={css.name}>
                  {p.name}
                  {p.person && <span className={guest.badge}>{personName(p.person) ?? "HA person"}</span>}
                </span>
                <span className={css.number}>{p.phone ? pretty(p.phone) : "—"}</span>
                <span className={css.plates}>
                  {p.plates.length ? p.plates.map((plate) => <span key={plate} className="cm-chip cm-mono">{plate}</span>) : "—"}
                </span>
                {(["call", "text", "gate"] as const).map((kind) => (
                  <label key={kind} className={css.tick} title={`${p.name} ${MAY[kind]}`}>
                    <input
                      type="checkbox"
                      checked={p[kind]}
                      aria-label={`${p.name} ${MAY[kind]}`}
                      onChange={(e) =>
                        change(
                          () => put<PeopleView>(p.id, { ...p, [kind]: e.target.checked }),
                          `${p.name} ${e.target.checked ? "may" : "may not"} ${MAY[kind].slice(4)}`,
                        )
                      }
                    />
                  </label>
                ))}
                <span className={css.actions}>
                  <button
                    className={`${ui.danger} ${ui.small}`}
                    onClick={async () =>
                      (await confirmBox(`Remove ${p.name}? Their calls and texts become intrusions, and their cars no longer open the gates.`, { action: "Remove", danger: true })) &&
                      change(() => del<PeopleView>(p.id), `${p.name} removed`)
                    }
                  >
                    Remove
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={guest.area}>
        <AreaHead title="Check a number" blurb="How a call or text from this number would be treated." />
        <Checker />
      </section>

      <section className={guest.area}>
        <AreaHead title="Check a number plate" blurb="What check_plate would answer for this plate, as a camera read it." />
        <PlateChecker />
      </section>

      {editing && (
        <PersonDialog
          person={editing === "new" ? undefined : editing}
          persons={persons}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const ok = await change(
              () => (editing === "new" ? post<PeopleView>("", body) : put<PeopleView>(editing.id, body)),
              `${body.name} saved`,
            );
            if (ok) setEditing(null);
          }}
        />
      )}
      <Toasts toasts={toasts} />
    </Shell>
  );
}

function Checker() {
  const [number, setNumber] = useState("");
  const [result, setResult] = useState<Record<"call" | "text", NumberCheck>>();
  const check = async () => {
    setResult(await get<Record<"call" | "text", NumberCheck>>(`check?number=${encodeURIComponent(number)}`));
  };
  return (
    <div className={css.checker}>
      <form
        className={css.checkRow}
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <input type="tel" placeholder="07700 900123" value={number} onChange={(e) => setNumber(e.target.value)} />
        <button className={ui.button} disabled={!number.trim()}>
          Check
        </button>
      </form>
      {result && (
        <ul className={css.results}>
          {(["call", "text"] as const).map((kind) => {
            const r = result[kind];
            return (
              <li key={kind} className={r.allowed ? css.allowed : css.refused}>
                <strong>{kind === "call" ? "Call" : "Text"}:</strong>{" "}
                {r.allowed ? `authorised, ${r.who}` : `intrusion (${r.reason}${r.who ? `, ${r.who}` : ""})`}
                {r.number && <span className={css.normal}> as {r.number}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PlateChecker() {
  const [plate, setPlate] = useState("");
  const [r, setResult] = useState<PlateCheck>();
  return (
    <div className={css.checker}>
      <form
        className={css.checkRow}
        onSubmit={async (e) => {
          e.preventDefault();
          setResult(await get<PlateCheck>(`plate?plate=${encodeURIComponent(plate)}`));
        }}
      >
        <input placeholder="ZZ00 ZZZ" value={plate} onChange={(e) => setPlate(e.target.value)} />
        <button className={ui.button} disabled={!plate.trim()}>
          Check
        </button>
      </form>
      {r && (
        <ul className={css.results}>
          <li className={r.allowed ? css.allowed : css.refused}>
            <strong>Gates:</strong> {r.allowed ? `open, ${r.who}` : `stay shut (${r.reason}${r.who ? `, ${r.who}` : ""})`}
          </li>
        </ul>
      )}
    </div>
  );
}

/** Each tick's words, after the person's name. */
const MAY = { call: "may call", text: "may text", gate: "may open the gates" } as const;
