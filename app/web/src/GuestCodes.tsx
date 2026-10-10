/** Guest login's QR codes beyond the endpoints': any Home Assistant page, the Wi-Fi, and the
 * printable guest card that puts the Wi-Fi beside an endpoint's code. */

import { useState } from "react";
import { post, put, type GuestConfig, type HAChoices, type Wifi } from "./api";
import { copyText, Dialog, Field, Segmented, type Toast } from "./ui";
import css from "./guest.module.css";
import ui from "./ui.module.css";

const OTHER = "__other__";

type Tab = "page" | "wifi" | "card";

export function QrCodesDialog({
  config,
  ha,
  onConfig,
  onClose,
  toast,
}: {
  config: GuestConfig;
  ha?: HAChoices;
  onConfig: (config: GuestConfig) => void;
  onClose: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
}) {
  const [tab, setTab] = useState<Tab>("card");
  return (
    <Dialog
      title="QR codes"
      onClose={onClose}
      footer={
        <button className={ui.primary} onClick={onClose}>
          Done
        </button>
      }
    >
      <Segmented
        value={tab}
        options={[
          ["card", "Guest card"],
          ["wifi", "Wi-Fi"],
          ["page", "A page"],
        ]}
        onChange={setTab}
      />
      {tab === "card" && <CardTab config={config} />}
      {tab === "wifi" && <WifiTab config={config} onConfig={onConfig} toast={toast} />}
      {tab === "page" && <PageTab ha={ha} toast={toast} />}
    </Dialog>
  );
}

function Downloads({ src, query = "", file, onMedia }: { src: string; query?: string; file: string; onMedia?: () => void }) {
  return (
    <div className={css.actions}>
      <a className={`${ui.button} ${ui.small}`} href={`${src}.png${query}`} download={`${file}.png`}>
        Download PNG
      </a>
      <a className={`${ui.button} ${ui.small}`} href={`${src}.svg${query}`} download={`${file}.svg`}>
        SVG
      </a>
      {onMedia && (
        <button className={`${ui.button} ${ui.small}`} onClick={onMedia}>
          Save to HA media
        </button>
      )}
    </div>
  );
}

/** The guest card: join the Wi-Fi, then scan to sign in, one picture to print or paste. */
function CardTab({ config }: { config: GuestConfig }) {
  const [id, setId] = useState(config.endpoints[0]?.id ?? "");
  if (!config.endpoints.length) return <p className={css.checkHelp}>Add an endpoint first: the card carries its QR code.</p>;
  const src = `api/guest/card/${id}`;
  const v = encodeURIComponent(JSON.stringify([config.wifi, config.endpoints.find((e) => e.id === id)?.url]));
  return (
    <>
      <p className={css.checkHelp}>
        The endpoint's QR code beside the Wi-Fi's (from the Wi-Fi tab), with the network's name and password written out for
        anyone who'd rather type them. {config.wifi.ssid ? "" : "No Wi-Fi saved yet, so the card has the endpoint's code only."}
      </p>
      <Field label="Endpoint">
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {config.endpoints.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </Field>
      <img className={css.card} src={`${src}.svg?v=${v}`} alt="The guest card" />
      <div className={css.actions}>
        <a className={`${ui.primary} ${ui.small}`} href={src} target="_blank" rel="noopener noreferrer">
          Open to print ↗
        </a>
        <a className={`${ui.button} ${ui.small}`} href={`${src}.svg`} download={`${id}-card.svg`}>
          Download SVG
        </a>
      </div>
      <p className={css.checkHelp}>The SVG goes into Pages, Word or a message as a picture, and stays sharp at any size.</p>
    </>
  );
}

function WifiTab({
  config,
  onConfig,
  toast,
}: {
  config: GuestConfig;
  onConfig: (config: GuestConfig) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
}) {
  const [wifi, setWifi] = useState<Wifi>(config.wifi);
  const [busy, setBusy] = useState(false);
  const saved = JSON.stringify(wifi) === JSON.stringify(config.wifi);
  const save = async () => {
    setBusy(true);
    try {
      onConfig(await put<GuestConfig>("settings", { wifi }));
      toast("Wi-Fi saved");
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <p className={css.checkHelp}>
        A code a phone's camera offers to join, for the guest card or on its own. Kept with Guest login's settings.
      </p>
      <Field label="Network name (SSID)">
        <input value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} spellCheck={false} />
      </Field>
      <Field label="Security">
        <select value={wifi.security} onChange={(e) => setWifi({ ...wifi, security: e.target.value as Wifi["security"] })}>
          <option value="WPA">WPA, WPA2 or WPA3</option>
          <option value="WEP">WEP</option>
          <option value="nopass">None (open)</option>
        </select>
      </Field>
      {wifi.security !== "nopass" && (
        <Field label="Password">
          <input value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} spellCheck={false} />
        </Field>
      )}
      <label className={css.check}>
        <input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} />
        <span>
          <strong>Hidden network</strong>
          <span className={css.checkHelp}>It doesn't broadcast its name.</span>
        </span>
      </label>
      <div className={css.actions}>
        <button className={`${ui.primary} ${ui.small}`} disabled={busy || saved} onClick={save}>
          Save
        </button>
      </div>
      {config.wifi.ssid && saved && (
        <>
          <div className={css.qrFrame}>
            <img className={css.qr} src={`api/guest/wifi.svg?v=${encodeURIComponent(JSON.stringify(config.wifi))}`} alt="Wi-Fi QR code" />
          </div>
          <Downloads src="api/guest/wifi" file="wifi-qr" />
        </>
      )}
    </>
  );
}

/** A plain link to any Home Assistant page, at the QR host and HA's port. It signs nobody
 * in: whoever scans it must already be signed in on that phone. */
function PageTab({ ha, toast }: { ha?: HAChoices; toast: (text: string, tone?: Toast["tone"]) => void }) {
  const [path, setPath] = useState("");
  const [custom, setCustom] = useState(!ha?.dashboards.length);
  const groups = new Map<string, { path: string; view: string }[]>();
  for (const d of ha?.dashboards ?? []) {
    groups.set(d.dashboard, [...(groups.get(d.dashboard) ?? []), { path: d.path, view: d.view }]);
  }
  const q = new URLSearchParams({ path }).toString();
  const media = async () => {
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
    <>
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
          <Downloads src="api/guest/page-qr/code" query={`?${q}`} file={`${file}-qr`} onMedia={media} />
        </>
      )}
    </>
  );
}
