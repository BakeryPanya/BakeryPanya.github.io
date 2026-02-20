// ==========================================
// main.js - FIXED VERSION
// ==========================================

// ---------------------------------------------------------
// 1. CONFIGURATION
// ---------------------------------------------------------
const CONFIG = {
  display: { spacing: 100, margin: 100 },
  logic: { snapThreshold: 0.9, clickTolerance: 40, wallStubRatio: 0.3 },
  style: {
    nubLength: 15, squareSize: 40, squareRadius: 10,
    star: { radiusOuter: 12, radiusInner: 8 },
    hexagon: { radius: 8, color: [255, 255, 255] },
    eliminator: { radius: 10, width: 5, color: [255, 255, 255] },
    polyomino: { blockSize: 15, gap: 3, color: [255, 200, 0] },
    triSymbol: { size: 15, gap: 5, color: [255, 150, 0] },
    strokeWeights: { gridLines: 14, pathGlow: 0, pathCore: 18, nodeSize: 14, startNodeSize: 50, goalNub: 14 },
    colors: {
      background: [50, 50, 60], grid: [30, 30, 40], pathCore: [200, 240, 255], pathError: [255, 85, 85], startCircle: [200, 240, 255], goalIndicator: [30, 30, 40],
      palette: { 0: [240, 240, 250], 1: [40, 40, 50], 2: [100, 255, 255], 3: [255, 100, 200], 4: [255, 255, 0], 5: [255, 50, 50], 6: [50, 255, 50], 7: [50, 100, 255], 8: [255, 128, 0] }
    }
  }
};

// ---------------------------------------------------------
// 2. PUZZLE DATA & LIST MANAGER
// ---------------------------------------------------------
// 現在編集・プレイ中の1問のデータ
const INITIAL_STAGE_DATA = [
  {
    cols: 6, rows: 6,
    start: { c: 0, r: 6 }, goal: { c: 6, r: 0 },
    walls: [],
    mustPasses: [],
    triangleSymbols: [
      { c: 3, r: 5, count: 1 },
      { c: 3, r: 0, count: 2 },
      { c: 1, r: 2, count: 3 }
    ],
    squares: [
      { c: 4, r: 5, color: 5 }, { c: 1, r: 5, color: 5 },
      { c: 4, r: 1, color: 7 }, { c: 0, r: 3, color: 5 },
      { c: 1, r: 0, color: 5 }, { c: 5, r: 0, color: 7 }
    ],
    stars: [
      { c: 4, r: 2, color: 5 }
    ],
    polyominoes: [
      { c: 3, r: 3, shape: [[1, 0], [0, 1]], color: 4 },
      { c: 5, r: 1, shape: [[1, 0], [0, 1], [0, 1]], color: 4 },
      { c: 4, r: 3, shape: [[1, 1]], color: 4 },
      { c: 1, r: 1, shape: [[1], [1], [1], [1], [1]], color: 4 },
      { c: 0, r: 5, shape: [[0, 1], [0, 0], [1, 0]], color: 4 },
      { c: 0, r: 0, shape: [[1, 0], [1, 1]], color: 4 },
      { c: 2, r: 5, shape: [[1, 0], [1, 1]], color: 4 },
      { c: 5, r: 5, shape: [[0, 1], [1, 1]], color: 4 }
    ],
    eliminators: [
      { c: 2, r: 2 }
    ]
  }
];

// パズルリスト（ステージデータ）
let puzzleList = JSON.parse(JSON.stringify(INITIAL_STAGE_DATA));

// 現在編集・プレイ中の1問のデータ
let currentEditorIndex = 0;
let PUZZLE_DATA = JSON.parse(JSON.stringify(puzzleList[0]));

// ---------------------------------------------------------
// 3. SYSTEM VARIABLES
// ---------------------------------------------------------
let appMode = 'PLAY';
let gameState = 'IDLE';
let path = []; let fadingPath = []; let fadeOpacity = 0;
let isAtGoal = false; let goalOffset = { x: 0, y: 0 };
let configError = null; let drawingTip = null;

