// Card sizes: SLOTS_PER_STRIP cards must fit a strip and SENTENCE_MAX cards the sentence bar.

import { SLOTS_PER_STRIP, SENTENCE_MAX } from "./model.js";

export function cardSizes({ width, height, strips, toolbar = 0, gap = 8, barPad = 12, tabsW = 132 }) {
  // Height: board padding + 5 cards with gaps around them, plus the sentence bar (one card high).
  const byHeight = (height - toolbar - 2 * gap - (SLOTS_PER_STRIP + 1) * gap - 2 * barPad - 2 * gap) / (SLOTS_PER_STRIP + 1);
  // Width: every strip must fit beside the tab column.
  const byWidth = (width - tabsW - 6 * gap) / strips - 3 * gap;
  const card = Math.floor(Math.min(byHeight, byWidth, 170));
  // Sentence bar: bar padding, two bar gaps, two round buttons (one card + 2 gaps each),
  // the strip's own padding and the gaps between its 8 cards.
  const fixed = 4 * barPad + 2 * 2 * gap + 2 * 2 * gap + 2 * gap + (SENTENCE_MAX - 1) * gap;
  const scard = Math.floor(Math.min(card, (width - fixed) / (SENTENCE_MAX + 2)));
  return { card, scard };
}
