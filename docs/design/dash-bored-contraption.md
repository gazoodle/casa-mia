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

### A network of loops (2026.11.9-b20, 2026-11-18)

The owner saw b19 on the test VM and asked for what replaces most of it: "a network of
loops, some on the main screen, like the dumb-waiter, some in the underground in tunnels
of dim dashed lines [with dashed ducks too] ... engineered to be clean". The spares were
"always colliding at the entry and stuttering at the exits" and were to "merge in turn";
the collector was to be "a little roundabout affair"; the dumb waiter "could be in the
centre and feed both left and right".

- **Clean is a rule, and it is tested** (`flow.ts`, with no drawing in it). Every way in,
  every way out and every tunnel carries one duck a period, on the one beat. A tile that
  sends out more than it takes in gets the rest up its hole; one that takes in more puts
  the rest down. `layout.ts` `links` refuses a layout that does not balance. The node
  test runs 200 periods of every room and finds one duck on every way and in every place
  of every tunnel, with none made or lost. The two end holes of b19 are gone.
- **Taking turns is one line** (`tile.ts` `dealt`), which the flow and the tiles that
  show it both go by, so the arrow points where the duck goes.
- **The shaft and the wings** are in `layout.ts`'s header. A wing's end feeds its own
  band's redirector on the shaft. The shaft has a top tile, where the duck that rode up
  goes down a hole, and the tunnel from there feeds the foot.