// ステージモード管理
let stageState = {
  isPlaying: false,
  queue: [],           
  index: 0,            
  timeLeft: 60,        
  totalTime: 60,       
  timerInterval: null
};

// ---------------------------------------------------------
// 4. MAIN FUNCTIONS
// ---------------------------------------------------------
function setup() {
  let w = PUZZLE_DATA.cols * CONFIG.display.spacing + CONFIG.display.margin * 2;
  let h = PUZZLE_DATA.rows * CONFIG.display.spacing + CONFIG.display.margin * 2;
  
  let canvas = createCanvas(w, h);
  if (document.getElementById('canvas-container')) canvas.parent('canvas-container');
  
  strokeCap(ROUND); strokeJoin(ROUND);
  calculateAutoGoalOffset();
}

function draw() {
  background(...CONFIG.style.colors.background);
  if (configError) { fill(255, 100, 100); noStroke(); textSize(16); textAlign(CENTER); text(configError, width/2, height/2); return; }

  translate(CONFIG.display.margin, CONFIG.display.margin);

  if (appMode === 'PLAY') {
    if (gameState === 'DRAWING') { updateDrawingTip(); checkIfAtGoal(); }
    else if (gameState === 'FADING' || gameState === 'ERROR_FADING') updateFade();
  }

  drawGrid(); drawMustPasses(); drawSquares(); drawStars(); drawPolyominoes(); drawEliminators(); drawTriangleSymbols(); drawGoalNub();
  
  if (gameState === 'FADING') drawFadingPath(CONFIG.style.colors.pathCore);
  else if (gameState === 'ERROR_FADING') drawFadingPath(CONFIG.style.colors.pathError);
  else drawActivePath();
  
  drawStartCircle();
}

function mousePressed() {
  if (appMode === 'EDIT') {
    if (typeof editorMousePressed === 'function') {
      editorMousePressed();
      commitCurrentPuzzleToList(); // 操作ごとに保存
    }
    return;
  }

  if (stageState.isPlaying && (gameState === 'GAME_OVER' || gameState === 'STAGE_CLEAR')) return;

  if (gameState !== 'DRAWING') {
    let startPixel = nodeToPixel(PUZZLE_DATA.start);
    let localMX = mouseX - CONFIG.display.margin;
    let localMY = mouseY - CONFIG.display.margin;
    if (dist(localMX, localMY, startPixel.x, startPixel.y) < CONFIG.logic.clickTolerance) {
      gameState = 'DRAWING';
      path = [{ c: PUZZLE_DATA.start.c, r: PUZZLE_DATA.start.r }];
      drawingTip = startPixel;
      isAtGoal = false;
      fadeOpacity = 0;
    }
    return;
  }

  if (gameState === 'DRAWING') {
    if (isAtGoal) {
      let isValid = validateRule();
      if (isValid) {
        gameState = 'SOLVED';
        if (stageState.isPlaying) handleStageProgress();
      } else {
        gameState = 'ERROR_FADING';
        fadingPath = [...path]; fadeOpacity = 255; path = [];
      }
    } else {
      gameState = 'FADING';
      fadingPath = [...path]; fadeOpacity = 255; path = [];
    }
    drawingTip = null;
  }
}

function mouseReleased() {}

// ---------------------------------------------------------
// 5. STAGE GAME LOGIC (FIXED)
// ---------------------------------------------------------
function showTitleScreen() {
  stopStageGame();
  appMode = 'PLAY';
  
  // UIリセット
  document.getElementById('editor-tools').style.display = 'none';
  document.getElementById('grid-settings').style.display = 'none';
  document.getElementById('stage-settings').style.display = 'none';
  document.getElementById('puzzle-manager').style.display = 'none';
  document.getElementById('game-hud').style.display = 'none';
  
  // ★重要: オーバーレイを確実に表示 (flex + !important回避)
  let overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  overlay.style.pointerEvents = 'auto';

  // タイトル情報更新
  let timeLimit = document.getElementById('stage-time-limit') ? document.getElementById('stage-time-limit').value : 60;
  let puzzleCount = puzzleList.length;

  document.getElementById('overlay-title').innerText = "PUZZLE CHALLENGE";
  document.getElementById('overlay-title').style.color = "white";
  document.getElementById('overlay-msg').innerText = `Stage: ${puzzleCount} Puzzles / Limit: ${timeLimit}s`;
  
  let btn = document.getElementById('overlay-btn');
  btn.innerText = "START GAME";
  btn.onclick = startStageGame;
}

