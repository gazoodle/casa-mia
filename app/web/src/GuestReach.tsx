/** Guest login: what each login can reach (checked against Home Assistant on request),
 * with a button for each problem the app can put right. */

import { useState } from "react";
import { get, post, type Reach, type ReachFix } from "./api";
import { AreaHead, Empty } from "./page";
import { type Toast } from "./ui";
import css from "./guest.module.css";
import ui from "./ui.module.css";

const CAVEAT =
  "This changes Home Assistant itself, through its websocket. If that dashboard or user is open for editing elsewhere (a dashboard editor in another tab), unsaved changes there may be lost, or may undo this.";

export function ReachArea({ toast }: { toast: (text: string, tone?: Toast["tone"]) => void }) {
  const [reach, setReach] = useState<Reach[]>();
  const [busy, setBusy] = useState(false);
  const fix = async (what: ReachFix, question: string) => {
    if (!confirm(`${question}\n\n${CAVEAT}`)) return;
    setBusy(true);
    try {
      const out = await post<{ done: string; logins: Reach[] }>("reach/fix", what);
      setReach(out.logins);
      toast(`Done: ${out.done}.`);
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  };
  const check = async () => {
    setBusy(true);
    try {
      setReach((await get<{ logins: Reach[] }>("reach")).logins);
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={css.area}>
      <AreaHead
        title="What each login can reach"
        blurb="Checked against Home Assistant: the dashboards a login's user can open, and whether kiosk-mode hides the header and sidebar for it. Hiding is not locking: see How safe is it? in the guide."
        action={
          <button className={ui.button} disabled={busy} onClick={check}>
            {busy ? "Checking…" : reach ? "Check again" : "Check"}
          </button>
        }
      />
      {!reach ? (
        <Empty>Press Check to see what each login opens, and what is probably open by mistake.</Empty>
      ) : reach.length === 0 ? (
        <Empty>No logins yet.</Empty>
      ) : (
        <div className={css.reach}>
          {reach.map((r) => (
            <ReachCard key={r.name} reach={r} busy={busy} fix={fix} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReachCard({
  reach: r,
  busy,
  fix,
}: {
  reach: Reach;
  busy: boolean;
  fix: (what: ReachFix, question: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const problems = r.flags.filter((f) => f.level !== "note").length;
  return (
    <article className={css.login}>
      <div className={css.reachHead}>
        <h3>
          {r.name}
          <span className={problems ? css.reachBad : css.reachGood}>
            {problems ? `${problems} to look at` : "Locked down as far as hiding goes"}
          </span>
        </h3>
        <span className={css.rowMeta}>
          {r.user.name ?? "?"} · {r.endpoints.length ? r.endpoints.map((e) => e.label).join(", ") : "no endpoints"}
        </span>
      </div>
      {r.flags.length > 0 && (
        <ul className={css.flags}>
          {r.flags.map((f) => (
            <li key={f.text} className={css[`flag_${f.level}`]}>
              <span>{f.text}</span>
              {f.fix && (
                <button
                  className={`${ui.button} ${ui.small}`}
                  disabled={busy}
                  onClick={() => fix(f.fix!, `${f.fix!.label} for ${r.name}?`)}
                >
                  {f.fix.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {r.dashboards.length > 0 && (
        <button className={`${ui.button} ${ui.small} ${css.reachToggle}`} onClick={() => setOpen(!open)}>
          {open ? "Hide dashboards" : `Dashboards it can open (${r.dashboards.length})`}
        </button>
      )}
      {open && (
        <ul className={css.boards}>
          {r.dashboards.map((d) => (
            <li key={d.path}>
              <div className={css.boardHead}>
                <strong>{d.title}</strong>
                {d.landing.length > 0 && <span className={css.badge}>Lands here</span>}
                {d.sidebar && <span className={css.badgeEng}>In the sidebar</span>}
              </div>
              <code className={css.boardPath}>{d.path}</code>
              <span className={css.rowMeta}>kiosk-mode hides {hides(d.hides_header, d.hides_sidebar)}</span>
              {d.id && d.landing.length === 0 && (
                <button
                  className={`${ui.button} ${ui.small} ${css.reachToggle}`}
                  disabled={busy}
                  onClick={() =>
                    fix(
                      { action: "admin_only", dashboard_id: d.id! },
                      `Make ${d.title} admin-only? Every user who isn't an administrator loses it, your household's too, not only guests.`,
                    )
                  }
                >
                  Admin only
                </button>
              )}
              {d.views.length > 0 && (
                <div className={css.views}>
                  {d.views.map((v) => (
                    <span key={v.path} className={v.tab ? css.view : `${css.view} ${css.viewNoTab}`}>
                      {v.title}
                      {!v.tab && " · no tab"}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function hides(header: boolean, sidebar: boolean): string {
  if (header && sidebar) return "the header and sidebar";
  if (header) return "the header only";
  if (sidebar) return "the sidebar only";
  return "nothing";
}
