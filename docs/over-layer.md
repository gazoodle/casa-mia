# Over layer

> **Maturity: Alpha.** Does its job every day in the author's house, but hasn't been tried in many others. Expect rough edges and changes. ([The levels](README.md#maturity))

One card shown over the whole dashboard while its conditions hold. What's beneath can
still be seen, but not touched: only the card on the layer works.

- **The alarm is set:** the wall tablets show the alarm's disarm panel over everything,
  and nothing else can be pressed until it's disarmed.
- **A visiting engineer:** sees how everything is doing, and can't change any of it.
- **A cover:** against little fingers, or a lock at night.
- **A notice:** a warning that wants dealing with now, floating over the page.

## Adding one

It's a card like any other: **Casa Mia Over layer** in the card picker, on any Sections
dashboard, a Tablet Layout included. Put it in any section.

1. **Its card:** pick the one card it holds with Home Assistant's own card picker (an alarm
   panel, a tile, a markdown note, a stack of several), and edit it as usual. **Change the
   card** starts again.
2. **How it shows:**
   - **Float:** the card where you place it (the middle, unless you choose), up to the
     width you set.
   - **Full screen:** the card fills what's covered.
   - **Scroll with the view:** the card at the top, moving with the page.
3. **What it covers:** **the view** (the sidebar and header stay usable), or **the whole
   window** (sidebar and header too).
4. **Block taps on what's beneath:** on, what's beneath can be seen and not touched; off,
   taps reach the dashboard round the card.
5. **Where it sits** (float, scroll): tap one of nine places in the 3 × 3 grid, from top left
   to bottom right, and set how far in it sits from the edges it's anchored to: across for
   left and right, down for top and bottom, both in a corner. Scroll with the view sits
   along the top only. Full screen fills what's covered.
6. **The backdrop:** a colour, how see-through it is, and a blur.
7. **When it shows:** the card's own **Visibility** tab, Home Assistant's conditions: the
   alarm armed, a user, the time of day, a sensor on. No conditions: always.

**Its whole panel.** Turn on **Show its whole panel** and, in place of a card of its own,
the layer shows the panel (section) the Over layer is in: every card in it, its headings,
garnish and each card's own Visibility included, anchored and sized like a card (raise
**Card width** for a wide panel). A warnings panel, say, can float over the dashboard in one
piece, its headings and all, rather than as one card. That panel never shows in its own
place out of edit mode; in edit mode it's there as usual, so you edit its cards where they
are (in a Tablet Layout it's hatched, as it never shows there otherwise), and the Over
layer itself is just its chip. The layer shows the panel as it is each time it goes up.

**A pop-over that goes when it's dealt with.** Float it in a corner (bottom right, say), turn
**Block taps** off and the backdrop's opacity to 0: a panel in the corner, the dashboard
round it still in use. Give it a Visibility condition its own card changes (a door left
open, a reminder, an alert to acknowledge), and acting on the card is what dismisses it:
close the door, tick the reminder, and its condition is gone, and so is it.

While the dashboard is being edited, the Over layer is an ordinary card in its place, with a
badge saying what it does (*Over layer · float · the view*), so you can always edit it and
it's never live while you do. Out of edit mode it takes no room in its section.

It also goes when its section is hidden by the section's own Visibility. In a Tablet Layout
it never holds a panel open, so a panel holding only an Over layer stays out of the way.

## The way out

The layer is meant to keep people out, so nothing in a page's address turns it off. The way
out is for admins only:

- **The door.** Over the whole window and blocking taps, the layer leaves an admin one way
  through, to Home Assistant's own edit button (its pencil, or its ⋮ menu when the pencil
  is in it). A small lid covers it, looking like the backdrop, with a soft ring pulsing
  round it. With a mouse, move over it and it opens; on a touch screen, tap it once to
  open it for a few seconds, then tap the button. In edit mode the layer steps aside.
  Everyone who isn't an admin gets the wall.
- **`?edit=1`.** Add it to the end of the dashboard's address and Home Assistant opens it in
  edit mode, for admins only. That's the way out when the header is hidden (kiosk-mode,
  say) and there's no button for a door.
- **Lift its condition** from somewhere else: your phone, an automation, a voice command.
  Every layer on that condition goes.

To leave admins out of a layer altogether, give it a **User** condition on its Visibility tab.

**How far it goes.** The layer keeps hands off a screen; it isn't a lock on Home Assistant.
Whoever is signed in is still signed in: another tab, the companion app or a keyboard can
reach whatever their Home Assistant user may. For a wall tablet that's the point; for a
guest, pair it with a user that can do little (see Guest login's
[How safe is it?](applets/guest-login.md#how-safe-is-it)).

## Troubleshooting

- **It doesn't show:** check its Visibility conditions, and that you're not in edit mode
  (there it's an ordinary card). The browser's console says `CASA-MIA CARDS: over layer
  shown (…)` when it goes up.
- **It shows when its section is hidden:** the console says `… a section round it is hidden
  by its own Visibility: down` when it sees the section go. No line: say so in an issue,
  with your Home Assistant version.
- **A Home Assistant update upset it:** like the Tablet Layout, it leans on Home Assistant's
  frontend (see [Home Assistant updates](tablet-layout.md#home-assistant-updates)).
