# Topology: the brief

Topology is a proposed applet that records how a home's rooms fit together: which
buildings and sites they belong to, and which room leads to which. It was the owner's
idea on 2026-11-18 and was worked out with him in conversation that day. The name is
his and he confirmed it as final that day. Its contract was agreed that day, and its
model and contract tests are written; "Order of building" says what is next.

Each point below is marked **agreed** (the owner said it) or **proposed** (an agent's
suggestion that he has not ruled on).

## What it adds to Home Assistant

Home Assistant has floors and areas, and labels for both. It has nothing above a floor,
and nothing that says two areas are joined. Topology adds those two things and nothing
else:

- **Buildings and sites** (agreed). A site holds buildings, a building holds floors. An
  area on no floor can be put in a building directly, which is how a one-room outbuilding
  is described.
- **Connections** (agreed). A connection says two areas are joined: the Hall to the
  Parlour, the Hall to the Scullery. It can carry a direction (agreed, optional).
- **Layout data** (agreed: later, in the backlog). Walls, sizes and positions. Nothing
  planned for the first version needs it.

## How it is stored

- **Only what Home Assistant lacks is stored** (proposed). Everything is keyed by
  `area_id` and `floor_id`. Names, icons and the floor an area is on are read from Home
  Assistant's registries and never copied.
