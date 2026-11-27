# Backlog

Not scheduled. Sections are in order of their latest change; newest ideas first within each. Move an item into the README or code when it is started, and remove it when it is done.

## Cameras, Camera Commander and the compositor

- **A commander on a guest Wi-Fi: live video is slow to start and keeps dropping** (found 2026-11-12, an iPad in Safari signed in as a guest). On the main network the same iPad and page are instant, so the cause is what the guest network may reach, not Safari or the card. Where it stands:
  - **Seen on the guest network:** the low channel plays; the medium channel shows a first frame and is lost about 10 seconds later, on a regular cycle; nothing arrives on the high channel. Each loss and return also restarts the card's picture stream (see below), which is what makes the page feel slow.
  - **Ports that are known, guest network to the box, all TCP:** Home Assistant's own port, the guest sign-in's (8675), the compositor's (8099; optional since 2026.11.6-b4, as the card falls back through Home Assistant) and 18555, the built-in go2rtc's WebRTC port.
  - **What is not known:** how the video travels. WebRTC prefers UDP, and the built-in go2rtc picks a UDP port per connection, which no firewall rule can name. The likely fault is a UDP path that half works across the two networks, chosen ahead of TCP 18555. To find out: read the connection's chosen candidate pair on the tablet (`RTCPeerConnection.getStats`, which `app/web/src/webrtc.ts` could report with each loss), and whether go2rtc can be told to offer TCP only or a fixed UDP port.
  - **To do then:** a section in the guide on running a commander from a guest or isolated network, naming the ports; and say on the card why live is lost in terms someone can act on.
  - **The card makes it worse than it need be:** every change between live and drawn asks for a new picture stream (`&main=video`), so a live video that flaps restarts the tiles every few seconds. The picture could keep drawing the main camera under a live video that is not yet proven steady.
  - **The better channel is tried hidden:** the card plays a better channel unseen under the one shown and swaps at its first frame. Not shown to be at fault here, but not ruled out on Safari either: measure a channel started hidden against one started in view before relying on it.

- **A commander's less important cameras** (specified 2026-11-26, not built): `docs/design/commander-responsive-layout.md`, "A place for a card, and less important cameras". Up to four cameras marked **Less important** (`lesser`), which the Responsive solver may show sharing one tile when that leaves less of the space empty. The card place, which replaced "Buttons among a commander's cameras" (2026-11-12), is built (2026.11.14-b19). Seen on the test VM (2026-11-27, 26 cameras): the place is one tile, 143 x 79 px on a 1280 x 800 tablet and 123 x 67 px on a phone. HA's clock card fits it. A grid card of four HA button cards needs 165 px of height and shows only its top two buttons; on the phone the buttons also bring HA's card background. So four buttons need either compact buttons of our own or a bigger place: the owner's call.

- **The car's call audio toggling on and off after a doorbell call** (reported 2026-11-06, on a build before 2026.11.2-b12). Talking from the iPhone in the car played the visitor over the car's speakers (iOS puts audio in call mode while the microphone is on, which the car takes as a hands-free call). After hanging up, the car kept starting and stopping a call's audio, over and over. Likely cause, not yet proved: WebKit keeps the page's audio in call mode for a while after the microphone stops, and every live main camera session asks for audio (`recvonly`, though always muted), so each session opened or closed (Track motion changing the main camera, or before b12 the restart on Hang up) switches the car's call audio again. b12 removed the restart; the motion switching remains. **Evidence first:** the box's HA log for the doorbell's commander's WebRTC sessions after a hang-up, and the Main camera select's history against how often the car toggled. **Proposed fix:** the live main camera's sessions ask for no audio (`playWebRTC` adds the audio transceiver only for Talk's session; check whether the admin page's live view plays sound first), so nothing on the page uses audio outside a call.
- **Camera names as our pills** (asked 2026-10-12). The compositor's labels are plain text on a dark strip, which looks unprofessional. Draw them in the house pill style (`app/web/src/pills.css`, `docs/design/pills-and-chips.html`) into the picture, with the card's live caption to match. A pill per fact: the rung (HIGH, MED, LOW, STATIC) and its time (LIVE LOST 4 MIN AGO, STALE), so two devices showing the same view at different rungs never puzzle. See the ladder in `docs/never-silently-stuck.md`.
- **Camera stream troubleshooting** (asked 2026-10-11). Stale streams are fixed by hand today (reload UniFi Protect, restart the app). Bring it into Casa Mia:
  - **A problem summary on the compositor's Home tile** ("3 cameras stale, 1 with no signal", naming them).
  - **A Try to fix button** there and on the compositor page, lightest first: reload the camera integration (`config_entries` reload), restart the gatherer, restart the compositor. Each says what it does, shows progress, and the summary updates. The restarts need to exist as module actions first. Log each fix and what it found.
  - Later, perhaps: the light fixes by themselves when streams stay stale, with an off switch.
- **Docs: camera streams on UniFi Protect, the only camera system tried** (asked 2026-10-11). How a Protect camera's streams reach Casa Mia (RTSP per channel in Protect, the high, medium and low channels HA gives each camera, which Casa Mia uses for what, how they reach go2rtc). Say plainly in the camera guides and README that nothing else is tested, and invite reports (Reolink, ONVIF, generic RTSP, Frigate).
- **Commander controls as entities; idle mode as the worked example** (asked 2026-10-10). A commander's layout controls as entities on its device (a mode select, a main-panel size, panels on or off), so automations can change the layout. Idle mode: when KS's screensaver starts, the main panel grows to fill the screen but for a thin gap (8 %, or 100 px); back to normal when it's dismissed. Check whether a layout option already gives the look, else a new mode in both engines with a case. See "Templates for card options": ideally one way for a layout to follow a state.
- **Commander auto-layout** (asked 2026-10-10). Place a commander's cameras for you: fill the edges in order from a chosen start, tiles square. A `layout.json` option, in both engines, with cases.
- **A commander's detections and their clips** (specified 2026-11-27, not built): `docs/design/commander-detections.md`. A chip beside the main camera's name saying what is detected (with the number plate), and a dialog of that camera's recorded detections with thumbnails and clips, from UniFi Protect's event entities and media source. It takes the place of "The card shows the kind" in the item below.
- **Cameras: every detection a camera has, and choosing the main camera by them** (asked 2026-10-09). Cameras know one motion sensor each today. UniFi Protect's also offer person, vehicle, animal, package, plate, face; sounds (baby cry, barking, glass break, smoke and CO alarms); and states such as is dark, mostly each with its own detection switch.
  - **Gather them in discovery:** per camera, every detection sensor paired with its switch, by kind (Protect's translation keys where present, else device class and name); a small table of known kinds; generic, not one integration.
  - **Show them on the Cameras page:** which detections, which are off, and live in its preview.
  - **Later, choose the main camera by them:** per commander, which kinds count, a priority, and hold, go back and pause times per kind.
  - **The card shows the kind:** the detection's icon (a person, a car, a paw) in the tile's corner, pulsing; the tooltip says what and when.
  - **Open:** cameras with plain motion keep today's behaviour; several kinds at once; whether alarms (smoke, CO, glass) should raise more than a tile.
- **Camera compositor: optional off-box engine** (asked 2026-10-09). The same composition code on a separate machine, so the expensive work doesn't compete with HA; the on-box engine stays.
  - One engine implementation in both, no fork. Configuration and controls stay in Casa Mia, with an engine endpoint; the remote engine reaches cameras over the network, not HA's localhost go2rtc.
  - The Commander card works the same from home or away. Authenticated control and media; engine health shown in Casa Mia.
  - Explore a low-latency composite video stream through go2rtc on capable hardware; verify decode, compose and encode acceleration rather than assume it.
  - Benchmark small HA boxes against dedicated hosts (cameras, viewers, freshness, latency, bandwidth, CPU/GPU).
- **Rename the Commander card's Security look** (asked 2026-10-09). Perhaps **Surveillance mode**; agree the name first. Labels, docs and changelog wording only; keep the option keys.
- **The Commander card in a Tablet Layout's edit mode should behave like a Picture Glance card** (asked 2026-10-09; tried before and given up). In edit mode it visibly grows into its size and asks the compositor for a new picture at each step (over 20 sizes for one image). Ask for a new size only outside edit mode; in it, scale the picture it has.
- **Slow through Nabu Casa: cut the bandwidth** (first step in 2026.10.3-b31: through HA the card caps its pixel ratio, `away_sharpness`). Still to measure away. Measured 2026-10-06: a device away held two streams at once through HA (about 2.2 Mbit/s together, at dpr 2); the box was busy but not choking; HTTP/1.1's six connections per site are shared with HA's own UI. First get the HA log's "picture … ended" lines (kbit/s, % waiting) from a session away (INFO: set `custom_components.casa_mia: info`), and compare responsiveness with each idea: dpr 1 or lower JPEG quality through HA; one stream per device through HA; a slower rate away; single `.jpg` frames instead of a held stream; fetching small tiles less often. Longer term, send only what changes: our own block updates on a canvas, or H.264 through go2rtc/WebRTC. Automatic step-down lacks a signal (an MJPEG `<img>` reports no frames in Safari), so fixed levels first.
- **Commander text sizes.** The text a commander draws is fixed (16, 20 and 40 px in `_fonts`, and `SMALL_BAR`), only grown by density. A size for the tile labels and one for the main camera's, in CSS px, per commander: layout options in `layout.json`, shown by the admin page and card editors, drawn by the compositor.
- **Camera visibility in a commander.** v1: each camera may name an HA binary sensor; while it's off the camera is left out (the layout closes up, tap zones follow, the main camera moves on). An input to both layout engines, with a case; the compositor reads the sensors through HA and redraws on a change, the card reads `hass.states`. Unavailable shows the camera (fail open); log each hide and show. Later: HA conditions or a template. A user or screen condition differs per viewer, so per-viewer hiding needs a picture per hidden set.
- **Who sees which commander** (issue #4): visibility on each commander's whole view, by form factor, platform or user; the phone needs a single-page navigator. The Portrait screens and Phones settings were kept for this.
- **A small outer border on the Commander card**, so its picture's edges never land on the screen's last pixels. The card rounds its size to 8 device px, and a WebView can be bigger than its screen: on a wall tablet (density 170) the page was 1342 × 801 device px on a 1340 × 800 screen, cutting the debug overlay's corners. Worth raising with KS's author, with those figures.
- **Frames over the WebSocket have no lease** (2026.11.5-b3; the fix itself was seen working by the owner on 2026-11-11). In Safari over https the Commander's picture comes as frames over a WebSocket. A socket that stays open and sends nothing leaves a frozen picture with nothing said, as the `<img>` stream does. The compositor sends a frame again at its keep-alive, so the card could count a picture as current only while frames arrive, and say how long ago the last one came.
- **Hardware video decoding for the compositor's streams** (considered 2026-10-07). Since b52 keyframes-only cut decoding about 16x, so measure first (the compositor page's CPU column). The owner's N150 has Quick Sync; PyAV's wheel has the QSV decoders; missing are `/dev/dri` (`video: true`) and Intel's driver (30–60 MB). **Constraint:** one image for every HA box (amd64 and aarch64), so no Intel-only packages for everyone. Options: amd64-only drivers, install on demand when an Intel GPU is found, or HA's go2rtc/ffmpeg doing it. Decode on the GPU when present, software otherwise, and say which on the page.
- **Compositor follow-ups:** move `gen_dashboard.py`, `discover_entities.py` and their tests from `tablet-provision/composite-test` into `tools/`; a "Camera compositor" device in the integration (state, groups, streams); verify the Supervisor proxy carries the camera stills and the HLS warm-up websocket before cutting the tablets over from the Mac.

## Stock (an idea, not started)

The owner's idea, 2026-11-23: a spare wall tablet in a store room scans wine, beer, other
drinks and food in and out, as a stock control system. The name is Stock (owner,
2026-11-24). Only the name and the two rulings below are decided; the rest is the agent's
proposal from that discussion, to be agreed before anything is built.

- **Not Grocy** (owner, 2026-11-24). Why: the owner looked at its interface and rejected
  it outright, as a spreadsheet-style screen with far too many features. Don't propose it
  again, nor a front end to it.
- **Where it lives is open.** The owner said it might be Home Assistant, part of Casa Mia,
  or something else. The proposal is a Casa Mia module, because the tablet page, the
  storage, the sensors and the events already exist here. Whether the screen is a Lovelace
  card or a page of its own has not been looked at.
- **Scanner or camera is open.** The proposal is a 2D presentation scanner on a stand,
  acting as a keyboard, with the page listening for its keystrokes. A mounted tablet's
  front camera is usually fixed-focus and reads a curved, shiny bottle badly; a page also
  needs HTTPS to use it. Test the tablet's camera on a bottle before ruling it out as a
  fallback. Still to find out: whether the tablet can power a USB scanner while it
  charges, or needs a Bluetooth one.
- **Proposed first version:**
  - A known barcode takes one off the count and shows the name and the new count in
    large type, with undo.
  - An unknown barcode is looked up on Open Food Facts (only the barcode leaves the
    house); if that finds nothing, the page asks for a name and category once.
  - "Out" is the default. An "In" button switches mode and lapses by itself after a
    minute (RULE FIVE), with a keypad for the quantity of a case.
  - On-screen buttons for chosen things that have no barcode.
  - One SQLite file: the products, and an append-only log of movements.
  - A sensor for each category, and an event when a product falls to its minimum.
- **Left out until missed:** best-before dates, storage locations, units, prices,
  shopping lists and recipes.
- **Known to be awkward:** a wine's barcode does not give its vintage, small producers
  often have none, and Open Food Facts is patchy for wine.

## Jukebox (in development)

The owner's idea, 2026-11-20: one place for both of the owners to manage the house's music
across Sonos, Spotify and the local library, in place of Music Assistant. The name is final
(owner, 2026-11-20).

- **A song into a playlist: what is left** (after 2026.11.14-b7). The Favourites tab
  shows "Fetching…" while the tiles are fetched again after a playlist change, where it
  could keep the old tiles until the new ones come. The editor's chooser fetches every
  tile's covers to list the names. A song the house has as a file is still added from
  Spotify. A new playlist is made before its song is put in, so if that fails an
  empty playlist is left (the reason is said). None of b4 to b7's playlist work has
  been tried on a real speaker: do that first.
- **Every playlist change put back, once the playlists are copied** (owner, 2026-11-26).
  The owner is to ask for Jukebox to copy all the Sonos playlists into the integration's
  data, so that Home Assistant's backups hold them. With that copy, deleting a playlist,
  saving the queue over one and taking out repeated songs can be put back from the toast,
  as a replaced or cleared queue is since 2026.11.14-b8 (`undo.py`), and their red
  questions can go: red is for what can't be got back (the `Sure` tones in
  `integration/cards/src/jukebox/pick.ts`). Not yet tried on a real speaker: putting a
  queue back, its copy kept as "Jukebox undo copy (room)".
- **Restoring the playlists from a backup** (owner, 2026-11-26: later, after the copy
  above). Offer to put a playlist back from the copy in the integration's data, after
  it was deleted or changed in Sonos, or after a restore of Home Assistant.
- **Jukebox adds no media players** (owner, 2026-11-20). Each room stays the single
  entity that Home Assistant's Sonos integration makes. Jukebox's card, its services and
  the Sonos app all drive that one entity. Why: Music Assistant wraps each speaker in a
  player of its own, so a room such as "Den" appeared twice, as "Den" and "Den Sonos", and
  nobody could tell which one was in control. It also brought features nobody asked for.
- **The speakers hold the truth.** Queues, groups and volumes live on the Sonos system,
  not in Jukebox, so the Sonos and Spotify apps always agree with it. Changes reach it as
  state changes from HA's Sonos integration, which subscribes to the speakers' UPnP events
  (RULE FOUR). A Sonos group is the coordinator's entity with its members, shown as one
  tile, never a new "group player".
