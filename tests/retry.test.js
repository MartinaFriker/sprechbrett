import { test } from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "../js/retry.js";

test("withRetry returns the first result without resetting", async () => {
  let calls = 0, resets = 0;
  assert.equal(await withRetry(async () => { calls++; return 7; }, () => resets++), 7);
  assert.deepEqual([calls, resets], [1, 0]);
});

test("withRetry resets once and tries again after a failure", async () => {
  let calls = 0, resets = 0;
  const v = await withRetry(async () => { if (calls++ === 0) throw new Error("lost"); return "ok"; }, () => resets++);
  assert.deepEqual([v, calls, resets], ["ok", 2, 1]);
});

test("withRetry gives up after the second failure", async () => {
  let calls = 0;
  await assert.rejects(withRetry(async () => { calls++; throw new Error("e" + calls); }, () => {}), { message: "e2" });
  assert.equal(calls, 2);
});
