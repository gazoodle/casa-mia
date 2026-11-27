// The clips dialog's fetching (clips.ts) against a stand-in of UniFi Protect's media
// library as Home Assistant's websocket gives it (measured 2026-11-27). Invented consoles,
// cameras and plates.
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { before, clipOf, dayClips, download, Folders, nextDay, reason, resolve, ROOT, today, truncated } from "./clips.ts";

const P = `${ROOT}/`;
const folder = (nvr: string, camera: string, entity?: string) => ({
  title: camera,
  media_content_id: `${P}${nvr}:browse:${camera}`,
  thumbnail: entity ? `/api/camera_proxy/${entity}?token=x` : null,
});
// Two consoles: the gate camera (two channels on one device) on one, the yard's on the other.
const LIBRARY: Record<string, { title: string; children: unknown[] }> = {
  [ROOT]: { title: "UniFi Protect", children: [{ title: "Home", media_content_id: `${P}nvr1:browse` }, { title: "Barn", media_content_id: `${P}nvr2:browse` }] },
  [`${P}nvr1:browse`]: { title: "Home", children: [folder("nvr1", "all"), folder("nvr1", "cam1", "camera.gate_high")] },
  [`${P}nvr2:browse`]: { title: "Barn", children: [folder("nvr2", "all"), folder("nvr2", "cam9", "camera.yard")] },
};
const ENTITIES = {
  "camera.gate_high": { device_id: "gate", platform: "unifiprotect" },
  "camera.gate_low": { device_id: "gate", platform: "unifiprotect" },
  "camera.yard": { device_id: "yard", platform: "unifiprotect" },
  "camera.shed": { device_id: "shed", platform: "unifiprotect" },
  "camera.porch": { device_id: "porch", platform: "generic" },
};

/** Home Assistant with the library above (or `answer`), counting what it was asked. */
function ha(answer: (msg: Record<string, any>) => unknown = (msg) => LIBRARY[msg.media_content_id] ?? Promise.reject({ code: "browse_media_failed", message: "Unknown source directory." })) {
  const asked: Record<string, any>[] = [];
  return {
    asked,
    hass: {
      states: {},
      entities: ENTITIES,
      callService: async () => undefined,
      callWS: async (msg: Record<string, any>) => (asked.push(msg), answer(msg)),
    },
  };
}

test("a camera's folder is found by its device, across two consoles, from another channel", async () => {
  const { hass, asked } = ha();
  const folders = new Folders();
  assert.equal(await folders.of(hass, "camera.gate_low"), `${P}nvr1:browse:cam1`);
  assert.equal(await folders.of(hass, "camera.yard"), `${P}nvr2:browse:cam9`);
  assert.equal(await folders.of(hass, "camera.shed"), "");
  assert.equal(asked.length, 3, "the root and each console, once");
});

test("with one console the root is that console, and its cameras are taken straight away", async () => {
  const { hass, asked } = ha(() => ({ title: "Home", media_content_id: `${P}nvr1:browse`, children: LIBRARY[`${P}nvr1:browse`].children }));
  assert.equal(await new Folders().of(hass, "camera.gate_high"), `${P}nvr1:browse:cam1`);
  assert.equal(asked.length, 1);
});

test("a browse that fails is said with Home Assistant's reason, and not kept", async () => {
  let fail = true;
  const { hass } = ha((msg) => (fail ? Promise.reject({ code: "browse_media_failed", message: "Media source unifiprotect not loaded" }) : LIBRARY[msg.media_content_id]));
  const folders = new Folders();
  await assert.rejects(folders.of(hass, "camera.yard"), (err) => reason(err) === "Media source unifiprotect not loaded");
  fail = false;
  assert.equal(await folders.of(hass, "camera.yard"), `${P}nvr2:browse:cam9`);
});

test("no folder, no press; not Protect's, not even a look", async () => {
  const { hass, asked } = ha();
  const folders = new Folders();
  let redrawn = 0;
  const again = () => redrawn++;
  assert.equal(folders.offered(hass, "camera.porch", again), false);
  assert.equal(asked.length, 0);

  // Not known yet: offered, and looked up once however often the card redraws.
  assert.equal(folders.offered(hass, "camera.shed", again), true);
  assert.equal(folders.offered(hass, "camera.shed", again), true);
  await folders.all(hass);
  assert.equal(redrawn, 1);
  assert.equal(asked.length, 3);
  assert.equal(folders.offered(hass, "camera.shed", again), false);
  assert.equal(folders.offered(hass, "camera.gate_low", again), true);
});

test("while the look has failed the name stays pressable, and a redraw never looks again", async () => {
  const { hass, asked } = ha(() => Promise.reject({ message: "Timed out" }));
  const warn = mock.method(console, "warn", () => undefined);
  try {
    const folders = new Folders();
    assert.equal(folders.offered(hass, "camera.yard", () => undefined), true);
    await new Promise((r) => setTimeout(r));
    assert.equal(folders.offered(hass, "camera.yard", () => undefined), true);
    assert.equal(asked.length, 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /could not be listed: Timed out/);
  } finally {
    warn.mock.restore();
  }
});

