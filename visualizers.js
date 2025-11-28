/*************************************************
 * MAZE VISUALIZER — BFS / DFS / DIJKSTRA
 *************************************************/
const mazeCanvas = document.getElementById("mazeCanvas");
const mctx = mazeCanvas.getContext("2d");

const M_SIZE = 15;    // 15×15
const CELL = 30;      // fits inside 450px canvas
let maze = [];
let mazeRunning = false;

const start = { r: 0, c: 0 };
const goal = { r: M_SIZE - 1, c: M_SIZE - 1 };

function initMaze() {
  maze = [];
  for (let r = 0; r < M_SIZE; r++) {
    maze[r] = [];
    for (let c = 0; c < M_SIZE; c++) {
      maze[r][c] = {
        r, c,
        wall: false,
        dist: Infinity,
        visited: false,
        parent: null,
      };
    }
  }
}
initMaze();
drawMaze();

function drawMaze() {
  mctx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);
  for (let r = 0; r < M_SIZE; r++) {
    for (let c = 0; c < M_SIZE; c++) {
      const cell = maze[r][c];
      const x = c * CELL;
      const y = r * CELL;

      if (cell.wall) {
        mctx.fillStyle = "#111";
      } else {
        mctx.fillStyle = "#0b2b3b";
      }
      mctx.fillRect(x, y, CELL, CELL);

      if (cell.visited) {
        mctx.fillStyle = cell.visitColor || "rgba(77,163,255,0.5)";  
        mctx.fillRect(x+2, y+2, CELL-4, CELL-4);
      }

      if (r === start.r && c === start.c) {
        mctx.fillStyle = "#6bff8a";
        mctx.fillRect(x+4, y+4, CELL-8, CELL-8);
      }
      if (r === goal.r && c === goal.c) {
        mctx.fillStyle = "#ff8c6a";
        mctx.fillRect(x+4, y+4, CELL-8, CELL-8);
      }

      mctx.strokeStyle = "rgba(255,255,255,0.04)";
      mctx.strokeRect(x, y, CELL, CELL);
    }
  }
}

mazeCanvas.addEventListener("click", (e) => {
  if (mazeRunning) return;

  const rect = mazeCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);

  if ((r === start.r && c === start.c) ||
      (r === goal.r && c === goal.c)) return;

  maze[r][c].wall = !maze[r][c].wall;
  drawMaze();
});

function resetMazeState() {
  for (let r = 0; r < M_SIZE; r++) {
    for (let c = 0; c < M_SIZE; c++) {
      maze[r][c].visited = false;
      maze[r][c].parent = null;
      maze[r][c].dist = Infinity;
      maze[r][c].visitColor = null;
    }
  }
}

function neighbors(r, c) {
  const list = [];
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{
    let nr=r+dr, nc=c+dc;
    if(nr>=0 && nr<M_SIZE && nc>=0 && nc<M_SIZE && !maze[nr][nc].wall){
      list.push(maze[nr][nc]);
    }
  });
  return list;
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/* ------------------------------
   BFS
------------------------------ */
async function runBFS() {
  mazeRunning = true;
  resetMazeState();

  let q = [ maze[start.r][start.c] ];
  maze[start.r][start.c].visited = true;

  while (q.length) {
    const cur = q.shift();
    cur.visitColor = "rgba(77,163,255,0.5)";  // blue

    if (cur.r === goal.r && cur.c === goal.c) break;

    for (const n of neighbors(cur.r, cur.c)) {
      if (!n.visited) {
        n.visited = true;
        n.parent = cur;
        q.push(n);
      }
    }

    drawMaze();
    await sleep(25);
  }

  await drawPath();
  mazeRunning = false;
}

/* ------------------------------
   DFS
------------------------------ */
async function runDFS() {
  mazeRunning = true;
  resetMazeState();

  let stack = [ maze[start.r][start.c] ];
  maze[start.r][start.c].visited = true;

  while (stack.length) {
    const cur = stack.pop();
    cur.visitColor = "rgba(6,255,141,0.5)"; // green

    if (cur.r === goal.r && cur.c === goal.c) break;

    for (const n of neighbors(cur.r, cur.c)) {
      if (!n.visited) {
        n.visited = true;
        n.parent = cur;
        stack.push(n);
      }
    }

    drawMaze();
    await sleep(25);
  }

  await drawPath();
  mazeRunning = false;
}

