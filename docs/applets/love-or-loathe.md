# Love it or Loathe it?

An automatic media watcher that boosts the volume for a song you love, or changes the
radio station for one you loathe.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

Sick of Xmas songs in November, yet love them in December? Then this is for you. But
that's not all: you can mark songs as loved or loathed, live, as they are playing.

Bored of radio stations with a short playlist? Then ask this integration to watch for
songs repeated within a period of time, and use those as triggers to change station too.

Or maybe you don't want the adverts? Shunt them too.

Pair it with Casa Mia's local radio station system and you can fade across to songs you
truly love to hear.

A full integration with events, so you can trigger your own automations too, including
notifications of what happened!

**Not built yet:** shunting the adverts, and the fade. Casa Mia's local radio station
is a Casa Mia feature still to come, not part of this integration: when it exists, it
is one more station to switch to. The rest of this guide describes what works today.

## What it's for

A radio station plays a mix you mostly like, with some songs you would rather skip and a
few you want louder. Love it or Loathe it watches the title and artist your media players
report, and acts when a track matches one of your groups of songs:

- change the volume by a percentage until the next track,
- mute until the next track,
- switch to another station for some minutes, then go back,
- or only fire an event, for an automation to act on.

How you feel about a group of songs can change. Each group is loved, loathed or ignored
at the moment, with an action for loved and another for loathed, and an automation can
change the feeling. The shipped list of Christmas songs is the example: loathed in
November, when a station starts playing them too early, and loved in December.

Each person in the house can have their own loved and loathed groups, and add the song
that is playing to them with a button on a dashboard.

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
3. **Add a group of songs** for each set of songs.

The groups and stations you add belong to that entry and apply to all its players. To
give other players different groups or stations, add the integration again with those
players. A player can be in only one entry.

The **Delay** set with the players is the number of seconds to wait after a player
reports a new track before acting. Leave it at 0 unless a player changes its title
before the song itself changes.

## Its page in Casa Mia

Everything below can be done with Home Assistant's own screens. Where the Casa Mia app
is installed as well, its Home page has a **Love it or Loathe it** tile once the
integration has been added, and the tile opens a page with all of it on one screen:

- **Playing now:** each player, the song it is on, and the group that has the song.
  **Love it** and **Loathe it** rate the song, as yourself or as a person who has
  groups there (**Rate as**). **Make it a station** adds what the player is on as a
  station to switch to.
- **Groups of songs:** each group with its feeling to click, and its form when the row
  is clicked. The up and down buttons change the order, which decides which group has
  a song that is in two. Home Assistant's own screens can't change the order.
- **Stations to switch to**, in the order they are tried, with the same buttons.
- **Players** changes an entry's name, its players and its delay.

The page keeps nothing of its own. It changes what Home Assistant holds, so a group
made on the page is the same group on Home Assistant's screens, with the same select,
and a save is refused for the same reasons. Adding the integration, adding it again for
other players and deleting an entry are done in Home Assistant.

The page can't browse for a station. Tune a player to the station and use **Make it a
station**, or add the station from the integration's page in Home Assistant, which can
browse.

## Groups of songs

A group has a name, its songs, how you feel about them now (**Loved**, **Loathed** or
**Ignored**), and two actions: what to do when one comes on while the group is loved,
and what to do while it is loathed. Ignored, the group does nothing.

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

When a song is in more than one group:

1. A line with no `*` beats a line with one, whichever groups they are in.
2. If that doesn't settle it, a loved group beats a loathed one.
3. If that doesn't either, the group that comes first has it: the one made first,
   unless the order was changed on the page in Casa Mia.

So to loathe `*christmas*` but keep "Last Christmas", put `Last Christmas` in a loved
group. Ignored groups take no part.

### Songs played too often

For a station with a short playlist, a group can also have any song that has been
played a number of times in the last so many hours, whatever the song. On its form this
is **Songs played too often**: **Times played** and **In the last** (hours, up to 48).
Set to 3 times in 4 hours, a song is the group's the third time it comes round in four
hours, and the group's action is taken then. At 0 times this is off.

A group for this needs no songs of its own: call it "Heard too often", leave **Songs**
empty, set it to Loathed and its action to switch station.

- A song that any group names is treated as that group says, however often it is
  played. Only songs that no group names are counted against this.
- The count is kept for each entry, over all its players, and through a restart of
  Home Assistant. Two players on the same station hear a song once, not twice.
- What a player plays while it is away on another station counts as well.
- Only tracks that report a title are counted.

A song that is already playing counts too: add it to a group's list and save, or change
the group's feeling, and it is acted on at once.

### What happens when one comes on

- **Change the volume until the next track.** **Volume change** is a percentage of the
  volume at the time: 10 turns 40% up to 44%, and -50 halves it. At the next track the
  volume is put back, unless someone has moved it since.
