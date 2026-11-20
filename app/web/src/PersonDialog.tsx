/** The People page's editor for one person, and how it shows a phone number. */

import { useState } from "react";
import type { HAPerson, Person } from "./api";
import { Dialog, Field } from "./ui";
import css from "./people.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";
import { Select } from "./controls";

/** The pronouns offered as they are; anyone else's five forms are typed in. */
const PRONOUNS = ["she/her/her/hers/herself", "he/him/his/his/himself", "they/them/their/theirs/themselves"];
const TYPED = "typed";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The year, month and day of a stored date of birth (1984, 1984-03, 1984-03-07 or --03-07). */
function bornParts(born: string | null) {
  const m = /^(\d{4}|-)(?:-(\d\d)(?:-(\d\d))?)?$/.exec(born ?? "");
  return { year: m && m[1] !== "-" ? m[1] : "", month: m?.[2] ? String(+m[2]) : "", day: m?.[3] ? String(+m[3]) : "" };
}

/** Back to the stored form: null when nothing is given, or what is missing when the parts
 * given don't make a date (a day without its month, or a month alone). */
function bornOf(year: string, month: string, day: string): { born: string | null } | { missing: string } {
  const y = year.trim();
  const d = day.trim();
  if (d && !month) return { missing: "A day needs its month." };
  if (month && !d && !y) return { missing: "A month needs its year or its day." };
  const parts = [month, d].filter(Boolean).map((n) => `-${n.padStart(2, "0")}`).join("");
  return { born: y ? y + parts : parts ? `-${parts}` : null };
}

export function PersonDialog({
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
  const [phone, setPhone] = useState(person?.phone ? pretty(person.phone) : "");
  const [call, setCall] = useState(person?.call ?? true);
  const [text, setText] = useState(person?.text ?? true);
  const [plates, setPlates] = useState((person?.plates ?? []).join(", "));
  const [gate, setGate] = useState(person?.gate ?? false);
  const cars = plates.split(",").map((s) => s.trim()).filter(Boolean);
  const [link, setLink] = useState(person?.person ?? "");
  const [gender, setGender] = useState<string>(person?.gender ?? "");
  const [pronouns, setPronouns] = useState(person?.pronouns ?? "");
  const [typed, setTyped] = useState(!!person?.pronouns && !PRONOUNS.includes(person.pronouns));
  const [birth, setBirth] = useState(bornParts(person?.born ?? null));
  const birthDate = bornOf(birth.year, birth.month, birth.day);
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
            disabled={!name.trim() || (!phone.trim() && !cars.length && !link) || "missing" in birthDate}
            onClick={() =>
              onSave({
                name: name.trim(),
                phone: phone.trim() || null,
                call,
                text,
                plates: cars,
                gate,
                person: link || null,
                gender: (gender || null) as Person["gender"],
                pronouns: pronouns.trim() || null,
                born: "born" in birthDate ? birthDate.born : null,
              })
            }
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
        help="As you'd dial it: 07700 900123, or +44 7700 900123. Calls and texts both match it, whichever form the FONA reports. It can be left empty for someone known by their car or their Home Assistant person."
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
        label="Number plates"
        help="Separate several with commas: ZZ00 ZZZ, ZZ51 ZZZ. Spaces and dashes don't matter when a camera's reading is checked, and O and 0, I and 1, and S and 5 count as the same."
      >
        <input value={plates} onChange={(e) => setPlates(e.target.value)} />
      </Field>
      <label className={guest.check}>
        <input type="checkbox" checked={gate} onChange={(e) => setGate(e.target.checked)} />
        <span>
          May open the gates
          <span className={guest.checkHelp}>check_plate answers allowed for their plates; your automation opens the gates.</span>
        </span>
      </label>
      <Field
        label="Home Assistant person"
        help={persons?.error ? `Home Assistant's people could not be read (${persons.error}).` : "Links this entry to one of Home Assistant's people, which is how the people action finds them. Someone with no phone or car needs this."}
      >
        <Select value={link} onChange={(picked) => setLink(picked)}>
          <option value="">None</option>
          {persons?.persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          {link && !persons?.persons.some((p) => p.id === link) && <option value={link}>Unknown ({link})</option>}
        </Select>
      </Field>
      <Field label="Gender" help="Optional. Lets a message choose words such as son or daughter.">
        <Select value={gender} onChange={setGender}>
          <option value="">Not set</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="Pronouns" help="Optional. When it isn't set, messages use they/them rather than guessing from the gender.">
        <Select
          value={typed ? TYPED : pronouns}
          onChange={(picked) => {
            setTyped(picked === TYPED);
            if (picked !== TYPED) setPronouns(picked);
          }}
        >
          <option value="">Not set</option>
          {PRONOUNS.map((set) => (
            <option key={set} value={set}>
              {set.split("/").slice(0, 2).join("/")}
            </option>
          ))}
          <option value={TYPED}>Others, typed in</option>
        </Select>
      </Field>
      {typed && (
        <Field label="Their five forms" help="As in she/her/her/hers/herself: she went, I saw her, her coat, it's hers, she did it herself.">
          <input value={pronouns} placeholder="ze/hir/hir/hirs/hirself" onChange={(e) => setPronouns(e.target.value)} />
        </Field>
      )}
      <Field
        label="Date of birth"
        help="Optional. Give what you know: the year alone gives their age, the day and month alone their birthday."
      >
        <span className={css.born}>
          <input type="number" min={1} max={31} placeholder="Day" aria-label="Day of birth" value={birth.day} onChange={(e) => setBirth({ ...birth, day: e.target.value })} />
          <Select value={birth.month} onChange={(month) => setBirth({ ...birth, month })} aria-label="Month of birth">
            <option value="">Month</option>
            {MONTHS.map((month, i) => (
              <option key={month} value={String(i + 1)}>
                {month}
              </option>
            ))}
          </Select>
          <input type="number" min={1900} placeholder="Year" aria-label="Year of birth" value={birth.year} onChange={(e) => setBirth({ ...birth, year: e.target.value })} />
        </span>
      </Field>
      {"missing" in birthDate && <div className={ui.calloutWarn}>{birthDate.missing} It can't be saved until then.</div>}
    </Dialog>
  );
}

export /** +447700900123 -> 07700 900123; other countries stay as stored. */
function pretty(phone: string): string {
  if (!phone.startsWith("+44") || phone.length !== 13) return phone;
  const national = "0" + phone.slice(3);
  return `${national.slice(0, 5)} ${national.slice(5)}`;
}
