/** The filters a big house needs, on one line: a search (names, entity ids and device
 * names) and a chip per filter (domain, area, floor, label, integration, maker, model,
 * device, device class, category, kind), each offering only what some sensor has; the devices only those matching the
 * other filters. The same chips as the watched list's. */

import { FilterChips, KINDS, type ChipOptions } from "./chips";
import { NO_FILTERS, type Filters, type Options } from "./common";
import css from "./sensor-watch.module.css";

const named = (ids: string[] = []) => ids.map((id) => ({ id, name: id.replaceAll("_", " ") }));
const plain = (ids: string[] = []) => ids.map((id) => ({ id, name: id }));

export function FilterBar({ value, options, onChange }: { value: Filters; options?: Options; onChange: (f: Filters) => void }) {
  const chips: ChipOptions = {
    domain: named(options?.domains),
    area: options?.areas ?? [],
    floor: options?.floors ?? [],
    label: options?.labels ?? [],
    platform: named(options?.platforms),
    manufacturer: plain(options?.manufacturers),
    model: plain(options?.models),
    device: options?.devices ?? [],
    device_class: named(options?.device_classes),
    category: named(options?.categories),
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
