// Parent mode: maths gate, card and page dialogs, settings and backup.

import {
  MAX_PAGES, MIN_STRIPS, MAX_STRIPS, ModelError,
  returnAll, addCard, updateCard, deleteCard, addPage, renamePage, movePage, deletePage,
  setStripCount, setBackground, markBackedUp, backupOverdue, allPictoIds, ownPictureId, isOwnPicture,
} from "./model.js";
import { makeChallenge } from "./gate.js";
import { searchPictograms, fetchPictogram, imageUrl } from "./arasaac.js";
import { serializeBackup, parseBackup, collectImages, restoreImageKey } from "./backup.js";
import { putImage, putImageDataUrl, hasImage, getImageUrl, getImageDataUrl } from "./store.js";
import { stopSpeaking } from "./speech.js";
import { pictoImg } from "./board.js";
import { openCropper } from "./cropper.js";

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
  if (!(await hasImage(id))) {
    // Own photos cannot be downloaded again; only a backup can bring them back.
    if (isOwnPicture(id)) throw new Error("Das eigene Bild fehlt auf dem Gerät.");
    await putImage(id, await fetchPictogram(id));
  }
  await getImageUrl(id);
}

// "Eigenes Bild" button: pick a photo (album, camera, files or a folder on the Mac),
// let the parent crop it, then call onPicked(blob). Errors go to onError(message).
function ownPictureButton(onPicked, onError) {
  const input = el("input");
  input.type = "file";
  input.accept = "image/*";
  input.hidden = true;
  const b = button("Eigenes Bild …", "btn", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      const blob = await openCropper(file);
      if (blob) onPicked(blob);
    } catch (e) {
      onError(e.message);
    }
  });
  const wrap = el("span", "own-pic");
  wrap.append(b, input);
  return wrap;
}

// Shows a not yet stored own photo; the URL is released when the picture changes.
function blobImg(blob, holder) {
  if (holder.url) URL.revokeObjectURL(holder.url);
  holder.url = URL.createObjectURL(blob);
  const img = el("img");
  img.src = holder.url;
  return img;
}

