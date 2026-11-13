// Kid mode: renders the board (strips, tabs) and the sentence strip.

import {
  SLOTS_PER_STRIP, MAX_PAGES, cardAt, isOnBoard,
  takeToSentence, moveInSentence, returnCard, returnAll, moveCard, ModelError,
} from "./model.js";
import { classifyGesture } from "./gesture.js";
import { speakSequence, stopSpeaking } from "./speech.js";
import { cachedImageUrl, getImageUrl } from "./store.js";
import { ICON_MOUTH, ICON_RETURN_ALL, ICON_GEAR, ICON_PLUS } from "./icons.js";

const $ = (id) => document.getElementById(id);

function el(tag, className, attrs = {}) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// <img> for a pictogram, filled synchronously when the picture is already loaded.
export function pictoImg(pictoId) {
  const img = el("img", "", { alt: "", draggable: "false" });
  if (pictoId == null) return img;
  const url = cachedImageUrl(pictoId);
  if (url) img.src = url;
  else getImageUrl(pictoId).then((u) => { if (u) img.src = u; });
  return img;
}

export function cardEl(card) {
  const c = el("div", "card", { "data-card-id": card.id });
  const pic = el("div", "pic");
  pic.append(pictoImg(card.pictoId));
  const word = el("div", "word");
  word.textContent = card.word;
  c.append(pic, word);
  return c;
}

function renderStrips(state) {
  const { book, pageId, mode } = state;
  const root = $("strips");
  root.replaceChildren();
  for (let s = 0; s < book.settings.stripCount; s++) {
    const strip = el("div", "strip", { "data-strip": s });
    for (let i = 0; i < SLOTS_PER_STRIP; i++) {
      const slot = el("div", "slot", { "data-strip": s, "data-slot": i });
      const card = cardAt(book, pageId, s, i);
      if (card && isOnBoard(book, card.id)) {
        slot.append(cardEl(card));
      } else if (!card && mode === "parent") {
        const plus = el("button", "plus", { type: "button", "aria-label": "Karte hinzufügen" });
        plus.innerHTML = ICON_PLUS;
        slot.append(plus);
      }
      strip.append(slot);
    }
    root.append(strip);
  }
}

function renderTabs(state) {
  const { book, pageId } = state;
  const root = $("tabs");
  root.replaceChildren();
  for (const page of book.pages) {
    const tab = el("button", "tab" + (page.id === pageId ? " active" : ""), { type: "button", "data-page": page.id });
    if (page.iconPictoId != null) tab.append(pictoImg(page.iconPictoId));
    const name = el("span");
    name.textContent = page.name;
    tab.append(name);
    if (state.mode === "parent" && page.id === pageId) {
      const edit = el("span", "tab-edit");
      edit.textContent = "✎";
      tab.append(edit);
    }
    root.append(tab);
  }
  if (state.mode === "parent" && book.pages.length < MAX_PAGES) {
    const add = el("button", "tab add", { type: "button", "aria-label": "Seite hinzufügen" });
    add.textContent = "+ Seite";
    root.append(add);
  }
}

function renderSentence(state) {
  const { book } = state;
  const root = $("sentence");
  root.replaceChildren(...book.sentence.map((id) => cardEl(book.cards[id])));
}

function renderToolbar(state) {
  const root = $("toolbar");
  if (state.mode === "kid") {
    const gear = el("button", "gear", { type: "button", "aria-label": "Eltern-Bereich", id: "btn-gear" });
    gear.innerHTML = ICON_GEAR;
    root.replaceChildren(gear);
    return;
  }
  const settings = el("button", "pill", { type: "button", id: "btn-settings" });
  settings.textContent = "Einstellungen";
  const done = el("button", "pill primary", { type: "button", id: "btn-done" });
  done.textContent = "Fertig";
  const items = [done, settings];
  if (state.showBackupBanner) {
    const banner = el("div", "banner");
    banner.textContent = "Seit über 30 Tagen keine Sicherung. ";
    const now = el("button", "pill", { type: "button", id: "btn-backup-now" });
    now.textContent = "Jetzt sichern";
    const close = el("button", "pill", { type: "button", id: "btn-banner-close", "aria-label": "Hinweis schliessen" });
    close.textContent = "✕";
    banner.append(now, close);
    items.push(banner);
  }
  root.replaceChildren(...items);
}

