// The Sensor Watch Status sensor's icon in its level's colour, wherever HA colours an
// icon by its state: tiles, badges, heading badges and entity rows (with State colour on).
// HA colours only some domains by state, never a sensor's (bar a battery), and gives an
// integration no way to name colours, so this leans on those cards' insides: each one's
// `_computeStateColor` (set per card, not on its class) and state-badge's `willUpdate`;
// the same from 2026.3 to 2026.10. If they change, the icon keeps HA's own colour and the
// console says so.
import { warnOnce } from "../ha.ts";
import { levelColour } from "./common.ts";

/** HA's own entities (the registry, as the frontend holds it), for a card without hass. */
const entities = () => (document.querySelector("home-assistant") as any)?.hass?.entities;

/** Have the cards of this kind already drawn draw again, now patched: one drawn before
 * this file loaded keeps its colour until its entity changes, and the Status sensor can
 * stay nominal for days. Once per kind, as the patch goes in. */
function redrawn(tag: string) {
  const roots: (Document | ShadowRoot)[] = [document];
  for (let root; (root = roots.pop()); )
    for (const el of root.querySelectorAll<any>("*")) {
      if (el.localName === tag) el.requestUpdate?.();
      if (el.shadowRoot) roots.push(el.shadowRoot);
    }
}

// Tiles and badges: each card's colour, unless its config names one.
for (const tag of ["hui-tile-card", "hui-entity-badge", "hui-entity-heading-badge"]) {
  customElements.whenDefined(tag).then(() => {
    const proto = (customElements.get(tag) as any).prototype;
    const original = proto.willUpdate;
    proto.willUpdate = function (this: any, ...args: unknown[]) {
      if (!this.cmLevelColour) {
        this.cmLevelColour = true;
        const compute = this._computeStateColor;
        if (typeof compute !== "function") warnOnce(`${tag} changed; the Status sensor keeps HA's colour`);
        else this._computeStateColor = (entity: any, color?: string) => (!color && levelColour(entity, this.hass?.entities)) || compute(entity, color);
      }
      return original.apply(this, args);
    };
    redrawn(tag);
  });
}

// Entity rows: the icon's style, once HA has worked out its own (State colour on only).
customElements.whenDefined("state-badge").then(() => {
  const proto = (customElements.get("state-badge") as any).prototype;
  const original = proto.willUpdate;
  proto.willUpdate = function (this: any, ...args: unknown[]) {
    original.apply(this, args);
    if (!("_iconStyle" in this)) return warnOnce("state-badge changed; the Status sensor keeps HA's colour");
    const color = this._color === "state" && levelColour(this.stateObj, entities());
    if (color && this._iconStyle.color !== color) this._iconStyle = { ...this._iconStyle, color };
  };
  redrawn("state-badge");
});
