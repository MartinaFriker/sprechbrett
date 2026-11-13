import { test } from "node:test";
import assert from "node:assert/strict";
import { searchUrl, imageUrl, parseSearch, searchPictograms } from "../js/arasaac.js";

test("searchUrl trims and encodes the term", () => {
  assert.equal(searchUrl(" Apfel "), "https://api.arasaac.org/v1/pictograms/de/search/Apfel");
  assert.equal(searchUrl("Glace essen"), "https://api.arasaac.org/v1/pictograms/de/search/Glace%20essen");
});

test("imageUrl points to the 300px PNG", () => {
  assert.equal(imageUrl(2462), "https://static.arasaac.org/pictograms/2462/2462_300.png");
});

test("parseSearch takes the first keyword", () => {
  assert.deepEqual(
    parseSearch([{ _id: 2462, keywords: [{ keyword: "Apfel" }] }, { _id: 7, keywords: [] }]),
    [{ id: 2462, keyword: "Apfel" }, { id: 7, keyword: "" }],
  );
});

test("parseSearch keeps at most 60 results", () => {
  const many = Array.from({ length: 80 }, (_, i) => ({ _id: i, keywords: [] }));
  assert.equal(parseSearch(many).length, 60);
});

test("searchPictograms: 404 means no results", async () => {
  const fetchFn = async () => ({ ok: false, status: 404 });
  assert.deepEqual(await searchPictograms("xqz", fetchFn), []);
});

test("searchPictograms: parses a successful response", async () => {
  const fetchFn = async () => ({ ok: true, status: 200, json: async () => [{ _id: 1, keywords: [{ keyword: "a" }] }] });
  assert.deepEqual(await searchPictograms("a", fetchFn), [{ id: 1, keyword: "a" }]);
});

test("searchPictograms: network failure reports no internet", async () => {
  const fetchFn = async () => { throw new TypeError("Load failed"); };
  await assert.rejects(searchPictograms("Apfel", fetchFn), { message: "Keine Internetverbindung." });
});

test("searchPictograms: server error reports a failed search", async () => {
  const fetchFn = async () => ({ ok: false, status: 500 });
  await assert.rejects(searchPictograms("Apfel", fetchFn), { message: "Suche fehlgeschlagen." });
});
