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
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

      if (cell.visited) {
        ctx.fillStyle = cell.color || 'rgba(77,163,255,0.45)';
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }

      if (r === START.r && c === START.c) {
        ctx.fillStyle = '#64ff9c';
        ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
      }

      if (r === GOAL.r && c === GOAL.c) {
        ctx.fillStyle = '#ff8c6a';
        ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }
}

function neighbors(r, c) {
  const out = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
      if (!maze[nr][nc].wall) out.push(maze[nr][nc]);
    }
  }
  return out;
}

function resetVisited() {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      maze[r][c].visited = false;
      maze[r][c].parent = null;
      maze[r][c].dist = Infinity;
      maze[r][c].color = null;
    }
  }
}

function generateMaze() {
  createMazeGrid();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if ((r === START.r && c === START.c) || (r === GOAL.r && c === GOAL.c)) continue;
      maze[r][c].wall = Math.random() < 0.28;
    }
  }
  drawMaze();
}

async function drawPath() {
  let cur = maze[GOAL.r][GOAL.c];

  while (cur) {
    const x = cur.c * CELL_SIZE;
    const y = cur.r * CELL_SIZE;
    ctx.fillStyle = '#ff8c6a';
    ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
    await sleep(35);
    cur = cur.parent;
  }
}

async function runBFS() {
  if (mazeRunning) return;
  mazeRunning = true;
  resetVisited();

  const q = [];
  const start = maze[START.r][START.c];
  start.visited = true;
  q.push(start);

  while (q.length) {
    const cur = q.shift();
    cur.color = 'rgba(77,163,255,0.45)';

    if (cur === maze[GOAL.r][GOAL.c]) break;

    for (const n of neighbors(cur.r, cur.c)) {
      if (!n.visited) {
        n.visited = true;
        n.parent = cur;
        q.push(n);
      }
    }

    drawMaze();
    await sleep(24);
  }

  await drawPath();
  mazeRunning = false;
}

async function runDFS() {
  if (mazeRunning) return;
  mazeRunning = true;
  resetVisited();

  const stack = [];
  const start = maze[START.r][START.c];
  start.visited = true;
  stack.push(start);

  while (stack.length) {
    const cur = stack.pop();
    cur.color = 'rgba(100,255,156,0.45)';

    if (cur === maze[GOAL.r][GOAL.c]) break;

    for (const n of neighbors(cur.r, cur.c)) {
      if (!n.visited) {
        n.visited = true;
        n.parent = cur;
        stack.push(n);
      }
    }

    drawMaze();
    await sleep(24);
  }

  await drawPath();
  mazeRunning = false;
}

async function runDijkstra() {
  if (mazeRunning) return;
  mazeRunning = true;
  resetVisited();

  const pq = [];
  const start = maze[START.r][START.c];
  start.dist = 0;
  pq.push(start);

  while (pq.length) {
    pq.sort((a, b) => a.dist - b.dist);
    const cur = pq.shift();

    if (cur.visited) continue;
    cur.visited = true;
    cur.color = 'rgba(255,233,122,0.45)';

    if (cur === maze[GOAL.r][GOAL.c]) break;

    for (const n of neighbors(cur.r, cur.c)) {
      const alt = cur.dist + 1;
      if (alt < n.dist) {
        n.dist = alt;
        n.parent = cur;
        pq.push(n);
      }
    }

    drawMaze();
    await sleep(18);
  }

  await drawPath();
  mazeRunning = false;
}

mazeCanvas.addEventListener('click', (e) => {
  if (mazeRunning) return;

  const rect = mazeCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor(x / CELL_SIZE);
  const r = Math.floor(y / CELL_SIZE);

  if ((r === START.r && c === START.c) || (r === GOAL.r && c === GOAL.c)) return;

  maze[r][c].wall = !maze[r][c].wall;
  drawMaze();
});

