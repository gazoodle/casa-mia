# Camera Commander: a closer look at the camera's full screen

Specified 2026-11-27 with the owner; not built. This is the plan to build from. Where it
says "decided", the owner decided it; don't reopen it. Where it says "not known", don't
guess and don't tune: build what is written, and say it in your report.

Read `CLAUDE.md` and `HANDOVER.md` first, as always. This plan names every file to touch.
If you find you need a file that is not named here, stop and say why before touching it.

## What it is

On the main camera's full screen (the card's **A tap on the main camera: full screen, with
its controls**), the live picture can be enlarged on the screen and moved about:

- two fingers pinch it, about the point between them;
- the mouse wheel enlarges it, about the pointer;
- one finger, or a mouse drag, moves it while it is enlarged.

It is the picture enlarged by the browser, not the camera's lens. The video goes on
playing throughout. Enlarging goes past one video pixel per screen pixel, up to a limit.
While enlarged, the card asks for a channel with enough pixels for the enlarged size, so
a high-resolution camera shows detail that the screen-sized channel doesn't have.

**The name in code is "closer"** (`closer.ts`, `Closer`, `.closer`), after Dash-Bored's
"a closer look". "Zoom" in the commander already means the camera's lens (`Line` "zoom",
`_zoomTo`, `lines.zoom`, `ZOOM_PENDING_MS`): don't use that word for this in code, and
don't rename the lens's.

**Which full screen:** the card has two. This work is only for `_full` (base.ts: one
camera live over the window, the `.full` element in card.ts). It is not for `_screen`
(the **Full** button, the whole commander over the screen), and not for the main area in
the page, where the wheel would stop the dashboard scrolling.

## Decided

1. **The enlargement is a lease.** It goes back to the whole picture 60 s after the last
   touch or wheel turn, by itself. Why: a wall tablet left enlarged on the gate shows a
   patch of gravel while someone stands at the door. It also goes back when the camera's
   full screen is left.
2. **A tap while enlarged goes back to the whole picture.** A second tap leaves the full
   screen, as a tap does today. No double tap: it would delay every single tap.
3. **A drag or a pinch is never a tap.**
4. **A chip says the picture is enlarged**, with how much ("2.4×"), in the camera's
   caption beside its name. A tap on it goes back to the whole picture. It is in the
   caption and not the controls bar, so the controls never move under a finger when it
   comes and goes.
5. **The limit is in video pixels:** 4 screen pixels to one video pixel of the camera's
   largest channel (`MOST_PX`, one number). The least is the whole picture.
6. **The pure maths is shared with Dash-Bored**, which already has it
   (`integration/cards/src/dash-bored/zoom.ts`: `zoomed`, `grip`). It moves to one shared
   file; it is not written a second time.
7. **The transform is written to the element directly while fingers move**, as Dash-Bored
   does, and the card is redrawn only when the chip's text changes. Why: the card's
   `render()` lays out the whole commander, and a pass of it per pointer event is the
   defect that core "Optimise: do it once" names.

## Not in this work

Don't build any of these, however small they look:

- joining it to the camera's own zoom (lens first, then the picture);
- a closer look anywhere but the camera's full screen;
- remembering it between visits, or a setting for it in the card's editor or the app;
- double tap, keyboard keys, momentum, rubber-banding, a mini-map;
- Safari's `gesturestart`/`gesturechange` events (a trackpad pinch in Safari on a Mac);
- `image-rendering` or any other change to how the browser smooths the picture;
- a different wheel curve for trackpads (see "Not known");
- anything in Python, the app, the editor, `layout.json` or the compositor;
- logging: a closer look is not an event for Home Assistant's log.

## Not known

Build as written; the owner tries these on the devices afterwards. Put them in your
report as not verified. Don't add code for them.

- Whether a pinch in Safari on an iPhone reaches the card with `touch-action: none`
  alone. It does for Dash-Bored's photograph in the Home Assistant app.
- How the wheel feels on a trackpad (many small events, each a `STEP`).
- Whether an old tablet can decode the largest channel. If not, the existing ladder marks
  that channel bad and the smaller one stays on screen, enlarged (live.ts: `liveLost`).

## How it works

The file and line numbers are as of 2026-11-27 (HEAD `d58596d4` plus uncommitted work).
Check each against the code before editing.

### Today

