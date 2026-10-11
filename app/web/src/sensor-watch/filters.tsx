/** The filters a big house needs: a search (names, entity ids and device names), then
 * area, label, integration, device, device class and kind, each offering only what some
 * sensor has; the devices only those matching the other filters. */

import type { Filters, Options } from "./common";
import css from "./sensor-watch.module.css";

export function FilterBar({ value, options, onChange }: { value: Filters; options?: Options; onChange: (f: Filters) => void }) {
  const set = (key: keyof Filters) => (e: { target: { value: string } }) => onChange({ ...value, [key]: e.target.value });
  return (
    <div className={css.filters}>
      <input type="search" placeholder="Search by name or entity id" value={value.q} onChange={set("q")} aria-label="Search" />
      <select value={value.area} onChange={set("area")} aria-label="Area">
        <option value="">Any area</option>
        {options?.areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <select value={value.label} onChange={set("label")} aria-label="Label">
        <option value="">Any label</option>
        {options?.labels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select value={value.platform} onChange={set("platform")} aria-label="Integration">
        <option value="">Any integration</option>
        {options?.platforms.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select value={value.device} onChange={set("device")} aria-label="Device">
        <option value="">Any device{options?.devices.length ? ` (${options.devices.length})` : ""}</option>
        {options?.devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select value={value.device_class} onChange={set("device_class")} aria-label="Device class">
        <option value="">Any device class</option>
        {options?.device_classes.map((d) => (
          <option key={d} value={d}>
            {d.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <select value={value.kind} onChange={set("kind")} aria-label="Kind">
        <option value="">Any kind</option>
        <option value="numeric">Numeric</option>
        <option value="binary">On/off</option>
        <option value="state">States (text, enum, covers, locks…)</option>
      </select>
    </div>
  );
}