- **A connection is stored once, for the pair** (agreed 2026-11-18: "in the data,
  otherwise it's not DRY"). The owner's example gave each room its own list of exits
  (Parlour: Hall; Hall: Parlour, Scullery, Workshop). That is how it is shown and
  edited, not how it is kept: stored that way, the two sides can disagree. Stored as one
  record for the pair, each room's exits are worked out from it.
- **A direction for each end of a connection** (agreed 2026-11-18, after the owner asked
  how a curved corridor is handled). The directions are the sixteen points of the
  compass, up and down (owner, 2026-11-18: north-east and the like are needed, and
  south-south-east should be accepted too). Saving accepts the usual ways of writing one
  ("NE", "n/e", "north-east", "northeast", "SSE", "south-south-east") and keeps it in one
  form (proposed: the lower-case abbreviation, "ne", "sse"); anything else is refused
  with what was given. The opposite is the point half way round (sse and nnw). A passage
  that bends leaves one room northwards and can come into the next from its west side,
  so the way back is west and not south: the two ends are
  separate facts. The record holds both, and the second defaults to the opposite of the
  first, so a straight doorway needs only one. A corridor that is an area of its own
  needs none of this: it is a room whose exits are not opposite each other.
- **Labelling uses Home Assistant's labels** (proposed). The owner wants "clever
  labelling" alongside the connections. Labels on areas, such as one for a room people
  only pass through or one for out of doors, can be used by everything else in Home
  Assistant too. Which labels, and what they mean to a consumer, is for the owner to say.
- **A removed area shows** (proposed, from "Nothing fails silently"). A connection or a
  building that names an area or floor no longer in the registry is shown as broken in
  the editor, with what it pointed at, and is left out of what consumers are given.

## Where it lives

- **In the integration, with no part in the app** (proposed). It works on Home
  Assistant's registries and its data is small, so it belongs in Home Assistant's own
  storage (architecture: each piece of work goes where it fits best).
- **Inside Casa Mia, not a component of its own** (agreed 2026-11-18). By itself Topology
  has little to show: it is an editor and a store. The owner's reasoning: "you can
  install it, create your topology, and the Dash-Boreds get better and you get the
  game". Dash-Bored installed without Casa Mia finds no topology and stays as it is
  today, without the games. A component of its own was proposed and dropped.

## The contract

Agreed with the owner on 2026-11-18. It is reached over Home Assistant's websocket,
because one of the consumers runs outside Home Assistant, and Dash-Bored is a component
of its own that imports nothing from `casa_mia`. A Python import would serve neither.

**What is stored** (Home Assistant's own storage, `casa_mia.topology`, one per house):

```json
{ "sites":       [{"id": "s1", "name": "Home"}],
  "buildings":   [{"id": "b1", "name": "House", "site": "s1", "floors": ["ground"], "areas": []},
                  {"id": "b2", "name": "Workshop", "site": "s1", "floors": [], "areas": ["workshop"]}],
  "connections": [{"a": "hall", "b": "parlour", "way": "n", "back": null}] }
```

`way` is the direction from `a` to `b`, and `back` from `b` to `a`; `back` left empty
means the opposite of `way`, and either may be left out. A floor is in one building at
most, and an area is put in a building only when it is on no floor.

**The feed, `casa_mia/topology/subscribe`** (any signed-in user): everything now, and
again at each change, so a consumer redraws and never polls (RULE FOUR).

```json
{ "rev": 7, "sites": [...], "buildings": [...],
  "exits":  {"hall": [{"to": "parlour", "way": "n"}], "parlour": [{"to": "hall", "way": "s"}]},
  "broken": [{"kind": "connection", "a": "kitchen", "b": "old_scullery", "ref": "old_scullery", "why": "gone"},
             {"kind": "building", "id": "studio", "ref": "studio", "why": "on a floor"}] }
```

`broken` has one entry for each thing named that no longer counts: `why` is "gone" when
it has left Home Assistant's registry, or "on a floor" for an area put in a building
when it was on none, which has since been given a floor. The whole contract, in one
invented house, is `tests/topology_cases.json`.

- **`exits` is worked out once, in the integration**, at each change, and not by each
  consumer: an area's neighbours, each with its direction if one was given.
- **The feed is sent again when Home Assistant's area or floor registry changes**, so a
  removed area appears in `broken` at once. What is broken is left out of `exits` and
  the buildings.
- **No names are sent**: a consumer has Home Assistant's registries already.

**Saving, `casa_mia/topology/save`** (administrators only): the whole record, with the
`rev` it was based on. A save based on an older `rev` is refused, so that two editors
open at once can't overwrite each other unseen. Every check is made there, once: a
direction that can't be read, an area joined to itself, a floor in two buildings.

**Routes** between two areas, the shortest chain of connections, are not in the first
version. When House Manual or a game first needs one, it is worked out in the
integration like `exits`.

**An empty topology is normal, and so is none at all.** A house with nothing entered
gives an empty tree and no neighbours, and a Home Assistant without Casa Mia does not
answer. In both cases a consumer behaves as it does today.

## Who will use it

Agreed with the owner on 2026-11-18. He also ruled that day that Dash-Bored's "joke"
label directs its humour and does not make it a lesser consumer: its families are
"frivolous, but nevertheless useful".

| Consumer | What it reads | Standing |
|---|---|---|
| Digs (Dash-Bored) | Buildings, to draw outbuildings; neighbours, to place rooms | Built; the first consumer |
| The other Dash-Bored families | The tree and neighbours, to guide their layouts | Built; to follow Digs |
| Auto Dashboards | The tree, for navigation between dashboards | In development |
| House Manual | Routes ("the stopcock is in the Scullery, through the Hall") | A new idea, not designed |
| Gang-O-Gals (the owner's project, outside this repo) | Whatever the contract offers, from outside Home Assistant | Being restarted |
| The adventure games | See below | Ideas, after Topology |

Digs' backlog item "Buildings as a setting" is replaced by this: its buildings come from
Topology and not from a setting of its own.

## The games

The owner's idea, 2026-11-18: adventure games inside Dash-Bored, played in the user's
own house. Each is in the style of its kind, with our own text and drawings, and none
copies an existing game's rooms, wording or art.

- **A text adventure, first.** Rooms and exits come from Topology and the things in a
  room are the area's devices. "You are in the Hall. Exits: north to the Parlour. There
  is a lamp here. It is on." A command such as `turn off lamp` calls the device's action.
  A guarded device (a lock, a garage door) keeps its extra confirmation. It needs
  neighbours and reads much better with directions.
- **A point-and-click adventure, second.** One screen for each room, and walking off an
  edge goes to the room in that direction. It needs directions, and a picture of each
  room, for which Digs' drawing code is the likely source.
- **A first-person walk through the house, third.** This is the one that needs layout
  data. Proposed: a small raycaster drawn on a canvas, and not a port of an existing
  engine with maps generated for it, which is a much larger job.

## Order of building

Following the repo's rule for a module with a contract. The contract was agreed on
2026-11-18; the rest is proposed.

1. **Done 2026-11-18; ELK chosen ("The editor").** **Try Mermaid first**, with a throwaway page (`NEVER TEST THIS`): boxes nested three
   deep, lines between rooms in different boxes, an invented house of thirty rooms, and
   the size of the code loaded for it. If it is not legible, the list ships alone.
2. **Done 2026-11-18.** **The contract's tests and a mock**, from one invented house in
   `tests/topology_cases.json`, read by both sides as `layout_cases.json` is. In Python,
   `casa_mia/topology/model.py` has no Home Assistant imports: the checks, the
   directions, `exits` and `broken` (`tests/test_topology.py`).
3. **Digs from the mock.** Its outbuildings come from the buildings, with today's
   guess by name kept for a house with no topology; an outbuilding with a loft can then
   be two storeys. Rooms on a storey are placed beside their neighbours. It follows the
   feed as it does Casa Mia's cameras: only when `casa_mia` is installed, and an older
   Casa Mia that lacks it is no fault.
4. **Done 2026-11-18 (2026.11.9-b24).** **The real storage and feed**, which pass the same cases, and
   `tests_ha/test_topology.py`. Registered in a new `async_setup` of `casa_mia`, not
   its entry, so that it still answers while the app is down: the entry's set-up fails
   then, and Topology needs nothing of the app's.
5. **Done 2026-11-18 (2026.11.9-b24).** **The editor**, a page of the admin UI that reaches Home Assistant through
   `homeConnection`, as Love it or Loathe it's does: the list, the buildings and sites,
   what is broken, and the Mermaid picture, loaded only when the page is opened.
6. **The guide** (`docs/applets/topology.md`), maturity, HANDOVER, BACKLOG, README.
7. Routes, when House Manual or a game first needs one.

## The editor

The editor is most of the work. Entering the connections for a house of thirty rooms is
tedious, and whether anyone fills it in depends on how quick that is.

- **A plain list for the first version** (agreed 2026-11-18). Each room has an "add exit"
  that asks which room and, optionally, which direction. The exit appears on both rooms
  at once. Other ways of entering connections can come later over the same data.
- **A picture beside it, drawn by Mermaid** (agreed 2026-11-18, the owner's idea). Sites,
  buildings and floors are nested boxes, rooms are nodes, connections are lines labelled
  with their directions. The Mermaid text is generated from the records and never
  stored or read back, so it is not a second source of truth. It shows a mistake at
  once: a room with no exits stands apart. The same text can be copied out for House
  Manual or a document.
- **What the picture does not do.** Mermaid chooses where everything goes, so an exit
  marked north is not drawn upwards. It shows what joins what, not where things are.
- **Its cost.** Neither the admin UI nor the cards has Mermaid or any graph library
  today (checked 2026-11-18). It is a large dependency, to be loaded only when the
  Topology page is opened.
- **Checked on 2026-11-18** (Mermaid 12.3.0, an invented house of thirty rooms and
  thirty connections, three boxes deep, in headless Chromium). Both of Mermaid's layouts
  draw it in well under half a second. Dagre, its default, adds 212 KB (compressed) to
  the page and draws a wide, short picture: a building's name is drawn over its first
  floor's, and each line's directions sit by one end, so it is hard to tell which line
  they belong to. ELK adds 569 KB more and draws a tall picture: the boxes nest cleanly,
  the directions sit in the middle of their lines, and a few long lines between
  buildings run outside the boxes but can be followed. **ELK** (owner, 2026-11-18). Why:
  the picture is there to show a mistake at a glance, and dagre's misplaced labels
  hide one; the cost is paid only when the Topology page is opened. Mermaid 12 has the
  ELK layout built in, which the trial didn't know: the separate `@mermaid-js/layout-elk`
  only added a second copy, and the editor does without it (checked 2026-11-18).

## Open questions

For the owner:

- Which labels the "clever labelling" means, and what each should do.
- Whether a site is wanted in the first version, or only buildings.
- Whether out of doors is described by ordinary areas (a Garden that the Hall leads to),
  which needs nothing new, or needs something of its own.
- Whether a connection should say what it is (a door, an open arch, stairs). Up and down
  already describe stairs. Nothing planned needs more.
- Other ways of joining rooms, after the plain list ("The editor" above). The owner wants
  this to be good, and playful (2026-11-18). Offered and not yet chosen: walking the house as the text adventure in
  map-making mode; connections suggested from motion sensors' history, offered and never
  applied unasked. **Not a board of room tiles dragged together** (owner, 2026-11-18):
  it was his own thought too, but it leads towards building a CAD package for houses,
  and he wants to think about it more before anything like it is tried.
- Whether a connection can carry a door's sensor or lock, since a door belongs to the
  join and not to either room.
