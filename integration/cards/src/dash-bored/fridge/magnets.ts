// The Fridge's magnets, each drawn once. Two sorts: a round button magnet with a picture
// of what it works (a lamp, a padlock), which is pressed; and the novelty magnets (a
// butterfly, a ladybird, a strawberry) that hold a photograph or a note to the door.
// fridge.ts puts them on the door, and styles.ts is how they sit and wobble.
import { svg, type TemplateResult } from "lit";
import type { Kind } from "../house.ts";

/** A place in a list of `n`, the same every time for the same `id`: which magnet holds a
 * photograph, which colour a button is. */
export function pick(id: string, n: number): number {
  let sum = 0;
  for (const ch of id) sum = (sum * 31 + ch.charCodeAt(0)) >>> 0;
  return sum % n;
}

/** How far something is turned on the door, in degrees: up to `most` either way, the same
 * every time for the same `id`. Nothing on a fridge is quite straight. */
export const tilt = (id: string, most = 4) => ((pick(id, 2 * most * 10 + 1) / 10 - most) || 0.4).toFixed(1);

// The picture on a button magnet, drawn in white line on a 24 by 24 square.
const line = (d: string) => svg`<path d=${d} fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`;
const PICTURES: Record<Kind, TemplateResult> = {
  light: svg`${line("M8.5,14.5 a5.6,5.6 0 1 1 7,0 v2.2 h-7 z M9.8,19.3 h4.4 M10.8,21.4 h2.4")}`,
  switch: svg`${line("M6,9 h12 v4 a6,6 0 0 1 -12,0 z M9,9 V4.5 M15,9 V4.5 M12,19 v2.5")}`,
  cover: svg`${line("M4.5,4.5 h15 M6,4.5 v14 h12 v-14 M6,8.5 h12 M6,12 h12 M6,15.5 h12 M12,18.5 v2.5")}<circle cx="12" cy="21.4" r="1" fill="#fff"/>`,
  lock: svg`${line("M6.5,11 h11 v9 h-11 z M8.8,11 V8 a3.2,3.2 0 0 1 6.4,0 v3")}<circle cx="12" cy="15.5" r="1.4" fill="#fff"/>`,
  climate: svg`${line("M10,4 a2,2 0 0 1 4,0 v9.6 a4,4 0 1 1 -4,0 z M12,9 v7")}<circle cx="12" cy="17" r="2" fill="#fff"/>`,
  media_player: svg`${line("M9.5,18 V6 l8.5,-2 v12")}<ellipse cx="7.3" cy="18" rx="2.6" ry="2" fill="#fff"/><ellipse cx="15.8" cy="16" rx="2.6" ry="2" fill="#fff"/>`,
  camera: svg`${line("M4,8 h3.5 l1.5,-2 h6 l1.5,2 H20 v10.5 H4 z")}<circle cx="12" cy="13" r="3.2" fill="none" stroke="#fff" stroke-width="1.9"/>`,
  fan: svg`${line("M12,12 c0,-5 4,-7 6,-5 s-1,5 -6,5 c5,0 7,4 5,6 s-5,-1 -5,-6 c0,5 -4,7 -6,5 s1,-5 6,-5 c-5,0 -7,-4 -5,-6 s5,1 5,6")}`,
  valve: svg`${line("M12,3.5 c4,5 6,8 6,11 a6,6 0 0 1 -12,0 c0,-3 2,-6 6,-11 z")}`,
  vacuum: svg`<circle cx="12" cy="13" r="7.6" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="12" cy="13" r="2" fill="#fff"/>${line("M7,7.6 a7.6,7.6 0 0 1 10,0")}`,
  lawn_mower: svg`${line("M4,20 h16 M6,20 v-4 M9,20 v-6.5 M12,20 v-4.5 M15,20 v-7 M18,20 v-4")}`,
  water_heater: svg`${line("M7,10 h10 v8 a2,2 0 0 1 -2,2 h-6 a2,2 0 0 1 -2,-2 z M17,12 h2 a1.6,1.6 0 0 1 0,3.2 h-2 M10,3.5 c-1,1.5 1,2 0,3.5 M14,3.5 c-1,1.5 1,2 0,3.5")}`,
  humidifier: svg`${line("M7,14 a4,4 0 0 1 1,-7.8 a5,5 0 0 1 9.4,1.2 a3.4,3.4 0 0 1 -.4,6.6 z M9,17.5 v2 M12,18.5 v2.5 M15,17.5 v2")}`,
  siren: svg`${line("M6.5,17 v-5.5 a5.5,5.5 0 0 1 11,0 V17 z M4.5,17 h15 M10.5,20 a1.6,1.6 0 0 0 3,0")}`,
  alarm_control_panel: svg`${line("M12,3.5 l7,2.5 v5.5 c0,4.5 -3,7.5 -7,9 c-4,-1.5 -7,-4.500 -7,-9 V6 z M9,12 l2.2,2.2 l4,-4.4")}`,
};
// A padlock that is undone, for a lock that is unlocked.
const UNDONE = svg`${line("M6.5,11 h11 v9 h-11 z M8.8,11 V8 a3.2,3.2 0 0 1 6.2,-1")}<circle cx="12" cy="15.5" r="1.4" fill="#fff"/>`;

