// A camera's controls on a full screen (app/web/src/cameras/controls.ts): their size.
import assert from "node:assert/strict";
import test from "node:test";
import { controlsAt, controlsStyle } from "../../../../app/web/src/cameras/controls.ts";

test("a size is a height in px, and one saved by name is read as its height", () => {
  assert.equal(controlsAt().size, 56);
  assert.equal(controlsAt({ size: 32 }).size, 32);
  assert.deepEqual(["small", "medium", "large"].map((size) => controlsAt({ size }).size), [40, 56, 72]);
  assert.equal(controlsAt({ size: "huge" }).size, 56); // not a size there ever was
  assert.equal(controlsStyle(controlsAt({ size: 80 }), 0.5)["--cm-pill-height"], "40px");
});