- **Show who is in control:** each room shows what it is playing from (the Sonos queue,
  Spotify Connect from someone's phone, the TV, line-in), which Sonos reports.
- **A standalone integration that Casa Mia delivers** (owner, 2026-11-23), as Love it or
  Loathe it is: wholly in Home Assistant, nothing imported from `casa_mia`, bundled with
  the app and installed by it at each start. Its domain is `casa_mia_jukebox` and its
  action `casa_mia_jukebox.announce` (owner, 2026-11-23). Its brand is drawn: a 1980s
  boom box in front of the house (`tools/brand_children.py`).
- **S1 systems are to be supported, with less, but later** (owner, 2026-11-22). Why:
  Jukebox is to be useful to everyone, not only this house. The first builds are for S2.
  Until S1 is built, an announcement to an S1 speaker is refused with a message that says
  why, never dropped silently. An S1 speaker has no audioClip, so its announcement will be
  snapshot, play and restore. The owner has no S1 speaker (checked 2026-11-22: every
  speaker reports `swGen` 2 and `AUDIO_CLIP`), so that path can only be tested against a
  stand-in until someone with S1 tries it.
- **The page, its players, rooms and favourites, and the small card were built in
  2026.11.12-b9, and the queue (jump to a song, move one, take one out) in b11.** Left
  of the brief below: lyrics. Also left:
  - Built in b12, asked for by the owner on 2026-11-23: the players' order, clear the
    queue, save the queue as a playlist, delete a playlist, and the light round a
    button while a speaker is asked.
  - **The pieces as cards** (owner, 2026-11-24: "maybe we have cards for the pieces
    that the jukebox main page shows, then they can be assembled into a custom page")
    were built in b15 with the `play` action. Left, agreed in outline and waiting for
    the owner to have tried the cards: each piece adapting to the size it is given (a
    player growing a larger picture, the previous button and the song's time where it
    has the width), and Jukebox's own page showing Now playing across a wide screen
    when one thing is playing (a large wall tablet shows a lot of empty space).
    The play action takes a favourite's name only: nothing found by a search.
  - **Follow Home Assistant's text multiplier** (owner, 2026-11-24: a new, large
    wall tablet is high-resolution, so the mini players are hard to read, and the
    rest of Home Assistant will be too; but the Camera Commander's resolution is liked,
    so the layout mustn't be zoomed). Home Assistant's frontend derives every text size
    from `--ha-font-size-scale` (read in its code, 1 by default), which a theme can set
    and a theme is chosen per device. Jukebox's sizes are fixed pixels and ignore it:
    make its text, buttons, pictures and rows multiples of that scale, then Casa Mia's
    other cards where it matters. Not yet tried on a tablet; the owner is to try the
    theme setting first.
  - **Listening on a phone's or tablet's own earbuds** was built in b26 (owner,
    2026-11-24; HANDOVER, "Listening on your own device"): "this phone" as one more
    room, with Spotify through its Web Playback SDK and the library and radio in an
    `<audio>` element. Decided by the owner on the way: no Music Assistant, no Sonos
    Port, and a Spotify song is not handed over to the Spotify app. Left:
    - **It works on the owners' two iPads** (owner, 2026-11-24, b26). Not known to
      have been tried: an iPhone or an Android phone with this build; the lock
      screen's buttons while Spotify's player has the sound; a library song that isn't
      MP3, AAC or FLAC (a browser plays no WMA); the token renewed after its hour; a
      long listen with the device locked in the companion app.
    - Who may have Spotify on their own device is hosts only, and the room isn't
      offered on the house's own screens: both my choices, for the owner to rule on.
    - A station shows its name and not the song it is playing (the stream's own
      titles aren't read).
    - Shuffle picks any other song, so one can come round again before all have
      played. An artist found on Spotify can't be played whole: open it and choose.
    - A library song found by Search has only its title until it plays; one from a
      playlist or an album has everything.
    - No volume slider (a page can't set an iPhone's volume), no thumbs, no saving the
      phone's queue as a Sonos playlist, and the screen isn't kept on (the measurement
      showed it needn't be; the wake lock worked in both browsers if it is wanted).
    - The earlier plan, one continuous stream for each listener sent by the app, is
      kept in reserve for a phone that stops when it locks.
  - **Who may run a party, the thumbs and Love it or Loathe it's reasons** were built
    in b18 (owner, 2026-11-24). Decided then: thumbs up and down as Love it or Loathe
    it's card has, not the mock-up's heart (one picture for one action, and a heart
    reads as "save to favourites"); only chosen logins may start or end a party, and
    during one only they change the music from Jukebox, with a switch of theirs to let
    the wall tablets change it too, off at the start of each party (why: a guest could
    end the party at a wall tablet, then use their own phone); a loathed song in a
    queue is skipped with nothing to set up; a party lets Love it or Loathe it's
    changes through. Left:
    - None of it has met real speakers or the owner's Home Assistant: the two lists in
      the Configure dialog, a wall tablet's login being refused, the real thumbs on the
      dark player (checked here against a stand-in element), a skip on a real queue.
    - On a screen that may not change the music, the controls are still drawn and a
      press is refused with the reason; they aren't greyed. A line at the top says so.
    - A login's part reaches its page with the next push of the house, so a change to
      the two lists shows there only when a speaker next changes. Jukebox itself
      decides afresh each time something is asked.
    - A wall tablet's login belongs to no person, so the thumbs don't show there. "Who
      is rating?" on such a screen was put off (owner, 2026-11-24).
    - Put off the same day: a code typed on a tablet to unlock it for a few minutes,
      and guests adding a song to the end of the queue from a tablet.
    - The reason shows what was last done. The last few lines for one player (Love it
      or Loathe it keeps them per entry, for Casa Mia's page) aren't shown.
    - A song played too often is never skipped: each skip counts as a play.
  - **The party lock against the Sonos app, first real use** (owner, 2026-11-24, b19).
    "Play this album now" from the Sonos app replaced the queue. The lock put the
    songs back, but the music stayed stopped at the first song, and the streamed songs
    among them came back with no title, artist or album (read from the speaker afterwards;
    they still played, and the saved playlist still had the details). Fixed in b19:
    the music is started again where it was, and a song is described to the speaker in
    the speaker's own XML names. **Disproved the same day:** the names were not the cause of the lost titles. A
    streamed song has no title straight after its playlist is queued (the speaker
    fetches the details from the service, slowly and not for all), and library songs
    put back one at a time lose their lengths. b20 has the speaker keep and load its
    own copy of the queue instead (HANDOVER); that has not met a real speaker either.
    Left of it: one song taken out reloads the whole queue, so the song playing starts
    again; a party ended by a restart leaves its copy among the Sonos playlists.
    The earlier guess, for the record: that the names were the cause of the
    lost titles. It is the likeliest reading (library songs, which the speaker looks
    up itself, were unharmed), but no streamed song has been put back by b19 on a real
    speaker. If titles are still lost, log what `upnp.songs` read and what `insert`
    sent before guessing again; the saved playlist's own `r:resMD` for a song is the
    known-good description.
  - **From the owners' first evening with it** (2026-11-24, built in b20): play the
    queue while the radio is on; add from the queue's own view; see a playlist's songs
    before playing it, and move, take out and add there; folds on Favourites; the
    Love it or Loathe it line as one plain sentence; the music back at the place in
    the song after a put-back. Left:
    - The playlist changes were tried on a real speaker the same day, on a playlist
      made for the purpose and deleted after: a library song and album added, a
      Spotify song and album added, a song moved up and down, one taken out. Learned:
      each change must carry the playlist's change number as it stands, or it is
      refused (error 1028); a speaker won't describe one library song when asked, but
      fills in its title and artist itself; and a Spotify song is named to the
      speaker with no account, which the speaker picks. So the first reading, that
      Jukebox needed the account's number, was wrong. Not seen: any of it from the
      page itself, against a real speaker.
    - A playlist's listing gives no length for a song from the music library, so
      none is shown for those; streamed songs have theirs.
    - The same way of naming a Spotify song serves the clean-up of the old playlists
      (below): a replacement can be written into a new playlist with no account.
    - **More about what a radio station is playing:** its song's cover is built
      (b24). Left: a + beside the title to add "this song on the radio" to the queue
      or a playlist (the match is a Spotify song), once the covers prove reliable on
      the owner's stations; and showing the names the right way round for a station
      that sends them swapped.
    - **The editor on a wide screen** (b22, redesigned in b25: a chosen song shown
      whole, insert before or after it, sort with put back, duplicates, widths set by
      dragging; owner 2026-11-24). Not seen against a real speaker or on a real
      tablet. Left: sorting by the date a song came out (the speaker doesn't list
      it); sorting and tidying the queue, which are a playlist's only; and adding to
      the queue at a place moves each added song up one at a time
      (`feed.queue_add`), where the speaker's move takes a count of songs that
      hasn't been tried.
    - After a put-back the music once started at the next song, not the one playing
      (b19, on a real speaker; the cause wasn't found). b20 loads the queue back whole
      and logs where it returns to ("back to song N"): read that line if it recurs.
  - **Playlists, asked 2026-11-24, not built:**
    - **Keep a copy of every playlist** (owner: "snaffle a copy"), so one deleted or
      changed in the Sonos app can be put back. A party's queue is already safe from a
      deleted playlist (the queue is its own copy); this is for the playlist itself.
      It rests on putting songs back with their details, so prove the b19 fix first.
  - **Mute** (b17): the party lock guards a room's volume but not its mute, so a
    guest's mute isn't put back.
  - `tests_ha/test_jukebox_page.py` is at 777 lines of the 800 allowed: split it before
    adding to it.
  - The party lock and its entities were built in b14, from the mock-up. Left: it has
    not met real speakers (a guest's change from the Sonos app, another app's stream);
    a party isn't kept across a restart of Home Assistant; the leading room can't be
    taken out during one; skips and pauses aren't guarded; the volume is put back even
    for the buttons on a speaker (as the mock-up, though the first notes spoke of a
    volume limit: ask the owner after a real party).
  - Search and browse over the Sonos music library and Spotify (owner, 2026-11-23)
    were built in b13. A library result shows no artist (Home Assistant's search gives
    a title only), a Spotify song no picture, and only the first Spotify account is
    searched.
  - The queue shows a change made in another app only when the song or the number of
    songs changes: a speaker doesn't tell Home Assistant of a move. The party lock's
    watch on the speaker (`queueVersion`, below) will tell the page too.
  - The queue shows the first 500 songs, has no pictures (the speaker serves them over
    plain http on the house's network, which a phone away from home can't load), and a
    song can't be dragged past the edge of what is on screen.
  - The phone's lock screen (owner, 2026-11-23, "unless it's easy": it isn't. A browser
    shows lock-screen controls only for a page that is itself playing sound, so it
    would need a silent sound kept playing, and the phone's volume keys would still
    turn the phone's own volume, not the speakers').
  - A phone's back button should close the big player; the page's heading can't be
    turned off yet; the group's one volume sets each room in turn (the speakers have a
    group volume of their own).
- **Announcements were built in 2026.11.12-b6** (HANDOVER, "Jukebox"). Left to do:
  - See it on the box: the dialogs, the chime reaching a speaker, a whole announcement.
  - Its tile and picture in the README.
  - S1 (above), and players that aren't Sonos, which are refused today.
  - Rooms next to each other play slightly out of step: each speaker gets its own clip.
- **The player card: the owner's brief** (2026-11-23). A new media player card of Casa
  Mia's own, for Sonos only, driven through Jukebox. Steps 2 to 5 below are parts of it.
  - A mini player on a page that opens to a big player with the artwork, and lyrics or
    the like over it.
  - The queue edited live at a party: search, browse and add to the queue. A choice that
    would replace the whole queue warns in big letters first.
  - Borrow from the apps people know (Sonos, Spotify, Music Assistant, other well-liked
    jukeboxes). It must look good and be easy to use.
  - It stops other people's changes from the Sonos app sticking.
  - It works with Love it or Loathe it.
  - It offers sensors, so an automation can turn on a disco ball and lights.
  - The mock-up (`docs/design/jukebox-mockup.html`) was agreed as the look and the flow
    (owner, 2026-11-23).
  - **A page of Jukebox's own, plus one small card** (owner, 2026-11-23), as Sensor Watch
    has a page. The page is drawn by Jukebox from top to bottom, finds the Sonos rooms and
    what is playing by itself, and changes none of the owner's dashboards. Its heading has
    a back and a home button, which can be left off: a phone has Home Assistant's top bar,
    but a wall tablet has no top bar and no sidebar. The card is the mini player alone
    (artwork, title, rooms, pause, next, volume) for a dashboard that already exists, and
    opens the big player. Why not cards to lay out: on a dashboard the player took on the
    dashboard's look, and the owner didn't want it built in Lovelace.
  - Turned down the same day: the community Sonos card (too complex for the people who
    will use this), and a lock that leaves the queue to be filled and changed in other
    apps (the owner wants it done in Jukebox's card).
- **Measured for the player, 2026-11-23** (one S2 speaker, paused throughout, nothing
  played):
  - **Search:** Home Assistant's `media_player/search_media` works on a Sonos entity and
    returns songs from the Sonos music library. Browsing gives the Sonos favourites
    (playlists, radio, tracks) and the library. Spotify is linked to the Sonos system as a
    service, and the owner added Home Assistant's Spotify integration for the search
    (2026-11-23). Searching Spotify, and adding a song found that way to a Sonos queue,
    are not measured yet.
  - **The queue can be edited without playing:** adding through `play_media` with
    `enqueue: add`; moving and removing through the speaker's UPnP AVTransport
    (`ReorderTracksInQueue`, `RemoveTrackFromQueue`, `RemoveAllTracksFromQueue`, port
    1400), which Home Assistant has no action for. `sonos.get_queue` reads it back.
  - **A change to the queue is pushed within 0.1 s while the queue is what the speaker
    plays from.** The entity's `queue_size` changes, and the speaker's websocket
    (`playback` namespace) reports a new `queueVersion` for every change, one deep in the
    queue included. `queue_size` alone misses a move or a swap, so the lock watches
    `queueVersion` and then reads the queue.
  - **While a radio station is the source, queue changes are reported by neither.** The
    lock must read the queue again when the source returns to it.
  - Volume changes arrive from both within 0.1 s (`playerVolume`, `groupVolume`: the
    speaker has a group volume of its own).
  - `sonos.snapshot` and `sonos.restore` put the source back after the test.
- **In this order:**
  1. **Announcements** (built; this is the design they were built to): an `announce`
     service over `media_player.play_media` with
     `announce: true`. On S2 speakers Sonos's audioClip ducks the music and restores it by
     itself. Jukebox adds per-room volume, quiet hours, a queue so two announcements never
     overlap, snapshot and restore for speakers without audioClip, and a logged, visible
     failure when a speaker is offline.
     Measured on a real S2 speaker, 2026-11-23 (two clips a second apart, over a radio
     station):
     - **The queue is needed.** The second clip cut the first off (the speaker reported
       it `INTERRUPTED`); Sonos doesn't line clips up.
     - **Home Assistant can't say when a clip ends.** `play_media` answers within 0.1 s,
       before the clip plays. The speaker's own websocket (port 1443, `audioClip`
       namespace) pushes `ACTIVE`, `DONE` and `INTERRUPTED` for each clip.
     - **A clip doesn't touch the entity.** No state change reached Home Assistant and the
       volume was the same afterwards, so Love it or Loathe it never sees one.
     - **The queue waits on the speaker** (owner, 2026-11-23: a chime before the speech
       is wanted, so the queue is there from the start). Sending the second clip when
       the first reported `DONE` played both whole, on an old Play:1 as well.
     - **On subscribing, the speaker first reports its last clip**, already `DONE`, from
       whenever that was. Jukebox must wait for a clip it has not seen before; Home
       Assistant doesn't hand back the id of the one it sent.
     - **`extra.volume` sets the clip's loudness** (the owner heard a clip at 7 play
       quieter than one at 15, 2026-11-23), and a clip plays with the speaker at volume 0.
  2. **A small card for everyday use** (owner, 2026-11-23). The need isn't control of the
     media or a new page: Home Assistant's own page and dialogs do that. It is that joining
     rooms and changing station take a dialog for each speaker. The community Sonos card
     was looked at and turned down as too complex for the people who will use this. The
     card uses only Home Assistant's own actions (`join`, `unjoin`, `select_source`,
     `volume_set`):
     - Agreed: a room is added to what is already playing, and taken out again, with one
       tap. "Also in the garden", not "follow me".
     - Wanted if it is easy (owner, 2026-11-23): each room's own volume in a group, set
       from the one card. Each room is its own entity with its own volume, so it is.
     - Proposed, not yet agreed: a line for each thing playing with its rooms; Sonos
       favourites as pictures, played in the chosen rooms; one volume for the group.
  3. **The party lock** (proposed 2026-11-23, not yet agreed or designed). The owners'
     hard case: guests on the house network all have the Sonos app and change the playlist
     or the rooms, and the network's password is to stay as it is. Sonos has no permissions
     on the network, so Jukebox can only make a change not stick. A party names its rooms,
     a playlist and volume limits; while it runs, Jukebox's copy of the queue is the truth
     and anything it didn't do itself is put back, with a record of what it undid. This is
     a deliberate exception to "the speakers hold the truth", for the length of a party.
     To measure first: how quickly and how completely queue changes reach Home Assistant.
     A party's music comes from all of these (owner, 2026-11-23): playlists saved in
     Sonos, some of which are broken, playlists in Spotify, and songs added on the night.
     So the lock should guard the Sonos queue whatever filled it, and the owners change
     it from Jukebox's card (the brief above). A broken track that Sonos skips must not count as someone's change.  4. **Search and play:** one search across Spotify, the local library and Sonos
     favourites. Spotify plays through Sonos's own Spotify service (SoCo's share links),
     not Spotify Connect, which often can't see a sleeping Sonos.
  5. **Playlists:** editing Spotify playlists and saved tracks through the Web API, reusing
     the token of HA's Spotify integration rather than a second login.
  6. **Sonos versions in Sensor Watch:** each speaker's software version, flagging
     speakers on different versions and speakers that are offline. Updates themselves stay
     with Sonos's overnight auto-update; no supported local way to start one is known.
- **Later, housekeeping** (owner, 2026-11-23): the music library was to be cleaned (broken
  files fixed or downloaded again, the library tidied) and the job was put on hold. The
  broken Sonos playlists come from it. Not part of Jukebox's builds.
- **The local library** stays Sonos's own SMB-indexed library, so the Sonos app can
  browse it too. A library index of Jukebox's own only if Sonos's falls short (its track
  limit, slow rescans, weak artwork).
- **Open questions:**
  - Two Spotify accounts: share-link playback uses one linked account. Check whether both
    owners' accounts are linked to Sonos (Duo or Family).
  - Spotify's 2024 API changes removed recommendations and audio features for new apps, so
    no "smart" features built on them.
  - Love it or Loathe it switches stations on the same Sonos entities. Jukebox must not
    fight it, for example by restoring a snapshot over a station it has just switched to.

## Topology (an idea, not started)

The owner's idea, 2026-11-18. The brief is `docs/design/topology.md`: what is agreed, what
is only proposed, and the questions still open. Its contract was agreed on 2026-11-18.

- **Topology, the applet:** buildings and sites above Home Assistant's floors and areas,
  and connections between areas with an optional direction. Digs is its first consumer;
  the other Dash-Bored families, Auto Dashboards, House Manual and Gang-O-Gals follow.
  The name is final, and it lives inside Casa Mia, not as a component of its own (owner,
  2026-11-18).
- **Sections in the Gazette** (owner, 2026-11-18): the papers have no room card, since a
  newspaper is an overview, but they might be divided into sections once Topology says
  how the house is divided. Not designed.
- **Routes between two areas**, when House Manual or a game first needs one.
- **Layout data** (walls, sizes, positions): later. Only the first-person game needs it.
- **House Manual** (named by the owner 2026-11-18, not designed): a consumer of Topology's
  routes. It needs a brief of its own.
- **Adventure games in Dash-Bored, played in the user's own house** (owner, 2026-11-18),
  in this order, each in the style of its kind with our own text and drawings:
  - A text adventure: rooms and exits from Topology, an area's devices as the things in
    the room, commands that call their actions.
  - A point-and-click adventure: a screen for each room, which needs directions and a
    picture of each room.
  - A first-person walk through the house, which needs the layout data above.

## Dash-Bored (in development)

Started 2026-11-13 (2026.11.8-b1) with the Gazette. HANDOVER has how it is built; the
mock-ups are in `docs/design/dash-bored/`. The owner is on Bakelite now (2026-11-14), and
the Gazette's own work is parked below it.

- **An open page keeps an alert that ended while it was disconnected** (found in the code
  2026-11-22, not seen). Each page adds what the feed holds on reconnecting to what it
  had, so one withdrawn or long mended meanwhile stays until a reload. A copy of the other
  side's state (RULE FIVE): the feed should say which message is the whole of it.

- **The Console's meter panel, what's left** (asked 2026-11-18; the plan, with each step's
  detail, is `docs/design/console-meter-panel.md`; steps 1 and 2 were built in
  2026.11.9-b23):
  - **Size the Console's controls properly** (owner, 2026-11-18: "like we ought to have
    done to start with"). A control should be drawn at whatever size its place gives it.
    Today only the needle meters are (they are SVG in a `viewBox`). The seven-bar figures
    (`console/figures.ts`), Nixie's tubes, Bakelite's wheels, Silverface's readout, every
    era's plates and the warning lamps are fixed pixel sizes. Make each of them scale with
    its container, in all five eras, then take the stopgap out: the meter panel zooms its
    whole chassis to fit (`fit` in `console/meters.ts`, 2026.11.9-b24), which makes
    everything smaller together and leaves lettering very small on a phone. Why it was
    found: on the owner's phone a three-phase panel's meters overlapped each other.
  - Step 3: the bands drawn as zones on the scale, in all five eras' `meter`.
  - Step 4: stand-in meters on the test VM, a picture for the guide, and the guide saying
    the card is in daily use in the author's house once it is on the live dashboards.
- **A design session: the Console's pieces, for building your own dashboard** (owner,
  2026-11-25; a big one, to be designed with the owner before anything is built). Clean up
  Dash-Bored's controls so that anyone can put together a styled house board of their own
  from the basic pieces. It takes in the earlier item on the Console's cards (owner,
  2026-11-20: the gauges and controls "are currently there but a bit confusing to use";
  the part cards `dash-bored-console-instrument`, `-room` and `-lamps` in
  `console/cards.ts`, the meter panel and their editors). What the owner asked for:
  - **Individual controls**, each one a card of its own. The user chooses the control and
    then the entity it shows, not the other way round, so it is clear what a card will
    draw. The automatic choice of control from an entity stays wherever a family draws
    the whole house.
  - **Panels that are just a list of entities**, laid out automatically, or in an order
    the user sets.
  - **Each era's pieces separate**, so a board can be built in one era's style.
  - **Offered as suggestions when an entity is chosen** in Home Assistant's card picker,
    and **put in categories** so they are easy to find.
  - **A clock for every era**, built as a specialisation of one clock, because the owner
    wants many clock designs: styled after fine chronographs, station clocks and flap
    digit clocks (like the departure board's style), and more.
  - **More knobs and colours**: everything someone would need to style their own board
    from the basic controls.
  Open for the session: the cards' names and categories, what a panel's ordering looks
  like in its editor, how a clock design is described, and how much of the existing part
  cards is kept or replaced.
- **Every family gets every capability** (owner, 2026-11-17; the rule is in HANDOVER and
  the table in `docs/design/dash-bored-survey.md`). `tests/test_dash_bored_parity.py`
  lists each of these in its `OWED`, and fails when a family starts to show something
  the others do not: an entry there goes when its item here is built. What is missing:
  - **The Console: who is at home** (`house.people`), and their comings and goings.
  - **Aurora: the weather, the forecast and who is at home**, on its home screen, which
    is thin (owner, 2026-11-16: "we'll find stuff to put on there").
  - **The Fridge: the forecast**, and comings and goings with their times.
  - **Console, Fridge and Aurora: what the players played lately, what is playing with
    pause and play, and Love it or Loathe it's ratings.** Only the Gazette has them.
  - **Gazette, Console and Fridge: a thermostat's modes and a player's source**
    (`Device.choices`, which only Aurora's sheet shows).
  - **Gazette, Console and Fridge: finding a device by typing**, if it suits them: ask.
  - **The agent's column (ZenOS-AI)** on the other three: ask the owner whether it
    belongs anywhere but a newspaper.
  - **The Fridge: a camera's presets, zoom and controls** (the test found this,
    2026-11-17).
  - **Casa Mia People's ages and birthdays** (the household feed, 2026.11.11-b6) on the
    five families other than Digs, which is the only one that draws people. A birthday
    at least is news anywhere: a story in the Gazette, a note on the Fridge.
  - **Console, Fridge and Aurora: what the house is missing** (`house.gaps`) **and which
    appliances are drawing power** (`house.appliances`). Only the Gazette has them.
  - **Fill in the cells still marked `?`** from the source before starting on their rows.
    The test cannot answer them: it sees what a family reads, not what it draws.
- **From the survey of other dashboards** (2026-11-17, same document), in the order
  recommended; each is for every family:
  - The next calendar event.
  - A light's colour and colour temperature.
  - The family, and Aurora's skin, readable and settable by Home Assistant (a sensor and
    a service, as Seasonal Glass has), so an automation can choose them.
  - Birthdays from a calendar as an Almanac day.
  - Low batteries and pending updates, if Sensor Watch does not already cover them.
  - Not wanted for now: per-user visibility, a screensaver, favourites.
