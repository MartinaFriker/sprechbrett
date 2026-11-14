// Builds www/ for the native app (Capacitor): copies the app files listed in sw.js
// and loads capacitor.js, which the web version on GitHub Pages does not need.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function appFiles(swSource) {
  const list = swSource.match(/const APP_FILES = \[([\s\S]*?)\];/)[1];
  return [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((f) => f !== "./");
}

const TAG = '<script src="js/vendor/capacitor.js"></script>';

export function injectCapacitor(html) {
  if (html.includes(TAG)) return html;
  return html.replace('<script type="module" src="js/app.js"></script>', `${TAG}\n<script type="module" src="js/app.js"></script>`);
}

function build() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const out = join(root, "www");
  rmSync(out, { recursive: true, force: true });
  for (const f of appFiles(readFileSync(join(root, "sw.js"), "utf8"))) {
    mkdirSync(dirname(join(out, f)), { recursive: true });
    copyFileSync(join(root, f), join(out, f));
  }
  mkdirSync(join(out, "js/vendor"), { recursive: true });
  copyFileSync(join(root, "node_modules/@capacitor/core/dist/capacitor.js"), join(out, "js/vendor/capacitor.js"));
  writeFileSync(join(out, "index.html"), injectCapacitor(readFileSync(join(root, "index.html"), "utf8")));
  console.log("www/ ready");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
