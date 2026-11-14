// Persistent storage in IndexedDB: the book (store "kv") and picture blobs (store "images").

import { withRetry } from "./retry.js";

const DB_NAME = "sprechbrett";
const DB_VERSION = 1;

let dbPromise = null;
const urlCache = new Map(); // picto id -> object URL

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv");
        if (!d.objectStoreNames.contains("images")) d.createObjectStore("images");
      };
      req.onsuccess = () => {
        const d = req.result;
        // iOS may drop the connection while the app is in the background: reconnect next time.
        d.onclose = () => { dbPromise = null; };
        d.onversionchange = () => { d.close(); dbPromise = null; };
        resolve(d);
      };
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

function run(storeName, mode, fn) {
  return withRetry(() => runOnce(storeName, mode, fn), () => { dbPromise = null; });
}

async function runOnce(storeName, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadBook() {
  return (await run("kv", "readonly", (s) => s.get("book"))) ?? null;
}

export async function saveBook(book) {
  await run("kv", "readwrite", (s) => s.put(book, "book"));
}

export async function putImage(id, blob) {
  await run("images", "readwrite", (s) => s.put(blob, id));
  const old = urlCache.get(id);
  if (old) URL.revokeObjectURL(old);
  urlCache.delete(id);
}

export async function putImageDataUrl(id, dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  await putImage(id, blob);
}

export async function hasImage(id) {
  return (await run("images", "readonly", (s) => s.count(id))) > 0;
}

export async function getImageUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = await run("images", "readonly", (s) => s.get(id));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

// Raw stored blob (pictures and sound recordings share this store).
export async function getBlob(id) {
  return (await run("images", "readonly", (s) => s.get(id))) ?? null;
}

export async function getImageDataUrl(id) {
  const blob = await run("images", "readonly", (s) => s.get(id));
  if (!blob) return null;
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function requestPersistence() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// Synchronous lookup for already loaded pictures (avoids flicker on re-render).
export function cachedImageUrl(id) {
  return urlCache.get(id) ?? null;
}