- **Mute until the next track.**
- **Switch station for some minutes.** The player is switched to the first station in
  your list that isn't the one playing (the list is in the order the stations were
  added, unless changed on the page in Casa Mia). If that station is playing a loathed song as
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

## Changing how you feel about a group

Each group has a select, named after the entry and the group
(`select.love_it_or_loathe_it_<group>` when the entry has the name it is offered), with
the options `love`, `loathe` and `ignore`. It shows the same feeling as the group's
form, and choosing one acts at once on whatever is playing.

An automation can set it. For Christmas songs that are loathed until December, loved
during it and ignored afterwards:

```yaml
automation:
  - alias: How we feel about Christmas songs
    triggers:
      - trigger: time
        at: "00:00:00"
      - trigger: homeassistant
        event: start
    actions:
      - action: select.select_option
        target:
          entity_id: select.love_it_or_loathe_it_christmas
        data:
          option: >-
            {{ 'love' if now().month == 12
               else 'loathe' if now().month == 11
               else 'ignore' }}
```

## Each person's own songs

A group can belong to a person (**Belongs to** on its form): one set to Loved and one
set to Loathed. You can make them yourself, or leave it to the first rating: a person's
first loved song makes a group "Loved by" them, and their first loathed song a group
"Loathed by" them, with the usual actions (volume up 10% for loved, mute for loathed),
which you can then change.

The action `casa_mia_love_or_loathe.rate` adds the song a player is playing to the
person's loved or loathed group, as a line `Title | Artist`, and takes it out of their
other group if it was named there. The song is then acted on at once.

| Field | Holds |
|---|---|
| `entity_id` | The media player. It must be one the integration watches. |
| `feeling` | `love` or `loathe`. |
| `person` | Optional. Whose song it is. |

Without `person`, the action uses the person whose login pressed the button. So the
same two buttons work for everyone who signs in to Home Assistant as themselves:

```yaml
type: horizontal-stack
cards:
  - type: button
    icon: mdi:thumb-up
    name: Love it
    tap_action:
      action: perform-action
      perform_action: casa_mia_love_or_loathe.rate
      data:
        entity_id: media_player.kitchen
        feeling: love
  - type: button
    icon: mdi:thumb-down
    name: Loathe it
    tap_action:
      action: perform-action
      perform_action: casa_mia_love_or_loathe.rate
      data:
        entity_id: media_player.kitchen
        feeling: loathe
```

A shared screen, such as a wall tablet, is signed in as nobody in particular. There,
give each person their own pair of buttons with `person: person.ann` added to `data`.

The action refuses, and says why, when the login belongs to no person and none is
named, when the name given is not a person in Home Assistant, and when the player has
no title to rate. So a shared screen can't make groups of its own: a group is only ever
made for a person.

A person's groups count for every player in the entry, whoever is listening. To stop
them counting while the person is out, set their groups to `ignore` with an automation
on the person's state, and back when they return. A group that is ignored is still that
person's loved or loathed list, so rating into it still works.

## Seeing what it did

**Last match** (`sensor.love_it_or_loathe_it_last_match`; each entry has its own) holds the song last acted on.
Its attributes:

| Attribute | Holds |
|---|---|
| `entity_id`, `title`, `artist` | The player and the track. |
| `group`, `feeling`, `action` | The group it matched, whether it was loved or loathed at the time, and the action taken. |
| `result` | What was done, or `failed:` and the reason. |
| `repeats` | How many times the song has been played in the group's hours, when that is why the group had it; 0 when the group names the song. |
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
      feeling: love
```

Every match, action and return is in Home Assistant's log.

## Being told what it did

The integration installs a blueprint, **Notify on Love it or Loathe it** (Settings →
Automations & scenes → Blueprints). An automation made from it sends each match to a
notify action, to Home Assistant's own notifications, or both: the song, the player,
what was done and the group. It can be limited to loved songs, to loathed songs, or to
the times something failed, and it can run more actions of your own with the same
facts. The integration replaces the blueprint's file when it changes, so copy it under
another name before changing it.

## What it can't do

- Go back to what was playing when the player doesn't say what that was (no
  `media_content_id`) and it isn't one of your stations. The log and `result` say so,
  and the player stays on the other station.
- Tell a person's choice from a station whose `media_content_id` changes with every
  track. Such a player is not switched back.
- Fade between stations. The switch is immediate.
- Tell an advert from a song. A group can only match what a station reports as the
  title.
- Change a group's feeling by the calendar. That is an automation's work: the example
  under "Changing how you feel about a group" does it for Christmas.
- Show on a dashboard whether the song playing is already loved or loathed. The buttons
  only add it.
- Know who is in the room. A person's groups count wherever the entry's players are.
