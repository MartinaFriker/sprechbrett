// Tells a tap apart from a drag by how far the finger has moved.

export const TAP_THRESHOLD_PX = 10;

export function classifyGesture(dx, dy, threshold = TAP_THRESHOLD_PX) {
  return Math.hypot(dx, dy) > threshold ? "drag" : "tap";
}
