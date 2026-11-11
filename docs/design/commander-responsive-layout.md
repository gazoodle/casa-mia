# Camera Commander: a layout worked out for the space

**Status:** agreed spec (owner, 2026-11-11). Nothing is built. It comes from a discussion
that day over a throwaway prototype page that solved the layout in the browser with real
camera stills. "Decided" at the end records the points that were open in the draft. One
thing is still a proposal: the quicker change of main camera, which is to be measured
first.

## The problem

A commander stores a fixed arrangement: which cameras sit on which edge, and how big each
panel is. That arrangement suits one shape of space. The preview on the Camera Commander
page and the card on a dashboard are different shapes, and on a dashboard where other
cards come and go the space keeps changing. So a commander that looks right in one place
looks wrong in another, with a few cameras it is easy to set by hand, and with many it is
not.

What looks wrong, in the owner's words: a lot of unused space, tiles of different sizes,
a tile far from its camera's own shape, cameras squeezed narrow on the side edges, and a
main camera crushed small.

Arrange… (removed in 2026.11.5-b4) searched for a good arrangement once, on the admin
page, and saved the result. It could not react to the space either.

## What it does

A commander gets a second layout mode. In it the commander stores the cameras in order
and a few limits, and the layout is worked out again for every size the picture is drawn
at. The mode chosen today, with its panels set by hand, stays as it is and remains the
default for commanders that already exist.

