// Casa Mia Buttons: what each button does and shows, worked out without a page so it can
// be tested. The card (card.ts) draws them as the style guide's chips.
import type { Hass, State } from "../ha.ts";

/** A button: an entity, and what a tap does (Home Assistant's own action, as any card's
 * tap_action). With no action, it toggles what can be toggled and otherwise opens the
 * entity's more-info, as Home Assistant's button card does. */
export type Button = { entity?: string; name?: string; icon?: string; tap_action?: { action: string; [key: string]: unknown } };
export type Config = { type: string; buttons?: Button[]; columns?: number; show_name?: boolean; no_background?: boolean };

export const DEFAULTS = { columns: 2, show_name: true, no_background: false };

/** The domains a tap toggles: those with a toggle service. A lock or a gate's cover can
 * be given an action of its own, with Home Assistant's confirmation if wanted. */
const TOGGLES = ["automation", "cover", "fan", "group", "humidifier", "input_boolean", "light", "media_player", "siren", "switch", "valve"];
/** States that light a button, as on. */
const ON = ["on", "open", "opening", "closing", "unlocked", "unlocking", "playing", "home", "active"];

export function actionOf(button: Button): { action: string; [key: string]: unknown } {
  if (button.tap_action) return button.tap_action;
  if (!button.entity) return { action: "none" };
  return TOGGLES.includes(button.entity.split(".")[0]) ? { action: "toggle" } : { action: "more-info" };
}

export const isOn = (state: State | undefined): boolean => Boolean(state && ON.includes(state.state));

/** Its name: as set, else the entity's own, else nothing (an icon alone). */
export function nameOf(button: Button, hass?: Hass): string {
  return button.name ?? (button.entity ? (hass?.states[button.entity]?.attributes.friendly_name ?? button.entity) : "");
}
