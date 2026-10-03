/** The guest login page's dialogs. Every field says what it is for. */

import { useEffect, useState } from "react";
import { get, type Endpoint, type GuestConfig, type HAChoices, type Login } from "./api";
import { Dialog, Field, Segmented } from "./ui";
import css from "./guest.module.css";
import ui from "./ui.module.css";

const OTHER = "__other__";

const toId = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type EndpointBody = Omit<Endpoint, "url" | "enabled" | "until" | "logins" | "last_login">;

export function EndpointDialog({
  endpoint,
  config,
  ha,
  onClose,
  onSave,
}: {
  endpoint?: Endpoint;
  config: GuestConfig;
  ha?: HAChoices;
  onClose: () => void;
  onSave: (body: EndpointBody) => void;
}) {
  const [label, setLabel] = useState(endpoint?.label ?? "");
  const [id, setId] = useState(endpoint?.id ?? "");
  const [idTouched, setIdTouched] = useState(!!endpoint);
  const [dashboard, setDashboard] = useState(endpoint?.dashboard ?? "");
  const known = ha?.dashboards.some((d) => d.path === dashboard);
  const [custom, setCustom] = useState(!!endpoint && !known);
  const [type, setType] = useState<Endpoint["type"]>(endpoint?.type ?? "guest");
  const [account, setAccount] = useState(endpoint?.account ?? "");
  const [useSlug, setUseSlug] = useState(endpoint ? !!endpoint.slug : true);
  const [slug, setSlug] = useState(endpoint?.slug ?? "");
  const [legacy, setLegacy] = useState(endpoint?.legacy ?? false);
  const [welcome, setWelcome] = useState(!!(endpoint?.title || endpoint?.message || endpoint?.delay != null));
  const [title, setTitle] = useState(endpoint?.title ?? "");
  const [message, setMessage] = useState(endpoint?.message ?? "");
  const [delay, setDelay] = useState(endpoint?.delay?.toString() ?? "");

  const generate = async () => setSlug((await get<{ slug: string }>("slug")).slug);
  useEffect(() => {
    if (!endpoint) void generate(); // a new endpoint starts with a fresh secret address
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group the dashboard views by dashboard for the picker.
  const groups = new Map<string, { path: string; view: string }[]>();
  for (const d of ha?.dashboards ?? []) {
    groups.set(d.dashboard, [...(groups.get(d.dashboard) ?? []), { path: d.path, view: d.view }]);
  }

  const save = () =>
    onSave({
      id,
      label,
      dashboard,
      type,
      account: account || null,
      slug: useSlug ? slug : null,
      legacy,
      title: welcome ? title || null : null,
      message: welcome ? message || null : null,
      delay: welcome && delay !== "" ? Number(delay) : null,
    });

  return (
    <Dialog
      title={endpoint ? `Edit ${endpoint.label}` : "Add endpoint"}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} onClick={save}>
            {endpoint ? "Save" : "Add endpoint"}
          </button>
        </>
      }
    >
      <Field label="Label" help="The name of this endpoint's device in Home Assistant, for example Suite 1. Cosmetic: change it whenever you like.">
        <input
          value={label}
          autoFocus
          onChange={(e) => {
            setLabel(e.target.value);
            if (!idTouched) setId(toId(e.target.value));
          }}
        />
      </Field>
      <Field
        label="ID"
        help={
          endpoint
            ? "Permanent name used in the entity IDs. Changing it replaces this endpoint's entities in Home Assistant."
            : "A permanent name for Home Assistant's entity IDs, made from the label. Lower-case letters, digits and dashes."
        }
      >
        <input
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setIdTouched(true);
          }}
        />
      </Field>
      <Field label="Landing dashboard" help="Where the visitor lands once signed in. The list is every dashboard and view in Home Assistant.">
        {groups.size > 0 && (
          <select
            value={custom ? OTHER : dashboard}
            onChange={(e) => {
              if (e.target.value === OTHER) setCustom(true);
              else {
                setCustom(false);
                setDashboard(e.target.value);
              }
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
        {(custom || groups.size === 0) && (
          <input placeholder="/guest-dashboards/suite-1" value={dashboard} onChange={(e) => setDashboard(e.target.value)} />
        )}
      </Field>
      <Field label="Type" help="Guest gets the welcome page. Engineer is for maintenance QR codes on KNX panels and the like.">
        <Segmented value={type} options={[["guest", "Guest"], ["engineer", "Engineer"]]} onChange={setType} />
      </Field>
      <Field label="Login" help="Which Home Assistant user the visitor is signed in as.">
        <select value={account} onChange={(e) => setAccount(e.target.value)}>
          <option value="">Default ({config.default_login || "none yet"})</option>
          {config.logins.map((l) => (
            <option key={l.name} value={l.name}>
              {l.name}
              {l.display ? ` (${l.display})` : ""}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className={css.fieldset}>
        <legend>QR code address</legend>
        <label className={css.check}>
          <input type="checkbox" checked={useSlug} onChange={(e) => setUseSlug(e.target.checked)} />
          <span>
            <strong>Secret address</strong>
            <span className={css.checkHelp}>
              The QR code points at http://{config.qr_host_effective}:{config.port}/e/&lt;secret&gt;. Anyone holding it can
              sign in while the endpoint is open, so treat it like a password.
            </span>
          </span>
        </label>
        {useSlug && (
          <div className={css.slugRow}>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} spellCheck={false} />
            <button className={ui.button} onClick={generate}>
              New
            </button>
          </div>
        )}
        <label className={css.check}>
          <input type="checkbox" checked={legacy} onChange={(e) => setLegacy(e.target.checked)} />
          <span>
            <strong>Legacy QR code (ha-auto-guest-login)</strong>
            <span className={css.checkHelp}>
              For a QR code printed for the ha-auto-guest-login app, with its address http://{config.qr_host_effective}:{config.port}/?d=&lt;dashboard&gt;.
              The landing dashboard must then be exactly that d= value. The QR code shown keeps that old address.
            </span>
          </span>
        </label>
      </fieldset>

      <label className={css.check}>
        <input type="checkbox" checked={welcome} onChange={(e) => setWelcome(e.target.checked)} />
        <span>
          <strong>Own welcome page</strong>
          <span className={css.checkHelp}>Otherwise it uses the defaults in Settings.</span>
        </span>
      </label>
      {welcome && (
        <>
          <Field label="Welcome title">
            <input placeholder={config.welcome.title} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Welcome message" help="Shown under the title while the visitor is signed in.">
            <input placeholder={config.welcome.message} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Field label="Welcome delay (seconds)" help="How long the page shows before the dashboard, 0 to 30.">
            <input type="number" min={0} max={30} placeholder={String(config.welcome.delay)} value={delay} onChange={(e) => setDelay(e.target.value)} />
          </Field>
        </>
      )}
    </Dialog>
  );
}

export type LoginBody = {
  name: string;
  password: string;
  username?: string;
  user_id?: string | null;
  display?: string | null;
  create?: { name: string; username: string };
};

export function LoginDialog({
  config,
  ha,
  onClose,
  onSave,
}: {
  config: GuestConfig;
  ha?: HAChoices;
  onClose: () => void;
  onSave: (body: LoginBody) => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">(ha?.users.length ? "existing" : "new");
  const [userId, setUserId] = useState("");
  const [display, setDisplay] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState(config.logins.length ? "" : "house-guest");
  const [nameTouched, setNameTouched] = useState(!config.logins.length);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const users = (ha?.users ?? []).filter((u) => u.username && u.is_active);
  const user = users.find((u) => u.id === userId);

  const save = () =>
    onSave(
      mode === "existing"
        ? { name, password, username: user?.username ?? "", user_id: user?.id ?? null, display: user?.name ?? null }
        : { name, password, create: { name: display || name, username } },
    );

  return (
    <Dialog
      title="Add login"
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} onClick={save}>
            {mode === "new" ? "Create user and add" : "Add login"}
          </button>
        </>
      }
    >
      <Segmented
        value={mode}
        options={[
          ["existing", "Existing Home Assistant user"],
          ["new", "New user"],
        ]}
        onChange={setMode}
      />
      {mode === "existing" ? (
        <Field
          label="Home Assistant user"
          help="People with a username and password. An administrator is marked: visitors would get full control, so pick a normal user."
        >
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              const u = users.find((x) => x.id === e.target.value);
              if (u && !nameTouched) setName(toId(u.username ?? u.name));
            }}
          >
            <option value="" disabled>
              Choose a user…
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.username}){u.is_admin ? " — administrator" : ""}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <>
          <Field label="Display name" help="Shown in Home Assistant, for example House Guest.">
            <input
              value={display}
              autoFocus
              onChange={(e) => {
                setDisplay(e.target.value);
                if (!nameTouched) setName(toId(e.target.value));
              }}
            />
          </Field>
          <Field label="Username" help="What the visitor is signed in as. Created as a normal (non-admin) user that can only log in from the house network.">
            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} spellCheck={false} />
          </Field>
        </>
      )}
      <Field
        label="Password"
        help={
          mode === "existing"
            ? "That user's current Home Assistant password: Casa Mia signs visitors in with it. Press Test on the login afterwards to check it."
            : "The new user's password, at least 8 characters. Nobody has to type it: the QR code signs in."
        }
      >
        <div className={css.slugRow}>
          <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <button className={ui.button} onClick={() => setShow(!show)}>
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </Field>
      <Field label="Login name" help="How endpoints refer to this login here, for example house-guest. Lower-case letters, digits and dashes.">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameTouched(true);
          }}
        />
      </Field>
    </Dialog>
  );
}