/* ------------------------------
   DIJKSTRA
------------------------------ */
async function runDijkstra() {
  mazeRunning = true;
  resetMazeState();

  const startCell = maze[start.r][start.c];
  startCell.dist = 0;

  let pq = [ startCell ];

  while (pq.length) {
    pq.sort((a,b)=>a.dist - b.dist);
    const cur = pq.shift();
    if (cur.visited) continue;
    cur.visited = true;
    cur.visitColor = "rgba(255,233,122,0.5)"; // yellow

    if (cur.r === goal.r && cur.c === goal.c) break;

    for (const n of neighbors(cur.r, cur.c)) {
      let newDist = cur.dist + 1;
      if (newDist < n.dist) {
        n.dist = newDist;
        n.parent = cur;
        pq.push(n);
      }
    }

    drawMaze();
    await sleep(20);
  }

  await drawPath();
  mazeRunning = false;
}

/* ------------------------------
   PATH DRAWING
------------------------------ */
async function drawPath() {
  let cur = maze[goal.r][goal.c];
  let path = [];

  while (cur) {
    path.push(cur);
    cur = cur.parent;
  }

  path.reverse();

  for (let cell of path) {
    const x = cell.c * CELL;
    const y = cell.r * CELL;

    mctx.fillStyle = "#ff8c6a";
    mctx.fillRect(x+4, y+4, CELL-8, CELL-8);
    await sleep(40);
  }
}

/* ------------------------------
   RANDOM MAZE
------------------------------ */
function generateMaze() {
  initMaze();
  for (let r = 0; r < M_SIZE; r++) {
    for (let c = 0; c < M_SIZE; c++) {
      if ((r === start.r && c === start.c) ||
          (r === goal.r && c === goal.c)) continue;
      maze[r][c].wall = Math.random() < 0.28;
    }
  }
  drawMaze();
}

/* ------------------------------
   BUTTONS
------------------------------ */
document.getElementById("bfsBtn").onclick = () => {
  if (!mazeRunning) runBFS();
};
document.getElementById("dfsBtn").onclick = () => {
  if (!mazeRunning) runDFS();
};
document.getElementById("dijkstraBtn").onclick = () => {
  if (!mazeRunning) runDijkstra();
};
document.getElementById("mazeGenBtn").onclick = () => {
  if (!mazeRunning) generateMaze();
};
document.getElementById("mazeResetBtn").onclick = () => {
  if (!mazeRunning) {
    initMaze();
    drawMaze();
  }
};

/*************************************************
 * SORTING VISUALIZER
 *************************************************/
const barsContainer = document.getElementById("bars");
const sortSelect = document.getElementById("sortSelect");
const sortReset = document.getElementById("sortReset");
const sortRun = document.getElementById("sortRun");

let arr = [];
let sorting = false;
let sortSpeed = 1;
const BAR_COUNT = 20;

function genArray() {
  arr = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    arr.push(Math.floor(Math.random() * 90) + 10);
  }
  renderBars(arr, barsContainer, 200);
}
genArray();

function renderBars(array, container, height) {
  container.innerHTML = "";
  let max = Math.max(...array);

  array.forEach(v => {
    const bar = document.createElement("div");
    bar.classList.add("bar");
    bar.style.height = (v / max) * height + "px";
    bar.textContent = v;
    container.appendChild(bar);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms / sortSpeed));
}

/* ------------------------------
   BUBBLE SORT
------------------------------ */
async function bubbleSort(array) {
  for (let i = 0; i < array.length; i++) {
    for (let j = 0; j < array.length - 1 - i; j++) {
      if (!sorting) return;
      if (array[j] > array[j+1]) {
        [array[j], array[j+1]] = [array[j+1], array[j]];
      }
      renderBars(array, barsContainer, 200);
      await sleep(60);
    }
  }
}

/* ------------------------------
   SELECTION SORT
------------------------------ */
async function selectionSort(array) {
  for (let i = 0; i < array.length; i++) {
    let minIdx = i;
    for (let j = i+1; j < array.length; j++) {
      if (!sorting) return;
      if (array[j] < array[minIdx]) minIdx = j;
      renderBars(array, barsContainer, 200);
      await sleep(40);
    }
    [array[i], array[minIdx]] = [array[minIdx], array[i]];
  }
}

/* ------------------------------
   INSERTION SORT
------------------------------ */
async function insertionSort(array) {
  for (let i = 1; i < array.length; i++) {
    let key = array[i];
    let j = i - 1;

    while (j >= 0 && array[j] > key) {
      if (!sorting) return;
      array[j+1] = array[j];
      j--;
      renderBars(array, barsContainer, 200);
      await sleep(40);
    }
    array[j+1] = key;
  }
}

