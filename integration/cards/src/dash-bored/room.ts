// A family's card for one room: for a dashboard's page that is about that room, among the
// page's other cards. It is the family's own element told to keep one room (house.ts
// `rooms`) and that it is alone (family.ts `_alone`), so the family draws that room with
// nothing of the rest of the house round it. The card is of an ordinary size and has an
// editor with a picker for the room. The Console's room card is the same idea and older
// (console/cards.ts). The Gazette has none (owner, 2026-11-18): a newspaper is an overview,
// and its rooms have their own headings in it already.
import type { Hass } from "../ha.ts";
import { editor } from "./editor.ts";
import type { Family } from "./family.ts";
import type { Options } from "./house.ts";

type Config = Options & { type?: string; room?: string; style?: string };

/** A room for a new card to begin with: one with a light in it, so that the card shows
 * something at once, or else the first area there is. */
export function roomy(hass: Hass): string {
  const area = (e: any): string | undefined => e.area_id ?? hass.devices?.[e.device_id]?.area_id ?? undefined;
  const lit = Object.values<any>(hass.entities ?? {}).find((e) => e.entity_id.startsWith("light.") && !e.hidden && area(e));
  return (lit && area(lit)) ?? Object.keys(hass.areas ?? {})[0] ?? "";
}

/** The room card of a family: `Whole` is the family's element, and `tag` the card's. */
export function roomCard<T extends new (...args: any[]) => Family>(Whole: T, tag: string) {
  return class extends Whole {
    static getConfigElement() {
      return document.createElement(`${tag}-editor`);
    }

    static getStubConfig(hass: Hass) {
      return { room: roomy(hass) };
    }

    /** `room` is the room's id or its name. With none chosen yet the survey keeps no room, and the card says so. */
    setConfig(config: Config) {
      super.setConfig({ ...config, rooms: config.room ? [config.room] : [] });
    }

    protected get _alone() {
      return true;
    }

    getCardSize() {
      return 4;
    }

    getGridOptions(): { columns: number | "full"; min_columns?: number } {
      return { columns: 6, min_columns: 3 };
    }
  };
}

/** A room card's editor: the room, and the family's style where it has styles (`styles`, each its id and its name). */
export const roomEditor = (styles: [id: string, name: string][] = []) =>
  editor(
    [{ name: "room", required: true, selector: { area: {} } }, ...(styles.length ? [{ name: "style", selector: { select: { mode: "dropdown", options: styles.map(([value, label]) => ({ value, label })) } } }] : [])],
    { room: "Room", style: "Style" },
    { style: "Left empty, the card is in the style last chosen on Dash-Bored's page in this browser." },
  );
