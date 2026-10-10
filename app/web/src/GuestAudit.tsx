/** Guest login's sign-in log: every scan, sign-in, refusal and sign-out, newest first,
 * kept by the app in its own store (it survives restarts), pruned by age and count. */

import { useCallback, useEffect, useState } from "react";
import { get, put, type GuestConfig } from "./api";
import { ago } from "./format";
import { AreaHead, Empty } from "./page";
import { Segmented, type Toast } from "./ui";
import css from "./guest.module.css";
import ui from "./ui.module.css";

const PAGE = 100;

type Record = {
  time: string;
  event: string;
  ok: boolean | null;
  reason?: string;
  endpoint?: string | null;
  label?: string | null;
  login?: string | null;
  via?: string;
  ip?: string;
  agent?: string;
  device?: string;
  langs?: string;
  person?: string;
  tracker?: string;
  tracker_name?: string;
  mac?: string;
  passcode?: boolean;
  two_factor?: boolean;
  client?: { [key: string]: string | number | boolean };
};
type Page = { total: number; records: Record[]; keep_days: number; keep_max: number };
type Kind = "" | "ok" | "refused";

export function AuditArea({
  config,
  toast,
}: {
  config: GuestConfig;
  toast: (text: string, tone?: Toast["tone"]) => void;
}) {
  const [kind, setKind] = useState<Kind>("");
  const [endpoint, setEndpoint] = useState("");
  const [page, setPage] = useState<Page>();
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<number>();
  const [keep, setKeep] = useState<{ days: string; max: string }>();

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ kind, endpoint, limit: String(shown) });
      setPage(await get<Page>(`audit?${q}`));
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  }, [kind, endpoint, shown, toast]);
  useEffect(() => {
    void load();
  }, [load]);

  const saveKeep = async () => {
    if (!keep) return;
    try {
      await put<GuestConfig>("settings", { audit: { days: Number(keep.days), max: Number(keep.max) } });
      toast("The log's limits are saved");
      setKeep(undefined);
      void load();
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  };

  return (
    <section className={css.area}>
      <AreaHead
        title="Sign-in log"
        blurb={
          page
            ? `Every scan, sign-in, refusal and sign-out, kept ${page.keep_days} days, at most ${page.keep_max} records. Kept by the app, so it survives restarts.`
            : "Every scan, sign-in, refusal and sign-out."
        }
        action={
          <div className={css.actions}>
            <button className={`${ui.button} ${ui.small}`} onClick={() => void load()}>
              Refresh
            </button>
            <a className={`${ui.button} ${ui.small}`} href="api/guest/audit/audit.csv" download="guest-sign-ins.csv">
              Download CSV
            </a>
            <button
              className={`${ui.button} ${ui.small}`}
              onClick={() => setKeep(keep ? undefined : { days: String(page?.keep_days ?? 90), max: String(page?.keep_max ?? 2000) })}
            >
              Limits
            </button>
          </div>
        }
      />
      {keep && (
        <div className={css.auditKeep}>
          <label>
            Keep for
            <input type="number" min={1} max={3650} value={keep.days} onChange={(e) => setKeep({ ...keep, days: e.target.value })} />
            days
          </label>
          <label>
            and at most
            <input type="number" min={100} max={100000} value={keep.max} onChange={(e) => setKeep({ ...keep, max: e.target.value })} />
            records
          </label>
          <button className={`${ui.primary} ${ui.small}`} onClick={saveKeep}>
            Save
          </button>
          <span className={css.checkHelp}>Older records go at once, and from then on as they age.</span>
        </div>
      )}
      <div className={css.auditFilters}>
        <Segmented
          value={kind}
          options={[
            ["", "Everything"],
            ["ok", "Signed in"],
            ["refused", "Refused"],
          ]}
          onChange={(k) => {
            setKind(k);
            setShown(PAGE);
          }}
        />
        <select className={css.auditPick} value={endpoint} onChange={(e) => setEndpoint(e.target.value)}>
          <option value="">Every endpoint</option>
          {config.endpoints.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      {!page ? (
        <Empty>Loading…</Empty>
      ) : page.records.length === 0 ? (
        <Empty>Nothing yet. Each scan of a QR code, and what came of it, shows here.</Empty>
      ) : (
        <>
          <ul className={css.audit}>
            {page.records.map((r, i) => (
              <li key={`${r.time}-${i}`}>
                <div
                  role="button"
                  tabIndex={0}
                  className={css.auditRow}
                  onClick={() => setOpen(open === i ? undefined : i)}
                  onKeyDown={(k) => k.key === "Enter" && setOpen(open === i ? undefined : i)}
                >
                  <span className={r.ok ? css.auditOk : r.ok === false ? css.auditBad : css.auditNote}>{outcome(r)}</span>
                  <span className={css.auditWhat}>
                    <strong>{r.label ?? r.login ?? "No endpoint"}</strong>
                    {r.reason && <span className={css.auditReason}> · {r.reason}</span>}
                    <span className={css.auditMeta}>
                      {[when(r.time), r.ip, r.person ?? r.tracker_name, r.device].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </div>
                {open === i && <Details record={r} />}
              </li>
            ))}
          </ul>
          {page.total > page.records.length && (
            <button className={`${ui.button} ${ui.small} ${css.reachToggle}`} onClick={() => setShown(shown + PAGE)}>
              Show more ({page.total - page.records.length} older)
            </button>
          )}
        </>
      )}
    </section>
  );
}

function outcome(r: Record): string {
  if (r.event === "sign-out") return "Signed out";
  if (r.event === "scan") return "Scanned";
  if (r.event === "2FA asked") return "2FA asked";
  if (r.ok) return "Signed in";
  return "Refused";
}

function when(time: string): string {
  const t = new Date(time);
  return `${t.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} (${ago(time)})`;
}

/** Everything the record holds, on a tap (pages are used on an iPad: nothing on hover). */
function Details({ record: r }: { record: Record }) {
  const rows: [string, string | undefined][] = [
    ["Time", new Date(r.time).toLocaleString()],
    ["Event", r.event],
    ["Endpoint", r.endpoint ? `${r.label} (${r.endpoint})` : undefined],
    ["Login", r.login ?? undefined],
    ["Reached by", r.via],
    ["Passcode", r.passcode ? "asked and given" : undefined],
    ["Two-factor", r.two_factor ? "code given" : undefined],
    ["Address", r.ip],
    ["Person", r.person],
    ["Device tracker", r.tracker ? `${r.tracker_name} (${r.tracker})` : undefined],
    ["MAC", r.mac],
    ["Device", r.device],
    ["Browser", r.agent],
    ["Languages", r.langs],
    ...Object.entries(r.client ?? {}).map(([k, v]) => [CLIENT[k] ?? k, String(v)] as [string, string]),
  ];
  return (
    <dl className={css.auditDetails}>
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

const CLIENT: { [key: string]: string } = {
  tz: "Time zone",
  langs: "Browser languages",
  screen: "Screen",
  dpr: "Pixel ratio",
  platform: "Platform",
  touch: "Touch screen",
  dark: "Dark mode",
};
