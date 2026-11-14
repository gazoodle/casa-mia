// The Gazette: the house as a newspaper. One element, used two ways: it is Dash-Bored's
// page in the sidebar, and a dashboard card. house.ts reads the house, stories.ts ranks
// what is worth saying, voices.ts words it, and styles.ts is the look; this file draws
// the page and acts on what is pressed.
// It is in three layers: gazette/page.ts holds what the page knows, gazette/acts.ts does
// what is pressed, and the class here draws it.
import { html, nothing, type TemplateResult } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { live } from "lit/directives/live.js";
import { fire, navigate } from "../ha.ts";
import { clipping, photograph } from "./clipping.ts";
import { Acts } from "./gazette/acts.ts";
import { ARCHIVE, PAST } from "./gazette/page.ts";
import { DEGREES, sighted, type Device, type Room } from "./house.ts";
import { cap, clock, counted, billing, personal, stories, type Press, type Story } from "./stories.ts";
import { FIXES, VOICES, amount, announce, billed, clause, fill, poll, sky, tell, wired, words, type Told } from "./voices.ts";

export const CARD = "dash-bored-gazette";
// A house with more devices than this can't be reported device by device: the page was
// many screens long on a phone for a large one. Its report is of what is on, unlocked or
// not answering, and its switchboard, which still has everything, goes across the foot.
const BIG = 30;
const MANY = 3; // more lights lit in one of its rooms than this are a count, not a list
// What a big house's report tells of: a lock that is open, a thing that is on, a thing
// in a phase of its own (a mower in trouble, an alarm sounding). A thermostat or a water
// heater at work, a camera watching and an alarm set are how things should be, and no news.
const UNREMARKABLE = new Set(["climate", "camera", "water_heater", "alarm_control_panel"]);
const AT_REST = new Set(["docked"]);
const notable = (d: Device) => d.away || (!!d.phase && !AT_REST.has(d.phase)) || (!UNREMARKABLE.has(d.kind) && (d.kind === "lock" ? !d.on : d.on));
// A camera is in the report only when it stops answering: "keeps watch" for each is noise.
const reportable = (d: Device) => d.kind !== "camera" || d.away;

