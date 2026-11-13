// Parent mode: maths gate, card and page dialogs, settings and backup.

import {
  MAX_PAGES, MIN_STRIPS, MAX_STRIPS, ModelError,
  returnAll, addCard, updateCard, deleteCard, addPage, renamePage, movePage, deletePage,
  setStripCount, setBackground, markBackedUp, backupOverdue, allPictoIds,
} from "./model.js";
import { makeChallenge } from "./gate.js";
import { searchPictograms, fetchPictogram, imageUrl } from "./arasaac.js";
import { serializeBackup, parseBackup } from "./backup.js";
import { putImage, putImageDataUrl, hasImage, getImageUrl, getImageDataUrl } from "./store.js";
import { stopSpeaking } from "./speech.js";
import { pictoImg } from "./board.js";

export const ATTRIBUTION = "Piktogramme: Sergio Palao, ARASAAC (arasaac.org), Lizenz CC BY-NC-SA 4.0";
const SWATCHES = ["#F39200", "#F6B800", "#E4572E", "#4A90C8", "#6BAA4B"];

// ---------- Small DOM helpers ----------

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(text, className = "btn", onClick) {
  const b = el("button", className, text);
  b.type = "button";
  if (onClick) b.addEventListener("click", onClick);
  return b;
}

function modal(title) {
  const dlg = el("dialog", "dlg");
  const h = el("h2", "", title);
  const body = el("div", "dlg-body");
  const actions = el("div", "dlg-actions");
  dlg.append(h, body, actions);
  document.body.append(dlg);
  dlg.addEventListener("close", () => dlg.remove());
  dlg.showModal();
  return { dlg, body, actions, close: () => dlg.close() };
}

export function toast(message) {
  const t = el("div", "toast", message);
  document.body.append(t);
  setTimeout(() => t.remove(), 2800);
}

// Make sure a pictogram is stored on the device (for offline use) and loaded.
async function ensureImage(id) {
  if (!(await hasImage(id))) await putImage(id, await fetchPictogram(id));
  await getImageUrl(id);
}

// Search field + result grid. Calls onPick({ id, keyword }) when a picture is chosen.
function searchPanel(onPick) {
  const wrap = el("div", "search");
  const form = el("form", "search-form");
  const input = el("input");
  input.type = "search";
  input.placeholder = "Suchwort, z. B. Apfel";
  input.autocomplete = "off";
  input.enterKeyHint = "search";
  const go = el("button", "btn primary", "Suchen");
  go.type = "submit";
  form.append(input, go);
  const status = el("div", "search-status");
  const grid = el("div", "search-grid");
  wrap.append(form, status, grid);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const term = input.value.trim();
    if (!term) return;
    input.blur();
    status.textContent = "Suche …";
    grid.replaceChildren();
    try {
      const results = await searchPictograms(term);
      status.textContent = results.length ? "" : "Nichts gefunden.";
      for (const r of results) {
        const b = el("button", "result");
        b.type = "button";
        const img = el("img");
        img.loading = "lazy";
        img.alt = r.keyword;
        img.src = imageUrl(r.id);
        b.append(img);
        b.addEventListener("click", () => {
          grid.querySelectorAll(".result.selected").forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
          onPick(r);
        });
        grid.append(b);
      }
    } catch (err) {
      status.textContent = err.message;
    }
  });
  return { wrap, input };
}

// ---------- Gate ----------