- **Bakelite, what's left** (every kind of device, Sensor Watch's alerts, the cameras'
  sightings and a chart recorder are built, to 2026.11.8-b30). The owner tried it on an iPad on 2026-11-14: the cranked
  knobs, the thumbwheels' size and the motion were all right. Not yet on a wall tablet.
  Small things known: an alarm's thumbwheels turn by a press
  on their top or bottom half, not by a drag; an alarm with a code in words is left off;
  the chart is of the day up to when it was opened and does not run on; a thermostat's
  modes (heat, cool, auto) and a player's source are not on the panel; the Gazette's
  columns (forecast, Personal, Amusements) have no place on it.
  - **The knife switches go** (owner, 2026-11-20: "I dislike the knife switches on
    Bakelite"). A scene, button or script gets a 1950s push button about the size of a
    thumb, or something like it, instead (`_lenses` in `console/panel.ts` gives them the
    knife switch). Agree the look with a mock-up first. The guide's Bakelite section and
    its screenshot (`dash-bored-bakelite.webp`) describe and show knife switches, so they
    change with it. Its height may differ from the knife switch's, so check `tall` and
    `console/balance.ts`.
- **The Console's and the Fridge's open space, what's left** (owner, 2026-11-16; the survey's
  cuts, the rows from `pack.ts`, the selector switch and the Fridge's layout are built, in
  2026.11.9-b9). Agreed with the owner that day and not built:
  - Rooms with one or two controls sharing one chassis, a small plate over each: they
    stand one under another now (b9), but each still has its own lamp, plate and Chart
    button, about 120 px. Not measured.
  - The bar between two floors in a row is brass in Bakelite and a plain line in the
    other four eras: theirs are to be decided with the owner (offered: a machined groove
    for Silverface, Bargraph's orange line, a moulded seam for Beige; none for Nixie yet).
  - Switches by what they are, not one dolly for all: gang plates (several of a sort on
    one long plate at a tighter pitch), power feeds as a row of breakers, pumps and fans
    as a start and stop pair. Each new control is drawn in five eras, so few of them.
  - The back pocket: a chassis's spare cells filled from the room's sensors that the
    panel doesn't show, the ones Sensor Watch watches first; a binary sensor as the kit's
    `jewel`, a reading as a small meter, on the blanking plates that b9 fits. Never
    grows a chassis, and is chosen from the survey so that nothing moves with a state.
  - Not seen on the owner's house or on a tablet: only on a harness with an invented
    house (Chromium and WebKit). The Fridge's sizes in `fridge/rows.ts` are estimates.
- **Casa Mia's data on every family, what's left** (owner, 2026-11-16; the cameras are
  built for the Console and the Gazette in 2026.11.9-b11, see HANDOVER).
  - **Cameras:** the Fridge and Aurora show a Casa Mia camera under its title but not
    its presets, zoom or controls (Aurora opens Home Assistant's dialog for a camera;
    it would need its sheet). The Console's one-entity card shows the screen alone. Not
    yet seen with a real PTZ camera or on the test VM.
  - **Guest Login, a visitor's pass** (design agreed in outline, not built): a
    house-level item with a guarded key switch for an endpoint's Access switch, a lamp,
    a count of sign-ins, and the code from `casa_mia_guest_login/qr` (any user's, given
    only while the endpoint is open). The Gazette prints it as a coupon in the
    classifieds, the Fridge pins the guest card under a magnet, Aurora has a tile. On
    the Console the code is never on the panel: while access is open a printed card
    stands in a slot (a card holder on Bakelite, a punched card on Nixie, a printout on
    Silverface and Bargraph), and Beige shows it on its LCD, since the QR code dates
    from 1994. To settle with the owner: whether every user of the page may open guest
    access from it.
  - **Sensor Watch's bands and watched sensors:** the bands drawn on the meters, and the
    watched sensors chosen first for the back pocket below. It needs to know what is
    watched, with bands: Sensor Watch's feed of every level is admins only, and its
    one-entity feed is any user's. Check first whether its event already says enough.
  - **FONA's calls and texts** (a Telegrams column, say): they are entities already,
    so no new feed is needed.
- **Aurora, what's left** (built 2026.11.9-b9; seen on a harness and on the test VM's
  page, see HANDOVER).
  - **The home screen is thin on a big screen** (owner, 2026-11-16: "leave it for now;
    we'll find stuff to put on there"). On a Mac's window the Sensor Watch tile is
    mostly empty and one floor's tile is twice the others' height. The answer is more
    to show, to be chosen by the owner, not more stretching.
  - **To measure on the owner's iPad before more is built on it:** a finger's swipe
    between screens (nothing but a script has moved them yet); whether a swipe from the
    left edge opens Home Assistant's sidebar or goes back instead; and how the sideways
    box scrolls with a big house, since the stutter rule in HANDOVER came from a box
    that scrolled. The sky's four moving gradients and the sheet's blur are the other
    things to measure on a wall tablet.
  - A big set's screens are plain: when every room must be one cell to save a screen,
    the tiles grow into columns of much the same shape. A phone's bar runs off its
    right edge and is scrolled to reach the search.
  - Not looked at since the screens: the card (its height is in proportion to its
    width) and the card picker's specimen. The guide's picture is still the mock-up's.
  - Not on it: a device's history, a light's colour, a cover's tilt, a fan's
    direction, the Gazette's columns, people, the weather. The choices from a list
    (`choices.ts`, 2026.11.9-b12) are on Aurora's sheet only: the other families could
    show them. The ring is the
    first thermostat in the order of rooms: the owner to say if it should be chosen
    another way. A thermostat that takes a range and not one target is a key that
    switches it off or on, as on the Fridge. A press anywhere on a fader sets its
    level. Guarded presses are now written three times (the Fridge, Aurora, and the
    Gazette's own): one in `family.ts` would do, as a refactor commit of its own.
- **Aurora, the owner's review** (2026-11-16, after seeing it on the test VM; not yet
  designed or agreed in detail). It is the family closest to the dashboards other people
  publish, so look at those for ideas.
  - **More bento, and screens with a bar and edge tabs:** built the same day (HANDOVER).
    How the house is split into sets of rooms is still only by floor: the owner means
    there to be another way, which he has not yet specified.
  - **Its skins are varieties of colour**, after HA Dial's themes: built 2026.11.9-b12
    (`aurora/skins.ts`: Aurora, Ember, Verdant, Cobalt, Rose, Acid, Alloy). Their hues
    are my reading of HA Dial's colours on a light page, not yet seen by the owner, nor
    in Home Assistant's dark theme. The season and holiday skins and the Almanac were
    built in the same build (HANDOVER); the owner has not yet seen them. Fireworks is
    the weakest on a light page: a burst over a tile can look like something loading.
    Ideas not built: Diwali, Hanukkah, Bonfire Night's guy, a birthday from a calendar.
  - **Mode and style open to automation, for every family** (the family, and a family's
    own choice: paper, era, household, theme). Today each is in the browser's storage,
    where nothing in Home Assistant can reach it. Aurora may be the first to have it.
- **The choice of family, further**: an address for each family, so that a tablet can be
  fixed to one from its kiosk settings (offered 2026-11-14, not asked for). A scene made
  without a unique id (in YAML, or by `scene.create`) is in no registry, so no family
  shows it.
- **The Console's other eras** (owner, 2026-11-14). The Console is the family and its
  eras are Bakelite (1950s), Nixie (1960s, built 2026.11.9-b3), Silverface (1970s),
  Bargraph (1980s, built 2026.11.9-b2) and Beige (1990s, built 2026.11.9-b4): all built. They are the same panel underneath (`console/panel.ts`), each with
  its own kit and stylesheet and a few controls or lights that mark its time: from valves
  to LEDs, and from a phosphor oscilloscope or television to a digital panel. They are
  to be designed with care, and each design agreed with the owner before it is drawn.
  The era switch is in (2026.11.8-b32) and shows the unbuilt ones as not built yet; it
  is drawn one way for every era, not in each era's own style.
  - **Bargraph, what's left** (built 2026.11.9-b2). Not yet seen by the owner, nor on a
    real Home Assistant or a tablet, and the guide has no screenshot of it. The era
    switch is not drawn in its style. A press on a fader that does not move it switches
    its device, as a knob's does: the owner has not said whether a fader should.
  - **Nixie, what's left** (built 2026.11.9-b3). Not yet seen by the owner, nor on a
    tablet, and the guide has no screenshot of it. The two meters at the top of the
    panel are needle meters and only the rooms' are nixie tubes: my choice, from the
    owner's "meters do span decades", which he has not seen. The order the figures are
    stacked in a tube is from memory of a common tube, not checked against a datasheet.
    A minus has a tube of its own, which a real one had not.
  - **Beige, what's left** (built 2026.11.9-b4). Not yet seen by the owner, nor on a
    tablet, and the guide has no screenshot of it. Every dial has an LCD of its level in
    per cent, as the mock-up had; the rocker is lettered I and O whatever it works, so a
    lock's does not say Locked.
  - **The three later eras' mock-ups** (2026-11-15: `docs/design/dash-bored/`
    `nixie.html`, `bargraph.html` and `beige.html`, on `eras.js`), not yet agreed. The
    owner's rulings that day: Bargraph has sliders ("it's important"); and needle meters span the decades, with a
    thinner and more delicate pointer in the later ones. Each mock-up shows a needle
    meter and a display one, with a switch between them for the rooms. The owner chose
    (2026-11-15): Nixie's meters are nixie tubes, with all ten figures to be seen in each
    tube, the lit one a little obscured by those in front, as in a real one; Bargraph's
    are needles ("so classy"), with a fluorescent display put in now and then (every
    third room in the mock-up); Beige's are LCDs, unlit segments showing.
  - **Silverface is built** (2026.11.8-b33) to the design agreed on 2026-11-14, the
    1960s being skipped for now. Seen on the test VM only, and not by the owner yet. A
    thumbwheel's figures still sit a little off true, as Bakelite's do, which suits a
    padlock better than a switch. A guarded switch is at rest when its lock is locked or its door, valve or siren is off
    (`_guarded` in `console/panel.ts`). The owner wondered (2026-11-15) whether Sensor Watch
    should say what a device's rest is, for one that is normally open: not built.
  - `family.ts` has `typeface`, which Bakelite's handwriting uses. The Gazette's masthead
    still loads its font with its own copy of that code (`masthead` in `gazette/page.ts`):
    move it onto `typeface`, as a refactor commit of its own.
  - **A needle's wobble falls with the decade** (owner, 2026-11-15): all of it in the
    1950s, three quarters in the 1960s, half in the 1970s, a quarter in the 1980s and none
    in the 1990s. Bakelite and Silverface do this; the other three are to when built.
  - The sizes `console/balance.ts` counts on are Bakelite's; an era with other sizes
    needs its own.
