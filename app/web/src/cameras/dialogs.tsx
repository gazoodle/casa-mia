import { useState } from "react";
import { Empty } from "../page";
import { Dialog, Field, Switch } from "../ui";
import css from "../cameras.module.css";
import ui from "../ui.module.css";
import { Camera, DEFAULT_PTZ, HACamera, Preset } from "./common";
import { Controls, EntityInput } from "./inputs";

export function AddCameras({
  ha,
  chosen,
  onClose,
  onAdd,
}: {
  ha: HACamera[];
  chosen: Record<string, Camera>;
  onClose: () => void;
  onAdd: (cams: HACamera[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const left = ha.filter((c) => !chosen[c.entity] && `${c.name} ${c.entity}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <Dialog
      title="Add cameras"
      wide
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button className={ui.primary} disabled={!picked.length} onClick={() => onAdd(ha.filter((c) => picked.includes(c.entity)))}>
            Add {picked.length || ""}
          </button>
        </>
      }
    >
      <input placeholder="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
      {left.length === 0 ? (
        <Empty>{ha.length ? "Every camera is already added." : "Home Assistant has no cameras."}</Empty>
      ) : (
        <ul className={css.pick}>
          {left.map((c) => (
            <li key={c.entity}>
              <label>
                <input
                  type="checkbox"
                  checked={picked.includes(c.entity)}
                  onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.entity] : p.filter((x) => x !== c.entity)))}
                />
                <span>
                  <strong>{c.name}</strong>
                  <code>{c.entity}</code>
                  <small>{[c.medium && "medium", c.high && "high", c.zoom && "zoom"].filter(Boolean).join(" · ") || "no channels"}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

export function CameraDialog({
  entity,
  camera,
  ha,
  onClose,
  onSave,
}: {
  entity: string;
  camera: Camera;
  ha?: HACamera;
  onClose: () => void;
  onSave: (c: Camera) => void;
}) {
  const [c, setC] = useState<Camera>(structuredClone(camera));
  const [presets, setPresets] = useState(presetText(camera.ptz?.presets ?? []));
  const set = (change: Partial<Camera>) => setC((x) => ({ ...x, ...change }));
  const opt = (v: string) => v.trim() || undefined;
  return (
    <Dialog
      title={`${camera.title}`}
      wide
      onClose={onClose}
      footer={
        <>
          <button className={ui.button} onClick={onClose}>
            Cancel
          </button>
          <button
            className={ui.primary}
            disabled={!c.title.trim()}
            onClick={() => {
              const out: Camera = { ...c, title: c.title.trim() };
              for (const k of ["medium", "high", "zoom"] as const) if (!out[k]) delete out[k];
              delete out.live; // the dashboard's choice now (Auto Dashboards)
              if (out.ptz) out.ptz = { ...out.ptz, presets: parsePresets(presets) };
              if (!out.controls?.length) delete out.controls;
              onSave(out);
            }}
          >
            Done
          </button>
        </>
      }
    >
      <p className={css.muted}>
        <code>{entity}</code> is drawn in the composites.
      </p>
      <Field label="Title" help="On its composite tile and as its page's name.">
        <input value={c.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className={css.two}>
        <Field label="Medium channel" help="Wall tablets and phones. Blank: the camera itself.">
          <EntityInput domain="camera" value={c.medium ?? ""} placeholder={ha?.medium} onChange={(v) => set({ medium: opt(v) })} />
        </Field>
        <Field label="High channel" help="Everyone else. Blank: the camera itself.">
          <EntityInput domain="camera" value={c.high ?? ""} placeholder={ha?.high} onChange={(v) => set({ high: opt(v) })} />
        </Field>
        <Field label="Zoom" help="A number entity; shown on its page.">
          <EntityInput domain="number" value={c.zoom ?? ""} placeholder={ha?.zoom} onChange={(v) => set({ zoom: opt(v) })} />
        </Field>
      </div>
      <Field label="PTZ presets">
        <Switch
          on={!!c.ptz}
          label="PTZ presets"
          onChange={(on) =>
            set({ ptz: on ? { ...DEFAULT_PTZ, data: ha?.device_id ? { device_id: ha.device_id } : {} } : undefined })
          }
        />
      </Field>
      {c.ptz && (
        <div className={css.two}>
          <Field label="Action" help="Run with the data below plus preset: <name>.">
            <input value={c.ptz.action} onChange={(e) => set({ ptz: { ...c.ptz!, action: e.target.value } })} />
          </Field>
          <Field label="Device id" help="The camera's device (filled in from Home Assistant).">
            <input
              value={c.ptz.data.device_id ?? ""}
              onChange={(e) => set({ ptz: { ...c.ptz!, data: { ...c.ptz!.data, device_id: e.target.value } } })}
            />
          </Field>
          <Field label="Presets" help="One per line, in order. Preset | Label when the tile needs another name.">
            <textarea rows={8} value={presets} onChange={(e) => setPresets(e.target.value)} />
          </Field>
        </div>
      )}
      <Field label="Page controls" help="Entities at the top of its live page (a gate, a light); a tap toggles them.">
        <Controls value={c.controls ?? []} onChange={(controls) => set({ controls })} />
      </Field>
    </Dialog>
  );
}

export function presetText(presets: Preset[]): string {
  return presets.map((p) => (typeof p === "string" ? p : p.label ? `${p.preset} | ${p.label}` : p.preset)).join("\n");
}

export function parsePresets(text: string): Preset[] {
  return text
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()))
    .filter(([p]) => p)
    .map(([preset, label]) => (label ? { preset, label } : preset));
}
