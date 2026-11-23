"""Love it or Loathe it's matching (pure.py), which needs no Home Assistant, and its
notification blueprint."""

import re
from pathlib import Path

import yaml

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


def test_a_title_and_artist_pattern_takes_them_swapped_a_title_alone_does_not():
    # As Planet Rock reaches a Sonos (2026-11-15): the artist as the title.
    songs = group(
        "mine", ["Sledgehammer | Peter Gabriel", "* | Cliff Richard", "*love*"]
    )
    assert pure.pick([songs], "Peter Gabriel", "Sledgehammer") is songs
    assert pure.pick([songs], "Cliff Richard", "Mistletoe and Wine") is songs
    assert pure.pick([songs], "Doll Parts", "Courtney Love") is None


def test_only_a_song_is_counted_whichever_way_round():
    sonos = pure.song("Peter Gabriel", "Sledgehammer")
    assert sonos == pure.song("Sledgehammer", "Peter Gabriel")
    assert sonos == pure.song("Sledgehammer - Peter Gabriel", "")
    # What a station puts out between songs has no artist.
    for text in ("Planet Rock • The Late Show", "Ad 7", "STOP ADBREAK 2", "Capital"):
        assert pure.song(text, "") is None

    history = pure.History()
    for at in (0, 1000, 2000):
        history.heard("Ad 7", "", at)
        history.heard("Peter Gabriel", "Sledgehammer", at)
    assert history.count("Ad 7", "", 2000, 4) == 0
    assert history.count("Sledgehammer - Peter Gabriel", "", 2000, 4) == 3
    # What b38 kept is read the same way: in either order, and without the rest.
    kept = [(0, "sledgehammer", "peter gabriel"), (0, "ad 7", "")]
    assert pure.History(kept).dump(0) == [(0, "peter gabriel", "sledgehammer")]


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


def test_an_ignored_group_remembers_which_list_it_was():
    loathed = {"feeling": "loathe", "patterns": "Old Song"}
    ignored = pure.felt(loathed, {**loathed, "feeling": "ignore"})
    assert ignored["before"] == "loathe" and pure.home(ignored) == "loathe"
    # Saved again while ignored, it still does; loved again, it has nothing to remember.
    assert pure.felt(ignored, {"feeling": "ignore"}) == {
        "feeling": "ignore",
        "before": "loathe",
    }
    assert pure.felt(ignored, {"feeling": "love"}) == {"feeling": "love"}
    # A new group made ignored was never either.
    assert pure.home(pure.felt({}, {"feeling": "ignore"})) == "ignore"


def test_plays_are_counted_once_each_and_forgotten():
    hour = 3600.0
    history = pure.History()
    for at in (0, 0.05, 1, 2, 5):  # 0.05 h: within ten minutes, the same play
        history.heard("Round Again!", "A Band", at * hour)
    assert history.count("round again", "a band", 5 * hour, 4.5) == 3
    assert history.count("Round Again", "A Band", 5 * hour, 3.5) == 2
    assert history.count("Round Again", "Another Band", 5 * hour, 48) == 0

    # Kept through storage, and forgotten after two days.
    again = pure.History(history.dump(5 * hour))
    assert again.count("Round Again", "A Band", 5 * hour, 48) == 4
    assert again.dump(50 * hour) == [(5 * hour, "a band", "round again")]  # in order


def test_a_blueprint_someone_has_changed_is_left_as_it_is(tmp_path):
    """Frenck, reviewing hacs/default#14085 (2026-11-20): every start of Home Assistant
    used to replace it, and a user's edits with it."""
    import importlib.util

    root = Path(__file__).resolve().parents[1]
    path = root / "integration/custom_components/casa_mia_love_or_loathe/blueprint.py"
    spec = importlib.util.spec_from_file_location("lol_bp", path)
    assert spec and spec.loader
    bp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bp)
    shipped = bp.SOURCE.read_text()
    target = tmp_path / "love_or_loathe_notify.yaml"

    # An earlier build's copy, with no sum beside it: still ours, so brought up to date.
    target.write_text("written by an earlier build\n")
    bp.install(str(target))
    assert target.read_text() == shipped

    # Changed by hand: left as it is at the next start.
    target.write_text(shipped + "# my own touch\n")
    bp.install(str(target))
    assert target.read_text().endswith("# my own touch\n")

    # Deleted: the current one again.
    target.unlink()
    bp.install(str(target))
    assert target.read_text() == shipped


def test_the_notify_blueprint_is_sound_and_reads_only_what_the_event_carries():
    root = Path(__file__).resolve().parents[1]
    component = root / "integration/custom_components/casa_mia_love_or_loathe"

    class Loader(yaml.SafeLoader):
        pass

    Loader.add_constructor("!input", lambda loader, node: ("input", node.value))
    text = (component / "blueprints" / "notify.yaml").read_text()
    bp = yaml.load(text, Loader)  # noqa: S506 (our own loader, SafeLoader based)
    assert bp["blueprint"]["domain"] == "automation"

    used = set(re.findall(r"!input (\w+)", text))
    assert used == set(bp["blueprint"]["input"])
    # The event is the engine's `last`.
    engine = (component / "engine" / "engine.py").read_text()
    fired = set(
        re.findall(r'"(\w+)":', engine.split("self.last = {", 1)[1].split("}", 1)[0])
    )
    read = set(re.findall(r"trigger\.event\.data\.(\w+)", text))
    assert read and read <= fired | {"entity_id"}, read - fired


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
