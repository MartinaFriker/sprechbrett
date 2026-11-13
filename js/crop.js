// Crop maths for own photos. A view is { scale, x, y }: the photo is drawn at
// `scale` with its top-left corner at (x, y) inside a square frame of `frame` px.

export const MAX_ZOOM = 4;

// Smallest scale at which the photo still covers the whole frame.
function coverScale(w, h, frame) {
  return frame / Math.min(w, h);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function initialView(w, h, frame) {
  const scale = coverScale(w, h, frame);
  return { scale, x: (frame - w * scale) / 2, y: (frame - h * scale) / 2 };
}

// Keep the zoom between cover and MAX_ZOOM x cover, and the frame always filled.
export function clampView(view, w, h, frame) {
  const min = coverScale(w, h, frame);
  const scale = clamp(view.scale, min, min * MAX_ZOOM);
  return {
    scale,
    x: clamp(view.x, frame - w * scale, 0),
    y: clamp(view.y, frame - h * scale, 0),
  };
}

// Zoom by `factor` while the frame point (cx, cy) stays over the same photo pixel.
export function zoomAt(view, factor, cx, cy, w, h, frame) {
  const min = coverScale(w, h, frame);
  const scale = clamp(view.scale * factor, min, min * MAX_ZOOM);
  const k = scale / view.scale;
  return clampView({ scale, x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k }, w, h, frame);
}

// The square of the photo (in photo pixels) that the frame shows.
export function sourceRect(view, frame) {
  return { sx: -view.x / view.scale, sy: -view.y / view.scale, size: frame / view.scale };
}
