/** People: everyone known to the home. Today: one phone number each and a
 * Call and a Text tick, optionally linked to an HA person. Every change applies at once. */

import { useCallback, useEffect, useState } from "react";
import { api, type Person, type PeopleView, type HAPerson, type NumberCheck } from "./api";
import { PeopleIcon } from "./icons";
import { AreaHead, Empty, Shell } from "./page";
import { Dialog, Field, Toasts, type Toast } from "./ui";
import css from "./people.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";

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

  if (!view) return <Shell {...HEAD}><p className={guest.notice}>Loading…</p></Shell>;
  const personName = (id: string | null) => persons?.persons.find((p) => p.id === id)?.name;

  return (
    <Shell {...HEAD}>
      {view.error && <div className={guest.warning}>people.json could not be read ({view.error}), so nobody is authorised. Fix or remove the file.</div>}
      <section className={guest.area}>
        <AreaHead
          title="People"
          blurb="One phone number each. Tick whether they may call and whether they may text the house (Phone and SMS); anyone else is an intrusion."
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
              <span className={css.tick}>Call</span>
              <span className={css.tick}>Text</span>
              <span />
            </div>
            {view.people.map((p) => (
              <div key={p.id} className={css.row}>
                <span className={css.name}>
                  {p.name}
                  {p.person && <span className={guest.badge}>{personName(p.person) ?? "HA person"}</span>}
                </span>
                <span className={css.number}>{pretty(p.phone)}</span>
                {(["call", "text"] as const).map((kind) => (
                  <label key={kind} className={css.tick} title={`${p.name} may ${kind}`}>
                    <input
                      type="checkbox"
                      checked={p[kind]}
                      aria-label={`${p.name} may ${kind}`}
                      onChange={(e) =>
                        change(
                          () => put<PeopleView>(p.id, { ...p, [kind]: e.target.checked }),
                          `${p.name} ${e.target.checked ? "may" : "may not"} ${kind}`,
                        )
                      }
                    />
                  </label>
                ))}
                <span className={css.actions}>
                  <button className={`${ui.button} ${ui.small}`} onClick={() => setEditing(p)}>
                    Edit
                  </button>
                  <button
                    className={`${ui.danger} ${ui.small}`}
                    onClick={() =>
                      confirm(`Remove ${p.name}? Their calls and texts become intrusions.`) &&
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

function PersonDialog({
  person,
  persons,
  onClose,
  onSave,
}: {
  person?: Person;
  persons?: { persons: HAPerson[]; error: string | null };
  onClose: () => void;
  onSave: (body: Omit<Person, "id">) => void;
}) {
  const [name, setName] = useState(person?.name ?? "");
  const [phone, setPhone] = useState(person ? pretty(person.phone) : "");
  const [call, setCall] = useState(person?.call ?? true);
  const [text, setText] = useState(person?.text ?? true);
  const [link, setLink] = useState(person?.person ?? "");
  return (
    <Dialog
      title={person ? `Edit ${person.name}` : "Add a person"}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button
            className={ui.primary}
            disabled={!name.trim() || !phone.trim()}
            onClick={() => onSave({ name: name.trim(), phone, call, text, person: link || null })}
          >
            Save
          </button>
        </>
      }
    >
      <Field label="Name" help="Shown in events and in the PONG reply, e.g. Alex.">
        <input value={name} autoFocus onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field
        label="Phone number"
        help="As you'd dial it: 07700 900123, or +44 7700 900123. Calls and texts both match it, whichever form the FONA reports."
      >
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <label className={guest.check}>
        <input type="checkbox" checked={call} onChange={(e) => setCall(e.target.checked)} />
        <span>
          May call
          <span className={guest.checkHelp}>A call is hung up, then passed to Home Assistant as authorised.</span>
        </span>
      </label>
      <label className={guest.check}>
        <input type="checkbox" checked={text} onChange={(e) => setText(e.target.checked)} />
        <span>
          May text
          <span className={guest.checkHelp}>Texts are passed to Home Assistant as authorised, PING included.</span>
        </span>
      </label>
      <Field
        label="Home Assistant person"
        help={persons?.error ? `Optional. Home Assistant's people could not be read (${persons.error}).` : "Optional. Links this entry to one of Home Assistant's people."}
      >
        <select value={link} onChange={(e) => setLink(e.target.value)}>
          <option value="">None</option>
          {persons?.persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          {link && !persons?.persons.some((p) => p.id === link) && <option value={link}>Unknown ({link})</option>}
        </select>
      </Field>
    </Dialog>
  );
}

/** +447700900123 -> 07700 900123; other countries stay as stored. */
function pretty(phone: string): string {
  if (!phone.startsWith("+44") || phone.length !== 13) return phone;
  const national = "0" + phone.slice(3);
  return `${national.slice(0, 5)} ${national.slice(5)}`;
}