test("today is Home Assistant's, and Earlier adds the day before, over months and years", () => {
  const late = Date.parse("2026-11-27T23:30:00Z");
  assert.deepEqual(today("Europe/London", late), { y: 2026, m: 11, d: 27 });
  assert.deepEqual(today("Asia/Tokyo", late), { y: 2026, m: 11, d: 28 });
  const first = nextDay([], "Asia/Tokyo", late);
  assert.deepEqual(nextDay([first], "Asia/Tokyo", late), { y: 2026, m: 11, d: 27 });
  assert.deepEqual(before({ y: 2026, m: 12, d: 1 }), { y: 2026, m: 11, d: 30 });
  assert.deepEqual(before({ y: 2027, m: 1, d: 1 }), { y: 2026, m: 12, d: 31 });
  assert.deepEqual(before({ y: 2028, m: 3, d: 1 }), { y: 2028, m: 2, d: 29 });
});

test("Protect's titles: the what, its kind's icon, and the rest as written", () => {
  const forms: [string, string, string, string][] = [
    ["11/27/26 12:04:31 12s Object Detection - Person", "Person", "11/27/26 12:04:31 12s", "mdi:account"],
    ["27/11/2026 12:04:31 1m 3s Object Detection - Black Suv: AB12 CDE", "Black Suv: AB12 CDE", "27/11/2026 12:04:31 1m 3s", ""],
    ["27.11.26 08:00:01 1h 2m 5s Object Detection - Animal, Person", "Animal, Person", "27.11.26 08:00:01 1h 2m 5s", "mdi:paw"],
    ["27/11/2026 08:00:01 5s Ring Event", "Ring Event", "27/11/2026 08:00:01 5s", ""],
    ["27/11/2026 08:00:01 0s Motion Event", "Motion Event", "27/11/2026 08:00:01 0s", ""],
    ["27/11/2026 08:00:01 9s Audio Detection - Smoke", "Smoke", "27/11/2026 08:00:01 9s", ""],
    ["Something else", "Something else", "", ""],
  ];
  for (const [title, what, when, icon] of forms) {
    const clip = clipOf({ title, media_content_id: "e", thumbnail: "/t" });
    assert.deepEqual([clip.what, clip.when, clip.icon], [what, when, icon], title);
  }
});

test("a day is asked by kind and date, turned newest first, each thumbnail signed", async () => {
  const day = `${P}nvr1:browse:cam1:smart:range:2026:11:7`;
  const item = (n: number) => ({ title: `27/11/2026 0${n}:00:00 5s Object Detection - Person`, media_content_id: `${P}nvr1:event:e${n}`, thumbnail: `/api/unifiprotect/thumbnail/nvr1/e${n}?width=185&height=185` });
  const { hass, asked } = ha((msg) => (msg.type === "auth/sign_path" ? { path: `${msg.path}&authSig=s` } : msg.media_content_id === day ? { title: "07/11/2026 (2)", children: [item(1), item(2)] } : undefined));
  const clips = await dayClips(hass, `${P}nvr1:browse:cam1`, "smart", { y: 2026, m: 11, d: 7 });
  assert.deepEqual(
    clips.map((c) => c.id),
    [`${P}nvr1:event:e2`, `${P}nvr1:event:e1`],
  );
  assert.equal(clips[0].thumb, "/api/unifiprotect/thumbnail/nvr1/e2?width=185&height=185&authSig=s");
  assert.ok(asked.filter((m) => m.type === "auth/sign_path").every((m) => m.expires >= 3600));
});

test("the list is said to be cut short only when the console's all-cameras folder says so", async () => {
  const titles: Record<string, string> = {
    [`${P}nvr1:browse:all:smart:range:2026:11:27`]: "Home > Object Detections > November 2026 > 27/11/2026 (1000 TRUNCATED)",
    [`${P}nvr1:browse:all:smart:range:2026:11:26`]: "Home > Object Detections > November 2026 > 26/11/2026 (37)",
  };
  const { hass } = ha((msg) => ({ title: titles[msg.media_content_id] }));
  const cam = `${P}nvr1:browse:cam1`;
  assert.equal(await truncated(hass, cam, "smart", { y: 2026, m: 11, d: 27 }), true);
  assert.equal(await truncated(hass, cam, "smart", { y: 2026, m: 11, d: 26 }), false);
});

test("a clip resolves to the address Home Assistant signed", async () => {
  const { hass, asked } = ha(() => ({ url: "/api/unifiprotect/video/nvr1/event/e1/video.mp4?authSig=s", mime_type: "video/mp4" }));
  assert.equal(await resolve(hass, `${P}nvr1:event:e1`), "/api/unifiprotect/video/nvr1/event/e1/video.mp4?authSig=s");
  assert.deepEqual(asked[0], { type: "media_source/resolve_media", media_content_id: `${P}nvr1:event:e1` });
});

test("the fallback fetches a clip whole, telling how much has come; a refusal is said", async () => {
  const body = () =>
    new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(3));
        c.enqueue(new Uint8Array(4));
        c.close();
      },
    });
  const fetch = mock.method(globalThis, "fetch", async () => new Response(body(), { headers: { "content-length": "7", "content-type": "video/mp4" } }));
  try {
    const heard: [number, number][] = [];
    const blob = await download("/v.mp4", new AbortController().signal, (got, of) => heard.push([got, of]));
    assert.deepEqual(heard, [
      [3, 7],
      [7, 7],
    ]);
    assert.equal(blob.size, 7);
    assert.equal(blob.type, "video/mp4");

    fetch.mock.mockImplementation(async () => new Response("no", { status: 403, statusText: "Forbidden" }));
    await assert.rejects(download("/v.mp4", new AbortController().signal, () => undefined), /403 Forbidden/);
  } finally {
    fetch.mock.restore();
  }
});
