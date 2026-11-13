// Book model: pages, cards, the sentence strip and every operation on them.
// All functions are pure: they never mutate the given book and return a new one.
// A harmless no-op returns the very same book object so callers can detect it.

export const SLOTS_PER_STRIP = 5;
export const MIN_STRIPS = 1;
export const MAX_STRIPS = 8;
export const MAX_PAGES = 10;
export const SENTENCE_MAX = 8;

export class ModelError extends Error {
  constructor(message) {
    super(message);
    this.name = "ModelError";
  }
}

// crypto.randomUUID only exists in secure contexts (https/localhost); fall back to getRandomValues.
export function newId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const clone = (book) => structuredClone(book);

// Own photos use string ids "own-<uuid>"; ARASAAC pictograms keep their numeric ids.
export function ownPictureId() {
  return "own-" + newId();
}
export function isOwnPicture(id) {
  return typeof id === "string" && id.startsWith("own-");
}

export function createBook() {
  return {
    version: 1,
    settings: { background: "#F39200", stripCount: 4, stripColor: "white" },
    pages: [{ id: newId(), name: "Seite 1", iconPictoId: null }],
    cards: {},
    sentence: [],
    lastBackup: null,
  };
}

export function cardAt(book, pageId, strip, slot) {
  for (const c of Object.values(book.cards)) {
    if (c.pageId === pageId && c.strip === strip && c.slot === slot) return c;
  }
  return null;
}

export function isOnBoard(book, cardId) {
  return cardId in book.cards && !book.sentence.includes(cardId);
}

export function takeToSentence(book, cardId, index) {
  if (!(cardId in book.cards)) return book;
  if (book.sentence.includes(cardId)) return book;
  if (book.sentence.length >= SENTENCE_MAX) return book;
  const b = clone(book);
  const at = index === undefined ? b.sentence.length : Math.max(0, Math.min(index, b.sentence.length));
  b.sentence.splice(at, 0, cardId);
  return b;
}

export function moveInSentence(book, fromIndex, toIndex) {
  const n = book.sentence.length;
  if (fromIndex < 0 || fromIndex >= n) return book;
  const to = Math.max(0, Math.min(toIndex, n - 1));
  if (to === fromIndex) return book;
  const b = clone(book);
  const [id] = b.sentence.splice(fromIndex, 1);
  b.sentence.splice(to, 0, id);
  return b;
}

export function returnCard(book, cardId) {
  if (!book.sentence.includes(cardId)) return book;
  const b = clone(book);
  b.sentence = b.sentence.filter((id) => id !== cardId);
  return b;
}

export function returnAll(book) {
  if (book.sentence.length === 0) return book;
  const b = clone(book);
  b.sentence = [];
  return b;
}

function checkSlot(book, pageId, strip, slot) {
  if (!book.pages.some((p) => p.id === pageId)) throw new ModelError("Diese Seite gibt es nicht.");
  if (!Number.isInteger(strip) || strip < 0 || strip >= book.settings.stripCount ||
      !Number.isInteger(slot) || slot < 0 || slot >= SLOTS_PER_STRIP) {
    throw new ModelError("Diesen Platz gibt es nicht.");
  }
}

export function addCard(book, { pageId, strip, slot, word, pictoId }) {
  checkSlot(book, pageId, strip, slot);
  if (cardAt(book, pageId, strip, slot)) throw new ModelError("Dieser Platz ist schon besetzt.");
  const b = clone(book);
  const cardId = newId();
  b.cards[cardId] = { id: cardId, word, pictoId, pageId, strip, slot };
  return { book: b, cardId };
}

export function updateCard(book, cardId, { word, pictoId }) {
  if (!(cardId in book.cards)) return book;
  const b = clone(book);
  if (word !== undefined) b.cards[cardId].word = word;
  if (pictoId !== undefined) b.cards[cardId].pictoId = pictoId;
  return b;
}