export function openGate(onSuccess) {
  const m = modal("Für Erwachsene");
  let challenge = makeChallenge();
  const q = el("p", "gate-question", challenge.question);
  const input = el("input", "gate-input");
  input.type = "text";
  input.inputMode = "numeric";
  input.pattern = "[0-9]*";
  input.autocomplete = "off";
  const msg = el("p", "dlg-msg");
  m.body.append(q, input, msg);
  const check = () => {
    if (Number(input.value.trim()) === challenge.answer && input.value.trim() !== "") {
      m.close();
      onSuccess();
    } else {
      challenge = makeChallenge();
      q.textContent = challenge.question;
      input.value = "";
      msg.textContent = "Leider falsch.";
      input.focus();
    }
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
  m.actions.append(button("Abbrechen", "btn", m.close), button("OK", "btn primary", check));
  input.focus();
}

// ---------- Card dialog ----------

export function openCardDialog(api, { pageId, strip, slot, cardId }) {
  const { book } = api.getState();
  const existing = cardId ? book.cards[cardId] : null;
  const m = modal(existing ? "Karte bearbeiten" : "Neue Karte");
  let pictoId = existing?.pictoId ?? null;

  const preview = el("div", "card preview");
  const pic = el("div", "pic");
  const word = el("div", "word");
  preview.append(pic, word);
  const wordInput = el("input", "word-input");
  wordInput.type = "text";
  wordInput.placeholder = "Wort unter dem Bild";
  wordInput.value = existing?.word ?? "";
  const showPreview = () => {
    pic.replaceChildren(pictoId == null ? el("span", "no-pic", "kein Bild") : pictoImg(pictoId));
    word.textContent = wordInput.value;
  };
  // Pictures from the search are not stored yet: show them from the network.
  const showRemote = (id) => {
    const img = el("img");
    img.src = imageUrl(id);
    pic.replaceChildren(img);
  };
  wordInput.addEventListener("input", () => { word.textContent = wordInput.value; });

  const search = searchPanel((r) => {
    pictoId = r.id;
    showRemote(r.id);
    if (!existing || !wordInput.value.trim()) wordInput.value = r.keyword;
    word.textContent = wordInput.value;
  });
  if (!existing) search.input.value = "";

  const side = el("div", "card-edit-side");
  const label = el("label", "field", "Wort");
  label.append(wordInput);
  side.append(preview, label);
  const layout = el("div", "card-edit");
  layout.append(search.wrap, side);
  const msg = el("p", "dlg-msg");
  m.body.append(layout, msg);
  showPreview();

  const save = async () => {
    const w = wordInput.value.trim();
    if (pictoId == null) { msg.textContent = "Bitte zuerst ein Bild suchen und antippen."; return; }
    if (!w) { msg.textContent = "Bitte ein Wort eingeben."; return; }
    msg.textContent = "Speichere …";
    try {
      await ensureImage(pictoId);
    } catch (e) {
      msg.textContent = e.message;
      return;
    }
    const b = api.getState().book;
    try {
      if (existing) api.update(updateCard(b, existing.id, { word: w, pictoId }));
      else api.update(addCard(b, { pageId, strip, slot, word: w, pictoId }).book);
      m.close();
    } catch (e) {
      if (e instanceof ModelError) msg.textContent = e.message;
      else throw e;
    }
  };

  if (existing) {
    m.actions.append(button("Löschen", "btn danger", () => {
      if (!confirm("Karte wirklich löschen?")) return;
      api.update(deleteCard(api.getState().book, existing.id));
      m.close();
    }));
  }
  m.actions.append(el("span", "spacer"), button("Abbrechen", "btn", m.close), button("Speichern", "btn primary", save));
  if (!existing) search.input.focus();
}

// ---------- Page dialog ----------

export function openPageDialog(api, pageId) {
  const { book } = api.getState();
  const index = pageId ? book.pages.findIndex((p) => p.id === pageId) : -1;
  const page = index >= 0 ? book.pages[index] : null;
  const m = modal(page ? "Seite bearbeiten" : "Neue Seite");
  let iconPictoId = page?.iconPictoId ?? null;

  const nameInput = el("input");
  nameInput.type = "text";
  nameInput.value = page?.name ?? "";
  nameInput.placeholder = "Name, z. B. Essen";
  const nameLabel = el("label", "field", "Name");
  nameLabel.append(nameInput);

  const iconBox = el("div", "page-icon");
  const showIcon = (remote) => {
    if (iconPictoId == null) iconBox.replaceChildren(el("span", "no-pic", "kein Symbol"));
    else if (remote) { const i = el("img"); i.src = imageUrl(iconPictoId); iconBox.replaceChildren(i); }
    else iconBox.replaceChildren(pictoImg(iconPictoId));
  };
  showIcon(false);
  const noIcon = button("Kein Symbol", "btn", () => { iconPictoId = null; showIcon(false); });
  const iconRow = el("div", "row");
  iconRow.append(iconBox, noIcon);
  const search = searchPanel((r) => {
    iconPictoId = r.id;
    showIcon(true);
    if (!nameInput.value.trim()) nameInput.value = r.keyword;
  });
  const msg = el("p", "dlg-msg");
  m.body.append(nameLabel, el("h3", "", "Symbol für den Reiter"), iconRow, search.wrap, msg);

  if (page) {
    const order = el("div", "row");
    const move = (delta) => () => {
      const i = api.getState().book.pages.findIndex((p) => p.id === page.id);
      api.update(movePage(api.getState().book, i, i + delta));
    };
    order.append(button("▲ Reiter nach oben", "btn", move(-1)), button("▼ Reiter nach unten", "btn", move(1)));
    m.body.insertBefore(order, msg);
    m.actions.append(button("Seite löschen", "btn danger", () => {
      const b = api.getState().book;
      if (b.pages.length <= 1) { msg.textContent = "Die letzte Seite kann nicht gelöscht werden."; return; }
      if (!confirm(`Seite „${page.name}“ mit allen Karten löschen?`)) return;
      api.update(deletePage(b, page.id));
      m.close();
    }));
  }

  const save = async () => {
    const name = nameInput.value.trim() || `Seite ${api.getState().book.pages.length + (page ? 0 : 1)}`;
    if (iconPictoId != null) {
      msg.textContent = "Speichere …";
      try { await ensureImage(iconPictoId); } catch (e) { msg.textContent = e.message; return; }
    }
    try {
      let b = api.getState().book;
      let id = page?.id;
      if (!page) ({ book: b, pageId: id } = addPage(b, name));
      api.update(renamePage(b, id, name, iconPictoId));
      api.setPage(id);
      m.close();
    } catch (e) {
      if (e instanceof ModelError) msg.textContent = e.message;
      else throw e;
    }
  };
  m.actions.append(el("span", "spacer"), button("Abbrechen", "btn", m.close), button("Speichern", "btn primary", save));
}

// ---------- Settings and backup ----------

function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso)) / (24 * 3600 * 1000));
}

