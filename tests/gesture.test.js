import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyGesture, TAP_THRESHOLD_PX } from "../js/gesture.js";

test("small movements are taps, larger ones drags", () => {
  assert.equal(TAP_THRESHOLD_PX, 10);
  assert.equal(classifyGesture(3, 4), "tap");
  assert.equal(classifyGesture(0, 10), "tap");
  assert.equal(classifyGesture(8, 8), "drag");
  assert.equal(classifyGesture(-20, 0), "drag");
});
