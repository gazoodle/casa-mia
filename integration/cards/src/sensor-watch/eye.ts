// The eye in Home Assistant's entity dialog (more-info), for admins: whether Sensor Watch
// watches this entity and at what level, and a tap to its watch in the app (a new one
// if it isn't watched), with its history and the profiles that fit, as on the page.
// Leans on the dialog's insides (its header's slots, _entityId, _currView: not public
// API, the same from 2026.3 to 2026.10); if they change, this says so in the console
// and shows nothing.
import { LitElement, css, html, nothing } from "lit";
import { fire, type Hass, navigate } from "../ha.ts";
import { PILLS } from "../pills.ts";
import { LEVEL_TONES } from "./card.ts";
import { ENTITY, OPEN, type Watch, appPanel, openNote } from "./common.ts";

export const TAG = "casa-mia-watch-eye";

export class WatchEye extends LitElement {
  static properties = { entityId: {}, _watch: { state: true } };
  entityId?: string;
  hass?: Hass; // for its connection and panels; not drawn from, so not a property
  dialog?: HTMLElement & { closeDialog?: () => void };
  _watch?: Watch; // none: not heard (yet), or Sensor Watch isn't running
  private _for?: string; // the entity subscribed to
  private _off?: Promise<() => void>;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  protected updated() {
    if (this.entityId !== this._for) this._subscribe();
  }

  /** This entity's watch, now and at each change (the integration's ENTITY command). */
  private _subscribe() {
    this._unsubscribe();
    const conn = this.hass?.connection;
    this._for = this.entityId;
    if (!this.entityId || !conn) return;
    this._off = conn.subscribeMessage((w: Watch) => (this._watch = w), { type: ENTITY, entity_id: this.entityId });
    this._off!.catch((err: any) => {
      // No Sensor Watch here (its module off, or an integration before the eye): no eye.
      if (err?.code !== "unknown_command" && err?.code !== "not_running") console.warn(`CASA-MIA CARDS: the eye: can't ask Sensor Watch (${err?.message ?? err})`);
    });
  }

  private _unsubscribe() {
    this._off?.then((off) => off()).catch(() => {});
    this._off = undefined;
    this._watch = undefined;
  }

  /** To the app's Sensor Watch page, with this entity's watch open there. */
  private _open() {
    const panel = appPanel(this.hass?.panels);
    if (!panel) {
      fire(this, "hass-notification", { message: "Casa Mia's app has no page in the sidebar: turn on Show in sidebar on its page in Settings → Apps.", duration: 10000 });
      return;
    }
    try {
      localStorage.setItem(OPEN, openNote(this.entityId!, Date.now()));
    } catch (err) {
      console.warn(`CASA-MIA CARDS: the eye: can't leave the app its note (${err}); it opens at its home page`);
    }
    this.dialog?.closeDialog?.();
    navigate(`/${panel.url_path}`);
  }

  render() {
    const w = this._watch;
    if (!w) return nothing;
    const level = w.watched ? w.level : undefined;
    const said = !w.watched
      ? "Watch in Sensor Watch"
      : `Sensor Watch: ${level ?? "watched, no level yet"}${w.escalated && w.real ? ` (escalated from ${w.real})` : ""}. Open its watch`;
    return html`<button class=${level ?? ""} title=${said} aria-label=${said} @click=${this._open}>
      <ha-icon icon=${w.watched ? "mdi:eye" : "mdi:eye-plus-outline"}></ha-icon>
      ${level ? html`<span class="cm-pill ${level === "critical" ? "cm-filled" : ""}">${level}</span>` : nothing}
    </button>`;
  }

  static styles = [
    PILLS,
    LEVEL_TONES,
    css`
      .nominal {
        --cm-level: var(--success-color, #43a047);
      }
      button {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 40px;
        margin: 4px 0;
        padding: 0 8px;
        border: 0;
        border-radius: 20px;
        background: none;
        color: var(--cm-level, var(--secondary-text-color));
        font: inherit;
        cursor: pointer;
      }
      button:hover {
        background: var(--secondary-background-color);
      }
      .cm-pill {
        --tone: var(--cm-level);
      }
      /* A phone's header has no room for the word: the eye keeps the level's colour. */
      @media (max-width: 450px) {
        .cm-pill {
          display: none;
        }
      }
    `,
  ];
}

/** The eye in an open dialog's header, before its own icons, while it shows an entity's
 * main view (not its settings, history or a child view); gone otherwise. Just after the
 * title, which the dialog draws once: outside the parts its template redraws, so the
 * dialog's own redraws leave it be. */
function place(dialog: any) {
  const root: ShadowRoot | null = dialog.shadowRoot;
  let eye = root?.querySelector(TAG) as WatchEye | null;
  const title = root?.querySelector('[slot="headerTitle"]');
  if (!root || !dialog.hass?.user?.is_admin || !dialog._entityId || dialog._currView !== "info" || !title) {
    if (root && dialog._entityId && !title) warnOnce("the entity dialog's header changed; no eye");
    eye?.remove();
    return;
  }
  if (!eye) {
    eye = document.createElement(TAG) as WatchEye;
    eye.slot = "headerActionItems";
    title.after(eye);
  }
  eye.hass = dialog.hass;
  eye.dialog = dialog;
  eye.entityId = dialog._entityId;
}

let warned = false;
function warnOnce(text: string) {
  if (!warned) console.warn(`CASA-MIA CARDS: ${text}`);
  warned = true;
}

customElements.whenDefined("ha-more-info-dialog").then(() => {
  const proto = (customElements.get("ha-more-info-dialog") as any).prototype;
  const original = proto.updated;
  if (typeof original !== "function") {
    warnOnce("the entity dialog changed; no eye");
    return;
  }
  proto.updated = function (this: any, ...args: unknown[]) {
    original.apply(this, args);
    place(this);
  };
});
