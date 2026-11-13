// ARASAAC pictogram search (https://arasaac.org, licence CC BY-NC-SA 4.0).

const API = "https://api.arasaac.org/v1/pictograms/de/search/";
const MAX_RESULTS = 60;

export function searchUrl(term) {
  return API + encodeURIComponent(term.trim());
}

export function imageUrl(id) {
  return `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
}

export function parseSearch(json) {
  return json.slice(0, MAX_RESULTS).map((p) => ({
    id: p._id,
    keyword: p.keywords?.[0]?.keyword ?? "",
  }));
}

export async function searchPictograms(term, fetchFn = fetch) {
  let res;
  try {
    res = await fetchFn(searchUrl(term));
  } catch {
    throw new Error("Keine Internetverbindung.");
  }
  // ARASAAC answers 404 when nothing matches.
  if (res.status === 404) return [];
  if (!res.ok) throw new Error("Suche fehlgeschlagen.");
  return parseSearch(await res.json());
}

export async function fetchPictogram(id, fetchFn = fetch) {
  let res;
  try {
    res = await fetchFn(imageUrl(id));
  } catch {
    throw new Error("Keine Internetverbindung.");
  }
  if (!res.ok) throw new Error("Bild konnte nicht geladen werden.");
  return res.blob();
}
