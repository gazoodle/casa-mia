# Dash-Bored: the agent's column, written by a model

Status: design, for the owner's approval (2026-11-16). Nothing is built yet.

## What it replaces, and why

Since 2026.11.8-b40 the Gazette prints a ZenOS-AI house's Katas as they are: the
SuperSummary as the lead, then one line per component (`katas.ts`, the "From our own
correspondent" column in `gazette.ts`). Kata text reads as a machine's log ("Vacuum entity
is unavailable and no rooms are configured; runs cannot be scheduled"). ZenOS's author
won't add a field written for a reader. His suggestion was to have a model write the column
for the paper.

The owner agreed on 2026-11-15 and promised it in the forum thread. One rule was set then:
Dash-Bored stays read-only towards ZenOS. ZenOS may write a drawer for us if it wants, but
we never write to it.

## What it does

When ZenOS writes a new SuperSummary, Dash-Bored's integration asks a model once to write
the column. It keeps the result and pushes it to every open page. The column is written
once per new summary, not once per page or per paper opened, and that one call returns it
in all three papers' voices.

```
Kata cabinet sensor changes ─► zen_summary newer than the last column's?
        │ yes
        ▼
  gather: zen_summary + the house's Katas + the persona name
        ▼
  ai_task.generate_data (the entity ZenOS uses), one call, three voices
        ▼
  keep it (memory + Store) ─► push to every subscribed page
```

## The parts

### Finding ZenOS (read-only)

- **The Kata cabinet:** the entity carrying the label `zen_kata_cabinet`. **The Dojo
  cabinet:** the one carrying `zen_dojo_cabinet`. Both are found the same way
  `house.ts` finds them now.
- **The by-line:** `input_text.zenos_persona_name`.
- **The model:** `input_text.zenos_ai_task_entity`, so the column runs on the same model
  as ZenOS's summarisers. On the test VM that is a local Ollama model.
- **A house without ZenOS** has no such sensor. It gets no column and no call, as now.

**The weave question is settled: we don't use it.** The open question in BACKLOG was
whether one read-only tapestry call (`zen_dojotools_filecabinet mode=weave`) could gather
the Katas. It isn't needed, because the cabinets are sensors and their drawers are in the
`variables` attribute. The integration reads them from `hass.states` directly. That is
read-only by construction, needs no cert, and doesn't run a ZenOS script on every
summary.

### When it writes (push, never poll)

The integration listens for state changes on the Kata cabinet
(`async_track_state_change_event`). The Kata cabinet is found again whenever the label or
entity registry changes, so a house that installs ZenOS later gets its column without a
restart.

A change starts a write only when `zen_summary`'s timestamp is newer than the one the last
column was written from. Component Katas change between summaries, but those changes start
nothing, because each SuperSummary already takes them in. On the test VM, SuperSummaries
come about four times an hour, so that's about 100 calls a day, the same rate ZenOS itself
uses this model.

Only one write runs at a time. A newer summary arriving during a write cancels it and
starts again, since there's no point finishing copy that is already out of date.

### What the model is given

- **The SuperSummary:** summary, attention, objective, urgency, confidence and errors.
- **The Katas:** the component Katas selected by today's rules in `katas.ts`. That means
  only drawers in the Kata shape, and not ZenOS's own (`zen_*`, or `pipeline_tier:
  system`), each named from the Dojo drawer's `friendly_name`. They're sorted by urgency,
  then time, and capped (the 8 most urgent) so the prompt stays a bounded size.
- **The household's name and the persona name.**
- **A brief per paper.** These are three short paragraphs: the Broadsheet's measured
  prose, the Red-top's puns and outrage, and the Rolling news' terse present tense. They
  live in Python with the prompt, because the voice data in `voices.ts` is headline
  templates, not a style for prose.

**DRY.** Choosing which drawers are Katas moves from `katas.ts` to Python, because the
integration needs it to build the prompt. The page no longer needs it, since it shows the
written column. `katas.ts` keeps only what it still renders.

### What the model returns

The call passes a `structure`, so `ai_task.generate_data` returns fields rather than free
text. For each of `broadsheet`, `tabloid` and `rolling` it returns:

- `head`: a headline;
- `body`: one to three short paragraphs, about 120 words in all;
- `items`: up to three one-line items, for the most urgent parts.

The model is told:
- to write only from what it is given, and to name a fact's part of the house;
- not to give instructions for locks or alarms;
- to say plainly when ZenOS's own summary reports errors.

A reply with a voice missing, or empty text, is a failed write (below). It is never
printed in part.

### Keeping it

- The integration keeps the latest column in memory, and in a `Store` under
  `.storage/casa_mia_dash_bored.column`.
- Each column records the `zen_summary` timestamp it was written from, when it was
  written, the model entity, and the time the write took.
- After a restart the stored column is served at once. A new one is written only when a
  newer summary arrives, never just because Home Assistant restarted.

### Serving it

A websocket subscription, `casa_mia_dash_bored/column`, uses `feed.follow` like the
sightings feed: it sends the held column when a page subscribes, then each new one. Home
Assistant lets only an admin listen to an integration's events, and a wall tablet's login
isn't one, hence a feed rather than an event.

The page draws the column in its own paper's voice, under the by-line and the "filed at"
time it has now.

## Nothing fails silently

- **The column is a lease on the summary.** "Filed at" is the time of the `zen_summary`
  it was written from. When that summary is older than an hour (`FRESH`, as now), the
  by-line says "Nothing filed since …". The same applies to a stored column after a
  restart.
- **A failed write keeps the last good column** and adds a line to it, such as "Our
  correspondent's copy is late: the model didn't answer (since 14:05)". The page never
  falls back to printing the raw Katas. The failures are:
  - an error from `ai_task`;
  - a timeout of 120 s;
  - a reply in the wrong shape;
  - no `zenos_ai_task_entity` set.
- **With no column yet** (a house that has just installed ZenOS, or a first write still
  under way), the desk says the copy is awaited, with the time the write started.
- **The log** records each write at INFO (the summary's time, the model, the number of
  Katas, the time taken, the number of characters), and each failure at WARNING with its
  reason. It never logs the column's text, which is about the house.

## Tests

- **Python, with a fake `ai_task`:**
  - the Kata selection (the rules moved from `katas.ts`, with their cases moved from
    `katas.test.ts`);
  - one write per new summary, and none for a component Kata alone;
  - a write in progress cancelled by a newer summary;
  - a failed write keeping the last column, with its reason;
  - the stored column served after a restart;
  - no ZenOS meaning no call.
- **`tests_ha`:** the subscription delivers the held column and then a new one.
- **TS:** the desk rendering, as fixtures of the column's shape (filed, lapsed, late,
  awaited).

## Not in this design (YAGNI)

- The Fridge and the Console tickers. Only the Gazette has a desk. They can read the same
  feed later.
- An urgent Kata as a story or breaking news (still in BACKLOG).
- Choosing which parts a wall tablet may print (still in BACKLOG).
- A ZenOS-written reporter drawer. If ZenOS ships one, read it and drop our call.

## Decisions for the owner

1. **A switch to turn it off.** It calls a model about 100 times a day. That's free on a
   local model, but not on a paid one. My recommendation: on by default when ZenOS is
   present, with a "Write the agent's column" switch in Dash-Bored's Configure dialog. With
   the switch off, the page shows no column at all, rather than the raw Katas.
2. **The shape.** I recommend a headline, a short article and up to three items, rather
   than one article only. The items keep a single urgent part of the house from being
   lost in the prose.
