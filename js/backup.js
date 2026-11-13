// Backup file format: the whole book plus all pictures as data URLs.

const NOT_A_BACKUP = "Diese Datei ist keine Sprechbrett-Sicherung.";

export function serializeBackup(book, images, now) {
  return JSON.stringify({
    app: "sprechbrett",
    version: 1,
    exportedAt: now.toISOString(),
    book,
    images,
  });
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(NOT_A_BACKUP);
  }
  const book = data?.book;
  if (data?.app !== "sprechbrett" || !Array.isArray(book?.pages) || book.pages.length === 0 ||
      typeof book.cards !== "object" || book.cards === null || typeof book.settings !== "object") {
    throw new Error(NOT_A_BACKUP);
  }
  if (!Array.isArray(book.sentence)) book.sentence = [];
  return { book, images: data.images ?? {} };
}
