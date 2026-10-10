// Garnish in every section of every Sections dashboard, while the Casa Mia panel's
// Settings page has "Enable garnish on all section dashboards" on (dashboards.
// garnish_everywhere, through the integration). Home Assistant already hides a section whose
// content is all hidden (hui-section's _updateVisibility); this adds that garnish doesn't
// count, so a section left with only garnish showing hides too. A Tablet Layout's panels keep
// their own rule (view.ts), and edit mode (HA's preview) shows every section, as HA does.
// Leans on HA's frontend (a private method): if it is gone, this says so and does nothing.
import { inTablet, onlyGarnish } from "./garnish.ts";

let everywhere = false;
const seen = new Set<any>(); // the sections drawn, to look again when the switch changes

/** Whether garnish is on for every Sections dashboard (the sprig shows outside a Tablet
 * Layout too). */
export const garnishEverywhere = () => everywhere;

customElements.whenDefined("hui-section").then(() => {
  const proto = (customElements.get("hui-section") as any).prototype;
  const original = proto._updateVisibility;
  if (typeof original !== "function" || typeof proto._setElementVisibility !== "function") {
    console.warn("CASA-MIA CARDS: garnish on all section dashboards: this Home Assistant's sections changed; not available");
    return;
  }
  proto._updateVisibility = function (this: any, ...args: unknown[]) {
    this.cmGarnishHidden = false; // set while this hides it, so others can tell (an Over layer)
    original.apply(this, args);
    if (seen.size > 200) for (const s of seen) if (!s.isConnected) seen.delete(s);
    seen.add(this);
    if (!everywhere || this.hidden || this.preview || !this._config || inTablet(this)) return;
    if (onlyGarnish([...(this._cards ?? []), ...(this._badges ?? []), ...(this._sections ?? [])])) {
      this.cmGarnishHidden = true;
      this._setElementVisibility(false);
    }
  };
});

function set(on: boolean) {
  if (on === everywhere) return;
  everywhere = on;
  console.info(`CASA-MIA CARDS: garnish on all section dashboards ${on ? "on" : "off"}`);
  for (const s of seen) {
    if (s.isConnected) s._updateVisibility(); // HA decides afresh, then garnish (above)
    else seen.delete(s);
  }
}

// The app's settings, now and at each change (none without the integration: off).
// ponytail: the subscription follows the integration as it was when the page opened; after
// an integration reload a page picks up a change at its next load.
(window as any).hassConnection?.then(({ conn }: any) =>
  conn
    .subscribeMessage((s: any) => set(!!s?.dashboards?.garnish_everywhere), { type: "casa_mia/settings/subscribe" })
    .catch(() => set(false)),
);
