import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { CLOSER_MS, Closer, closerLimits, MOST_PX } from "./closer.ts";

// A full screen 1280 by 800 CSS px, as plain objects: the zone the touches land on, and the
// picture's element the view is written to.
const BOX = { left: 0, top: 0, width: 1280, height: 800 };
const zone = { getBoundingClientRect: () => BOX, setPointerCapture() {} };

function rig() {
  const picture = { style: { transform: "" } };
  const woken = { count: 0 };
  const closer = new Closer(
    () => woken.count++,
    () => picture as unknown as HTMLElement,
    (box) => closerLimits([], box, 1),
  );
  const pointer = (id: number, x: number, y: number) => ({ pointerId: id, clientX: x, clientY: y, currentTarget: zone }) as unknown as PointerEvent;
  const wheel = (deltaY: number) => ({ deltaY, clientX: 640, clientY: 400, currentTarget: zone, preventDefault() {} }) as unknown as WheelEvent;
  /** One finger down at (x, y), moved by `by` px to the right, and up. */
  const drag = (x: number, y: number, by: number) => {
    closer.down(pointer(1, x, y));
    closer.move(pointer(1, x + by, y));
    closer.up(pointer(1, x + by, y));
  };
  return { closer, picture, woken, wheel, drag };
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

test("the limits: MOST_PX screen pixels to a video pixel of the largest channel", () => {
  const big = closerLimits([["low", 640, 360], ["high", 3840, 2160]], [1280, 800], 1);
  assert.equal(round(big.most), 12);
  assert.deepEqual(big.pic.map(round), [1280, 720]);
  assert.equal(round(closerLimits([["high", 3840, 2160]], [1280, 800], 2).most), 6);
  assert.equal(round(closerLimits([["low", 640, 360]], [1280, 800], 1).most), 2);
  assert.deepEqual(closerLimits([], [1280, 800], 1), { most: MOST_PX, pic: [1280, 800] });
});

test("a tap on the whole picture is the card's; while enlarged it goes back to whole", () => {
  const { closer, picture, wheel } = rig();
  assert.equal(closer.tap(), true);

  closer.wheel(wheel(-1));
  assert.equal(closer.view.s, 1.2);
  assert.equal(picture.style.transform, "translate(0px, 0px) scale(1.2)");
  assert.equal(closer.tap(), false);
  assert.equal(closer.view.s, 1);
  assert.equal(picture.style.transform, "");
  assert.equal(closer.tap(), true);
});

test("a drag of more than 8 px is not a tap; one of 3 px is", () => {
  const { closer, drag } = rig();
  drag(100, 100, 20);
  assert.equal(closer.tap(), false);
  drag(100, 100, 3);
  assert.equal(closer.tap(), true);
});

test("enlarged is a lease: whole again 60 s after the last turn, and the card woken", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { closer, woken, wheel } = rig();
    closer.wheel(wheel(-1));
    woken.count = 0;
    mock.timers.tick(CLOSER_MS - 1000);
    assert.equal(closer.view.s, 1.2);
    mock.timers.tick(1000);
    assert.equal(closer.view.s, 1);
    assert.equal(woken.count, 1);

    // A turn at 30 s starts the 60 s again.
    closer.wheel(wheel(-1));
    mock.timers.tick(30_000);
    closer.wheel(wheel(-1));
    mock.timers.tick(CLOSER_MS - 1000);
    assert.equal(round(closer.view.s), 1.44);
    mock.timers.tick(1000);
    assert.equal(closer.view.s, 1);
  } finally {
    mock.timers.reset();
  }
});

test("asked keeps the closest reached while enlarged, and is 1 once whole", () => {
  const { closer, wheel } = rig();
  closer.wheel(wheel(-1));
  closer.wheel(wheel(-1));
  closer.wheel(wheel(1));
  assert.equal(round(closer.view.s), 1.2);
  assert.equal(round(closer.asked), 1.44);
  closer.wheel(wheel(1));
  assert.equal(closer.view.s, 1);
  assert.equal(closer.asked, 1);

  closer.wheel(wheel(-1));
  closer.whole();
  assert.equal(closer.asked, 1);
});

test("the card is woken when the chip's text changes, and not by a move that leaves it", () => {
  const { closer, woken, wheel, drag } = rig();
  closer.wheel(wheel(-1));
  assert.equal(woken.count, 1);
  drag(600, 400, 50); // moves the enlarged picture; still 1.2×
  assert.equal(closer.view.x, 50);
  assert.equal(woken.count, 1);
  closer.wheel(wheel(-1));
  assert.equal(woken.count, 2);
  closer.whole(); // its lease is a real timer here: cleared, so the test run ends at once
});
