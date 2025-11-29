/**
 * visualizers.js
 * Minimal / human style, integrates with new layout.
 *
 * Features preserved:
 * - Maze: BFS / DFS / Dijkstra (15x15)
 * - Sorting visualizer (6 algorithms), fixed size
 * - Sorting race (side-by-side), fixed size
 * - Sound for sorting and race
 * - Speed multiplier controls
 *
 * No step-mode. No size sliders.
 */

/* ----------------------
   Small helpers
   ---------------------- */
function $(id){ return document.getElementById(id); }
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

/* sort speed multiplier (1x default) */
let sortSpeed = 1;
function sleep(ms){ return new Promise(r => setTimeout(r, ms / Math.max(0.25, sortSpeed))); }

/* ----------------------
   Audio / Beeps
   ---------------------- */
const soundToggle = $('soundToggle');
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
}
document.addEventListener('click', () => { ensureAudio(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }, { once: true });

function beep(value){
  if (!soundToggle || !soundToggle.checked) return;
  ensureAudio();
  if (!audioCtx) return;
  const freq = 200 + value * 12;
  const dur = 22;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.value = 0.08;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur/1000);
}

/* ======================
   MAZE
   ====================== */
const mazeCanvas = $('mazeCanvas');
const ctx = mazeCanvas.getContext('2d');
const GRID = 15;
const CELL = Math.floor(mazeCanvas.width / GRID);
const START = {r:0,c:0}, GOAL = {r:GRID-1,c:GRID-1};

let maze = [];
let mazeRunning = false;

function createMaze(){
  maze = [];
  for (let r=0;r<GRID;r++){
    const row=[];
    for (let c=0;c<GRID;c++){
      row.push({r,c,wall:false,visited:false,parent:null,dist:Infinity,color:null});
    }
    maze.push(row);
  }
}