export function renderBoard(state) {
  document.documentElement.style.setProperty("--board-bg", state.book.settings.background);
  document.body.classList.toggle("parent-mode", state.mode === "parent");
  renderToolbar(state);
  renderStrips(state);
  renderTabs(state);
  renderSentence(state);
  if (!$("btn-speak").firstChild) $("btn-speak").innerHTML = ICON_MOUTH;
  if (!$("btn-return-all").firstChild) $("btn-return-all").innerHTML = ICON_RETURN_ALL;
}

// ---------- Interaction: tap and drag ----------

let drag = null; // the one active pointer gesture; other fingers are ignored

function shakeSentence() {
  const s = $("sentence");
  s.classList.remove("shake");
  void s.offsetWidth; // restart the animation
  s.classList.add("shake");
}

// Index in the sentence where a card dropped at x would land (ignoring the dragged card itself).
function sentenceIndexAt(x, excludeId) {
  const cards = [...$("sentence").querySelectorAll(".card")].filter((c) => c.dataset.cardId !== excludeId);
  const i = cards.findIndex((c) => {
    const r = c.getBoundingClientRect();
    return x < r.left + r.width / 2;
  });
  return i < 0 ? cards.length : i;
}

function showDropMarker(index, excludeId) {
  removeDropMarker();
  const cards = [...$("sentence").querySelectorAll(".card")].filter((c) => c.dataset.cardId !== excludeId);
  const marker = el("div", "drop-marker");
  if (index < cards.length) cards[index].before(marker);
  else $("sentence").append(marker);
}

function removeDropMarker() {
  document.querySelectorAll(".drop-marker").forEach((m) => m.remove());
}

function zoneAt(x, y) {
  const t = document.elementFromPoint(x, y);
  if (!t) return { zone: null };
  if (t.closest("#sentence-bar")) return { zone: "sentence" };
  const slot = t.closest(".slot");
  if (slot) return { zone: "board", strip: +slot.dataset.strip, slot: +slot.dataset.slot };
  if (t.closest("#strips")) return { zone: "board" };
  return { zone: null };
}

function flyBack(d) {
  const r = d.srcEl.getBoundingClientRect();
  const f = d.floatEl;
  f.classList.add("flying-back");
  f.style.left = r.left + "px";
  f.style.top = r.top + "px";
  setTimeout(() => {
    f.remove();
    d.srcEl.classList.remove("ghost");
  }, 220);
}

function startFloating(d, x, y) {
  const r = d.srcEl.getBoundingClientRect();
  d.offsetX = x - r.left;
  d.offsetY = y - r.top;
  const f = d.srcEl.cloneNode(true);
  f.classList.add("floating");
  f.style.width = r.width + "px";
  f.style.height = r.height + "px";
  f.style.setProperty("--size", r.width + "px");
  document.body.append(f);
  d.floatEl = f;
  d.srcEl.classList.add("ghost");
  moveFloating(d, x, y);
}

function moveFloating(d, x, y) {
  d.floatEl.style.left = x - d.offsetX + "px";
  d.floatEl.style.top = y - d.offsetY + "px";
}

