# Contraption: the brief for building it

Contraption is to be Dash-Bored's sixth family: the house as one absurd machine that ducks
go through, where what happens to a duck says what a device is doing. It was worked out
with the owner on 2026-11-16 to 2026-11-18 in mock-ups on an invented house. This page is
what a new session needs to build it in the card: what is decided, what was tried and
dropped, what was measured, and which example shows each thing. The first build is in the
card (2026.11.9-b18): see "What the card has" at the end.

The owner's direction, which outranks everything below: "this is primarily for a laugh so
the animations are key to that ... don't compromise fun & quirky for useability otherwise,
I think the overall joke gets lost" (2026-11-17). The feel he pointed at is the Blue Ball
Machine (2026-11-18): "nuts", and not regular.

## The examples

They are plain pages in `docs/design/dash-bored/`, served by any static server from that
folder (`index.html` is the gallery). Look at them before reading code.

| Page | What it shows | Standing |
|---|---|---|
| `duck-run.html` | The Kitchen: twelve tiles placed by hand, one of each kind of thing | **The design.** Build this |
| `duck-run.html?room=gallery` | The Long Gallery: eight lights, three switched together, laid out by rule | **The design**, for lights, groups and the layout rule |
| `duck-run.html?room=house` | The Big House: fifteen such rooms, 300 tiles (`&rooms=` for more) | The size test, drawn as SVG. Its far view is superseded |
| `sprite-trial.html?tiles=1000` | The gallery's real tiles drawn by placing bitmaps on a canvas | **How it is to be drawn.** The poses are not real: it spins everything |
| `whole-house.html` | A whole house on one sheet with a view that closes on a room | Superseded, except the idea of one sheet that is zoomed |
| `waterworks.html`, `contraption.html` | Earlier Contraptions, driven by water and by a line shaft | Superseded. The bot, the skins and the bake came from here |

Every page takes `?skin=patent`, `blueprint` or `tin`. The duck run's header has a slider
for the size of a tile, cords for trying things a real house would be needed for, and a
line giving the number of tiles, how many are in view and the frames a second.

## What is decided

Each of these was agreed with the owner or settled by a measurement. Dates are when.

**The machine**

- A tile is 260 square and keeps one rule, at its edges: a duck comes in at the middle of
  one edge as the period starts and goes out by the middle of another as it ends. Inside,
  every tile is drawn by hand and does its own thing (`duck-run/tile.js`).
- Every tile runs on one period (2.6 s; 8 s for reduced motion) with one duck to a tile.
- The ducks go *through* every device in turn. One trough with devices hung under it was
  "too regular" (2026-11-18): it is a bus with taps, and reads as a wiring diagram.
