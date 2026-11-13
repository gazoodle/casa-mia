# Love it or Loathe it

Acts when a song you love or loathe comes on a media player.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

## What it's for

A radio station plays a mix you mostly like, with some songs you would rather skip and a
few you want louder. Love it or Loathe it watches the title and artist your media players
report, and acts when a track matches one of your groups of songs:

- change the volume by a percentage until the next track,
- mute until the next track,
- switch to another station for some minutes, then go back,
- or only fire an event, for an automation to act on.

It ships with a list of Christmas songs, for the weeks when a station starts playing
them earlier than you would like.

It is an integration of its own, **Love it or Loathe it**. It runs wholly in Home
Assistant and needs neither the Casa Mia app nor the Casa Mia integration.

## What it needs from a player

A player must report the title of what it is playing (`media_title`, and `media_artist`
when it has one). Most do, for radio streams as well as for your own music. Check a
player under Developer tools → States while a song is on.

To change the volume, mute or switch station, the player must support Home Assistant's
`volume_set`, `volume_mute` and `play_media` actions.

## Setting it up

1. Settings → Devices & services → **Add integration** → **Love it or Loathe it**. Give
   it a name and choose the media players to watch. One entry watches as many players
   as you give it: after you choose the first, the box offers another.
2. On the integration's page, **Add a station** for each station you are happy to be
   switched to. Give it a name, choose a player to browse on, and choose the station.
   The station is kept without the player, so it can be played on any of them.
3. **Add a group of songs** for each set of songs and what to do about them.

The groups and stations you add belong to that entry and apply to all its players. To
give other players different groups or stations, add the integration again with those
players. A player can be in only one entry.

The **Delay** set with the players is the number of seconds to wait after a player
reports a new track before acting. Leave it at 0 unless a player changes its title
before the song itself changes.

## Groups of songs

A group has a name, whether you love or loathe its songs, the songs, and what happens
when one comes on.

**Songs** takes one pattern per line:

| Pattern | Matches |
|---|---|
| `Agadoo` | That title, by anyone. |
| `Agadoo \| Black Lace` | That title by that artist. |
| `*love*` | Any title with "love" in it. |
| `* \| Black Lace` | Everything by that artist. |

Capitals, accents and punctuation don't matter. Text in brackets after a title, such as
"(Remastered 2011)", is ignored unless your pattern has it too. A radio stream that sends
"Artist - Title" as the title is understood.

When you add a group you are first asked what to start with: an empty list, or a
shipped list. A shipped list is put into the **Songs** box on the next screen, and from
then on the songs are yours: add lines, or delete the ones you don't want. There is one
shipped list so far, **Christmas songs**: titles with "Christmas", "Xmas", "Santa
Claus", "sleigh" and the like, the carols, and the seasonal songs with no such word in
the title ("Stay Another Day" by East 17, "Fairytale of New York").

A line with no `*` beats a line with one, whichever group it is in. So to loathe
`*christmas*` but keep "Last Christmas", make a second group that loves `Last Christmas`
by name, with **Only fire the event** as its action. A song that a list names outright,
such as "Fairytale of New York", is kept by deleting its line.

A song that is already playing counts too: add it to a group's list and save, or turn
the group's switch on, and it is acted on at once.

### What happens when one comes on

- **Change the volume until the next track.** **Volume change** is a percentage of the
  volume at the time: 10 turns 40% up to 44%, and -50 halves it. At the next track the
  volume is put back, unless someone has moved it since.
- **Mute until the next track.**
- **Switch station for some minutes.** The player is switched to the first station in
  your list that isn't the one playing. If that station is playing a loathed song as
  well, it moves on to the next. When every station has been tried, the song is muted
  instead. After **Minutes on the other station**, counted from the first switch, the
  player goes back to what it was playing.
- **Only fire the event.**

A switch can't end at the next track, as a mute does, because once the player has left
a station nothing reports what that station is playing.

The player is not switched back if someone chose something else while it was away, or
if it is no longer playing. A restart of Home Assistant while a player is away doesn't
lose the return.

For speakers playing as one group, only the group's leader acts.

## Turning a group on and off

Each group has a switch, named after the entry and the group
(`switch.love_it_or_loathe_it_<group>` when the entry has the name it is offered). While it
is off, the group's songs are ignored. An automation can turn it on and off, for example
to loathe the Christmas songs until 1 December:

```yaml
automation:
  - alias: Christmas songs are welcome in December
    triggers:
      - trigger: time
        at: "00:00:00"
    actions:
      - action: "switch.turn_{{ 'off' if now().month == 12 else 'on' }}"
        target:
          entity_id: switch.love_it_or_loathe_it_christmas
```

## Seeing what it did

**Last match** (`sensor.love_it_or_loathe_it_last_match`; each entry has its own) holds the song last acted on.
Its attributes:

| Attribute | Holds |
|---|---|
| `entity_id`, `title`, `artist` | The player and the track. |
| `group`, `kind`, `action` | The group it matched, `love` or `loathe`, and the group's action. |
| `result` | What was done, or `failed:` and the reason. |
| `at` | When. |
| `away` | Each player now on another station, and when it goes back. |
| `no_titles` | Players that are playing but report no title, so nothing can be matched. |

Each match also fires the event `casa_mia_love_or_loathe`, with the same fields as far
as `at`, so an automation can do anything else:

```yaml
triggers:
  - trigger: event
    event_type: casa_mia_love_or_loathe
    event_data:
      kind: love
```

Every match, action and return is in Home Assistant's log.

## What it can't do

- Go back to what was playing when the player doesn't say what that was (no
  `media_content_id`) and it isn't one of your stations. The log and `result` say so,
  and the player stays on the other station.
- Tell a person's choice from a station whose `media_content_id` changes with every
  track. Such a player is not switched back.
- Fade between stations. The switch is immediate.