$('bfsBtn').onclick = runBFS;
$('dfsBtn').onclick = runDFS;
$('dijkstraBtn').onclick = runDijkstra;
$('mazeGenBtn').onclick = generateMaze;
$('mazeResetBtn').onclick = () => {
  if (!mazeRunning) {
    createMazeGrid();
    drawMaze();
  }
};

// init
createMazeGrid();
generateMaze();

/* ----------------------------------------------------------
   SORTING VISUALIZER
-----------------------------------------------------------*/
const barsBox = $('bars');
const sortSelect = $('sortSelect');
const sortRun = $('sortRun');
const sortReset = $('sortReset');

let sortArray = [];
let sorting = false;

let sortSpeed = 1; // multiplier

$('slowDownBtn').onclick = () => {
  sortSpeed = clamp(sortSpeed / 2, 0.25, 8);
  $('speedDisplay').textContent = sortSpeed + '×';
};
$('speedUpBtn').onclick = () => {
  sortSpeed = clamp(sortSpeed * 2, 0.25, 8);
  $('speedDisplay').textContent = sortSpeed + '×';
};

function generateSortArray() {
  // fixed size for clean visuals
  const size = 32;
  const arr = [];
  for (let i = 0; i < size; i++) {
    arr.push(Math.floor(Math.random() * 90) + 10);
  }
  return arr;
}

function drawBars(arr, container, height = 200) {
  container.innerHTML = '';
  const max = Math.max(...arr);

  arr.forEach((v) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = Math.max(8, (v / max) * (height - 8)) + 'px';
    bar.textContent = v;
    container.appendChild(bar);
  });
}

async function bubbleSort(a) {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - 1 - i; j++) {
      beep(a[j]);
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
      }
      drawBars(a, barsBox);
      await sleep(45);
    }
  }
}

async function selectionSort(a) {
  for (let i = 0; i < a.length; i++) {
    let min = i;
    for (let j = i + 1; j < a.length; j++) {
      beep(a[j]);
      if (a[j] < a[min]) min = j;
      drawBars(a, barsBox);
      await sleep(35);
    }
    [a[i], a[min]] = [a[min], a[i]];
    drawBars(a, barsBox);
  }
}

async function insertionSort(a) {
  for (let i = 1; i < a.length; i++) {
    let key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      beep(a[j]);
      a[j + 1] = a[j];
      j--;
      drawBars(a, barsBox);
      await sleep(30);
    }
    a[j + 1] = key;
    drawBars(a, barsBox);
  }
}

async function mergeSortDriver(a) {
  await mergeSort(a, 0, a.length - 1);
}

async function mergeSort(a, left, right) {
  if (left >= right) return;

  const mid = Math.floor((left + right) / 2);
  await mergeSort(a, left, mid);
  await mergeSort(a, mid + 1, right);
  await merge(a, left, mid, right);
}

async function merge(a, left, mid, right) {
  const L = a.slice(left, mid + 1);
  const R = a.slice(mid + 1, right + 1);

  let i = 0,
    j = 0,
    k = left;

  while (i < L.length && j < R.length) {
    beep(L[i]);
    if (L[i] <= R[j]) a[k++] = L[i++];
    else a[k++] = R[j++];

    drawBars(a, barsBox);
    await sleep(28);
  }

  while (i < L.length) {
    a[k++] = L[i++];
    drawBars(a, barsBox);
    await sleep(20);
  }

  while (j < R.length) {
    a[k++] = R[j++];
    drawBars(a, barsBox);
    await sleep(20);
  }
}

async function quickSortDriver(a) {
  await quickSort(a, 0, a.length - 1);
}

async function quickSort(a, low, high) {
  if (low < high) {
    const p = await partition(a, low, high);
    await quickSort(a, low, p - 1);
    await quickSort(a, p + 1, high);
  }
}