/* ------------------------------
   MERGE SORT
------------------------------ */
async function mergeSort(array, start = 0, end = array.length - 1) {
  if (start >= end || !sorting) return;

  const mid = Math.floor((start + end) / 2);
  await mergeSort(array, start, mid);
  await mergeSort(array, mid+1, end);
  await merge(array, start, mid, end);
}

async function merge(array, start, mid, end) {
  const left = array.slice(start, mid+1);
  const right = array.slice(mid+1, end+1);

  let i = 0, j = 0, k = start;

  while (i < left.length && j < right.length) {
    if (!sorting) return;
    if (left[i] <= right[j]) {
      array[k++] = left[i++];
    } else {
      array[k++] = right[j++];
    }
    renderBars(array, barsContainer, 200);
    await sleep(30);
  }

  while (i < left.length && sorting) {
    array[k++] = left[i++];
    renderBars(array, barsContainer, 200);
    await sleep(20);
  }

  while (j < right.length && sorting) {
    array[k++] = right[j++];
    renderBars(array, barsContainer, 200);
    await sleep(20);
  }
}

/* ------------------------------
   QUICK SORT
------------------------------ */
async function quickSort(array, low = 0, high = array.length - 1) {
  if (low < high && sorting) {
    let p = await partition(array, low, high);
    await quickSort(array, low, p - 1);
    await quickSort(array, p + 1, high);
  }
}

async function partition(array, low, high) {
  let pivot = array[high];
  let i = low - 1;

  for (let j = low; j < high; j++) {
    if (!sorting) return;
    if (array[j] < pivot) {
      i++;
      [array[i], array[j]] = [array[j], array[i]];
    }
    renderBars(array, barsContainer, 200);
    await sleep(40);
  }
  [array[i+1], array[high]] = [array[high], array[i+1]];
  return i + 1;
}

/* ------------------------------
   HEAP SORT
------------------------------ */
async function heapSort(array) {
  let n = array.length;

  for (let i = Math.floor(n/2)-1; i >= 0; i--) {
    await heapify(array, n, i);
  }

  for (let i = n - 1; i > 0; i--) {
    if (!sorting) return;
    [array[0], array[i]] = [array[i], array[0]];
    renderBars(array, barsContainer, 200);
    await sleep(50);
    await heapify(array, i, 0);
  }
}

async function heapify(array, size, i) {
  let largest = i;
  let left = 2*i + 1;
  let right = 2*i + 2;

  if (left < size && array[left] > array[largest]) largest = left;
  if (right < size && array[right] > array[largest]) largest = right;

  if (largest !== i) {
    [array[i], array[largest]] = [array[largest], array[i]];
    renderBars(array, barsContainer, 200);
    await sleep(40);
    await heapify(array, size, largest);
  }
}

/* ------------------------------
   SORTING BUTTONS
------------------------------ */

sortReset.onclick = () => {
  sorting = false;
  genArray();
};

sortRun.onclick = async () => {
  if (sorting) return;
  sorting = true;

  let copy = [...arr];

  switch (sortSelect.value) {
    case "bubble": await bubbleSort(copy); break;
    case "selection": await selectionSort(copy); break;
    case "insertion": await insertionSort(copy); break;
    case "merge": await mergeSort(copy); break;
    case "quick": await quickSort(copy); break;
    case "heap": await heapSort(copy); break;
  }

  sorting = false;
};

/*************************************************
 * SORTING RACE MODE
 *************************************************/
const raceBarsA = document.getElementById("raceBarsA");
const raceBarsB = document.getElementById("raceBarsB");
const raceA = document.getElementById("raceA");
const raceB = document.getElementById("raceB");
const raceRun = document.getElementById("raceRun");
const raceReset = document.getElementById("raceReset");

let raceArrA = [];
let raceArrB = [];
let raceRunning = false;

function genRaceArrays() {
  raceArrA = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    raceArrA.push(Math.floor(Math.random()*90)+10);
  }
  raceArrB = [...raceArrA];

  renderBars(raceArrA, raceBarsA, 150);
  renderBars(raceArrB, raceBarsB, 150);
}
genRaceArrays();

