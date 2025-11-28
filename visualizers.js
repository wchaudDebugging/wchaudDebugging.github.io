
/* ----------------------------------------------------
   Helper utilities
   ---------------------------------------------------- */
function $(id) { return document.getElementById(id); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// animation / timing - speed multiplier
let sortSpeed = 1; // 1x default

function sleep(ms) {
  // ms divided by sortSpeed (bigger sortSpeed => faster animations)
  return new Promise(resolve => setTimeout(resolve, ms / Math.max(0.25, sortSpeed)));
}

/* ----------------------------------------------------
   AUDIO (beeps)
   ---------------------------------------------------- */
const audioEnabledCheckbox = $('soundToggle');
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

// lazy init audio to obey browser autoplay policies
function ensureAudio() {
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
}

function playBeep(freq = 440, durationMs = 30) {
  if (!audioEnabledCheckbox.checked) return;
  ensureAudio();
  if (!audioCtx) return;

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.value = 0.09;

  o.connect(g);
  g.connect(audioCtx.destination);

  o.start();
  o.stop(audioCtx.currentTime + durationMs / 1000);
}

/* Convert a value to a pleasant beep frequency */
function beepForValue(val) {
  // val roughly in [10, 100] -> map to 220..1500 Hz
  const f = 200 + (val * 12);
  playBeep(f, 20);
}

/* ----------------------------------------------------
   MAZE VISUALIZER
   ---------------------------------------------------- */
const mazeCanvas = $('mazeCanvas');
const mctx = mazeCanvas.getContext('2d');

// Maze size/config - 15x15 grid, cell size derived from canvas
const MAZE_N = 15;
const MAZE_PIX = Math.floor(mazeCanvas.width / MAZE_N); // ~30
const START = { r: 0, c: 0 };
const GOAL = { r: MAZE_N - 1, c: MAZE_N - 1 };

let mazeGrid = []; // grid of cells
let mazeRunning = false; // ensures only 1 maze algorithm at a time

// initialize grid cells
function initMazeGrid() {
  mazeGrid = [];
  for (let r = 0; r < MAZE_N; r++) {
    const row = [];
    for (let c = 0; c < MAZE_N; c++) {
      row.push({
        r, c, wall: false, visited: false, parent: null, dist: Infinity, visitColor: null
      });
    }
    mazeGrid.push(row);
  }
}

// draw maze to canvas
function drawMaze() {
  mctx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);
  for (let r = 0; r < MAZE_N; r++) {
    for (let c = 0; c < MAZE_N; c++) {
      const cell = mazeGrid[r][c];
      const x = c * MAZE_PIX;
      const y = r * MAZE_PIX;

      // background for wall vs free
      if (cell.wall) mctx.fillStyle = '#111';
      else mctx.fillStyle = '#0b2b3b';
      mctx.fillRect(x, y, MAZE_PIX, MAZE_PIX);

      // visited overlay (algorithm color)
      if (cell.visited) {
        mctx.fillStyle = cell.visitColor || 'rgba(77,163,255,0.4)';
        mctx.fillRect(x + 2, y + 2, MAZE_PIX - 4, MAZE_PIX - 4);
      }

      // start/end markers
      if (r === START.r && c === START.c) {
        mctx.fillStyle = '#6bff8a';
        mctx.fillRect(x + 4, y + 4, MAZE_PIX - 8, MAZE_PIX - 8);
      }
      if (r === GOAL.r && c === GOAL.c) {
        mctx.fillStyle = '#ff8c6a';
        mctx.fillRect(x + 4, y + 4, MAZE_PIX - 8, MAZE_PIX - 8);
      }

      // subtle grid stroke
      mctx.strokeStyle = 'rgba(255,255,255,0.03)';
      mctx.strokeRect(x, y, MAZE_PIX, MAZE_PIX);
    }
  }
}

// helper: neighbor cells (4-way)
function mazeNeighbors(r, c) {
  const out = [];
  const deltas = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dr,dc] of deltas) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < MAZE_N && nc >= 0 && nc < MAZE_N) {
      if (!mazeGrid[nr][nc].wall) out.push(mazeGrid[nr][nc]);
    }
  }
  return out;
}

// reset visited / parents
function mazeResetVisited() {
  for (let r = 0; r < MAZE_N; r++) for (let c = 0; c < MAZE_N; c++) {
    mazeGrid[r][c].visited = false;
    mazeGrid[r][c].parent = null;
    mazeGrid[r][c].dist = Infinity;
    mazeGrid[r][c].visitColor = null;
  }
}