// Store a picture before the book refers to it: own photos from memory, pictograms from ARASAAC.
async function storePicture(id, ownBlob) {
  if (ownBlob) {
    await putImage(id, ownBlob);
    await getImageUrl(id);
  } else {
    await ensureImage(id);
  }
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
  let ownBlob = null; // a cropped photo that is stored only when the card is saved
  let searchWord = null; // the word a search filled in, replaced when a photo is chosen
  const blobUrl = {};

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
    ownBlob = null;
    showRemote(r.id);
    if (!existing || !wordInput.value.trim()) {
      wordInput.value = r.keyword;
      searchWord = r.keyword;
    }
    word.textContent = wordInput.value;
  });
  const ownPic = ownPictureButton((blob) => {
    ownBlob = blob;
    pictoId = ownPictureId();
    search.wrap.querySelectorAll(".result.selected").forEach((x) => x.classList.remove("selected"));
    pic.replaceChildren(blobImg(blob, blobUrl));
    // A word from the pictogram search does not describe the own photo.
    if (searchWord !== null && wordInput.value === searchWord) wordInput.value = "";
    searchWord = null;
    word.textContent = wordInput.value;
    msg.textContent = "";
    wordInput.focus();
  }, (text) => { msg.textContent = text; });
  if (!existing) search.input.value = "";

  const side = el("div", "card-edit-side");
  const label = el("label", "field", "Wort");
  label.append(wordInput);
  side.append(preview, ownPic, label);
  const layout = el("div", "card-edit");
  layout.append(search.wrap, side);
  const msg = el("p", "dlg-msg");
  m.body.append(layout, msg);
  showPreview();

  const save = async () => {
    const w = wordInput.value.trim();
    if (pictoId == null) { msg.textContent = "Bitte zuerst ein Bild suchen oder ein eigenes Bild wählen."; return; }
    if (!w) { msg.textContent = "Bitte ein Wort eingeben."; return; }
    msg.textContent = "Speichere …";
    try {
      await storePicture(pictoId, ownBlob);
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
  let iconBlob = null; // a cropped photo that is stored only when the page is saved
  const blobUrl = {};

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
  const noIcon = button("Kein Symbol", "btn", () => { iconPictoId = null; iconBlob = null; showIcon(false); });
  const ownIcon = ownPictureButton((blob) => {
    iconBlob = blob;
    iconPictoId = ownPictureId();
    iconBox.replaceChildren(blobImg(blob, blobUrl));
    msg.textContent = "";
  }, (text) => { msg.textContent = text; });
  const iconRow = el("div", "row");
  iconRow.append(iconBox, ownIcon, noIcon);
  const search = searchPanel((r) => {
    iconPictoId = r.id;
    iconBlob = null;
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
      try { await storePicture(iconPictoId, iconBlob); } catch (e) { msg.textContent = e.message; return; }
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

// Build the backup file ahead of time: iPad Safari only opens the share sheet when
// navigator.share() is called right inside the tap, without waiting for storage first.
async function prepareBackup(book) {
  const { images, missing } = await collectImages(allPictoIds(book), getImageDataUrl);
  const now = new Date();
  const name = `sprechbrett-${now.toISOString().slice(0, 10)}.json`;
  const file = new File([serializeBackup(book, images, now)], name, { type: "application/json" });
  return { book, file, now, missing };
}

// Must be called synchronously from the tap. Resolves to true once the file was handed over.
function shareBackup(api, prepared) {
  const { file, now } = prepared;
  let handedOver;
  // iPad: the share sheet offers "In Dateien sichern"; elsewhere a normal download.
  if (navigator.canShare?.({ files: [file] })) {
    handedOver = navigator.share({ files: [file], title: "Sprechbrett-Sicherung" }).then(
      () => true,
      (e) => {
        if (e.name === "AbortError") return false;
        if (e.name === "NotAllowedError") throw new Error("Teilen wurde nicht erlaubt. Bitte nochmal tippen.");
        throw new Error("Sicherung fehlgeschlagen.");
      },
    );
  } else {
    const a = el("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    handedOver = Promise.resolve(true);
  }
  return handedOver.then((ok) => {
    if (ok) {
      api.getState().showBackupBanner = false;
      api.update(markBackedUp(api.getState().book, now.toISOString()));
    }
    return ok;
  });
}

async function importBackup(api, file) {
  const { book, images } = parseBackup(await file.text());
  if (!confirm("Das aktuelle Buch wird ersetzt. Weiter?")) return false;
  for (const [id, dataUrl] of Object.entries(images)) await putImageDataUrl(restoreImageKey(id), dataUrl);
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
    const s = button("", "swatch", () => { api.update(setBackground(api.getState().book, c)); markSwatch(); prepare(); });
    s.dataset.color = c;
    s.style.background = c;
    s.setAttribute("aria-label", "Farbe " + c);
    colours.append(s);
  }
  picker.addEventListener("input", () => { api.update(setBackground(api.getState().book, picker.value.toUpperCase())); markSwatch(); prepare(); });
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
    prepare();
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
  // Keep a ready-made backup file for the current book (see prepareBackup).
  let prepared = null;
  let preparing = null;
  const prepare = () => {
    const book = api.getState().book;
    if (prepared?.book === book || preparing?.book === book) return;
    const job = { book };
    preparing = job;
    prepareBackup(book).then(
      (p) => { if (preparing === job) { prepared = p; preparing = null; } },
      () => { if (preparing === job) preparing = null; },
    );
  };
  const saveBackup = () => {
    msg.textContent = "";
    if (prepared?.book !== api.getState().book) {
      prepare();
      msg.textContent = "Sicherung wird vorbereitet … bitte gleich nochmal tippen.";
      return;
    }
    const missing = prepared.missing.length;
    shareBackup(api, prepared).then(
      (ok) => {
        if (!ok) return;
        last.textContent = backupText(api.getState().book);
        if (missing) msg.textContent = `${missing} Bild(er) fehlten auf dem Gerät und sind nicht in der Sicherung.`;
        prepare();
      },
      (e) => { msg.textContent = e.message; },
    );
  };
  const backupRow = el("div", "row");
  backupRow.append(
    button("Sicherung speichern", "btn primary", saveBackup),
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
  prepare();
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
