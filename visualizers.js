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