function backupText(book) {
  if (!book.lastBackup) return "Letzte Sicherung: noch nie";
  const d = daysSince(book.lastBackup);
  return "Letzte Sicherung: " + (d === 0 ? "heute" : d === 1 ? "gestern" : `vor ${d} Tagen`);
}

async function exportBackup(api) {
  const book = api.getState().book;
  const images = {};
  for (const id of allPictoIds(book)) {
    const url = await getImageDataUrl(id);
    if (url) images[id] = url;
  }
  const now = new Date();
  const text = serializeBackup(book, images, now);
  const name = `sprechbrett-${now.toISOString().slice(0, 10)}.json`;
  const file = new File([text], name, { type: "application/json" });
  // iPad: the share sheet offers "In Dateien sichern"; elsewhere a normal download.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Sprechbrett-Sicherung" });
    } catch (e) {
      if (e.name === "AbortError") return false;
      throw e;
    }
  } else {
    const a = el("a");
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }
  api.getState().showBackupBanner = false;
  api.update(markBackedUp(api.getState().book, now.toISOString()));
  return true;
}

async function importBackup(api, file) {
  const { book, images } = parseBackup(await file.text());
  if (!confirm("Das aktuelle Buch wird ersetzt. Weiter?")) return false;
  for (const [id, dataUrl] of Object.entries(images)) await putImageDataUrl(Number(id), dataUrl);
  await Promise.all(allPictoIds(book).map((id) => getImageUrl(id).catch(() => null)));
  api.update(returnAll(book));
  api.setPage(book.pages[0].id);
  return true;
}

