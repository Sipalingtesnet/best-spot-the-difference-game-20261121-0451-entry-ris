// Twin Lanterns — sound synthesis.
// One job: make every game sound out of thin air with the Web Audio API.
// No audio files, no network. Two hard rules are enforced here:
//   1. nothing is ever played while the game is muted;
//   2. no AudioContext exists until a real user gesture unlocks it.

import { gameState } from "./state.js";

let audioCtx = null;

// Create (or resume) the audio context. Only ever called from a user gesture.
function unlockAudio() {
  const ContextClass = window.AudioContext || window.webkitAudioContext;
  if (!ContextClass) return; // very old browser: stay silent, game still works
  if (!audioCtx) {
    try {
      audioCtx = new ContextClass();
    } catch {
      audioCtx = null;
      return;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

// Attach the one-time gesture listeners that wake the audio engine up.
export function initSound() {
  const wake = () => unlockAudio();
  window.addEventListener("pointerdown", wake, { passive: true });
  window.addEventListener("keydown", wake);
}

// Gate shared by every sound: unlocked, running, and not muted.
function readyToPlay() {
  return Boolean(audioCtx) && audioCtx.state === "running" && !gameState.soundMuted;
}

// One enveloped oscillator note. Times are seconds relative to "now".
function note({ freq, wave = "sine", at = 0, length = 0.2, volume = 0.18, glideTo = null }) {
  const startAt = audioCtx.currentTime + at;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, startAt);
  if (glideTo !== null) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, startAt + length);
  }
  // Fast attack, gentle exponential fade — no clicks at the edges.
  amp.gain.setValueAtTime(0.0001, startAt);
  amp.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, startAt + length);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + length + 0.05);
}

// A difference was found: three rising bell-like tones, quick and bright.
export function playFoundChime() {
  if (!readyToPlay()) return;
  note({ freq: 659.25, wave: "sine", at: 0, length: 0.14, volume: 0.16 });
  note({ freq: 987.77, wave: "sine", at: 0.08, length: 0.16, volume: 0.16 });
  note({ freq: 1318.5, wave: "sine", at: 0.16, length: 0.26, volume: 0.14 });
}

// A wrong click: one low, slightly falling buzz.
export function playWrongBuzz() {
  if (!readyToPlay()) return;
  note({ freq: 98, wave: "sawtooth", at: 0, length: 0.28, volume: 0.2, glideTo: 70 });
  note({ freq: 49, wave: "square", at: 0, length: 0.28, volume: 0.08 });
}

// A button press or menu action: a tiny soft tick.
export function playButtonTick() {
  if (!readyToPlay()) return;
  note({ freq: 1500, wave: "triangle", at: 0, length: 0.045, volume: 0.1 });
}

// A round is complete: a short four-note fanfare ending on a held high note.
export function playRoundFanfare() {
  if (!readyToPlay()) return;
  const melody = [523.25, 659.25, 783.99]; // C5 E5 G5
  melody.forEach((freq, i) => {
    note({ freq, wave: "triangle", at: i * 0.12, length: 0.18, volume: 0.16 });
  });
  note({ freq: 1046.5, wave: "triangle", at: 0.36, length: 0.5, volume: 0.18 });
  note({ freq: 523.25, wave: "sine", at: 0.36, length: 0.5, volume: 0.1 });
}