- **The duck is the engine** (2026-11-18: "machinery pertinent to the device, driven by
  the ducks"). On is a clutch in, thrown at once by a tap. What the duck puts in is slow
  to run down, so a lamp stays lit between ducks. The level is how long the duck is kept
  at work. What can be read at a glance (a glow, a fire) follows the device at once; the
  duck's way changes with the next duck in, so that no duck ever jumps.
- Ducks, not balls: the duck was already ours. One wears a top hat. Now and then one is a
  goose for a lap.

**So that it does not all look the same**

- A light is built from three parts, each keeping to its own ground in the tile so that
  any goes with any (`duck-run/light.js`): a drive (belt, sprung board, treadwheel), a
  train with its own kind of clutch (flywheel and discs, cogs on an arm, slack belt and
  jockey) and a fitting (bulb, chandelier, lantern, fairy lights, desk lamp).
- The device chooses them: its name the fitting, its id the train, and the drive is
  counted along the route so that neighbours differ. A light whose level can be set has a
  meter; a colour light glows in its colour. Wattage changes nothing yet.
- Lights switched together are one machine as wide as there are lights, on a line shaft,
  each light with its own clutch (`duck-run/group.js`). Each tile of it is still one
  device: a tap switches that light.
- A room is laid out by rule (`duck-run/layout.js`, whose header states the rule): out
  along one row with a climb and a drop, back along the next, a carrier between every two
  devices, and every turn a carrier's. Device tiles go left to right only and are
  mirrored for the other way; each tile says its edges (`io`) and the page turns its words
  back. Carriers do all the corners, because gravity has to point down in a drawing.
- Not in step (2026-11-18: the bouncing ducks were plainly in time). A room's ducks still
  enter and leave their tiles together, which is the beat. Besides that, each room starts
  its period at its own moment, each tile runs up to a fifth of a period early or late
  between its ends, each tile's duck bounces on its own clock, and ducks vary in size by
  a tenth (`duck-run/main.js`).

**When things go wrong** (CLAUDE.md: nothing fails silently)

- A device that stops answering still passes its ducks (2026-11-18: a pile-up "takes the
  motive power" from everything after it). Its machine goes under a dust sheet with a
  sign saying what and since when, and a tube clamped from the way in to the way out
  carries the ducks. One drawing serves every tile (`Tile.broken`). It is not dimmed,
  because dimming means no data at all.
- When it answers again the sign says "BACK IN ORDER" at once, and the sheet stays on
  until the bot has been round to pull it off.
- With no data from the house the ducks slow, stop and sleep under a notice saying since
  when, and the whole sheet dims.
- Small things work loose and a unicycle bot mends them (2026-11-18: "a machine of this
  complexity is bound to have breaks", never enough to stop it). A tile says where
  (`faults`): a bearing squeaks for oil, a bolt rattles, a cord frays and is mended with a
  knot that goes round with the cord from then on (`duck-run/faults.js`,
  `waterworks/bot.js`). Things go wrong only where they can be seen.
- Proposed, and the owner liked it (2026-11-18): a crew of bots sized to the house, about
  one to a hundred tiles, the nearest free one taking a job. Not built.

**How it is drawn** (2026-11-18: "there has to be another way"; core: Optimise, do it once)

- By placing bitmaps on a canvas, not by moving an SVG. Each part is made a bitmap once,
  in one atlas, and a frame only places them (`duck-run/sprites.js`). The SVG is still
  how a tile is drawn and written: the bitmaps are made from it.
- Never turn a bitmap as it is drawn. A part that turns is made as a ring of 24 bitmaps,
  once, and the frame picks one (`Sprites.turned`).
- Only what is in view is worked, and which tiles those are is found on a scroll or a
  change of size, never frame by frame.
- The house is one sheet that is zoomed, not pages to go between.
- The three skins stay. A skin is a set of materials (`waterworks/style.css`); a drawing
  names its parts by what they are made of.

## What was measured

Headless WebKit and Chromium through Playwright on the owner's Mac, 1366 by 900, counting
frames over two or three seconds, unless it says the iPad. The pages print their own rate.

| What | Result |
|---|---|
| SVG, 12 or 20 tiles | 61 frames a second; the gallery in the engraving skin 45 to 58 in WebKit |
| SVG, 300 tiles all in view | 9 in WebKit, 6 in the engraving |
| SVG, 40 of 300 in view, the rest left alone | 31: no better than working them all |
| SVG, 40 of 300 in view, the rest taken out of the drawing | 60 |
| Bitmaps, 300 and 1,000 tiles all in view | 60 in WebKit (Chromium 60 and 47) |
| Bitmaps, 3,000 tiles all in view | 41 to 44 in WebKit (Chromium 21) |
| Bitmaps turned as drawn, 2,070 pieces a frame | 13 in WebKit, against 60 placed straight |
| Bitmaps on the owner's iPad in Safari, 5,000 tiles all in view | 26 (owner, 2026-11-18). His floor for a whole-house view is 25 |
| Making the atlas | about 40 ms |

Two lessons that are easy to lose. The SVG's cost is the browser's, for the size of the
drawing, so skipping work on tiles out of view saves nothing unless they are taken out of
the drawing. And a group held at opacity 0 is still composited: the hidden fault markers
cost ten frames a second until they were hidden by `display`.

One trap. Safari on the iPad kept an old copy of one script beside new copies of the rest,
and the page it made of the mixture looked like a fault in the drawing (2026-11-18). The
duck run and the trial ask for their scripts afresh on each load for that reason.

## Tried and dropped

So that nobody builds them again.

- Water as what is carried, with one trough per room and a device under each tap
  (`waterworks.html`, `whole-house.html`): too regular, and nothing to follow.
- Ducks piling up in front of a device that has stopped: it stops everything after it.
- Dimming a broken tile: it already means no data.
- A far view that shows the machinery as one still bitmap with only ducks moving
  (`duck-run/main.js`, `far`): a way round the SVG's cost, not needed with bitmaps.
- A film strip of each tile, as the Blue Ball Machine is: tens of megabytes a tile, and a
  tap could only take effect at the next loop.
- A layer of the browser's compositor for every part: too much memory on a tablet.

## What the mock-up has, file by file

In `docs/design/dash-bored/duck-run/`, plain scripts on an invented house.

| File | What it is | For the card |
|---|---|---|
| `tile.js` | The tile's rule, a way through a tile as points and hops, the lamp, the caption, the dust sheet and tube | Carry over |
| `light.js`, `group.js` | Lights from parts, and lights switched together | Carry over |
| `carriers.js` | Eight tiles that only carry ducks | Carry over; more are wanted |
| `devices.js` | The Kitchen's kettle, boiler, blind and counter light | **Redraw.** They are the sparse first drawings, with fixed corners |
| `layout.js` | The rule that lays a room out | Carry over; it places only left-to-right tiles |
| `faults.js` | What works loose, and asking the bot | Carry over |
| `main.js` | The loop: loops of tiles, the period, in view, covers, the cords | The logic carries over; its drawing is SVG and is replaced |
| `sprites.js` | Measuring a tile's parts, the atlas, the turned rings | Carry over: it is the start of the renderer |
| `trial.js` | The bitmap trial | Throw away |
| `rooms.js` | The invented rooms | Not needed: the card has the real house |

Shared with the older pages, in `waterworks/`: `bot.js` (the bot; `setup` gives it floors
and a pole), `bake.js` (a drawing into a bitmap with the skin's values; `plain` is the
one the atlas uses), `style.css` (the skins), `page.js` (skin buttons and cords).

## What is left to do

**The renderer.** The trial proves the drawing, not the machine.

- The poses go through `Kit.move`, `turn` and `show` (`contraption/kit.js`). Those are to
  write to a list of parts, and a frame places the list.
- Some poses change a shape or an attribute, and need another way: a line drawn on the
  canvas, or a move in its place. They are `set(..., "d")` for the rod, the cog arm, the
  two runs of the slack belt and the jockey's stem (`light.js`), the trampoline's mat
  (`carriers.js`) and the bot's tongs (`bot.js`); `cx` and `cy` for the arm's knob, the
  jockey, the seesaw's weight, the tap's drip and the oil's drip; `height` for the blind;
  and text for the boiler's temperature and every caption.
- A tile's still part is one bitmap, made again when its device changes (its caption is
  in it).
- The atlas is made again for each zoom, and has to be split where it would pass a
  tablet's limit for one canvas: at 260 px a tile and 2 px to the px it was 4,094 by
  8,189, over Safari's 16.7 million. Not handled, and not tried on the iPad.
- An invisible button over each tile, for taps, the keyboard and screen readers. The
  mock-up's are SVG rectangles with a label and a pressed state.

**The tiles.**

- Left-to-right tiles, with the duck as engine, for every kind of device the house has.
  Only lights have them. Ideas agreed for the Kitchen's: kettle, a bellows; boiler, a
  pump; blind, a treadwheel and counterweight; counter light, a hammer, dominoes and a
  match. `contraption/machine.js` has a mechanism for each of fifteen kinds, as ideas.
- A plain stand-in tile for a kind that has none yet, so that a real room can be shown.
- More carriers: the gallery uses each of six twice.
- Setting a level from the page. A tap only switches.

**The house.**

- Each room is its own loop in the mock-up. One stream through the whole house, and how
  rooms sit on the sheet as irregular clumps, are not designed.
- Where scenes and guarded devices (a lock, an alarm) go is not designed.

## Building it in the card

- `HANDOVER.md`, "The page and the families", says how a family is added: an entry in
  `FAMILIES` in `shell.ts`, an element in `index.ts`, and a class on `family.ts`, which
  gives it the house, the settings feed, calls and faults. Its Dash-Bored section also
  says what each new family owes the capability table and its test.
- The first build the owner asked for (2026-11-18): the renderer, the tiles there are,
  and one room, his own kitchen, read live from Home Assistant. Nothing of his house goes
  in the repo (CLAUDE.md, RULE MINUS ONE); the mock-ups' house is invented and stays so.
- Digs, the fifth family, went in as 2026.11.9-b16 (2026-11-18) and is the newest example
  of adding a family to those three files. Contraption starts as the build after it.
- Measure in WebKit before and after, and on the iPad before calling it done. The Mac's
  headless figures were lower than the iPad's, so they are a safe floor.

## What the card has

The first build, 2026.11.9-b18 (2026-11-18), in `integration/cards/src/dash-bored/`:
`contraption.ts` and `contraption/`. `HANDOVER.md` has its shape. Against "What is left to
do":

- **The renderer is built.** Poses write to a list of parts (`kit.ts`) and a frame places
  it (`stage.ts`). A part that turns says how it is made into bitmaps with `data-ring`: all
  round, round a part of the circle for a wheel whose spokes repeat, or between two ends
  for a lever. A shape that changes is a line drawn on the canvas (the rod, the cog arm,
  the slack belt, the trampoline's mat, the bot's tongs) or a move (the knob, the jockey,
  the drips). A caption is in its tile's still bitmap, which is made again in its place
  when the words change. The atlas is in pages of at most 4,096 px a side, and is made no
  finer than 2 px to the unit. Each tile has a real button over it.
- **Not as the mock-up:** the patent skin's lines wobble but do not boil, and it has no
  grain. The bot has no puff of steam. The bottle shakes from side to side, not by turning.
- **Tiles:** lights, lights switched together (a Home Assistant light group), six carriers
  and a stand-in crate for every other kind. The Kitchen's own device tiles are still to
  be redrawn.
- **Measured** on a throw-away harness with an invented kitchen of 13 devices (28 tiles),
  headless on the owner's Mac at 1366 by 900 and two px to the px: 60 frames a second in
  Chromium and in WebKit, with the atlas in one page at 140 px a tile and two at 260.
  Not measured on the iPad.

### Height, turns and a stream that parts (2026.11.9-b19, 2026-11-18)

The owner saw the first build on his own house and found it "too conveyor belt-ish": it
wanted more movement up and down, escalators and slides, direction shifts, 90 degree
bends, and a block that sends a duck to one of two or three exits. He then settled how a
stream that parts is kept fed: "we don't need to slow down, or speed up ducks, we can have
a 'leave the game' and 'join the game' hole in the canvas". This replaces three things
decided above: the ducks no longer go through every device in turn, a room is no longer a
closed loop, and there is no longer one duck to a tile.

- **Holes** (`points.ts`). A room's stream starts at a hole and ends at one. A redirector
  sends the duck that arrives out by each of its ways in turn, and a spare climbs out of
  its hole for each of the others. A collector lets one duck go on and the rest go down
  its hole. So every tile still has a duck every period, on every way, and the lengths of
  two ways between a redirector and a collector need not match.
- **A tile may have several ways in or out** (`tile.ts`: `io` is "L>RTB" for three ways
  out). `duck` is told which way in this duck came by and which way out it goes.
- **Carriers that change row** (`climbs.ts`): an escalator and a slide, each two tiles that
  meet at the middle of the edge between them; a lift; and the mock-up's cutlery.
- **The layout rule** is in `layout.ts`'s header: a band three rows deep, a climb or a drop
  after each device by itself, a fan of two or three lanes for devices that come
  together, and a new band running back the other way after about seven columns.
- **Measured** on the harness: 19 devices are 51 tiles in three bands, 60 frames a second
  in headless WebKit at 1366 px wide, and the sheet fits that width at 140 px a tile.
  Not measured on the iPad.
- **Left:** the redirector and collector are plain drawings; more plain bends are wanted
  (the corners are still the toaster, the bottle, the plughole and the trampoline); a fan's
  lanes run flat; the first band of a room with several starts part-way along the sheet.