async function runAlgorithm(name, array, container, height=150) {
  const sleepWrap = async () => { if (raceRunning) await sleep(35); };
  const render = () => renderBars(array, container, height);

  switch (name) {
    case "bubble":
      for (let i = 0; i < array.length; i++)
        for (let j = 0; j < array.length-1-i; j++) {
          if (!raceRunning) return;
          if (array[j] > array[j+1])
            [array[j], array[j+1]] = [array[j+1], array[j]];
          render(); await sleepWrap();
        }
      break;

    case "selection":
      for (let i = 0; i < array.length; i++) {
        let min = i;
        for (let j = i+1; j < array.length; j++) {
          if (!raceRunning) return;
          if (array[j] < array[min]) min = j;
          render(); await sleepWrap();
        }
        [array[i], array[min]] = [array[min], array[i]];
      }
      break;

    case "insertion":
      for (let i = 1; i < array.length; i++) {
        let key = array[i], j = i - 1;
        while (j >= 0 && array[j] > key) {
          if (!raceRunning) return;
          array[j+1] = array[j];
          j--;
          render(); await sleepWrap();
        }
        array[j+1] = key;
      }
      break;

    case "merge":
      await mergeSortRace(array, 0, array.length-1, container, height);
      break;

    case "quick":
      await quickSortRace(array, 0, array.length-1, container, height);
      break;

    case "heap":
      await heapSortRace(array, container, height);
      break;
  }
}

/* --- Merge Sort Race --- */
async function mergeSortRace(array, start, end, container, height) {
  if (start >= end || !raceRunning) return;
  const mid = Math.floor((start+end)/2);
  await mergeSortRace(array, start, mid, container, height);
  await mergeSortRace(array, mid+1, end, container, height);
  await mergeRace(array, start, mid, end, container, height);
}

async function mergeRace(array, start, mid, end, cont, height) {
  const left = array.slice(start, mid+1);
  const right = array.slice(mid+1, end+1);
  let i = 0, j = 0, k = start;

  while (i < left.length && j < right.length && raceRunning) {
    array[k++] = left[i] <= right[j] ? left[i++] : right[j++];
    renderBars(array, cont, height);
    await sleep(25);
  }
  while (i < left.length && raceRunning) {
    array[k++] = left[i++];
    renderBars(array, cont, height);
    await sleep(20);
  }
  while (j < right.length && raceRunning) {
    array[k++] = right[j++];
    renderBars(array, cont, height);
    await sleep(20);
  }
}

/* --- Quick Sort Race --- */
async function quickSortRace(array, low, high, cont, height) {
  if (low < high && raceRunning) {
    let p = await partitionRace(array, low, high, cont, height);
    await quickSortRace(array, low, p-1, cont, height);
    await quickSortRace(array, p+1, high, cont, height);
  }
}

async function partitionRace(array, low, high, cont, height) {
  let pivot = array[high];
  let i = low - 1;
  for (let j = low; j<high; j++) {
    if (!raceRunning) return;
    if (array[j] < pivot) {
      i++;
      [array[i],array[j]]=[array[j],array[i]];
    }
    renderBars(array, cont, height);
    await sleep(30);
  }
  [array[i+1],array[high]]=[array[high],array[i+1]];
  return i + 1;
}

/* --- Heap Sort Race --- */
async function heapSortRace(array, cont, height) {
  let n = array.length;
  for (let i = Math.floor(n/2)-1; i>=0; i--) {
    await heapifyRace(array, n, i, cont, height);
  }
  for (let i = n-1; i>0; i--) {
    if (!raceRunning) return;
    [array[0], array[i]] = [array[i], array[0]];
    renderBars(array, cont, height);
    await sleep(30);
    await heapifyRace(array, i, 0, cont, height);
  }
}

async function heapifyRace(array, size, i, cont, height) {
  let largest = i,
      left = 2*i+1,
      right= 2*i+2;
  if (left < size && array[left] > array[largest]) largest = left;
  if (right< size && array[right]> array[largest]) largest = right;
  if (largest !== i) {
    [array[i], array[largest]] = [array[largest], array[i]];
    renderBars(array, cont, height);
    await sleep(30);
    await heapifyRace(array, size, largest, cont, height);
  }
}

/*************************************************
 * RACE BUTTONS
 *************************************************/
raceReset.onclick = () => {
  raceRunning = false;
  genRaceArrays();
};

raceRun.onclick = async () => {
  if (raceRunning) return;
  raceRunning = true;

  genRaceArrays();

  const algA = raceA.value;
  const algB = raceB.value;

  const promiseA = runAlgorithm(algA, raceArrA, raceBarsA, 150);
  const promiseB = runAlgorithm(algB, raceArrB, raceBarsB, 150);

  Promise.all([promiseA, promiseB]).then(() => {
    raceRunning = false;
  });
};