// generate a simple random maze (not perfect maze algorithm, but fine for demo)
function mazeGenerate(density = 0.28) {
  initMazeGrid();
  for (let r = 0; r < MAZE_N; r++) {
    for (let c = 0; c < MAZE_N; c++) {
      if ((r === START.r && c === START.c) || (r === GOAL.r && c === GOAL.c)) continue;
      mazeGrid[r][c].wall = Math.random() < density;
    }
  }
  drawMaze();
}

// draw final path from goal to start (follows parent pointers)
async function mazeDrawPath() {
  let cur = mazeGrid[GOAL.r][GOAL.c];
  const path = [];
  while (cur) {
    path.push(cur);
    cur = cur.parent;
  }
  // animate path (from start to goal)
  for (let i = path.length - 1; i >= 0; i--) {
    const cell = path[i];
    const x = cell.c * MAZE_PIX, y = cell.r * MAZE_PIX;
    mctx.fillStyle = '#ff8c6a';
    mctx.fillRect(x + 4, y + 4, MAZE_PIX - 8, MAZE_PIX - 8);
    await sleep(35);
  }
}

// BFS animation
async function mazeRunBFS() {
  if (mazeRunning) return;
  mazeRunning = true;
  mazeResetVisited();

  const startCell = mazeGrid[START.r][START.c];
  const queue = [startCell];
  startCell.visited = true;

  while (queue.length) {
    const cur = queue.shift();
    cur.visitColor = 'rgba(77,163,255,0.5)'; // blue
    if (cur.r === GOAL.r && cur.c === GOAL.c) break;
    const neigh = mazeNeighbors(cur.r, cur.c);
    for (const n of neigh) {
      if (!n.visited) {
        n.visited = true;
        n.parent = cur;
        queue.push(n);
      }
    }
    drawMaze();
    await sleep(28);
  }

  await mazeDrawPath();
  mazeRunning = false;
}

// DFS animation
async function mazeRunDFS() {
  if (mazeRunning) return;
  mazeRunning = true;
  mazeResetVisited();

  const startCell = mazeGrid[START.r][START.c];
  const stack = [startCell];
  startCell.visited = true;

  while (stack.length) {
    const cur = stack.pop();
    cur.visitColor = 'rgba(107,245,138,0.45)'; // green
    if (cur.r === GOAL.r && cur.c === GOAL.c) break;
    const neigh = mazeNeighbors(cur.r, cur.c);
    for (const n of neigh) {
      if (!n.visited) {
        n.visited = true;
        n.parent = cur;
        stack.push(n);
      }
    }
    drawMaze();
    await sleep(28);
  }

  await mazeDrawPath();
  mazeRunning = false;
}

// Dijkstra animation (uniform weights here)
async function mazeRunDijkstra() {
  if (mazeRunning) return;
  mazeRunning = true;
  mazeResetVisited();

  const startCell = mazeGrid[START.r][START.c];
  startCell.dist = 0;
  const pq = [startCell]; // simple array-as-pq (sort each loop)

  while (pq.length) {
    pq.sort((a,b) => a.dist - b.dist);
    const cur = pq.shift();
    if (cur.visited) continue;
    cur.visited = true;
    cur.visitColor = 'rgba(255,233,122,0.45)'; // yellow
    if (cur.r === GOAL.r && cur.c === GOAL.c) break;

    const neigh = mazeNeighbors(cur.r, cur.c);
    for (const n of neigh) {
      const alt = cur.dist + 1;
      if (alt < n.dist) {
        n.dist = alt;
        n.parent = cur;
        pq.push(n);
      }
    }
    drawMaze();
    await sleep(24);
  }

  await mazeDrawPath();
  mazeRunning = false;
}

/* Maze canvas click to toggle walls (but not start/goal) */
mazeCanvas.addEventListener('click', (ev) => {
  if (mazeRunning) return; // don't allow edits while algorithm runs
  const rect = mazeCanvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  const c = Math.floor(x / MAZE_PIX);
  const r = Math.floor(y / MAZE_PIX);
  if (r < 0 || r >= MAZE_N || c < 0 || c >= MAZE_N) return;
  if ((r === START.r && c === START.c) || (r === GOAL.r && c === GOAL.c)) return;
  mazeGrid[r][c].wall = !mazeGrid[r][c].wall;
  drawMaze();
});

