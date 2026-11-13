// Card sizes: SLOTS_PER_STRIP cards must fit a strip and SENTENCE_MAX cards the sentence bar.

import { SLOTS_PER_STRIP, SENTENCE_MAX } from "./model.js";

export function cardSizes({ width, height, strips, toolbar = 0, gap = 8, barPad = 12, tabsW = 132 }) {
  // Height: board padding + 5 cards with gaps around them, plus the sentence bar (one card high).
  const byHeight = (height - toolbar - 2 * gap - (SLOTS_PER_STRIP + 1) * gap - 2 * barPad - 2 * gap) / (SLOTS_PER_STRIP + 1);
  // Width: every strip must fit beside the tab column.
  const byWidth = (width - tabsW - 6 * gap) / strips - 3 * gap;
  const card = Math.floor(Math.min(byHeight, byWidth, 170));
  // Sentence bar: 8 cards + speak button (1 card) + return button (0.8 card) + paddings/gaps.
  const fixed = 4 * barPad + 4 * gap + 4 * gap + (SENTENCE_MAX + 1) * gap;
  const scard = Math.floor(Math.min(card, (width - fixed) / (SENTENCE_MAX + 1.8)));
  return { card, scard };
}
