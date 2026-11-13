// Hand-drawn SVG pictograms for the app's own buttons.

// Open mouth with an empty round speech bubble: "speak".
export const ICON_SPEAK = `
<svg viewBox="0 0 120 100" aria-hidden="true">
  <path d="M4 66 C14 46 34 42 42 51 C50 42 70 46 80 66 C70 92 14 92 4 66 Z"
        fill="#e0403a" stroke="#222" stroke-width="4" stroke-linejoin="round"/>
  <path d="M12 66 C24 59 60 59 72 66 C62 82 22 82 12 66 Z" fill="#5b1616" stroke="#222" stroke-width="3"/>
  <path d="M19 63.5 C31 60 53 60 65 63.5 L63 68.5 C51 66 33 66 21 68.5 Z" fill="#fff"/>
  <ellipse cx="86" cy="28" rx="30" ry="22" fill="#fff" stroke="#222" stroke-width="4"/>
  <path d="M64.8 43.6 L54 56 L75.7 48.7 L72 40 Z" fill="#fff"/>
  <path d="M64.8 43.6 L54 56 L75.7 48.7" fill="none" stroke="#222" stroke-width="4"
        stroke-linejoin="round" stroke-linecap="round"/>
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
