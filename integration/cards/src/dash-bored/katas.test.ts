// The agent's column: what is read out of a ZenOS-AI Kata cabinet, and what is left in it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { filed, lapsed } from "./katas.ts";

const AT = "2026-11-15T16:52:45+00:00";
const kata = (over: object) => ({ value: { subjective: null, general_inference: null, attention: null, error: null, urgency: 0, confidence: 0.9, watchlist: [], ...over }, timestamp: AT });
const cabinet = (variables: object) => ({ attributes: { variables } });

test("a Kata that says something is a piece, named as the Dojo names it, the most urgent first; bookkeeping, templates, Katas of nulls and ZenOS's accounts of itself are left out", () => {
  const desk = filed(
    cabinet({
      _label_index: {},
      kata_template: { value: { structure: { watchlist: [] }, example: {} } },
      zen_scheduler: { value: { recent_runs: [] } },
      room_manager: kata({ confidence: 0 }),
      security_manager: kata({ general_inference: "Several rooms have lights on.", attention: "The garage door is open.", urgency: 4, confidence: 0.4 }),
      zen_system: kata({ subjective: "The pipeline is healthy." }),
      trapper_keeper: kata({ general_inference: "No ambient katas." }),
      taskmaster: kata({ subjective: " Nothing is due. " }),
    }),
    "Friday",
    cabinet({ security_manager: { value: { friendly_name: "Security", pipeline_tier: "keeper" } }, trapper_keeper: { value: { pipeline_tier: "system" } } }),
  )!;
  assert.equal(desk.by, "Friday");
  assert.deepEqual(desk.pieces.map((p) => [p.name, p.text, p.attention, p.urgency, p.unsure]), [
    ["Security", "Several rooms have lights on.", "The garage door is open.", 4, true],
    ["Taskmaster", "Nothing is due.", undefined, 0, false],
  ]);
  assert.equal(desk.pieces[0].at, Date.parse(AT));
});

test("a Kata with only its reason for saying nothing is printed as that", () => {
  const [piece] = filed(cabinet({ locks: kata({ error: "No locks are labelled." }) }))!.pieces;
  assert.deepEqual([piece.text, piece.failed], ["No locks are labelled.", true]);
});

test("the whole-house summary is the lead, with its errors, and lapses an hour after it was written", () => {
  const { lead, by } = filed(
    cabinet({ zen_summary: { value: { zen_summary: { summary: "Home stable.", objective: "Keep it so.", urgency: 1, confidence: 0.9, errors: ["room_manager: no snapshot", ""], timestamp: "2026-11-15T16:52:51Z" } }, timestamp: AT } }),
    "unknown",
  )!;
  assert.equal(by, undefined);
  assert.deepEqual([lead!.text, lead!.objective, lead!.errors, lead!.unsure], ["Home stable.", "Keep it so.", ["room_manager: no snapshot"], false]);
  assert.equal(lapsed(lead!, lead!.at + 59 * 60_000), false);
  assert.equal(lapsed(lead!, lead!.at + 61 * 60_000), true);
});

test("there is no column without a cabinet, or with one that says nothing", () => {
  assert.equal(filed(undefined), undefined);
  assert.equal(filed({ attributes: {} }), undefined);
  assert.equal(filed(cabinet({ room_manager: kata({}), zen_summary: { value: { zen_summary: { summary: null } } } })), undefined);
});
