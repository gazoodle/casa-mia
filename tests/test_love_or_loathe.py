"""Love it or Loathe it's matching (pure.py), which needs no Home Assistant."""

from conftest import load_component_file

pure = load_component_file("casa_mia_love_or_loathe", "pure")
CHRISTMAS = pure.libraries()["christmas"]["patterns"]


def group(id, songs, feeling="loathe"):
    act = pure.Act("mute", 0, 5)
    return pure.Group(id, id, feeling, "", act, act, *pure.Matcher.split(songs))


def test_case_accents_and_punctuation_dont_count():
    assert pure.fold("Rockin’ Around the Christmas Tree!") == pure.fold(
        "rockin around the christmas tree"
    )
    assert pure.fold("Michael Bublé") == "michael buble"
    assert pure.fold("Mel & Kim") == pure.fold("Mel and Kim")


def test_a_pattern_is_a_title_or_a_title_and_an_artist():
    songs = group("mine", ["Stay Another Day | East 17", "*love*", "* | Wham!"])
    assert pure.pick([songs], "Stay Another Day", "East 17") is songs
    assert pure.pick([songs], "Stay Another Day", "Girls Aloud") is None
    assert pure.pick([songs], "The Power of Love", "Anyone") is songs
    assert pure.pick([songs], "Club Tropicana", "Wham!") is songs
    assert pure.pick([songs], "Club Tropicana", "Someone Else") is None


def test_what_a_player_adds_to_a_title_is_seen_through():
    songs = group("mine", ["Last Night", "Happy Day (Live)"])
    assert pure.pick([songs], "Last Night (Remastered 2011)", "A Band") is songs
    assert pure.pick([songs], "Last Night - Single Version", "A Band") is songs
    assert pure.pick([songs], "Happy Day (Live)", "A Band") is songs
    assert pure.pick([songs], "Last Night Again", "A Band") is None


def test_a_radio_stream_with_the_artist_in_the_title():
    songs = group("mine", ["Stay Another Day | East 17"])
    assert pure.pick([songs], "East 17 - Stay Another Day", "") is songs
    assert pure.pick([songs], "Stay Another Day - East 17", "") is songs


def test_a_line_of_only_stars_is_refused():
    good, bad = pure.parse(["*", " ", "# a note", "* | *", "Song", "* | Artist"])
    assert bad == ["*", "* | *"]
    assert good == [("song", ""), ("*", "artist")]


def test_the_christmas_list_knows_its_songs_and_leaves_the_rest():
    xmas = group("xmas", CHRISTMAS)
    for title, artist in [
        ("Last Christmas", "Wham!"),
        ("All I Want for Christmas Is You", "Mariah Carey"),
        ("Merry Xmas Everybody", "Slade"),
        ("Fairytale of New York (feat. Kirsty MacColl)", "The Pogues"),
        ("Stay Another Day", "East 17"),
        ("Santa Claus Is Comin' to Town", "Bruce Springsteen"),
        ("Rockin' Around the Christmas Tree", "Brenda Lee"),
        ("Let It Snow! Let It Snow! Let It Snow!", "Dean Martin"),
        ("Wonderful Christmastime", "Paul McCartney"),
        ("2000 Miles", "The Pretenders"),
        ("Mary's Boy Child / Oh My Lord", "Boney M."),
    ]:
        assert pure.pick([xmas], title, artist) is xmas, title
    for title, artist in [
        ("The Power of Love", "Huey Lewis & The News"),
        ("Santa Monica", "Everclear"),
        ("Snow (Hey Oh)", "Red Hot Chili Peppers"),
        ("Stay", "Rihanna"),
    ]:
        assert pure.pick([xmas], title, artist) is None, title


def test_a_song_named_outright_beats_a_star_and_then_love_beats_loathe():
    xmas = group("xmas", ["*christmas*", "Stay Another Day | East 17"])
    loved = group("loved", ["Last Christmas", "*day*", "*white*"], feeling="love")
    both = [xmas, loved]
    assert pure.pick(both, "Last Christmas", "Wham!") is loved
    assert pure.pick(both, "Blue Christmas", "Elvis Presley") is xmas
    # Named outright by the loathed group, taken in by a star of the loved one.
    assert pure.pick(both, "Stay Another Day", "East 17") is xmas
    # A star in each: the loved group has it, though it was made second.
    assert pure.pick(both, "White Christmas", "Bing Crosby") is loved


def test_an_ignored_group_has_no_songs():
    xmas = group("xmas", ["*christmas*"], feeling="ignore")
    assert pure.pick([xmas], "Last Christmas", "Wham!") is None


def test_a_rated_song_is_a_line_of_its_own_and_comes_out_again():
    songs = pure.with_song("Old Song\n*dreadful*", "Dreadful Song", "A Band")
    assert songs == "Old Song\n*dreadful*\nDreadful Song | A Band"
    assert pure.with_song(songs, "Dreadful Song (Live)", "A Band") == songs
    assert pure.with_song("", "East 17 - Stay Another Day", "") == (
        "East 17 - Stay Another Day"
    )
    # A title that would read as a pattern is made safe.
    assert pure.with_song("", "This | That *", "A Band") == "This That | A Band"
    assert pure.without_song(songs, "Dreadful Song", "A Band") == "Old Song\n*dreadful*"


def test_a_volume_change_is_a_percentage_kept_within_the_scale():
    assert pure.scaled(0.4, 10) == 0.44
    assert pure.scaled(0.4, -50) == 0.2
    assert pure.scaled(0.95, 10) == 1.0
    assert pure.scaled(0.4, -100) == 0.0


def test_only_a_speaker_groups_leader_acts():
    assert pure.leads("media_player.a", None)
    assert pure.leads("media_player.a", [])
    assert pure.leads("media_player.a", ["media_player.a", "media_player.b"])
    assert not pure.leads("media_player.b", ["media_player.a", "media_player.b"])
