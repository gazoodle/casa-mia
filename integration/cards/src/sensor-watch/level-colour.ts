// The Sensor Watch Status sensor's icon in its level's colour, on every card. HA colours
// only some domains by state, never a sensor's (bar a battery), and gives an integration
// no way to name colours, so this leans on the frontend's insides, as card-mod does:
// - ha-state-icon, which draws an entity's icon on every card (HA's own, Mushroom's, the
//   entity dialog's): the icon itself, whatever the card and its State colour setting;
// - tiles and badges, which tint more than the icon (a tile's circle): their own
//   `_computeStateColor` (set per card, not on its class), unless the card names a colour.
// If those insides change, the icon keeps HA's own colour and the console says so.
import { warnOnce } from "../ha.ts";
import { levelColour } from "./common.ts";

/** HA's own entities (the registry, as the frontend holds it), for an element without it. */
const entities = () => (document.querySelector("home-assistant") as any)?.hass?.entities;

/** Have the elements of this kind already drawn draw again, now patched: one drawn before
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

// Every icon: its own colour, set after each update (its entity's state changed). Only an
// icon this painted is cleared again (unavailable: HA's grey), never a colour a card set.
customElements.whenDefined("ha-state-icon").then(() => {
  const proto = (customElements.get("ha-state-icon") as any).prototype;
  const original = proto.updated;
  if (typeof original !== "function") return warnOnce("ha-state-icon changed; the Status sensor keeps HA's colour");
  proto.updated = function (this: any, ...args: unknown[]) {
    original.apply(this, args);
    const color = levelColour(this.stateObj, this._entities ?? this.hass?.entities ?? entities());
    if (color) {
      if (this.style.color !== color) this.style.color = color;
      this.cmLevelColour = true;
    } else if (this.cmLevelColour) {
      this.style.removeProperty("color");
      this.cmLevelColour = false;
    }
  };
  redrawn("ha-state-icon");
});

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
