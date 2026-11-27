// Detections on the Camera Commander card's main camera: a chip beside its name for each
// thing its camera has just reported (a person, a vehicle and its number plate, a doorbell
// ring, a sound), for the card's `motion_linger` seconds after
// (docs/design/commander-detections.md, step 2). They come from Home Assistant's event
// entities on the camera's device, whatever made them: the Main camera select's
// `detections` attribute (camera -> {event entity: its translation key}).
//
// An event entity's state is the time it last fired. It has no "on": a detection is
// current for the linger after that time, and no longer.
import { css, html, nothing, type TemplateResult } from "lit";
import type { Hass } from "../ha.ts";
import { clock, Wake } from "./motion.ts";

type Tone = "accent" | "good" | "warn" | "bad" | "muted";
export type Kind = { icon: string; label: string; tone: Tone };

/** What each `event_type` is shown as (UniFi Protect's, as measured 2026-11-27). A
 * `detected` takes its kind from its entity's key (`vehicle`, `package`). `motion` is left
 * out: the motion dot already says it. */
export const KINDS: Record<string, Kind> = {
  person: { icon: "mdi:account", label: "Person", tone: "accent" },
  vehicle: { icon: "mdi:car", label: "Vehicle", tone: "accent" },
  license_plate: { icon: "mdi:car", label: "Number plate", tone: "accent" },
  animal: { icon: "mdi:paw", label: "Animal", tone: "good" },
  face: { icon: "mdi:face-recognition", label: "Face", tone: "accent" },
  package: { icon: "mdi:package-variant-closed", label: "Package", tone: "good" },
  ring: { icon: "mdi:doorbell", label: "Doorbell", tone: "warn" },
  smoke: { icon: "mdi:smoke-detector-alert", label: "Smoke alarm", tone: "bad" },
  co: { icon: "mdi:molecule-co", label: "CO alarm", tone: "bad" },
  siren: { icon: "mdi:alarm-light", label: "Siren", tone: "bad" },
  glass_break: { icon: "mdi:glass-fragile", label: "Glass breaking", tone: "bad" },
  car_alarm: { icon: "mdi:car-emergency", label: "Car alarm", tone: "warn" },
  car_horn: { icon: "mdi:bullhorn", label: "Car horn", tone: "warn" },
  baby_cry: { icon: "mdi:baby-face-outline", label: "Baby crying", tone: "warn" },
  speaking: { icon: "mdi:account-voice", label: "Speaking", tone: "muted" },
  bark: { icon: "mdi:dog", label: "Barking", tone: "muted" },
  scanned: { icon: "mdi:nfc-variant", label: "NFC card", tone: "good" },
  identified: { icon: "mdi:fingerprint", label: "Fingerprint", tone: "good" },
  not_identified: { icon: "mdi:fingerprint-off", label: "Unknown fingerprint", tone: "bad" },
};

/** A kind as shown: one not in KINDS (a new Protect kind, another integration's event) is
 * the word itself, never dropped. */
export const kindOf = (kind: string): Kind => KINDS[kind] ?? { icon: "mdi:eye-outline", label: kind.replace(/_/g, " "), tone: "muted" };

/** One detection: its kind, what the chip says, and when it fired (ms). */
export type Detection = { kind: string; text: string; since: number };

const text = (a: Record<string, unknown>, key: string): string => (typeof a[key] === "string" ? (a[key] as string) : "");

/** One camera's detections current at `now` (fired less than `linger` seconds before),
 * newest first. A chip says its kind, or the plate where there is one, or the name a
 * fingerprint or an NFC card gave. Protect reports one vehicle on two entities (the object
 * and the vehicle, with its plate) under one `event_id`: that is one detection, and the
 * one with the plate wins. */
export function detected(hass: Hass, entities: Record<string, string>, linger: number, now: number): Detection[] {
  const byEvent = new Map<string, Detection & { plate: boolean }>();
  for (const [entity, key] of Object.entries(entities)) {
    const st = hass.states[entity];
    const since = Date.parse(st?.state ?? "");
    if (!st || Number.isNaN(since) || now - since >= linger * 1000) continue;

    const a = st.attributes;
    const type = text(a, "event_type");
    const kind = type === "detected" && key ? key : type;
    if (!kind || kind === "motion") continue;
    const plate = text(a, "license_plate");
    const one = { kind, text: plate || text(a, "full_name") || kindOf(kind).label, since, plate: Boolean(plate) };

    const id = a.event_id === undefined || a.event_id === null || a.event_id === "" ? entity : String(a.event_id);
    const had = byEvent.get(id);
    if (!had || (one.plate && !had.plate)) byEvent.set(id, one);
  }
  return [...byEvent.values()].sort((a, b) => b.since - a.since).map(({ kind, text, since }) => ({ kind, text, since }));
}

/** Follows one card's main camera's detections, and redraws it when the oldest chip is due
 * to go (as Motion does the dots). */
export class Detect {
  private wake = new Wake();

  seen(hass: Hass, entities: Record<string, string>, linger: number, again: () => void): Detection[] {
    const out = detected(hass, entities, linger, Date.now());
    this.wake.at(Math.min(...out.map((d) => d.since + linger * 1000)), again);
    return out;
  }

  stop() {
    this.wake.stop();
  }
}

/** The most chips drawn; any more are one "+n" chip. */
export const MOST = 3;

/** What a chip's tooltip says: what, and when. */
const tip = (d: Detection) => {
  const label = kindOf(d.kind).label;
  return `${label}${d.text === label ? "" : ` ${d.text}`} at ${clock(d.since)}`;
};

/** A press on a part of the main camera's caption. Where the camera has recordings
 * (clips.ts), it `opens` them, as a button; else it is the main picture's own tap, as the
 * motion dot's is, so a chip over the picture never swallows one. */
export type CaptionPress = { press: () => void; opens: boolean };

/** A part of the caption that takes a press: the name, a chip. Enter or Space presses one
 * that opens the recordings. */
export function pressable(cls: string, title: string, inner: unknown, { press, opens }: CaptionPress): TemplateResult {
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    press();
  };
  return html`<span class="${cls} ${opens ? "press" : ""}" title=${title} role=${opens ? "button" : nothing} tabindex=${opens ? "0" : nothing}
    @click=${press} @keydown=${opens ? key : nothing}>${inner}</span>`;
}

/** The chips (pills.css: cm-chip, in their kind's tone), for the main camera's caption. */
export function detectionChips(list: Detection[], press: CaptionPress): TemplateResult | typeof nothing {
  if (!list.length) return nothing;
  const rest = list.slice(MOST);
  return html`${list.slice(0, MOST).map((d) => {
    const k = kindOf(d.kind);
    return pressable(`detection cm-chip cm-on cm-${k.tone}`, tip(d), html`<ha-icon icon=${k.icon}></ha-icon><span>${d.text}</span>`, press);
  })}${rest.length ? pressable("detection cm-chip cm-on cm-muted", rest.map(tip).join("\n"), `+${rest.length}`, press) : nothing}`;
}

export const detectStyles = css`
  /* The caption lets taps through to the main camera; its chips take the pointer, for
     their tooltips and their press, and so does its name where it opens the recordings. */
  .detection {
    --mdc-icon-size: 14px;
    pointer-events: auto;
    cursor: default;
  }
  .caption .press {
    pointer-events: auto;
    cursor: pointer;
  }
`;
