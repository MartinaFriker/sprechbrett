import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SENTENCE_MAX, MAX_PAGES, ModelError,
  createBook, cardAt, isOnBoard, takeToSentence, moveInSentence,
  returnCard, returnAll, addCard, updateCard, moveCard, deleteCard,
  addPage, renamePage, movePage, deletePage,
  setStripCount, setBackground, markBackedUp, backupOverdue, allPictoIds,
} from "../js/model.js";

// Helper: a book with `n` cards on the first page, filling strips top to bottom.
function bookWithCards(n) {
  let book = createBook();
  const pageId = book.pages[0].id;
  const ids = [];
  for (let i = 0; i < n; i++) {
    const r = addCard(book, { pageId, strip: Math.floor(i / 5), slot: i % 5, word: "W" + i, pictoId: 100 + i });
    book = r.book;
    ids.push(r.cardId);
  }
  return { book, pageId, ids };
}

test("createBook: one page, defaults", () => {
  const b = createBook();
  assert.equal(b.pages.length, 1);
  assert.equal(b.pages[0].name, "Seite 1");
  assert.equal(b.pages[0].iconPictoId, null);
  assert.equal(b.settings.stripCount, 4);
  assert.equal(b.settings.background, "#F39200");
  assert.deepEqual(b.cards, {});
  assert.deepEqual(b.sentence, []);
  assert.equal(b.lastBackup, null);
});

test("takeToSentence appends, leaves a gap, keeps home, does not mutate", () => {
  const { book, pageId, ids } = bookWithCards(2);
  const before = structuredClone(book);
  const b2 = takeToSentence(takeToSentence(book, ids[0]), ids[1]);
  assert.deepEqual(b2.sentence, [ids[0], ids[1]]);
  assert.equal(isOnBoard(b2, ids[0]), false);
  assert.equal(cardAt(b2, pageId, 0, 0).id, ids[0]);
  assert.deepEqual(book, before);
});

test("takeToSentence with index inserts at that position", () => {
  const { book, ids } = bookWithCards(2);
  const b2 = takeToSentence(takeToSentence(book, ids[0]), ids[1], 0);
  assert.deepEqual(b2.sentence, [ids[1], ids[0]]);
});

test("takeToSentence of a card already in the sentence is a no-op", () => {
  const { book, ids } = bookWithCards(1);
  const b2 = takeToSentence(book, ids[0]);
  assert.equal(takeToSentence(b2, ids[0]), b2);
});

test("takeToSentence refuses a card when the sentence is full", () => {
  let { book, ids } = bookWithCards(SENTENCE_MAX + 1);
  for (let i = 0; i < SENTENCE_MAX; i++) book = takeToSentence(book, ids[i]);
  const extra = ids[SENTENCE_MAX];
  assert.equal(takeToSentence(book, extra), book);
  assert.equal(isOnBoard(book, extra), true);
});

test("moveInSentence reorders", () => {
  let { book, ids } = bookWithCards(3);
  for (const id of ids) book = takeToSentence(book, id);
  assert.deepEqual(moveInSentence(book, 0, 2).sentence, [ids[1], ids[2], ids[0]]);
});

test("returnCard and returnAll put cards back on the board", () => {
  let { book, ids } = bookWithCards(3);
  for (const id of ids) book = takeToSentence(book, id);
  const b2 = returnCard(book, ids[1]);
  assert.deepEqual(b2.sentence, [ids[0], ids[2]]);
  assert.equal(isOnBoard(b2, ids[1]), true);
  const b3 = returnAll(book);
  assert.deepEqual(b3.sentence, []);
  assert.ok(ids.every((id) => isOnBoard(b3, id)));
});

test("addCard rejects occupied or out-of-range slots", () => {
  const { book, pageId } = bookWithCards(1);
  const card = { pageId, word: "x", pictoId: 1 };
  assert.throws(() => addCard(book, { ...card, strip: 0, slot: 0 }), ModelError);
  assert.throws(() => addCard(book, { ...card, strip: 0, slot: 5 }), ModelError);
  assert.throws(() => addCard(book, { ...card, strip: 4, slot: 0 }), ModelError);
});

