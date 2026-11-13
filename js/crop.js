// Crop maths for own photos. A view is { scale, x, y }: the photo is drawn at
// `scale` with its top-left corner at (x, y) inside a square frame of `frame` px.

export const MAX_ZOOM = 4;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// cover: the photo just fills the frame (start size, slider middle).
// min: zoomed out to half of that, or until the whole photo fits if that is smaller.
// max: MAX_ZOOM x cover.
export function scaleRange(w, h, frame) {
  const cover = frame / Math.min(w, h);
  const contain = frame / Math.max(w, h);
  return { min: Math.min(contain, cover / 2), cover, max: cover * MAX_ZOOM };
}

export function initialView(w, h, frame) {
  const scale = scaleRange(w, h, frame).cover;
  return { scale, x: (frame - w * scale) / 2, y: (frame - h * scale) / 2 };
}

// A side larger than the frame must cover it; a smaller side must stay inside it
// (the rest of the card is white).
function clampOffset(offset, size, frame) {
  return clamp(offset, Math.min(0, frame - size), Math.max(0, frame - size));
}

export function clampView(view, w, h, frame) {
  const { min, max } = scaleRange(w, h, frame);
  const scale = clamp(view.scale, min, max);
  return { scale, x: clampOffset(view.x, w * scale, frame), y: clampOffset(view.y, h * scale, frame) };
}

// Zoom by `factor` while the frame point (cx, cy) stays over the same photo pixel.
export function zoomAt(view, factor, cx, cy, w, h, frame) {
  const { min, max } = scaleRange(w, h, frame);
  const scale = clamp(view.scale * factor, min, max);
  const k = scale / view.scale;
  return clampView({ scale, x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k }, w, h, frame);
}

// Slider position 0..1 (logarithmic): 0 = min, 0.5 = cover, 1 = max.
export function sliderToScale(t, { min, cover, max }) {
  return t <= 0.5
    ? min * Math.pow(cover / min, t / 0.5)
    : cover * Math.pow(max / cover, (t - 0.5) / 0.5);
}

export function scaleToSlider(scale, { min, cover, max }) {
  return scale <= cover
    ? 0.5 * Math.log(scale / min) / Math.log(cover / min)
    : 0.5 + 0.5 * Math.log(scale / cover) / Math.log(max / cover);
}

// The square of the photo (in photo pixels) that the frame shows.
export function sourceRect(view, frame) {
  return { sx: -view.x / view.scale, sy: -view.y / view.scale, size: frame / view.scale };
}
