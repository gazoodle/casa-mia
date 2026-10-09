/** Settings: those with no other home (the cog by the house photo's pencil). Each change
 * saves at once; the cards pick it up through the integration. */

import { useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { Developer } from "./health";
import { SettingsIcon } from "./icons";
import { AreaHead, Shell } from "./page";
import { Switch, Toasts, type Toast } from "./ui";
import css from "./settings.module.css";
import guest from "./guest.module.css";

const { get, put } = api("settings");

type TabletView = { identify_panels: boolean; identify_outline: string; show_size: boolean };
type Helpers = { streams: boolean; back: boolean; refresh: boolean };
type Settings = { helpers: Helpers; tablet_view: TabletView };

// The dashboard helpers the integration loads into every Home Assistant page.
const HELPERS: { key: keyof Helpers; name: string; help: string }[] = [
  {
    key: "refresh",
    name: "Reload dashboards when they change",
    help: "An open dashboard reloads itself when it is saved, so wall tablets show a deployed dashboard and nobody has to tap Refresh; never while it is being edited. Replaces auto_refresh.js among the dashboard resources: remove that one when switching this on.",
  },
  {
    key: "back",
    name: "Back button helper",
    help: "A button that goes to #BACK goes back, as the browser's Back does; the camera dashboard's Back buttons need it. Switch it on once any copy added by hand (nav_back_helper.js among the dashboard resources) is removed, or Back goes back twice.",
  },
  {
    key: "streams",
    name: "Keep camera pictures live",
    help: "Stops the camera streams of pages not on screen and restarts those shown, so a page you come back to has a live picture; and makes the highlight on the generated camera dashboard's main camera pulse.",
  },
];

const HEAD = {
  icon: <SettingsIcon />,
  title: "Settings",
  blurb: "Settings that have no other home.",
};

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>();
  const [outline, setOutline] = useState(""); // as typed, saved on leaving the field
  const [toasts, setToasts] = useState<Toast[]>([]);
  const developer = useContext(Developer);

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

  const save = async (change: Partial<Settings>, done: string) => {
    try {
      loaded(await put<Settings>("", change));
      toast(done);
    } catch (err) {
      toast((err as Error).message, "bad");
    }
  };

  if (!settings) return <Shell {...HEAD}><p className={guest.notice}>Loading…</p></Shell>;
  const tv = settings.tablet_view;
  const saveView = (change: Partial<TabletView>) =>
    save({ tablet_view: change as TabletView }, "Saved. Open Tablet Layouts show it within a few seconds.");
  const saveOutline = () => {
    const value = outline.trim() || "1px solid red";
    if (value !== tv.identify_outline) saveView({ identify_outline: value });
    else setOutline(value);
  };

  return (
    <Shell {...HEAD}>
      <section className={guest.area}>
        <AreaHead
          title="Dashboard helpers"
          blurb="Small scripts Casa Mia loads into every Home Assistant page, for every user and device."
        />
        <div className={css.rows}>
          {HELPERS.map((h) => (
            <div className={css.row} key={h.key}>
              <div className={css.text}>
                <strong>{h.name}</strong>
                <span>{h.help}</span>
              </div>
              <Switch
                label={h.name}
                on={settings.helpers[h.key]}
                onChange={(on) =>
                  save(
                    { helpers: { [h.key]: on } as Helpers },
                    "Saved. Home Assistant loads the change within a minute; open pages get it at their next reload.",
                  )
                }
              />
            </div>
          ))}
        </div>
      </section>
      {!developer && (
        <p className={guest.notice}>
          More options, for debugging, show when <strong>Developer mode</strong> is on in the app's Configuration tab.
        </p>
      )}
      {developer && (
        <section className={`${guest.area} ${css.dev}`}>
          <div className={css.devHead}>
            <span className={css.devChip}>Developer · debugging</span>
          </div>
          <AreaHead
            title="Tablet Layout debugging"
            blurb="Aids for building a Tablet Layout (custom:casa-mia-tablet-layout) and finding layout problems. Not for everyday use."
          />
          <p className={css.devWarn}>
            While one is on, it shows on <strong>every</strong> Tablet Layout, on every tablet and browser, until it is
            switched off again here.
          </p>
          <div className={css.rows}>
            <div className={css.row}>
              <div className={css.text}>
                <strong>Identify sections panels</strong>
                <span>An outline round each panel, so you can see where each one ends.</span>
              </div>
              <Switch label="Identify sections panels" on={tv.identify_panels} onChange={(on) => saveView({ identify_panels: on })} />
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
              <Switch label="Show the view size" on={tv.show_size} onChange={(on) => saveView({ show_size: on })} />
            </div>
          </div>
        </section>
      )}
      <Toasts toasts={toasts} />
    </Shell>
  );
}
