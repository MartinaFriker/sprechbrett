// Reads the sentence aloud, one utterance per card, with a callback per word.
// All utterances are queued at once inside the user's tap, because iOS only
// allows speech that was started from a user gesture.

let token = 0;
let voice = null;

function pickVoice() {
  const voices = speechSynthesis.getVoices();
  voice =
    voices.find((v) => v.lang === "de-CH") ||
    voices.find((v) => v.lang === "de-DE" && v.localService) ||
    voices.find((v) => v.lang?.startsWith("de")) ||
    null;
}

if (typeof speechSynthesis !== "undefined") {
  pickVoice();
  speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

export function stopSpeaking() {
  token++;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

export function speakSequence(words, { onWord, onDone } = {}) {
  stopSpeaking();
  const my = token;
  if (!words.length || typeof speechSynthesis === "undefined") {
    onDone?.();
    return;
  }
  if (!voice) pickVoice();
  words.forEach((word, i) => {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = voice?.lang || "de-DE";
    if (voice) u.voice = voice;
    u.rate = 0.9;
    u.onstart = () => { if (my === token) onWord?.(i); };
    if (i === words.length - 1) {
      u.onend = u.onerror = () => { if (my === token) onDone?.(); };
    }
    speechSynthesis.speak(u);
  });
}
