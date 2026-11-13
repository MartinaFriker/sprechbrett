// Hand-drawn SVG pictograms for the app's own buttons.

// Open mouth with sound waves: "speak".
export const ICON_MOUTH = `
<svg viewBox="0 0 120 100" aria-hidden="true">
  <path d="M10 50 C22 26 46 22 56 32 C66 22 90 26 100 50 C88 80 22 80 10 50 Z"
        fill="#e0403a" stroke="#222" stroke-width="4" stroke-linejoin="round"/>
  <path d="M20 50 C34 42 76 42 90 50 C78 68 32 68 20 50 Z" fill="#5b1616" stroke="#222" stroke-width="3"/>
  <path d="M28 47 C42 43 68 43 82 47 L80 53 C66 50 44 50 30 53 Z" fill="#fff"/>
  <path d="M104 36 Q112 50 104 64" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round"/>
  <path d="M110 28 Q122 50 110 72" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round"/>
</svg>`;

// Three cards with arrows flying back up: "put all cards back".
const arrow = (x) => `
  <line x1="${x}" y1="50" x2="${x}" y2="16" stroke="#222" stroke-width="5" stroke-linecap="round"/>
  <path d="M${x - 9} 24 L${x} 10 L${x + 9} 24" fill="none" stroke="#222" stroke-width="5"
        stroke-linecap="round" stroke-linejoin="round"/>`;
const card = (x) => `
  <rect x="${x}" y="58" width="28" height="34" rx="4" fill="#fff" stroke="#222" stroke-width="3.5"/>
  <circle cx="${x + 14}" cy="71" r="6" fill="#f39200"/>
  <line x1="${x + 7}" y1="85" x2="${x + 21}" y2="85" stroke="#222" stroke-width="3"/>`;
export const ICON_RETURN_ALL = `
<svg viewBox="0 0 120 100" aria-hidden="true">
  ${card(10)}${card(46)}${card(82)}
  <g transform="rotate(-15 24 54)">${arrow(24)}</g>
  ${arrow(60)}
  <g transform="rotate(15 96 54)">${arrow(96)}</g>
</svg>`;

export const ICON_GEAR = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/>
</svg>`;

export const ICON_PLUS = `
<svg viewBox="0 0 40 40" aria-hidden="true">
  <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="5 4"/>
  <path d="M20 11v18M11 20h18" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
</svg>`;