/* Maze buttons */
$('bfsBtn').addEventListener('click', () => { if (!mazeRunning) mazeRunBFS(); });
$('dfsBtn').addEventListener('click', () => { if (!mazeRunning) mazeRunDFS(); });
$('dijkstraBtn').addEventListener('click', () => { if (!mazeRunning) mazeRunDijkstra(); });
$('mazeGenBtn').addEventListener('click', () => { if (!mazeRunning) mazeGenerate(); });
$('mazeResetBtn').addEventListener('click', () => { if (!mazeRunning) { initMazeGrid(); drawMaze(); } });

/* init maze on load */
function initMazeGrid() { initMazeGridInner(); }
function initMazeGridInner() {
  // purposefully separate to avoid hoisting mess
  mazeGrid = [];
  for (let r = 0; r < MAZE_N; r++) {
    const row = [];
    for (let c = 0; c < MAZE_N; c++) {
      row.push({ r, c, wall: false, visited: false, parent: null, dist: Infinity, visitColor: null });
    }
    mazeGrid.push(row);
  }
}
initMazeGridInner();
mazeGenerate(); // start with a random maze

/* ----------------------------------------------------
   SORTING VISUALIZER
   ---------------------------------------------------- */
const barsContainer = $('bars');
const sortSelect = $('sortSelect');
const sizeRange = $('sizeRange');
const sortReset = $('sortReset');
const sortRun = $('sortRun');
const sortStepBtn = $('sortStepMode');
const sortNextStepBtn = $('sortNextStep');
const slowDownBtn = $('slowDownBtn');
const speedUpBtn = $('speedUpBtn');
const speedDisplay = $('speedDisplay');

let sortArray = [];
let sortingActive = false;
let stepMode = false;
let stepResolve = null;

// generate array of N random values (10..99)
function genSortArray(n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(Math.floor(Math.random() * 90) + 10);
  return a;
}

// render bars into container
function renderBars(arr, container, heightPx = 200) {
  container.innerHTML = '';
  const max = Math.max(...arr);
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    const div = document.createElement('div');
    div.className = 'bar';
    const h = Math.max(6, Math.round((v / max) * (heightPx - 8)));
    div.style.height = h + 'px';
    div.textContent = v;
    container.appendChild(div);
  }
}

// step-mode helper
function waitForStepIfEnabled() {
  if (!stepMode) return Promise.resolve();
  return new Promise(resolve => stepResolve = resolve);
}
function nextStep() { if (stepResolve) { stepResolve(); stepResolve = null; } }

// speed controls
slowDownBtn.addEventListener('click', () => {
  sortSpeed = clamp(sortSpeed / 2, 0.25, 8);
  speedDisplay.textContent = sortSpeed + '×';
});
speedUpBtn.addEventListener('click', () => {
  sortSpeed = clamp(sortSpeed * 2, 0.25, 8);
  speedDisplay.textContent = sortSpeed + '×';
});

// on first user gesture, resume audio context (some browsers require this)
document.addEventListener('click', () => {
  ensureAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}, { once: true });

// initialize sort array & render
function resetSorter() {
  sortArray = genSortArray(Number(sizeRange.value || 20));
  renderBars(sortArray, barsContainer, 200);
  sortingActive = false;
  stepMode = false;
  speedDisplay.textContent = sortSpeed + '×';
}
resetSorter();

// size slider updates
sizeRange.addEventListener('input', () => {
  resetSorter();
});

// Reset button
sortReset.addEventListener('click', () => { resetSorter(); });

// Step mode controls
sortStepBtn.addEventListener('click', () => {
  // toggle step mode
  stepMode = !stepMode;
  sortingActive = stepMode; // if enabling step mode, treat as active
  sortStepBtn.textContent = stepMode ? 'Step Mode ✓' : 'Step Mode';
});
sortNextStepBtn.addEventListener('click', () => nextStep());

// Sound toggle: handled by checkbox already

/* ---------- Sorting algorithm implementations ----------
   Each algorithm intermittently calls:
     - beepForValue(value) on comparisons (optional)
     - renderBars(...) to update UI
     - await sleep(...) respecting sortSpeed
     - await waitForStepIfEnabled() to implement step-by-step
-------------------------------------------------------- */

