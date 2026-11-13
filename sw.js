// Service worker: keeps the app usable offline and installable.
// Raise VERSION whenever an app file changes, so devices load the new version.
const VERSION = "v5";
const APP_CACHE = "sprechbrett-app-" + VERSION;

const APP_FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/arasaac.js",
  "js/backup.js",
  "js/board.js",
  "js/crop.js",
  "js/cropper.js",
  "js/gate.js",
  "js/gesture.js",
  "js/icons.js",
  "js/layout.js",
  "js/model.js",
  "js/parent.js",
  "js/retry.js",
  "js/speech.js",
  "js/startup.js",
  "js/store.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_FILES.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== APP_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Pictogram search and pictures go to the network; chosen pictures live in IndexedDB.
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(APP_CACHE).then((cache) =>
      cache.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) cache.put(request, res.clone());
        return res;
      })),
    ),
  );
});
