import { useEffect, useState, type ReactNode } from "react";
import { CameraDashboardPage } from "./camera-dashboard";
import { CamerasPage } from "./cameras";
import { CommanderPage } from "./commander";
import { CompositorPage } from "./compositor";
import { FirmwarePage } from "./FirmwarePage";
import { GuestPage } from "./GuestPage";
import { KioskFrame, KiosksPage } from "./KiosksPage";
import { KioskModePage } from "./KioskModePage";
import { PeoplePage } from "./PeoplePage";
import { SettingsPage } from "./SettingsPage";
import { Developer, useHealth, type ModuleHealth } from "./health";
import { ModuleIcon, SettingsIcon } from "./icons";
import { Maturity } from "./maturity";
import { MODULES, type ModuleInfo } from "./modules";
import type { HeaderView } from "./api";
import { Photo, PhotoEditor, photoApi, photoUrl, type PhotoDraft } from "./photo";
import { CopyButton } from "./ui";
import css from "./app.module.css";

const STATES: Record<string, [label: string, tone: string]> = {
  running: ["Running", css.good],
  connected: ["Connected", css.good],
  starting: ["Starting", css.warn],
  offline: ["Offline", css.bad],
  unconfigured: ["Needs setup", css.warn],
};

/** The page named by the URL's hash: "#/guest" opens Guest login. Hash routing works
 * unchanged under ingress's prefix. */
