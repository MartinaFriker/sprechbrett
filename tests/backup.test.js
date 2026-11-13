import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeBackup, parseBackup } from "../js/backup.js";
import { createBook, addCard } from "../js/model.js";

const NOT_A_BACKUP = { message: "Diese Datei ist keine Sprechbrett-Sicherung." };

test("backup round trip keeps book and images", () => {
  let book = createBook();
  book = addCard(book, { pageId: book.pages[0].id, strip: 0, slot: 0, word: "Apfel", pictoId: 2462 }).book;
  const images = { 2462: "data:image/png;base64,AA==" };
  const text = serializeBackup(book, images, new Date("2026-11-13T12:00:00Z"));
  const parsed = JSON.parse(text);
  assert.equal(parsed.app, "sprechbrett");
  assert.equal(parsed.version, 1);
  assert.equal(parsed.exportedAt, "2026-11-13T12:00:00.000Z");
  assert.deepEqual(parseBackup(text), { book, images });
});

test("parseBackup rejects anything else", () => {
  assert.throws(() => parseBackup("nope"), NOT_A_BACKUP);
  assert.throws(() => parseBackup('{"app":"other"}'), NOT_A_BACKUP);
  assert.throws(() => parseBackup('{"app":"sprechbrett","book":{"pages":[]}}'), NOT_A_BACKUP);
});

import { collectImages } from "../js/backup.js";

test("collectImages gathers data URLs and reports missing pictures", async () => {
  const store = { 1: "data:a", 3: "data:c" };
  const r = await collectImages([1, 2, 3], async (id) => store[id] ?? null);
  assert.deepEqual(r, { images: { 1: "data:a", 3: "data:c" }, missing: [2] });
});
