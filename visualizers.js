
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
const ctx = mazeCanvas.getContext("2d");

const GRID = 15; // 15x15
const CELL = Math.floor(mazeCanvas.width / GRID);

// Start and end positions
const START = { r: 0, c: 0 };
const GOAL = { r: GRID - 1, c: GRID - 1 };

let maze = [];
let mazeRunning = false;

/** Create empty maze grid */
function createMaze() {
  maze = [];
  for (let r = 0; r < GRID; r++) {
    const row = [];
    for (let c = 0; c < GRID; c++) {
      row.push({
        r,
        c,
        wall: false,
        visited: false,
        parent: null,
        dist: Infinity,
        color: null,
      });
    }
    maze.push(row);
  }
}

/** Fully clear ALL wall + visited + path state */
function resetMazeGridFully() {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      maze[r][c].wall = false;
      maze[r][c].visited = false;
      maze[r][c].parent = null;
      maze[r][c].dist = Infinity;
      maze[r][c].color = null;
    }
  }
}

/** Draw maze */
function drawMaze() {
  ctx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = maze[r][c];
      const x = c * CELL;
      const y = r * CELL;

      ctx.fillStyle = cell.wall ? "#121212" : "#173243";
      ctx.fillRect(x, y, CELL, CELL);

      if (cell.visited) {
        ctx.fillStyle = cell.color || "rgba(77,163,255,0.45)";
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
      }

      if (r === START.r && c === START.c) {
        ctx.fillStyle = "#64ff9c";
        ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
      }

      if (r === GOAL.r && c === GOAL.r) {
        ctx.fillStyle = "#ff8c6a";
        ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
      }

      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.strokeRect(x, y, CELL, CELL);
    }
  }
}

/** Get non-wall neighbors */
function neighbors(r, c) {
  const out = [];
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (const [dr, dc] of deltas) {
    const nr = r + dr,
      nc = c + dc;
    if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !maze[nr][nc].wall) {
      out.push(maze[nr][nc]);
    }
  }
  return out;
}

/** Reset visited & path info */
function resetMazeState() {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      maze[r][c].visited = false;
      maze[r][c].parent = null;
      maze[r][c].dist = Infinity;
      maze[r][c].color = null;
    }
  }
}

/** 🔥 ALWAYS GENERATE MAZE FROM A CLEAN GRID */
function generateMaze() {
  createMaze();
  resetMazeGridFully();  // <--- forces clean starting grid

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if ((r === START.r && c === START.c) || (r === GOAL.r && c === GOAL.c)) continue;
      maze[r][c].wall = Math.random() < 0.27;
    }
  }

  drawMaze();
}

/** Trace final path */
async function tracePath() {
  let cur = maze[GOAL.r][GOAL.c];
  while (cur) {
    const x = cur.c * CELL;
    const y = cur.r * CELL;
    ctx.fillStyle = "#ff8c6a";
    ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
    await sleep(40);
    cur = cur.parent;
  }
}

/** BFS */
async function runBFS() {
  if (mazeRunning) return;
  mazeRunning = true;

  resetMazeState();

  const startCell = maze[START.r][START.c];
  startCell.visited = true;

  const queue = [startCell];

  while (queue.length) {
    const cur = queue.shift();
    cur.color = "rgba(77,163,255,0.45)";

    if (cur === maze[GOAL.r][GOAL.c]) break;

    for (const n of neighbors(cur.r, cur.c)) {
      if (!n.visited) {
        n.visited = true;
        n.parent = cur;
        queue.push(n);
      }
    }

    drawMaze();
    await sleep(26);
  }

  await tracePath();
  mazeRunning = false;
}

/** DFS */
async function runDFS() {
  if (mazeRunning) return;
  mazeRunning = true;

  resetMazeState();

  const startCell = maze[START.r][START.c];
  startCell.visited = true;

  const stack = [startCell];

  while (stack.length) {
    const cur = stack.pop();
    cur.color = "rgba(100,255,156,0.45)";

    if (cur === maze[GOAL.r][GOAL.c]) break;

    for (const n of neighbors(cur.r, cur.c)) {
      if (!n.visited) {
        n.visited = true;
        n.parent = cur;
        stack.push(n);
      }
    }

    drawMaze();
    await sleep(26);
  }

  await tracePath();
  mazeRunning = false;
}

/** Dijkstra */
async function runDijkstra() {
  if (mazeRunning) return;
  mazeRunning = true;

  resetMazeState();

  const startCell = maze[START.r][START.c];
  startCell.dist = 0;

  const pq = [startCell];

  while (pq.length) {
    pq.sort((a, b) => a.dist - b.dist);
    const cur = pq.shift();

    if (cur.visited) continue;
    cur.visited = true;
    cur.color = "rgba(255,233,122,0.45)";

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
    await sleep(20);
  }

  await tracePath();
  mazeRunning = false;
}