/** The picture for a kind of device by itself, on its 24 by 24 square: Aurora's, which
 * colours the white line with its own stylesheet (aurora/styles.ts). */
export const picture = (kind: Kind, undone = false) => (kind === "lock" && undone ? UNDONE : PICTURES[kind]);

/** A round button magnet with the picture for a kind of device. Its colour is the
 * element's `--c`, and styles.ts dulls it while its device is off. */
export const button = (kind: Kind, undone = false) => svg`<svg class="button" viewBox="0 0 48 48" aria-hidden="true">
  <circle cx="24" cy="26" r="21" fill="#000" opacity=".28"/><circle class="disc" cx="24" cy="24" r="21"/>
  <circle cx="24" cy="24" r="21" fill="url(#dome)"/><circle cx="24" cy="24" r="17.5" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1.2"/>
  <g transform="translate(12 12)">${picture(kind, undone)}</g>
  <ellipse cx="16.5" cy="13.5" rx="7" ry="3.6" fill="#fff" opacity=".4" transform="rotate(-32 16.5 13.5)"/></svg>`;

// The novelty magnets: moulded and painted, each with a shine on its upper left.
const shine = (x: number, y: number) => svg`<ellipse cx=${x} cy=${y} rx="4" ry="2.2" fill="#fff" opacity=".55" transform="rotate(-30 ${x} ${y})"/>`;
const eyes = (x1: number, x2: number, y: number) => svg`<circle cx=${x1} cy=${y} r="1.9" fill="#1d1d1d"/><circle cx=${x2} cy=${y} r="1.9" fill="#1d1d1d"/><circle cx=${x1 + 0.6} cy=${y - 0.6} r=".6" fill="#fff"/><circle cx=${x2 + 0.6} cy=${y - 0.6} r=".6" fill="#fff"/>`;
export const NOVELTIES: Record<string, TemplateResult> = {
  butterfly: svg`<path d="M24,24 C14,6 2,10 5,22 C6,28 14,28 24,24 C14,30 8,40 16,43 C22,44 24,34 24,24 Z" fill="#f08a24" stroke="#5a2d05" stroke-width="1.4"/>
    <path d="M24,24 C34,6 46,10 43,22 C42,28 34,28 24,24 C34,30 40,40 32,43 C26,44 24,34 24,24 Z" fill="#f6a93b" stroke="#5a2d05" stroke-width="1.4"/>
    <circle cx="11" cy="18" r="3" fill="#fff3c9"/><circle cx="37" cy="18" r="3" fill="#fff3c9"/><circle cx="16" cy="36" r="2.2" fill="#3a1c04"/><circle cx="32" cy="36" r="2.2" fill="#3a1c04"/>
    <ellipse cx="24" cy="25" rx="2.4" ry="11" fill="#3a1c04"/><path d="M23,15 C21,9 18,8 17,7 M25,15 C27,9 30,8 31,7" fill="none" stroke="#3a1c04" stroke-width="1.3" stroke-linecap="round"/>${shine(12, 14)}`,
  ladybird: svg`<ellipse cx="24" cy="27" rx="17" ry="15" fill="#d81f26" stroke="#5a0a0d" stroke-width="1.4"/><path d="M24,12 V42" stroke="#5a0a0d" stroke-width="1.6"/>
    <path d="M12,17 a14,10 0 0 1 24,0 a13,8 0 0 0 -24,0 z" fill="#1d1d1d"/><circle cx="24" cy="12" r="7" fill="#1d1d1d"/>
    <g fill="#1d1d1d"><circle cx="16" cy="24" r="3"/><circle cx="32" cy="24" r="3"/><circle cx="14" cy="34" r="2.6"/><circle cx="34" cy="34" r="2.6"/><circle cx="20" cy="31" r="2"/><circle cx="28" cy="31" r="2"/></g>
    <circle cx="21" cy="10.5" r="1.6" fill="#fff"/><circle cx="27" cy="10.5" r="1.6" fill="#fff"/>${shine(15, 19)}`,
  bee: svg`<ellipse cx="15" cy="15" rx="9" ry="6" fill="#dff1fb" stroke="#6b8794" stroke-width="1.1" transform="rotate(-25 15 15)"/><ellipse cx="33" cy="15" rx="9" ry="6" fill="#dff1fb" stroke="#6b8794" stroke-width="1.1" transform="rotate(25 33 15)"/>
    <ellipse cx="24" cy="28" rx="13" ry="14" fill="#ffc928" stroke="#5a3c05" stroke-width="1.4"/><path d="M12.5,23 h23 M11,29 h26 M13,35 h22" stroke="#2a1d05" stroke-width="3.4" stroke-linecap="round"/>
    ${eyes(20, 28, 20)}<path d="M21,24.500 q3,2 6,0" fill="none" stroke="#2a1d05" stroke-width="1.1" stroke-linecap="round"/>${shine(17, 22)}`,
  fish: svg`<path d="M6,24 C12,12 28,10 36,24 C28,38 12,36 6,24 Z" fill="#2aa6c9" stroke="#0c4a5e" stroke-width="1.4"/><path d="M35,24 L45,15 V33 Z" fill="#2390b0" stroke="#0c4a5e" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M18,14.500 q4,-5 8,-.5" fill="#2390b0" stroke="#0c4a5e" stroke-width="1.2"/><path d="M22,20 q4,4 0,8 M27,20 q4,4 0,8" fill="none" stroke="#0c4a5e" stroke-opacity=".5" stroke-width="1.1"/>
    <circle cx="13" cy="22" r="2.6" fill="#fff"/><circle cx="13.400" cy="22" r="1.3" fill="#1d1d1d"/>${shine(18, 18)}`,
  cat: svg`<path d="M9,18 L8,6 L19,12 Z M39,18 L40,6 L29,12 Z" fill="#8a8f98" stroke="#33363b" stroke-width="1.4" stroke-linejoin="round"/><ellipse cx="24" cy="27" rx="17" ry="15" fill="#9aa0a9" stroke="#33363b" stroke-width="1.4"/>
    ${eyes(17, 31, 24)}<path d="M22.500,29.500 h3 l-1.500,2 z" fill="#e58a9a"/><path d="M24,31.500 q-3,3 -6,1 M24,31.500 q3,3 6,1 M8,27 h7 M9,31 l6,-1 M40,27 h-7 M39,31 l-6,-1" fill="none" stroke="#33363b" stroke-width="1" stroke-linecap="round"/>${shine(16, 17)}`,
  frog: svg`<circle cx="15" cy="13" r="7" fill="#57b947" stroke="#1f5a17" stroke-width="1.4"/><circle cx="33" cy="13" r="7" fill="#57b947" stroke="#1f5a17" stroke-width="1.4"/><ellipse cx="24" cy="28" rx="18" ry="14" fill="#63c552" stroke="#1f5a17" stroke-width="1.4"/>
    <circle cx="15" cy="13" r="3.6" fill="#fff"/><circle cx="33" cy="13" r="3.6" fill="#fff"/><circle cx="15.500" cy="13.500" r="1.8" fill="#1d1d1d"/><circle cx="33.500" cy="13.500" r="1.8" fill="#1d1d1d"/>
    <path d="M13,31 q11,8 22,0" fill="none" stroke="#1f5a17" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="29" r="2.4" fill="#f28ba0" opacity=".7"/><circle cx="36" cy="29" r="2.4" fill="#f28ba0" opacity=".7"/>${shine(18, 22)}`,
  strawberry: svg`<path d="M24,44 C10,36 6,24 9,16 C13,10 35,10 39,16 C42,24 38,36 24,44 Z" fill="#e3263b" stroke="#6b0a16" stroke-width="1.4"/>
    <path d="M24,14 C18,6 12,8 9,12 C14,13 15,16 18,15 C20,18 28,18 30,15 C33,16 34,13 39,12 C36,8 30,6 24,14 Z" fill="#3fa63a" stroke="#1f5a17" stroke-width="1.2" stroke-linejoin="round"/>
    <g fill="#ffe08a"><ellipse cx="17" cy="23" rx="1.1" ry="1.7"/><ellipse cx="24" cy="24" rx="1.1" ry="1.7"/><ellipse cx="31" cy="23" rx="1.1" ry="1.7"/><ellipse cx="20" cy="30" rx="1.1" ry="1.7"/><ellipse cx="28" cy="30" rx="1.1" ry="1.7"/><ellipse cx="24" cy="36" rx="1.1" ry="1.7"/></g>${shine(15, 20)}`,
  apple: svg`<path d="M24,15 C16,8 5,13 6,25 C7,36 15,44 24,40 C33,44 41,36 42,25 C43,13 32,8 24,15 Z" fill="#7cc242" stroke="#2e5c12" stroke-width="1.4"/><path d="M24,15 C24,10 26,7 29,5" fill="none" stroke="#5a3a12" stroke-width="2" stroke-linecap="round"/>
    <path d="M27,9 C32,4 38,6 39,8 C36,12 30,12 27,9 Z" fill="#3fa63a" stroke="#1f5a17" stroke-width="1.1"/>${shine(15, 20)}`,
  star: svg`<path d="M24,4 L29.900,17.200 L44,18.900 L33.500,28.600 L36.400,42.700 L24,35.600 L11.600,42.700 L14.500,28.600 L4,18.900 L18.100,17.200 Z" fill="#ffd23f" stroke="#8a6a05" stroke-width="1.4" stroke-linejoin="round"/>${eyes(20, 28, 24)}<path d="M20,29 q4,3 8,0" fill="none" stroke="#5a4503" stroke-width="1.2" stroke-linecap="round"/>${shine(18, 17)}`,
  heart: svg`<path d="M24,42 C6,30 2,18 9,11 C15,6 22,9 24,15 C26,9 33,6 39,11 C46,18 42,30 24,42 Z" fill="#f0486a" stroke="#7a0f28" stroke-width="1.4"/>${shine(14, 17)}`,
  flower: svg`<g fill="#f6a5c0" stroke="#8a3355" stroke-width="1.2"><circle cx="24" cy="10" r="8"/><circle cx="37" cy="19" r="8"/><circle cx="32" cy="35" r="8"/><circle cx="16" cy="35" r="8"/><circle cx="11" cy="19" r="8"/></g><circle cx="24" cy="24" r="8" fill="#ffd23f" stroke="#8a6a05" stroke-width="1.2"/>${shine(21, 8)}`,
  sun: svg`<g stroke="#e08a12" stroke-width="3.4" stroke-linecap="round"><path d="M24,3 v6 M24,39 v6 M3,24 h6 M39,24 h6 M9,9 l4.500,4.500 M34.500,34.500 l4.500,4.500 M39,9 l-4.500,4.500 M13.500,34.500 l-4.500,4.500"/></g><circle cx="24" cy="24" r="12.500" fill="#ffd23f" stroke="#8a6a05" stroke-width="1.4"/>${eyes(20, 28, 22)}<path d="M19.500,27 q4.500,4 9,0" fill="none" stroke="#5a4503" stroke-width="1.3" stroke-linecap="round"/>${shine(19, 17)}`,
  briefcase: svg`<path d="M18,14 v-4 a3,3 0 0 1 3,-3 h6 a3,3 0 0 1 3,3 v4" fill="none" stroke="#1d1d1d" stroke-width="2.6"/><rect x="5" y="14" width="38" height="26" rx="4" fill="#3b3f46" stroke="#111" stroke-width="1.4"/><path d="M5,25 h38" stroke="#111" stroke-width="1.4"/><rect x="20.500" y="22" width="7" height="6" rx="1.5" fill="#c9a24b" stroke="#5a4310" stroke-width="1"/>${shine(13, 19)}`,
  teddy: svg`<circle cx="12" cy="11" r="6.500" fill="#b9793f" stroke="#5a3412" stroke-width="1.4"/><circle cx="36" cy="11" r="6.500" fill="#b9793f" stroke="#5a3412" stroke-width="1.4"/><circle cx="12" cy="11" r="3" fill="#e6b98a"/><circle cx="36" cy="11" r="3" fill="#e6b98a"/>
    <circle cx="24" cy="26" r="17" fill="#c58a4d" stroke="#5a3412" stroke-width="1.4"/><ellipse cx="24" cy="31.500" rx="7.500" ry="6" fill="#edc9a0"/>${eyes(17.500, 30.500, 23)}<ellipse cx="24" cy="29" rx="2.600" ry="1.900" fill="#2a1705"/><path d="M24,31 v2.500 q-3,2 -4.500,.2 M24,33.500 q3,2 4.500,.2" fill="none" stroke="#2a1705" stroke-width="1.1" stroke-linecap="round"/>${shine(15, 17)}`,
  teacup: svg`<path d="M34,22 h4 a5.500,5.500 0 0 1 0,11 h-5" fill="none" stroke="#3a5a8a" stroke-width="3"/><path d="M7,18 h28 v9 a12,12 0 0 1 -12,12 h-4 a12,12 0 0 1 -12,-12 z" fill="#fdfaf2" stroke="#3a5a8a" stroke-width="1.4"/>
    <path d="M9,24 q12,5 24,0" fill="none" stroke="#3a5a8a" stroke-width="1.2"/><g fill="#e36a8a"><circle cx="15" cy="30" r="1.800"/><circle cx="21" cy="33" r="1.800"/><circle cx="27" cy="30" r="1.800"/></g><path d="M5,41 h32" stroke="#3a5a8a" stroke-width="2.400" stroke-linecap="round"/>
    <path d="M15,13 c-2,-3 2,-4 0,-7 M22,13 c-2,-3 2,-4 0,-7 M29,13 c-2,-3 2,-4 0,-7" fill="none" stroke="#9aa5b5" stroke-width="1.400" stroke-linecap="round"/>${shine(13, 22)}`,
};
/** A novelty magnet by its name. styles.ts gives it the shadow it casts on the door. */
export const novelty = (name: string) => svg`<svg class="novelty" viewBox="0 0 48 48" aria-hidden="true">${NOVELTIES[name]}</svg>`;

/** The shading of a button magnet's dome. Once in each shadow root that draws any. */
export const DEFS = svg`<svg class="defs" width="0" height="0" aria-hidden="true"><defs>
  <radialGradient id="dome" cx=".36" cy=".28" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient>
</defs></svg>`;