export class Gazette extends Acts {
  render() {
    const hass = this._hass;
    const house = this._house;
    const voice = VOICES[this._style];
    if (!hass || !house) return html`<div class="paper" data-style=${this._style}><p class="wait">Waiting for Home Assistant.</p></div>`;

    const now = Date.now();
    const sightings = sighted(this._survey!, this._seen).filter((s) => now - s.at < ARCHIVE);
    const past = [...sightings].sort((a, b) => b.at - a.at).slice(0, PAST);
    // What sort of sighting, in a word or two of this paper's: its story's kicker.
    const sort = (kind: string) => (voice.stories[`sighting.${kind}`]?.kicker ?? kind).toLowerCase();
    const running = stories(house, this._alerts, now, sightings);
    // A story that was not in the last edition takes the next wording from its pool.
    for (const s of running) if (!this._showing.has(s.id)) this._turn.set(s.id, (this._turn.get(s.id) ?? -1) + 1);
    this._showing = new Set(running.map((s) => s.id));
    const told = running.map((s) => ({ s, ...tell(voice, s, this._turn.get(s.id)!) }));
    const [lead, ...rest] = told;
    const alert = told.find((t) => t.s.kind === "alert");

    // What a story's reader can do about it: its remedy, and a gentler one beside it where there is one.
    const act = (t: Told & { s: (typeof running)[number] }) => {
      const button = (words: string, press?: Press) => (words ? html`<button class="act" @click=${() => this._call(press!, t.head)}>${words}</button>` : nothing);
      return html`${button(t.act, t.s.press)}${button(t.vote, t.s.vote)}`;
    };
    // A device's clause switches it when pressed. Where its level can be set, the level
    // is a press of its own, which opens the scale.
    const fact = (d: Device, first: boolean): TemplateResult => {
      const [before, level, after] = d.dims && !d.away ? clause(voice, d) : [words(voice, d), "", ""];
      const part = (text: string, how: string, press: () => void) =>
        text ? html`<span class="fact ${how}" role="button" tabindex="0" @click=${press} @keydown=${this._key}>${text}</span>` : nothing;
      return html`${part(first ? cap(before) : before, d.away ? "away" : "", () => this._press(d))}${part(level, "level", () => this._measure(d))}${part(after, "", () => this._press(d))}`;
    };
    // The scale and its poll, for the device they are open for. In the report they are
    // inside the room's paragraph, so that the two stay in one column. The figure is the
    // device's own, with what was asked beside it until the device says it has moved.
    const scale = (d?: Device) => {
      const open = this._scale;
      if (!d || !open || open.id !== d.id || !d.dims || d.away) return nothing;
      const { min, max, step, vote: by } = d.span;
      const at = d.level ?? min;
      const ask = (event: Event) => Number((event.target as HTMLInputElement).value);
      // The readers' poll: each vote moves the level a step from where it was last asked
      // to be, so three votes in a row are one call for thirty per cent.
      const now = open.want ?? at;
      const asked = poll(voice, d);
      const vote = (words: string, move: number) => {
        const to = Math.min(max, Math.max(min, Math.round((now + move) * 10) / 10));
        return html`<button class="act" ?disabled=${to === now} @click=${() => ((this._scale = { ...open, want: to }), this._ask(d, to))}>${words}</button>`;
      };
      return html`<span class="scale">
        <span class="poll"><i>${cap(asked.ask)}</i>${vote(asked.less, -by)}${vote(asked.more, by)}</span>
        <input type="range" min=${min} max=${max} step=${step} aria-label=${d.name} .value=${live(String(now))}
          @input=${(e: Event) => (this._scale = { ...open, want: ask(e) })}
          @change=${(e: Event) => this._ask(d, ask(e))} />
        <output>${amount(voice, d.kind, at)}${open.want === undefined || open.want === at ? "" : ` → ${open.want}`}</output>
        <button aria-label="Close" @click=${() => (this._scale = undefined)}>×</button>
      </span>`;
    };
    // A photograph, where the story has one. Pressing it opens it as a clipping, to be looked at closely.
    const photo = (s: Story) =>
      s.photo
        ? html`<figure class="photo" role="button" tabindex="0" @click=${() => this._look({ src: s.photo!, caption: `${s.figure[1]}, ${s.figure[0]}`, see: s.see })} @keydown=${this._key}>
            <img src=${s.photo} alt=${s.figure[1]} loading="lazy" @error=${() => (this._fault = `The photograph from ${s.figure[1]} could not be fetched.`)} />
            <figcaption>${s.figure[1]}, ${s.figure[0]}</figcaption>
          </figure>`
        : nothing;
    const warm = house.rooms.filter((r) => r.temp !== undefined);
    const column = personal(house.people, this._rated, now);

    const rooms = house.rooms.filter((r) => r.devices.length);
    const big = rooms.reduce((n, r) => n + r.devices.length, 0) > BIG;
    const reported = rooms.map((r) => ({ ...r, devices: r.devices.filter(big ? notable : reportable) })).filter((r) => r.devices.length);
    // Rooms come sorted by floor (house.ts). A house with no floors has no crossheads.
    const floored = rooms.some((r) => r.floor);
    const byFloor = (list: Room[], draw: (r: Room) => TemplateResult, wrap = (drawn: TemplateResult[]): unknown => drawn) => {
      const floors = new Map<string, Room[]>();
      for (const r of list) floors.set(r.floor ?? "", [...(floors.get(r.floor ?? "") ?? []), r]);
      return [...floors].map(([floor, on]) => html`${floored ? html`<h5>${floor || voice.titles.elsewhere}</h5>` : nothing}${wrap(on.map(draw))}`);
    };
    // A room's sentence. In a big house its lit lights, if many, are one fact that puts
    // them out; its running switches are a count and no more, since nobody means to stop
    // nine relays with one press.
    const report = (r: Room) => {
      const many = (kind: string) => {
        const on = r.devices.filter((d) => big && d.kind === kind && d.on && !d.away);
        return on.length > MANY ? on : [];
      };
      const lit = many("light");
      const running = many("switch");
      const parts: unknown[] = r.devices.filter((d) => !lit.includes(d) && !running.includes(d)).map((d, i) => fact(d, !i && !lit.length && !running.length));
      if (running.length) parts.unshift(lit.length ? fill(voice.words["switch.many"], counted(running.length)) : cap(fill(voice.words["switch.many"], counted(running.length))));
      if (lit.length)
        parts.unshift(html`<span class="fact" role="button" tabindex="0" @click=${() => this._call({ domain: "light", service: "turn_off", ids: lit.map((d) => d.id) }, r.name)} @keydown=${this._key}>${cap(fill(voice.words["light.many"], counted(lit.length)))}</span>`);
      return html`<p><b>${r.name}.</b> ${parts.map((part, i) => html`${i ? voice.join : ""}${part}`)}${voice.end}${this._open ? nothing : scale(r.devices.find((d) => d.id === this._scale?.id))}</p>`;
    };
    // A chip switches its device, and its tab opens the device's clipping. The tab shows
    // the level where there is one to set.
    const chip = (d: Device) =>
      html`<div class="pair"><button class="chip ${d.on ? "on" : ""} ${d.away ? "away" : ""}" aria-pressed=${d.on} @click=${() => this._press(d)}>${d.name}</button
        ><button class="chip tab" aria-label="${d.name}: its story" @click=${() => this._story(d)}>${d.dims && !d.away ? `${d.level ?? d.span.min}${DEGREES.has(d.kind) ? "°" : "%"}` : "›"}</button></div>`;
    const devices = new Map(house.rooms.flatMap((r) => r.devices).map((d) => [d.id, d]));
    const subject = this._open && devices.get(this._open.id);
    const bill = billing(this._played, this._rated, devices);
    // What comes away with a clipping: the paper's own stories, from round where it was cut.
    const others = rest.length ? rest : told;
    const scraps = { above: others[0].deck, beside: [...others, ...told].map((t) => `${t.head}. ${t.deck}`).join(" "), below: others.at(-1)!.head };
    const board = html`<h3>${voice.titles.board}</h3>
      ${byFloor(rooms, (r) => html`<div class="row"><span>${r.name}</span>${r.devices.map(chip)}</div>`,
        (drawn) => html`<div class="rows">${drawn}</div>`)}`;

    return html`<div class="paper" data-style=${this._style}>
      ${this._lost ? html`<div class="fault" role="alert">Not connected to Home Assistant since ${clock(this._lost)}. What follows is how things stood then.</div>` : nothing}
      ${this._fault ? html`<div class="fault" role="alert">${this._fault}</div>` : nothing}
      ${alert ? keyed(alert.s.id + alert.s.variant, html`<div class="breaking" role="status"><b>${voice.flash}</b>${alert.head}${/[!?]$/.test(alert.head) ? "" : ":"} ${alert.s.vars.message}</div>`) : nothing}
      <header class="masthead"><h1>${voice.name}</h1><p>${voice.strap}</p></header>
      <div class="dateline">
        ${this.hasAttribute("panel") ? html`<ha-menu-button .hass=${hass} .narrow=${this.narrow}></ha-menu-button>` : nothing}
        <span>${new Date().toLocaleDateString(hass.locale?.language ?? "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        ${this._config.style
          ? nothing
          : html`<span class="styles">${Object.entries(VOICES).map(([id, v]) => html`<button aria-pressed=${id === this._style} @click=${() => this._dress(id)}>${v.label}</button>`)}</span>`}
        <span>${voice.price} · ${clock(Date.now())}</span>
      </div>
      ${voice.ticker ? html`<div class="ticker" aria-hidden="true"><b>${voice.ticker}</b><div><span>${told.map((t) => t.head).join("  •  ")}</span></div></div>` : nothing}
      <main class="page ${rest.length ? "" : "solo"}">
        <article>
          <div class="figure"><b>${lead.s.figure[0]}</b><span>${lead.s.figure[1]}</span></div>
          <p class="kicker">${lead.kicker}</p>
          ${keyed(lead.head, html`<h2>${lead.head}</h2>`)}
          <p class="deck">${lead.deck}</p>
          ${act(lead)}
          ${photo(lead.s)}
          <div class="copy">
            ${lead.body ? html`<p>${lead.body}</p>` : nothing}
            ${byFloor(reported, report)}
            ${rooms.length > reported.length ? html`<p>${fill(voice.rest, counted(rooms.length - reported.length))}</p>` : nothing}
            ${rooms.length ? nothing : html`<p>No areas with lights, switches or other devices were found. Give your devices areas in Home Assistant's settings and this page fills itself in.</p>`}
          </div>
        </article>
        ${rest.length
          ? html`<section>
              <h3>${voice.titles.more}</h3>
              ${rest.slice(0, 3).map((t) => html`<div class="item"><p class="kicker">${t.kicker}</p><h4>${t.head}</h4>${photo(t.s)}<p>${t.deck}</p>${act(t)}</div>`)}
              ${rest.length > 3 ? html`<h3>${voice.titles.briefs}</h3><ul>${rest.slice(3).map((t) => html`<li><b>${t.head}.</b> ${t.deck}</li>`)}</ul>` : nothing}
            </section>`
          : nothing}
        <aside>
          <h3>${voice.titles.late}</h3>
          <ol>${this._late.length
            ? this._late.map((l) => {
                // A line about a device opens that device's clipping.
                const d = l.device && devices.get(l.device.id);
                return html`<li role=${d ? "button" : nothing} tabindex=${d ? 0 : nothing} @click=${() => d && this._story(d)} @keydown=${this._key}><time>${clock(l.time)}</time>${l.alert ? wired(voice, l.alert) : l.seen ? `${l.seen.name}: ${sort(l.seen.kind)}` : `${l.device!.room}: ${words(voice, l.device!)}`}</li>`;
              })
            : html`<li>${voice.nothing}</li>`}</ol>
          ${past.length
            ? html`<h3>${voice.titles.archive}</h3>
                <ol class="archive">${past.map((s) =>
                  html`<li role="button" tabindex="0" @click=${() => (s.photo ? this._look({ src: s.photo, caption: `${s.name}, ${clock(s.at)}`, see: s.camera }) : fire(this, "hass-more-info", { entityId: s.camera }))} @keydown=${this._key}>
                    ${s.photo ? html`<img src=${s.photo} alt="" loading="lazy" />` : html`<i></i>`}<span><time>${clock(s.at)}</time>${s.name}: ${sort(s.kind)}</span></li>`)}</ol>`
            : nothing}
          ${column.length ? html`<h3>${voice.titles.personal}</h3><ol>${column.map((n) => html`<li><time>${clock(n.at)}</time>${announce(voice, n)}</li>`)}</ol>` : nothing}
          ${bill.length
            ? html`<h3>${voice.titles.celebrity}</h3><ol>${bill.map((b) => {
                const [text, marks] = billed(voice, b);
                return html`<li role="button" tabindex="0" @click=${() => this._story(devices.get(b.id)!)} @keydown=${this._key}><time>${clock(b.at)}</time>${text}${marks.map((mark, i) => html` <span class="mark ${b.marks[i].kind}">${mark}</span>`)}</li>`;
              })}</ol>`
            : nothing}
          ${house.outside
            ? html`<h3>${voice.titles.weather}</h3>
                <p class="now">${fill(voice.forecast.now, { sky: sky(voice, house.outside.sky), temp: house.outside.temp.toFixed(1) })}</p>
                ${this._days.length
                  ? html`<table class="days">${this._days.map((d) =>
                      html`<tr><td>${new Date(d.at).toDateString() === new Date(now).toDateString() ? voice.forecast.today : new Date(d.at).toLocaleDateString(hass.locale?.language ?? "en-GB", { weekday: "long" })}</td>
                        <td>${sky(voice, d.sky)}</td><td>${Math.round(d.high)}°${d.low === undefined ? "" : ` / ${Math.round(d.low)}°`}</td></tr>`)}</table>`
                  : nothing}`
            : nothing}
          ${warm.length
            ? html`<h3>${voice.titles.temps}</h3><table>${warm.map((r) => html`<tr><td>${r.name}</td><td>${r.temp!.toFixed(1)}° ${r.target === undefined ? "" : r.temp! < r.target - 0.5 ? "▼" : r.temp! > r.target + 0.5 ? "▲" : "="}</td></tr>`)}</table>`
            : nothing}
          ${big ? nothing : board}
          ${house.gaps.length
            ? html`<h3>${voice.titles.gaps}</h3>
                ${house.gaps.map((g) => html`<details><summary>${fill(voice.gaps[g.kind], counted(g.items.length))}</summary>
                  <ul>${g.items.map((item, i) =>
                    // An entity opens its own dialog, an area its page in the settings.
                    html`${g.kind === "plumbing" && item.via !== g.items[i - 1]?.via ? html`<li class="via">${FIXES[item.via ?? ""] ?? `${item.via}. ${FIXES[""]}`}:</li>` : nothing}<li><button class="mend" @click=${() => (g.kind === "floorless" || g.kind === "cold" ? navigate(`/config/areas/area/${item.id}`) : fire(this, "hass-more-info", { entityId: item.id }))}>${item.name}</button></li>`)}</ul></details>`)}
                <p class="mend">${voice.mend}</p>`
            : nothing}
          ${house.scenes.length
            ? html`<h3>${voice.titles.notices}</h3>${house.scenes.slice(0, 8).map((s, i) =>
                html`<button class="ad" @click=${() => this._call({ domain: "scene", service: "turn_on", ids: [s.id] }, s.name)}><b>${s.name}</b>${voice.notices[i % voice.notices.length]}</button>`)}`
            : nothing}
        </aside>
        ${big ? html`<section class="board">${board}</section>` : nothing}
      </main>
      ${subject
        ? clipping(voice, subject, this._open!, now, scale(subject), scraps, {
            flip: () => this._flip(subject),
            more: () => this._live(subject.id),
            picture: () => this._look({ src: subject.picture!, caption: `${subject.room}: ${subject.name}`, see: subject.id }),
            shut: () => this._shut(),
          })
        : this._shot
          ? photograph(voice, this._shot, scraps, { more: () => this._live(this._shot!.see!), shut: () => this._shut() })
          : nothing}
    </div>`;
  }
}