function startStageGame() {
  // 設定読み込み
  let timeInput = document.getElementById('stage-time-limit');
  stageState.totalTime = timeInput ? parseInt(timeInput.value) : 60;
  
  // 初期化
  stageState.isPlaying = true;
  stageState.index = 0;
  stageState.timeLeft = stageState.totalTime;
  
  if (puzzleList.length === 0) {
    alert("パズルがありません。Editモードで追加してください。");
    showTitleScreen();
    return;
  }
  // puzzleListをコピーしてキューに入れる
  stageState.queue = JSON.parse(JSON.stringify(puzzleList));

  // ★重要: オーバーレイを確実に隠す
  let overlay = document.getElementById('overlay');
  overlay.classList.add('hidden'); 
  overlay.style.display = 'none'; // CSSだけでなく直接非表示

  let hud = document.getElementById('game-hud');
  hud.classList.remove('hidden');
  hud.style.display = 'flex';
  
  updateHUD();
  loadPuzzleFromQueue();

  if (stageState.timerInterval) clearInterval(stageState.timerInterval);
  stageState.timerInterval = setInterval(gameLoop, 1000);
}

function gameLoop() {
  if (!stageState.isPlaying) return;
  stageState.timeLeft--;
  updateHUD();
  if (stageState.timeLeft <= 0) {
    stageState.timeLeft = 0;
    gameOver();
  }
}

function handleStageProgress() {
  setTimeout(() => {
    stageState.index++;
    if (stageState.index >= stageState.queue.length) {
      stageClear();
    } else {
      loadPuzzleFromQueue();
    }
  }, 500);
}

function loadPuzzleFromQueue() {
  let nextData = stageState.queue[stageState.index];
  applyPuzzleData(nextData, true);
  updateHUD();
}

function updateHUD() {
  let timerEl = document.getElementById('timer-val');
  let stageEl = document.getElementById('stage-val');
  if (timerEl) {
    let m = Math.floor(stageState.timeLeft / 60);
    let s = stageState.timeLeft % 60;
    timerEl.innerText = `${m}:${s.toString().padStart(2, '0')}`;
    if (stageState.timeLeft <= 10) timerEl.classList.add('warning');
    else timerEl.classList.remove('warning');
  }
  if (stageEl) {
    stageEl.innerText = `${stageState.index + 1} / ${stageState.queue.length}`;
  }
}

function gameOver() {
  stopStageGame();
  gameState = 'GAME_OVER';
  let overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  document.getElementById('overlay-title').innerText = "GAME OVER";
  document.getElementById('overlay-title').style.color = "red";
  document.getElementById('overlay-msg').innerText = `Stopped at Puzzle ${stageState.index + 1}`;
  let btn = document.getElementById('overlay-btn');
  btn.innerText = "TRY AGAIN";
  btn.onclick = startStageGame;
}

function stageClear() {
  stopStageGame();
  gameState = 'STAGE_CLEAR';
  let overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  document.getElementById('overlay-title').innerText = "CONGRATULATIONS!";
  document.getElementById('overlay-title').style.color = "lime";
  document.getElementById('overlay-msg').innerText = `Time Left: ${stageState.timeLeft}s`;
  let btn = document.getElementById('overlay-btn');
  btn.innerText = "PLAY AGAIN";
  btn.onclick = startStageGame;
}

function stopStageGame() {
  stageState.isPlaying = false;
  if (stageState.timerInterval) clearInterval(stageState.timerInterval);
}

// ---------------------------------------------------------
// 6. PUZZLE MANAGER & EDITOR
// ---------------------------------------------------------

function commitCurrentPuzzleToList() {
  puzzleList[currentEditorIndex] = JSON.parse(JSON.stringify(PUZZLE_DATA));
}