// wrapper so algorithms work on a copy and update the main array
async function runSelectedSort() {
  if (sortingActive) return;
  sortingActive = true;
  stepMode = false; // disable step mode when running full autoplay

  const algo = sortSelect.value;
  let arr = sortArray.slice();

  switch (algo) {
    case 'bubble':
      await bubbleSort(arr);
      break;
    case 'selection':
      await selectionSort(arr);
      break;
    case 'insertion':
      await insertionSort(arr);
      break;
    case 'merge':
      await mergeSortDriver(arr);
      break;
    case 'quick':
      await quickSortDriver(arr);
      break;
    case 'heap':
      await heapSort(arr);
      break;
    default:
      await bubbleSort(arr);
  }

  sortingActive = false;
  // ensure final render
  sortArray = arr;
  renderBars(sortArray, barsContainer, 200);
}

/* Bubble */
async function bubbleSort(a) {
  const n = a.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      await waitForStepIfEnabled();
      beepForValue(a[j]);
      if (a[j] > a[j+1]) {
        [a[j], a[j+1]] = [a[j+1], a[j]];
      }
      renderBars(a, barsContainer, 200);
      await sleep(60);
      if (!sortingActive && !stepMode) return;
    }
  }
}

/* Selection */
async function selectionSort(a) {
  const n = a.length;
  for (let i = 0; i < n; i++) {
    let min = i;
    for (let j = i+1; j < n; j++) {
      await waitForStepIfEnabled();
      beepForValue(a[j]);
      if (a[j] < a[min]) min = j;
      renderBars(a, barsContainer, 200);
      await sleep(45);
      if (!sortingActive && !stepMode) return;
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      renderBars(a, barsContainer, 200);
      await sleep(45);
    }
  }
}

/* Insertion */
async function insertionSort(a) {
  for (let i = 1; i < a.length; i++) {
    let key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      await waitForStepIfEnabled();
      beepForValue(a[j]);
      a[j+1] = a[j];
      j--;
      renderBars(a, barsContainer, 200);
      await sleep(40);
      if (!sortingActive && !stepMode) return;
    }
    a[j+1] = key;
    renderBars(a, barsContainer, 200);
    await sleep(35);
  }
}

/* Merge (driver calls recursive) */
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
  const leftArr = a.slice(left, mid+1);
  const rightArr = a.slice(mid+1, right+1);
  let i = 0, j = 0, k = left;
  while (i < leftArr.length && j < rightArr.length) {
    await waitForStepIfEnabled();
    beepForValue(leftArr[i]);
    if (leftArr[i] <= rightArr[j]) a[k++] = leftArr[i++];
    else a[k++] = rightArr[j++];
    renderBars(a, barsContainer, 200);
    await sleep(30);
    if (!sortingActive && !stepMode) return;
  }
  while (i < leftArr.length) {
    a[k++] = leftArr[i++];
    renderBars(a, barsContainer, 200);
    await sleep(25);
  }
  while (j < rightArr.length) {
    a[k++] = rightArr[j++];
    renderBars(a, barsContainer, 200);
    await sleep(25);
  }
}

/* Quick (driver) */
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
    await waitForStepIfEnabled();
    beepForValue(a[j]);
    if (a[j] < pivot) {
      i++;
      [a[i], a[j]] = [a[j], a[i]];
    }
    renderBars(a, barsContainer, 200);
    await sleep(40);
  }
  [a[i+1], a[high]] = [a[high], a[i+1]];
  renderBars(a, barsContainer, 200);
  await sleep(40);
  return i + 1;
}

/* Heap sort */
async function heapSort(a) {
  const n = a.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    await heapify(a, n, i);
  }
  for (let i = n - 1; i > 0; i--) {
    await waitForStepIfEnabled();
    [a[0], a[i]] = [a[i], a[0]];
    renderBars(a, barsContainer, 200);
    await sleep(40);
    await heapify(a, i, 0);
  }
}
async function heapify(a, size, i) {
  let largest = i;
  const l = 2*i + 1, r = 2*i + 2;
  if (l < size && a[l] > a[largest]) largest = l;
  if (r < size && a[r] > a[largest]) largest = r;
  if (largest !== i) {
    [a[i], a[largest]] = [a[largest], a[i]];
    renderBars(a, barsContainer, 200);
    await sleep(35);
    await heapify(a, size, largest);
  }
}

