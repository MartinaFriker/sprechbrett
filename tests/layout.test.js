import { test } from "node:test";
import assert from "node:assert/strict";
import { cardSizes } from "../js/layout.js";

const GAP = 8, BAR_PAD = 12;
// Height used by 5 board cards plus the sentence bar must fit the given height.
const used = ({ card, scard }, toolbar = 0) =>
  toolbar + 2 * GAP + 5 * card + 6 * GAP + scard + 2 * GAP + 2 * BAR_PAD;

test("iPad landscape 1180x820 with 4 strips", () => {
  assert.deepEqual(cardSizes({ width: 1180, height: 820, strips: 4 }), { card: 119, scard: 101 });
});

test("everything fits vertically, also with safe-area insets and the parent toolbar", () => {
  for (const [width, height] of [[1180, 820], [1180, 776], [1024, 768], [1366, 1024], [1133, 744]]) {
    for (const toolbar of [0, 48]) {
      const s = cardSizes({ width, height, strips: 4, toolbar });
      assert.ok(used(s, toolbar) <= height, `${width}x${height} toolbar ${toolbar}`);
    }
  }
});

test("less height (safe-area insets) gives smaller cards", () => {
  assert.ok(cardSizes({ width: 1180, height: 776, strips: 4 }).card < cardSizes({ width: 1180, height: 820, strips: 4 }).card);
});

test("8 strips are limited by width", () => {
  const s = cardSizes({ width: 1024, height: 768, strips: 8 });
  assert.ok(8 * (s.card + 3 * GAP) + 132 + 6 * GAP <= 1024);
});
