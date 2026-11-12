/** Sensor Watch's panel in Home Assistant's sidebar: the element Home Assistant creates
 * (the integration's panel.py names it), inside an iframe of its own, and gives `hass`.
 * Built apart from the app's admin page (vite.panel.config.ts) into the integration's
 * sensor_watch/www. */

// First, so the page's own rules (bundled after) refine the shared pills and chips.
import "../pills.css";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Asks } from "../confirm";
import "../styles.css";
import { connect, type Home } from "./ha";
import { SensorWatchPage } from "./page";

// The build's one stylesheet, beside this file; it keeps this file's ?v=<version>, so
// an update isn't drawn with the last version's styles.
const styled = new Promise<void>((done) => {
  const sheet = document.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = import.meta.url.replace("panel.js", "panel.css");
  sheet.onload = () => done();
  sheet.onerror = () => {
    console.error(`Sensor Watch: its styles didn't load (${sheet.href}); drawn without them`);
    done();
  };
  document.head.append(sheet);
});

type Hass = Home & { dockedSidebar?: string };

class Panel extends HTMLElement {
  private root?: Root;
  private menu = false; // show a button for Home Assistant's sidebar (it is hidden)
  private isNarrow = false;
  private docked?: string;

  // Set at every state change in Home Assistant: only its connection, its services (read
  // when the set-up asks) and the sidebar's setting are used, so nothing is drawn again
  // for the rest.
  set hass(hass: Hass) {
    connect(hass);
    this.docked = hass.dockedSidebar;
    this.draw();
  }

  set narrow(narrow: boolean) {
    this.isNarrow = narrow;
    this.draw();
  }

  // Set when Home Assistant's address changes: the eye may have asked for a watch.
  set route(_route: unknown) {
    this.draw(true);
  }

  set panel(_panel: unknown) {}

  connectedCallback() {
    styled.then(() => {
      if (!this.isConnected) return;
      this.root = createRoot(this);
      this.draw(true);
    });
  }

  // Home Assistant takes the panel away when another page is opened, and when the tab
  // has been hidden a while: the page's feeds end with it.
  disconnectedCallback() {
    this.root?.unmount();
    this.root = undefined;
  }

  private draw(again = false) {
    const menu = this.isNarrow || this.docked === "always_hidden";
    if (!this.root || (!again && menu === this.menu)) return;
    this.menu = menu;
    // Home Assistant's address, not this iframe's (which never changes).
    const asked = new URLSearchParams(window.parent.location.search);
    this.root.render(
      <StrictMode>
        <SensorWatchPage
          menu={menu ? () => this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true })) : undefined}
          watch={asked.get("watch") ?? undefined}
          at={asked.get("at") ?? undefined}
        />
        <Asks />
      </StrictMode>,
    );
  }
}

customElements.define("casa-mia-sensor-watch-panel", Panel);
