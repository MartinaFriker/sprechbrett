# Sprechbrett Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An installable iPad web app that works like an analogue PECS board: the child builds a sentence from picture cards and has it read aloud; parents set up pages and cards behind a maths gate.

**Architecture:** Static HTML/CSS/JS with native ES modules, no build step (same spirit as `~/checkouts/vocal-race`). All decisions about the book live in pure modules (`model.js`, `gate.js`, `gesture.js`, `backup.js`, `arasaac.js` parsing) that are unit-tested with Node's built-in test runner. Thin UI modules render the book and call the model; IndexedDB stores the book and picture blobs; a service worker makes it work offline.

**Tech Stack:** HTML, CSS, JavaScript ES modules, Pointer Events, Web Speech API (`speechSynthesis`), IndexedDB, Service Worker, ARASAAC REST API. Tests: `node --test` (Node 23, no npm dependencies).

**Spec:** `docs/superpowers/specs/2026-11-13-sprechbrett-design.md`

## Global Constraints

- Project root: `~/checkouts/sprechbrett`. All paths below are relative to it.
- No npm dependencies, no bundler, no external JS libraries.
- UI text in German (Swiss spelling: "ss", not "ß"). Code comments in English.
- Target: iPad Safari, landscape, installed to home screen (`display: standalone`, `orientation: landscape`).
- Nothing scrolls or zooms: `touch-action: none` on the app, `user-scalable=no`, `-webkit-touch-callout: none`, `user-select: none`.
- Colours: top area default `#F39200` (orange, user-adjustable), strips and cards white `#FFFFFF`, sentence area violet `#6B2C91` with a white strip on it. Tune to photos of the analogue board if they differ.
- Fixed geometry: `SLOTS_PER_STRIP = 5`, `MIN_STRIPS = 1`, `MAX_STRIPS = 8`, default `stripCount = 4`, `MAX_PAGES = 10`, `SENTENCE_MAX = 8`.
- ARASAAC: search `https://api.arasaac.org/v1/pictograms/de/search/{term}` (CORS `*`, 404 = no results), image `https://static.arasaac.org/pictograms/{id}/{id}_300.png` (CORS `*`). Attribution text: `Piktogramme: Sergio Palao, ARASAAC (arasaac.org), Lizenz CC BY-NC-SA 4.0`.
- Never use "PECS" in the app name or UI; the app is called "Sprechbrett".

## Review Focus

1. **Sentence strip full (8 cards):** a further tap or drag onto it is ignored; the card stays (or returns) on its board slot, nothing is lost. → model test in Task 1, manual check in Task 5.
2. **Card dropped outside any target** (on the orange background, the tabs, mid-air): it goes back to where it came from (board slot or its previous sentence position). → manual check in Task 5.
3. **Speak pressed with an empty sentence, or pressed again while speaking:** empty → nothing happens; pressed again → current speech is cancelled and starts from the first card. → manual check in Task 5.
4. **Search without internet or with no match:** "Keine Internetverbindung." resp. "Nichts gefunden." in the dialog, no crash, existing cards still show (from IndexedDB). → test in Task 3, manual check in Task 6.
5. **Second finger while a card is being dragged:** ignored; only the first pointer drags. → manual check in Task 5.

---

## Data model (shared by all tasks)

```js
// Book (stored as one IndexedDB record, key "book")
{
  version: 1,
  settings: { background: "#F39200", stripCount: 4 },
  pages: [ { id: "p1", name: "Seite 1", iconPictoId: null } ],   // order = tab order
  cards: { "c1": { id: "c1", word: "Apfel", pictoId: 2462, pageId: "p1", strip: 0, slot: 1 } },
  sentence: [ "c1" ],          // card ids, left to right; these cards are NOT shown on the board
  lastBackup: null             // ISO string or null
}
```

