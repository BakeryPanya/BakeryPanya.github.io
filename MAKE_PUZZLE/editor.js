// ==========================================
// editor.js - COMPLETE VERSION
// ==========================================

let currentEditorTool = 'start'; // 現在選択中のツール
let polyGridSize = 5;
let polyGridState = []; // 5x5の0/1配列

// ---------------------------------------------------------
// 1. INITIALIZATION & UI HANDLERS
// ---------------------------------------------------------

// エディタモード初期化時に呼ばれる (main.jsのtoggleModeから)
function initPolyEditor() {
  let container = document.getElementById('poly-grid-container');
  // コンテナが存在しない、または既に作成済みの場合は何もしない
  if (!container || container.innerHTML !== "") return;

  // 5x5の初期化
  polyGridState = Array(polyGridSize).fill().map(() => Array(polyGridSize).fill(0));
  // デフォルトで2x2の正方形にしておく
  polyGridState[1][1] = 1; polyGridState[1][2] = 1;
  polyGridState[2][1] = 1; polyGridState[2][2] = 1;

  // ボタン(セル)生成
  for (let r = 0; r < polyGridSize; r++) {
    for (let c = 0; c < polyGridSize; c++) {
      let btn = document.createElement('div');
      btn.style.width = "20px";
      btn.style.height = "20px";
      btn.style.border = "1px solid #888";
      btn.style.cursor = "pointer";
      btn.style.backgroundColor = polyGridState[r][c] ? "yellow" : "#333";
      
      // クリックイベント
      btn.onclick = () => togglePolyCell(r, c, btn);
      container.appendChild(btn);
    }
  }
}

// ツール選択変更時の表示切替 (HTMLのonchangeから呼ばれる)
function togglePolyEditor() {
  let tool = document.getElementById('tool-select').value;
  let creator = document.getElementById('poly-creator');
  if (creator) {
    if (tool === 'tetris') {
      creator.style.display = 'block';
    } else {
      creator.style.display = 'none';
    }
  }
}

// ポリオミノ作成グリッドのセルクリック処理
function togglePolyCell(r, c, btnElement) {
  polyGridState[r][c] = polyGridState[r][c] ? 0 : 1;
  btnElement.style.backgroundColor = polyGridState[r][c] ? "yellow" : "#333";
}


// ---------------------------------------------------------
// 2. MAIN EDITOR LOGIC (MOUSE HANDLER)
// ---------------------------------------------------------

// main.js の mousePressed から呼ばれる
function editorMousePressed() {
  // エディタモードでなければ何もしない (念のため)
  if (typeof appMode !== 'undefined' && appMode !== 'EDIT') return;

  let s = CONFIG.display.spacing;
  let m = CONFIG.display.margin;
  let mx = mouseX - m;
  let my = mouseY - m;

  // UIから現在の設定値を取得
  let toolSelect = document.getElementById('tool-select');
  let colorSelect = document.getElementById('color-select');
  let paramInput = document.getElementById('param-input');
  
  if (!toolSelect) return; // UI読み込み前なら中断

  let tool = toolSelect.value;
  let colorVal = colorSelect ? parseInt(colorSelect.value) : 0;
  let paramVal = paramInput ? parseInt(paramInput.value) : 1;

  // ------------------------------------------
  // A. 交差点 (Node) のクリック判定
  // ------------------------------------------
  // Start, Goal, Hexagon(Node)
  let nc = Math.round(mx / s);
  let nr = Math.round(my / s);
  
  // 交差点に近い(半径15px以内)ならノード処理
  if (dist(mx, my, nc * s, nr * s) < 15) {
    // 範囲内チェック
    if (nc >= 0 && nc <= PUZZLE_DATA.cols && nr >= 0 && nr <= PUZZLE_DATA.rows) {
      handleNodeClick(nc, nr, tool, colorVal);
      return;
    }
  }

  // ------------------------------------------
  // B. マス (Cell) のクリック判定
  // ------------------------------------------
  // Square, Star, Tetris, Triangle, Eliminator
  let cc = Math.floor(mx / s);
  let cr = Math.floor(my / s);
  
  let cellCenterX = cc * s + s/2;
  let cellCenterY = cr * s + s/2;
  
  // マスの中心に近い(半径20px以内)ならセル処理
  if (dist(mx, my, cellCenterX, cellCenterY) < 20) {
    // 範囲内チェック
    if (cc >= 0 && cc < PUZZLE_DATA.cols && cr >= 0 && cr < PUZZLE_DATA.rows) {
      handleCellClick(cc, cr, tool, colorVal, paramVal);
      return;
    }
  }

  // ------------------------------------------
  // C. 辺 (Edge) のクリック判定
  // ------------------------------------------
  // Wall, Hexagon(Edge)
  // 横線に近いか？
  if (Math.abs(my % s) < 10) { 
    let edgeR = Math.round(my / s);
    let edgeC = Math.floor(mx / s);
    if (edgeC >= 0 && edgeC < PUZZLE_DATA.cols && edgeR >= 0 && edgeR <= PUZZLE_DATA.rows) {
      handleEdgeClick(edgeC, edgeR, 'h', tool);
    }
  }
  // 縦線に近いか？
  else if (Math.abs(mx % s) < 10) {
    let edgeC = Math.round(mx / s);
    let edgeR = Math.floor(my / s);
    if (edgeR >= 0 && edgeR <= PUZZLE_DATA.rows && edgeC >= 0 && edgeC <= PUZZLE_DATA.cols) {
      handleEdgeClick(edgeC, edgeR, 'v', tool);
    }
  }
}


