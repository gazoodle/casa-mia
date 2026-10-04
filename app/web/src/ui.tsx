/** Small shared UI pieces: dialog, field with help, switch, toasts, copy. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import css from "./ui.module.css";

export function Dialog({
  title,
  children,
  onClose,
  footer,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    // Start in the first field (not the ✕), or on the main button if there is none.
    (focusables(dialog).find((el) => el.matches("input, select, textarea")) ?? primaryButton(dialog))?.focus();
  }, []);

  /** Keys: Tab / Shift+Tab cycle through this dialog's controls (buttons and ticks too,
   * which Safari skips by default), Enter presses the main button, Esc cancels. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    const dialog = ref.current;
    if (!dialog) return;
    e.stopPropagation(); // a dialog opened inside another handles its own keys
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      const items = focusables(dialog);
      if (!items.length) return;
      e.preventDefault();
      const at = items.indexOf(document.activeElement as HTMLElement);
      items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    } else if (e.key === "Enter") {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return; // their own Enter
      e.preventDefault(); // not the form's default: that is the first button, Cancel
      const main = primaryButton(dialog);
      if (main && !main.disabled) main.click();
    }
  };

  return (
    <dialog
      ref={ref}
      className={`${css.dialog} ${wide ? css.wide : ""}`}
      onClose={onClose}
      onCancel={onClose}
      onKeyDown={onKeyDown}
    >
      <form method="dialog" className={css.dialogForm} onSubmit={(e) => e.preventDefault()}>
        <header className={css.dialogHead}>
          <h2>{title}</h2>
          <button type="button" className={css.iconButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className={css.dialogBody}>{children}</div>
        <footer className={css.dialogFoot}>{footer}</footer>
      </form>
    </dialog>
  );
}

const FOCUSABLE =
  "input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";

/** This dialog's own visible controls, in page order (not those of a dialog inside it). */
function focusables(dialog: HTMLDialogElement): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.closest("dialog") === dialog && el.getClientRects().length > 0,
  );
}

/** The dialog's main action: the last primary button in its own footer (Save, Add...).
 * css.primary composes css.button, so it holds two class names; select by its own. */
function primaryButton(dialog: HTMLDialogElement): HTMLButtonElement | undefined {
  const primary = css.primary.split(" ")[0];
  return [...dialog.querySelectorAll<HTMLButtonElement>(`:scope > form > footer .${primary}`)].at(-1);
}

export function Field({ label, help, children }: { label: string; help?: ReactNode; children: ReactNode }) {
  return (
    <label className={css.field}>
      <span className={css.fieldLabel}>{label}</span>
      {children}
      {help && <span className={css.help}>{help}</span>}
    </label>
  );
}

export function Switch({
  on,
  onChange,
  label,
  busy,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      className={`${css.switch} ${on ? css.switchOn : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
    >
      <span className={css.knob} />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className={css.segmented} role="radiogroup">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          className={value === v ? css.segOn : ""}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export type Toast = { text: string; tone: "good" | "bad" };

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className={css.toasts} aria-live="polite">
      {toasts.map((t, i) => (
        <div key={i} className={`${css.toast} ${t.tone === "bad" ? css.toastBad : css.toastGood}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** Copies text to the clipboard. The Clipboard API is missing on plain http and may be
 * refused inside HA's ingress frame (the companion app), so fall back to the old
 * selection copy; rejects when both fail so the caller can say so. */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // fall through to the selection copy
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy refused");
}

/** A Copy button that says whether it worked. */
export function CopyButton({ text, className, disabled }: { text: string; className?: string; disabled?: boolean }) {
  const [said, setSaid] = useState("");
  const say = (word: string) => {
    setSaid(word);
    setTimeout(() => setSaid(""), 2500);
  };
  return (
    <button className={className} disabled={disabled} onClick={() => copyText(text).then(() => say("Copied"), () => say("Couldn't copy: select it by hand"))}>
      {said || "Copy"}
    </button>
  );
}