- **Tunnels** (`underground.ts`) are made of level, upright and 45 degree runs, on three
  layers (owner: "so you don't have to have complex network layout algorithms and clash
  detection").
- **Tubes, and keeping them apart.** The owner saw the first tunnels and asked: "Could
  tunnels be a tube rather than just a single dotted line? And we ought to try to keep
  them away from each other", and later "I have no problem with the underground tunnels
  having Y-junctions, T-junctions or anything else needs to fill it up".
  - A layer's tunnels are stroked wide and dashed, and then their inside is rubbed out
    of the canvas (`stage.ts` `tube`). So the sheet shows through a tube, runs on one
    layer that meet are open to each other as a junction, and a nearer layer goes over
    a deeper one. A run that several ways share is drawn once (`run.ts`).
  - A tunnel is placed by trying about fifty ways and keeping the one that crowds the
    runs already there least (`placed`, `crowds`). A tunnel may join one bound for the
    same hole at a bend and share the rest of its way. It is a best try and not a
    proof. The node test asks that in its sixteen rooms no two tubes bound for
    different holes run alongside closer than 40 units, and that holds.
  - A duck in a tube goes a tile's length a period, as on the sheet. A way is seldom a
    whole number of tiles long, so the duck waits out the odd part of a period out of
    sight in a hole (`Way.lead`). Tunnels bound for one hole arrive a part of a period
    apart, so that in a tube they share their ducks go alternately. This replaced my
    first plan, of making each tunnel a whole number of tiles long with a kink.
- **The long way round** (`underground.ts` `wander`; owner: "a pointless tunnel system
  to fill blank spaces, driven from the top exit of the dumb waiter"). It is the dumb
  waiter's return, so it costs the flow nothing. It forks under the top hole, one way
  for each side of the shaft, and a side with eight or more empty places forks again;
  the ducks take the two or four ways in turn. Each way calls at the places with no
  tile, row by row, and the one that reaches the emptiest place winds into an
  eight-sided spiral there. The ways do not join again before the foot's hole: they
  would need lengths exact to the tile for their ducks not to meet. `flow.ts` `beats`
  gives each way a number of periods such that one duck still comes up each period.
- **The shaft keeps one pace** (owner: "The duck doesn't travel at the same speed as the
  dumb waiter, either it must or the waiter goes in favour of stairs or escalator").
  Every tile of the shaft moves a board at the lift's pace, and a duck on a board moves
  with it. At an arrow the duck that rode in stays on to go up, or hops off before the
  arrow to go sideways. A spare that is to go up is the last spare to the arrow and
  waits there for the board to come up under it.
- **The toaster's bucket** (owner: "The water shower should just run its water
  downwards, not track the duck, and it can be a tipping bucket if that's more
  humorous, ala Mouse Trap game"). It tips as the duck lands and the water falls
  straight down.
- **Ready for Topology** (`docs/design/topology.md`): a layout is a block in its own
  columns and rows that the machine places, and nothing in Contraption says how rooms
  adjoin. The shaft is where a floor above or below would join.
- **Owner, 2026-11-18, on seeing the tubes (2026.11.9-b21):**
  - "The tunnel lines don't need to move, and they can all be the same dashed style."
    The dashes no longer creep and are one pattern; a layer shows only by how dim it is.
  - "We need to make tin-toy substantially different, it feels very much like the
    patent-engraving." It was muted paint on cream. It is now bright flat paint with a
    heavy keyline on a turquoise ground with dots (`skins.ts`). A skin is still only
    data, so a tile needed no new drawing. Why it matters: a skin that shares the
    engraving's ground reads as the same skin whatever its paint.
  - "The family switcher should probably use blue-print as its style guide for the
    actual image." Contraption's picture in the choice of family (`shell.ts`) is drawn
    as the blueprint skin is.
- **Machinery on the y-axis (2026.11.9-b22).** The owner, 2026-11-18: "all machinery is
  either left-right or right-left, but there is no reason to not have top-bottom or
  bottom-top". This overturns "device tiles go left to right only", which was decided
  when every turn was a carrier's. Why: with devices only on the level, a room read as
  rows however much the stream climbed between them.
  - A device stands upright in the row between, where the stream goes two rows down or
    up (`layout.ts`). The stream can only do that from the top or bottom row, so one
    time in three it leaves the middle row instead of fanning out there, and a device
    stands upright every other time it could.
  - A light's upright drives are in `light.ts` `UPRIGHT`, drawn for the way gravity
    points: a paddle wheel for a duck going down, a ladder on rollers for one going up.
    They turn the same pulley, so the trains and fittings are the same eleven drawings,
    and the duck goes by in front of the train.
  - The stand-in crate hangs on ropes (`devices.ts`).
  - Lights switched together stay level.
  - Seen in one still on the harness (a crate going down). The two light drives are
    tested for where the duck is at the edges and have not been looked at.
- **Freer routing (2026.11.9-b22).** A lane of a fan holds one thing or two, of any
  kind, and a lane shorter than the longest is made up with carriers (owner: "no need
  to limit the branches to single items"). Which hole feeds which does not matter to
  the flow so long as each tile gets its number, so within a band each hole feeds the
  next one along. I kept it within a band so that tunnels stay short enough to place
  apart; across bands is one line to change. Tunnels now try up to four times as many
  ways while they still run alongside another, and may leave a hole upwards. Two from
  the same hole may leave it together, which the spacing test allows.
- **The shows (2026.11.9-b22, `shows.ts`).** The header there has what they do, in the
  owner's words. Neither touches the flow. The tongs only draw a duck somewhere else
  while it is in its tunnel, for exactly the tunnel's time, which is how the far hole
  gets its duck on the beat. The poop's bin is at the foot of the bot's pole, as
  proposed, so it needed no layout work. My choices: the first poop comes after about
  20 seconds and then every 40 to 70; every third goes down a tunnel; the tongs come
  about every 30 to 55 seconds; flowers stop at five. Seen in stills: the poop with its
  flies, and the tongs with a duck. Not seen: the hop over it, the bot's shovel and peg,
  the bin being filled, the poop in a tube.
- **A gauge while it gets ready (2026.11.9-b25, `gauge.ts`).** The owner, 2026-11-18:
  "an in-style progress bar ... in the middle of the page, shown immediately that the
  page first renders, progress in a super nice progress gauge with stages called out
  underneath". The stages are real ones, and none is padded out: on a fast machine the
  first three go by too quickly to read. Building the machine holds the page up, so it
  is put off by 30 ms for the gauge to be painted first, and the full gauge is held
  for 400 ms over the running machine. The bitmaps report page by page, so a room of
  one page goes from nought to done in one step. Seen in one still, at the last
  stage; not seen on a slow device, which is where it matters.
- **Carriers out of step (2026.11.9-b24).** The owner, 2026-11-18: "Toast and trampoline
  ducks are still synchronised ... I thought we had added some de-sync work?" What
  there was is the bend (a tile runs up to a fifth of a period early or late in its
  middle), which is too little to see between two of a kind. A tile cannot run on a
  clock of its own, since ducks cross every edge on the one beat and the shaft joins
  every tile. So each carrier is now made for its place with a timing of its own
  (`carriers.ts`): when the toaster pops, when the trampoline is hit, and so on. The
  beat at the edges is untouched. Not looked at running.
- **Measured** on the harness: 19 devices are 57 tiles in three bands with eight tunnels,
  at 60 frames a second in headless WebKit, and the same with the tubes (13 devices, 38
  tiles). Not measured on the iPad, where the tubes are the new cost: two wide strokes
  of every layer each frame.
- **Judged from stills only:** the hop off the board and the spare boarding at a shaft
  arrow, and the bucket. The tests prove where the ducks are at the edges, not that it
  looks right in between.
- **Known:** a tube can pass behind a caption; the long way round can cross itself and
  the other tunnels as much as it likes, and only running alongside is kept down.
- **Built since, in the order agreed:** machinery on the y-axis, the freer routing and
  the shows, all in 2026.11.9-b22 (below).