A card's `pageId/strip/slot` is its fixed home. A card in `sentence` leaves a gap at its home. All model functions are pure: they return a new book and never mutate the input; invalid operations that the UI must report throw a `ModelError` with a German `message`; harmless no-ops return the same book object (`===`), so the UI can detect "nothing happened".

## File structure

| File | Responsibility |
|------|----------------|
| `index.html` | App shell, meta tags for iOS standalone, module entry |
| `css/style.css` | All styling, CSS custom property `--board-bg` |
| `js/model.js` | Book data and every operation on it (pure) |
| `js/gate.js` | Maths challenge for the parent gate (pure) |
| `js/gesture.js` | Tap vs drag classification (pure) |
| `js/backup.js` | Backup serialise/parse (pure) |
| `js/arasaac.js` | ARASAAC URLs, result parsing, fetching |
| `js/store.js` | IndexedDB: book + picture blobs, persistent-storage request |
| `js/speech.js` | Read a sequence of words with per-word callbacks |
| `js/icons.js` | Inline SVG strings: mouth, return-all, gear, plus |
| `js/board.js` | Kid mode: render board, tabs, sentence; drag and tap |
| `js/parent.js` | Parent mode: gate, plus fields, card dialog, pages, settings, backup |
| `js/app.js` | Bootstraps: load, render, save on change, register SW |
| `sw.js`, `manifest.webmanifest`, `icons/*` | PWA |
| `tests/*.test.js` | Node unit tests for the pure modules |
| `.claude/launch.json` | `python3 -m http.server 8642` for local preview |

---

### Task 1: Book model

**Files:**
- Create: `js/model.js`, `tests/model.test.js`, `package.json` (only `{"type":"module","scripts":{"test":"node --test tests/"}}`), `.gitignore`

**Interfaces:**
- Produces (all exported from `js/model.js`):
  - constants `SLOTS_PER_STRIP, MIN_STRIPS, MAX_STRIPS, MAX_PAGES, SENTENCE_MAX`, class `ModelError extends Error`
  - `createBook(): Book`
  - `cardAt(book, pageId, strip, slot): Card | null` (home lookup, ignores sentence)
  - `isOnBoard(book, cardId): boolean`
  - `takeToSentence(book, cardId, index?: number): Book` (append when `index` undefined)
  - `moveInSentence(book, fromIndex, toIndex): Book`
  - `returnCard(book, cardId): Book`, `returnAll(book): Book`
  - `addCard(book, { pageId, strip, slot, word, pictoId }): { book, cardId }`
  - `updateCard(book, cardId, { word?, pictoId? }): Book`
  - `moveCard(book, cardId, strip, slot): Book` (same page; swaps if occupied)
  - `deleteCard(book, cardId): Book`
  - `addPage(book, name): { book, pageId }`, `renamePage(book, pageId, name, iconPictoId): Book`, `movePage(book, fromIndex, toIndex): Book`, `deletePage(book, pageId): Book`
  - `setStripCount(book, n): Book`, `setBackground(book, color): Book`
  - `markBackedUp(book, isoString): Book`, `backupOverdue(book, now: Date, days = 30): boolean`
  - `allPictoIds(book): number[]` (cards + page icons, unique)

