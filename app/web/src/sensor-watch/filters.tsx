/** The filters a big house needs, on one line: a search (names, entity ids and device
 * names) and a chip per filter (domain, area, label, integration, device, device class,
 * kind), each offering only what some sensor has; the devices only those matching the
 * other filters. The same chips as the watched list's. */

import { FilterChips, KINDS, type ChipOptions } from "./chips";
import { NO_FILTERS, type Filters, type Options } from "./common";
import css from "./sensor-watch.module.css";

const named = (ids: string[] = []) => ids.map((id) => ({ id, name: id.replaceAll("_", " ") }));

export function FilterBar({ value, options, onChange }: { value: Filters; options?: Options; onChange: (f: Filters) => void }) {
  const chips: ChipOptions = {
    domain: named(options?.domains),
    area: options?.areas ?? [],
    label: options?.labels ?? [],
    platform: named(options?.platforms),
    device: options?.devices ?? [],
    device_class: named(options?.device_classes),
    kind: KINDS,
  };
  const filtering = Object.values(value).some(Boolean);
  return (
    <div className={css.toolbar}>
      <input
        type="search"
        className={css.find}
        placeholder="Search names, entity ids, devices; -word to rule out"
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
        aria-label="Search"
      />
      <FilterChips value={value} options={chips} onChange={onChange} />
      {filtering && (
        <button type="button" className={css.chip} onClick={() => onChange(NO_FILTERS)}>
          Clear all
        </button>
      )}
    </div>
  );
}