/* Sort Run button handler */
sortRun.addEventListener('click', async () => {
  if (sortingActive && !stepMode) return;
  // ensure audio unlocked
  ensureAudio();
  sortingActive = true;
  // if stepMode was enabled manually, don't toggle it here
  if (!stepMode) {
    await runSelectedSort();
  } else {
    // Step mode implies waiting for user clicks; run a single step via nextStep
    // we keep sortingActive true so algorithms will progress only when nextStep called
  }
});

/* sizeRange controls array size change */
sizeRange.addEventListener('input', () => {
  sortArray = genSortArray(Number(sizeRange.value));
  renderBars(sortArray, barsContainer, 200);
});

/* initialize default array */
sortArray = genSortArray(Number(sizeRange.value || 20));
renderBars(sortArray, barsContainer, 200);

/* ----------------------------------------------------
   SORTING STEP / NEXT interactions
   ---------------------------------------------------- */
// if user toggles Step Mode button, we will set stepMode true and let algorithms
// call waitForStepIfEnabled() to pause until Next Step is pressed.
$('sortStepMode').addEventListener('click', () => {
  stepMode = !stepMode;
  if (stepMode) {
    sortingActive = true; // in step mode, algorithms are considered 'active' (paused until next)
    $('sortStepMode').textContent = 'Step Mode ✓';
  } else {
    $('sortStepMode').textContent = 'Step Mode';
    // if turning step mode off, clear pending resolver and stop
    if (stepResolve) { stepResolve(); stepResolve = null; }
    sortingActive = false;
  }
});

$('sortNextStep').addEventListener('click', () => nextStep());

/* ----------------------------------------------------
   RACE: Two side-by-side visualizers
   ---------------------------------------------------- */
const raceBarsA = $('raceBarsA');
const raceBarsB = $('raceBarsB');
const raceASelect = $('raceA');
const raceBSelect = $('raceB');
const raceRunBtn = $('raceRun');
const raceResetBtn = $('raceReset');
const raceSizeInput = $('raceSize');
const raceWinnerNode = $('raceWinner');

let raceRunning = false;

// create two identical arrays for fair race
function genRaceArrays(n) {
  const base = [];
  for (let i = 0; i < n; i++) base.push(Math.floor(Math.random() * 90) + 10);
  return [base.slice(), base.slice()];
}

async function runRaceOne(alg, arr, container) {
  // simple runner using earlier algorithm implementations but adapted to local container + sleep calls
  const localRender = (a) => renderBars(a, container, parseInt(getComputedStyle(container).height) || 150);
  // We implement a lightweight subset to avoid duplicating heavy logic
  switch (alg) {
    case 'bubble':
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length - 1 - i; j++) {
          if (!raceRunning) return;
          if (arr[j] > arr[j+1]) [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
          localRender(arr); await sleep(30);
        }
      }
      break;
    case 'selection':
      for (let i = 0; i < arr.length; i++) {
        let min = i;
        for (let j = i+1; j < arr.length; j++) {
          if (!raceRunning) return;
          if (arr[j] < arr[min]) min = j;
          localRender(arr); await sleep(20);
        }
        [arr[i], arr[min]] = [arr[min], arr[i]];
        localRender(arr); await sleep(30);
      }
      break;
    case 'insertion':
      for (let i = 1; i < arr.length; i++) {
        let key = arr[i];
        let j = i - 1;
        while (j >= 0 && arr[j] > key) {
          if (!raceRunning) return;
          arr[j+1] = arr[j]; j--;
          localRender(arr); await sleep(20);
        }
        arr[j+1] = key; localRender(arr); await sleep(20);
      }
      break;
    case 'merge':
      await (async function mergeRace(a, l, r) {
        if (l >= r || !raceRunning) return;
        const m = Math.floor((l + r) / 2);
        await mergeRace(a, l, m); await mergeRace(a, m+1, r);
        const left = a.slice(l, m+1), right = a.slice(m+1, r+1);
        let i = 0, j = 0, k = l;
        while (i < left.length && j < right.length && raceRunning) {
          a[k++] = (left[i] <= right[j]) ? left[i++] : right[j++];
          localRender(a); await sleep(18);
        }
        while (i < left.length && raceRunning) { a[k++] = left[i++]; localRender(a); await sleep(12); }
        while (j < right.length && raceRunning) { a[k++] = right[j++]; localRender(a); await sleep(12); }
      })(arr, 0, arr.length - 1);
      break;
    case 'quick':
      await (async function quickRace(a, l, r) {
        if (l >= r || !raceRunning) return;
        const p = await (async function partitionRace(a, low, high) {
          const pivot = a[high]; let i = low - 1;
          for (let j = low; j < high; j++) {
            if (!raceRunning) return low;
            if (a[j] < pivot) { i++; [a[i], a[j]] = [a[j], a[i]]; }
            localRender(a); await sleep(22);
          }
          [a[i+1], a[high]] = [a[high], a[i+1]];
          localRender(a); await sleep(22);
          return i+1;
        })(a, l, r);
        await quickRace(a, l, p - 1); await quickRace(a, p + 1, r);
      })(arr, 0, arr.length - 1);
      break;
    case 'heap':
      await (async function heapRace(a) {
        const n = a.length;
        const heapify = async (arr, size, i) => {
          let largest = i, left = 2*i + 1, right = 2*i + 2;
          if (left < size && arr[left] > arr[largest]) largest = left;
          if (right < size && arr[right] > arr[largest]) largest = right;
          if (largest !== i) {
            [arr[i], arr[largest]] = [arr[largest], arr[i]];
            localRender(arr); await sleep(20);
            await heapify(arr, size, largest);
          }
        };
        for (let i = Math.floor(n/2)-1; i >= 0; i--) { await heapify(a, n, i); }
        for (let i = n-1; i > 0; i--) {
          if (!raceRunning) return;
          [a[0], a[i]] = [a[i], a[0]]; localRender(a); await sleep(24);
          await heapify(a, i, 0);
        }
      })(arr);
      break;
  }
}