- **The agent's column, what's left.** Since 2026.11.9-b14 a model writes it
  (`docs/design/dash-bored-column.md`). Still to do:
  - Try it on the test VM with ZenOS's local model, and tune the brief from what it writes.
  - Only the Gazette draws it: the Fridge's notepad and a Console ticker could follow the
    same feed.
  - An urgent Kata is not yet a story or breaking news.
  - A wall tablet shows whatever the model wrote, alarm and lock states included: decide
    whether that needs a choice of which parts may print.
  - If ZenOS ships a reporter that writes the column to a drawer, read it and drop our
    own model call (owner, 2026-11-15: "we stay read only, but ZenOS can write if he
    wants").
- **ZenOS-AI 11.1, post the report** (promised 2026-11-15). Installed from scratch on
  the test VM on 2026-11-16 from Beta 1 (`feat/2026.11.1`, 318c6f4; not yet released).
  It reached summaries and component Katas, but only through two console workarounds and
  four restarts. The owner posts the report to its author: the draft is
  `~/Documents/zenos-2026.11.1-report-draft.md`, the full notes
  `~/Documents/zenos-2026.11.1-install-notes.md` (both outside the repo).
- **The Fridge, what's left** (built 2026.11.8-b37, in three households; not yet seen
  by the owner, nor on a tablet). A sighting's photograph, a sounding alarm and a
  critical note have not been seen, since the test VM makes none. A room's drawn picture
  is the same window and lamp for every room. A thermostat's modes and a player's source
  are not on the door, nor is a device's history. The novelty magnets are twelve; more
  would suit (the owner: "other animals, objects etc").
- **Digs, the fifth family, what's left** (built 2026.11.9-b16 from the mock-up the owner
  liked on 2026-11-18; how it is built is in HANDOVER). He has not seen the build, and it
  has been seen only on a harness: not in Home Assistant, on the test VM or on a tablet.
  - **Owed from the capability table** (`OWED` in `tests/test_dash_bored_parity.py`): a
    what a camera last saw (it has the latest picture); Casa Mia's presets, zoom and controls; a
    device's choices (a thermostat's modes, a player's source); the appliances drawing
    power; what the house is missing by name (the board only counts); the comings and goings, what the players played,
    the ratings and the agent's column (a book on a lectern was one thought for the
    column); a device's history; finding a device by typing; an alarm's code on the page.
  - **A user's own sprites** (owner, 2026-11-18): a person's figure can be a picture the
    household supplies, so that someone can put a game's own character in at home. We
    ship only our own drawings; what a user adds stays in their own Home Assistant and
    never comes into the repo or the mirror. Where the pictures live and how a person is
    given one are not designed.
  - **Buildings as a setting** (2026-11-18): which floors, or areas, make up an
    outbuilding, in the Configure dialog beside the order of floors and rooms. Today an
    outbuilding is told by its area's name and only when it is on no floor, so one with
    a loft cannot be two storeys. It waits for the owner's areas to have floors. If
    Topology is built (the section above), Digs reads its buildings from there and this
    setting is not needed.
  - **The owner's house is not yet sorted into floors** (2026-11-18). Digs draws such a
    house as one wrapped building until it is. Sorting it helps every family; setting
    floors from the page was discussed for the Gazette and needs his say, as it writes
    to the registries.
  - The hearts run out on a big house: ten, and one lost for each device not answering.
    The tip still counts them all.
  - Open from the mock-up: a larger font, and a block of its own for each kind of
    appliance (a player, a fan, a vacuum and the rest are all the machine).
  - Later texture packs are named the same way as 4² (2³ at half the detail): proposed,
    not agreed.
  - Many cameras in one area (2026-11-18): each is a picture three blocks wide, so an
    area with a dozen is 36 blocks of pictures. Nothing gathers them as the chandelier
    gathers lights; decide with the owner once it is seen on his house.
  - **Options for what moves by itself** (owner, 2026-11-20): the people walking about
    the house, the view following one of them (or the imp) when nobody is touching it,
    how long after the last touch it starts again (2 minutes at first), and the imp's
    prank (which can't be turned off since 2026.11.9-b18). A card option for each, and a
    choice on the page. The walking and the following were built in 2026.11.10-b1.
  - **A light's colour could tint its glow** (2026-11-20), if `house.ts` carries it. The
    lamp shapes by name were built in 2026.11.10-b5; a setting per light if the names
    guess wrong too often.
  - **Topology will tell Digs much more** (owner, 2026-11-20): once a house's Topology is
    filled in, Digs can take the house's shape from it: which rooms lead to which, where
    the stairs and the doors out are, and which way each faces. That replaces what Digs
    guesses today from the order of rooms and their names, including the ways the
    household walks (`digs/walk.ts` finds them from the blocks).
  - Known and left: a device in no room has no block (the board counts them); the clock
    and the hearts lie over the top storey's roof on a house of three storeys; the sun is up from six to six all year (Home Assistant's sun
    entity has the real hours); out of doors is told by an area's name in English; a
    lit lamp behind a ladder hides part of it.

**The Gazette, parked** (owner, 2026-11-14):

- **The house's settings, further** (2026-11-14): the Configure dialog now holds the order
  of floors and rooms (2026.11.8-b19). Parked by the owner the same day ("Not yet"): the
  Gazette's masthead names there, one for each paper, which is a family's setting and
  not the house's; then the strap line and the tone.
- **Photographs, further** (2026-11-13, not asked for yet): Protect's snapshot at the
  event's own timestamp, if its thumbnails prove poor; an entity for a camera added after set-up
  without a reload; detections named in other languages.
- **What the house is missing, further** (discussed 2026-11-13, not asked for yet): the
  report as a page of its own; fixing from the page (setting an area or the label in
  bulk), which needs the owner's say as it writes to the registries; the ESPHome
  generator setting `entity_category` on status LEDs, relays and screensaver switches.
- **Configurable wording** (asked 2026-11-13, "future"): the jokes and sentences. The
  voices are data so this needs a place to keep the owner's text and a page to edit it.
  Other languages go the same way.
**After the families:**

