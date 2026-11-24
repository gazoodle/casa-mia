# Jukebox

A page for the music on your Sonos speakers, and announcements on them with a chime, a
volume for each room and quiet hours.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

Jukebox is meant to become one place to manage the house's music across Sonos, Spotify
and a local library. Built so far: its page with the players, rooms and favourites, a
small card, search, a lock that stops guests changing the music at a party, and
announcements.

It adds no media players. Each room stays the one entity that Home Assistant's Sonos
integration makes, and Jukebox, the Sonos app and your dashboards all use that entity.

## What you need

- Home Assistant's own Sonos integration, with your speakers set up in it.
- Sonos S2 speakers. An announcement is played as a clip over the music, which S1
  speakers can't do. An S1 speaker is refused with a result that says so; support for
  S1 is planned.
- A text-to-speech voice in Home Assistant, if you want messages said. Sounds need none.

Jukebox comes with the Casa Mia app, which installs it. It needs nothing else from Casa
Mia.

## Setting it up

1. Go to **Settings → Devices & services → Add integration** and choose **Jukebox**.
2. Open its **Configure** dialog and fill in:
   - **Rooms:** the speakers an announcement goes to when the action names none.
   - **Voice:** the text-to-speech voice that says a message.
   - **Chime:** the sound played before each announcement. Jukebox's own chime is
     filled in. Put a web address or a media id there for a different one, or empty the
     box for none.
   - **Quiet hours:** an entity that is on while announcements should be kept back. A
     schedule helper suits it; a toggle or a binary sensor works too.
   - **Who may run a party** and **Screens that may be opened up at a party:** see
     [The party lock](#the-party-lock).

Each room you choose gets a number, **announcement volume**, on Jukebox's device page.
It starts at 25%. It is separate from the volume of the room's music: a clip carries its
own volume, and the speaker's volume is left as it was.

## The page

Once Jukebox is set up, **Jukebox** appears in Home Assistant's sidebar for everyone
who is signed in. There is nothing to configure: the page shows every speaker of the
Sonos integration.

- **A player for each thing playing**, with its picture, the rooms it is playing in,
  pause, skip and one volume for all of those rooms. The speaker beside the volume
  mutes all of those rooms, and is crossed out while they are muted. Where there is no next song to skip
  to (a station, or music that is paused) the second button is Stop. To change their order, rest a
  finger on a player until it lifts, then drag it to its new place. The order is kept
  for every screen in the house.
  A speaker that is playing is always shown as a player. If Home Assistant has no name
  or picture for the station it is on, which happens with some speakers a song or two
  after a station is started, Jukebox asks the speaker and shows what it says.
- **Quiet rooms** are listed below. Tap one to choose a favourite to play there.
- **A speaker that isn't answering** is listed too, so you know why it is missing.

Tap a player to open it over the whole screen. There you have:

- **Play, pause, skip, shuffle and repeat**, and a slider to move within a song.
- **Stop**, the square beside the volume. It ends the music there, empties the queue and
  puts the rooms back with the quiet ones, after asking. Pause keeps the player and
  what it was playing; Stop clears it.
- **Queue:** the songs lined up, with the one that is playing marked. Tap a song to
  play it, drag one by the handle on its left to move it, or press the cross to take
  it out. The first 500 songs are shown. Above the songs, **Save as a playlist** keeps
  the queue as a new Sonos playlist under a name you give it, and **Clear the queue**
  empties it, after asking again.
- **Rooms:** tap a room to add it to what is playing, and again to take it out. Each
  room in the group has its own volume and its own mute. A room that is playing something else is
  brought over to this music.
- **Favourites:** the stations, playlists and songs saved as favourites in Sonos. A
  station plays at once and leaves the queue as it is. For a playlist or a song you
  choose **Play next**, **Add to the end of the queue**, or **Play now and replace
  the queue**, which asks again before the queue is lost. A Sonos playlist also has
  **Delete this playlist**, which removes it from Sonos for good and asks first.

- **Search:** one box searches the Sonos music library and Spotify together, and shows
  what each found under its own heading. Press **+** beside a result to play it, play
  it next or add it to the end of the queue. An album, an artist or a playlist can be
  opened to see what is in it. While the box is empty you can browse the music library
  and Spotify instead. Spotify is searched through Home Assistant's
  [Spotify integration](https://www.home-assistant.io/integrations/spotify), which
  must be set up and signed in, and Spotify must be linked to Sonos as a music
  service for its music to play. If one of the two can't be searched, the player says
  why and still shows the other's results.

On a phone the queue, rooms, favourites and search open as a sheet over the player. On a wide screen,
such as a wall tablet, they sit beside it.

The page's heading has a back button and a home button, because a wall tablet running
without Home Assistant's sidebar has no other way to leave. To reach the page from a
tablet's dashboard, add any button that navigates to `/jukebox`.

Everything the page does goes through Jukebox and is written to Home Assistant's log
with the name of who did it.

## The party lock

Anyone on the house's network can change the music with the Sonos app, and Sonos has no
way to stop them. The party lock doesn't stop them either: it puts back what they
change.

Press **Party** at the top of the big player. Only the people who may run a party see
the button: administrators, and the logins you choose under **Who may run a party** in
Jukebox's Configure dialog. While it is on for those rooms:

- **The queue** is kept as you made it. A song a guest adds is taken out, one they take
  out is put back in its place, and songs they move go back to their order.
- **What is playing from** is kept. If a guest starts music from another app, the
  speakers are returned to the queue, at the song they were on.
- **The rooms** are kept. A room taken out of the group is brought back, and one added
  is taken out.
- **The volume** of each room is kept, including a change made with the buttons on a
  speaker.

A change is put back about three seconds after it is made, and each one is listed with
its time when you press **Party on**. End the party from the same place.

### Who can change the music during a party

A guest could otherwise walk up to a wall tablet, end the party there and carry on from
the Sonos app. So during a party Jukebox itself is limited too:

| Who | During a party |
|---|---|
| The people who may run a party | Change anything from Jukebox, and end the party. |
| A screen, such as a wall tablet | Looks only, until someone running the party turns on **Let the wall tablets change the music**. Then it can change the music, but never the party. |
| Any other login, such as a guest's | Looks only. |

The screens are the logins you choose under **Screens that may be opened up at a
party** in the Configure dialog. The switch is on the sheet that **Party on** opens. It
is off at the start of every party, and can be turned on and off as the party goes.
With it on, anyone standing at a wall tablet can change the music; the log names the
tablet, not the person.

This is checked by Jukebox where a change is carried out, so it also covers the
Shortcut card and the `casa_mia_jukebox.play` action pressed from a dashboard. An
automation is never refused. A change that is refused says why on the page and is
written to Home Assistant's log with the login that tried.

A wall tablet can still reach a speaker without Jukebox, through another card or the
speaker's own dialog, because Home Assistant doesn't limit that. Those changes are put
back like any other made outside Jukebox.

Skipping a song, pausing and moving within a song are left alone, because they can't be
told from the music moving on by itself.

For automations there are two entities and an event:

| Entity or event | What it says |
|---|---|
| **Party** (binary sensor) | On while a party is on anywhere. Its `rooms` attribute lists each party's rooms. |
| **Changes put back** (sensor) | How many changes have been put back since Home Assistant started, with the last one and when. |
| `casa_mia_jukebox_put_back` (event) | Fired for each change put back, with `rooms` and `what`. |

For example, to run a disco ball for as long as the party lasts, switch it on when
**Party** turns on and off when it turns off.

Limits:

- A party ends when Home Assistant restarts.
- The room that leads the group (the one the party was started from, in Sonos's terms
  the coordinator) can't be taken out of the group until the party is ended.
- Songs moved in another app are noticed through the leading speaker's own report of
  its queue. If that is lost, the player says since when, and a move is then noticed
  only at the next change it does hear of.
- While a radio station is playing, a speaker doesn't report changes to its queue, so
  those are put back when the next thing happens that it does report.

## With Love it or Loathe it

Where [Love it or Loathe it](love-or-loathe.md) is installed and watches a speaker,
Jukebox works with it. The two share no settings; there is nothing to set up.

- **The thumbs** are under the song's title on the big player and on the Now playing
  card. They are Love it or Loathe it's own, so they follow its rules: they show only
  for a login that may rate.
- **Why a player was changed.** When Love it or Loathe it mutes a song, changes its
  volume, switches station or skips it, the big player says what it did and why, under
  the title: "Muted until the next track. Last Christmas by Wham! is in Christmas
  (loathe)". It stays while that is in force and for ten minutes after. A small player
  says what was done for as long as it is in force.
- **At a party**, what Love it or Loathe it does is not taken for a guest's change. The
  volume and the station are left alone until it has put them back.

## The cards

Jukebox's page is made of pieces, and each piece is also a card. If you want a page of
your own, with your own buttons or other cards beside the music, make a dashboard view
and add the pieces you want. Each is in the card picker under "Casa Mia Jukebox".

| Card | What it shows | Options |
|---|---|---|
| **Players** | A small player for each thing playing, in the order you dragged them into on Jukebox's page. | A room, to show only that room's music. |
| **Quiet rooms** | A chip for each room playing nothing, which opens its favourites, and any speaker that isn't answering. | Whether to show its heading, and whether to list the speakers that aren't answering. |
| **Shortcut** | One button that plays one favourite in the rooms you choose. | The favourite's name, the rooms, and optionally what the button says, an icon, and whether to play it next or add it to the end of the queue. |
| **Now playing** | The whole player for one room, in place: artwork, controls, queue, rooms, favourites, search and the party lock. | The room. |

Every card is set up with a form in the dashboard editor, with the usual Layout and
Visibility tabs beside it; none needs YAML.

A tap on a small player or a quiet room opens the big player over the screen, as on
Jukebox's page. The Now playing card needs room: give it at least half the width of a
tablet and most of its height.

Which cards a tablet or a person sees is Home Assistant's to decide: each card has a
Visibility tab in the dashboard editor. If your own view replaces Jukebox's page, turn
off **Show Jukebox in the sidebar** in Jukebox's Configure dialog (Settings, Devices &
services, Jukebox). The page is still there at `/jukebox`.

## Playing a favourite from a button or an automation

The Shortcut card uses an action that you can also call from an automation, a script
or a voice command:

```yaml
action: casa_mia_jukebox.play
data:
  favourite: Harbour FM
  rooms:
    - media_player.kitchen
```

`favourite` is the name of a favourite or a Sonos playlist as it is written in
Jukebox's Favourites; capitals don't matter. With more than one room, the first leads
and the others join it. Add `enqueue: next` or `enqueue: add` to line it up in the
queue; without it, it plays now. A station always plays now.

Use this action and not the speaker's own `media_player.play_media`: it goes through
Jukebox, so it is written in the log with who asked, and when a party is on it isn't
put back as a guest's change.

## Announcing

```yaml
action: casa_mia_jukebox.announce
data:
  message: Dinner is ready
```

| Field | What it does |
|---|---|
| `message` | Words to say, in the voice you chose. |
| `media` | A sound to play: a web address or a media id. With a message too, the sound comes first. |
| `players` | The speakers to announce on. Left out, it is all the rooms in the Configure dialog. |
| `chime` | `false` leaves the chime out of this announcement. |
| `volume` | A volume for this announcement in every room, in place of each room's own. |
| `priority` | `true` plays it in quiet hours too. |

An announcement needs a message, a sound, or both.

The announcement plays over the music, which carries on when it ends. Nothing about
the speaker changes: not its volume, what it is playing or its group. So
automations that watch the player, and Love it or Loathe it, don't see an announcement.

## One after another

A Sonos speaker that is sent a second clip while one is playing cuts the first off.
Jukebox keeps a queue for each speaker, so a chime is followed by its message and two
announcements at the same moment are played in turn. It knows a clip has ended because
it listens to the speaker itself while the clip plays.

An announcement that has waited 30 seconds for the ones before it is dropped, because
by then "someone is at the door" is no longer true. Its result is `too_late`.

Each room plays for itself, so the same announcement in two rooms next to each other
can be heard slightly out of step.

## What happened to an announcement

The action answers with a result for the whole announcement and one for each room:

```yaml
result: partly
rooms:
  media_player.kitchen:
    result: played
  media_player.garden:
    result: unavailable
```

| A room's result | What it means |
|---|---|
| `played` | The speaker reported that every clip finished. |
| `quiet_hours` | Kept back by quiet hours. |
| `unavailable` | The speaker is off or out of reach. |
| `not_sonos` | The player isn't one of the Sonos integration's. |
| `no_audio_clips` | The speaker can't play a clip over its music (Sonos S1). |
| `no_answer` | The speaker didn't answer on its control port, or never said the clip had ended. |
| `interrupted` | Something else sent the speaker a clip and cut this one off. |
| `too_late` | It waited more than 30 seconds for earlier announcements. |
| `failed` | Home Assistant or the speaker refused the clip. The `reason` says more. |

The whole announcement is `played` when every room that was meant to play did,
`partly` when some did, and `nothing` when none did. A room in quiet hours was not
meant to play, so it doesn't make an announcement partial.

The same answer is on the **Last announcement** sensor, with each room's result in its
attributes, and goes out as the `casa_mia_jukebox_announced` event. Every room that
didn't play is also written to Home Assistant's log as a warning, with the reason.

To be told when an announcement doesn't reach a room:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.jukebox_last_announcement
    to:
      - partly
      - nothing
```

## Limits

- Sonos S2 only, for now.
- Jukebox talks to each speaker directly on port 1443 while a clip plays, to hear when
  it ends. Home Assistant must be able to reach the speakers on that port, which it
  already must for the Sonos integration's own announcements.
- If the quiet-hours entity is missing or unavailable, announcements are played.