- [ ] **Step 1: Write failing tests** in `tests/model.test.js` (`import { test } from "node:test"; import assert from "node:assert/strict";`):
  - `createBook`: one page named `"Seite 1"`, `stripCount 4`, background `"#F39200"`, empty `cards` and `sentence`, `lastBackup null`.
  - `takeToSentence` appends; card no longer `isOnBoard`; `cardAt` still finds it at its home; input book unchanged (deep-equal to a `structuredClone` taken before).
  - `takeToSentence(book, id, 0)` inserts at the front.
  - `takeToSentence` on a card already in the sentence returns the same object (`===`).
  - **Review Focus 1:** with 8 cards in the sentence, `takeToSentence` of a 9th returns the same object and the 9th card is still `isOnBoard`.
  - `moveInSentence(book, 0, 2)` on `[a,b,c]` → `[b,c,a]`.
  - `returnCard` removes from sentence; `returnAll` empties sentence and all cards are `isOnBoard`.
  - `addCard` into an occupied slot throws `ModelError`; slot `5` or strip `>= stripCount` throws `ModelError`.
  - `moveCard` onto an occupied slot swaps the two cards' homes.
  - `deleteCard` of a card in the sentence removes it from `cards` and `sentence`.
  - `addPage` 9 times after `createBook` works (10 pages); the 11th throws `ModelError` with message `"Höchstens 10 Seiten."`.
  - `deletePage` removes its cards (also from sentence); deleting the only page throws `ModelError`.
  - `movePage(book, 2, 0)` reorders `pages`.
  - `setStripCount(book, 2)` when strip 3 holds a card throws `ModelError` with message `"Streifen 4 ist nicht leer. Bitte zuerst die Karten dort löschen oder verschieben."`; with empty strips it works; values are clamped to `1..8`.
  - `backupOverdue`: book without cards → `false`; with cards and `lastBackup null` → `true`; `lastBackup` 29 days before `now` → `false`; 31 days → `true`.
  - `allPictoIds` returns unique ids from cards and page icons, no `null`.

- [ ] **Step 2: Run** `node --test tests/` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement `js/model.js`.** Ids via `crypto.randomUUID()` (available in Node 23 and Safari). Copy with `structuredClone`.

- [ ] **Step 4: Run** `node --test tests/` — Expected: all pass.

- [ ] **Step 5: Commit** `git add -A && git commit -m "Book model with tests"`

---

### Task 2: Gate and gesture helpers

**Files:**
- Create: `js/gate.js`, `js/gesture.js`, `tests/gate.test.js`, `tests/gesture.test.js`

**Interfaces:**
- Produces:
  - `makeChallenge(rand = Math.random): { question: string, answer: number }` — 50 % addition with both operands in `2..9` (`"7 + 5 = ?"`), 50 % multiplication with both in `2..6` (`"4 × 6 = ?"`, real `×` sign).
  - `TAP_THRESHOLD_PX = 10`; `classifyGesture(dx, dy, threshold = TAP_THRESHOLD_PX): "tap" | "drag"` — `"drag"` once the distance `Math.hypot(dx, dy)` exceeds the threshold.

- [ ] **Step 1: Write failing tests:** a stub `rand` returning a fixed sequence yields the expected question and answer for one addition and one multiplication; 1000 random challenges all have integer answers between 4 and 36 and a question matching `/^\d \+ \d = \?$|^\d × \d = \?$/`. `classifyGesture(3,4)` → `"tap"`, `(8,8)` → `"drag"`, `(0,10)` → `"tap"`.
- [ ] **Step 2: Run** `node --test tests/` — Expected: new tests FAIL.
- [ ] **Step 3: Implement** both modules.
- [ ] **Step 4: Run** `node --test tests/` — Expected: all pass.
- [ ] **Step 5: Commit** `git commit -am "Parent gate challenge and gesture classification"` (add new files first).

---

### Task 3: ARASAAC client and backup format

**Files:**
- Create: `js/arasaac.js`, `js/backup.js`, `tests/arasaac.test.js`, `tests/backup.test.js`

**Interfaces:**
- Consumes: `createBook`, `addCard` from Task 1 (in tests).
- Produces:
  - `searchUrl(term): string` — trims, `encodeURIComponent`.
  - `imageUrl(id): string`
  - `parseSearch(json): { id: number, keyword: string }[]` — `keyword` = first `keywords[].keyword` or `""`; at most 60 results.
  - `searchPictograms(term, fetchFn = fetch): Promise<{id, keyword}[]>` — HTTP 404 → `[]`; network failure → throws `Error("Keine Internetverbindung.")`; other non-OK → throws `Error("Suche fehlgeschlagen.")`.
  - `fetchPictogram(id, fetchFn = fetch): Promise<Blob>`
  - `serializeBackup(book, images: Record<number, string /* data URL */>, now: Date): string` — JSON `{ app: "sprechbrett", version: 1, exportedAt, book, images }`.
  - `parseBackup(text): { book, images }` — throws `Error("Diese Datei ist keine Sprechbrett-Sicherung.")` for invalid JSON, wrong `app`, or missing `book.pages`/`book.cards`/`book.settings`.