export function attachBoardEvents(api) {
  const { getState, update } = api;

  // Apply a model change; returns true when something changed.
  const apply = (fn) => {
    try {
      return update(fn(getState().book));
    } catch (e) {
      if (e instanceof ModelError) { api.onError?.(e.message); return false; }
      throw e;
    }
  };

  function onTap(d) {
    const { mode } = getState();
    if (mode === "parent") {
      if (d.from === "board") api.onEditCard?.(d.cardId);
      return;
    }
    if (d.from === "board") {
      stopSpeaking();
      if (!apply((b) => takeToSentence(b, d.cardId))) shakeSentence();
    } else {
      stopSpeaking();
      apply((b) => returnCard(b, d.cardId));
    }
  }

  function onDrop(d, x, y) {
    const { mode } = getState();
    const target = zoneAt(x, y);
    let changed = false;
    let refused = false;
    if (mode === "parent") {
      if (d.from === "board" && target.zone === "board" && target.slot !== undefined) {
        changed = apply((b) => moveCard(b, d.cardId, target.strip, target.slot));
      }
    } else if (target.zone === "sentence") {
      stopSpeaking();
      const index = sentenceIndexAt(x, d.cardId);
      if (d.from === "board") {
        changed = apply((b) => takeToSentence(b, d.cardId, index));
        refused = !changed;
      } else {
        changed = apply((b) => moveInSentence(b, d.fromIndex, index));
      }
    } else if (target.zone === "board" && d.from === "sentence") {
      stopSpeaking();
      changed = apply((b) => returnCard(b, d.cardId));
    }
    if (changed) d.floatEl.remove();
    else flyBack(d);
    if (refused) shakeSentence();
  }

  document.addEventListener("pointerdown", (e) => {
    if (drag) return; // a second finger while dragging is ignored
    const cardEl = e.target.closest(".card");
    if (!cardEl || cardEl.classList.contains("floating")) return;
    const inSentence = !!cardEl.closest("#sentence");
    const inBoard = !!cardEl.closest("#strips");
    if (!inSentence && !inBoard) return;
    e.preventDefault();
    const cardId = cardEl.dataset.cardId;
    drag = {
      pointerId: e.pointerId,
      cardId,
      from: inSentence ? "sentence" : "board",
      fromIndex: inSentence ? getState().book.sentence.indexOf(cardId) : -1,
      startX: e.clientX,
      startY: e.clientY,
      srcEl: cardEl,
      floatEl: null,
    };
  });

  document.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    if (!drag.floatEl) {
      if (classifyGesture(e.clientX - drag.startX, e.clientY - drag.startY) === "tap") return;
      startFloating(drag, e.clientX, e.clientY);
    }
    moveFloating(drag, e.clientX, e.clientY);
    const { mode } = getState();
    if (mode === "kid" && zoneAt(e.clientX, e.clientY).zone === "sentence") {
      showDropMarker(sentenceIndexAt(e.clientX, drag.cardId), drag.cardId);
    } else {
      removeDropMarker();
    }
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    removeDropMarker();
    if (e.type === "pointercancel") {
      if (d.floatEl) flyBack(d);
      return;
    }
    if (!d.floatEl) onTap(d);
    else onDrop(d, e.clientX, e.clientY);
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);

  $("tabs").addEventListener("click", (e) => {
    const { mode, pageId } = getState();
    if (e.target.closest(".tab.add")) { api.onAddPage?.(); return; }
    const tab = e.target.closest(".tab[data-page]");
    if (!tab) return;
    if (mode === "parent" && tab.dataset.page === pageId) api.onEditPage?.(pageId);
    else api.setPage(tab.dataset.page);
  });

  $("strips").addEventListener("click", (e) => {
    const plus = e.target.closest(".plus");
    if (!plus || getState().mode !== "parent") return;
    const slot = plus.closest(".slot");
    api.onAddCard?.(+slot.dataset.strip, +slot.dataset.slot);
  });

  $("btn-speak").addEventListener("click", () => {
    const { book } = getState();
    if (!book.sentence.length) return;
    const highlight = (i) => {
      $("sentence").querySelectorAll(".card").forEach((c, j) => c.classList.toggle("speaking", j === i));
    };
    speakSequence(book.sentence.map((id) => book.cards[id].word), {
      onWord: highlight,
      onDone: () => highlight(-1),
    });
  });

  $("btn-return-all").addEventListener("click", () => {
    stopSpeaking();
    apply(returnAll);
  });
}