test("updateCard changes word and picture", () => {
  const { book, ids } = bookWithCards(1);
  const b2 = updateCard(book, ids[0], { word: "Apfel", pictoId: 2462 });
  assert.equal(b2.cards[ids[0]].word, "Apfel");
  assert.equal(b2.cards[ids[0]].pictoId, 2462);
});

test("moveCard onto an occupied slot swaps homes", () => {
  const { book, pageId, ids } = bookWithCards(2);
  const b2 = moveCard(book, ids[0], 0, 1);
  assert.equal(cardAt(b2, pageId, 0, 1).id, ids[0]);
  assert.equal(cardAt(b2, pageId, 0, 0).id, ids[1]);
  const b3 = moveCard(b2, ids[0], 2, 3);
  assert.equal(cardAt(b3, pageId, 2, 3).id, ids[0]);
  assert.equal(cardAt(b3, pageId, 0, 1), null);
});

test("deleteCard also removes it from the sentence", () => {
  const { book, ids } = bookWithCards(1);
  const b2 = deleteCard(takeToSentence(book, ids[0]), ids[0]);
  assert.equal(b2.cards[ids[0]], undefined);
  assert.deepEqual(b2.sentence, []);
});

test("addPage allows at most 10 pages", () => {
  let book = createBook();
  for (let i = 0; i < MAX_PAGES - 1; i++) book = addPage(book, "P" + i).book;
  assert.equal(book.pages.length, 10);
  assert.throws(() => addPage(book, "zu viel"), { name: "ModelError", message: "Höchstens 10 Seiten." });
});

test("renamePage sets name and icon", () => {
  const book = createBook();
  const b2 = renamePage(book, book.pages[0].id, "Essen", 2462);
  assert.equal(b2.pages[0].name, "Essen");
  assert.equal(b2.pages[0].iconPictoId, 2462);
});

test("deletePage removes its cards; the last page cannot be deleted", () => {
  let { book, pageId, ids } = bookWithCards(2);
  book = takeToSentence(book, ids[0]);
  const r = addPage(book, "Zwei");
  const b2 = deletePage(r.book, pageId);
  assert.equal(b2.pages.length, 1);
  assert.deepEqual(b2.cards, {});
  assert.deepEqual(b2.sentence, []);
  assert.throws(() => deletePage(b2, b2.pages[0].id), ModelError);
});

test("movePage reorders pages", () => {
  let book = createBook();
  book = addPage(book, "B").book;
  book = addPage(book, "C").book;
  assert.deepEqual(movePage(book, 2, 0).pages.map((p) => p.name), ["C", "Seite 1", "B"]);
});

test("setStripCount refuses to drop a strip with cards, clamps range", () => {
  const book = createBook();
  const withCard = addCard(book, { pageId: book.pages[0].id, strip: 3, slot: 0, word: "x", pictoId: 1 }).book;
  assert.throws(() => setStripCount(withCard, 2), {
    name: "ModelError",
    message: "Streifen 4 ist nicht leer. Bitte zuerst die Karten dort löschen oder verschieben.",
  });
  assert.equal(setStripCount(book, 2).settings.stripCount, 2);
  assert.equal(setStripCount(book, 0).settings.stripCount, 1);
  assert.equal(setStripCount(book, 99).settings.stripCount, 8);
});

test("setBackground changes the colour", () => {
  assert.equal(setBackground(createBook(), "#123456").settings.background, "#123456");
});

test("backupOverdue", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  const day = 24 * 3600 * 1000;
  assert.equal(backupOverdue(createBook(), now), false);
  const { book } = bookWithCards(1);
  assert.equal(backupOverdue(book, now), true);
  assert.equal(backupOverdue(markBackedUp(book, new Date(now - 29 * day).toISOString()), now), false);
  assert.equal(backupOverdue(markBackedUp(book, new Date(now - 31 * day).toISOString()), now), true);
});

test("allPictoIds collects unique ids from cards and page icons", () => {
  let { book, pageId } = bookWithCards(2);
  book = renamePage(book, pageId, "Essen", 100);
  book = addPage(book, "leer").book;
  assert.deepEqual(allPictoIds(book).sort(), [100, 101]);
});
