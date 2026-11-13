// The thumbs in Home Assistant's entity dialog (more-info) for a media player that Love it
// or Loathe it watches, so every card that shows a player has them one tap away, with no
// dashboard to edit. Nothing is added for another kind of entity, a player that isn't
// watched, or a login that may not rate there (the thumbs' `quiet`).
// Leans on the dialog's insides (its header's slots, _entityId, _currView: not public API,
// as Sensor Watch's eye does); if they change, this says so in the console and shows
// nothing.
import { warnOnce } from "../ha.ts";
import { TAG, type Thumbs } from "./thumbs.ts";

/** The thumbs in an open dialog's header, before its own icons, while it shows a media
 * player's main view (not its settings or history); gone otherwise. Just after the title,
 * which the dialog draws once: outside the parts its template redraws. */
function place(dialog: any) {
  const root: ShadowRoot | null = dialog.shadowRoot;
  let thumbs = root?.querySelector(TAG) as Thumbs | null;
  const title = root?.querySelector('[slot="headerTitle"]');
  const id: string | undefined = dialog._entityId;
  if (!root || !dialog.hass || !id?.startsWith("media_player.") || dialog._currView !== "info" || !title) {
    if (root && id && !title) warnOnce("the entity dialog's header changed; no thumbs");
    thumbs?.remove();
    return;
  }
  if (!thumbs) {
    thumbs = document.createElement(TAG) as Thumbs;
    thumbs.slot = "headerActionItems";
    thumbs.quiet = true;
    title.after(thumbs);
  }
  thumbs.hass = dialog.hass;
  thumbs.connected = dialog.hass.connected !== false;
  thumbs.entityId = id;
}

customElements.whenDefined("ha-more-info-dialog").then(() => {
  const proto = (customElements.get("ha-more-info-dialog") as any).prototype;
  const original = proto.updated;
  if (typeof original !== "function") {
    warnOnce("the entity dialog changed; no thumbs");
    return;
  }
  proto.updated = function (this: any, ...args: unknown[]) {
    original.apply(this, args);
    place(this);
  };
});
