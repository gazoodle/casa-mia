import assert from "node:assert/strict";
import test from "node:test";
import { emsWide, timeIn, twelveHour, zoneOf } from "./common.ts";

const at = new Date("2026-07-01T20:05:42Z"); // 21:05:42 in London (summer time)

test("the time in a zone, 24 or 12 hours, with or without seconds", () => {
  assert.deepEqual(timeIn(at, "Europe/London", false, false), { hour: 21, minute: 5, second: 42, text: "21:05", period: "" });
  assert.equal(timeIn(at, "Europe/London", false, true).text, "21:05:42");
  const twelve = timeIn(at, "Europe/London", true, false, "en-GB");
  assert.equal(twelve.text, "9:05");
  assert.equal(twelve.hour, 21, "the hands still have the 24-hour hour");
  assert.equal(twelve.period.toLowerCase(), "pm");
  assert.equal(timeIn(at, "UTC", false, false).text, "20:05");
  assert.equal(timeIn(new Date("2026-07-01T23:00:00Z"), "UTC", false, false).hour, 23);
  assert.equal(timeIn(new Date("2026-07-01T00:00:00Z"), "UTC", false, false).text, "00:00");
});

test("12 or 24 hours: as set, else as the language has it", () => {
  assert.equal(twelveHour("12", "en-GB"), true);
  assert.equal(twelveHour("24", "en-US"), false);
  assert.equal(twelveHour("auto", "en-US"), true);
  assert.equal(twelveHour("auto", "en-GB"), false);
});

test("the zone: the card's own, else the server's where the profile says so, else this device's", () => {
  const hass = (time_zone: string) => ({ states: {}, callService: async () => undefined, locale: { time_zone }, config: { time_zone: "Europe/Rome" } });
  assert.equal(zoneOf({ type: "x", time_zone: "Asia/Tokyo" }, hass("server")), "Asia/Tokyo");
  assert.equal(zoneOf({ type: "x" }, hass("server")), "Europe/Rome");
  assert.equal(zoneOf({ type: "x" }, hass("local")), undefined);
});

test("seconds and a period make the time wider", () => {
  const plain = emsWide(timeIn(at, "UTC", false, false));
  assert.ok(emsWide(timeIn(at, "UTC", false, true)) > plain);
  assert.ok(emsWide(timeIn(at, "UTC", true, false)) > emsWide({ ...timeIn(at, "UTC", true, false), period: "" }));
});