- [ ] **Step 1: Write failing tests:**
  - `searchUrl(" Apfel ")` → `"https://api.arasaac.org/v1/pictograms/de/search/Apfel"`; `searchUrl("Glace essen")` encodes the space as `%20`.
  - `parseSearch([{ _id: 2462, keywords: [{ keyword: "Apfel" }] }, { _id: 7, keywords: [] }])` → `[{id:2462,keyword:"Apfel"},{id:7,keyword:""}]`.
  - `searchPictograms` with a stub fetch resolving `{ ok:false, status:404 }` → `[]`.
  - **Review Focus 4:** stub fetch rejecting with `TypeError` → rejects with message `"Keine Internetverbindung."`.
  - Round trip: `parseBackup(serializeBackup(book, {2462:"data:image/png;base64,AA=="}, now))` deep-equals `{ book, images }`.
  - `parseBackup("nope")` and `parseBackup('{"app":"other"}')` throw the German message.
- [ ] **Step 2: Run** `node --test tests/` — Expected: new tests FAIL.
- [ ] **Step 3: Implement** both modules.
- [ ] **Step 4: Run** `node --test tests/` — Expected: all pass.
- [ ] **Step 5: Commit** `git add -A && git commit -m "ARASAAC client and backup format"`

---

### Task 4: Storage, speech, icons, app shell

**Files:**
- Create: `index.html`, `css/style.css`, `js/store.js`, `js/speech.js`, `js/icons.js`, `js/app.js`, `.claude/launch.json`

**Interfaces:**
- Consumes: `createBook` (Task 1).
- Produces:
  - `store.js`: `loadBook(): Promise<Book | null>`, `saveBook(book): Promise<void>`, `putImage(id, blob)`, `getImageUrl(id): Promise<string | null>` (object URL, cached in a `Map`), `hasImage(id): Promise<boolean>`, `getImageDataUrl(id): Promise<string | null>`, `requestPersistence(): Promise<boolean>` (`navigator.storage?.persist?.()`). DB name `sprechbrett`, version 1, stores `kv` (book) and `images` (key = picto id).
  - `speech.js`: `speakSequence(words: string[], { onWord(index), onDone() }): void` — cancels any running speech first, one `SpeechSynthesisUtterance` per word, `lang = "de-DE"`, prefers a voice whose `lang` starts with `de`, `rate 0.9`; `stopSpeaking(): void`.
  - `icons.js`: `ICON_MOUTH`, `ICON_RETURN_ALL`, `ICON_GEAR`, `ICON_PLUS` as SVG strings. `ICON_RETURN_ALL`: three small white-bordered cards side by side, each with an up arrow above it, the left arrow tilted ~15° left, the middle straight, the right ~15° right. `ICON_MOUTH`: simple open mouth with lips, as a pictogram.
  - `app.js`: `state = { book, mode: "kid" | "parent", pageId }`; `update(newBook)` saves (debounced 300 ms) and re-renders when `newBook !== state.book`; on start: `loadBook() ?? createBook()`, `requestPersistence()`, render.
  - `index.html`: `<div id="app">` with `#board` (top area: `#strips`, `#tabs`) and `#sentence-bar` (`#sentence`, `#btn-return-all`, `#btn-speak`), plus `#btn-gear` in the top right corner of the board; `<dialog>` elements are created by Task 6.
  - `.claude/launch.json`: configuration `sprechbrett`, `python3 -m http.server 8642`, port `8642`.

