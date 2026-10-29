/** "How Sensor Watch works", at the top of its page: what the parts are for and how they
 * fit, where to start, and how a level reaches you. Said where it's used, not only in the
 * guide: a newcomer and an owner back after a fortnight are in the same position. */

import { useState, type ReactNode } from "react";
import ui from "../ui.module.css";
import css from "./sensor-watch.module.css";

/** Open when nothing is watched yet; otherwise as this viewer last left it (folded). */
export function About({ empty }: { empty: boolean }) {
  const [open, setOpen] = useState(() => {
    try {
      const kept = localStorage.getItem("sw-about");
      return kept ? kept === "open" : empty;
    } catch {
      return empty;
    }
  });
  const toggle = (now: boolean) => {
    setOpen(now);
    try {
      localStorage.setItem("sw-about", now ? "open" : "shut");
    } catch {
      // a private window: just not remembered
    }
  };

  return (
    <details className={`${ui.details} ${css.about}`} open={open} onToggle={(e) => toggle(e.currentTarget.open)}>
      <summary>How Sensor Watch works</summary>
      <dl>
        <Part name="Levels">
          <strong>Nominal</strong> is all well; a <strong>Task</strong> is something for you to do (top up the salt); a <strong>Warning</strong> wants a
          look soon; an <strong>Error</strong> is something broken; <strong>Critical</strong> is act now.
        </Part>
        <Part name="A watch">One sensor, and the level its value puts it at.</Part>
        <Part name="A profile">Levels set once and followed by many watches (every plug's mains voltage). Edit it, and every follower changes.</Part>
        <Part name="A group">A search that keeps itself current: everything it matches is watched with one profile, and new matches join on their own.</Part>
        <Part name="How you hear">
          The <em>Notify on Sensor Watch</em> blueprint makes one automation that tells your phone (in Home Assistant's{" "}
          <a href="/config/blueprint/dashboard" target="_top">
            Blueprints
          </a>
          ); the Sensor Watch card shows them on a dashboard; and each sensor has a Status entity of its own.
        </Part>
      </dl>
      <Start />
    </details>
  );
}

function Part({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <dt>{name}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** Where to start: the guide's half-hour recipe, in three steps. */
export function Start({ actions }: { actions?: ReactNode }) {
  return (
    <div className={css.start}>
      <strong>Where to start</strong>
      <ol>
        <li>A group for each kind of thing you have many of (lights, plugs, leak sensors, batteries).</li>
        <li>
          <strong>Scan my house</strong> for the one-offs: it suggests each sensor's levels from its history.
        </li>
        <li>Make the notify automation from the blueprint, so the levels reach you.</li>
      </ol>
      {actions}
    </div>
  );
}
