// Entry point: loads the book, keeps app state, saves changes and re-renders.

import { createBook, allPictoIds } from "./model.js";
import { loadBook, saveBook, getImageUrl, requestPersistence } from "./store.js";
import { renderBoard, attachBoardEvents, isDragging } from "./board.js";
import { initParent, toast } from "./parent.js";
import { cardSizes } from "./layout.js";
import { loadInitialBook } from "./startup.js";

export const state = { book: null, mode: "kid", pageId: null, showBackupBanner: false, renderPending: false };

const TOOLBAR_H = 48;

let saveTimer = null;
let lastSaveWarning = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 300);
}
function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!state.book) return;
  saveBook(state.book).catch((e) => {
    console.error("Speichern fehlgeschlagen", e);
    // Make a failing save visible, but do not repeat the warning on every tap.
    if (Date.now() - lastSaveWarning > 10000) {
      lastSaveWarning = Date.now();
      toast("Speichern fehlgeschlagen. Bitte die App schliessen und neu öffnen.");
    }
  });
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

// Size cards from the space #app really has (inside the safe-area insets).
function layout() {
  const app = document.getElementById("app");
  const cs = getComputedStyle(app);
  const width = app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const height = app.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const toolbar = state.mode === "parent" ? TOOLBAR_H : 0;
  const { card, scard } = cardSizes({ width, height, strips: state.book.settings.stripCount, toolbar });
  const root = document.documentElement.style;
  root.setProperty("--card", card + "px");
  root.setProperty("--scard", scard + "px");
  root.setProperty("--toolbar-h", toolbar + "px");
}

export function render() {
  // Never rebuild the board under a finger that is dragging a card; render when it ends.
  if (isDragging()) {
    state.renderPending = true;
    return;
  }
  state.renderPending = false;
  layout();
  renderBoard(state);
}

function showLoadError() {
  const box = document.createElement("div");
  box.className = "fatal";
  box.textContent = "Das Buch konnte nicht geladen werden. Bitte die App ganz schliessen und neu öffnen. " +
    "Hilft das nicht: im Eltern-Bereich eine Sicherung laden.";
  document.body.append(box);
}

async function start() {
  let loaded;
  try {
    loaded = await loadInitialBook(loadBook, createBook);
  } catch (e) {
    // Do not create or save anything: an empty book would overwrite the real one.
    console.error(e.cause ?? e);
    showLoadError();
    return;
  }
  const { book, fresh } = loaded;
  if (fresh) saveBook(book).catch(() => {});
  state.book = book;
  state.pageId = book.pages[0].id;
  requestPersistence();
  const api = { getState: () => state, update, setPage, setMode, render };
  attachBoardEvents(api);
  initParent(api);
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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Service Worker nicht registriert", e));
}
