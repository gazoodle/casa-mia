// On a room's sheet, under its faders and keys: each device's settings that are a choice
// from a list (choices.ts), as a row of buttons with the one that stands filled in.
import { html } from "lit";
import { worded, type Choice } from "../choices.ts";
import type { Device } from "../house.ts";

export const settings = (devices: Device[], choose: (d: Device, c: Choice, option: string) => void) =>
  devices.flatMap((d) =>
    (d.choices ?? []).map(
      (c) => html`<div class="choice"><span class="label">${d.name} · ${c.what}</span>
        <nav class="scenes" aria-label="${d.name}: ${c.what}">
          ${c.options.map((o) => html`<button class=${o === c.now ? "thrown" : ""} aria-pressed=${o === c.now} @click=${() => choose(d, c, o)}>${worded(o)}</button>`)}
        </nav></div>`,
    ),
  );