- **The showpieces** (owner, 2026-11-13: "we're not leaving it behind"): Contraption, and
  Movement, which ran at 60 fps on the owner's iPad.
  - **Contraption's second mock-up** (2026-11-16; the owner wants it "absolutely crazy",
    mocked up before it is built): `docs/design/dash-bored/contraption.html` with
    `contraption/`. It has a mechanism for each of the fifteen kinds, and its header
    comments say how a cell is driven (`contraption/machine.js`). What it settles for the
    build: the lever shows what was asked and the mechanism shows the state; a linkage
    is theatre between the two and nothing ever waits for it or for the bot; the line
    shaft turns only while data is fresh. Not yet seen on a tablet: the wobble filter is
    the likely cost (`?plain` draws without it, to compare).
  - **Contraption by water, a trial of one room** (2026-11-17): `waterworks.html` with
    `waterworks/`. The owner found the second mock-up "not quite right": a grid of
    same-sized gadgets with tricks that were too short. What the owner decided, and the
    trial shows for the Kitchen:
    - A room is one machine, with set pieces of different sizes and long chains.
    - It is driven by water: a petal valve lets water into a device's machine, and water
      runs for as long as the device is on. Steam stays in the engine house only.
    - It is primarily for a laugh. A quick route is allowed, but fun and quirkiness are
      not to be traded for usability, "otherwise the overall joke gets lost".
    - Always something moving, movement when the house changes, and something silly now
      and then.
    - Skins from one drawing: parts are named by material, never by how they are drawn.
      Patent engraving, blueprint and tin toy so far.
    - The wobble filter must never be live. WebKit runs it again on every frame in which
      anything moves (4.5 frames a second, measured), so the still parts are baked
      through it into bitmaps once (`waterworks/bake.js`). Measure in WebKit, not only
      Chromium: Chromium hid this.
    - Still to do: laying a room out by rule from tiles of several sizes that each
      declare a way in, a way out and a behaviour. The Kitchen is placed by hand. The
      navigation page became the whole house, below.
  - **Contraption, the whole house on one sheet** (2026-11-17): `whole-house.html` with
    `whole-house/`. The owner's idea: draw the house and grounds on one page fitted to
    the screen, where a tap on an area zooms in as you watch and more detail opens up.
    It replaces a separate navigation page. What the trial settles:
    - One river, laid out by rule (`whole-house/plan.js`). Rooms go in rows in the
      house's order, each 60 lower than the one before, so one trough falls 1 in 20
      through a whole row at the height every room's machines expect. A chute under the
      row brings the water back to the next row, the last one empties into the pond,
      and the lift raises it to the tank. Rooms out of doors come last.
    - Two distances, one drawing. The view is the SVG's viewBox. Far off, a room is a
      glyph for each device, switched by a class when the device changes, with CSS doing
      the moving. Close up, a room drawn in full fades in over its glyphs, and it is the
      only room worked frame by frame.
    - A tap sends the duck round the water to the room and the view follows it; a second
      tap gets there at once. The show comes first, as the owner asked.
    - A room with a device out of order flies a flag that can be read from far off, with
      what and since when. Stale data dries the whole river.
    - The patent skin bakes like map tiles: the whole house once, and the room in view
      on arrival, dropped on leaving. The house's bitmap is stretched during the zoom.
    - Measured in headless WebKit on the Mac, 2026-11-17: 61 frames a second far off, 56
      to 62 during the zoom and 58 to 61 in the Kitchen, in all three skins. Not yet
      seen on the iPad or in Safari itself.
    - Still to do: the other five rooms in full, which is the tiles work above; a
      place for scenes and guarded devices; a phone held sideways leaves the sheet about
      300 px wide under the header; a house too big for one far view may need a third
      distance.
  - **Contraption, by duck** (2026-11-18): the design the owner settled on, and it
    supersedes the two trials above. It is in `duck-run.html` with `duck-run/` (the
    Kitchen, a Long Gallery of eight lights laid out by rule, and a Big House of 300
    tiles) and `sprite-trial.html` (drawn by placing bitmaps: 5,000 tiles at 26 frames a
    second on the owner's iPad). What is decided, what was measured, what was dropped
    and what is left are in `docs/design/dash-bored-contraption.md`, which is the brief
    for building it.
    - **Contraption, the sixth family, what's left** (first build 2026.11.9-b18: the
      renderer, the tiles there were, a stand-in tile, and one room read from Home
      Assistant). From the brief's "What is left to do": left-to-right tiles for the
      other kinds of device, more plain bends and a better drawing for the
      redirector and the collector, setting a level, a crew of bots, one stream
      through the house, and a place for scenes and guarded devices.
    - **Asked by the owner on 2026-11-18 after seeing 2026.11.9-b19 on the test VM.** Built
      in 2026.11.9-b20: the network of loops, merge in turn, the roundabout, the dumb
      waiter in the centre, the layers underground and the toaster's hose. Machinery on
      the y-axis was built in 2026.11.9-b22 (the two upright light drives are to be
      looked at). Lanes with
      anything on them, holes that feed another's, the poop, the compost bin and the
      tongs were built in b22 too. **Left of them:** a hole feeds another only within
      its own band; and most of the shows have not been watched (the brief lists
      which). All of it
      as he asked for it:
      - *A network of loops, engineered to be clean.* The main stream is a loop again,
        closed by a dumb waiter up the side ("I like the normal return line on the
        dumb-waiter"), and the two end holes go. Holes stay beside redirectors and
        collectors, joined underground by "dim dashed" tunnels "with dashed ducks too",
        made of horizontal, vertical and 45 degree runs. A tunnel is real track: one duck
        a period, on the beat. A collector's hole may feed any redirector's, so the
        tunnels cross. The test to write: ducks in equal ducks out at every hole.
      - *Merge in turn.* The spares "are always colliding at the entry and stuttering at
        the exits". They are to walk a drawn path from the hole to the tile's entry and
        pass the arrow one after another. The collector is to be "a little roundabout
        affair" that carries up to three ducks round: one steps off at the exit, the
        rest drop into the hole. The redirector's arrow stays as it is.
      - *Lanes with anything on them:* "no need to limit the branches to single items".
        Lanes still have to meet at the collector, so a shorter one is made up with
        carriers.
      - *Machinery on the y-axis:* device tiles that go top to bottom or bottom to top,
        drawn anew, since gravity points down (a falling duck turns a paddle wheel; a
        climbing one works a ladder treadmill). This overturns "device tiles go left to
        right only" in the brief. A crate first, then two light drives with a train of
        their own. Lights switched together stay horizontal.
      - *Lazy tongs on a gantry along the top,* which "whips along and plucks occasional
        ducks from their collector" and takes them to an entry hole. With real tunnel
        ducks it must deliver to that tunnel's far hole when the gap arrives, or a
        redirector is a spare short.
      - *A poop for the bot to clean* ("the bot needs a shovel and a nose peg"): left by
        a duck where it stands, hopped over by the ducks behind, one at a time and only
        in view. Open: into a bucket, or down the nearest hole.
      - *The bot may chuck it down a tunnel* (owner, later the same day), "but would then
        have to collect it at the other end", and "ultimately it needs to dispose of it
        somewhere, a compostor or something". Proposed: a compost bin at the foot of the
        bot's pole, which needs no layout work.
      - *Several layers underground* (owner: "so you don't have to have complex network
        layout algorithms and clash detection"). Tunnels cross freely, each on a layer.
      - *The toaster:* "the duck ought to come out sweating and then get a quick cooldown
        from a hose spurt nearby". One tile's drawing, no change to the engine.
      - *Machines for the other kinds of device* (owner, 2026-11-18, asked whether more
        is planned "for other domains, e.g. say we have a sauna heater and thermostat
        control", and wanted it on this list; nothing is scheduled). Everything but a
        light is a crate today. A kind keeps the lights' rules: the duck is the engine,
        on is the clutch being in, a level is how long the duck works. Proposed for a
        heater with a thermostat, as one tile: heating, the duck works a bellows on a
        stove; at temperature, it ladles water on the stones and walks out sweating;
        off, a cold stove; a thermometer on the wall with the mercury at the room's
        temperature and a marker at the target. Open: how any level is set (one design
        for every kind), what a press on a heater does (proposed: Home Assistant's own
        dialog, not a switch), and telling a sauna from a room thermostat (proposed: by
        its name, as a light's fitting is).
      - *Follow a duck or the bot* (owner, 2026-11-18): "selecting a duck or the bot and
        then if we're zoomed, the selected sprite stays kind of centred, not exactly,
        but enough so that the picture pans around the view following the path of the
        selected thing". Not built. It is no more than that (owner, the same day:
        "Don't confuse this with anything else, it's literally piggy-backed off
        whatever safari does for scrolling a view larger than the viewport"): when the
        sheet is drawn bigger than the screen it already scrolls, and following is
        moving that scroll so the chosen sprite stays near the middle. No view or zoom
        of Contraption's own.
      - *Asked after seeing b20's first tunnels, and built in b20* (the brief has how):
        "Could tunnels be a tube rather than just a single dotted line? And we ought to
        try to keep them away from each other. And we could also have a pointless tunnel
        system to fill blank spaces, driven from the top exit of the dumb waiter?"; "The
        duck doesn't travel at the same speed as the dumb waiter, either it must or the
        waiter goes in favour of stairs or escalator"; "The water shower should just run
        its water downwards, not track the duck, and it can be a tipping bucket"; and
        "no problem with the underground tunnels having Y-junctions, T-junctions or
        anything else". **Left of these:** the ways of the long way round fork and do
        not join again before the foot; joining needs lengths exact to the tile. To
        look at on the owner's screen: the hop at a shaft arrow, and the tubes' cost on
        the iPad.
      - *Ready for Topology* (`docs/design/topology.md`): a room's layout is a block the
        machine places, the loop's closure is one replaceable piece, and no setting of
        Contraption's own says which rooms adjoin. East and west would be the sheet's
        sides, up and down the lift and the slide, north and south the tunnels.
      - *The dumb waiter in the centre* (owner, later still: "no reason why the dumb
        waiter has to be at the left edge, it could be in the centre and feed both left
        and right with a director"). Proposed in answer: a central shaft with a
        redirector at each band sending one duck left, one right and one on up; each
        wing runs outwards and ends at a hole whose tunnel feeds that redirector. This
        replaces the left-edge return in the plan, and needs no even number of bands.
    - Owed to the capability table (`tests/test_dash_bored_parity.py` `OWED`): everything
      but a room's devices. People, the weather and forecast, scenes, power, appliances,
      what the house is missing, Sensor Watch's alerts, the cameras' pictures and
      sightings, Casa Mia's camera controls, a device's choices, what is playing, the
      ratings and the agent's column.
    - Not seen yet: the owner's kitchen, the iPad, inside Home Assistant, the test VM,
      the card picker, the bot pulling a sheet off, the engraving's grain (left out for
      a tablet's sake).
- **Publish it by itself** once it is past In development, as Sensor Watch is.

## Sensor Watch (beta)

Beta since 2026.10.11. Its guide (`docs/applets/sensor-watch.md`) says what it does. What's next:

- **Snooze, what's left** (built in 2026.11.12-b2; its rules are in HANDOVER).
  - A snooze whose time came while Home Assistant was down ends, but the fault is then
    found at the start like any other: the sidebar's notification, not the phone.
  - The eye in an entity's dialog and the gauge card don't say a watch is snoozed.
  - **Heads Up** (github.com/Seyphaton/ha-heads-up; the owner offered Sensor Watch as its
    source of events on its forum topic, 2026-11-19): a second blueprint could send each
    event to `heads_up.notify` with the entity as its `id`, clear it on nominal and on
    withdrawn, turn its own snooze off, and give it a button that calls
    `casa_mia_sensor_watch.snooze`. Why its own snooze off: it hides the message while
    Status here stays at the fault's level.
- **Rolled up only when Home Assistant says the integration failed** (2026-11-22). One
  that stays loaded with all its entities unavailable still has a row each. Left until it
  is seen to happen. See Availability rules and Dependencies below.
- **Stale, what's left** (built in 2026.11.5-b1: no report or no change for a time, per watch or profile; not yet seen working on a box). The library's profiles carry none: add sensible ones where a device reports on a schedule (battery sensors), and perhaps a scan default by device class. Escalation's "nominal for too long" (asked 2026-10-11) is not built. **The limit:** a Core restart re-stamps every restored entity, so a sensor that died before one is caught a full wait later; remembering each entity's last report across restarts would close it.

- **The gauge card, what's left** (built in 2026.11.5-b1 as `custom:casa-mia-sensor-watch-gauge`, drawing its own arc). Seen only injected into a page on the test VM: look at it on a real dashboard, in the card picker and its editor, in a dark theme and on a wall tablet. The eye and `tools/dev_cards` with Sensor Watch's bundle were changed in the same build and not looked at either.
  - **More options, to match the better gauges around** (asked 2026-11-11): a gradient across the bands as well as steps; a horseshoe (an arc of about 270°) as well as the half circle; where the value, the name and the level go (above, inside the arc, below, or hidden); and which Sensor Watch data shows (the level pill, its message, the stale or not-current notice) and which doesn't. Look at what Home Assistant's own gauge and the popular custom gauges offer first, take what is worth having, and give each option a field in the editor (`gauge-editor.ts`). Needs a design pass before building.

- **Tidying left by the move into Home Assistant** (2026.11.3-b1; refactors, each its own commit). `LEVELS`, `displayed` and `UNAVAILABLE_HOLD` are defined in both `records/common.py` and `levels.py` (a test holds them together): one definition now that both are in the integration. `Store._sent`'s `with_legacy()` served integrations older than the push, which can't exist any more. Some `records/` docstrings still say "the integration" for what is now the same process. The page's one websocket command carries method and path as the app's routes did; a command per route would let HA validate each.

- **A backup-health sensor, so Sensor Watch can whinge when backups stop** (asked 2026-10-22). A Mac's Time Machine destinations say nowhere in HA when each last completed. A sensor per destination with the age of its last backup, and a profile (warn after a day, error after a few). The reading must be pushed in (a launchd job running `tmutil latestbackup -d <destination>` after each backup, posting to HA by webhook or MQTT), with the sensor unavailable, not fine, when no report arrives. Catch an unmounted destination (`tmutil` reports it as an error). The same pattern covers a NAS's backup jobs and the secrets copy.
- **NAS drive health in Home Assistant** (asked 2026-10-22). Each NAS's drive status, SMART health, temperature and volume state as HA sensors, with profiles that go critical at once on a degraded volume or failing drive. Existing solutions first: HA's Synology DSM integration; SNMP for a NAS without one. Open: whether either needs a low-privilege read-only user, and where its credentials live (a secret, never in the repo).

- **Accuracy** (built in 2026.10.11-b14; not yet seen on the box). The 12 V battery profiles have none: ±1 % (0.12 V) is tight against their 0.2 V bands, so decide.
- **The group dialog, what's left** (built in 2026.10.11-b17). New profile… starts blank: start it with the members' unit and history.
- **Screenshots to retake:** `sensor-watch-editor.webp` (the Over time block and Stop watching in its footer, 2026.11.5-b1; it needs a box with a month of hourly statistics). The page, group, set-up and gauge shots (2026.11.5-b1) are of the test VM's invented house, from a headless browser. So is the guide's first picture, `sensor-watch-card.webp` (retaken 2026-11-12: the card and four gauges on the VM's House dashboard, its **Sensor Watch** view, which is kept there for the next retake).
- **Take out what was kept for the move to its own integration** (2026.11.3-b2). Once a release or two has gone by: the old action names `casa_mia.sensor_watch_list` and `casa_mia.sensor_watch_refresh` (`casa_mia/sensor_watch.py` `old_services`, which warn in the log at each start they are used), then `casa_mia/device_trigger.py` (the forwarder for triggers saved under Casa Mia's domain; an automation still using one stops firing, so say so in that release's breaking lines), then the handover itself and the app's `GET /sensor-watch/export`. Each is a breaking change for whoever still relies on it.
- **Notify on Sensor Watch didn't notify on the box, and its screenshot** (2026-10-11; the guide has a phone's shot, `sensor-watch-notifications.webp`). Probably the hold-off timer bug fixed in 2026.10.11-b8; check on the box first. Otherwise, with evidence: does `casa_mia_sensor_watch` fire (Developer tools → Events), does the automation trigger (traces), do its conditions pass (an empty group select may not arrive as `""`). Then take `sensor-watch-notifications.webp`: Warning, Task and Critical in the sidebar's notifications, and a phone's if one is to hand.

- **The card draws your own cards: an exemplar per kind of row** (asked 2026-10-11). The card's config holds an exemplar card (e.g. a `tile`), copied per row with its entity put in, as auto-entities does; one per level, falling back to one for all, then to today's rows; laid out in a grid. Strings in the exemplar are **real Jinja** (decided 2026-10-11, not look-alike placeholders), rendered by HA with the row's `entity_id`, `name`, `level`, `previous`, `value`, `message`, `group` and `area` as variables (`render_template` with `variables`, live). Strings without `{{`/`{%` cost nothing. Copies made with HA's `createCardElement` and kept as the list changes.
- **The panel card, what's left** (built in b19): a sort or compact option, and choosing the group from a list rather than typing it (the integration would publish the groups).

- **Car tyre pressures in the library** (asked 2026-10-27).
  - **A profile relative to the placard** (cars run about 2.2–3.0 bar): a task about 10 % low, a warning about 20 %, an error 25 % (FMVSS 138's TPMS threshold), a warning well over; escalate task → warning after a few days (a slow puncture); a long hold-off and a generous unavailable (a parked car sleeps; cold mornings read low). Bands are absolute today, so placard variants, a duplicate-and-set note, or (better) a profile parameter.
  - **The car's own TPMS warning**, where an integration exposes one: an on/off profile beats our bands.
  - **Units:** HA shows pressure in the user's unit. Decide whether profiles carry a unit and convert, or come in bar and psi versions; the same for °C and °F.

- **The set-up, what's left** (built in 2026.11.5-b1 from **Set up…**). It doesn't open by itself on an empty Sensor Watch: the empty page offers it as its first button. Whether a mains sensor reads like the mains is judged from one reading, at that moment (`records/setup.py` `_like`).
  - **Explaining itself** (owner, 2026-10-27, unable to recall after a fortnight what groups, profiles and "Members follow" are for): the page says what each part is for where it's used, not only in the guide.

- **No watching itself: the indirect loop** (asked 2026-10-11; the direct case is refused since b19). A template helper reading Sensor Watch's entities, then watched; or an automation on its event changing a watched entity. Each change of level can feed the next, and an inverted mapping oscillates for ever. Ideas: warn in the watch dialog when a template helper mentions `casa_mia_sensor_watch`; a circuit breaker in the integration (more than N level changes in M minutes holds the worst level, logged, message "flapping"); a line in the guide's "What it won't do".
- **Escalation, what's left** (built in 2026.10.11-b15; not yet seen on the box).
  - **Review the algorithm** (owner, 2026-10-27: "OK for now"): after living with it, check whether time at each level is right, or whether escalating by count or by how far out earns a place.
  - **Acknowledging:** decided against (2026-11-22). Snooze, above, has an end.
  - **The Escalation handler blueprint and the remedy tools** (`docs/never-silently-stuck.md`), on the events it sends.
- **Custom actions per sensor** (asked 2026-11-27; needs design before any building). A
  mechanism that lets a watched sensor offer actions of the user's own. The use cases:
  the internet speed is reported as low, so its row gives a button to run the check
  again; the gates have been open for too long, so its row gives a close action. The
  actions **must be defined by the user**, per sensor or per group, because Sensor Watch
  can't know what they will want to do. How they are defined needs designing too. To
  settle in the design: where an action is set (a watch, a group, a profile) and which
  wins; whether it is offered at every level or only at some; where its button shows
  (the page, the card, the gauge, a notification); and how it sits with the remedy tools
  under Escalation above and the snooze button for Heads Up.
- **Watch a template** (asked 2026-10-11): some faults show only between sensors (a downstream meter's voltage differing from the upstream one). A **+ From a template** choice in the Watch dialog creates an HA template helper (through "Entities Casa Mia makes") and opens the bands editor on it. A real entity, so it has history.
- **Dependencies** (asked 2026-10-11): a record names an upstream sensor and counts only while that one is nominal, so a supply drop raises one alert, not one per meter. Think through chains, what the summary shows for a suppressed sensor, and loops. The owner's ESPHome generator knows each meter's upstream link and could produce the difference sensors and dependencies; Sensor Watch takes them as they come.
- **Groups, what's left** (built in b15–b21): members suggested from history (a new member waits for a few days of it, shown as pending), availability-only groups (design with Availability rules), and watching an attribute (one entity can since 2026.10.8-b23; groups watch states only).
- **Band profiles, what's left** (built in b11–b13): device-class defaults as built-in profiles.
- **Availability rules, what's left** (the simple half built in 2026.10.8-b24, an Available mode with groups). Count per device, not per entity (a bulb's entities drop together); one row per rule, levelled by how many ("Hue lights: 2 of 38 unavailable"; all at once is usually the integration, which HA's own health already reports); a long hold-off and a level that grows with time (bulbs switched off at the wall); Ignore per device and a label every rule respects. Close to Stale sensors: perhaps one feature.
- **The list service by more than group** (asked 2026-10-11): let `list` take a label, area, integration or device, so a panel asks for exactly what it shows.
- **Richer matching, what's left** (floor, maker, model and category built in 2026.10.8-b23; after auto-entities' filter language: borrow the ideas, not the code). Attributes (`unit_of_measurement: V`), state compared (`"> 100"`), last changed ago, hidden by, name/entity_id wildcards and regex, combined with not/or/and. Keep the app's `matches()` and the page's `searched()` agreeing (a test).
- **Notify blueprint, what's left** (built in 2026.10.8-b25): the notify entities of HA's `notify.send_message`, once the mobile app has them.
- **Worked example for the guide:** "a warning panel of every Shelly plug with low voltage, and a notification when it's critical", done natively (labels, a `label_entities` template with a namespace loop and the `this` trick, a template per level, `for:` triggers: expert HA) beside Sensor Watch (a scan with a profile, one automation, one panel card, a garnish heading: point and click).
- **Event-driven everywhere, the rest** (asked 2026-10-11; records and levels between app and integration are in "pushed, then owned" above).
  - **HA's own health** (`system.py`) checks every minute: trigger it on config-entry changes, with a timer only for the five minutes an integration must fail for.
  - **The candidates cache** (`history.Reader`, 60 s): drop the time limit and forget it when HA's registries change.
  - **`list` calls open a fresh websocket each time** (`HA.call`): the ones left could use the live feed's connection.
  - **The card asks the whole `list` on each event:** apply the event's row instead, the whole list only now and then.
  - **Keep:** the admin page's long poll; the 30 s `/health` poll as the liveness check only.
- **Feeding Auto Dashboards**, and an opt-in **label** on a watched sensor showing its level (auto-entities can filter by it), at a registry write per change of level.
- **Ranges set by dragging** over the history chart, and HA's labels as a source of ranges.
- **Prove it at size** on the owner's house (thousands of entities): the scan's rounds, the page's filters, the integration's load in a storm.
- **Export to native Home Assistant** (asked 2026-10-11): the honest exit. Write the chosen watches out as plain HA: each profile a Jinja macro in `custom_templates/`, each watched sensor a template sensor giving its level, hold-offs as `for:` / `delay_on`, a summary template over a label, the event as an automation, `list` as a script with `response_variable`. Say plainly what doesn't export: suggestions and scans (templates can't read the recorder), HA's own health, and scale. One-way: Casa Mia never reads the YAML back.

## Wall tablets: Kiosk Satellites, kiosk mode, firmware server

- **Guide: setting up a wall tablet for Kiosk Satellite and Casa Mia** (asked 2026-10-30). End to end, in `docs/`, so someone else can repeat it and the owner can redo one after a reset. From the owner's notes and memory (ask; don't reconstruct from the code), plus `../tablet-provision`: preparing the tablet (Developer options, Wireless debugging and pairing, any density override, keeping it offline), Kiosk Satellite (lockdown, the HA login, updates from the firmware server), what Casa Mia does with it (discovery, login, backups, the Camera Commander), and droidVNC-NG. Say what needs a person at the tablet and what a desk can do; the droidVNC-NG part is `docs/run-the-house-from-your-desk.md` (b5): link it, don't repeat it. Invented names and addresses only (RULE MINUS ONE). Next after b5 (owner, 2026-10-31).
- **A helper app that keeps Wireless debugging on** (talked through 2026-10-30; the owner to decide). A tiny APK of our own holding WRITE_SECURE_SETTINGS (granted once by `adb shell pm grant`; survives reboots) that sets `adb_wifi_enabled 1` at every boot. Neither KS nor droidVNC-NG declares that permission. Proved on the test tablet: the setting alone opened a new port, raised no dialog, and the existing pairing connected (that tablet had ticked "Always allow on this network"; one without may need that tap once). The pairing still guards it. Later, perhaps: it reports its port to Casa Mia, so there's no scan. To decide: its name, where its source lives (another project), how it's built and signed.
- **Remote control, what's left** (built in 2026.10.12-b2 to b5: droidVNC-NG beside KS, the app's VNC login and relay in `modules/kiosks/vnc.py`, noVNC, Full window, 1:1, Android Settings through KS's `launchApp` (works on a real tablet, 2026-10-31), the row's last VNC answer, the guide).
  - **Why this way:** KS declined remote touch twice (built in, #1087; a Plugin SDK touch command, #1217); its author pointed at droidVNC-NG. Our own APK, Shizuku `input tap` and `evalJs` clicks were weighed and dropped.
  - **After a reboot**, until the helper app: the pairing survives but Wireless debugging doesn't, and its port changes. From the desk: Recents (so a swipe reaches the shade, not KS's pull-to-refresh), swipe down from the very top, tap the tile, Allow if asked; then scan ports 30000–49999 (about 2.5 s) and `adb connect`.
  - **Left:** measure the tablet's CPU during a session. With nobody watching, droidVNC-NG costs about 4% of the tablet (0.3 of 8 cores: stopped, `top` fell from 315 to 287 of 800; KS's `cpu.usage` from 45% to 39%; 2026-10-31), as it keeps capturing the screen. KS's `cpu.usage` is a single noisy sample, not `top`'s figure: a sibling it called 18% was 32% by `top`; watch for droidVNC-NG's input service being switched off (only a visit fixes it); DuraSpeed off on the remaining Tab M9s and one tablet's KS System UI guard back on (the owner said not yet, 2026-10-30).
  - **Mind:** VNC encrypts only the password exchange: LAN only, never port-forwarded, away only through Casa Mia over HA's HTTPS. A firmware-server mirror of its APK is possible later.

- **Links out to what we build on** (asked 2026-10-11). The Firmware server page links to Kiosk Satellite's GitHub repository with the ↗ mark. Then every page that leans on someone else's project gets one in the same style (Auto Dashboards' cards, kiosk-mode, the guest login project it took over). One shared link component.

- **Music Assistant's [Home Assistant] button is dead on Kiosk Satellite** (found 2026-10-10: by KS's design). The button only posts `home-assistant/toggle-menu` to open HA's sidebar, and since KS v2026.8.49 a hidden sidebar stays hidden on non-dashboard pages too, so with KS's HA kiosk mode and Hide the sidebar on, any app panel is a dead end. To report to KS's author: let the menu button (or the message) open the sidebar there. Meanwhile: turn off Hide the sidebar, or use KS's own HA Kiosk Mode menu or gesture.

- **Kiosk Satellites follow-ups:**
  - KS's author has made its API and websocket paths relative to the page (the owner, 2026-10-31), and `common.py` already leaves the shim out for versions that need none (`_needs_shim`). Check its cut-off version matches his release, then drop the shim once every tablet is past it.
  - Backups ignore only `exportedAt` when deciding an export changed (`NOISE`). Watch the log's "changed: ..." lists for keys that change without the setup changing, and add them.
  - Update asks the tablet to check its own update source. If its source isn't the firmware server, or Android asks on screen, consider uploading the APK (`/api/update/upload`).
  - Integration entities: a Kiosk Satellites device with counts (found, online, behind), if dashboards want them.
  - How it relates to `tablet-provision` (probably shares the roster).

- **Kiosk mode: an option to turn off its way out** (asked 2026-10-10). kiosk-mode's `?disable_km` switches it off for that page, for anyone at a tablet's browser. A per-dashboard option to remove that escape, if kiosk-mode offers one, else say plainly what it can't stop. (The Over layer's only way out is HA's edit mode, admins only.)
- **Kiosk mode, after v1** (the page shipped in 2026.10.3-b22; [NemesisRE/kiosk-mode](https://github.com/NemesisRE/kiosk-mode) is third-party: use it, don't vendor it):
  - **When it isn't installed** (asked 2026-10-10): the page shows anyway. Choose between hiding it (saying why on Home), a plain "install kiosk-mode first" with a link, or installing it ourselves (next item).
  - **Install it too**, from its GitHub releases rather than HACS: fetch `kiosk-mode.js`, serve it, load it into HA's frontend, update on a new release. Decide pinned or latest (a bad release breaks every dashboard), check the download, log each install, and don't install where HACS already has it.
  - **Check the YAML against kiosk-mode's contract**, not only as YAML: known option names, value types, `users:` lists, `entity_settings` shapes. Warn, don't refuse, on an unknown name. Its README's option table is the source; keep it in `kiosk_mode.json`.
  - **Controls for more of it:** `mobile_settings`, `entity_settings`, the query-string switches as a copyable link per dashboard, templates.
  - **Show what a person would see:** pick a user (phone or not) and the grid highlights the row kiosk-mode would use.
  - The page edits other dashboards' config (only their `kiosk_mode:` key, only on Save): asked for (2026-10-06), the exception to Casa Mia keeping to its own dashboards.

- **Firmware server: mirror fewer APKs.** Each KS release ships four APKs of about 120 MB (about 1.4 GB on disk with two older releases kept). Check which file KS's Custom repository updater fetches from `releases.json`, then mirror only that (`ABI_SUFFIXES`), with the download size and progress counting only it. Separately, confirm `backup_exclude: firmware/*` keeps the APKs out of backups (a partial backup of this app should be a few MB).

## Tablet Layout and the Lovelace cards

- **Heating Flow in the README's cards** (guide `docs/heating-flow.md` written 2026-11-03). Needs the card's maturity level in `app/src/casa_mia/maturity.json` first, since each entry carries its badge.
- **`cm-refresh.js` after a reconnect** (seen reading the code, 2026-11-02; not reproduced). It listens on `conn.socket`, which is replaced when the websocket reconnects, so a page open through an HA restart may stop reloading on a saved dashboard. Check, then use `conn.subscribeEvents`, which survives a reconnect.
- **Heating Flow: what's left** (all three views, their tabs, the visual editor and tap actions shipped in 2026.10.11; the playground in `docs/design/heating-flow.html` holds the design). Still to build:
  - **Heat pump view:** the controller's power and aux heat (only the System view's panel shows them).
  - **Any number of floors** (three today).
  - Telling hot from cold water use at the outlets.
  - **Reversing valve:** the editor's "(on: defrost)" is wrong. Defrost comes from the priority, and the valve's state is never read (found 2026-11-02). Either read it or change the label.
  - **Unnamed heat pump with source None:** its panel's title reads " source heat pump" (found 2026-11-02). Fall back to "Heat pump".

- **Power Flow card: where power logically flows** (asked 2026-10-31; needs more design). Not the Sunsynk card, and not proportional like HA's Sankey: a wiring diagram of the house, from the supply through the distribution boards (DBs) and their breakers to the circuits and devices, with a meter drawn wherever there is one, as Heating Flow does for the heating.
  - **Its data:** the hierarchy HA's energy Sankey already uses (the Energy dashboard's sources, and each device's consumption with its upstream device, `included_in_stat`), read from HA's energy preferences, not set up again. Casa Mia adds what that lacks: each node locked to its meter's device, so it can show W, VA, V, I and the like, not only energy; what each node is (a DB, an RCBO, an RCD, an MCB, a device); its phases; its breaker's rating; a description (an RCBO's type and trip current, say).
  - **Auto-layout**, not Heating Flow's fixed drawing: the tree is too big and differs per house. Lay it out as a tree from the supply.
  - **Wires:** three for a 3-phase feed, one for 1-phase, with the neutral optional and the earth if it looks good. Colours from IEC 60445 (L1 brown, L2 black, L3 grey, N blue, PE green-and-yellow); line thickness scaled by the breaker's rating.
  - **Annotate** the DBs and RCBOs: rating, type, what they feed.
  - **Mind the tablets:** an animated energy flow card already costs a Tab M9 about half its CPU (measured 2026-10-31), and a group drawn off screen (a filter or opacity on a `<g>` of many shapes) paints junk blocks on its GPU (HANDOVER, Lessons learned). Animation off by default there; measure before calling it done.
- **Templates for card options** (asked 2026-10-10, again 2026-10-28). Lovelace has no templating for card options, so build it once in `integration/cards/src/ha.ts`: any string option holding `{{ … }}` is rendered through HA's `render_template` subscription (pushed on change; one subscription per templated option per card). First use: Heating Flow's `animations` off on the low-powered wall tablets only. Others: the Security look by the alarm's state, a tablet panel's `hidden` or `size`, the chosen commander. Templates are YAML only; the visual editor shows such an option as set by a template and leaves it alone. Wider aim: a template on any of Casa Mia's switches or settings, so automations can turn UI things on and off. Overlaps "Commander controls as entities" and "Camera visibility in a commander": ideally one way for a layout to follow a state.

- **Load card code only for the modules that are on** (asked 2026-10-20). `cm-cards.js` (54 KB gzipped) loads on every HA page whichever modules are on. Loading it by module (as `_load_scripts` does the helpers) would leave a card of a switched-off module as HA's "custom element doesn't exist". Better: a tiny always-loaded loader that registers every card and view name and `import()`s each one's code on first use (Vite chunks in `www/`). Goes with the standalone layout bundle ("Modules as stand-alone projects"). Worth it when the bundle grows.

- **Over layer: intercom mode** (asked 2026-10-09). A call to a tablet (a doorbell, another room) brings an intercom card up over whatever the tablet shows, gone when the call ends: an Over layer whose Visibility follows the call. Needs the intercom side (which card, which calls, per tablet).
- **Over layer: card transparency.** An option for the card's translucence, beside the backdrop's opacity, so an overlay needn't hide what's under it.
- **Over layer: its edit dialog** (asked 2026-10-10). Its layout is a bit buggy (inspect and list what's wrong), and blur, dim and the other backdrop effects should each be optional.

- **Tablet Layout: three bugs** (found 2026-10-10).
  - **Cards' corners clipped by the panel's corners**, which a normal Sections section doesn't do. Probably a small padding HA gives a section that the panel removes.
  - **Two panels on one edge: one gets squeezed** when both hold cards. Look at how the edge shares its room (`arrange`, each panel's size).
  - **The layout editor is sluggish.** Profile edit mode before changing anything.
- **Tablet Layout: a fixed-shape main ignores the edges' own sizes** (found 2026-10-10). With `main_fit: fixed`, the top and bottom edges split the height left between them, so a `size: auto` bottom edge floats under main with empty room below. Each edge should keep its own size, with the room main leaves going round main. `frame()` in `tablet.ts` (the `shape !== null` branch); the Commander's engine shares it, so decide whether it keeps today's behaviour. Then take `tablet-layout-fixed-main.webp`.
- **Tablet Layout edit mode: two blemishes** (2026-10-10). The main panel's Fit help still describes "Own shape", which the view leaves out (the help comes whole from `layout.json`). A panel with nothing showing outside edit mode is drawn 0 tall in edit mode, so its edge's depth label lands on its cards.
- **Layouts: nine regions instead of four edges** (asked 2026-10-10). A 3 × 3 grid (corners, edges, centre), so a corner can hold its own panel. Both engines (`commander_layout`, `layout.ts`), new layout cases, `layout.json` options, and today's layouts unchanged.
- **Tablet Layout: a Fill switch on each card in a panel** (stage 2 of the fill fix, asked 2026-10-09). Filling is off in edit mode (a stretched card would bury the edit controls), so a camera or map fills its panel only outside it, and nothing says so: the owner couldn't tell bug from design. In edit mode, beside the Garnish sprig: an expand mark, filled when the card fills its panel when alone, outlined when not; a tap writes `fill: true/false`, and its tooltip says "fills its panel outside edit mode". Reuse `garnish-editor.ts` (renamed `card-marks.ts`). Decide after living with stage 1; stage 3 may make it unneeded except for pictures.
- **Tablet Layout: cards in a panel size themselves** (stage 3, asked 2026-10-09). Sizing buttons for the docs screenshots meant forcing each one's rows and columns in HA's Layout tab. In a panel, offer an automatic size: the panel's cards share its room, a button stays square or keeps its proportions, HA's own grid sizes stay as an override. Look at `grid_options`, `--ha-section-grid-row-height` and "Rows fit the panel" first; they may be one piece of work. If HA's button and picture cards can't be made to behave, override them in a panel or make our own (asked 2026-10-10).
- **Tablet Layout: rows fit the panel** (option B of 2026-10-06). Size each panel's grid rows (`--ha-section-grid-row-height`) so the panel is a whole number of rows: a panel option `rows` (default: as many as fit), each card's rows then a share of the panel. More HA-native, and works for several cards.
- **Tablet Layout: check HA's version, so a breaking frontend change can be met** (asked 2026-10-09). The view leans on HA's frontend internals. Read `hass.config.version` and pick the code path by it, so old and new HA both work while users upgrade. Log and show in edit mode which path is in use, and say when the version is newer than any tested.
- **Test the HA 2026.3 floor on the VM** (asked 2026-10-10). 2026.10.7-b1 lowered the stated minimum to 2026.3, from HA's frontend history: `hui-section-edit-mode` in 2025.10, `ha-dropdown-item` in 2026.2, `hui-view-footer` in 2026.3. On the test VM: try the Tablet Layout (edit mode, header, footer, the Over layer) and garnish as it is, then on Core 2026.3 (`ha core update --version 2026.3.x`). If it fails, raise `homeassistant:` in `app/config.yaml` (and README, DOCS) to the lowest version that passed.
- **Banners: a full-width band over the top and along the bottom** (Tablet Layout). For short-lived messages, hidden when nothing in it shows, taking no room then; always the whole width, outside the panels. Check first whether HA's own view header and footer (already in the Tablet Layout) cover it.
- **Screen size stated, not measured** (Tablet Layout, Commander). On an iPad the view was 1310 × 916 but measured 936 tall (most likely the grab handle). A stated size per device would override the measurement, keyed by something unique and stable (an HA user is shared across devices; a KS or browser id; the IP or host name, which the app would supply). Lighter alternative: a nudge of a few px where we measure wrong.
- **A label font whose file is missing is taken from the system without a word** (found 2026-11-12, when CI failed on it). `compositor/labels.py` `font` gives Pillow a path, and for a path that isn't there Pillow looks among the system's fonts for a file of that name. Give it the file's bytes (`io.BytesIO(path.read_bytes())`), so a missing file is the error the log already reports. Left out of 2026.11.5 because a change to `app/` during a release is bumped by `fake_git_host`.
- **Card picker previews:** built in 2026.10.8-b22 for the Commander, the Over layer and the Sensor Watch card. Check the Commander's on the box (it needs a commander to draw).
- **Tablet Layout: the view's header and footer in its size** (done in b29). Check on a tablet: a header card, badges, a footer card, each shown or hidden by its own visibility.
- **Tablet Layout: tidy-up.** Remove the debug lines (`debug: true`) once settled; write its docs (with the responsive-design note under Housekeeping).
- **Guard the cards' sizing against regressions** (it regressed several times on 2026-10-05). (A) `tools/check_cards`: KS's `evalJs` on every kiosk after a deploy flags a Casa Mia card that overflows its screen, makes the page scroll, or got a different picture from the one it asked for. (B) A Playwright test loading the cards in stand-ins for HA's Panel view, Sections and a Tablet Layout, at phone, tablet and desktop sizes. A first, B once the cards settle. On an iPhone in landscape the Companion app keeps clear of the camera cutout, narrowing the page.

## The app and integration as a whole

- **UI review across the admin page** (asked 2026-10-27). Every page and dialog at 1280 px and 390 px, screenshots read, quirks fixed (collisions, things off a dialog's edge, dead space, text not wrapping). Run the app on the Mac with its stores in a scratch folder (`admin_from` 127.0.0.1, `CM_HA_URL`/`CM_HA_TOKEN` at the test VM) and drive it with Playwright (the cached Chromium). Found already: the library dialog's list stops well short of its footer.

- **The release image: libraries in a layer of their own** (asked 2026-10-20). `app/Dockerfile.release` copies `app/src` and runs one `pip install /src`, so every release ships PyAV (about 34 MB) and the rest in a fresh layer. Install the dependencies first (from `pyproject.toml`), then the source with `--no-deps`; check the layer sizes in `release.yml`'s build.
  - **Decided against (2026-10-20): downloading a module's code when it is switched on.** Module code is under 1 MB; the weight is the base image, Python and PyAV. It would fight the image model (the image is the version), land in `/data` (backed up), need the internet to switch a module on, and be a run-time supply-chain fetch. Nor does it serve the real goal ("Modules as stand-alone projects").
- **Push only the components whose module is on** (asked 2026-10-20). HA logs a custom-integration warning per component. Push `casa_mia_guest_login` and `casa_mia_commander` only while their module is on; a component goes only once its config entry is removed (as `RETIRED` does), and comes back before its module is offered under Discovered. Low priority.

- **Install from any GitHub repository, private ones too** (asked 2026-10-11; needs design). Give Casa Mia repository addresses; it downloads them, keeps them up to date and, where it can, installs them (an app, an integration, a card). Most useful for private repositories, so anyone can run their own app or integration with automatic updates.
  - **Build on** the firmware server (`gitproxy`, mirrors releases) and `tools/fake_git_host.py` (serves a checkout as an App store repository). Private repositories need a GitHub token (a secret, never logged).
  - **An install helper** per kind, for a person or an AI agent.
  - **Look first** at Nathan Curtis's zenos project, and at GoG, which may want its own version.
  - **Open:** which kinds first; updates through HA's update entities; pinned or latest; checking downloads; not fighting HACS.
- **All Casa Mia config in git, optionally pushed to a private repository** (asked 2026-10-11). Each module's JSON in `/data` in a git repository on the box, each change a commit; optionally pushed to GitHub (reusing the token handling above). The point: hand-edit on GitHub, have the box pull and regenerate, and stand up a brand-new HA from it, leaving ten years of crud behind.
  - **Needs:** "Generated means owned"; config in a stable order so diffs show only real changes; secrets kept out (referenced by name); a pull checked by each module's `clean()`, saying what it refused.
  - **Open:** entity ids name the old house's entities; a rename map applied on import may be the moment to fix the nasty names. Which side wins when both changed; how often it pulls.
- **Generated means owned** (agreed 2026-10-11). Everything Casa Mia writes into HA carries a marker ("made by Casa Mia: edits here are overwritten") and is regenerated whole, never merged. An edit in HA's UI is drift: reported, then overwritten or kept by the user's choice. Same input, same bytes, so "did anything change?" is a byte compare. The aim: no hand-edited dashboards, deterministic creation from sources.
- **Casa Mia's own dialogs in Home Assistant's pages** (asked 2026-10-11). `cm-cards.js` can open our dialogs over HA through its `show-dialog` event (as browser_mod does), built from HA's own pieces. Requests go through admin-only websocket commands to the app. First use: the full "Watch in Sensor Watch…" (pick a profile or set bands without leaving the page). Then kiosk actions on a tablet's device page, a guest endpoint from a user's page, a garnish heading in the card editor. Neither `show-dialog` nor the more-info dialog's insides is public API: check each HA release.

- **Bugfest** (asked 2026-10-10). A session finding bugs on the box before more features. Start with: do the commanders redraw after an app reload, and the handover's "untested on the box" list (2FA against a real user, the reach check's fixes, Who's signed in).
- **Swap: the whole HA UI** (asked 2026-10-10; designed 2026-11-03, in progress). The screenshot swap widened to all of HA's UI, with a **Swap** admin page (the final name) to add, edit, delete and filter the rules. Decisions (owner, 2026-11-03): developer mode only; the list moves to the app's `/data/swap.json` (the old file converted once, then left alone); every browser gets the swap while it is on, guests too; a draft's preview shows even with the swap off.
  - **Rules:** an ordered list of `{id, match, replace, mode, enabled}`. Exact = today's match (not inside a longer word); Case = any case, and the replacement takes the case of the text it replaces (lower, UPPER, Title, else as typed); Regex = JS syntax, `$1`/`$<name>` in the replacement, saved only if it compiles in Python and JS, display-only (never swapped back). One pass: the earliest match wins, then the longest, then the rule higher in the list.
  - **Steps, each its own build:** (1) one engine in Python and JS, both passing `tests/swap_cases.json`; (2) storage in `/data`, the conversion, and the push (`casa_mia_swap_changed` carrying the rules or the draft, the integration's `casa_mia/swap/subscribe` for any user; the binary sensor's and Sensor Watch's file polls go); (3) the Swap page, each keystroke of a draft broadcast (about 150 ms debounce); (4) the browser script in `cm-cards.js`, also replacing the kiosk `SWAP_SHIM`: text nodes, `title`/`aria-label`/`placeholder`, through every shadow root (hook `attachShadow`, walk the existing ones) and same-origin iframes, each original kept so a change undoes it; (5) the draft's highlight: an overlay of 1 px red boxes from `Range.getClientRects()`, redrawn per frame, never spans in Lit's DOM; (6) camera covers: HA's camera elements (`ha-camera-stream`, camera `hui-image`, `/api/camera_proxy` images) covered by the camera's swap still, an overlay rather than a changed `src`; `camera_images` moves to the Swap page; uncovered cameras get the red border.
  - **Done:** steps 1 to 3 in 2026.10.12-b8 (the Swap page is `#/swap`, linked from Settings' developer section); steps 4 and 5 in b9 (`cards/src/swap/dom.ts` and `overlay.ts`, checked in Chromium by `tests/test_swap_dom.py`). The list is in `/config/swap.json` (the app's folder, not `/data`). Saved rules reach HA by the existing path (any admin change fires `casa_mia_settings_changed`; the integration sees `/health`'s swap stamp move and fetches the `/swap` read), never as a bus event, which the recorder would store with the real strings. Drafts go over the app's websocket client to the admin-only `casa_mia/swap/draft`; the integration drops a draft 60 s after its last push. The integration's package is `swap_rules/`: the installer skips any path with `swap` in it (the box's camera stills live in `casa_mia/swap/`).
  - **Step 4 left:** measure the swap's cost on a wall tablet while it is on (the tablet CPU profile). Pages opened outside HA (an ingress URL in its own tab) are not swapped.
  - **Server side only for what no browser shows** (owner, 2026-11-03): pictures (compositor labels, QR contents, camera stills, the house photo) in the app, and Sensor Watch's event text (phone notifications) in the integration. Step 4 took out the rest (the admin API both ways, `/health`'s `out_shown`, generated dashboards, the kiosk `SWAP_SHIM`). The guest welcome and goodbye pages keep the app's swap: they are public, and the rules hold the real strings. Why: swapping text on its way out came before any browser could swap; it wrote stand-ins into HA's history and into dashboards deployed while the swap was on, and the swap back made regex rules one-way. Form fields are covered by step 5's overlay while not focused, never by changing their value. **Can't reach:** canvas charts (history, energy), text burned into video, HA's own editor fields.
- **Integration set-up by discovery, and one instance only.** Announce the app through Supervisor discovery (`discovery: [casa_mia]`, `POST http://supervisor/discovery`) with an `async_step_hassio` step, so HA shows it as discovered (today the form pre-fills the URL). Add `"single_config_entry": true` to the manifest so HA refuses a second instance up front. Check the Add Integration dialog on the box.

- **Modules as stand-alone projects, on request** (asked 2026-10-09; explored 2026-10-20).
  - **The goal (owner, 2026-10-21):** one feature without everything else installed, even switched off. Not saving space.
  - **Decided (owner, 2026-11-10): it's part of the plan.** Casa Mia's features go out through HACS so more people find them and can use them. Why: an app reaches only HA OS and Supervised users, and only those who find Casa Mia; one feature in HACS is visible to everyone who browses there. This replaces the 2026-10-21 gate ("see the appetite first").
  - **Sensor Watch first, being built:** the design, decisions and phases are in `docs/design/marketplace-mirrors.md`. Later items go out through the same mirror pipeline.
  - **What else can stand alone:** the Tablet Layout, Over layer and garnish (pure frontend; a trial entry built at 40 KB gzipped against `cm-cards.js`'s 54 KB). Camera Commander needs the app and integration; Guest login, Kiosks, FONA, firmware and the git proxy need the app.
  - **The layout bundle, next** (owner, 2026-11-17: Tablet Layout is the next piece to publish; nothing may be lost from Casa Mia, and nothing changes when it is installed with Casa Mia).
    - **Built in 2026.11.9-b13:** `integration/plugins/casa-mia-tablet-layout.js` (name agreed 2026-11-17; listed as "Tablet Layout"), a second Vite entry (`src/alone.ts`) from the same sources as `cm-cards.js`: the view, garnish, the screen condition and the Over layer. It is the same code, not a cut-down copy. The first file loaded defines the elements and the other says so in the console (`own.ts` `claim`). Alone, the two dashboard settings are simply on (`own.ts`; owner, 2026-11-18). Seen on the test VM with every `casa_mia/` command refused: elements defined, a view laid out, no errors.
    - **The plugin kind is in `tools/mirror.py`** (2026-11-18; `docs/design/marketplace-mirrors.md`, "A dashboard plugin has a mirror too"). Its dry run passes. Nothing is published.
    - **Done 2026-11-18 (b16):** no name clash in HACS's list of plugins; the Repair in `casa_mia` when the stand-alone file is in the dashboard's resources; the README carries the Over layer's guide too.
    - **Also done 2026-11-18 (b16):** it has a version, stamped in the built file as a component's is in its manifest; the Marketplace takes a plugin (read in core's source); garnish needs no guide of its own, as `docs/tablet-layout.md` has it ("Showing and hiding" and the options reference).
    - **Still to do:** its first publication, at a release, which is when HACS's action first runs on it and an install from a store can first be tried. The Repair has been seen in tests inside Home Assistant, not on a box.
- **Log viewer page:** the app's own log, live (follow, level filter, search), without going to Settings > Apps > Log. Through the Supervisor's `/addons/self/logs`, or an in-memory ring buffer.
- **Graphlets elsewhere.** `app/web/src/Graphlet.tsx` is the general history graph: use it, not a new one, wherever a page shows a figure over time (FONA's signal, the kiosks' battery and memory, guest logins, firmware downloads, the app's CPU and memory). Each needs its history kept on the box, so the graph is full when the page opens.

## Alarm panel

- **Make the hardware alarm panel general-purpose, with one user-owned command script** (designed 2026-10-21). Keep the alarm entity in Casa Mia without the author's fixed entity ids and relay sequence. Configuration selects an **armed** binary sensor, a **triggered** binary sensor, one HA **command script** and the alarm code.
  - **Casa Mia does the reusable part:** validates the code; derives the state from the two sensors (triggered wins); refuses a repeated or unsafe toggle; shows arming or disarming until the sensors confirm; calls the script with `target: armed_away | disarmed`.
  - **The script does the hardware:** a vendor service, MQTT, separate controls, or Pyscript. One script contract, not listening automations. Today's enable, wait, pulse, wait, disable becomes an example adapter, preferably Pyscript, whose `try/finally` guarantees the enabling relay is disabled after failure or cancellation.
  - **The sensors are the truth:** the script completing never means the panel changed. A missing or unavailable sensor makes the entity unavailable, not disarmed, with diagnostics naming it.
  - **Sensor Watch:** the alarm entity is added as a managed record (normal states nominal, triggered critical at once, unavailable an error at once), removed with the panel, but never overwriting a record the user has taken over.
  - **Migration** keeps the entity's unique id and configured code.
  - **Open:** the smallest HA-native way to select and invoke the script with blocking error propagation, and how a user takes ownership of the managed record.

## Intercom and UniFi Protect talkback

- **Drop the Intercom talkback check** (owner, 2026-11-10). Casa Mia Intercom and Protect
  Talkback refuse to set up while an Intercom talkback entry is enabled, because both
  would patch the same parts of go2rtc. Nobody used the separate integration, so the
  check guards nothing: remove it and its tests, and the line in the docs that mentions it.
- **Retire Protect Talkback when upstream catches up** (owner, 2026-11-05: decide around
  2026-11-12). Watch go2rtc PR #2340 (a native `unifi-talkback:` source), HA's UniFi
  Protect integration declaring two-way audio, and HA's release notes. When they cover
  it, add `casa_mia_protect_talkback` to `components.py` RETIRED and drop the module.
  Otherwise, consider releasing it on its own for other Protect users (HACS; it must say
  it patches HA internals and only covers HA's managed go2rtc). Either way, a test
  report on PR #2340 from a G4 Doorbell Pro on Protect 7.3.
- **Measure talk** on the owner's hardware: delay, intelligibility and echo.
- **Keep the wall tablets' WebView current** (2026-11-10): they have no Play Store, so
  Android System WebView stays where it was last installed by hand (157 since 2026-11-10;
  the factory 126 and 131 couldn't play H.265 live video). Security fixes need the
  same. Decide how: a routine with the after-reboot one, or the helper app idea.
- **Audio route on the phone and tablets** (2026-11-09): the HA iOS Companion app plays
  the visitor from the earpiece (Safari uses the loudspeaker), and Kiosk Satellite plays
  it as quiet call audio. Both need fixes in those apps; the owner holds the drafted
  feature requests. Two things the card itself could do were never tried: setting
  `navigator.audioSession.type` to `play-and-record`, and opening the microphone without
  echo cancelling. A throw-away page that tries both (`/local/casa-mia-audio-test.html`
  on the owner's box, 2026-11-10) is waiting for the owner to run it on the phone and a
  tablet; change `commander/talk.ts` only on its result, then delete the page.
- **Number plate recognition** (after the intercom works): plate detection on an
  inference host against the gate and driveway cameras, publishing events the intercom
  and HA automations can use. First check whether Protect's own plate detection covers
  it. Store only matches against a known-plates list (UK GDPR, ICO guidance on domestic
  CCTV). The intercom must never depend on that host.

## New ideas, not started

- **ProxyStick module** (asked 2026-10-16). Host ProxyStick's headless server (the `proxystick` package, a separate public repo) as a module, so an ESP32-S3 ProxyStick can present a folder under `/media` to a photo frame as a USB drive. A thin adapter (start, stop, health, its own port). Open: how the package reaches the box (a pip dependency from its GitHub URL for releases; for development, the Docker build reaching ProxyStick's fake git host).
- **Entities Casa Mia makes: a registry** (asked 2026-10-11; name to agree; not "auto-entities", which is Thomas Lovén's card). One place that creates entities in HA for the other modules and records each: first the template helpers "Watch a template" needs. Created HA's own way (config flows over the websocket), labelled Casa Mia (and per module), listed on a page (what made it, whether anything uses it), removable in one go through HA's registries, never `.storage`, logged. Feeds "take it all out".
- **Love it or Loathe it: what's left** (asked 2026-10-10; the integration was built in 2026.11.7, its page in Casa Mia in 2026.11.7-b6). **On the page** (agreed 2026-11-13, to follow the first build): a group's songs as rows with a search, delete a line, and which lines matched lately, in place of the one text box; and "who would take this?", a title and artist typed in to see which group wins and why. Also not on the page: adding or deleting an entry, and browsing for a station. **Collapsible sections** (asked 2026-11-14): each entry, and each section under it (Playing now, Groups of songs, Stations to switch to, What happened), folds away, remembered per section, using the compositor's `FoldArea` (`app/web/src/compositor/fold.tsx`, the shared `fold` styles in `ui.module.css`); move it out of the compositor if it is to be shared, never copy it. **Docs: rating with ordinary dashboard buttons, step by step** (asked 2026-11-13): the guide has the buttons' YAML under "The action behind it", but not the walk-through given to the owner in chat: edit the dashboard, Add card, Manual, paste, put in your own player; the wall-tablet version with `person` and a pair of buttons per person; what a tap then does (the song added and taken out of the other list, the first tap making the group, the song acted on at once, a refusal shown with its reason); and when to use buttons in place of the thumbs card (a button already on a dashboard, an automation, a card that takes actions). A fade over to the other station instead of an immediate switch (a volume ramp either side of `play_media`). **Adverts** (owner, 2026-11-13: only for a station that says so in its metadata): done as a group for a station that names them (the guide's "Adverts", 2026.11.8-b39, from Planet Rock's "Ad 7" and "STOP ADBREAK 2"); a shipped Adverts list once other stations' names for them are known. More shipped lists beside the Christmas songs, as they are asked for. **Play a song from Spotify in place of switching station** (asked 2026-11-25): an option beside the stations to switch to. The song is chosen at random from the songs played in the last 12 hours, and where possible one of the same length as the song being switched away from, so that it ends as that song does. A song played this way doesn't count towards songs played too often. Open: where the Spotify name of a song heard on the radio comes from (Jukebox already finds a radio song on Spotify for its cover), how close in length is close enough, and what plays when no song of the last 12 hours fits. **Not this integration's:** the house's own radio station is a Casa Mia item (owner, 2026-11-13: never part of this integration); when it exists it is one more station to switch to, and the guide's opening already says so.
- **Entity clean-up: orphaned and disabled entities** (asked 2026-10-10). A page listing them by kind (orphaned, disabled, unavailable for N days), integration and device, with last seen; remove one or a selection after a confirmation. A service for automations, with a dry run. Through HA's entity registry (`config/entity_registry/remove`), never `.storage`, logged. Look at the AI-generated clean-up app the owner has used; fold in what's useful, respecting its licence.
- **"What's eating your recorder space?"** (asked 2026-10-10). The recorder's database by entity: rows and bytes, the noisiest entities, growth, and what an `exclude` or `recorder.purge_entities` would save. Pairs with the clean-up.
- **A doorbell that answers itself** (asked 2026-11-03). When nobody answers the doorbell, Casa Mia does: speech to text on the caller, a local AI (inference on the house's own hardware, no cloud) deciding what to say and do, and text to speech back through the doorbell. It helps callers in place of the family: tells a delivery driver where to leave a parcel and opens the gates for them, takes a message, says nobody's in. Open: which doorbells give two-way audio to HA (UniFi Protect's talkback, others), the speech engines and the model and where they run, what the AI may do (open the gates? only for a delivery it can check against an expected order?), how it hands over to the family (a notification with the live conversation, take over by voice), and how every call is logged with its transcript. Shares the audio plumbing with "FONA voice calls into the voice assistant" and the gate action with `casa_mia.check_plate`.
- **KNX BMS machine** (`knx-bms`): the RPi-to-KNX machine giving BMS programming control over the bus. First job: bring the Hue lights into BMS land. Open: where its code lives, RPi or app, how Hue is reached, how it relates to the `knx` module.

## Safe by construction (RULE FIVE)

- **Logs that say whether it worked** (asked 2026-10-12). The compositor logs "reading its stream" and "stream no longer read", but not whether a frame came. Every stream read logs its outcome (first frame after how long, frames received, or why none: refused, timed out, closed), and each channel going up or down (a camera that flaps every few minutes). RULE TWO's other half: log every result.
- **Review everything we've written for RULE FIVE** (asked 2026-10-12). List every claim of working that is a flag rather than a lease, and every cleanup relying on a path being reached: the Commander's live and drawn picture, the compositor's streams and warm-up, Sensor Watch's levels and hold-off timers, the pages' requests and Save (no deadline), the health polls, FONA's serial link, the kiosks' checks, guest login's timed opening, the Over layer's state. **Sensor Watch's update path, end to end** in particular: app to integration, integration to app, app to page (the long poll: "live" with no age), integration to card; each hop should carry its copy's age and lapse to "not current since …". The list is the output, each with how it could get stuck and how a lease or a `with` would close it; then pick them one at a time as steps in `docs/never-silently-stuck.md`.

## Next: Casa Mia, the public release

- **The HACS catalog submissions (2026-11-20).** Love it or Loathe it (#14085) and Tablet
  Layout (#14586) were merged on 2026-11-26. Open: Sensor Watch hacs/default#13883,
  Dash-Bored #14577 and Jukebox #14999 (and ha-dial #14569, not Casa Mia's). Every review
  Frenck left on Sensor Watch and Dash-Bored is answered in the mirrors' 2026.11.12 and
  2026.11.13 releases, and the owner re-requested review on 2026-11-25. Dash-Bored's page
  can still reload itself, but only when switched on in Configure; he asked for it to be
  dropped, so it may come back. Don't request a review otherwise: HACS's template says
  that gets a pull request closed.
- **Jukebox's catalog submission: two likely objections, left until raised** (owner,
  2026-11-25). Opened as hacs/default#14999 on 2026-11-26. Frenck rejected both patterns
  in Dash-Bored (#14577), so they are fixed when he raises them, not before:
  - `art.View` and `phone.Stream` are `requires_auth = False`, guarded by one key per
    start shared by every page, which ends up in history and logs; the art view also
    fetches from Spotify's picture servers. Fix as Dash-Bored's photos: addresses signed
    for each connection's login (`async_sign_path` with `refresh_token_id`).
  - `find._seek` searches through Home Assistant's Spotify integration's own client
    (`runtime_data.coordinator.client._get`), another integration's internals. Fix:
    search with Jukebox's own Spotify sign-in (the one the phone player uses) against
    Spotify's public Web API, so search needs that sign-in.
  - Lesser: `upnp.py` asks the speakers directly over UPnP for what Home Assistant's
    Sonos integration doesn't expose.

Decided (2026-10-02): **ship everything.** Every module is off until enabled; no private edition: the house runs the public release like everyone else. House-specific values go to configuration (the alarm's entity ids, the compositor's cameras, the house photo). FONA's hardware is published with its sketch ("FONA Arduino firmware into the repo"). The costs: security reports (guest login hands out HA sessions), docs and support for other setups.

- **Be open about what Casa Mia touches.** One "What Casa Mia changes" section, in the README and on the admin page, per module: what it reads and writes (`/homeassistant`: custom_components on start, dashboards saved by Camera Dashboard deploys and the Kiosk mode page; `configuration.yaml` never so far), what it never touches, and that each write happens only on a button press and is logged. Check every module against it first, and keep it true, ideally with a test that fails on a write path not in the list.
- **If Casa Mia isn't for you: take it all out** (asked 2026-10-11). A guide and a button removing everything Casa Mia put into HA: its integrations (and their entries and devices), the entities and helpers it made, deployed dashboards, Lovelace resources, guest login's users, `kiosk_mode:` keys, QR codes in `/media`; then the app. List each first, remove only what Casa Mia made, log each. One list serves this and the item above.
- **Protection mode (check).** Glances and Advanced SSH show the switch; Casa Mia doesn't, probably because it asks for none of what protection blocks (`full_access`, `docker_api`, `host_pid`). Confirm the rule in the Supervisor's source and the app's `protected` flag on the box. If a right is ever needed (the radio stack would want `docker_api`), the README says why and the app says what stops working while protected.
- **Downloads in the Apple Home Assistant app (review).** The app never saves a download made inside the panel (only page navigation, and our ingress links need its cookie). Kiosk backup Download only says so (2026.10.1-b7). Options: "Save to Media" (`/media/casa-mia/kiosks/`, downloaded through HA's Media browser), or a Copy dialog. Check guest QR downloads too.
- **Sidebar title as the house name (parked, hacky).** The integration could register its own sidebar entry as HA's `hassio/addon_panel.py` does, with the app's Show in sidebar off. Internal API, so only if HA makes it public.

## Housekeeping

- **Home Assistant's device registry calls that stop working in 2027.8** (found 2026-11-10 on Home Assistant 2026.10.4). `async_get_device(identifiers=…)` is deprecated there in favour of `async_get_device_by_identifier`, and is still called in `casa_mia/__init__.py`, `casa_mia/children.py`, `casa_mia_commander/__init__.py` and `casa_mia_guest_login/__init__.py`. The new call isn't in the oldest Home Assistant Casa Mia allows (2026.3), so use it where it exists, as `casa_mia_sensor_watch/migrate.py` does. `tests_ha/` can cover each one as it is changed: Home Assistant raises on a deprecated call made from a test.
- **`via_device` in `DeviceInfo` stops working in Home Assistant 2027.8 too** (seen 2026-11-10 on the test VM, Home Assistant 2026.9.4): "calls `device_registry.async_get_or_create` with a deprecated `via_device` parameter; use `via_device_id` instead". It is passed by `casa_mia`'s entity platforms and `casa_mia_guest_login/sensor.py`. Check that `via_device_id` exists in 2026.3 before changing them, as with the item above.
- **The Supervisor warns that the app's `addon_config` map type is a legacy name** for `app_config` (seen 2026-11-10 in the test VM's Supervisor log). Find the oldest Supervisor that accepts the new name before changing `app/config.yaml`.
- **Docs, from the owner's read-through** (2026-10-10):
  - **Problem-first reasons** in the README: "have you ever wanted to… fix your dashboard to the screen's size, get a full screen of cameras, keep a heading inside a warning panel", each pointing at its module.
  - **"Why should I use your AI slop?"**: a plain answer in the README.
  - **The Over layer needs screenshots** that show it off.
  - **Some screenshots are hard to read** at GitHub's size: crop them to the detail (the whole-window rule is relaxed for such shots).
  - **A page has `<…>` in its text that Markdown swallows:** find it and write it as `&lt;…&gt;` or in code.
  - **Every module's "why"** (asked 2026-10-11): each guide opens with the real problem in the author's house that started it and how it was made general. Sources: `BACKSTORY.md` and the README's "Working together"; the owner writes or approves the stories.
- **The Tablet Layout brings responsive design to HA dashboards:** lead with that (README and `DOCS.md`). HA gives a card a width and never a height, so dashboards scroll; this view is exactly the screen and fits everything in it. Then the Commander and garnish, and the sizing rule they share.
- `DOCS.md` is a placeholder; extend it as modules land.
- pyright still excludes `integration/` (the venv is Python 3.11). Tests inside a real Home Assistant exist since 2026.11.3-b2 (`tests_ha/`, `.venv-ha`), for Sensor Watch only so far.
- `fake_git_host`'s version-bump check compares HEAD with HEAD~1 only; two quick commits inside one poll can slip past.

## Guest login

- **Who's signed in, always in view** (asked 2026-10-10). Sessions show only after pressing **Who's signed in**. Show them without a click (and perhaps a count per endpoint on the Home tile). Listing sessions means signing in as the login (HANDOVER's "Guest login"), so refresh on the page's own events, not every render.
- **Bug: the new login's Show/Hide does nothing on its password** (found 2026-10-10).
- **Screenshot: What each login can reach** (asked 2026-10-10; the guide marks it *coming soon*). A screenshot-only `swap.json` setting, e.g. `"reach_dashboards": ["guest-dashboards", "heating"]`, so the check reads only those while the swap is on. The shot needs a login with something to flag, so the fix buttons show.
- **After 2026.10.6-b2:**
  - Rotating addresses: the new QR code is only on the admin page. FONA could text engineers the new address when an endpoint opens.
  - The reach check doesn't read kiosk-mode templates or `mobile_settings`: say "not checked" where a dashboard has them.
  - "Save to HA media" puts QR codes in `/media`, which non-admins can browse, so a guest could find another suite's code. Warn, or save elsewhere.

## Auto Dashboards and generated config

- **Auto Dashboards: Back, Home and Help made general** (2026-10-09). The camera dashboard's own Back, Home and Help buttons become part of the dashboard-building system, for any dashboard it writes (perhaps the Tablet Layout too). Then (2026-10-10) a navigation skeleton from HA's structure (floors → areas → rooms, each area's picture), with HA's labels saying what goes where.
- **Retire the rest of the generated camera dashboard.** Its commander pages went in 2026.11.12-b8, with their tap zones. Left: the page for each camera, until the card's full screen covers zoom and PTZ presets; and the highlight's pulse in `cm-streams.js`, kept for dashboards deployed before b8 and to go once they have been deployed again. The README's Auto Dashboards picture (`dashboard-security-look.webp`) still shows a commander page and needs one of a camera's page. The new how-to (`docs/how-to/commander-on-your-home-page.md`) has no pictures of its own steps, and its step 8 (the default dashboard) wasn't checked against a current Home Assistant.
- **Dashboard generator** (`dashboard-gen`, working name, confirm before coding): replaces the hardcoded process that builds `groups.json` / `entities.json` and the dashboard YAML (`gen_dashboard.py`, `discover_entities.py`, `test_dashboard.py` in `tablet-provision/composite-test`). Needs a mechanism: see "Camera config as one source". Loose end: `test_dashboard.py` asserts no view has `badges` or `header`, but the generator emits both. Add a `--check` that needs no token file (the app holds a Supervisor token).
- **Camera config as one source** (the first deterministic HA config change). One configurable source in the repo drives the compositor config, the dashboard YAML and its delivery into HA's config (the app maps `/homeassistant` read-write), with no copy and paste. Decide the source's shape, whether the repo overwrites the live copy (`seed_config` never does today), and the delivery: the dashboard is UI-managed (`.storage`), so YAML means registering it under `lovelace: dashboards:` (a one-off Core restart). Touches live HA config: agree each step.

## Across modules ("Working together" in the README)

Ideas where one module makes another better. Each module still works alone; each one shipped goes into the README's **Working together**.

- **Tablets in distress: noticing, and fixing from beside the tablet** (asked 2026-10-11; a brainstorm). After a UniFi Protect update stopped the RTSP streams and the owner restarted the gatherer and compositor, every wall tablet sat at a blank screen with a pulsing green square.
  - **a) Detect a tablet that isn't working**, for any cause: a heartbeat from each Casa Mia card through the integration (drew, and when), flagged when silent too long; KS's API (screenshot, `evalJs` for content, its health); the compositor knowing which viewers stopped; a "tablets" summary on Home and as entities, so automations (and FONA) can alert.
  - **b) Let someone at the tablet fix it** with no admin or laptop: an Over layer button shown only when health is bad; a QR code in the page's background that a phone scans to reload it; a long press in a corner; a card-side watchdog reloading after N minutes without a draw; KS's reload or restart from the Kiosk Satellites page.
  - Also: what "fixed" means and the order to try; avoiding reload loops; logging each detection and fix.
- **Who's looking** (asked 2026-10-09): the integration sees each page's HA user, so the app can know who is on which panel: show it on the Kiosk Satellites and compositor pages.
- **Guests identify themselves** (asked 2026-10-09): a guest says who they are (a name, a PIN), shared with the other modules.
- **Compositor viewers:** each tablet's dashboard and a link to its Kiosk Satellites page (its name shipped in 2026.10.4-b25); the name in a chip with the KS icon and the address small and fixed-pitch under it (asked 2026-10-09); a viewer through HA shown by person, matching the token's user to the People page (asked 2026-10-09).
- **Reload the tablets after a change:** after saving kiosk-mode for a dashboard (the kiosks showing it, or logged in as a user it names), after a camera dashboard deploy, and after any frontend change that only lands on reload (a helper switched on or off, a new `cm-cards.js` after an integration update and Core restart, settings the cards read). Wait for HA to have the change first; a button first, then automatic; log which kiosks and why.
  - Considered (2026-10-06): reloading from `cm-cards.js` in every browser. `location.reload()` gets a fresh page (our scripts carry `?v=`); trigger on the script's `?v=` differing from the integration's version, or our own subscription for settings; never while editing; a `sessionStorage` guard against loops. KS's flush stays the heavier option (it clears the whole WebView cache and reaches a stuck page).
- **Kiosk Satellites shows each tablet's dashboard:** its URL, its HA user and that dashboard's kiosk-mode summary for them; warn when a wall tablet's dashboard has no kiosk-mode.
- **Guest login sets up kiosk-mode:** creating an endpoint offers to hide the header and sidebar for its user; the list warns when its dashboard has none.
- **Pick users, not type them:** the camera dashboard's tablet users and the Kiosk mode page's user columns offer the kiosks' users (and the people list's linked HA users).
- **Who is editing a dashboard.** HA doesn't know (edit mode lives in the browser, and `lovelace/config/save` replaces the whole dashboard unchecked), but `cm-cards.js` runs in every page: each reports entering and leaving edit mode over a websocket command, with a heartbeat, and the integration keeps the list. Then the Kiosk mode page and Camera Dashboard deploys warn before saving a dashboard someone is editing ("Ann is editing it on the Kitchen tablet: their next save will undo yours"), and entering edit mode warns when someone else is in it or it changed since this page loaded it (`cm-refresh.js` already reloads outside edit mode). Find edit mode by `lovelace.editMode` on `hui-root` or by patching `setEditMode`, and log when neither is found.
- **FONA alerts when a wall tablet goes quiet:** a kiosk offline longer than a set time texts the admins.
- **Callers and texts on the tablets:** a call or text from a known person shows on the wall tablets (the banners, once built), via an HA event.
- **Card dev loop reloads the test tablet:** `tools/dev_cards` asks a chosen kiosk to reload after each build.

## Phone and SMS (FONA) and people

- **FONA tests: stop them being flaky on CI** (asked 2026-10-10). `tests/test_fona.py` fails on GitHub's runners and passes locally, blocking releases. The pattern: asserting what the fake Arduino received right after waiting for something else, with real threads and `wait_for` polling a 3 s budget. Wait for each thing asserted (or have the fake record with an event), audit every test for check-after-other-wait, consider driving the read and write loops in-thread with a controlled clock, and prove it under CI-like load (`pytest -n 8 --count`, CPU busy). The suite stays under 15 s.
- **FONA Arduino firmware into the repo** (part of the public release; it works today). The sketch is `FonaForHA` (about 1,000 lines, on the Adafruit FONA library), speaking the line protocol the `fona` module reads, and the first PING layer. Bring it in with an arduino-cli build and a build plan for the board. Changes worth making then:
  - **Texts can be lost:** each SMS is deleted straight after printing, unacknowledged, and `ERASEALL` on start wipes what's stored. Have the host acknowledge (`ACK:<slot>`) before deletion, report stored texts on start, and drop the host's `ERASEALL`.
  - **Replies don't match commands:** one reply per command (or tagged replies) instead of special cases.
  - **Modem not found stays not found** until the host sends `START`; the sketch could retry or power-cycle the modem.
  - **`RESET` jumps to address 0**, which doesn't reset the hardware; a watchdog reset does.
  - **Escaping:** escape the backslash too, so a real backslash-n survives.
  - **Long texts:** the read buffer is 250 characters, and multi-part texts aren't joined.
  - **Heartbeat:** a periodic line from the sketch instead of the app's `ALIVE?`.
- **FONA voice calls into the voice assistant** (big, fun): answer an authorised call and connect it to HA's Assist pipeline, so you can phone the house and talk to it; and let the house ring someone with a message. Needs the FONA's audio brought to the box, the sketch to answer and dial, and an audio bridge in the app. Research first: quality and latency, and whether a USB modem with a UAC audio interface is the better route.
- **People page: call and text simulator.** **Test call** and **Test text** beside **Check** run the whole pipeline as if the Arduino had sent `RING:`/`TEXT:` for the number typed, then report what happened. **Must never send a real text:** sends caused by the simulation are absorbed and logged (PONGs and `casa_mia.send_sms` from automations), tied to it by an id or by number and time window, while a real text from the same number still goes out. Mark simulated events (`simulated: true`). A simulated call may really cycle the gates: decide whether automations check `simulated`.
- **FONA intrusion flood limit:** many intrusions from one number in a short time fire fewer events (one a minute with a count). None seen so far.
- **Identity: one place for everything that identifies a person** (a module, name to agree; builds on `people`). People hold a name, a number, permissions and an optional HA person today. Add what says who is at or near the house:
  - **Vehicle registrations:** plates, the Gates tick and `casa_mia.check_plate` (look-alikes O/0, I/1, S/5) shipped in 2026.10.12-b7. Left: move the gate automation onto `check_plate`, then retire the todo list and the pyscript allowlist matcher.
  - **Device trackers** belonging to each person.
  - **Guest login:** link endpoints and logins to people, and recognise a returning phone (what it tells us at sign-in, then a long-lived cookie).
  - **Privacy:** guests are told what's kept, and forgetting a person is easy.

## Modules from the charter

`fona` (first), `alarm`, `gitproxy`, `compositor`, `knx`, `knx-bms`, `esphome-gen`, `radio`, `tablet-provision`, `kiosks`. See README.

## A test that fails now and then

`tests/test_compositor.py::test_the_pages_controls_restart_flush_and_forget` failed once
in a full run on 2026-11-15 (`assert not out["live"]["pictures"]` after a flush), then
passed alone and in three more full runs. It failed again in a full run on 2026-11-20,
then passed alone three times and in the next full run. Find the race before it is
trusted again.
