// The Tablet Layout's helpers and constants, shared by its parts.
import { LAYOUT } from "../layout.ts";

/** Each element above `el` (through shadow roots) taller than the window: what still
 * scrolls the page. Debug only. */
export function tooTall(el: Element, tall: number): string {
  const out: string[] = [];
  for (let n: Node | null = el; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null)) {
    const h = (n as Element).getBoundingClientRect?.().height ?? 0;
    if (h > tall + 1) out.push(`${(n as Element).tagName.toLowerCase()} ${Math.round(h)}`);
  }
  return out.length ? `\ntoo tall: ${out.join("\n")}` : "";
}

/** The app's settings for this view (its Settings page, through the integration), now and
 * at each change; none without the integration. Returns the unsubscribe. */
export function watchAppSettings(hass: any, got: (s: Record<string, any>) => void): () => void {
  let unsub: (() => void) | undefined;
  let gone = false;
  hass.connection
    .subscribeMessage((s: any) => got(s?.tablet_view ?? {}), { type: "casa_mia/settings/subscribe" })
    .then((u: () => void) => (gone ? u() : (unsub = u)))
    .catch(() => got({}));
  return () => {
    gone = true;
    unsub?.();
  };
}

/** The space above the view's header, px (header_space; HA's own row gap by default). */
export const headerSpace = (config: Record<string, any>) => Math.max(0, Number(config.header_space ?? LAYOUT.main.header_space.default) || 0);

/** HA's card grid row and its gap, px (its theme's --ha-section-grid-row-height, -row-gap):
 * a section's row_span is that many. */
export const [ROW, ROW_GAP] = [56, 8];

export const DIMS = "casa-mia-tablet-dimensions"; // localStorage: "off" hides the dimension lines
// mdi lock, lock-open: an edge's end to its side (anchored), or not.
export const LOCKED =
  "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z";
export const UNLOCKED =
  "M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17Z";

/** How tall a section's cards are, laid out at its width (HA's grid in the section). */
export function cardsHeight(section: any): number {
  const grid = section?.querySelector("hui-grid-section") as HTMLElement | null;
  return (grid?.shadowRoot?.querySelector(".container") as HTMLElement | null)?.offsetHeight ?? 0;
}
