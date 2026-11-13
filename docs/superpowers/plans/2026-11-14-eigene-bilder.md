# Eigene Bilder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cards can use the parent's own photos, cropped to a square in the app.

**Architecture:** Pure crop maths in `js/crop.js` (tested with node), a DOM cropper in `js/cropper.js`, and the card dialog in `js/parent.js` gets an "Eigenes Bild" button. Own pictures are stored in the existing IndexedDB `images` store under string ids `own-<uuid>`.

**Tech Stack:** ES modules, Pointer Events, Canvas 2D, IndexedDB, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-14-eigene-bilder-design.md`

## Global Constraints

- Code comments in English; UI text in German (Swiss spelling, no ß).
- No build step, no third-party code.
- Output picture: JPEG, 600 × 600 px, quality 0.85, white background.
- Max zoom = 4 × the minimum (cover) scale.
- Own picture ids: `"own-" + newId()`; ARASAAC ids stay numbers.
- Bump `VERSION` in `sw.js` and add new files to its file list.

## Review Focus

- Backup round trip with own pictures: keys `"own-…"` must not become `NaN`; numeric keys must still become numbers.
- A photo that cannot be decoded (HEIC in Chrome, a PDF) shows "Dieses Bild kann hier nicht geöffnet werden." instead of failing silently.
- Very wide or tall photos (e.g. 4000 × 500): the frame is always fully covered, no empty edge after any pan or zoom.
- "Abbrechen" after cropping stores nothing.
- `ensureImage` never asks ARASAAC for an `own-` id.

---

### Task 1: Picture ids and backup keys

**Files:** Modify `js/model.js`, `js/backup.js`, `js/parent.js` (importBackup, ensureImage); Test `tests/model.test.js`, `tests/backup.test.js`

**Produces:** `ownPictureId(): string`, `isOwnPicture(id): boolean` (model.js); `restoreImageKey(key: string): number|string` (backup.js).

- [ ] Tests: `ownPictureId()` matches `/^own-[0-9a-f-]{36}$/`; `isOwnPicture("own-x")` true, `isOwnPicture(2462)` false; `restoreImageKey("2462") === 2462`, `restoreImageKey("own-ab") === "own-ab"`. Run `node --test` → FAIL.
- [ ] Implement; `importBackup` uses `restoreImageKey`; `ensureImage` skips the fetch for own ids (throws "Das eigene Bild fehlt auf dem Gerät." if missing). Run → PASS. Commit.

### Task 2: Crop maths

**Files:** Create `js/crop.js`, `tests/crop.test.js`

**Produces:** view = `{ scale, x, y }` (image top-left in frame px).
- `initialView(w, h, frame)` – cover scale `frame / min(w,h)`, centred.
- `clampView(view, w, h, frame)` – scale in `[min, 4*min]`, `x ∈ [frame - w*scale, 0]`, same for y.
- `zoomAt(view, factor, cx, cy, w, h, frame)` – keeps point (cx,cy) fixed, then clamps.
- `sourceRect(view)` → `{ sx: -x/scale, sy: -y/scale, size: frame/scale }` (needs frame: `sourceRect(view, frame)`).

- [ ] Tests: `initialView(4000, 500, 300)` → scale 0.6, y 0, x −1050; `clampView` pulls x 10 back to 0 and scale 100 to 2.4; `zoomAt` factor 2 at centre of a 1000×1000 image in 300 frame doubles scale and keeps centre; `sourceRect(initialView(1000,1000,300),300)` → `{sx:0,sy:0,size:1000}`. FAIL → implement → PASS. Commit.

### Task 3: Cropper UI, card dialog and page dialog

**Files:** Create `js/cropper.js`; Modify `js/parent.js`, `css/style.css`, `sw.js`

**Consumes:** Task 1, Task 2. **Produces:** `openCropper(file): Promise<Blob|null>` – overlay above the dialog; resolves a 600×600 JPEG blob on "Übernehmen", `null` on "Zurück"; rejects with the decode message when the image cannot be loaded.

- [ ] Cropper: decode via `createImageBitmap(file)` (fallback `<img>` + object URL); frame ~min(70vh, 420px); one-pointer pan, two-pointer pinch (distance ratio around midpoint), wheel and range slider zoom around the centre; draw with `drawImage` from `sourceRect` onto a white 600² canvas; `canvas.toBlob(…, "image/jpeg", 0.85)`.
- [ ] Card dialog: button "Eigenes Bild" under the search form, hidden file input `accept="image/*"`; after crop keep the blob in the dialog, preview via object URL, set `pictoId = ownPictureId()`, clear the word field if it was filled by a search. On save: `putImage(pictoId, blob)` before `addCard/updateCard`. Message if no word.
- [ ] Shared helper `ownPictureButton(onPicked(blob))` in parent.js used by the card dialog and the page dialog (tab icon). Page dialog: after crop set `iconPictoId = ownPictureId()`, store the blob with `putImage` on save.
- [ ] Bump `VERSION` to v4, add `js/crop.js` and `js/cropper.js` to `sw.js`.
- [ ] Browser check at 1180×820: add a card with a local test photo, pan/zoom, save, reload, backup export + import keeps the picture. Commit and push.
