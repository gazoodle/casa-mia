import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

const WIDTHS: Record<string, string> = {
  "": "",
  mobile: "(min-width: 0px) and (max-width: 767px)",
  tablet: "(min-width: 768px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px) and (max-width: 1279px)",
  "mobile,desktop": "(min-width: 0px) and (max-width: 767px), (min-width: 1024px) and (max-width: 1279px)",
};

// HA's native contract: render reads condition, validation recognises its width queries,
// and the width handler stops the form event and dispatches a condition event.
class ScreenEditor extends EventTarget {
  condition: any = { condition: "screen", media_query: "" };
  hass = {};
  disabled = false;

  static validateUIConfig(condition: any) {
    if (!Object.values(WIDTHS).includes(condition.media_query)) throw new Error("Unsupported query");
  }

  render(): any {
    return { query: this.condition.media_query, disabled: this.disabled };
  }

  _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this.dispatchEvent(new CustomEvent("value-changed", { detail: { value: {
      condition: "screen", media_query: WIDTHS[ev.detail.value.breakpoints.join(",")],
    } }, bubbles: true, composed: true }));
  }
}

let settingsChanged: (settings: any) => void;
let subscribed: unknown;
(globalThis as any).customElements = {
  whenDefined: () => Promise.resolve(),
  get: () => ScreenEditor,
};
(globalThis as any).window = { hassConnection: Promise.resolve({ conn: {
  subscribeMessage(callback: typeof settingsChanged, command: unknown) {
    settingsChanged = callback;
    subscribed = command;
    return Promise.resolve();
  },
} }) };
const { screenParts, screenQuery } = await import("./screen-condition.ts");
await new Promise((done) => setImmediate(done));

beforeEach(() => settingsChanged({ dashboards: { screen_orientation: true } }));

test("orientation alone and with every clause of a disjoint width query round-trip", () => {
  assert.deepEqual(subscribed, { type: "casa_mia/settings/subscribe" });
  for (const width of Object.values(WIDTHS)) {
    for (const orientation of ["any", "portrait", "landscape"] as const) {
      const query = screenQuery(width, orientation);
      assert.deepEqual(screenParts(query), { width, orientation });
      ScreenEditor.validateUIConfig({ media_query: query });
      const editor = new ScreenEditor();
      editor.condition.media_query = query;
      assert.equal(editor.render().values[0].query, width);
      assert.equal(editor.condition.media_query, query, "render must not change saved data");
    }
  }
  assert.equal(screenQuery("", "portrait"), "(orientation: portrait)");
});

test("custom queries and mixed orientations retain HA's YAML fallback", () => {
  for (const query of [
    "(prefers-color-scheme: dark)",
    "(orientation: portrait), (orientation: landscape)",
    "(min-width: 768px) and (orientation: portrait), (max-width: 767px)",
    "(orientation: portrait) or (min-width: 768px)",
    "(pointer: coarse) and (orientation: portrait)",
  ]) {
    assert.throws(() => ScreenEditor.validateUIConfig({ media_query: query }), /Unsupported query/);
  }
});

test("changing native widths keeps orientation and other condition fields", () => {
  const editor = new ScreenEditor();
  editor.condition = { condition: "screen", media_query: "(orientation: portrait)", alias: "Tablet", enabled: false };
  let saved: any;
  editor.addEventListener("value-changed", (ev: any) => { saved = ev.detail.value; });
  const event = new CustomEvent("value-changed", { detail: { value: { breakpoints: ["mobile", "desktop"] } } });
  editor._valueChanged(event);
  assert.equal(event.cancelBubble, true);
  assert.deepEqual(saved, { ...editor.condition, media_query: screenQuery(WIDTHS["mobile,desktop"], "portrait") });
  editor.condition = saved;
  editor._valueChanged(new CustomEvent("value-changed", { detail: { value: { breakpoints: [] } } }));
  assert.equal(saved.media_query, "(orientation: portrait)");
});

test("orientation control changes orientation and Any retains the selected widths", () => {
  const editor = new ScreenEditor();
  editor.disabled = true;
  editor.condition = { condition: "screen", media_query: screenQuery(WIDTHS.tablet, "portrait"), alias: "Tablet" };
  const template = editor.render();
  assert.equal(template.values[0].disabled, true);
  assert.ok(template.values.includes(true), "orientation control inherits disabled");
  const change = template.values.at(-1);
  let saved: any;
  editor.addEventListener("value-changed", (ev: any) => { saved = ev.detail.value; });
  for (const orientation of ["landscape", "any", undefined] as const) {
    change(new CustomEvent("value-changed", { detail: { value: { orientation } } }));
    assert.deepEqual(saved, { ...editor.condition, media_query: screenQuery(WIDTHS.tablet, orientation) });
  }
});

test("off restores native editor and validation without changing saved queries; missing setting defaults on", () => {
  const editor = new ScreenEditor();
  editor.condition.media_query = "(orientation: portrait)";
  settingsChanged({ dashboards: { screen_orientation: false } });
  assert.equal(editor.render().query, "(orientation: portrait)");
  assert.throws(() => ScreenEditor.validateUIConfig(editor.condition), /Unsupported query/);
  assert.equal(editor.condition.media_query, "(orientation: portrait)");
  settingsChanged({ dashboards: {} });
  ScreenEditor.validateUIConfig(editor.condition);
  settingsChanged({}); // no running integration
  assert.throws(() => ScreenEditor.validateUIConfig(editor.condition), /Unsupported query/);
});
