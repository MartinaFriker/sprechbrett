// Kid mode: renders the board (strips, tabs) and the sentence strip.

import { SLOTS_PER_STRIP, cardAt, isOnBoard } from "./model.js";
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
    root.append(tab);
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
    const gear = el("button", "gear", { type: "button", "aria-label": "Einstellungen" });
    gear.id = "btn-gear";
    gear.innerHTML = ICON_GEAR;
    root.replaceChildren(gear);
  }
}

export function renderBoard(state) {
  document.documentElement.style.setProperty("--board-bg", state.book.settings.background);
  renderToolbar(state);
  renderStrips(state);
  renderTabs(state);
  renderSentence(state);
  if (!$("btn-speak").firstChild) $("btn-speak").innerHTML = ICON_MOUTH;
  if (!$("btn-return-all").firstChild) $("btn-return-all").innerHTML = ICON_RETURN_ALL;
}
