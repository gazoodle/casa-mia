/** Guest login's QR codes beyond the endpoints': any Home Assistant page, the Wi-Fi, the
 * printable guest card that puts the Wi-Fi beside an endpoint's code, and the words on the
 * cards (the printed one and the QR code card's), for guests who read another language. */

import { useState } from "react";
import { post, put, type GuestConfig, type HAChoices, type Wifi } from "./api";
import { copyText, Dialog, Field, Segmented, type Toast } from "./ui";
import css from "./guest.module.css";
import ui from "./ui.module.css";
import { Select } from "./controls";

const OTHER = "__other__";

type Tab = "page" | "wifi" | "card" | "words";

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
          ["words", "Words"],
        ]}
        onChange={setTab}
      />
      {tab === "card" && <CardTab config={config} />}
      {tab === "wifi" && <WifiTab config={config} onConfig={onConfig} toast={toast} />}
      {tab === "page" && <PageTab ha={ha} toast={toast} />}
      {tab === "words" && <WordsTab config={config} onConfig={onConfig} toast={toast} />}
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
  const v = encodeURIComponent(JSON.stringify([config.wifi, config.words, config.endpoints.find((e) => e.id === id)?.url]));
  return (
    <>
      <p className={css.checkHelp}>
        The endpoint's QR code beside the Wi-Fi's (from the Wi-Fi tab), with the network's name and password written out for
        anyone who'd rather type them. {config.wifi.ssid ? "" : "No Wi-Fi saved yet, so the card has the endpoint's code only."}
      </p>
      <Field label="Endpoint">
        <Select value={id} onChange={(picked) => setId(picked)}>
          {config.endpoints.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </Select>
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
        <Select value={wifi.security} onChange={(picked) => setWifi({ ...wifi, security: picked as Wifi["security"] })}>
          <option value="WPA">WPA, WPA2 or WPA3</option>
          <option value="WEP">WEP</option>
          <option value="nopass">None (open)</option>
        </Select>
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
          <Select
            value={custom ? OTHER : path}
            onChange={(picked) => {
              setCustom(picked === OTHER);
              if (picked !== OTHER) setPath(picked);
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
          </Select>
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

/** What each word on the cards is for. */
const WORD_LABELS: Record<string, string> = {
  join: "The Wi-Fi's step",
  sign_in: "An endpoint's step",
  open: "A page's step (QR code card)",
  network: "Before the network's name",
  password: "Before its password",
  passcode: "When an endpoint asks for a passcode",
  closed: "A closed endpoint (QR code card)",
  closed_note: "Under it",
};

/** The words on the guest card and the QR code card, in the guests' language. Blank: English. */
function WordsTab({
  config,
  onConfig,
  toast,
}: {
  config: GuestConfig;
  onConfig: (config: GuestConfig) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
}) {
  const [said, setSaid] = useState<Record<string, string>>(config.words);
  const [busy, setBusy] = useState(false);
  const saved = Object.keys(config.word_defaults).every((k) => (said[k] ?? "").trim() === (config.words[k] ?? ""));
  const save = async () => {
    setBusy(true);
    try {
      const all = Object.fromEntries(Object.keys(config.word_defaults).map((k) => [k, said[k] ?? ""]));
      const next = await put<GuestConfig>("settings", { words: all });
      onConfig(next);
      setSaid(next.words);
      toast("Words saved");
    } catch (err) {
      toast((err as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <p className={css.checkHelp}>
        The words on the printed guest card and on the QR code card, for guests who read another language. Leave one blank for its
        English, shown greyed.
      </p>
      {Object.entries(config.word_defaults).map(([key, english]) => (
        <Field key={key} label={WORD_LABELS[key] ?? key}>
          <input value={said[key] ?? ""} placeholder={english} onChange={(e) => setSaid({ ...said, [key]: e.target.value })} />
        </Field>
      ))}
      <div className={css.actions}>
        <button className={`${ui.primary} ${ui.small}`} disabled={busy || saved} onClick={save}>
          Save
        </button>
      </div>
    </>
  );
}