/** Maze click toggles walls */
mazeCanvas.addEventListener("click", (e) => {
  if (mazeRunning) return;

  const rect = mazeCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);

  if ((r === START.r && c === START.c) || (r === GOAL.r && c === GOAL.c)) return;

  maze[r][c].wall = !maze[r][c].wall;
  drawMaze();
});

/** Maze buttons */
$("bfsBtn").onclick = runBFS;
$("dfsBtn").onclick = runDFS;
$("dijkstraBtn").onclick = runDijkstra;
$("mazeGenBtn").onclick = generateMaze;
$("mazeResetBtn").onclick = () => {
  if (!mazeRunning) {
    createMaze();
    drawMaze();
  }
};

// Initialize
createMaze();
generateMaze();

/* ======================================================
   SORTING VISUALIZER
====================================================== */
const barsBox = $("bars");
const sortSelect = $("sortSelect");
const sortRun = $("sortRun");
const sortReset = $("sortReset");

let sortArray = [];
let sorting = false;

/** Speed controls */
$("slowDownBtn")?.addEventListener("click", () => {
  sortSpeed = clamp(sortSpeed / 2, 0.25, 8);
  $("speedDisplay").textContent = sortSpeed + "×";
});

$("speedUpBtn")?.addEventListener("click", () => {
  sortSpeed = clamp(sortSpeed * 2, 0.25, 8);
  $("speedDisplay").textContent = sortSpeed + "×";
});

/** Generate 32-element array */
function generateSortArray() {
  const size = 32;
  const arr = [];
  for (let i = 0; i < size; i++) {
    arr.push(Math.floor(Math.random() * 90) + 10);
  }
  return arr;
}

function drawBars(arr, container, height = 200) {
  container.innerHTML = "";
  const max = Math.max(...arr);

  arr.forEach((v) => {
    const div = document.createElement("div");
    div.className = "bar";
    div.style.height = Math.max(8, (v / max) * (height - 8)) + "px";
    div.textContent = v;
    container.appendChild(div);
  });
}

/* ---------------- Sorting Algorithms ------------------ */
async function bubbleSort(a) {
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - 1 - i; j++) {
      beep(a[j]);
      if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]];
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

async function mergeSort(a, l, r) {
  if (l >= r) return;
  const m = Math.floor((l + r) / 2);
  await mergeSort(a, l, m);
  await mergeSort(a, m + 1, r);
  await merge(a, l, m, r);
}

