import { test } from "node:test";
import assert from "node:assert/strict";
import { loadInitialBook } from "../js/startup.js";

test("a stored book is used as is", async () => {
  const stored = { pages: [{ id: "p" }], cards: {}, sentence: [] };
  assert.deepEqual(await loadInitialBook(async () => stored, () => assert.fail("must not create")), { book: stored, fresh: false });
});

test("nothing stored → a new book", async () => {
  const r = await loadInitialBook(async () => null, () => ({ new: true }));
  assert.deepEqual(r, { book: { new: true }, fresh: true });
});

test("a failed read is reported and never replaced by a new book", async () => {
  let created = false;
  await assert.rejects(
    loadInitialBook(async () => { throw new Error("Connection lost"); }, () => { created = true; }),
    { name: "LoadError" },
  );
  assert.equal(created, false);
});

test("sentence entries without a card are dropped on load", async () => {
  const stored = { pages: [{ id: "p" }], cards: { a: { id: "a" } }, sentence: ["a", "gone"] };
  assert.deepEqual((await loadInitialBook(async () => stored, () => null)).book.sentence, ["a"]);
});