async function partition(a, low, high) {
  const pivot = a[high];
  let i = low - 1;

  for (let j = low; j < high; j++) {
    beep(a[j]);
    if (a[j] < pivot) {
      i++;
      [a[i], a[j]] = [a[j], a[i]];
    }
    drawBars(a, barsBox);
    await sleep(35);
  }

  [a[i + 1], a[high]] = [a[high], a[i + 1]];
  drawBars(a, barsBox);
  await sleep(35);

  return i + 1;
}

async function heapSort(a) {
  const n = a.length;

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    await heapify(a, n, i);
  }

  for (let i = n - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]];
    drawBars(a, barsBox);
    await sleep(35);
    await heapify(a, i, 0);
  }
}

async function heapify(a, n, i) {
  let largest = i;
  const l = 2 * i + 1;
  const r = 2 * i + 2;

  if (l < n && a[l] > a[largest]) largest = l;
  if (r < n && a[r] > a[largest]) largest = r;

  if (largest !== i) {
    beep(a[largest]);
    [a[i], a[largest]] = [a[largest], a[i]];
    drawBars(a, barsBox);
    await sleep(28);
    await heapify(a, n, largest);
  }
}

/* Run Sorting */
async function runSort() {
  if (sorting) return;
  sorting = true;

  const algorithm = sortSelect.value;
  const arr = sortArray.slice();

  if (algorithm === 'bubble') await bubbleSort(arr);
  else if (algorithm === 'selection') await selectionSort(arr);
  else if (algorithm === 'insertion') await insertionSort(arr);
  else if (algorithm === 'merge') await mergeSortDriver(arr);
  else if (algorithm === 'quick') await quickSortDriver(arr);
  else if (algorithm === 'heap') await heapSort(arr);

  drawBars(arr, barsBox);
  sorting = false;
  sortArray = arr;
}

sortRun.onclick = runSort;
sortReset.onclick = () => {
  sorting = false;
  sortArray = generateSortArray();
  drawBars(sortArray, barsBox);
};

/* init sorting */
sortArray = generateSortArray();
drawBars(sortArray, barsBox);

/* ----------------------------------------------------------
   SORTING RACE
-----------------------------------------------------------*/
const raceA = $('raceA');
const raceB = $('raceB');
const raceBarsA = $('raceBarsA');
const raceBarsB = $('raceBarsB');
const raceRun = $('raceRun');
const raceReset = $('raceReset');
const raceWinner = $('raceWinner');

let raceRunning = false;

function generateRaceArrays() {
  const size = 36;
  const base = [];
  for (let i = 0; i < size; i++) {
    base.push(Math.floor(Math.random() * 90) + 10);
  }
  return [base.slice(), base.slice()];
}

function drawRaceBars(arr, box, h = 150) {
  box.innerHTML = '';
  const max = Math.max(...arr);

  arr.forEach((v) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = Math.max(6, (v / max) * (h - 6)) + 'px';
    box.appendChild(bar);
  });
}

