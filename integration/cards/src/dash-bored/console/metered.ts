// A meter panel's chassis (meters.ts says what is on it), drawn with an era's kit, and
// the register every era's kit has for a total of energy. Where the strips stand is
// views.ts's, the same in every era. The design is docs/design/console-meter-panel.md.
import { html, nothing, type TemplateResult } from "lit";
import { NOMINAL } from "../stories.ts";
import type { Kit } from "./kit.ts";
import { abreast, fit, type Chassis, type Meter } from "./meters.ts";

const FIGURES = 6; // a register's whole kilowatt-hours, before its one decimal place

/** An era's register, made of its `label` and its `figures` (a number on its display:
 * counter wheels, nixie tubes, or figures of seven bars). It shows `kwh` to a tenth, in
 * cells that never change in number. With no `kwh` it is dark, and its plate says it is
 * not answering. */
export const register = (label: (text: string) => TemplateResult, figures: (text: string, lit?: boolean, says?: string) => TemplateResult) => (name: string, kwh?: number): TemplateResult => {
  const lit = kwh !== undefined;
  const text = lit ? kwh.toFixed(1).padStart(FIGURES + 2, " ").slice(-(FIGURES + 2)) : `${" ".repeat(FIGURES)}. `;
  const says = lit ? `${name}: ${kwh.toFixed(1)} kWh` : `${name}: not answering`;
  return html`<div class="register">${figures(text, lit, says)}${label(lit ? `${name} kWh` : says)}</div>`;
};

/** One device's chassis. A meter with phases has a strip for each, standing side by side,
 * and one for the whole meter with its registers. One with no phases is a single strip
 * laid along the chassis. `live` is whether Home Assistant is answering: if not, nothing
 * on the chassis is lit. `beat` numbers the meters, so that no two needles waver in step. */
export function metered(kit: Kit, c: Chassis, live: boolean, beat: () => number): TemplateResult {
  const { label, meter } = kit;
  if (c.fault) return html`<section class="room metered">${label(c.fault)}</section>`;

  // A meter that is not answering rests at the bottom of its scale, unlit; so is one whose
  // sensor Sensor Watch calls stale, since its reading is an old one. Under a meter is
  // Sensor Watch's lamp, when its level is not nominal, with what it says as the lamp's title.
  const dial = (m: Meter) => html`<div class="cell">
    ${meter(m.title, m.lo, m.hi, m.value ?? m.lo, m.unit, beat(), live && m.value !== undefined && !m.stale)}
    ${m.level && m.level !== NOMINAL ? html`<div class="warned" role="status" title=${m.message ?? m.level} aria-label="Sensor Watch: ${m.message ?? m.level}">${kit.jewel(m.level)}</div>` : nothing}
  </div>`;
  const registers = c.registers.length ? html`<div class="registers">${c.registers.map((r) => kit.register(r.name, live ? r.kwh : undefined))}</div>` : nothing;
  const whole = c.whole.length || c.registers.length;
  const phases = c.strips.length;
  const works = phases
    ? html`<div class="phases" style="--phases: ${phases}; --strips: ${phases + (whole ? 1 : 0)}; --rows: ${Math.max(...c.strips.map((s) => s.meters.length))}">
        ${c.strips.map((s) => html`<div class="strip">${s.meters.map(dial)}</div>`)}
        ${whole ? html`<div class="strip whole">${c.whole.map(dial)}${registers}</div>` : nothing}
      </div>`
    : html`<div class="strip flat">${c.whole.map(dial)}${registers}</div>`;
  // The works' natural widths, for `sized`: with everything abreast, and for a meter with
  // phases with the whole meter's strip under them. One with no phases is never laid out
  // narrower than two meters, so that its registers have room under one meter alone.
  const wide = phases ? abreast(phases + (whole ? 1 : 0)) : abreast(Math.max(2, c.whole.length));
  const under = phases && whole ? abreast(phases) : nothing;
  return html`<section class="room metered ${phases ? "phased" : ""}">${label(c.name)}<div class="works"><div class="fit" data-wide=${wide} data-under=${under}>${works}</div></div></section>`;
}

/** Fit a chassis's works (its `.works` element) to the width they have now: the form
 * meters.ts `fit` chooses is the wrapper's class (views.ts lays each out), at the width
 * and zoom it gives. `changed`: only if the works' natural widths are not those last
 * fitted, which asks the page nothing, so it can be done at every drawing. */
export function sized(works: HTMLElement, changed = false) {
  const inner = works.firstElementChild as HTMLElement | null;
  if (!inner?.dataset.wide) return;
  const key = `${inner.dataset.wide} ${inner.dataset.under ?? ""}`;
  if (changed && inner.dataset.fitted === key) return;
  const { form, width, zoom } = fit(works.clientWidth, Number(inner.dataset.wide), Number(inner.dataset.under) || undefined);
  inner.dataset.fitted = key;
  inner.className = `fit ${form}`;
  inner.style.width = `${width}px`;
  inner.style.zoom = String(zoom);
}
