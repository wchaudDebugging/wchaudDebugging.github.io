
/* ------------------------------------------------------
   Small utilities
------------------------------------------------------ */
function $(id) {
  return document.getElementById(id);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// For sorting speed multiplier (default 1x).
let sortSpeed = 1;

/** Sleep respecting speed multiplier */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms / Math.max(0.25, sortSpeed)));
}

/* ------------------------------------------------------
   Audio (simple beep)
------------------------------------------------------ */
let audioCtx = null;
const soundToggle = $("soundToggle");

function ensureAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
}

// First user click -> resume audio if needed
document.addEventListener(
  "click",
  () => {
    ensureAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  },
  { once: true }
);

function beep(value) {
  if (!soundToggle || !soundToggle.checked) return; // sound is off
  ensureAudio();
  if (!audioCtx) return;

  const freq = 150 + value * 12;
  const duration = 25;

  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = "square";
  oscillator.frequency.value = freq;
  gain.gain.value = 0.09;

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration / 1000);
}

/* ======================================================
   MAZE VISUALIZER
====================================================== */
const mazeCanvas = $("mazeCanvas");
const ctx = ma
