import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appFiles, injectCapacitor } from "../scripts/build-www.mjs";

test("appFiles: the service worker's file list, without the root entry", () => {
  const files = appFiles(readFileSync(new URL("../sw.js", import.meta.url), "utf8"));
  assert.ok(files.includes("index.html"));
  assert.ok(files.includes("js/speech.js"));
  assert.ok(files.includes("icons/icon-512.png"));
  assert.ok(!files.includes("./"));
});

test("injectCapacitor: loads capacitor.js before the app module", () => {
  const html = '<head>\n</head><body>\n<script type="module" src="js/app.js"></script>\n</body>';
  const out = injectCapacitor(html);
  assert.ok(out.indexOf('src="js/vendor/capacitor.js"') < out.indexOf('src="js/app.js"'));
  assert.equal(injectCapacitor(out), out);
});
