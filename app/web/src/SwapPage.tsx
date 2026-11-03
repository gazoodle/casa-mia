/** Swap: the screenshot swap's rules (developer mode). Each rule shows a stand-in in place
 * of a real string on every Home Assistant page and Casa Mia's own. While a rule is being
 * written, every browser previews its matches; Save keeps it. The app hands this page the
 * real strings, never swapped (server.py RAW). */

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { confirmBox } from "./confirm";
import { SwapIcon } from "./icons";
import { AreaHead, Empty, Loading, Shell } from "./page";
import { Dialog, Field, Segmented, Switch, Toasts, type Toast } from "./ui";
import css from "./swap.module.css";
import guest from "./guest.module.css";
import ui from "./ui.module.css";

const { get, put } = api("swap");

type Mode = "exact" | "case" | "regex";
export type SwapRule = { id: string; match: string; replace: string; mode: Mode; enabled: boolean };
type SwapView = { on: boolean; rules: SwapRule[] };

const MODES: [Mode, string][] = [
  ["exact", "Exact"],
  ["case", "Any case"],
  ["regex", "Regex"],
];
const MODE_HELP: Record<Mode, string> = {
  exact: "Only this text, as typed, and not inside a longer word: Ann leaves Annex alone.",
  case: "This text in any case. The replacement takes the case of what it replaces: oak, Oak and OAK become barn, Barn and BARN.",
  regex: "A JavaScript regular expression. The replacement can use $1, $<name> and $&. A regex rule changes only what is shown; text typed back in is never turned round.",
};
const DEBOUNCE_MS = 150;
// The integration drops a draft 60 s after it last heard of it (swap_rules: DRAFT_LEASE),
// so an open editor says it again well before.
const RENEW_MS = 20_000;

const HEAD = {
  icon: <SwapIcon />,
  title: "Swap",
  blurb: "Stand-ins for real names, numbers and places, on every Home Assistant page: for screenshots and demos.",
};

