import { test } from "node:test";
import assert from "node:assert/strict";
import { initialView, clampView, zoomAt, sourceRect, MAX_ZOOM } from "../js/crop.js";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("initialView covers the frame and centres a wide photo", () => {
  const v = initialView(4000, 500, 300);
  near(v.scale, 0.6);
  near(v.x, -1050);
  near(v.y, 0);
});

test("clampView limits zoom to 4x and never leaves an empty edge", () => {
  assert.equal(MAX_ZOOM, 4);
  const v = clampView({ scale: 100, x: 10, y: 50 }, 4000, 500, 300);
  near(v.scale, 2.4);
  near(v.x, 0);
  near(v.y, 0);
  const small = clampView({ scale: 0.01, x: -5000, y: -5000 }, 4000, 500, 300);
  near(small.scale, 0.6);
  near(small.x, 300 - 2400);
  near(small.y, 0);
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
