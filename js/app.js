// Entry point: loads the book, keeps app state, saves changes and re-renders.

import { createBook, allPictoIds, SLOTS_PER_STRIP, SENTENCE_MAX } from "./model.js";
import { loadBook, saveBook, getImageUrl, requestPersistence } from "./store.js";
import { renderBoard, attachBoardEvents } from "./board.js";

export const state = { book: null, mode: "kid", pageId: null };

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 300);
}
function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (state.book) saveBook(state.book).catch((e) => console.error("Speichern fehlgeschlagen", e));
}

// Replace the book. Returns false when the model reported a no-op.
export function update(newBook) {
  if (newBook === state.book) return false;
  state.book = newBook;
  if (!state.book.pages.some((p) => p.id === state.pageId)) state.pageId = state.book.pages[0].id;
  scheduleSave();
  render();
  return true;
}

export function setPage(pageId) {
  if (pageId === state.pageId) return;
  state.pageId = pageId;
  render();
}

export function setMode(mode) {
  state.mode = mode;
  render();
}

// Size cards so that SLOTS_PER_STRIP cards fit a strip and SENTENCE_MAX cards fit the sentence bar.
function layout() {
  const css = getComputedStyle(document.documentElement);
  const gap = parseFloat(css.getPropertyValue("--gap")) || 8;
  const barPad = parseFloat(css.getPropertyValue("--bar-pad")) || 12;
  const tabsW = parseFloat(css.getPropertyValue("--tabs-w")) || 132;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const strips = state.book.settings.stripCount;

  // Height: board padding + 5 cards with gaps around them, plus the sentence bar (one card high).
  const byHeight = (H - 2 * gap - (SLOTS_PER_STRIP + 1) * gap - 2 * barPad - 2 * gap) / (SLOTS_PER_STRIP + 1);
  // Width: every strip must fit beside the tab column.
  const byWidth = (W - tabsW - 6 * gap) / strips - 3 * gap;
  const card = Math.floor(Math.min(byHeight, byWidth, 170));

  // Sentence bar: 8 cards + speak button (1 card) + return button (0.8 card) + paddings/gaps.
  const fixed = 4 * barPad + 4 * gap + 4 * gap + (SENTENCE_MAX + 1) * gap;
  const scard = Math.floor(Math.min(card, (W - fixed) / (SENTENCE_MAX + 1.8)));

  const root = document.documentElement.style;
  root.setProperty("--card", card + "px");
  root.setProperty("--scard", scard + "px");
}

export function render() {
  layout();
  renderBoard(state);
}

async function start() {
  let book = null;
  try {
    book = await loadBook();
  } catch (e) {
    console.error("Laden fehlgeschlagen", e);
  }
  if (!book) {
    book = createBook();
    saveBook(book).catch(() => {});
  }
  state.book = book;
  state.pageId = book.pages[0].id;
  requestPersistence();
  attachBoardEvents({ getState: () => state, update, setPage });
  render();
  // Load all pictures once so re-renders can show them without flicker.
  await Promise.all(allPictoIds(book).map((id) => getImageUrl(id).catch(() => null)));
  render();
}

window.addEventListener("resize", () => state.book && render());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && saveTimer) flushSave();
});

start();
