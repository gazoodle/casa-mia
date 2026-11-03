/** The frame every module page shares: back link, icon and title, then areas. The
 * styles live in guest.module.css, where they started. */

import { useEffect, useState, type ReactNode } from "react";
import type { HeaderView } from "./api";
import { Maturity } from "./maturity";
import { photoApi } from "./photo";
import type { Toast } from "./ui";
import css from "./guest.module.css";

export function Shell({
  icon,
  title,
  blurb,
  module,
  state,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  blurb: string;
  /** Its key in MODULES, for its maturity under the blurb. */
  module?: string;
  state?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [house, setHouse] = useState<string>();
  useEffect(() => {
    photoApi.get<HeaderView>("").then((v) => setHouse(v.house), () => undefined);
  }, []);
  return (
    <div className={css.page}>
      <nav className={css.top}>
        <a href="#/" className={css.back}>
          ← {house ?? "Home"}
        </a>
      </nav>
      <header className={css.head}>
        <span className={css.headIcon}>{icon}</span>
        <div>
          <h1>{title}</h1>
          <p>{blurb}</p>
          <Maturity module={module} full />
        </div>
        {action && <div className={css.settings}>{action}</div>}
        {state && state !== "running" && <span className={css.offChip}>{state}</span>}
      </header>
      {children}
    </div>
  );
}

export function AreaHead({ title, blurb, action }: { title: string; blurb: ReactNode; action?: ReactNode }) {
  return (
    <div className={css.areaHead}>
      <div>
        <h2>{title}</h2>
        <p>{blurb}</p>
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className={css.empty}>{children}</p>;
}

/** A page waiting for its first answer. A page says a refused load in a bad toast, but
 * draws no toasts until it has loaded, so "Loading…" stood for ever with the error unseen
 * (2026.10.12-b7): the latest bad one is shown here instead, and kept. */
export function Loading({ toasts }: { toasts: Toast[] }) {
  const [failed, setFailed] = useState<string>();
  const bad = toasts.filter((t) => t.tone === "bad").at(-1)?.text;
  useEffect(() => {
    if (bad) setFailed(bad);
  }, [bad]);

  return failed ? (
    <div className={css.warning}>This page couldn't load: {failed}</div>
  ) : (
    <p className={css.notice}>Loading…</p>
  );
}
