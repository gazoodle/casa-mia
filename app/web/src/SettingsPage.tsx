/** Settings: those with no other home (the cog by the house photo's pencil). Each change
 * saves at once; the cards pick it up through the integration. */

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { SettingsIcon } from "./icons";
import { AreaHead, Shell } from "./page";
import { Switch, Toasts, type Toast } from "./ui";
import css from "./settings.module.css";
import guest from "./guest.module.css";

const { get, put } = api("settings");

type TabletView = { identify_panels: boolean; identify_outline: string; show_size: boolean };
type Settings = { tablet_view: TabletView };

const HEAD = {
  icon: <SettingsIcon />,
  title: "Settings",
  blurb: "Settings that have no other home.",
};

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>();
  const [outline, setOutline] = useState(""); // as typed, saved on leaving the field
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    setToasts((t) => [...t, { text, tone }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 5000);
  }, []);

  const loaded = (s: Settings) => {
    setSettings(s);
    setOutline(s.tablet_view.identify_outline);
  };

  useEffect(() => {
    get<Settings>("").then(loaded, (err) => toast((err as Error).message, "bad"));
  }, [toast]);

  const save = async (change: Partial<TabletView>) => {
    try {
      loaded(await put<Settings>("", { tablet_view: change }));
      toast("Saved. Tablets pick it up within a minute, at their next view change or reload.");
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  };

  if (!settings) return <Shell {...HEAD}><p className={guest.notice}>Loading…</p></Shell>;
  const tv = settings.tablet_view;
  const saveOutline = () => {
    const value = outline.trim() || "1px solid red";
    if (value !== tv.identify_outline) save({ identify_outline: value });
    else setOutline(value);
  };

  return (
    <Shell {...HEAD}>
      <section className={guest.area}>
        <AreaHead
          title="Tablet view"
          blurb="For setting up a Tablet view (custom:casa-mia-tablet-view) on the tablets themselves. Every Tablet view shows them."
        />
        <div className={css.rows}>
          <div className={css.row}>
            <div className={css.text}>
              <strong>Identify sections panels</strong>
              <span>An outline round each panel, so you can see where each one ends.</span>
            </div>
            <Switch label="Identify sections panels" on={tv.identify_panels} onChange={(on) => save({ identify_panels: on })} />
          </div>
          <label className={css.sub}>
            <span>Outline (CSS)</span>
            <input
              className={css.css}
              value={outline}
              maxLength={100}
              spellCheck={false}
              onChange={(e) => setOutline(e.target.value)}
              onBlur={saveOutline}
              onKeyDown={(e) => e.key === "Enter" && saveOutline()}
            />
            <span className={css.swatch} style={{ outline: outline || "1px solid red" }} aria-hidden />
          </label>
          <div className={css.row}>
            <div className={css.text}>
              <strong>Show the view size</strong>
              <span>
                A see-through yellow label, top right: the view's size, the room below its top, and how far the page
                still scrolls (it should be 0 x 0).
              </span>
            </div>
            <Switch label="Show the view size" on={tv.show_size} onChange={(on) => save({ show_size: on })} />
          </div>
        </div>
      </section>
      <Toasts toasts={toasts} />
    </Shell>
  );
}
