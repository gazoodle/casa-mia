/** How a commander's camera names are drawn, and where its Talk chips go over the main
 * camera: one box of settings (the compositor's labels.py draws the names; the card and
 * the preview draw theirs from integration/cards/src/labels.ts). The labels, help,
 * ranges and defaults are labels.json's. */

import { DEFAULTS, OPTIONS, labelsOf, useFont, type Labels } from "../../../../integration/cards/src/labels.ts";
import { confirmBox } from "../confirm";
import { Select, Slider } from "../controls";
import { Field, Segmented, Switch } from "../ui";
import css from "../cameras.module.css";
import ui from "../ui.module.css";
import { Commander } from "./common";

/** Have the page load a commander's label font (the preview draws its names in it): the
 * app serves the one copy the compositor draws with. */
export const usePageFont = (font: string) => useFont(font, (file) => `api/compositor/font/${file}`);

type Key = keyof Labels;
const first = (key: Key) => {
  const o = OPTIONS[key] as { default: unknown; options?: string[][] };
  return o.options?.find(([v]) => v === o.default)?.[1] ?? String(o.default);
};
const help = (key: Key) => `${OPTIONS[key].help} At first: ${first(key)}.`;

export function LabelSettings({
  value,
  talkShown,
  onTalkShown,
  onChange,
}: {
  value: Commander;
  /** Whether the preview shows where the Talk chips go (the page's own, not saved). */
  talkShown: boolean;
  onTalkShown: (on: boolean) => void;
  onChange: (labels: Labels) => void;
}) {
  const l = labelsOf(value.labels);
  const set = (change: Partial<Labels>) => onChange({ ...l, ...change });

  const size = (key: "tile_size" | "main_size" | "opacity" | "talk_status_x" | "talk_status_y" | "talk_buttons_x" | "talk_buttons_y") => (
    <Field label={OPTIONS[key].label.replace(/, (px|%)$/, "")} help={help(key)}>
      <Slider value={l[key]} min={OPTIONS[key].min} max={OPTIONS[key].max} format={(n) => `${n}${key === "opacity" ? "%" : " px"}`} onChange={(n) => set({ [key]: n })} />
    </Field>
  );
  const colour = (key: "colour" | "tint") => (
    <Field label={OPTIONS[key].label} help={help(key)}>
      <input type="color" className={css.colour} value={l[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </Field>
  );
  const style = (key: "tile_style" | "main_style") => (
    <Field label={OPTIONS[key].label} help={help(key)}>
      <Segmented value={l[key]} options={OPTIONS[key].options as [string, string][]} onChange={(v) => set({ [key]: v as Labels[typeof key] })} />
    </Field>
  );
  const pick = (key: "font" | "talk_status" | "talk_buttons") => (
    <Field label={OPTIONS[key].label} help={help(key)}>
      <Select value={l[key]} onChange={(v) => set({ [key]: v })}>
        {OPTIONS[key].options.map(([v, name]) => (
          <option key={v} value={v}>
            {name}
          </option>
        ))}
      </Select>
    </Field>
  );
  const reset = async () => (await confirmBox("Put every label setting back to what it was at first?", { action: "Reset" })) && onChange({ ...DEFAULTS });

  return (
    <section className={`${css.options} ${css.responsive} ${css.wide}`}>
      <h4 className={css.sub}>Camera names</h4>
      {pick("font")}
      {size("tile_size")}
      {size("main_size")}
      {style("tile_style")}
      {style("main_style")}
      {colour("colour")}
      {colour("tint")}
      {size("opacity")}
      <h4 className={css.sub}>Talk, over the main camera</h4>
      {pick("talk_status")}
      {size("talk_status_x")}
      {size("talk_status_y")}
      {pick("talk_buttons")}
      {size("talk_buttons_x")}
      {size("talk_buttons_y")}
      <Field label="In the preview" help="Shows a call's state and the Talk button on the Any size preview, where these settings put them. Only on this page: nothing is saved.">
        <Switch on={talkShown} label="Show where they go" onChange={onTalkShown} />
      </Field>
      <div className={`${css.actions} ${css.wide}`}>
        <button className={ui.button} onClick={reset} title="Every label setting back to what it was at first">
          Reset to defaults
        </button>
      </div>
    </section>
  );
}