The two modes are **Fixed** (today's panels) and **Responsive** (this), `fixed` and
`responsive` in the code (owner, 2026-11-11). Why these: they say what happens to the
layout as the space changes. Manual and Automatic say who did the work, and Automatic
undersells a mode with eight settings.

### The layout

- The picture is a grid of equal cells. Every tile is one cell, so all tiles are the same
  size and shape.
- The main camera is a block of whole cells.
- The tiles sit on the edges that are allowed (below). Where the block sits follows from
  that: tiles on the bottom edge alone put the main camera full width above them; right
  and bottom put it in the top left corner; left and right put it in the middle.
- Tiles are filled an edge at a time, in the order the edges are listed (below): the first
  cameras go on the first edge. The main camera keeps its own tile, highlighted, as it
  does today, so no tile moves when the main camera changes.
- A camera is never squeezed. Where its shape differs from its cell it is cropped about
  its centre.
- The gap and margin are the commander's existing ones.

For each size, every grid that satisfies the limits is scored and the best is used. The
score counts unused space first, then how much the tiles and the main camera lose to
cropping.

### The limits a commander holds

| Setting | Meaning | Default |
|---|---|---|
| Main camera at least | The smallest the main camera may be, as a share of the biggest it could be in the space, shown whole. | 40% |
| Main camera at most | Beyond this the room goes to bigger tiles. Same measure. | 60% |
| A tile may lose up to | How far a cell may be from the tile shape, which is how much of a camera is cropped. | 12% |
| Smallest tile | The narrowest a tile may be, in CSS pixels on the device. | 110 px |
| Tile shape | 16:9, 3:2, 4:3 or square. | 16:9 |
| Edges, in the order they fill | Any of left, right, top and bottom, in an order. | bottom, right, left, top |
| A main camera of another shape | Crop to fill, Show whole, or Re-lay out for its shape. | Crop to fill |
| When the limits can't all be met | Find something that fits, or Keep to my limits. | Find something that fits |

The main camera's two limits are shares of the biggest it could be, not of the whole
space, because in a tall space a whole 16:9 camera can only ever take about a third of
the area. Measured against the space, "at least 40%" could never hold on a phone held
upright.

### Edges

The edges the tiles may go on are a list in an order, as chips: ‹ and › move an edge
earlier or later, ✕ takes it out of use and **+ Add…** puts one back (owner, 2026-11-11;
Arrange… had the same list). It replaces a list of named styles, and does two things.

**Which edges are in the list** is what the solver may use. All four lets it choose
freely. Left and bottom allows a strip on the left, a strip below, or the two as a corner,
whichever scores best in the space. One edge pins the style.

**Their order** is the order they fill. With left before bottom, the first cameras in the
list go down the left edge and the next along the bottom; with bottom first, the other way
round. The order never changes which layout is chosen, only which camera goes where.

- Left and right edges fill from the top; top and bottom edges from the left. An edge two
  or more tiles deep fills across, then down.
- The cells where two edges meet belong to the edge that is earlier in the list.
- At a size where the solver uses only some of the edges, the cameras start on the first
  edge it does use. So a camera can sit on a different edge at a different size, but never
  moves while the size stays the same.

A switch, **Different when the space is taller than wide**, gives a second list used for
tall spaces. It goes by the shape of the space the card has, not by which way the device
is held, since a narrow column on a wide tablet is a tall space. With the switch off, one
list applies everywhere.

The order is not a list of layouts to try in turn. Someone who wants one layout in a tall
space lists only that edge there.

### The layout does not change when the main camera does

With Crop to fill or Show whole, the grid depends only on the space, the cameras and the
limits. Tapping a tile never moves another tile.

- **Crop to fill:** a main camera whose shape differs from its block is cropped about its
  centre.
- **Show whole:** it is shown whole, with dark bars, where it would otherwise lose more
  than 5%. Below that it is cropped, so a 16:9 camera in a
  block that is nearly 16:9 gets no hairline bars.
- **Re-lay out for its shape:** the grid is solved for the main camera's own shape, so it
  can change when a camera of another shape is chosen. Kept because it shows each main
  camera at its best; it is the one that can jump.

### When the cameras don't all fit

Cameras are dropped from the end of the list, so the list order is the priority. The last
tile then reads **+n more**.

Tapping **+n more** shows every camera as a plain grid of tiles with no main camera
(owner, 2026-11-11). Tapping one makes it the main camera and returns to the usual
layout. Why a grid and not pages of tiles or tiles that take turns: it needs no "which
page" state shared between devices of different sizes, and no tile moves by itself.

Motion on a camera that is not shown puts the motion dot on the **+n more** tile. With
Track motion on, that camera becomes the main one as it does today.

### When the limits can't all be met

**Find something that fits** relaxes the limits in this order until a layout fits, and
always ends with one:

1. Cameras move into **+n more**.
2. Edges that are not in the list are allowed, after those that are.
3. The main camera may go below its least.
4. Tiles may go below the smallest tile.
5. The main camera alone.

**Keep to my limits** shows the main camera alone, with a line on the card saying the
limits don't fit this space and giving its size. It is never a blank box: a card that
shows nothing and says nothing is a silent failure.

Either way the editor says, for each size it previews, which limit gave way.

## The editor

The Camera Commander page gets the prototype's page as its editor. The mode is chosen per
commander, and **both modes share one stage**:

- **The stage can be dragged to any size** by its corner, as the prototype's could, and
  has buttons for common sizes: a wide tablet, a 16:10 tablet, a squarer space, a short
  wide banner, a tall column, a phone upright and a phone on its side. The commander is
  laid out again as the stage is dragged.
- The commander's real cameras are in the stage, from the thumbnails the page already has,
  laid out in the browser by the cards' layout engine, so nothing waits for the app.
- Clicking a tile makes it the main camera in the preview.

In Responsive, the settings above are changed with sliders, buttons and chips, and the
stage is redrawn as they move. Under the stage, in words: the grid, the main camera's
share, the tile size, what a camera loses, the unused space, how many cameras don't fit,
and any limit that gave way.

**The cameras** are one ordered list in Responsive, where Fixed has a list for each edge.
It uses the same chips as a Fixed panel's cameras: **+ Add…** with a thumbnail against each
choice, ✕ to remove, and ‹ and › to move a camera earlier or later. The order is the order
the tiles fill in, and the cameras at the end are the first to go into **+n more**, so the
editor marks which ones don't fit at the stage's size. The first time a commander is
switched to Responsive, the list starts as its panels' cameras in the order left, top,
right, bottom. After that the two modes keep their own lists, which is what lets a
commander go back to Fixed with its panels as they were.

**Reset to defaults** puts every Responsive setting back to its default: the limits, the
tile shape, the edges and their order (both lists) and the two choices. It leaves the cameras, their order
and the commander's other settings alone, asks first, and is then a change like any other
in the editor. Each setting also names its default in its help, so one can be put back
without resetting the rest. The defaults are the ones in `layout.json`, so the page and
the engines can't disagree about them.

**Fixed has the stage too** (owner, 2026-11-11), with today's panel settings beside it.
Dragging it shows what a hand-set arrangement does in other spaces: where it leaves room
unused, squeezes a tile or shrinks the main camera. Why: the page showed a commander at
one size only, so nothing showed that an arrangement set by hand suits one shape of space
and not the others. Seeing that is also how someone decides to change mode. The cards'
engine already lays Fixed out for any size, so this needs no new layout code.

## Where it lives

- **On the commander, not the card.** The compositor draws one picture per commander and
  size, and every card showing it lays its tap zones over that picture. A setting per card
  would mean a separate drawing for each variant.
- **In both layout engines.** `compositor.commander_layout` (Python) draws the picture and
  `integration/cards/src/layout.ts` places the card's zones and will lay out the editor's
  stage. Both must give the same grid for every size, to the pixel, and both must pass
  shared cases in `tests/layout_cases.json`, generated from Python as today.
- **Whole-number arithmetic.** The prototype scored with floating point. The real solver
  compares candidates with integers and fixed tie-breaks, so the two engines cannot
  disagree at a boundary.
- **Options once**, in `app/src/casa_mia/layout.json`, as the existing ones are.
- The view of all cameras is one more value the card passes with the picture's
  address, alongside its size.

## Changing the main camera quickly

In the prototype a tap showed the new main camera at once. On the real card a tap goes to
Home Assistant, then to the app, then waits for the compositor to redraw and for a new
live video session. Where the time goes has not been measured.

Proposed: measure it first. Then, since the card knows where every tile is, it can show
the tapped tile's own pixels enlarged in the main area at once and let the real picture
and the live video replace them when they arrive. This is separate work from the layout
mode and can follow it.

## Order of work

1. The stage, for Fixed: drag sizing and the size buttons on today's editor. It needs no
   solver and is useful by itself. **Built in 2026.11.5-b5.**
2. The solver in Python with its cases, then the same in TypeScript against those cases.
   **Built in 2026.11.5-b6**, with nothing using it yet (see "Found while building the
   solver").
3. The compositor drawing in Responsive, and the card's zones over it.
4. Responsive's settings in the editor, on the same stage.
5. **+n more** and the view of all cameras.
6. The guide (`docs/applets/camera-commander.md`) and its screenshots.
7. Measuring the main camera change, and the quicker change if it is wanted.

Each is a build of its own that leaves existing commanders unchanged.

## Found while building the solver (agreed by the owner, 2026-11-11)

The solver (step 2) is built as below. Each point differs from, or adds to, what is
written above it, and where they differ this section is the one that holds.

1. **An edge in the list is always used when there are tiles for it.** Above, the solver
   was to choose among the listed edges "whichever scores best". But the score is the
   same wherever the block sits, so there was nothing to choose by. Built: with left and
   right both listed, tiles go on both sides (the odd column to the earlier edge); with
   one listed, on that side. Whether there are tiles beside the block or below it at all
   is still the solver's choice. This makes the list say exactly what is wanted, and
   "around the main camera" is all four edges.
2. **So the default list is bottom, right**, not all four: that gives the layouts the
   prototype chose (below, on the right, or the two as a corner). All four by default
   would put tiles all round the main camera in every space.
3. **The main camera's block is held to the same tolerance as a tile**: within "may lose
   up to" of 16:9 (or of the camera's own shape with Re-lay out). Without it, one edge in
   a tall space gave a tall thin block and Crop to fill cut the camera to a sliver. The
   setting is now labelled **A camera may lose up to**. A block within 5% always passes,
   so a tolerance of nothing still finds a layout.
4. **The block is at least two cells each way.** Without it, a tight space gave a main
   camera the same size as a tile.
5. **The score**, in shares of the space: what shows no camera, plus half of what the
   tiles and the main camera lose to cropping, plus nine tenths of the main camera's room
   beyond its most. Room beyond its most therefore goes to bigger tiles when there are
   tiles to take it, and to the main camera only when the alternative is leaving it
   empty. The fewest cameras in **+n more** comes before the score.
6. **Other edges are added one at a time** when the listed ones can't hold a layout, in
   the order bottom, right, left, top, and the first that works is used.
7. **Known weak spot: two to four cameras** in a tall or very wide space leave room
   empty (two cameras in a phone held upright leave half of it). Equal cells can't fill
   it. Fixed does well there, and the editor will show it.

Measured: the two engines agree on the 154 shared cases and on 4,000 random spaces and
limits. A layout takes under 3 ms in Python at the defaults and 53 ms at worst, once for
each size.

## Decided (owner, 2026-11-11)

Each was an open point in the draft.

- **Motion on a camera that is not shown** puts the motion dot on the **+n more** tile.
  Why: a camera dropped for want of room must not hide something happening.
- **No "always show every camera, however small" setting** for now. It would be the
  fallback order with steps 3 and 4 before step 1, and can be added later without changing
  anything else.
- **At most 32 cameras** in a Responsive commander, as the prototype had.
- **Show whole crops below 5%** and shows bars above it.
- **A commander can be switched to Responsive and back**, and its hand-set panels are kept.
- **Only the edges, and their order, differ for tall spaces.** The sliders don't: a second set of everything
  is more than the page should ask of anyone.
- **Reset to defaults**, in the editor (see there). Why: the owner often changes settings
  to see what they do, and then has no way back to what the defaults were.