function drawMaze(){
  ctx.clearRect(0,0,mazeCanvas.width,mazeCanvas.height);
  for (let r=0;r<GRID;r++){
    for (let c=0;c<GRID;c++){
      const cell = maze[r][c];
      const x = c*CELL, y = r*CELL;
      ctx.fillStyle = cell.wall ? '#121212' : '#173243';
      ctx.fillRect(x,y,CELL,CELL);
      if (cell.visited) {
        ctx.fillStyle = cell.color || 'rgba(77,163,255,0.45)';
        ctx.fillRect(x+2,y+2,CELL-4,CELL-4);
      }
      if (r===START.r && c===START.c){
        ctx.fillStyle = '#64ff9c';
        ctx.fillRect(x+4,y+4,CELL-8,CELL-8);
      }
      if (r===GOAL.r && c===GOAL.c){
        ctx.fillStyle = '#ff8c6a';
        ctx.fillRect(x+4,y+4,CELL-8,CELL-8);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(x,y,CELL,CELL);
    }
  }
}

function neighbors(r,c){
  const out=[]; const deltas=[[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dr,dc] of deltas){
    const nr=r+dr, nc=c+dc;
    if (nr>=0 && nr<GRID && nc>=0 && nc<GRID && !maze[nr][nc].wall) out.push(maze[nr][nc]);
  }
  return out;
}

function resetMazeState(){
  for (let r=0;r<GRID;r++) for (let c=0;c<GRID;c++){
    maze[r][c].visited=false; maze[r][c].parent=null; maze[r][c].dist=Infinity; maze[r][c].color=null;
  }
}

function generateMaze(){
  createMaze();
  for (let r=0;r<GRID;r++) for (let c=0;c<GRID;c++){
    if ((r===START.r && c===START.c) || (r===GOAL.r && c===GOAL.c)) continue;
    maze[r][c].wall = Math.random() < 0.28;
  }
  drawMaze();
}

async function tracePath(){
  let cur = maze[GOAL.r][GOAL.c];
  while(cur){
    const x = cur.c * CELL, y = cur.r * CELL;
    ctx.fillStyle = '#ff8c6a'; ctx.fillRect(x+4,y+4,CELL-8,CELL-8);
    await sleep(35);
    cur = cur.parent;
  }
}

async function runBFS(){
  if (mazeRunning) return; mazeRunning=true; resetMazeState();
  const q=[]; const s = maze[START.r][START.c]; s.visited=true; q.push(s);
  while(q.length){
    const cur = q.shift(); cur.color = 'rgba(77,163,255,0.45)';
    if (cur === maze[GOAL.r][GOAL.c]) break;
    for (const n of neighbors(cur.r,cur.c)){
      if (!n.visited) { n.visited=true; n.parent=cur; q.push(n); }
    }
    drawMaze(); await sleep(24);
  }
  await tracePath(); mazeRunning=false;
}

async function runDFS(){
  if (mazeRunning) return; mazeRunning=true; resetMazeState();
  const stack=[]; const s=maze[START.r][START.c]; s.visited=true; stack.push(s);
  while(stack.length){
    const cur = stack.pop(); cur.color='rgba(100,255,156,0.45)';
    if (cur === maze[GOAL.r][GOAL.c]) break;
    for (const n of neighbors(cur.r,cur.c)){
      if (!n.visited){ n.visited=true; n.parent=cur; stack.push(n); }
    }
    drawMaze(); await sleep(24);
  }
  await tracePath(); mazeRunning=false;
}

async function runDijkstra(){
  if (mazeRunning) return; mazeRunning=true; resetMazeState();
  const pq=[]; const s=maze[START.r][START.c]; s.dist=0; pq.push(s);
  while(pq.length){
    pq.sort((a,b)=>a.dist-b.dist);
    const cur = pq.shift();
    if (cur.visited) continue;
    cur.visited=true; cur.color='rgba(255,233,122,0.45)';
    if (cur === maze[GOAL.r][GOAL.c]) break;
    for (const n of neighbors(cur.r,cur.c)){
      const alt = cur.dist + 1;
      if (alt < n.dist){ n.dist = alt; n.parent = cur; pq.push(n); }
    }
    drawMaze(); await sleep(18);
  }
  await tracePath(); mazeRunning=false;
}

/* Maze UI wiring */
mazeCanvas.addEventListener('click', (e) => {
  if (mazeRunning) return;
  const rect = mazeCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
  if ((r===START.r && c===START.c) || (r===GOAL.r && c===GOAL.c)) return;
  maze[r][c].wall = !maze[r][c].wall;
  drawMaze();
});

$('bfsBtn').onclick = runBFS;
$('dfsBtn').onclick = runDFS;
$('dijkstraBtn').onclick = runDijkstra;
$('mazeGenBtn').onclick = generateMaze;
$('mazeResetBtn').onclick = () => { if (!mazeRunning) { createMaze(); drawMaze(); } };

createMaze(); generateMaze();

/* ======================
   SORTING VISUALIZER
   ====================== */
const barsBox = $('bars');
const sortSelect = $('sortSelect');
const sortRun = $('sortRun');
const sortReset = $('sortReset');

let sortArray = [];
let sorting = false;

$('slowDownBtn')?.addEventListener('click', () => { sortSpeed = clamp(sortSpeed/2,0.25,8); $('speedDisplay').textContent = sortSpeed + '×'; });
$('speedUpBtn')?.addEventListener('click', () => { sortSpeed = clamp(sortSpeed*2,0.25,8); $('speedDisplay').textContent = sortSpeed + '×'; });

function generateSortArray(){
  const size = 32;
  const a = [];
  for (let i=0;i<size;i++) a.push(Math.floor(Math.random()*90)+10);
  return a;
}

function drawBars(arr, container, h=200){
  container.innerHTML = '';
  const max = Math.max(...arr);
  arr.forEach(v => {
    const el = document.createElement('div');
    el.className = 'bar';
    el.style.height = Math.max(8, (v/max)*(h-8)) + 'px';
    el.textContent = v;
    container.appendChild(el);
  });
}

/* Sorting algos with beep() calls during comparisons/swaps */
async function bubbleSort(a){
  for (let i=0;i<a.length;i++){
    for (let j=0;j<a.length-1-i;j++){
      beep(a[j]);
      if (a[j] > a[j+1]) [a[j], a[j+1]] = [a[j+1], a[j]];
      drawBars(a,barsBox);
      await sleep(45);
    }
  }
}

async function selectionSort(a){
  for (let i=0;i<a.length;i++){
    let min=i;
    for (let j=i+1;j<a.length;j++){
      beep(a[j]);
      if (a[j] < a[min]) min = j;
      drawBars(a,barsBox);
      await sleep(35);
    }
    [a[i], a[min]] = [a[min], a[i]];
    drawBars(a,barsBox);
  }
}

async function insertionSort(a){
  for (let i=1;i<a.length;i++){
    let key = a[i];
    let j = i-1;
    while (j>=0 && a[j] > key){
      beep(a[j]);
      a[j+1] = a[j]; j--;
      drawBars(a,barsBox);
      await sleep(30);
    }
    a[j+1] = key;
    drawBars(a,barsBox);
  }
}

async function mergeSortDriver(a){ await mergeSort(a,0,a.length-1); }
async function mergeSort(a,l,r){
  if (l>=r) return;
  const m = Math.floor((l+r)/2);
  await mergeSort(a,l,m);
  await mergeSort(a,m+1,r);
  await merge(a,l,m,r);
}
async function merge(a,l,m,r){
  const L = a.slice(l,m+1), R = a.slice(m+1,r+1);
  let i=0,j=0,k=l;
  while (i<L.length && j<R.length){
    beep(L[i]);
    if (L[i] <= R[j]) a[k++] = L[i++]; else a[k++] = R[j++];
    drawBars(a,barsBox); await sleep(28);
  }
  while (i<L.length){ a[k++] = L[i++]; drawBars(a,barsBox); await sleep(20); }
  while (j<R.length){ a[k++] = R[j++]; drawBars(a,barsBox); await sleep(20); }
}

async function quickSortDriver(a){ await quickSort(a,0,a.length-1); }
async function quickSort(a,low,high){
  if (low < high){
    const p = await partition(a,low,high);
    await quickSort(a,low,p-1);
    await quickSort(a,p+1,high);
  }
}
async function partition(a,low,high){
  const pivot = a[high]; let i = low-1;
  for (let j=low;j<high;j++){
    beep(a[j]);
    if (a[j] < pivot){ i++; [a[i],a[j]]=[a[j],a[i]]; }
    drawBars(a,barsBox); await sleep(35);
  }
  [a[i+1], a[high]] = [a[high], a[i+1]];
  drawBars(a,barsBox); await sleep(35);
  return i+1;
}

async function heapSort(a){
  const n = a.length;
  for (let i=Math.floor(n/2)-1;i>=0;i--) await heapify(a,n,i);
  for (let i=n-1;i>0;i--){
    [a[0], a[i]] = [a[i], a[0]];
    drawBars(a,barsBox); await sleep(35);
    await heapify(a,i,0);
  }
}
async function heapify(a,size,i){
  let largest=i; const l=2*i+1, r=2*i+2;
  if (l<size && a[l] > a[largest]) largest = l;
  if (r<size && a[r] > a[largest]) largest = r;
  if (largest !== i){
    beep(a[largest]);
    [a[i], a[largest]] = [a[largest], a[i]];
    drawBars(a,barsBox); await sleep(28);
    await heapify(a,size,largest);
  }
}

/* Run sorting */
async function runSort(){
  if (sorting) return; sorting = true;
  const algorithm = sortSelect.value;
  const arr = sortArray.slice();
  if (algorithm === 'bubble') await bubbleSort(arr);
  else if (algorithm === 'selection') await selectionSort(arr);
  else if (algorithm === 'insertion') await insertionSort(arr);
  else if (algorithm === 'merge') await mergeSortDriver(arr);
  else if (algorithm === 'quick') await quickSortDriver(arr);
  else if (algorithm === 'heap') await heapSort(arr);
  drawBars(arr,barsBox); sorting = false; sortArray = arr;
}
sortRun.onclick = runSort;
sortReset.onclick = () => { sorting=false; sortArray=generateSortArray(); drawBars(sortArray,barsBox); };

function generateSortArray(){ const size=32; const a=[]; for (let i=0;i<size;i++) a.push(Math.floor(Math.random()*90)+10); return a; }
sortArray = generateSortArray(); drawBars(sortArray,barsBox);

/* ======================
   SORTING RACE
   ====================== */
const raceA = $('raceA'), raceB = $('raceB'), raceBarsA = $('raceBarsA'), raceBarsB = $('raceBarsB');
const raceRun = $('raceRun'), raceReset = $('raceReset'), raceWinner = $('raceWinner');
let raceRunning = false;

function generateRaceArrays(){
  const size = 36; const base = [];
  for (let i=0;i<size;i++) base.push(Math.floor(Math.random()*90)+10);
  return [base.slice(), base.slice()];
}
function drawRaceBars(arr,box,h=150){ box.innerHTML=''; const max = Math.max(...arr); arr.forEach(v=>{ const el=document.createElement('div'); el.className='bar'; el.style.height = Math.max(6,(v/max)*(h-6))+'px'; box.appendChild(el); }); }

async function raceSort(algo, arr, box){
  const render = ()=> drawRaceBars(arr, box);
  if (algo==='bubble'){
    for (let i=0;i<arr.length;i++){ for (let j=0;j<arr.length-1-i;j++){ beep(arr[j]); if (arr[j]>arr[j+1]) [arr[j],arr[j+1]]=[arr[j+1],arr[j]]; render(); await sleep(20); if (!raceRunning) return; } }
  }
  if (algo==='selection'){
    for (let i=0;i<arr.length;i++){ let min=i; for (let j=i+1;j<arr.length;j++){ beep(arr[j]); if (arr[j]<arr[min]) min=j; render(); await sleep(18); if (!raceRunning) return; } [arr[i],arr[min]]=[arr[min],arr[i]]; render(); }
  }
  if (algo==='insertion'){
    for (let i=1;i<arr.length;i++){ let key=arr[i], j=i-1; while(j>=0 && arr[j]>key){ beep(arr[j]); arr[j+1]=arr[j]; j--; render(); await sleep(18); if (!raceRunning) return; } arr[j+1]=key; render(); }
  }
  if (algo==='merge'){
    async function msort(a,l,r){ if (l>=r) return; const m=Math.floor((l+r)/2); await msort(a,l,m); await msort(a,m+1,r); await mmerge(a,l,m,r); }
    async function mmerge(a,l,m,r){ const L=a.slice(l,m+1), R=a.slice(m+1,r+1); let i=0,j=0,k=l; while(i<L.length && j<R.length){ beep(L[i]); a[k++]= L[i] <= R[j] ? L[i++] : R[j++]; render(); await sleep(16); if (!raceRunning) return; } while(i<L.length){ a[k++]=L[i++]; render(); await sleep(12); } while(j<R.length){ a[k++]=R[j++]; render(); await sleep(12); } }
    await msort(arr,0,arr.length-1);
  }
  if (algo==='quick'){
    async function qsort(a,l,r){ if (l>=r) return; const p = await qpart(a,l,r); await qsort(a,l,p-1); await qsort(a,p+1,r); }
    async function qpart(a,l,r){ const pivot=a[r]; let i=l-1; for (let j=l;j<r;j++){ beep(a[j]); if (a[j]<pivot){ i++; [a[i],a[j]]=[a[j],a[i]]; } render(); await sleep(14); if (!raceRunning) return l; } [a[i+1],a[r]]=[a[r],a[i+1]]; render(); await sleep(14); return i+1; }
    await qsort(arr,0,arr.length-1);
  }
  if (algo==='heap'){
    async function heapify(a,size,i){ let largest=i; const l=2*i+1, r=2*i+2; if (l<size && a[l]>a[largest]) largest=l; if (r<size && a[r]>a[largest]) largest=r; if (largest!==i){ beep(a[largest]); [a[i],a[largest]]=[a[largest],a[i]]; render(); await sleep(16); await heapify(a,size,largest); } }
    for (let i=Math.floor(arr.length/2)-1;i>=0;i--) await heapify(arr,arr.length,i);
    for (let i=arr.length-1;i>0;i--){ [arr[0],arr[i]]=[arr[i],arr[0]]; render(); await sleep(16); await heapify(arr,i,0); if (!raceRunning) return; }
  }
}

raceRun.onclick = async () => {
  if (raceRunning) return;
  raceRunning = true; raceWinner.textContent='';
  const [a1,a2] = generateRaceArrays(); drawRaceBars(a1,raceBarsA); drawRaceBars(a2,raceBarsB);
  const algoA = raceA.value, algoB = raceB.value;
  let winner=false;
  const p1 = (async ()=>{ await raceSort(algoA,a1,raceBarsA); if (!winner){ winner=true; raceWinner.textContent = `Winner: A (${algoA})`; } })();
  const p2 = (async ()=>{ await raceSort(algoB,a2,raceBarsB); if (!winner){ winner=true; raceWinner.textContent = `Winner: B (${algoB})`; } })();
  await Promise.all([p1,p2]); raceRunning=false;
};

raceReset.onclick = () => {
  raceRunning=false; raceWinner.textContent='';
  const [a1,a2] = generateRaceArrays(); drawRaceBars(a1,raceBarsA); drawRaceBars(a2,raceBarsB);
};

(function init(){
  sortArray = generateSortArray(); drawBars(sortArray,barsBox);
  const [a1,a2] = generateRaceArrays(); drawRaceBars(a1,raceBarsA); drawRaceBars(a2,raceBarsB);
})();

/* End of visualizers.js */