- [ ] **Step 1:** Write the files. CSS layout: the board fills the viewport height minus the sentence bar (~22 % of height); strips are equal-width vertical white bands with even gaps; card size = what fits `SLOTS_PER_STRIP` cards in a strip's height, square, picture on top, word below in a bold rounded sans-serif (system font).
- [ ] **Step 2: Verify** with `preview_start` (`sprechbrett`), viewport 1180×820 (iPad landscape): orange area with 4 white vertical strips, violet bar with white strip, mouth button and return-all button visible, no console errors, IndexedDB `sprechbrett` exists after reload.
- [ ] **Step 3: Commit** `git add -A && git commit -m "App shell, storage, speech and icons"`

---

### Task 5: Kid mode – board, tabs, sentence, drag and tap

**Files:**
- Create: `js/board.js`
- Modify: `js/app.js` (call `renderBoard`), `css/style.css`

**Interfaces:**
- Consumes: model (Task 1), `classifyGesture` (Task 2), `getImageUrl` / `speakSequence` / icons (Task 4).
- Produces: `renderBoard(root, state, { update, setPage })`, re-callable on every state change.

Behaviour (from the spec):
- Tabs on the right edge, one per page, showing name and (if set) icon; active tab joined visually to the board. Tap → `setPage`.
- Board slot shows its card if `cardAt` finds one and it `isOnBoard`; otherwise an empty slot (gap).
- Pointer handling on a card (board or sentence): `pointerdown` captures the pointer; track only the first `pointerId` (**Review Focus 5**: ignore others until it ends). While `classifyGesture` says `"tap"`, nothing moves; on `"drag"` a floating copy follows the finger.
  - Tap on a board card → `takeToSentence(book, id)`.
  - Tap on a sentence card → `returnCard`.
  - Drag ending over the sentence strip → `takeToSentence` at the index nearest the drop x (from board) or `moveInSentence` (within sentence).
  - Drag of a sentence card ending over the board area → `returnCard`.
  - **Review Focus 2:** drag ending anywhere else → nothing changes; the floating copy animates back.
  - **Review Focus 1:** if the model returns the same book (sentence full), the card animates back and the sentence bar does a short shake.
- Speak button: **Review Focus 3** — empty sentence → nothing; otherwise `speakSequence(words, { onWord: i => highlight card i, onDone: clear highlight })`; pressing again restarts.
- Return-all button → `returnAll`, stops speech.

- [ ] **Step 1:** Implement `board.js` and styles.
- [ ] **Step 2: Verify** in the preview at 1180×820, with a temporary book seeded via `javascript_tool` (3 cards on page 1, 1 on page 2, real ARASAAC ids 2462, 2349, 6456, 2617): tap moves card down and leaves a gap; drag into sentence at the front inserts at index 0; drag inside sentence reorders; tap in sentence returns home; card from page 2 can join a sentence started on page 1 and returns to page 2; drop on orange background returns; 9th card is refused with shake; return-all empties sentence; speak highlights cards in order (check `speechSynthesis.speaking` via `javascript_tool`); reload keeps sentence. No console errors.
- [ ] **Step 3: Commit** `git add -A && git commit -m "Kid mode: board, tabs, sentence, drag and tap, speech"`

---

### Task 6: Parent mode – gate, cards, pages, settings, backup

**Files:**
- Create: `js/parent.js`
- Modify: `js/board.js` (plus fields and parent-only controls when `state.mode === "parent"`), `js/app.js`, `css/style.css`

**Interfaces:**
- Consumes: model, `makeChallenge`, ARASAAC client, backup format, store.
- Produces: `openGate(onSuccess)`, `openCardDialog(state, { pageId, strip, slot, cardId? }, update)`, `openSettings(state, update)`; `app.js` gets `enterParent()` / `leaveParent()`.