function loadEditorPuzzle(index) {
  if (index < 0 || index >= puzzleList.length) return;
  currentEditorIndex = index;
  applyPuzzleData(JSON.parse(JSON.stringify(puzzleList[index])), true);
  updatePuzzleIndicator();
}

function navPuzzle(delta) {
  commitCurrentPuzzleToList();
  let newIndex = currentEditorIndex + delta;
  if (newIndex >= 0 && newIndex < puzzleList.length) {
    loadEditorPuzzle(newIndex);
  }
}

function addPuzzle() {
  commitCurrentPuzzleToList();
  let newPuzzle = {
    cols: 4, rows: 4, start: {c:0, r:4}, goal: {c:4, r:0},
    walls: [], squares: [], stars: [], polyominoes: [], triangleSymbols: [], mustPasses: [], eliminators: []
  };
  puzzleList.push(newPuzzle);
  loadEditorPuzzle(puzzleList.length - 1);
}

function deletePuzzle() {
  if (puzzleList.length <= 1) {
    alert("これ以上削除できません (最低1つ必要です)");
    return;
  }
  if (!confirm("現在のパズルを削除しますか？")) return;
  puzzleList.splice(currentEditorIndex, 1);
  if (currentEditorIndex >= puzzleList.length) {
    currentEditorIndex = puzzleList.length - 1;
  }
  loadEditorPuzzle(currentEditorIndex);
}

function updatePuzzleIndicator() {
  let el = document.getElementById('puzzle-indicator');
  if (el) el.innerText = `${currentEditorIndex + 1} / ${puzzleList.length}`;
  // 反映
  document.getElementById('grid-cols').value = PUZZLE_DATA.cols;
  document.getElementById('grid-rows').value = PUZZLE_DATA.rows;
}

