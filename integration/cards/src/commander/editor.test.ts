import assert from "node:assert/strict";
import test from "node:test";
import { CommanderEditor } from "./editor.ts";

function forms(template: any): any[] {
  if (!template?.strings) return [];
  if (template.strings.some((part: string) => part.includes("<ha-form"))) {
    const [className, , data, schema] = template.values;
    return [{ className, data, schema, save: template.values.at(-1) }];
  }
  return template.values.flatMap((value: any) => Array.isArray(value) ? value.flatMap(forms) : forms(value));
}

/** A field's helper text, as the form would show it. */
function helperOf(editor: CommanderEditor, name: string): string {
  const find = (template: any): any =>
    !template?.strings ? undefined
    : template.strings.some((part: string) => part.includes("<ha-form")) ? template.values[5]
    : template.values.map((v: any) => (Array.isArray(v) ? v.map(find).find(Boolean) : find(v))).find(Boolean);
  return find(editor.render())({ name });
}

function names(editor: CommanderEditor): string[] {
  const fields = (schema: any[]): string[] => schema.flatMap((field) => field.schema ? fields(field.schema) : [field.name]);
  return forms(editor.render()).flatMap((form) => fields(form.schema));
}

function editor(config: object = {}) {
  const value = new CommanderEditor();
  value.hass = { states: {}, callService: async () => undefined };
  value.setConfig({ type: "custom:casa-mia-commander", ...config });
  value.dispatchEvent = () => true;
  return value;
}

test("security details follow their switch and motion defaults remain visible", () => {
  const value = editor();
  assert.ok(names(value).includes("security_look"));
  assert.ok(!names(value).includes("look_tint"));
  assert.ok(names(value).includes("motion_colour"));

  value.setConfig({ type: "custom:casa-mia-commander", security_look: true, motion_dot: false });
  assert.ok(names(value).includes("look_tint"));
  assert.ok(names(value).includes("look_strength"));
  assert.ok(names(value).includes("look_darkness"));
  assert.ok(names(value).includes("motion_dot"));
  for (const name of ["motion_colour", "motion_pulse", "motion_linger", "motion_corner"])
    assert.ok(!names(value).includes(name), name);
});

/** Every template under one, in order, for finding a part by its markup. */
function templates(template: any): any[] {
  if (!template?.strings) return Array.isArray(template) ? template.flatMap(templates) : [];
  return [template, ...template.values.flatMap(templates)];
}
const keepsPlace = (value: CommanderEditor) =>
  (value.hass!.states["select.oak_commander"] = { state: "", attributes: { card: { layout: { mode: "responsive", responsive: { card_place: true } } } } });

test("the last place's cards are edited only where the commander keeps the place", () => {
  const none = editor({ entity: "select.oak_commander", card: { type: "clock" } });
  const text = templates(none.render()).map((t) => t.strings.join("")).join("");
  assert.match(text, /keeps no last place/);
  assert.doesNotMatch(text, /casa-mia-cards-editor/);
  assert.ok(!names(none).includes("card"), "no YAML field any more");

  const keeps = editor({ entity: "select.oak_commander", card: { type: "clock" } });
  keepsPlace(keeps);
  const list = templates(keeps.render()).find((t) => t.strings.join("").includes("<casa-mia-cards-editor"));
  assert.ok(list);
  assert.deepEqual(list.values[2], [{ type: "clock" }]); // b19's one card, as a list of one

  // the list is saved as `cards`, and b19's `card` goes
  list.values.at(-1)(new CustomEvent("value-changed", { detail: { value: [{ type: "alerts" }, { type: "clock" }] } }));
  assert.deepEqual(keeps._config!.cards, [{ type: "alerts" }, { type: "clock" }]);
  assert.equal(keeps._config!.card, undefined);
  const again = templates(keeps.render()).find((t) => t.strings.join("").includes("<casa-mia-cards-editor"));
  again.values.at(-1)(new CustomEvent("value-changed", { detail: { value: [] } }));
  assert.ok(!("cards" in keeps._config!), "an empty list is no option");
});

test("the commander sits above the sections, each a panel that starts collapsed", () => {
  const value = editor({ entity: "select.oak_commander", security_look: true });
  assert.deepEqual(forms(value.render())[0].schema.map((field: any) => field.name), ["entity"]);
  const panels = templates(value.render()).filter((t) => t.strings[0].includes("<ha-expansion-panel"));
  assert.deepEqual(panels.map((t) => t.values[0]), ["View", "Behaviour", "Intercom", "Notifications", "Last place"]);
  for (const panel of panels) assert.doesNotMatch(panel.strings.join(""), /expanded/, "never bound: each keeps its own open state");
  const inside = (title: string) => {
    const panel = panels.find((t) => t.values[0] === title);
    return forms(panel.values[1]).flatMap((form) => form.schema.map((field: any) => field.name));
  };
  assert.deepEqual(inside("View"), ["live_main", "security_look", "look_tint", "look_strength", "look_darkness"]);
  assert.deepEqual(inside("Behaviour"), ["tap_main", "main_controls", "sound_button", "screen_button"]);
  assert.deepEqual(inside("Intercom"), ["talk_button", "duplex"]);
  assert.deepEqual(inside("Notifications"), ["motion_dot", "motion_colour", "motion_pulse", "motion_linger", "motion_corner"]);
});

test("only a forced direct route hides sharpness; talking mode stays with custom buttons", () => {
  for (const route of [undefined, "auto", "ha", "direct"]) {
    const value = editor({ route, talk_button: false, live_main: false });
    assert.equal(names(value).includes("away_sharpness"), route !== "direct");
    assert.ok(names(value).includes("duplex"));
    assert.ok(names(value).includes("leave_after"));
    const connection = forms(value.render()).find((form) => form.schema[0].title === "Connection and performance").schema[0];
    assert.equal(connection.type, "expandable", "drawing this group is what loads ha-expansion-panel for the other panels");
    assert.equal(connection.expanded, undefined, "connection settings start collapsed");
    assert.equal(connection.flatten, true, "group must not change the saved config shape");
  }
});

test("switching options off and back on preserves hidden values and other card settings", () => {
  const config = {
    type: "custom:casa-mia-commander", entity: "select.oak_commander",
    security_look: true, look_tint: [12, 34, 56], look_strength: 4, look_darkness: 42,
    motion_colour: [65, 43, 21], motion_pulse: 2, motion_linger: 25, motion_corner: "bottom-left",
    away_sharpness: "light", grid_options: { rows: 4 },
  };
  const value = editor(config);
  const save = (change: object) => forms(value.render())[0].save(new CustomEvent("value-changed", { detail: { value: change } }));
  save({ security_look: false, motion_dot: false, route: "direct" });
  assert.ok(!names(value).includes("look_tint"));
  assert.ok(!names(value).includes("motion_colour"));
  assert.ok(!names(value).includes("away_sharpness"));
  save({ security_look: true, motion_dot: true, route: "auto" });
  assert.deepEqual(value._config, config);
});

test("colour selectors have their own compact cell with adjustments in a separate form", () => {
  const value = editor({ security_look: true });
  const controls = forms(value.render());
  assert.deepEqual(controls.filter((form) => form.className === "colour").map((form) => form.schema.map((field: any) => field.name)), [["look_tint"], ["motion_colour"]]);
  assert.equal(controls.filter((form) => form.className === "adjustments").length, 2);
  assert.deepEqual(controls.filter((form) => form.className === "adjustments")[1].schema.map((field: any) => field.name),
    ["motion_pulse", "motion_linger", "motion_corner"]);
});
