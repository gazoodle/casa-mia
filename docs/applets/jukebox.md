# Jukebox

A page for the music on your Sonos speakers, and announcements on them with a chime, a
volume for each room and quiet hours.

> **Maturity: In development.** Being built: parts work, it changes often, and an update may break it. For the curious. ([The levels](../README.md#maturity))

Jukebox is meant to become one place to manage the house's music across Sonos, Spotify
and a local library. Built so far: its page with the players, rooms and favourites, a
small card, and announcements. Search, and a lock that stops guests changing the music
at a party, are planned.

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

Each room you choose gets a number, **announcement volume**, on Jukebox's device page.
It starts at 25%. It is separate from the volume of the room's music: a clip carries its
own volume, and the speaker's volume is left as it was.

## The page

Once Jukebox is set up, **Jukebox** appears in Home Assistant's sidebar for everyone
who is signed in. There is nothing to configure: the page shows every speaker of the
Sonos integration.

- **A player for each thing playing**, with its picture, the rooms it is playing in,
  pause, skip and one volume for all of those rooms.
- **Quiet rooms** are listed below. Tap one to choose a favourite to play there.
- **A speaker that isn't answering** is listed too, so you know why it is missing.

Tap a player to open it over the whole screen. There you have:

- **Play, pause, skip, shuffle and repeat**, and a slider to move within a song.
- **Queue:** the songs lined up, with the one that is playing marked. Tap a song to
  play it, drag one by the handle on its left to move it, or press the cross to take
  it out. The first 500 songs are shown.
- **Rooms:** tap a room to add it to what is playing, and again to take it out. Each
  room in the group has its own volume. A room that is playing something else is
  brought over to this music.
- **Favourites:** the stations, playlists and songs saved as favourites in Sonos. A
  station plays at once and leaves the queue as it is. For a playlist or a song you
  choose **Play next**, **Add to the end of the queue**, or **Play now and replace
  the queue**, which asks again before the queue is lost.

On a phone the queue, rooms and favourites open as a sheet over the player. On a wide screen,
such as a wall tablet, they sit beside it.

The page's heading has a back button and a home button, because a wall tablet running
without Home Assistant's sidebar has no other way to leave. To reach the page from a
tablet's dashboard, add any button that navigates to `/jukebox`.

Everything the page does goes through Jukebox and is written to Home Assistant's log
with the name of who did it.

## The card

**Casa Mia Jukebox**, in the card picker, is the small player by itself, for a
dashboard you already have. Choose a room and it always shows that room's music. With
no room chosen it shows a player for each thing playing in the house. A tap on it
opens the same big player.

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
