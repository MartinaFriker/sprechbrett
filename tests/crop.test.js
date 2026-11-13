import { test } from "node:test";
import assert from "node:assert/strict";
import { initialView, clampView, zoomAt, sourceRect, MAX_ZOOM, scaleRange, sliderToScale, scaleToSlider } from "../js/crop.js";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("initialView covers the frame and centres a wide photo", () => {
  const v = initialView(4000, 500, 300);
  near(v.scale, 0.6);
  near(v.x, -1050);
  near(v.y, 0);
});

test("clampView limits zoom to 4x and keeps the frame filled at cover size or more", () => {
  assert.equal(MAX_ZOOM, 4);
  const v = clampView({ scale: 100, x: 10, y: 50 }, 4000, 500, 300);
  near(v.scale, 2.4);
  near(v.x, 0);
  near(v.y, 0);
  const cover = clampView({ scale: 0.6, x: -5000, y: -5000 }, 4000, 500, 300);
  near(cover.x, 300 - 2400);
  near(cover.y, 0);
});

test("zooming out below cover size: the smaller photo stays inside the frame", () => {
  // Square photo: can shrink to half the cover size, then it may move only within the frame.
  const { min, cover, max } = scaleRange(1000, 1000, 300);
  near(cover, 0.3);
  near(min, 0.15);
  near(max, 1.2);
  const v = clampView({ scale: 0.01, x: -50, y: 500 }, 1000, 1000, 300);
  near(v.scale, 0.15);
  near(v.x, 0);
  near(v.y, 150);
  // Very wide photo: can shrink until all of it fits the frame.
  near(scaleRange(4000, 500, 300).min, 0.075);
});

test("slider: middle is cover size, ends are min and max", () => {
  const r = scaleRange(1000, 1000, 300);
  near(sliderToScale(0.5, r), r.cover);
  near(sliderToScale(0, r), r.min);
  near(sliderToScale(1, r), r.max);
  for (const t of [0, 0.2, 0.5, 0.8, 1]) near(scaleToSlider(sliderToScale(t, r), r), t);
});

test("zoomAt keeps the point under the fingers in place", () => {
  const v = zoomAt(initialView(1000, 1000, 300), 2, 150, 150, 1000, 1000, 300);
  near(v.scale, 0.6);
  near(v.x, -150);
  near(v.y, -150);
});

test("sourceRect maps the frame back to photo pixels", () => {
  const r = sourceRect(initialView(1000, 1000, 300), 300);
  near(r.sx, 0);
  near(r.sy, 0);
  near(r.size, 1000);
  const z = sourceRect(zoomAt(initialView(1000, 1000, 300), 2, 150, 150, 1000, 1000, 300), 300);
  near(z.sx, 250);
  near(z.size, 500);
});
