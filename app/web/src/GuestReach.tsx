/** Guest login: what each login can reach (checked against Home Assistant on request), and
 * a QR code for any page of Home Assistant. */

import { useState } from "react";
import { get, post, type HAChoices, type Reach } from "./api";
import { AreaHead, Empty } from "./page";
import { copyText, Dialog, Field, type Toast } from "./ui";
import css from "./guest.module.css";
import ui from "./ui.module.css";

const OTHER = "__other__";

export function ReachArea({ toast }: { toast: (text: string, tone?: Toast["tone"]) => void }) {
  const [reach, setReach] = useState<Reach[]>();
  const [busy, setBusy] = useState(false);
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
            <ReachCard key={r.name} reach={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReachCard({ reach: r }: { reach: Reach }) {
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
              {f.text}
            </li>
          ))}
        </ul>
      )}
      <button className={`${ui.button} ${ui.small}`} onClick={() => setOpen(!open)}>
        {open ? "Hide dashboards" : `Dashboards it can open (${r.dashboards.length})`}
      </button>
      {open && (
        <ul className={css.boards}>
          {r.dashboards.map((d) => (
            <li key={d.path}>
              <strong>{d.title}</strong> <code>{d.path}</code>
              {d.landing.length > 0 && <span className={css.badge}>Lands here</span>}
              <span className={css.rowMeta}>
                {" "}
                · {d.sidebar ? "in the sidebar" : "not in the sidebar"} · kiosk-mode hides{" "}
                {d.hides_header && d.hides_sidebar
                  ? "header and sidebar"
                  : d.hides_header
                    ? "the header only"
                    : d.hides_sidebar
                      ? "the sidebar only"
                      : "nothing"}
              </span>
              {d.views.length > 0 && (
                <div className={css.rowMeta}>
                  Views: {d.views.map((v) => `${v.title}${v.tab ? "" : " (no tab)"}`).join(", ")}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** A QR code for any Home Assistant page, at the QR host and HA's own port. No sign-in:
 * whoever scans it still needs to be signed in on that phone. */
export function PageQrDialog({
  ha,
  onClose,
  toast,
}: {
  ha?: HAChoices;
  onClose: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
}) {
  const [path, setPath] = useState("");
  const [custom, setCustom] = useState(!ha?.dashboards.length);
  const groups = new Map<string, { path: string; view: string }[]>();
  for (const d of ha?.dashboards ?? []) {
    groups.set(d.dashboard, [...(groups.get(d.dashboard) ?? []), { path: d.path, view: d.view }]);
  }
  const q = new URLSearchParams({ path }).toString();
  const save = async () => {
    try {
      const out = await post<{ file: string; media_source: string; url: string }>(`page-qr/media?${q}`);
      await copyText(out.media_source).catch(() => undefined);
      toast(`Saved to ${out.file} (for ${out.url}). Its media-source address is copied, ready for a picture card.`);
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  };
  const file = (path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home").toLowerCase();
  return (
    <Dialog
      title="QR code for a page"
      onClose={onClose}
      footer={
        <button className={ui.primary} onClick={onClose}>
          Done
        </button>
      }
    >
      <Field
        label="Page"
        help="Any dashboard or view. The code opens it in Home Assistant at the QR host; it signs nobody in, so the phone must already be signed in (a guest's, after their own QR code)."
      >
        {groups.size > 0 && (
          <select
            value={custom ? OTHER : path}
            onChange={(e) => {
              setCustom(e.target.value === OTHER);
              if (e.target.value !== OTHER) setPath(e.target.value);
            }}
          >
            <option value="" disabled>
              Choose a dashboard view…
            </option>
            {[...groups].map(([board, views]) => (
              <optgroup key={board} label={board}>
                {views.map((v) => (
                  <option key={v.path} value={v.path}>
                    {v.view || board} — {v.path}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={OTHER}>Another path…</option>
          </select>
        )}
        {custom && <input placeholder="/lovelace/hall" value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} />}
      </Field>
      {path && (
        <>
          <div className={css.qrFrame}>
            <img className={css.qr} src={`api/guest/page-qr/code.svg?${q}`} alt={`QR code for ${path}`} />
          </div>
          <div className={css.actions}>
            <a className={`${ui.button} ${ui.small}`} href={`api/guest/page-qr/code.png?${q}`} download={`${file}-qr.png`}>
              Download PNG
            </a>
            <a className={`${ui.button} ${ui.small}`} href={`api/guest/page-qr/code.svg?${q}`} download={`${file}-qr.svg`}>
              SVG
            </a>
            <button className={`${ui.button} ${ui.small}`} onClick={save}>
              Save to HA media
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