- `card.ts:400-412` draws the full screen: `.full` holds `.seen` (the `<video>`s, with
  the Security look's filter), then `.zone` (whole screen, `@click` sets `_full = ""`),
  the caption, the controls bar and Talk's parts.
- `card.ts:183` makes `screen`, the window in device pixels, and `card.ts:186-187` gives
  it to `liveNow`, which picks the channel that fits it (`common.ts: liveOrder`,
  `ha.ts: liveChannel`) and plays a better one unseen until its first frame
  (`common.ts: livePlan`). This already swaps channels without a gap, in both directions.
- `live.ts: caption` draws the caption: the title, then `detectionChips`.
- The card redraws once a second while live (`live.ts: onBeat`), and `updated()` runs
  after every redraw.

### The shared maths: `integration/cards/src/zoom.ts` (new)

Moved from `dash-bored/zoom.ts`, verbatim but for what is listed:

- `View`, `WHOLE`, and `STEP` (exported now).
- `zoomed`, with three more parameters at the end: `most`, and the picture's size in its
  box, `pw = w` and `ph = h`. `MOST` is no longer read inside it. The two limits become
  `Math.max(0, (s * pw - w) / 2)` and `Math.max(0, (s * ph - h) / 2)`, which is what is
  there now when the picture fills its box. Why the picture's size: a 16:9 camera on an
  upright phone has black above and below it, and with the box's size as the limit the
  picture could be dragged half off the screen.
- `grip`, taking the points as a parameter (`at: [number, number][]`) and not reading a
  module's map.

`dash-bored/zoom.ts` keeps `MOST`, `TAP`, its `view` and `fingers`, `turn` and `look`,
imports the rest, and passes `MOST` and `[...fingers.values()]`. Its behaviour doesn't
change. `clipping.ts` is not touched.

### The commander's part: `integration/cards/src/commander/closer.ts` (new)

One file, about 100 lines, in this shape. The names are decided; tidy the bodies as the
code needs, but add no feature.

```ts
import { html, nothing } from "lit";
import { STEP, WHOLE, grip, zoomed, type View } from "../zoom.ts";

/** How long an enlarged picture stays so after the last touch: a lease (decided 1). */
export const CLOSER_MS = 60_000;
/** The closest: this many screen pixels to one video pixel of the largest channel. */
export const MOST_PX = 4;
/** A finger that travels further than this (CSS px) is dragging, not tapping. */
const SLOP = 8;

/** For a camera's channels shown whole in `box` (CSS px) on a screen of `ratio` device
 * pixels to one: the most it can be enlarged, and the picture's size in the box at 1.
 * With no channel's size known: MOST_PX times, and the picture taken to fill the box. */
export function closerLimits(channels: [string, number, number][], box: [number, number], ratio: number): { most: number; pic: [number, number] } {
  const [, vw, vh] = channels.reduce((a, b) => (b[1] > a[1] ? b : a), ["", 0, 0]);
  if (!vw || !vh) return { most: MOST_PX, pic: box };
  const k = Math.min(box[0] / vw, box[1] / vh); // CSS px to a video pixel, shown whole
  return { most: Math.max(1, MOST_PX / (k * ratio)), pic: [vw * k, vh * k] };
}

export class Closer {
  view: View = WHOLE;
  /** The closest it has been since it was last whole: what the channel is chosen for,
   * so a pinch in and out doesn't change channels back and forth. */
  asked = 1;
  private fingers = new Map<number, [number, number]>();
  private travelled = 0;
  private dragged = false;
  private gone: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private wake: () => void,                                   // redraw the card
    private picture: () => HTMLElement | null,                  // the .closer element now
    private limits: (box: [number, number]) => { most: number; pic: [number, number] },
  ) {}

  label = () => `${this.view.s.toFixed(1)}×`;

  /** Write the view to the picture's element. Called after every change, and by the
   * card after every redraw, so a new element can never show another's view. */
  show(): this { /* el.style.transform = s === 1 ? "" : `translate(${x}px, ${y}px) scale(${s})` */ }

  /** Back to the whole picture; redraws the card only if that changed anything. */
  whole(): this { /* clear the timer and the fingers; view = WHOLE; asked = 1; show(); wake() if it was enlarged */ }

  /** Whether a click on the zone is the card's, to go back from the full screen: not
   * after a drag or a pinch, and while enlarged it goes back to the whole picture. */
  tap(): boolean {
    if (this.dragged) return false;
    if (this.view.s === 1) return true;
    this.whole();
    return false;
  }

  down = (e: PointerEvent) => { /* with no finger down: travelled = 0, dragged = false. Capture the pointer; add the finger */ };
  move = (e: PointerEvent) => { /* as Dash-Bored's look.move; add the grip's travel to `travelled`; dragged once travelled > SLOP or two fingers are down */ };
  up = (e: PointerEvent) => { /* remove the finger */ };
  wheel = (e: WheelEvent) => { /* preventDefault; turn by STEP or 1 / STEP about the pointer */ };

  /** One change of view: the limits for the zone's box now, the new view, `asked`, the
   * transform, the lease renewed (cleared at s === 1), and a redraw if the label changed. */
  private turn(zone: HTMLElement, by: number, x: number, y: number, dx = 0, dy = 0) { /* … */ }
}

/** The chip that says the picture is enlarged; a tap goes back to the whole picture. */
export function closerChip(closer: Closer) {
  if (closer.view.s === 1) return nothing;
  return html`<button class="closer-chip cm-chip cm-on" title="The picture is enlarged ${closer.label()}: tap for the whole picture" @click=${() => closer.whole()}>
    <ha-icon icon="mdi:magnify"></ha-icon>
    <span>${closer.label()}</span>
  </button>`;
}
```

Notes on it:

- `turn` reads the box from `zone.getBoundingClientRect()`, and the point from the box's
  middle, exactly as Dash-Bored's `turn` does.
- The lease is one `setTimeout(() => this.whole(), CLOSER_MS)`, cleared and set again by
  every `turn` that leaves the picture enlarged. Use the global `setTimeout`, not
  `window.setTimeout`, so the test runs in Node.
- The handlers are arrow properties, so the card binds them as they are.
- The chip is a real `cm-chip` from the shared pills (core: UI). No new chip styles
  beyond what is listed under "Styles".

### The card: `integration/cards/src/commander/card.ts`

Six changes, and no others:

1. Import `Closer`, `closerChip` and `closerLimits`.
2. A field beside `place`:
   ```ts
   /** The closer look at the camera's full screen (closer.ts). */
   private closer = new Closer(
     () => this.requestUpdate(),
     () => this.renderRoot.querySelector<HTMLElement>(".closer"),
     (box) => closerLimits(this.now().card?.cameras[this._full]?.channels ?? [], box, screenRatio()),
   );
   ```
3. `disconnectedCallback`: `this.closer.whole();` (it clears the timer).
4. `updated()`, beside the line that drops `_full` when live can't play:
   `if (this._full) this.closer.show(); else this.closer.whole();`
5. `render()`, where `liveNow` is called (`card.ts:186-187`): when `full`, the place
   given is `screen` with its width and height multiplied by `this.closer.asked` and
   rounded. Check what else reads `screen` first; if anything does, make a second
   constant and leave `screen` as it is.
6. The full screen's template (`card.ts:402-404`):
   - the videos go inside one more element:
     `<div class="seen" style="filter:…"><div class="closer">${videos(…)}</div></div>`.
     The `.closer` element has no bound `style`, so Lit never writes over the transform.
   - the zone gets the handlers, and its click asks first:
     `@pointerdown=${this.closer.down} @pointermove=${this.closer.move} @pointerup=${this.closer.up} @pointercancel=${this.closer.up} @wheel=${this.closer.wheel} @click=${() => { if (this.closer.tap()) this._full = ""; }}`
   - the caption is given the chip: `this.caption(title, whole, live, closerChip(this.closer))`.

The main area's own `.seen`, zones and caption (`card.ts:346` and around it) are not
touched.

### The caption: `integration/cards/src/commander/live.ts`

`caption` takes a fourth parameter, `more: unknown = nothing`, drawn straight after
`${detectionChips(…)}`. Nothing else changes in this file. (`Closer` lives on the card,
a higher layer, so `caption` can't reach it itself: core "Source hygiene", layers.)

### Styles: `integration/cards/src/commander/full.ts`, in `fullStyles`

```css
/* The closer look (closer.ts): the videos' element is enlarged and moved inside .seen,
   which cuts off what leaves the screen. The zone takes the touches itself, as Home
   Assistant's page turns the browser's own zoom off. */
.full .seen { overflow: hidden; }
.closer { position: absolute; inset: 0; }
.full .zone { touch-action: none; }
```

And the chip has to take the pointer inside the caption. Find the rule in `styles.ts`
that gives `.detection` (or the caption's chips) `pointer-events`, and add
`.closer-chip` to that selector. If the detection chips have no such rule, add
`.caption .closer-chip { pointer-events: auto; }` to `fullStyles`. Its size, font and
shape are the pill's own: add no sizes.

## Steps, in this order

Say what you are doing at each step (core: 30-second feedback). Don't commit and don't
push: the owner asks for those.

**0. Before any edit.**
- `tokensave_status`, and use tokensave to read code (RULE ONE).
- The version (RULE ZERO): compare `git show HEAD:pyproject.toml` with the working
  tree's. On 2026-11-27 HEAD held `2026.11.14-b23` and the tree `2026.11.14-b24`,
  uncommitted, with other work in it (the clock and buttons cards). If that is still so,
  **don't bump**: this goes into b24. If HEAD holds the tree's version, bump first with
  `.venv/bin/python tools/versioning.py bump`.
- The tree has other people's uncommitted work. Don't revert, reformat or tidy any of it.
- List the files you will touch (core: Reporting). They are the ones in this plan.

**1. The shared maths (a refactor: no behaviour changes).**
- Create `src/zoom.ts`; cut `dash-bored/zoom.ts` down to its own part.
- Move `src/dash-bored/zoom.test.ts` to `src/zoom.test.ts` (`git mv`), pass `6` as
  `most` in its calls, and change its path in `integration/cards/package.json`'s `test`
  script. Its assertions don't change.
- Add one test to it: a picture 400 × 100 in a box 400 × 300, enlarged twice, can't be
  moved up or down at all (limit 0) and can be moved 200 sideways.
- Run `cd integration/cards && npm test`. All green before step 2.

**2. `closer.ts` and its test, `src/commander/closer.test.ts`** (add it to the `test`
script). The test, with plain objects for the events and elements, as `detect.test.ts`
does for its timer (`mock.timers`):
- `closerLimits`: a 3840 × 2160 channel in a 1280 × 800 box gives `most` 12 and `pic`
  1280 × 720 at ratio 1, and `most` 6 at ratio 2; a 640 × 360 channel there gives
  `most` 2; no known size gives `MOST_PX` and the box.
- a tap on the whole picture is the card's (`tap()` true);
- after a wheel turn in, `tap()` is false and the picture is whole again; the next
  `tap()` is true;
- a drag of more than 8 px is not a tap; one of 3 px is;
- the lease: enlarged, then 59 s with nothing, still enlarged; 1 s more, whole, and the
  card was woken; a wheel turn at 30 s starts the 60 s again;
- `asked` keeps the closest reached while enlarged, and is 1 once whole;
- the card is woken when the label changes and not on a move that leaves it the same.

**3. The card, the caption and the styles**, as above.

**4. Build and check.**
- `tools/build_cards` (builds every bundle, runs the cards' tests, stamps the hash).
- `.venv/bin/python tools/component_versions.py --update` (the commander's bundle is
  `casa_mia`'s; Dash-Bored's bundle changes too, from step 1).
- `tokensave sync`.
- `.venv/bin/pytest -q` (it includes the file sizes, the stale-build and the component
  version checks) and `.venv/bin/ruff check .`. No Python under `integration/` is
  changed, so `tests_ha` is not needed.

**5. Write it down.**
- `app/CHANGELOG.md`, under the current version's heading, one line in the file's own
  manner, such as: "Camera Commander: on the main camera's full screen, pinch or turn the
  mouse wheel to enlarge the live picture, and drag to move it; it goes back to the whole
  picture after a minute, or at a tap".
- `docs/applets/camera-commander.md`, in the **A tap on the main camera** bullet (about
  line 343): the sentence "a tap on the picture goes back" becomes true for both cases,
  and two or three plain sentences say what is in "What it is" and decided 1, 2 and 4,
  and that this is not the camera's own zoom (which is the **Zoom** button). British
  English, no slogans (core: How we work together).
- `HANDOVER.md`: two or three lines where the commander card is described: `closer.ts`,
  the shared `src/zoom.ts`, the lease, and the "Not known" list as still to be tried.
- `BACKLOG.md`: take out the line that points at this plan.

**6. Report** (core: Reporting): the files changed, each command run with its result,
and, stated plainly, that no gesture was tried on a real device or in a browser. List
the three "Not known" items for the owner to try. Say that step 1 is a refactor, which
the owner may want as a commit of its own (it would then need its own build number:
`tools/fake_git_host.py` checks every commit).

## What "done" is

- `npm test` and `.venv/bin/pytest -q` pass; pyright has no new errors in touched files.
- `git status` shows only: the files named in this plan, the built bundles
  (`www/cm-cards.js`, Dash-Bored's `www/cards.js`, and any other bundle the build
  rewrote byte for byte differently), `integration/cards/SOURCE_HASH`, the manifests and
  `integration/versions.lock.json` that the versions tool stamped, and what was already
  changed before you started.
- No file over the size limit; `card.ts` grew by about 15 lines.
