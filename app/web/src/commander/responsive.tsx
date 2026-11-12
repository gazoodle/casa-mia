/** A Responsive commander's settings: its cameras, one list in the order the tiles fill,
 * and the limits its layout is worked out within (docs/design/commander-responsive-layout.md).
 * The labels, help, ranges and defaults are layout.json's, as the engines' are. */

import { Camera, Thumb, plural } from "../cameras";
import { confirmBox } from "../confirm";
import { Slider } from "../controls";
import { Field, Segmented, Switch } from "../ui";
import css from "../cameras.module.css";
import ui from "../ui.module.css";
import { Commander, Edge, R, RESPONSIVE, Responsive } from "./common";
import { Chips } from "./inputs";

/** The most cameras a Responsive commander holds (the app's checks say the same). */
const MOST_CAMERAS = 32;
const EDGE_NAMES: Record<Edge, string> = { bottom: "Bottom", right: "Right", left: "Left", top: "Top" };
const EDGES = Object.keys(EDGE_NAMES) as Edge[];
type Limit = "main_least" | "main_most" | "tile_loss" | "tile_min";
type Choice = "tile_shape" | "main_other" | "cant_fit";

/** A commander's Responsive settings, every one present (a commander saved before the
 * mode has none). */
export const responsiveOf = (c: Commander): Responsive => ({ ...RESPONSIVE, ...c.responsive });

/** The edges tiles go on, as chips: in the list is in use, and their order is the order
 * they fill. */
function Edges({ label, help, value, onChange }: { label: string; help: string; value: Edge[]; onChange: (edges: Edge[]) => void }) {
  return (
    <Field label={label} help={help}>
      <Chips
        items={value}
        label={(e) => EDGE_NAMES[e as Edge] ?? e}
        thumb={() => null}
        choices={EDGES.filter((e) => !value.includes(e))}
        onChange={(items) => onChange(items as Edge[])}
      />
    </Field>
  );
}

export function ResponsiveSettings({
  value,
  cameras,
  hidden,
  onChange,
}: {
  value: Commander;
  cameras: Record<string, Camera>;
  /** The cameras there is no room for at the stage's size now. */
  hidden: string[];
  onChange: (r: Responsive) => void;
}) {
  const r = responsiveOf(value);
  const set = (change: Partial<Responsive>) => onChange({ ...r, ...change });
  const title = (e: string) => cameras[e]?.title ?? e;
  const unit = (key: Limit) => (key === "tile_min" ? " px" : "%");

  const limit = (key: Limit, also: (n: number) => Partial<Responsive> = () => ({})) => (
    <Field label={R[key].label.split(",")[0]} help={`${R[key].help} At first: ${R[key].default}${unit(key)}.`}>
      <Slider value={r[key]} min={R[key].min} max={R[key].max} format={(n) => `${n}${unit(key)}`} onChange={(n) => set({ [key]: n, ...also(n) })} />
    </Field>
  );
  const choice = (key: Choice) => (
    <Field label={R[key].label} help={`${R[key].help} At first: ${R[key].options.find(([v]) => v === R[key].default)?.[1]}.`}>
      <Segmented value={r[key]} options={R[key].options as [string, string][]} onChange={(v) => set({ [key]: v })} />
    </Field>
  );
  const reset = async () =>
    (await confirmBox("Put every Responsive setting back to what it was at first?\nIts cameras and their order stay as they are.", { action: "Reset" })) &&
    onChange({ ...RESPONSIVE, cameras: r.cameras });

  return (
    <div className={css.panels}>
      <div className={css.overview}>
        <header className={css.panelHead}>
          <h3>Cameras</h3>
          <span className={css.muted}>
            {plural(r.cameras.length, "camera")}, in the order their tiles fill. The last are the first to go into +n more.
          </span>
        </header>
        <Chips
          items={r.cameras}
          label={title}
          thumb={(e) => <Thumb entity={e} />}
          choices={r.cameras.length < MOST_CAMERAS ? Object.keys(cameras).filter((e) => !r.cameras.includes(e)) : []}
          onChange={(items) => set({ cameras: items })}
        />
        {r.cameras.length >= MOST_CAMERAS && <p className={css.hint}>A Responsive commander holds {MOST_CAMERAS} cameras at most.</p>}
        {hidden.length > 0 && (
          <p className={css.hint}>
            At the preview's size there is no room for {hidden.map(title).join(", ")}: {hidden.length === 1 ? "it is" : "they are"} in +{hidden.length} more.
          </p>
        )}
      </div>

      <section className={`${css.options} ${css.responsive}`}>
        <h4 className={css.sub}>The main camera</h4>
        {/* its least never above its most: each pushes the other */}
        {limit("main_least", (n) => (n > r.main_most ? { main_most: n } : {}))}
        {limit("main_most", (n) => (n < r.main_least ? { main_least: n } : {}))}
        {choice("main_other")}
      </section>

      <section className={`${css.options} ${css.responsive}`}>
        <h4 className={css.sub}>The tiles</h4>
        {limit("tile_loss")}
        {limit("tile_min")}
        {choice("tile_shape")}
      </section>

      <section className={`${css.options} ${css.responsive}`}>
        <h4 className={css.sub}>Where the tiles go</h4>
        <Edges
          label={R.edges.label}
          help={`${R.edges.help} An edge in the list is used whenever there are tiles for it. At first: ${R.edges.default.map((e) => EDGE_NAMES[e as Edge]).join(", ")}.`}
          value={r.edges}
          onChange={(edges) => set({ edges })}
        />
        <Field label={R.edges_tall.label} help={R.edges_tall.help}>
          <Switch
            on={r.edges_tall !== null}
            label={R.edges_tall.label}
            onChange={(on) => set({ edges_tall: on ? [...r.edges] : null })} // it starts as the first list
          />
        </Field>
        {r.edges_tall !== null && (
          <Edges
            label="Edges when the space is taller than wide"
            help="Used in place of the list above in a tall space, such as a phone held upright."
            value={r.edges_tall}
            onChange={(edges_tall) => set({ edges_tall })}
          />
        )}
        {choice("cant_fit")}
      </section>

      <div className={css.actions}>
        <button className={ui.button} onClick={reset} title="Every Responsive setting back to what it was at first; the cameras stay">
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
