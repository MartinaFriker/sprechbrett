import { test } from "node:test";
import assert from "node:assert/strict";
import { germanVoices, chooseVoice } from "../js/speech.js";

const v = (name, lang, voiceURI = name, localService = true) => ({ name, lang, voiceURI, localService });
const all = [
  v("Samantha", "en-US"),
  v("Markus", "de-DE"),
  v("Grandma", "de-DE"),
  v("Anna", "de-DE"),
  v("Petra (Erweitert)", "de-DE"),
  v("Google Deutsch", "de-DE", "g", false),
  v("Yannick", "de-CH"),
];

test("germanVoices: only German, no novelty voices, Swiss first, then by name", () => {
  assert.deepEqual(germanVoices(all).map((x) => x.name),
    ["Yannick", "Anna", "Google Deutsch", "Markus", "Petra (Erweitert)"]);
});

test("chooseVoice: the chosen voice if installed, otherwise the automatic pick", () => {
  assert.equal(chooseVoice(all, "Markus").name, "Markus");
  assert.equal(chooseVoice(all, "gone").name, "Yannick");
  assert.equal(chooseVoice(all, null).name, "Yannick");
  assert.equal(chooseVoice(all.filter((x) => x.lang !== "de-CH"), null).name, "Markus");
  assert.equal(chooseVoice([v("Samantha", "en-US")], null), null);
});

import { speechPlan } from "../js/speech.js";

test("speechPlan: recordings where a card has one, the voice otherwise", () => {
  const cards = [{ word: "Ich", audioId: "rec-1" }, { word: "möchte" }, { word: "Apfel", audioId: null }];
  assert.deepEqual(speechPlan(cards), [
    { kind: "audio", id: "rec-1", word: "Ich" },
    { kind: "voice", word: "möchte" },
    { kind: "voice", word: "Apfel" },
  ]);
});

import { nativeVoiceIndex } from "../js/speech.js";

test("nativeVoiceIndex: index of the chosen voice in the plugin's full list", () => {
  assert.equal(nativeVoiceIndex(all, "Markus"), 1);
  assert.equal(nativeVoiceIndex(all, null), 6); // automatic pick: the Swiss voice
  assert.equal(nativeVoiceIndex([v("Samantha", "en-US")], null), -1);
});