// ---------------------------------------------------------
// 7. FILE I/O
// ---------------------------------------------------------
function exportStageJSON() {
  commitCurrentPuzzleToList();
  let exportData = {
    settings: { timeLimit: parseInt(document.getElementById('stage-time-limit').value) || 60 },
    puzzles: puzzleList
  };
  let json = JSON.stringify(exportData, null, 2);
  let blob = new Blob([json], { type: "application/json" });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = "witness_stage.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importStageJSON() {
  let input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    let file = e.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = event => {
      try {
        let data = JSON.parse(event.target.result);
        if (data.puzzles && Array.isArray(data.puzzles)) {
          puzzleList = data.puzzles;
          if (data.settings && data.settings.timeLimit) {
            document.getElementById('stage-time-limit').value = data.settings.timeLimit;
          }
        } else if (data.cols) {
          // 単体ファイルならリストに入れる
          puzzleList = [data];
        } else {
          throw new Error("Invalid format");
        }
        loadEditorPuzzle(0);
        alert("ステージデータを読み込みました！");
      } catch (err) {
        console.error(err);
        alert("読込エラー: データ形式が不正です");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ---------------------------------------------------------
// 8. HELPERS
// ---------------------------------------------------------
function applyGridResize() {
  let newCols = parseInt(document.getElementById('grid-cols').value);
  let newRows = parseInt(document.getElementById('grid-rows').value);
  if (newCols < 1 || newRows < 1) return;

  PUZZLE_DATA.cols = newCols;
  PUZZLE_DATA.rows = newRows;

  const filterInBounds = (arr) => (arr || []).filter(i => i.c < newCols && i.r < newRows);
  const filterInBoundsNode = (arr) => (arr || []).filter(i => i.c <= newCols && i.r <= newRows);

  PUZZLE_DATA.squares = filterInBounds(PUZZLE_DATA.squares);
  PUZZLE_DATA.stars = filterInBounds(PUZZLE_DATA.stars);
  PUZZLE_DATA.polyominoes = filterInBounds(PUZZLE_DATA.polyominoes);
  PUZZLE_DATA.triangleSymbols = filterInBounds(PUZZLE_DATA.triangleSymbols);
  PUZZLE_DATA.eliminators = filterInBounds(PUZZLE_DATA.eliminators);
  
  PUZZLE_DATA.walls = (PUZZLE_DATA.walls || []).filter(w => {
    if (w.type === 'h') return w.c < newCols && w.r <= newRows;
    if (w.type === 'v') return w.c <= newCols && w.r < newRows;
    return false;
  });
  PUZZLE_DATA.mustPasses = filterInBoundsNode(PUZZLE_DATA.mustPasses);

  if (PUZZLE_DATA.start.c > newCols) PUZZLE_DATA.start.c = newCols;
  if (PUZZLE_DATA.start.r > newRows) PUZZLE_DATA.start.r = newRows;
  if (PUZZLE_DATA.goal.c > newCols) PUZZLE_DATA.goal.c = newCols;
  if (PUZZLE_DATA.goal.r > newRows) PUZZLE_DATA.goal.r = newRows;

  setup();
  path = [];
  gameState = 'IDLE';
  commitCurrentPuzzleToList();
}

function toggleMode() {
  if (appMode === 'PLAY') {
    appMode = 'EDIT';
    if (stageState.isPlaying) stopStageGame();
    
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('overlay').style.display = 'none'; // Ensure hidden
    document.getElementById('game-hud').style.display = 'none';

    updateStatus("MODE: EDIT", "yellow");
    document.getElementById('editor-tools').style.display = 'block';
    document.getElementById('grid-settings').style.display = 'block';
    document.getElementById('stage-settings').style.display = 'block';
    document.getElementById('puzzle-manager').style.display = 'block';
    
    if (typeof initPolyEditor === 'function') initPolyEditor();
    if (typeof togglePolyEditor === 'function') togglePolyEditor();
    
    loadEditorPuzzle(currentEditorIndex);
    path = [];
    gameState = 'IDLE';
  } else {
    appMode = 'PLAY';
    updateStatus("MODE: PLAY", "lime");
    document.getElementById('editor-tools').style.display = 'none';
    document.getElementById('grid-settings').style.display = 'none';
    document.getElementById('stage-settings').style.display = 'none';
    document.getElementById('puzzle-manager').style.display = 'none';
    
    path = [];
    gameState = 'IDLE';
  }
}

function applyPuzzleData(data, silent = false) {
  if (data.cols !== undefined && data.rows !== undefined) {
    PUZZLE_DATA.cols = data.cols;
    PUZZLE_DATA.rows = data.rows;
    PUZZLE_DATA.start = JSON.parse(JSON.stringify(data.start || {c:0,r:4}));
    PUZZLE_DATA.goal = JSON.parse(JSON.stringify(data.goal || {c:4,r:0}));
    
    PUZZLE_DATA.walls = data.walls ? JSON.parse(JSON.stringify(data.walls)) : [];
    PUZZLE_DATA.squares = data.squares ? JSON.parse(JSON.stringify(data.squares)) : [];
    PUZZLE_DATA.stars = data.stars ? JSON.parse(JSON.stringify(data.stars)) : [];
    PUZZLE_DATA.polyominoes = data.polyominoes ? JSON.parse(JSON.stringify(data.polyominoes)) : [];
    PUZZLE_DATA.triangleSymbols = data.triangleSymbols ? JSON.parse(JSON.stringify(data.triangleSymbols)) : [];
    PUZZLE_DATA.mustPasses = data.mustPasses ? JSON.parse(JSON.stringify(data.mustPasses)) : [];
    PUZZLE_DATA.eliminators = data.eliminators ? JSON.parse(JSON.stringify(data.eliminators)) : [];

    setup(); 
    path = [];
    gameState = 'IDLE';
    
    let colInput = document.getElementById('grid-cols');
    if(colInput) {
      colInput.value = PUZZLE_DATA.cols;
      document.getElementById('grid-rows').value = PUZZLE_DATA.rows;
    }
  } else if (!silent) {
    alert("無効なパズルデータです。");
  }
}

function updateStatus(msg, color) {
  let el = document.getElementById('status');
  if (el) { el.innerText = msg; el.style.color = color || 'white'; }
}