import { DEFAULT_BACKGROUND, OLD_DEFAULT_BACKGROUND, PALETTE } from "./model.js";

// Loads the stored book. A failed read must never be mistaken for "nothing stored",
// otherwise a new empty book would overwrite the real one.

export class LoadError extends Error {
  constructor(cause) {
    super("Das Buch konnte nicht geladen werden.");
    this.name = "LoadError";
    this.cause = cause;
  }
}

export async function loadInitialBook(load, create) {
  let book;
  try {
    book = await load();
  } catch (e) {
    throw new LoadError(e);
  }
  if (!book) return { book: create(), fresh: true };
  // Drop sentence entries whose card no longer exists (e.g. from an old or edited file).
  if (Array.isArray(book.sentence)) book.sentence = book.sentence.filter((id) => id in (book.cards ?? {}));
  else book.sentence = [];
  // Once per book: the old orange default becomes the new soft yellow; own colours stay.
  if (book.settings && book.settings.palette !== PALETTE) {
    if (book.settings.background === OLD_DEFAULT_BACKGROUND) book.settings.background = DEFAULT_BACKGROUND;
    book.settings.palette = PALETTE;
  }
  return { book, fresh: false };
}