export function PasswordDialog({
  login,
  onClose,
  onSave,
}: {
  login: Login;
  onClose: () => void;
  onSave: (body: { password: string; set_in_ha: boolean }) => void;
}) {
  const [password, setPassword] = useState("");
  const [inHa, setInHa] = useState(!!login.user_id);
  return (
    <Dialog
      title={`Password for ${login.name}`}
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} onClick={() => onSave({ password, set_in_ha: inHa })}>
            Save password
          </button>
        </>
      }
    >
      <Field label="New password" help="At least 8 characters.">
        <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </Field>
      <label className={css.check}>
        <input type="checkbox" checked={inHa} disabled={!login.user_id} onChange={(e) => setInHa(e.target.checked)} />
        <span>
          <strong>Also change it in Home Assistant</strong>
          <span className={css.checkHelp}>
            {login.user_id
              ? `Sets user ${login.username}'s password in Home Assistant too, so the two always match. Leave off if you already changed it there.`
              : "This login is not linked to a Home Assistant user, so only the password Casa Mia uses changes."}
          </span>
        </span>
      </label>
    </Dialog>
  );
}

export function SettingsDialog({
  config,
  onClose,
  onSave,
}: {
  config: GuestConfig;
  onClose: () => void;
  onSave: (body: object) => void;
}) {
  const [title, setTitle] = useState(config.welcome.title);
  const [message, setMessage] = useState(config.welcome.message);
  const [delay, setDelay] = useState(String(config.welcome.delay));
  const [host, setHost] = useState(config.qr_host);
  const [previewing, setPreviewing] = useState(false);
  // The welcome page with the values being edited, not yet saved.
  const previewUrl = `api/guest/preview?${new URLSearchParams({ title, message, delay })}`;
  return (
    <Dialog
      title="Guest login settings"
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} onClick={() => onSave({ qr_host: host, welcome: { title, message, delay: Number(delay) } })}>
            Save
          </button>
        </>
      }
    >
      <Field
        label="Host in QR codes"
        help={`The address visitors' phones reach this box on. Leave empty to use ${config.qr_host_effective}, found automatically. Printed codes use the box's IP, so changing this changes every QR code.`}
      >
        <input placeholder={config.qr_host_effective} value={host} onChange={(e) => setHost(e.target.value)} />
      </Field>
      <Field label="Welcome title" help="Each endpoint can have its own.">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Welcome message">
        <input value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <Field label="Welcome delay (seconds)" help="0 to 30. The sign-in runs during the delay.">
        <input type="number" min={0} max={30} value={delay} onChange={(e) => setDelay(e.target.value)} />
      </Field>
      <div className={css.previewRow}>
        <span className={css.checkHelp}>See the welcome page as a visitor's phone shows it, with these values (it signs nobody in).</span>
        <button className={ui.button} onClick={() => setPreviewing(true)}>
          Preview
        </button>
      </div>
      {previewing && <PhonePreview url={previewUrl} onClose={() => setPreviewing(false)} />}
    </Dialog>
  );
}

const PHONES: [string, number, number][] = [
  ["Phone", 390, 844],
  ["Small phone", 360, 740],
  ["Tablet", 820, 1180],
];

/** The page in a phone-sized frame, scaled down to fit the window. */
function PhonePreview({ url, onClose }: { url: string; onClose: () => void }) {
  const [size, setSize] = useState(0);
  const [, w, h] = PHONES[size];
  const [reload, setReload] = useState(0);
  const scale = Math.min(1, (window.innerHeight - 190) / h, (window.innerWidth - 60) / w);
  return (
    <Dialog
      title="Welcome page preview"
      onClose={onClose}
      wide
      footer={
        <>
          <Segmented
            value={String(size)}
            options={PHONES.map(([name], i) => [String(i), name] as [string, string])}
            onChange={(v) => setSize(Number(v))}
          />
          <button className={ui.button} onClick={() => setReload(reload + 1)}>
            Replay
          </button>
          <button className={ui.primary} onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div className={css.phoneStage} style={{ height: h * scale + 24 }}>
        <div className={css.phone} style={{ width: w, height: h, transform: `scale(${scale})` }}>
          <iframe key={`${size}-${reload}`} src={url} title="Welcome page preview" />
        </div>
      </div>
    </Dialog>
  );
}
