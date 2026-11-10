// HA's screen-condition editor, with orientation beside its own width controls.
import { html } from "lit";
import { whenConnected } from "./connection.ts";
import { fire, warnOnce } from "./ha.ts";

type Orientation = "any" | "portrait" | "landscape";

const SCHEMA = [{
  name: "orientation",
  selector: { select: { mode: "dropdown", options: [
    { value: "any", label: "Any" },
    { value: "portrait", label: "Portrait" },
    { value: "landscape", label: "Landscape" },
  ] } },
}];

/** Only recognise orientation alone or the suffix this editor adds to every width range. */
export function screenParts(query = ""): { width: string; orientation: Orientation } {
  const parts = query.split(",").map((part) => part.trim().match(/^(?:(.+) and )?\(orientation:\s*(portrait|landscape)\)$/));
  const orientation = parts[0]?.[2] as Orientation | undefined;
  if (!orientation || parts.some((part) => !part || part[2] !== orientation) || (parts.length > 1 && parts.some((part) => !part?.[1])))
    return { width: query, orientation: "any" };
  return { width: parts.map((part) => part![1] ?? "").join(", "), orientation };
}

export function screenQuery(width: string, orientation: Orientation = "any"): string {
  if (orientation === "any") return width;
  const suffix = `(orientation: ${orientation})`;
  return width ? width.split(",").map((part) => `${part.trim()} and ${suffix}`).join(", ") : suffix;
}

let enabled = false; // wait for the integration's settings, including its default-on value

customElements.whenDefined("ha-card-condition-screen").then(() => {
  const cls = customElements.get("ha-card-condition-screen") as any;
  const proto = cls.prototype;
  const render = proto.render;
  const changed = proto._valueChanged;
  const validate = cls.validateUIConfig;
  if (typeof render !== "function" || typeof changed !== "function" || typeof validate !== "function") {
    warnOnce("screen orientation: Home Assistant's screen editor changed; not available");
    return;
  }

  cls.validateUIConfig = function (condition: any, hass: any) {
    const width = enabled ? screenParts(condition.media_query).width : condition.media_query;
    return validate.call(this, { ...condition, media_query: width }, hass);
  };

  proto.render = function (this: any) {
    if (!enabled) return render.call(this);
    const { width, orientation } = screenParts(this.condition.media_query);
    // Give HA its width-only condition without changing the reactive element's saved value.
    const native = Object.create(this, { condition: { value: { ...this.condition, media_query: width } } });
    return html`${render.call(native)}
      <ha-form
        style="display: block; margin-top: 16px"
        .hass=${this.hass}
        .data=${{ orientation }}
        .schema=${SCHEMA}
        .disabled=${this.disabled}
        .computeLabel=${() => "Orientation"}
        .computeHelper=${() => "The selected screen widths must also match this orientation. Leave widths unselected for any width."}
        @value-changed=${(ev: CustomEvent) => {
          ev.stopPropagation();
          if (!enabled) return;
          fire(this, "value-changed", { value: {
            ...this.condition,
            media_query: screenQuery(width, ev.detail.value.orientation),
          } });
        }}
      ></ha-form>`;
  };

  proto._valueChanged = function (this: any, ev: CustomEvent) {
    if (!enabled) return changed.call(this, ev);
    const { orientation } = screenParts(this.condition.media_query);
    // HA builds the width query; its outgoing event keeps the selected orientation too.
    const native = Object.create(this, { dispatchEvent: { value: (out: CustomEvent) => {
      out.detail.value = {
        ...this.condition,
        ...out.detail.value,
        media_query: screenQuery(out.detail.value.media_query, orientation),
      };
      return this.dispatchEvent(out);
    } } });
    return changed.call(native, ev);
  };
});

// shortcut: follows the current integration, reopen the page after an integration reload.
whenConnected("screen orientation conditions", ({ conn }) =>
  conn.subscribeMessage((settings: any) => {
    const on = !!settings?.dashboards && settings.dashboards.screen_orientation !== false;
    if (on !== enabled) console.info(`CASA-MIA CARDS: screen orientation conditions ${on ? "on" : "off"}`);
    enabled = on;
  }, { type: "casa_mia/settings/subscribe" }).catch((err: unknown) => {
    enabled = false;
    console.warn("CASA-MIA CARDS: screen orientation settings unavailable", err);
  }),
);
