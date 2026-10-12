/** Our own confirm and ask dialogs, in place of the browser's confirm() and prompt()
 * (docs/design/chrome.html: confirm, ask). Called as promises from anywhere:
 * `if (!(await confirmBox("Delete X?", { action: "Delete", danger: true }))) return;`
 * `<Asks />`, mounted once at the app's root, draws them on our Dialog. */

import { useEffect, useState, type ReactNode } from "react";
import { Dialog, Field } from "./ui";
import css from "./ui.module.css";

type Confirm = { kind: "confirm"; title: string; body?: ReactNode; action: string; danger?: boolean; resolve: (ok: boolean) => void };
type Ask = { kind: "ask"; title: string; label: string; value: string; placeholder?: string; action: string; resolve: (text: string | null) => void };
type Question = Confirm | Ask;

let show: ((q: Question) => void) | null = null;
const answered = new WeakSet<Question>();

/** The question's first sentence (to its "?") as the title, the rest as the words under. */
function split(text: string): [string, string] {
  const at = text.indexOf("?");
  if (at < 0 || at === text.length - 1) return [text, ""];
  return [text.slice(0, at + 1), text.slice(at + 1).trim()];
}

/** Ask yes or no: resolves true when the action is pressed, false on Cancel, ✕ or Esc. */
export function confirmBox(question: string, { action = "OK", danger = false }: { action?: string; danger?: boolean } = {}): Promise<boolean> {
  const [title, body] = split(question);
  return new Promise((resolve) => {
    if (!show) return resolve(false); // nothing mounted to ask with (never, once App is)
    show({ kind: "confirm", title, body: body || undefined, action, danger, resolve });
  });
}

/** Ask for a line of text: resolves it trimmed, or null when cancelled or left empty. */
export function askBox(
  title: string,
  { label = "Name", value = "", placeholder, action = "Save" }: { label?: string; value?: string; placeholder?: string; action?: string } = {},
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!show) return resolve(null);
    show({ kind: "ask", title, label, value, placeholder, action, resolve });
  });
}

export function Asks() {
  const [queue, setQueue] = useState<Question[]>([]);
  const [text, setText] = useState("");
  useEffect(() => {
    show = (q) => setQueue((all) => [...all, q]);
    return () => {
      show = null;
    };
  }, []);
  const q = queue[0];
  useEffect(() => setText(q?.kind === "ask" ? q.value : ""), [q]);
  if (!q) return null;

  const done = (answer: boolean) => {
    if (answered.has(q)) return; // the dialog's own close event, after a button
    answered.add(q);
    if (q.kind === "confirm") q.resolve(answer);
    else q.resolve(answer && text.trim() ? text.trim() : null);
    setQueue((all) => all.slice(1));
  };
  return (
    <Dialog
      key={queue.length + q.title}
      title={q.title}
      onClose={() => done(false)}
      footer={
        <>
          <button type="button" className={css.button} onClick={() => done(false)}>
            Cancel
          </button>
          {/* The main button: primary for Enter (Dialog finds it by css.primary), red for a danger. */}
          <button type="button" className={`${css.primary} ${q.kind === "confirm" && q.danger ? css.dangerMain : ""}`} onClick={() => done(true)}>
            {q.action}
          </button>
        </>
      }
    >
      {q.kind === "confirm" ? (
        q.body ? <p className={css.dialogText}>{q.body}</p> : null
      ) : (
        <Field label={q.label}>
          <input value={text} placeholder={q.placeholder} onChange={(e) => setText(e.target.value)} />
        </Field>
      )}
    </Dialog>
  );
}