export function SwapPage() {
  const [view, setView] = useState<SwapView>();
  const [editing, setEditing] = useState<SwapRule | "new" | null>(null);
  const [filter, setFilter] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);

  useEffect(() => {
    get<SwapView>("").then(setView, (err) => toast((err as Error).message, "bad"));
  }, [toast]);

  const save = async (change: Partial<SwapView>, done: string) => {
    try {
      setView(await put<SwapView>("", change));
      toast(done);
      return true;
    } catch (err) {
      toast((err as Error).message, "bad");
      return false;
    }
  };

  if (!view) return <Shell {...HEAD}><Loading toasts={toasts} /></Shell>;
  const rules = view.rules;
  const replaced = (rule: SwapRule) => rules.map((r) => (r.id === rule.id ? rule : r));
  const wanted = filter.trim().toLowerCase();
  const shown = wanted ? rules.filter((r) => `${r.match}\n${r.replace}`.toLowerCase().includes(wanted)) : rules;

  return (
    <Shell {...HEAD}>
      <section className={guest.area}>
        <AreaHead
          title="Swap"
          blurb={
            view.on
              ? "On: every browser on Home Assistant shows the stand-ins, guests' too, and Casa Mia's own pages and pictures."
              : "Off: everything shows as it really is. A rule being written is still previewed."
          }
          action={<Switch label="Swap" on={view.on} onChange={(on) => save({ on }, `The swap is ${on ? "on" : "off"}.`)} />}
        />
      </section>

      <section className={guest.area}>
        <AreaHead
          title="Rules"
          blurb="Where two rules match at the same place, the longer match wins, then the rule higher in the list. Each piece of text is swapped once: a stand-in is never swapped again."
          action={
            <button className={ui.primary} onClick={() => setEditing("new")}>
              + Add rule
            </button>
          }
        />
        {rules.length > 0 && (
          <label className={`${ui.search} ${css.filter}`}>
            <input type="search" placeholder="Filter the rules" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter the rules" />
            {filter && (
              <button type="button" className={ui.searchClear} onClick={() => setFilter("")} aria-label="Clear the filter">
                ✕
              </button>
            )}
          </label>
        )}
        {rules.length === 0 ? (
          <Empty>No rules yet. Add one for each name, number or place that shouldn't be seen.</Empty>
        ) : shown.length === 0 ? (
          <Empty>No rule matches “{filter}”.</Empty>
        ) : (
          <div className={css.table}>
            <div className={`${css.row} ${css.head}`}>
              <span className={css.tick}>On</span>
              <span>Match</span>
              <span>Replacement</span>
              <span>Mode</span>
              <span />
            </div>
            {shown.map((r) => (
              <div key={r.id} className={`${css.row} ${r.enabled ? "" : css.off}`}>
                <label className={css.tick}>
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    aria-label={`Rule for ${r.match} on`}
                    onChange={(e) => save({ rules: replaced({ ...r, enabled: e.target.checked }) }, e.target.checked ? "Rule on." : "Rule off.")}
                  />
                </label>
                <code className={css.text}>{r.match}</code>
                <code className={css.text}>{r.replace || <span className={css.nothing}>(nothing)</span>}</code>
                <span className={`cm-pill cm-fixed ${css.mode} ${r.mode === "regex" ? css.regex : ""}`}>{MODES.find(([m]) => m === r.mode)?.[1]}</span>
                <span className={css.actions}>
                  <button className={`${ui.button} ${ui.small}`} onClick={() => setEditing(r)}>
                    Edit
                  </button>
                  <button
                    className={`${ui.danger} ${ui.small}`}
                    onClick={async () =>
                      (await confirmBox(`Delete the rule for “${r.match}”? Its text shows as it really is again.`, { action: "Delete", danger: true })) &&
                      save({ rules: rules.filter((x) => x.id !== r.id) }, "Rule deleted.")
                    }
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <RuleEditor
          rule={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={async (rule) => {
            const next = editing === "new" ? [...rules, rule] : replaced(rule);
            if (await save({ rules: next }, editing === "new" ? "Rule added." : "Rule saved.")) setEditing(null);
          }}
        />
      )}
      <Toasts toasts={toasts} />
    </Shell>
  );
}

/** Why a rule can't be used, or null. The app checks it compiles in Python on save; the
 * browser's own engine is checked here. */
function problem(match: string, mode: Mode): string | null {
  if (!match) return null; // nothing to say until something is typed
  if (mode !== "regex") return null;
  try {
    new RegExp(match, "gu");
    return null;
  } catch (err) {
    return `Not a regular expression the browser can use: ${(err as Error).message}`;
  }
}

/** Says the rule being written to every browser, as it changes (each pause of
 * DEBOUNCE_MS) and again every RENEW_MS while open; says no more on close. */
function useDraft(match: string, replace: string, mode: Mode, usable: boolean): string | undefined {
  const [failed, setFailed] = useState<string>();
  const latest = useRef<SwapRule | null>(null);
  latest.current = match && usable ? { id: "draft", match, replace, mode, enabled: true } : null;
  // One at a time: two in flight could arrive the wrong way round.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const send = useCallback(() => {
    const draft = latest.current;
    queue.current = queue.current.then(() =>
      put("draft", { draft }).then(
        () => setFailed(undefined),
        (err) => setFailed((err as Error).message),
      ),
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(send, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [match, replace, mode, usable, send]);

  useEffect(() => {
    const timer = setInterval(send, RENEW_MS);
    return () => {
      clearInterval(timer);
      latest.current = null;
      send(); // closed: the preview goes from every screen
    };
  }, [send]);

  return failed;
}

function RuleEditor({ rule, onClose, onSave }: { rule?: SwapRule; onClose: () => void; onSave: (rule: SwapRule) => void }) {
  const [match, setMatch] = useState(rule?.match ?? "");
  const [replace, setReplace] = useState(rule?.replace ?? "");
  const [mode, setMode] = useState<Mode>(rule?.mode ?? "exact");
  const bad = problem(match, mode);
  const failed = useDraft(match, replace, mode, !bad);

  return (
    <Dialog
      title={rule ? "Edit the rule" : "Add a rule"}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button
            className={ui.primary}
            disabled={!match || !!bad}
            onClick={() => onSave({ id: rule?.id ?? "", match, replace, mode, enabled: rule?.enabled ?? true })}
          >
            Save
          </button>
        </>
      }
    >
      <p className={css.live}>Every browser on Home Assistant outlines what this rule matches as you type, showing the replacement in place.</p>
      <Field label="Match" help={MODE_HELP[mode]}>
        <input className={css.mono} value={match} spellCheck={false} onChange={(e) => setMatch(e.target.value)} />
      </Field>
      {bad && (
        <span className={ui.fieldBad} role="alert">
          {bad}
        </span>
      )}
      <Field label="Mode">
        <Segmented value={mode} options={MODES} onChange={setMode} />
      </Field>
      <Field label="Replacement" help="Left empty, the matched text is taken out.">
        <input className={css.mono} value={replace} spellCheck={false} onChange={(e) => setReplace(e.target.value)} />
      </Field>
      {failed && (
        <span className={ui.fieldBad} role="alert">
          {failed}
        </span>
      )}
    </Dialog>
  );
}