Behaviour:
- Gear → gate dialog: question from `makeChallenge`, number keypad input (`inputmode="numeric"`), "OK"/"Abbrechen". Wrong answer → new question, short message "Leider falsch.". Right → `enterParent()`, which first applies `returnAll` (spec: sentence is emptied into the board) and stops speech.
- Parent mode top bar (replaces gear): "Einstellungen", "Fertig" (→ kid mode). Every empty slot shows `ICON_PLUS`; tapping a card opens the card dialog in edit mode; dragging a card onto another slot of the same page → `moveCard`. Tabs show a "+" tab at the end while `pages.length < MAX_PAGES`; long-press or a small pencil on the active tab → rename/icon/delete page; tabs can be reordered by dragging.
- Card dialog: search field + "Suchen"; results as a grid of `imageUrl` thumbnails; **Review Focus 4**: "Nichts gefunden." / "Keine Internetverbindung." shown in the dialog. Choosing a picture pre-fills the word with its keyword (editable). "Speichern" → `fetchPictogram` + `putImage`, then `addCard` or `updateCard`; edit mode adds "Löschen" with confirm "Karte wirklich löschen?".
- Page icon uses the same search UI.
- Settings dialog: colour choice (5 swatches incl. default orange + `<input type="color">`), strip count stepper `1..8` showing `ModelError` messages inline, backup section ("Sicherung speichern" → `serializeBackup` with all images via `getImageDataUrl`, downloaded as `sprechbrett-YYYY-MM-DD.json`, then `markBackedUp`; "Sicherung laden" → file input → `parseBackup` → confirm "Das aktuelle Buch wird ersetzt." → save book + images), text "Letzte Sicherung: vor N Tagen" / "noch nie", ARASAAC attribution line.
- Reminder: on entering parent mode, if `backupOverdue`, show a banner "Seit über 30 Tagen keine Sicherung. Jetzt sichern?" with a button that opens settings.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** in the preview: wrong gate answer is rejected; right answer shows plus fields and empties the sentence; search "Apfel" shows results and saving creates a card; offline (`javascript_tool`: stub `window.fetch` to reject) shows "Keine Internetverbindung."; edit and delete a card; add an 11th page is impossible; reduce strips while strip 4 has a card shows the message; colour change applies to the board; export downloads JSON, import of that file restores the book; "Fertig" returns to kid mode without plus fields.
- [ ] **Step 3: Commit** `git add -A && git commit -m "Parent mode: gate, cards, pages, settings, backup"`

---

### Task 7: PWA, offline, README

**Files:**
- Create: `sw.js`, `manifest.webmanifest`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`, `icons/apple-touch-icon.png`, `README.md`
- Modify: `index.html` (manifest + apple meta tags as in vocal-race), `js/app.js` (register SW)

**Interfaces:**
- Consumes: all app files (listed in `APP_FILES`).

- [ ] **Step 1:** `sw.js` following vocal-race's pattern: `VERSION` constant, precache `APP_FILES`, delete old caches on activate, cache-first for app files, network-only for `api.arasaac.org` (pictures already live in IndexedDB). Manifest: name/short_name "Sprechbrett", `lang "de"`, `display "standalone"`, `orientation "landscape"`, theme/background `#F39200`. Icons: draw a simple orange board with white strips and a violet bar (generate PNGs with a small Python/Pillow or `sips` script kept out of the repo, in the scratchpad).
- [ ] **Step 2:** README in German: what it is, how to install on the iPad ("Teilen → Zum Home-Bildschirm"), tip to use "Geführter Zugriff", backup advice, ARASAAC licence and attribution, how to run tests (`node --test tests/`) and the local server.
- [ ] **Step 3: Verify:** `node --test tests/` passes; in the preview, after one load, set the network offline (stub via devtools is not available: instead stop the server with `preview_stop`, reload) and the app still opens with its cards and pictures.
- [ ] **Step 4: Commit** `git add -A && git commit -m "PWA: offline, install, README"`