function useRoute(): string {
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  useEffect(() => {
    const onHash = () => setRoute(location.hash.slice(1) || "/");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

/** Module pages behind the tiles. */
const PAGES: Record<string, string> = {
  guest_login: "/guest",
  gitproxy: "/firmware",
  people: "/people",
  kiosks: "/kiosks",
  cameras: "/cameras",
  commander: "/commander",
  camera_dashboard: "/camera-dashboard",
  compositor: "/compositor",
  kiosk_mode: "/kiosk-mode",
};

export function App() {
  const { health, error } = useHealth();
  const route = useRoute();
  const [photo, setPhoto] = useState<HeaderView>();
  const [draft, setDraft] = useState<PhotoDraft>(); // the photo being edited, shown live
  useEffect(() => {
    photoApi.get<HeaderView>("").then(setPhoto, () => undefined);
  }, []);
  const page = pageFor(route, health?.modules ?? {});
  if (page) return <Developer.Provider value={!!health?.developer}>{page}</Developer.Provider>;
  const modules = Object.entries(health?.modules ?? {});
  const on = modules.filter(([, h]) => h.state && h.state !== "disabled");
  const off = modules.filter(([, h]) => h.state === "disabled");

  return (
    <>
      <header className={css.hero}>
        {(draft ?? photo) && <Photo src={photoUrl((draft ?? photo)!)} frame={(draft ?? photo)!.home} />}
        {photo && <h1 className={css.heroTitle}>{photo.house}</h1>}
        {photo && !draft && (
          <div className={css.heroButtons}>
            <a className={css.heroEdit} href="#/settings" title="Settings" aria-label="Settings">
              <SettingsIcon size={17} />
            </a>
            <button className={css.heroEdit} onClick={() => setDraft(photo)} title="Change the house photo" aria-label="Change the house photo">
              ✎
            </button>
          </div>
        )}
      </header>
      <div className={css.page}>
      {draft && (
        <PhotoEditor
          view={draft}
          saved={photo ?? draft}
          onChange={setDraft}
          onDone={(saved) => {
            if (saved) setPhoto(saved);
            setDraft(undefined);
          }}
        />
      )}

      {error && (
        <div className={css.banner} role="alert">
          Can't reach the Casa Mia app ({error}). Showing the last state it reported.
        </div>
      )}

      {!health && !error && <div className={css.loading}>Loading…</div>}

      {health && on.length > 0 && (
        <Section title="Running here">
          {on.map(([key, h]) => (
            <Tile key={key} module={key} info={MODULES[key] ?? fallback(key)} health={h} href={PAGES[key]} />
          ))}
        </Section>
      )}

      {health && on.length === 0 && <Empty off={off.map(([key]) => key)} />}

      {health && (
        <footer className={css.footer}>
          {health.integration_url && <IntegrationUrl url={health.integration_url} />}
          Casa Mia app {health.version}
          {off.length > 0 && on.length > 0 && (
            <> · switched off: {off.map(([key]) => (MODULES[key] ?? fallback(key)).title).join(", ")}</>
          )}
        </footer>
      )}
      </div>
    </>
  );
}

/** The page for a route other than home (undefined for home). */
function pageFor(route: string, modules: Record<string, ModuleHealth>): ReactNode {
  if (route === "/guest") return <GuestPage state={modules.guest_login?.state} />;
  if (route === "/people") return <PeoplePage />;
  if (route === "/kiosks") return <KiosksPage state={modules.kiosks?.state} />;
  if (route.startsWith("/kiosks/")) return <KioskFrame id={route.slice("/kiosks/".length)} />;
  if (route === "/cameras") return <CamerasPage state={modules.cameras?.state} />;
  if (route === "/commander") return <CommanderPage state={modules.commander?.state} />;
  if (route === "/camera-dashboard") return <CameraDashboardPage state={modules.camera_dashboard?.state} />;
  if (route === "/compositor") return <CompositorPage state={modules.compositor?.state} />;
  if (route === "/kiosk-mode") return <KioskModePage state={modules.kiosk_mode?.state} />;
  if (route === "/settings") return <SettingsPage />;
  if (route === "/firmware") return <FirmwarePage state={modules.gitproxy?.state} />;
}

/** The address the Casa Mia integration is set up with, ready to copy. */
function IntegrationUrl({ url }: { url: string }) {
  return (
    <div className={css.integration}>
      <span>Integration URL</span>
      <code>{url}</code>
      <CopyButton text={url} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={css.section}>
      <h2 className={css.sectionHead}>{title}</h2>
      <div className={css.deck}>{children}</div>
    </section>
  );
}

function Tile({ module, info, health, href }: { module: string; info: ModuleInfo; health: ModuleHealth; href?: string }) {
  const [label, tone] = STATES[health.state ?? ""] ?? [health.state ?? "Unknown", css.muted];
  const progress = info.progress?.(health);
  const facts = info.facts(health).filter(([, value]) => value !== undefined);
  const Tag = href ? "a" : "article";
  return (
    <Tag className={`${css.tile} ${href ? css.tileLink : ""}`} {...(href ? { href: `#${href}` } : {})}>
      <div className={css.tileHead}>
        <span className={css.icon}>{info.icon}</span>
        <h3 className={css.tileTitle}>{info.title}</h3>
        <span className={`${css.chip} ${tone}`}>
          <span className={css.dot} />
          {label}
        </span>
      </div>
      <p className={css.blurb}>{info.blurb}</p>
      {facts.length > 0 && (
        <dl className={css.facts}>
          {facts.map(([name, value]) => (
            <div key={name} className={css.fact}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {progress !== undefined && (
        <div className={css.bar} aria-label={`${progress}%`}>
          <div className={css.barFill} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      {health.error && <p className={css.error}>{health.error}</p>}
      <div className={css.tileFoot}>
        <Maturity module={module} />
        {href && <span className={css.more}>Open →</span>}
      </div>
    </Tag>
  );
}

function Empty({ off }: { off: string[] }) {
  return (
    <section className={css.empty}>
      <h2>Nothing is switched on yet</h2>
      <p>
        Turn on a feature in the app's <strong>Configuration</strong> tab (Settings → Apps → Casa
        Mia → Configuration). Each one gets a tile here.
      </p>
      <ul className={css.offList}>
        {off.map((key) => {
          const info = MODULES[key] ?? fallback(key);
          return (
            <li key={key}>
              <span className={css.icon}>{info.icon}</span>
              <span>
                <strong>{info.option}</strong>
                <span className={css.offBlurb}>{info.blurb}</span>
                <Maturity module={key} full />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function fallback(key: string): ModuleInfo {
  return { title: key, option: key, blurb: "", icon: <ModuleIcon />, facts: () => [] };
}
