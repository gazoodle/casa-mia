// Casa Mia's Lovelace cards, one file (cm-cards.js) the integration loads into every HA page:
// Camera Commander, Section, Tablet Layout. Source of the built www/cm-cards.js.
import "./section.ts";
import { VERSION } from "./commander.ts";
import "./view.ts";

console.info(
  `%cCASA-MIA CARDS\n%ccommander, section, tablet layout (${VERSION})`,
  "color: green; font-weight: bold;",
  "",
);

// A page open since before an update keeps running the old cards (HA loads each script
// once per page), which looks like a bug that isn't there. So at each reconnect (HA
// restarts after an update) ask which cards HA serves now and, if they're newer, offer a
// reload in HA's own toast, as HA does for its own frontend. Not in development (no ?v=).
if (VERSION !== "dev")
  (window as any).hassConnection?.then(({ conn }: any) => {
    const check = () =>
      conn.sendMessagePromise({ type: "casa_mia/cards" }).then(({ version }: { version: string | null }) => {
        if (!version || version === VERSION) return;
        console.warn(`CASA-MIA CARDS ${VERSION} running, ${version} served: reload to update`);
        document.querySelector("home-assistant")?.dispatchEvent(
          new CustomEvent("hass-notification", {
            detail: {
              message: `Casa Mia updated to ${version}: reload to use it`,
              duration: -1,
              dismissable: true,
              action: { text: "Reload", action: () => location.reload() },
            },
            bubbles: true,
            composed: true,
          }),
        );
      }, () => {}); // an older integration without the command: nothing to compare
    conn.addEventListener("ready", check);
  });
