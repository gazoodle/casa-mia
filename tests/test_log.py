import logging
import re

from casa_mia.log import DATEFMT, FMT


def test_log_lines_match_home_assistants_format():
    record = logging.LogRecord("casa_mia.x", logging.INFO, "f.py", 1, "hello", (), None)
    line = logging.Formatter(FMT, DATEFMT).format(record)
    assert re.fullmatch(
        r"\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3} INFO \(MainThread\) \[casa_mia\.x\] hello",
        line,
    )


def test_levels_are_coloured():
    from casa_mia.log import ColourFormatter

    record = logging.LogRecord("t", logging.WARNING, "f.py", 1, "hi", (), None)
    line = ColourFormatter(FMT, DATEFMT).format(record)
    assert line.startswith("\x1b[33m") and line.endswith("\x1b[0m")


def test_pillow_debug_is_silenced():
    from casa_mia.log import configure_logging

    configure_logging("debug")
    assert not logging.getLogger("PIL.TiffImagePlugin").isEnabledFor(logging.DEBUG)