export function openSettings(api) {
  const m = modal("Einstellungen");
  const msg = el("p", "dlg-msg");

  // Background colour
  const colours = el("div", "row swatches");
  const current = () => api.getState().book.settings.background;
  const picker = el("input");
  picker.type = "color";
  const markSwatch = () => {
    colours.querySelectorAll(".swatch").forEach((s) => s.classList.toggle("selected", s.dataset.color === current()));
    picker.value = current();
  };
  for (const c of SWATCHES) {
    const s = button("", "swatch", () => { api.update(setBackground(api.getState().book, c)); markSwatch(); });
    s.dataset.color = c;
    s.style.background = c;
    s.setAttribute("aria-label", "Farbe " + c);
    colours.append(s);
  }
  picker.addEventListener("input", () => { api.update(setBackground(api.getState().book, picker.value.toUpperCase())); markSwatch(); });
  colours.append(picker);
  markSwatch();

  // Strip count
  const strips = el("div", "row stepper");
  const count = el("span", "count");
  const showCount = () => { count.textContent = api.getState().book.settings.stripCount; };
  const step = (delta) => () => {
    msg.textContent = "";
    const n = api.getState().book.settings.stripCount + delta;
    if (n < MIN_STRIPS || n > MAX_STRIPS) return;
    try {
      api.update(setStripCount(api.getState().book, n));
    } catch (e) {
      if (e instanceof ModelError) msg.textContent = e.message;
      else throw e;
    }
    showCount();
  };
  strips.append(button("−", "btn round", step(-1)), count, button("+", "btn round", step(1)));
  showCount();

  // Backup
  const last = el("p", "", backupText(api.getState().book));
  const fileInput = el("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.hidden = true;
  fileInput.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    fileInput.value = "";
    if (!f) return;
    try {
      if (await importBackup(api, f)) { m.close(); toast("Sicherung geladen."); }
    } catch (e) {
      msg.textContent = e.message;
    }
  });
  const backupRow = el("div", "row");
  backupRow.append(
    button("Sicherung speichern", "btn primary", async () => {
      msg.textContent = "";
      try {
        if (await exportBackup(api)) last.textContent = backupText(api.getState().book);
      } catch (e) {
        msg.textContent = "Sicherung fehlgeschlagen: " + e.message;
      }
    }),
    button("Sicherung laden", "btn", () => fileInput.click()),
    fileInput,
  );

  m.body.append(
    el("h3", "", "Hintergrundfarbe"), colours,
    el("h3", "", "Anzahl weisse Streifen"), strips,
    msg,
    el("h3", "", "Sicherung"), last, backupRow,
    el("p", "attribution", ATTRIBUTION),
  );
  m.actions.append(el("span", "spacer"), button("Schliessen", "btn primary", m.close));
}

// ---------- Wiring ----------

export function initParent(api) {
  const enterParent = () => {
    stopSpeaking();
    const s = api.getState();
    api.update(returnAll(s.book));
    s.showBackupBanner = backupOverdue(s.book, new Date());
    api.setMode("parent");
  };

  api.onGear = () => openGate(enterParent);
  api.onAddCard = (strip, slot) => openCardDialog(api, { pageId: api.getState().pageId, strip, slot });
  api.onEditCard = (cardId) => openCardDialog(api, { cardId });
  api.onEditPage = (pageId) => openPageDialog(api, pageId);
  api.onAddPage = () => {
    if (api.getState().book.pages.length >= MAX_PAGES) toast(`Höchstens ${MAX_PAGES} Seiten.`);
    else openPageDialog(api, null);
  };
  api.onError = toast;

  document.getElementById("toolbar").addEventListener("click", (e) => {
    const id = e.target.closest("button")?.id;
    if (id === "btn-gear") api.onGear();
    else if (id === "btn-settings" || id === "btn-backup-now") openSettings(api);
    else if (id === "btn-done") {
      api.getState().showBackupBanner = false;
      api.setMode("kid");
    } else if (id === "btn-banner-close") {
      api.getState().showBackupBanner = false;
      api.render();
    }
  });
}