// ---------------------------------------------------------
// 3. HANDLERS FOR SPECIFIC TYPES
// ---------------------------------------------------------

function handleNodeClick(c, r, tool, color) {
  if (tool === 'start') {
    PUZZLE_DATA.start = { c: c, r: r };
  } else if (tool === 'goal') {
    PUZZLE_DATA.goal = { c: c, r: r };
    calculateAutoGoalOffset(); // main.jsの関数
  } else if (tool === 'hexagon') {
    removeFromList(PUZZLE_DATA.mustPasses, c, r);
    PUZZLE_DATA.mustPasses.push({ c: c, r: r, type: 'node' });
  } else if (tool === 'delete') {
    // ノード上のアイテム(mustPasses)を削除
    // start/goalは消せないので無視(位置変更のみ)
    removeFromList(PUZZLE_DATA.mustPasses, c, r);
  }
}

function handleCellClick(c, r, tool, color, param) {
  // まず既存のアイテムをそのマスから削除（重複配置を防ぐため）
  removeCellItem(c, r);

  if (tool === 'square') {
    PUZZLE_DATA.squares.push({ c, r, color });
    
  } else if (tool === 'star') {
    PUZZLE_DATA.stars.push({ c, r, color });
    
  } else if (tool === 'tetris') {
    // エディタで作った形を取得
    let customShape = getTrimmedPolyShape();
    if (customShape) {
      PUZZLE_DATA.polyominoes.push({ 
        c, r, 
        shape: customShape, 
        color: CONFIG.style.polyomino.color 
      });
    } else {
      alert("形が作られていません。ツールバー下のグリッドで黄色いブロックを描いてください。");
    }

  } else if (tool === 'triangle') {
    // 名前は triangleSymbols に統一済み
    PUZZLE_DATA.triangleSymbols.push({ c, r, count: param });
    
  } else if (tool === 'eliminator') {
    PUZZLE_DATA.eliminators.push({ c, r });
  }
  // tool === 'delete' の場合は削除だけして終わり
}

function handleEdgeClick(c, r, type, tool) {
  if (tool === 'wall') {
    // 壁はトグル動作: あれば消す、なければ足す
    let idx = PUZZLE_DATA.walls.findIndex(w => w.c === c && w.r === r && w.type === type);
    if (idx >= 0) {
      PUZZLE_DATA.walls.splice(idx, 1);
    } else {
      PUZZLE_DATA.walls.push({ c, r, type });
    }
  } else if (tool === 'hexagon') {
    removeFromList(PUZZLE_DATA.mustPasses, c, r, type);
    PUZZLE_DATA.mustPasses.push({ c, r, type });
  } else if (tool === 'delete') {
    // 壁削除
    let wIdx = PUZZLE_DATA.walls.findIndex(w => w.c === c && w.r === r && w.type === type);
    if (wIdx >= 0) PUZZLE_DATA.walls.splice(wIdx, 1);
    // 六角形削除
    removeFromList(PUZZLE_DATA.mustPasses, c, r, type);
  }
}


// ---------------------------------------------------------
// 4. HELPERS
// ---------------------------------------------------------

// 5x5グリッドから、ブロックがある最小範囲を切り出す
function getTrimmedPolyShape() {
  let minR = polyGridSize, maxR = -1;
  let minC = polyGridSize, maxC = -1;
  let hasBlock = false;

  for (let r = 0; r < polyGridSize; r++) {
    for (let c = 0; c < polyGridSize; c++) {
      if (polyGridState[r][c] === 1) {
        hasBlock = true;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  if (!hasBlock) return null;

  let shape = [];
  for (let r = minR; r <= maxR; r++) {
    let row = [];
    for (let c = minC; c <= maxC; c++) {
      row.push(polyGridState[r][c]);
    }
    shape.push(row);
  }
  return shape;
}

// 指定座標のマスにあるアイテムを全リストから削除
function removeCellItem(c, r) {
  removeFromList(PUZZLE_DATA.squares, c, r);
  removeFromList(PUZZLE_DATA.stars, c, r);
  removeFromList(PUZZLE_DATA.polyominoes, c, r);
  removeFromList(PUZZLE_DATA.triangleSymbols, c, r);
  removeFromList(PUZZLE_DATA.eliminators, c, r);
}

// 汎用削除ヘルパー
function removeFromList(list, c, r, type) {
  if (!list) return;
  for (let i = list.length - 1; i >= 0; i--) {
    let item = list[i];
    // 座標一致チェック
    if (item.c === c && item.r === r) {
      // type指定がある場合（壁や六角形）はそれも一致する必要あり
      if (type && item.type !== type) continue;
      list.splice(i, 1);
    }
  }
}