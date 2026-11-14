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

test("an old book with the old orange default gets the new soft yellow once", async () => {
  const stored = { pages: [{ id: "p" }], cards: {}, sentence: [], settings: { background: "#F39200" } };
  const { book } = await loadInitialBook(async () => stored, () => null);
  assert.equal(book.settings.background, "#F9DC7C");
  assert.equal(book.settings.palette, 2);
});

test("an old book with a colour of its own keeps it", async () => {
  const stored = { pages: [{ id: "p" }], cards: {}, sentence: [], settings: { background: "#6BAA4B" } };
  const { book } = await loadInitialBook(async () => stored, () => null);
  assert.equal(book.settings.background, "#6BAA4B");
  assert.equal(book.settings.palette, 2);
});

test("orange chosen after the change stays orange", async () => {
  const stored = { pages: [{ id: "p" }], cards: {}, sentence: [], settings: { background: "#F39200", palette: 2 } };
  const { book } = await loadInitialBook(async () => stored, () => null);
  assert.equal(book.settings.background, "#F39200");
});