async function raceSort(algo, arr, box) {
  const render = () => drawRaceBars(arr, box);

  if (algo === 'bubble') {
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - 1 - i; j++) {
        beep(arr[j]);
        if (arr[j] > arr[j + 1]) [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        render();
        await sleep(20);
        if (!raceRunning) return;
      }
    }
  }

  if (algo === 'selection') {
    for (let i = 0; i < arr.length; i++) {
      let min = i;
      for (let j = i + 1; j < arr.length; j++) {
        beep(arr[j]);
        if (arr[j] < arr[min]) min = j;
        render();
        await sleep(18);
        if (!raceRunning) return;
      }
      [arr[i], arr[min]] = [arr[min], arr[i]];
      render();
    }
  }

  if (algo === 'insertion') {
    for (let i = 1; i < arr.length; i++) {
      let key = arr[i];
      let j = i - 1;
      while (j >= 0 && arr[j] > key) {
        beep(arr[j]);
        arr[j + 1] = arr[j];
        j--;
        render();
        await sleep(18);
        if (!raceRunning) return;
      }
      arr[j + 1] = key;
      render();
    }
  }

  if (algo === 'merge') {
    async function mSort(a, l, r) {
      if (l >= r) return;
      const m = Math.floor((l + r) / 2);
      await mSort(a, l, m);
      await mSort(a, m + 1, r);
      await mMerge(a, l, m, r);
    }

    async function mMerge(a, l, m, r) {
      const L = a.slice(l, m + 1);
      const R = a.slice(m + 1, r + 1);
      let i = 0;
      let j = 0;
      let k = l;

      while (i < L.length && j < R.length) {
        beep(L[i]);
        a[k++] = L[i] <= R[j] ? L[i++] : R[j++];
        render();
        await sleep(16);
        if (!raceRunning) return;
      }
      while (i < L.length) {
        a[k++] = L[i++];
        render();
        await sleep(12);
      }
      while (j < R.length) {
        a[k++] = R[j++];
        render();
        await sleep(12);
      }
    }

    await mSort(arr, 0, arr.length - 1);
  }

  if (algo === 'quick') {
    async function qSort(a, l, r) {
      if (l >= r) return;
      const p = await qPartition(a, l, r);
      await qSort(a, l, p - 1);
      await qSort(a, p + 1, r);
    }

    async function qPartition(a, l, r) {
      const pivot = a[r];
      let i = l - 1;

      for (let j = l; j < r; j++) {
        beep(a[j]);
        if (a[j] < pivot) {
          i++;
          [a[i], a[j]] = [a[j], a[i]];
        }
        render();
        await sleep(14);
        if (!raceRunning) return l;
      }

      [a[i + 1], a[r]] = [a[r], a[i + 1]];
      render();
      await sleep(14);

      return i + 1;
    }

    await qSort(arr, 0, arr.length - 1);
  }

  if (algo === 'heap') {
    async function heapify(a, size, i) {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;

      if (l < size && a[l] > a[largest]) largest = l;
      if (r < size && a[r] > a[largest]) largest = r;

      if (largest !== i) {
        beep(a[largest]);
        [a[i], a[largest]] = [a[largest], a[i]];
        render();
        await sleep(16);
        await heapify(a, size, largest);
      }
    }

    for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
      await heapify(arr, arr.length, i);
    }

    for (let i = arr.length - 1; i > 0; i--) {
      [arr[0], arr[i]] = [arr[i], arr[0]];
      render();
      await sleep(16);
      await heapify(arr, i, 0);
      if (!raceRunning) return;
    }
  }
}

raceRun.onclick = async () => {
  if (raceRunning) return;
  raceRunning = true;
  raceWinner.textContent = '';

  const [a1, a2] = generateRaceArrays();
  drawRaceBars(a1, raceBarsA);
  drawRaceBars(a2, raceBarsB);

  const algoA = raceA.value;
  const algoB = raceB.value;

  let winnerDeclared = false;

  const p1 = (async () => {
    await raceSort(algoA, a1, raceBarsA);
    if (!winnerDeclared) {
      winnerDeclared = true;
      raceWinner.textContent = `Winner: Algorithm A (${algoA})`;
    }
  })();

  const p2 = (async () => {
    await raceSort(algoB, a2, raceBarsB);
    if (!winnerDeclared) {
      winnerDeclared = true;
      raceWinner.textContent = `Winner: Algorithm B (${algoB})`;
    }
  })();

  await Promise.all([p1, p2]);
  raceRunning = false;
};

raceReset.onclick = () => {
  raceRunning = false;
  raceWinner.textContent = '';
  const [a1, a2] = generateRaceArrays();
  drawRaceBars(a1, raceBarsA);
  drawRaceBars(a2, raceBarsB);
};

// Initialize race visualizers
(() => {
  const [a1, a2] = generateRaceArrays();
  drawRaceBars(a1, raceBarsA);
  drawRaceBars(a2, raceBarsB);
})();