async function merge(a, l, m, r) {
  const L = a.slice(l, m + 1);
  const R = a.slice(m + 1, r + 1);

  let i = 0,
    j = 0,
    k = l;

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

async function quickSort(a, l, r) {
  if (l < r) {
    const p = await partition(a, l, r);
    await quickSort(a, l, p - 1);
    await quickSort(a, p + 1, r);
  }
}

async function partition(a, l, r) {
  const pivot = a[r];
  let i = l - 1;

  for (let j = l; j < r; j++) {
    beep(a[j]);
    if (a[j] < pivot) {
      i++;
      [a[i], a[j]] = [a[j], a[i]];
    }
    drawBars(a, barsBox);
    await sleep(35);
  }

  [a[i + 1], a[r]] = [a[r], a[i + 1]];
  drawBars(a, barsBox);
  await sleep(35);

  return i + 1;
}

async function heapSort(a) {
  const n = a.length;

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) await heapify(a, n, i);

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

/** Run sorter */
async function runSort() {
  if (sorting) return;
  sorting = true;

  const arr = sortArray.slice();
  const alg = sortSelect.value;

  if (alg === "bubble") await bubbleSort(arr);
  else if (alg === "selection") await selectionSort(arr);
  else if (alg === "insertion") await insertionSort(arr);
  else if (alg === "merge") await mergeSortDriver(arr);
  else if (alg === "quick") await quickSortDriver(arr);
  else if (alg === "heap") await heapSort(arr);

  drawBars(arr, barsBox);
  sortArray = arr;
  sorting = false;
}

sortRun.onclick = runSort;
sortReset.onclick = () => {
  sorting = false;
  sortArray = generateSortArray();
  drawBars(sortArray, barsBox);
};

// Initialize sorting array
sortArray = generateSortArray();
drawBars(sortArray, barsBox);

/* ======================================================
   SORTING RACE
====================================================== */
const raceA = $("raceA");
const raceB = $("raceB");
const raceBarsA = $("raceBarsA");
const raceBarsB = $("raceBarsB");
const raceWinner = $("raceWinner");

const raceRunBtn = $("raceRun");
const raceResetBtn = $("raceReset");

let raceRunning = false;

function generateRaceArrays() {
  const size = 36;
  const base = [];
  for (let i = 0; i < size; i++) {
    base.push(Math.floor(Math.random() * 90) + 10);
  }
  return [base.slice(), base.slice()];
}

/** Draw bars for race */
function drawRaceBars(arr, container) {
  container.innerHTML = "";
  const max = Math.max(...arr);

  arr.forEach((v) => {
    const div = document.createElement("div");
    div.className = "bar";
    div.style.height = Math.max(8, (v / max) * 150) + "px";
    container.appendChild(div);
  });
}

/** Run sorting inside race */
async function raceSort(alg, arr, container) {
  const render = () => drawRaceBars(arr, container);

  if (alg === "bubble") {
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

  if (alg === "selection") {
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

  if (alg === "insertion") {
    for (let i = 1; i < arr.length; i++) {
      let key = arr[i],
        j = i - 1;
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

  if (alg === "merge") {
    async function msort(a, l, r) {
      if (l >= r) return;
      const m = Math.floor((l + r) / 2);
      await msort(a, l, m);
      await msort(a, m + 1, r);
      await mmerge(a, l, m, r);
    }

    async function mmerge(a, l, m, r) {
      const L = a.slice(l, m + 1);
      const R = a.slice(m + 1, r + 1);
      let i = 0,
        j = 0,
        k = l;

      while (i < L.length && j < R.length) {
        beep(L[i]);
        a[k++] = L[i] <= R[j] ? L[i++] : R[j++];
        render();
        await sleep(18);
        if (!raceRunning) return;
      }

      while (i < L.length) {
        a[k++] = L[i++];
        render();
        await sleep(14);
      }

      while (j < R.length) {
        a[k++] = R[j++];
        render();
        await sleep(14);
      }
    }

    await msort(arr, 0, arr.length - 1);
  }

  if (alg === "quick") {
    async function qsort(a, l, r) {
      if (l >= r) return;
      const p = await qpart(a, l, r);
      await qsort(a, l, p - 1);
      await qsort(a, p + 1, r);
    }

    async function qpart(a, l, r) {
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
        if (!raceRunning) return;
      }
      [a[i + 1], a[r]] = [a[r], a[i + 1]];
      render();
      await sleep(14);
      return i + 1;
    }

    await qsort(arr, 0, arr.length - 1);
  }

  if (alg === "heap") {
    async function heapify(a, n, i) {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;

      if (l < n && a[l] > a[largest]) largest = l;
      if (r < n && a[r] > a[largest]) largest = r;

      if (largest !== i) {
        beep(a[largest]);
        [a[i], a[largest]] = [a[largest], a[i]];
        render();
        await sleep(16);
        await heapify(a, n, largest);
      }
    }

    const n = arr.length;

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) await heapify(arr, n, i);

    for (let i = n - 1; i > 0; i--) {
      [arr[0], arr[i]] = [arr[i], arr[0]];
      render();
      await sleep(16);
      await heapify(arr, i, 0);
      if (!raceRunning) return;
    }
  }
}

/* Run race */
raceRunBtn.onclick = async () => {
  if (raceRunning) return;

  raceRunning = true;
  raceWinner.textContent = "";

  const [arrA, arrB] = generateRaceArrays();

  drawRaceBars(arrA, raceBarsA);
  drawRaceBars(arrB, raceBarsB);

  const algA = raceA.value;
  const algB = raceB.value;

  let decided = false;

  const p1 = (async () => {
    await raceSort(algA, arrA, raceBarsA);
    if (!decided) {
      decided = true;
      raceWinner.textContent = `Winner: Algorithm A (${algA})`;
    }
  })();

  const p2 = (async () => {
    await raceSort(algB, arrB, raceBarsB);
    if (!decided) {
      decided = true;
      raceWinner.textContent = `Winner: Algorithm B (${algB})`;
    }
  })();

  await Promise.all([p1, p2]);
  raceRunning = false;
};

/* Reset race */
raceResetBtn.onclick = () => {
  raceRunning = false;
  raceWinner.textContent = "";

  const [arrA, arrB] = generateRaceArrays();
  drawRaceBars(arrA, raceBarsA);
  drawRaceBars(arrB, raceBarsB);
};

/* Initial race draw */
(function initRace() {
  const [arrA, arrB] = generateRaceArrays();
  drawRaceBars(arrA, raceBarsA);
  drawRaceBars(arrB, raceBarsB);
})();
