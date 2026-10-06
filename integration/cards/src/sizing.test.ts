// The cards' sizing rule (ha.ts: modeOf, heightFor), shared by the Camera Commander and the
// Tablet Layout. Where a card stands decides its mode; the mode and its room decide its
// height; its width is always all of its space. (Which container holds a card is read off
// HA's page, so that part shows on the debug overlay instead: "screen (in hui-panel-view)".)
import assert from "node:assert/strict";
import test from "node:test";
import { heightFor, modeOf } from "./ha.ts";

const WIDE = 16 / 9;

test("the container decides the mode", () => {
  assert.equal(modeOf("HUI-PANEL-VIEW", false), "screen");
  assert.equal(modeOf("CASA-MIA-TABLET-LAYOUT", false), "tile"); // filling a Tablet Layout's panel
  for (const other of ["HUI-GRID-SECTION", "HUI-MASONRY-VIEW", "HUI-VERTICAL-STACK-CARD", ""])
    assert.equal(modeOf(other, false), "column");
  assert.equal(modeOf("HUI-PANEL-VIEW", true), "preview"); // an editor's preview wins
});

test("alone in a Panel view: all of the room, whatever its shape or width", () => {
  // An iPhone in landscape, no header: 852 x 393. 16:9 of the width would be 479.
  assert.equal(heightFor({ mode: "screen", room: 393 }, 852, WIDE), 393);
  // A tall phone: 393 wide, 852 of room. 16:9 would be 221; it is all 852.
  assert.equal(heightFor({ mode: "screen", room: 852 }, 393, WIDE), 852);
});

test("in a column: its own shape from its width, never taller than the room", () => {
  assert.equal(heightFor({ mode: "column", room: 1000 }, 400, WIDE), 225);
  assert.equal(heightFor({ mode: "column", room: 393 }, 852, WIDE), 393);
  assert.equal(heightFor({ mode: "column", room: 1000 }, 800, 16 / 10), 500);
});

test("in a tile: the tile decides (no height of its own)", () => {
  assert.equal(heightFor({ mode: "tile", room: 393 }, 852, WIDE), null);
});

test("in an editor's preview: its own shape, uncapped", () => {
  assert.equal(heightFor({ mode: "preview", room: 100 }, 800, WIDE), 450);
});
