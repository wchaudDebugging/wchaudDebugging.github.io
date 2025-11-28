/**
 * visualizers.js
 * Clean, human-readable implementation
 * Contains:
 * - Maze pathfinding (BFS, DFS, Dijkstra)
 * - Sorting visualizer (Bubble, Selection, Insertion, Merge, Quick, Heap)
 * - Sorting race (side-by-side)
 * - Sound effects + speed control
 *
 * No step-mode, no size sliders.
 * Sorting and race both use fixed readable array sizes.
 */

/* ----------------------------------------------------------
   Helpers
-----------------------------------------------------------*/
function $(id) {
  return document.getElementById(id);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms / Math.max(0.25, sortSpeed)));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* ----------------------------------------------------------
   SOUND ENGINE
-----------------------------------------------------------*/
const soundToggle = $('soundToggle');
let audioCtx;

// Browser-friendly lazy audio initialization
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
}

document.addEventListener(
  'click',
  () => {
    ensureAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  },
  { once: true }
);

function beep(value) {
  if (!soundToggle.checked) return;

  ensureAudio();
  if (!audioCtx) return;

  const frequency = 200 + value * 12; // maps 10–100 → 320–1400hz
  const durationMs = 25;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.value = frequency;
  gain.gain.value = 0.08;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + durationMs / 1000);
}

/* ----------------------------------------------------------
   MAZE VISUALIZER
-----------------------------------------------------------*/
const mazeCanvas = $('mazeCanvas');
const ctx = mazeCanvas.getContext('2d');

// Smaller grid for desktop
const GRID_SIZE = 15;
const CELL_SIZE = Math.floor(mazeCanvas.width / GRID_SIZE);

const START = { r: 0, c: 0 };
const GOAL = { r: GRID_SIZE - 1, c: GRID_SIZE - 1 };

let maze = [];
let mazeRunning = false;

function createMazeGrid() {
  maze = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push({
        r,
        c,
        wall: false,
        visited: false,
        parent: null,
        dist: Infinity,
        color: null
      });
    }
    maze.push(row);
  }
}

function drawMaze() {
  ctx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = maze[r][c];
      const x = c * CELL_SIZE;
      const y = r * CELL_SIZE;

      ctx.fillStyle = cell.wall ? '#171717' : '#173243';
      ctx.fillRect(x,
