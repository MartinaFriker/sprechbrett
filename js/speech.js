// Reads the sentence aloud, one utterance per card, with a callback per word.
// All utterances are queued at once inside the user's tap, because iOS only
// allows speech that was started from a user gesture.

let token = 0;
let audioCtx = null;
let currentSource = null;
const buffers = new Map(); // recording id -> Promise<AudioBuffer>

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

// What to play for each card: its own recording if it has one, the voice otherwise.
export function speechPlan(cards) {
  return cards.map((c) => (c.audioId ? { kind: "audio", id: c.audioId, word: c.word } : { kind: "voice", word: c.word }));
}

export function stopSpeaking() {
  token++;
  if (hasSpeech()) speechSynthesis.cancel();
  try { currentSource?.stop(); } catch { /* already stopped */ }
  currentSource = null;
}

// ---------- Own recordings (Web Audio) ----------

// Must be called inside the tap: iOS only lets a gesture start (resume) audio.
function unlockAudio() {
  const Ctx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!Ctx) return null;
  audioCtx ??= new Ctx();
  if (audioCtx.state !== "running") audioCtx.resume();
  return audioCtx;
}

function loadBuffer(id, getBlob) {
  if (!buffers.has(id)) {
    const p = getBlob(id)
      .then((blob) => {
        if (!blob) throw new Error("Aufnahme fehlt");
        return blob.arrayBuffer();
      })
      .then((data) => audioCtx.decodeAudioData(data));
    p.catch(() => buffers.delete(id));
    buffers.set(id, p);
  }
  return buffers.get(id);
}

function playBuffer(buffer) {
  return new Promise((resolve) => {
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(audioCtx.destination);
    src.onended = () => resolve();
    currentSource = src;
    src.start();
  });
}

// One spoken word; resolves when done (with a safety timeout, iOS sometimes skips onend).
function speakOne(word, voice, pitch, rate) {
  return new Promise((resolve) => {
    if (!hasSpeech()) { resolve(); return; }
    const u = new SpeechSynthesisUtterance(word);
    u.lang = voice?.lang || "de-DE";
    if (voice) u.voice = voice;
    u.pitch = pitch;
    u.rate = rate;
    const timer = setTimeout(resolve, 2000 + word.length * 400);
    u.onend = u.onerror = () => { clearTimeout(timer); resolve(); };
    speechSynthesis.speak(u);
  });
}

// Reads the sentence: each card's own recording if it has one, the chosen voice otherwise.
// Call it directly from the tap on the speak button.
export function playSentence(cards, { onWord, onDone, getBlob, voiceURI = null, pitch = 1, rate = 0.9 } = {}) {
  const plan = speechPlan(cards);
  if (!plan.some((p) => p.kind === "audio")) {
    speakSequence(plan.map((p) => p.word), { onWord, onDone, voiceURI, pitch, rate });
    return;
  }
  stopSpeaking();
  const my = token;
  const ctx = unlockAudio();
  // Unlock speech inside the tap too, so voice words after a recording are allowed on iOS.
  if (hasSpeech()) {
    const silent = new SpeechSynthesisUtterance(" ");
    silent.volume = 0;
    speechSynthesis.speak(silent);
  }
  const voice = hasSpeech() ? chooseVoice(speechSynthesis.getVoices(), voiceURI) : null;
  if (ctx) plan.forEach((p) => { if (p.kind === "audio") loadBuffer(p.id, getBlob); });
  (async () => {
    for (let i = 0; i < plan.length; i++) {
      if (my !== token) return;
      const p = plan[i];
      onWord?.(i);
      let played = false;
      if (p.kind === "audio" && ctx) {
        try {
          const buffer = await loadBuffer(p.id, getBlob);
          if (my !== token) return;
          await playBuffer(buffer);
          played = true;
        } catch {
          // A missing or broken recording falls back to the voice.
        }
      }
      if (!played) await speakOne(p.word, voice, pitch, rate);
    }
    if (my === token) onDone?.();
  })();
}

// A recording was replaced or removed: do not play a cached old version.
export function forgetRecording(id) {
  buffers.delete(id);
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
