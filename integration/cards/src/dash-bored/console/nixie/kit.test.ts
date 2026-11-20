import assert from "node:assert/strict";
import { test } from "node:test";
import { tubes } from "./kit.ts";

test("a reading is a tube for each figure, with its point in the tube before it", () => {
  assert.deepEqual(tubes("21.4"), [{ figure: "2", point: false }, { figure: "1", point: true }, { figure: "4", point: false }]);
  // A sign for degrees or per cent is in no tube, and a space is a tube with nothing lit.
  assert.deepEqual(tubes(" 7.0°"), [{ figure: "", point: false }, { figure: "7", point: true }, { figure: "0", point: false }]);
  assert.deepEqual(tubes(" 45%"), [{ figure: "", point: false }, { figure: "4", point: false }, { figure: "5", point: false }]);
  // A dark display keeps its tubes, and a minus has one.
  assert.deepEqual(tubes("  . °"), [{ figure: "", point: false }, { figure: "", point: true }, { figure: "", point: false }]);
  assert.deepEqual(tubes("-5.0").map((t) => t.figure), ["-", "5", "0"]);
});
