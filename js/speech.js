// Reads the sentence aloud, one utterance per card, with a callback per word.
// All utterances are queued at once inside the user's tap, because iOS only
// allows speech that was started from a user gesture.

let token = 0;

// Novelty voices on Apple devices that sound odd for a child's sentence.
const NOVELTY = /Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Bad News|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox/;

const hasSpeech = () => typeof speechSynthesis !== "undefined";

// German voices for the settings list: Swiss ones first, then by name.
export function germanVoices(voices) {
  return voices
    .filter((v) => v.lang?.startsWith("de") && !NOVELTY.test(v.name))
    .sort((a, b) => (b.lang === "de-CH") - (a.lang === "de-CH") || a.name.localeCompare(b.name, "de"));
}

// The chosen voice if it is installed on this device, otherwise an automatic German pick.
export function chooseVoice(voices, voiceURI) {
  if (voiceURI) {
    const chosen = voices.find((v) => v.voiceURI === voiceURI);
    if (chosen) return chosen;
  }
  const usable = voices.filter((v) => !NOVELTY.test(v.name));
  return (
    usable.find((v) => v.lang === "de-CH") ||
    usable.find((v) => v.lang === "de-DE" && v.localService) ||
    usable.find((v) => v.lang?.startsWith("de")) ||
    voices.find((v) => v.lang?.startsWith("de")) ||
    null
  );
}

// Installed German voices; iOS loads the list late, so callers can listen for changes.
export function availableVoices() {
  return hasSpeech() ? germanVoices(speechSynthesis.getVoices()) : [];
}
// Returns a function that stops listening.
export function onVoicesChanged(fn) {
  if (!hasSpeech() || !speechSynthesis.addEventListener) return () => {};
  speechSynthesis.addEventListener("voiceschanged", fn);
  return () => speechSynthesis.removeEventListener("voiceschanged", fn);
}
// Ask for the list early so it is ready when the first sentence is spoken.
if (hasSpeech()) speechSynthesis.getVoices();

export function stopSpeaking() {
  token++;
  if (hasSpeech()) speechSynthesis.cancel();
}

export function speakSequence(words, { onWord, onDone, voiceURI = null, pitch = 1, rate = 0.9 } = {}) {
  stopSpeaking();
  const my = token;
  if (!words.length || !hasSpeech()) {
    onDone?.();
    return;
  }
  const voice = chooseVoice(speechSynthesis.getVoices(), voiceURI);
  words.forEach((word, i) => {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = voice?.lang || "de-DE";
    if (voice) u.voice = voice;
    u.pitch = pitch;
    u.rate = rate;
    u.onstart = () => { if (my === token) onWord?.(i); };
    if (i === words.length - 1) {
      u.onend = u.onerror = () => { if (my === token) onDone?.(); };
    }
    speechSynthesis.speak(u);
  });
}
