// Dress HA's card edit frame only for cards in a Tablet Layout panel.
import { counts, cardPath, inTablet, setGarnish } from "./garnish.ts";
import { garnishEverywhere } from "./garnish-sections.ts";
import { HOVER } from "./ha.ts";

// The sprig sits on the card's bottom-right border, clear of headings (which start top
// left), HA's card menu (top right) and the panel's toolbar: out of the way of what is arranged,
// styled as the view's padlocks (outlined off, filled on); garnish also dashes the card's
// outline and dims it, so which cards never hold a panel open shows at a glance (a word
// beside the sprig covered short headings in narrow panels). The tooltip says what each means.
const LEAF =
  "M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z";
const TIP = {
  content: "Content: while this card shows, its panel shows. Tap to make it garnish.",
  garnish: "Garnish: adornment, like a heading, that never holds its panel open; the panel hides when only garnish is left. Tap to make it content.",
};
const STYLE = new CSSStyleSheet();
STYLE.replaceSync(`
  .cm-garnish {
    position: absolute; bottom: -13px; right: 4px; z-index: 3;
    padding: 0; border: none; background: none; cursor: pointer;
  }
  .cm-garnish .cm-sprig {
    display: block; box-sizing: border-box; width: 26px; height: 26px; padding: 4px; border-radius: 50%;
    border: 1px solid var(--primary-color); color: var(--primary-color);
    background: var(--card-background-color, #fff); opacity: 0.6;
    transition: opacity 0.15s, box-shadow 0.15s, filter 0.15s;
  }
  .cm-garnish:hover .cm-sprig, .cm-garnish:focus-visible .cm-sprig { opacity: 1; ${HOVER} }
  .cm-garnish svg { display: block; width: 16px; height: 16px; fill: currentColor; }
  .cm-garnish[aria-pressed="true"] .cm-sprig { opacity: 1; color: var(--text-primary-color, #fff); background: var(--primary-color); }
  .cm-garnish-frame {
    position: absolute; inset: 0; z-index: 2; pointer-events: none;
    border: 2px dashed var(--primary-color); border-radius: var(--ha-card-border-radius, 12px);
  }
  :host(.cm-garnished) ::slotted(*) { opacity: 0.55; }
`);

customElements.whenDefined("hui-card-edit-mode").then(() => {
  const proto = (customElements.get("hui-card-edit-mode") as any).prototype;
  const updated = proto.updated;
  proto.updated = function (this: any, ...args: unknown[]) {
    updated?.apply(this, args);
    const root = this.shadowRoot as ShadowRoot | null;
    if (!root) return;
    let chip = root.querySelector<HTMLButtonElement>(".cm-garnish");
    // In a Tablet Layout's panels, or any section while garnish is on for every dashboard.
    const tablet = garnishEverywhere() || inTablet(this);
    const path = cardPath(this.path ?? []);
    const get = (config: any) => path.reduce((value, key) => value?.[key], config);
    const card = get(this.lovelace?.config);
    if (!tablet || !this.lovelace?.editMode || this.noEdit || !path.includes("sections") || !card?.type) {
      this.classList.remove("cm-garnished");
      root.querySelector(".cm-garnish-frame")?.remove();
      return chip?.remove();
    }
    if (!root.adoptedStyleSheets.includes(STYLE)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, STYLE];
    if (!chip) {
      chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cm-garnish";
      chip.innerHTML = `<span class="cm-sprig"><svg viewBox="0 0 24 24"><path d="${LEAF}"/></svg></span>`;
      chip.addEventListener("pointerdown", (ev) => ev.stopPropagation()); // no card drag on a tap
      chip.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        chip!.disabled = true;
        try {
          const config = structuredClone(this.lovelace.config);
          const keys = cardPath(this.path);
          const parent = keys.slice(0, -1).reduce((value: any, key) => value[key], config);
          const key = keys[keys.length - 1];
          const on = counts(parent[key]);
          parent[key] = setGarnish(parent[key], on);
          await this.lovelace.saveConfig(config);
          console.info(`CASA-MIA CARDS: panel card marked ${on ? "Garnish" : "Content"}`);
        } catch (err) {
          console.error("CASA-MIA CARDS: could not save Garnish", err);
          this.dispatchEvent(new CustomEvent("hass-notification", { detail: { message: "Could not save Garnish. Please try again." }, bubbles: true, composed: true }));
        } finally {
          chip!.disabled = false;
          this.requestUpdate();
        }
      });
      root.append(chip); // outside Lit's part, as the view's panel chips
    }
    const garnish = !counts(card);
    chip.setAttribute("aria-pressed", String(garnish));
    chip.title = TIP[garnish ? "garnish" : "content"];
    chip.setAttribute("aria-label", chip.title);
    this.classList.toggle("cm-garnished", garnish);
    let frame = root.querySelector(".cm-garnish-frame");
    if (garnish && !frame) {
      frame = document.createElement("div");
      frame.className = "cm-garnish-frame";
      root.append(frame);
    } else if (!garnish) frame?.remove();
  };
});