export function moveCard(book, cardId, strip, slot) {
  const card = book.cards[cardId];
  if (!card) return book;
  checkSlot(book, card.pageId, strip, slot);
  if (card.strip === strip && card.slot === slot) return book;
  const other = cardAt(book, card.pageId, strip, slot);
  const b = clone(book);
  if (other) {
    b.cards[other.id].strip = card.strip;
    b.cards[other.id].slot = card.slot;
  }
  b.cards[cardId].strip = strip;
  b.cards[cardId].slot = slot;
  return b;
}

export function deleteCard(book, cardId) {
  if (!(cardId in book.cards)) return book;
  const b = clone(book);
  delete b.cards[cardId];
  b.sentence = b.sentence.filter((id) => id !== cardId);
  return b;
}

export function addPage(book, name) {
  if (book.pages.length >= MAX_PAGES) throw new ModelError(`Höchstens ${MAX_PAGES} Seiten.`);
  const b = clone(book);
  const pageId = newId();
  b.pages.push({ id: pageId, name, iconPictoId: null });
  return { book: b, pageId };
}

export function renamePage(book, pageId, name, iconPictoId) {
  const i = book.pages.findIndex((p) => p.id === pageId);
  if (i < 0) return book;
  const b = clone(book);
  b.pages[i].name = name;
  if (iconPictoId !== undefined) b.pages[i].iconPictoId = iconPictoId;
  return b;
}

export function movePage(book, fromIndex, toIndex) {
  const n = book.pages.length;
  if (fromIndex < 0 || fromIndex >= n) return book;
  const to = Math.max(0, Math.min(toIndex, n - 1));
  if (to === fromIndex) return book;
  const b = clone(book);
  const [p] = b.pages.splice(fromIndex, 1);
  b.pages.splice(to, 0, p);
  return b;
}

export function deletePage(book, pageId) {
  if (!book.pages.some((p) => p.id === pageId)) return book;
  if (book.pages.length <= 1) throw new ModelError("Die letzte Seite kann nicht gelöscht werden.");
  const b = clone(book);
  b.pages = b.pages.filter((p) => p.id !== pageId);
  for (const c of Object.values(b.cards)) {
    if (c.pageId === pageId) delete b.cards[c.id];
  }
  b.sentence = b.sentence.filter((id) => id in b.cards);
  return b;
}

export function setStripCount(book, n) {
  const count = Math.max(MIN_STRIPS, Math.min(MAX_STRIPS, Math.round(n)));
  if (count === book.settings.stripCount) return book;
  // Refuse to drop strips that still hold cards; report the first one (1-based).
  const blocked = Object.values(book.cards)
    .filter((c) => c.strip >= count)
    .map((c) => c.strip);
  if (blocked.length) {
    const strip = Math.min(...blocked) + 1;
    throw new ModelError(`Streifen ${strip} ist nicht leer. Bitte zuerst die Karten dort löschen oder verschieben.`);
  }
  const b = clone(book);
  b.settings.stripCount = count;
  return b;
}

export function setBackground(book, color) {
  if (book.settings.background === color) return book;
  const b = clone(book);
  b.settings.background = color;
  return b;
}

export const STRIP_COLORS = ["white", "black"];

// Books saved before this setting existed have no stripColor: they keep white strips.
export function stripColor(book) {
  return book.settings.stripColor ?? "white";
}

export function setStripColor(book, color) {
  if (!STRIP_COLORS.includes(color)) throw new ModelError("Diese Streifenfarbe gibt es nicht.");
  if (stripColor(book) === color) return book;
  const b = clone(book);
  b.settings.stripColor = color;
  return b;
}

export function markBackedUp(book, isoString) {
  const b = clone(book);
  b.lastBackup = isoString;
  return b;
}

export function backupOverdue(book, now, days = 30) {
  if (Object.keys(book.cards).length === 0) return false;
  if (!book.lastBackup) return true;
  return now - new Date(book.lastBackup) > days * 24 * 3600 * 1000;
}

export function allPictoIds(book) {
  const ids = new Set();
  for (const c of Object.values(book.cards)) if (c.pictoId != null) ids.add(c.pictoId);
  for (const p of book.pages) if (p.iconPictoId != null) ids.add(p.iconPictoId);
  return [...ids];
}