// race controls
raceRunBtn.addEventListener('click', async () => {
  if (raceRunning) return;
  raceRunning = true;
  raceWinnerNode.textContent = '';

  const size = Number(raceSizeInput.value);
  const [arrA, arrB] = genRaceArrays(size);
  renderBars(arrA, raceBarsA, 150);
  renderBars(arrB, raceBarsB, 150);

  const algorithmA = raceASelect.value;
  const algorithmB = raceBSelect.value;

  // run both in parallel and detect the first to finish
  let won = false;
  const pA = (async () => { await runRaceOne(algorithmA, arrA, raceBarsA); if (!won) { won = true; raceWinnerNode.textContent = `Winner: Left (${algorithmA})`; } })();
  const pB = (async () => { await runRaceOne(algorithmB, arrB, raceBarsB); if (!won) { won = true; raceWinnerNode.textContent = `Winner: Right (${algorithmB})`; } })();

  await Promise.all([pA, pB]);
  raceRunning = false;
});

raceResetBtn.addEventListener('click', () => {
  raceRunning = false;
  raceWinnerNode.textContent = '';
  const n = Number(raceSizeInput.value);
  const [a,b] = genRaceArrays(n);
  renderBars(a, raceBarsA, 150);
  renderBars(b, raceBarsB, 150);
});

// init race with default arrays
const [initA, initB] = genRaceArrays(Number(raceSizeInput.value));
renderBars(initA, raceBarsA, 150);
renderBars(initB, raceBarsB, 150);

/* ----------------------------------------------------
   Initial UI wiring & event handlers
   ---------------------------------------------------- */

// Maze initial draw is done during script load (mazeGenerate called earlier)
drawMaze();

// Sort run wiring
$('sortRun').addEventListener('click', async () => {
  // if stepMode is enabled we want algorithms to run but pause at comparisons
  if (stepMode) {
    // If stepMode is enabled but sortingActive is false, start a background run (it will pause on waitForStepIfEnabled)
    if (!sortingActive) {
      sortingActive = true;
      await runSelectedSort();
      sortingActive = false;
    }
  } else {
    if (!sortingActive) {
      sortingActive = true;
      await runSelectedSort();
      sortingActive = false;
    }
  }
});

// Reset sorting array (manual)
$('sortReset').addEventListener('click', () => {
  sortingActive = false;
  stepMode = false;
  sortArray = genSortArray(Number(sizeRange.value));
  renderBars(sortArray, barsContainer, 200);
  $('sortStepMode').textContent = 'Step Mode';
});

// Wire speed up/down already (slowDownBtn, speedUpBtn added earlier)
// sound checkbox initial state handled by HTML default

// Good to go. The code favors readability and modular functions, and should be easy to extend.
