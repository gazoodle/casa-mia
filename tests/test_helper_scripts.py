"""The dashboard helper scripts (www/cm-back.js, cm-refresh.js), run in node. HA imports its
core and the helpers separately, so a helper can run before window.hassConnection exists: it
must still work, or stay dead until the page is next reloaded."""

import subprocess
from pathlib import Path

import pytest

WWW = Path(__file__).resolve().parents[1] / "integration/custom_components/casa_mia/www"

BACK = """
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function load(navigation) {
  const page = { calls: [], location: { href: "http://ha.test/lovelace/rooms#BACK" } };
  const window = { navigation, addEventListener: (name, listener) => { if (name === "popstate") page.popstate = listener; } };  // no hassConnection
  const history = {
    replaceState: (_state, _title, url) => { page.calls.push("replace"); page.location.href = url; },
    back: () => page.calls.push("back"),
  };
  vm.runInNewContext(readFileSync(process.argv[1], "utf8"), {
    window, history, location: page.location, console: { info() {} }, setInterval: (run) => { page.tick = run; },
  });
  return page;
}

// #BACK leaves the address, then back twice: once off the replaced entry, once for real.
let page = load({ canGoBack: true });
page.tick();
assert.equal(page.location.href, "http://ha.test/lovelace/rooms");
assert.deepEqual(page.calls, ["replace", "back"]);
page.popstate();
assert.deepEqual(page.calls, ["replace", "back", "back"]);

// Any other going back is left alone.
page.popstate();
page.tick();
assert.deepEqual(page.calls, ["replace", "back", "back"]);

// The page the visit began on: the second back would leave Home Assistant, so it stays.
page = load({ canGoBack: false });
page.tick();
page.popstate();
assert.deepEqual(page.calls, ["replace", "back"]);

// A browser without the Navigation API can't tell, and goes back.
page = load(undefined);
page.tick();
page.popstate();
assert.deepEqual(page.calls, ["replace", "back", "back"]);
"""

REFRESH = """
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const flush = () => new Promise((done) => setImmediate(done));

function load(connection) {
  const page = { window: { hassConnection: connection }, errors: [], stopped: false, listened: [] };
  vm.runInNewContext(readFileSync(process.argv[1], "utf8"), {
    window: page.window,
    console: { info() {}, error: (text) => page.errors.push(text) },
    setInterval: (run) => { page.tick = run; return 1; },
    clearInterval: () => { page.stopped = true; },
  });
  page.connection = { conn: { socket: { addEventListener: (name) => page.listened.push(name) } } };
  return page;
}

// Not there yet: it looks, then listens once it appears, and stops looking.
let page = load(undefined);
page.tick();
await flush();
assert.deepEqual(page.listened, []);
page.window.hassConnection = Promise.resolve(page.connection);
page.tick();
await flush();
assert.deepEqual(page.listened, ["message"]);
assert.equal(page.stopped, true);
assert.deepEqual(page.errors, []);

// Never there: it says so, once, and stops looking.
page = load(undefined);
for (let i = 0; i < 599; i++) page.tick();
assert.deepEqual(page.errors, []);
page.tick();
assert.equal(page.stopped, true);
assert.equal(page.errors.length, 1);
assert.match(page.errors[0], /won't reload when they change: .*never appeared/);

// A connection that fails says so.
page = load(Promise.reject(1));
await flush();
assert.match(page.errors[0], /connection failed \\(1\\)/);
"""


@pytest.mark.parametrize(
    "script, checks", [("cm-back.js", BACK), ("cm-refresh.js", REFRESH)]
)
def test_helper_works_when_it_runs_before_the_connection(script, checks):
    result = subprocess.run(
        ["node", "--input-type=module", "-e", checks, str(WWW / script)],
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode == 0, result.stderr
