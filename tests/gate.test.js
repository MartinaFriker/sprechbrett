import { test } from "node:test";
import assert from "node:assert/strict";
import { makeChallenge } from "../js/gate.js";

// Stub random source returning a fixed sequence.
const seq = (...values) => { let i = 0; return () => values[i++]; };

test("addition challenge from a fixed random sequence", () => {
  // 0.1 < 0.5 → addition; operands map 0..1 onto 2..9
  const c = makeChallenge(seq(0.1, 0.0, 0.99));
  assert.deepEqual(c, { question: "2 + 9 = ?", answer: 11 });
});

test("multiplication challenge from a fixed random sequence", () => {
  // 0.9 >= 0.5 → multiplication; operands map 0..1 onto 2..6
  const c = makeChallenge(seq(0.9, 0.5, 0.99));
  assert.deepEqual(c, { question: "4 × 6 = ?", answer: 24 });
});

test("random challenges stay small and well formed", () => {
  for (let i = 0; i < 1000; i++) {
    const { question, answer } = makeChallenge();
    assert.match(question, /^\d \+ \d = \?$|^\d × \d = \?$/);
    assert.ok(Number.isInteger(answer) && answer >= 4 && answer <= 36, question);
  }
});
