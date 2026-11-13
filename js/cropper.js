// Crop dialog for own photos: pan with one finger, pinch with two, or use the slider.
// Resolves with a square JPEG blob, or null when the parent goes back.

import { initialView, clampView, zoomAt, sourceRect, MAX_ZOOM } from "./crop.js";

export const OUTPUT_PX = 600;
const DECODE_ERROR = "Dieses Bild kann hier nicht geöffnet werden. Bitte ein JPG- oder PNG-Bild wählen.";

// Decode a picked file into something drawImage can use (respects photo orientation).
async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try {
      // Ask explicitly for EXIF orientation; if a browser rejects the option, the <img> path below applies it.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to <img>: some browsers decode more formats that way.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error(DECODE_ERROR);
  } finally {
    // Safe: a decoded image stays drawable after its URL is revoked.
    URL.revokeObjectURL(url);
  }
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Draw the chosen square onto a white canvas and encode it as JPEG.
function render(source, view, frame) {
  const { sx, sy, size } = sourceRect(view, frame);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = OUTPUT_PX;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, OUTPUT_PX, OUTPUT_PX);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, size, size, 0, 0, OUTPUT_PX, OUTPUT_PX);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(DECODE_ERROR))), "image/jpeg", 0.85));
}

// Album photos can have 12-48 megapixels; redrawing that on every finger move is slow
// and memory hungry on an iPad. Keep at most MAX_SOURCE_PX on the long side, which
// still gives full output detail at the highest zoom.
const MAX_SOURCE_PX = 3000;
function shrink(img) {
  const long = Math.max(img.width, img.height);
  if (long <= MAX_SOURCE_PX) return img;
  const k = MAX_SOURCE_PX / long;
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, c.width, c.height);
  img.close?.();
  return c;
}

export async function openCropper(file) {
  const decoded = await decode(file);
  if (!decoded.width || !decoded.height) throw new Error(DECODE_ERROR);
  const source = shrink(decoded);
  const w = source.width, h = source.height;
  const frame = Math.round(Math.min(window.innerHeight * 0.6, window.innerWidth * 0.8, 420));

  const dlg = el("dialog", "dlg cropper");
  dlg.append(el("h2", "", "Ausschnitt wählen"));
  const hint = el("p", "crop-hint", "Bild mit dem Finger verschieben, mit zwei Fingern vergrössern.");
  const box = el("div", "crop-frame");
  box.style.width = box.style.height = frame + "px";
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.height = Math.round(frame * dpr);
  canvas.style.width = canvas.style.height = frame + "px";
  box.append(canvas);
  const slider = el("input", "crop-zoom");
  slider.type = "range";
  slider.min = "1";
  slider.max = String(MAX_ZOOM);
  slider.step = "0.01";
  slider.setAttribute("aria-label", "Zoom");
  const actions = el("div", "dlg-actions");
  const back = el("button", "btn", "Zurück");
  const ok = el("button", "btn primary", "Übernehmen");
  back.type = ok.type = "button";
  actions.append(el("span", "spacer"), back, ok);
  dlg.append(hint, box, slider, actions);
  document.body.append(dlg);

  let view = initialView(w, h, frame);
  const minScale = view.scale;
  const ctx = canvas.getContext("2d");
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, frame, frame);
    ctx.drawImage(source, view.x, view.y, w * view.scale, h * view.scale);
    slider.value = String(view.scale / minScale);
  };
  draw();

  // Pointer handling: one pointer pans, two pointers pinch around their midpoint.
  const pointers = new Map();
  let last = null;
  const local = (e) => {
    const r = box.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const gesture = () => {
    const pts = [...pointers.values()];
    if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, d: 0 };
    const [a, b] = pts;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
  };
  box.addEventListener("pointerdown", (e) => {
    if (pointers.size >= 2) return;
    box.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, local(e));
    last = gesture();
  });
  box.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, local(e));
    const g = gesture();
    let v = { ...view, x: view.x + g.x - last.x, y: view.y + g.y - last.y };
    if (g.d && last.d) v = zoomAt(v, g.d / last.d, g.x, g.y, w, h, frame);
    view = clampView(v, w, h, frame);
    last = g;
    draw();
  });
  const lift = (e) => {
    pointers.delete(e.pointerId);
    last = pointers.size ? gesture() : null;
  };
  box.addEventListener("pointerup", lift);
  box.addEventListener("pointercancel", lift);
  box.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = local(e);
    view = zoomAt(view, Math.exp(-e.deltaY / 300), p.x, p.y, w, h, frame);
    draw();
  }, { passive: false });
  slider.addEventListener("input", () => {
    const target = Number(slider.value) * minScale;
    view = zoomAt(view, target / view.scale, frame / 2, frame / 2, w, h, frame);
    draw();
  });

  return new Promise((resolve, reject) => {
    const finish = (value, error) => {
      dlg.close();
      dlg.remove();
      source.close?.();
      if (error) reject(error);
      else resolve(value);
    };
    back.addEventListener("click", () => finish(null));
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); finish(null); });
    ok.addEventListener("click", async () => {
      ok.disabled = true;
      try {
        finish(await render(source, view, frame));
      } catch (err) {
        finish(null, err);
      }
    });
    dlg.showModal();
  });
}
