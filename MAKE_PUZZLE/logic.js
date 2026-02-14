// ==========================================
// logic.js - FIXED & UNIFIED VERSION
// ==========================================

// ---------------------------------------------------------
// 1. UPDATE & MOVEMENT LOGIC
// ---------------------------------------------------------
function updateDrawingTip() {
  if (path.length === 0) return;
  let lastNode = path[path.length - 1];
  let lastNodePixel = nodeToPixel(lastNode);
  let s = CONFIG.display.spacing;
  
  let localMX = mouseX - CONFIG.display.margin;
  let localMY = mouseY - CONFIG.display.margin;
  let dx = localMX - lastNodePixel.x;
  let dy = localMY - lastNodePixel.y;
  
  let targetNode = null;
  let progress = 0;

  if (abs(dx) > abs(dy)) {
    let sign = Math.sign(dx); 
    if (sign !== 0) { targetNode = { c: lastNode.c + sign, r: lastNode.r }; progress = abs(dx) / s; }
  } else {
    let sign = Math.sign(dy); 
    if (sign !== 0) { targetNode = { c: lastNode.c, r: lastNode.r + sign }; progress = abs(dy) / s; }
  }
  
  progress = constrain(progress, 0, 1);
  drawingTip = lastNodePixel; 

  if (!targetNode) return;

  if (!canMoveBetween(lastNode, targetNode)) {
    let visualProgress = min(progress, CONFIG.logic.wallStubRatio);
    let targetPixel = nodeToPixel(targetNode);
    drawingTip = { 
      x: lerp(lastNodePixel.x, targetPixel.x, visualProgress), 
      y: lerp(lastNodePixel.y, targetPixel.y, visualProgress) 
    };
    return;
  }

  if (path.length > 1) {
    let prevNode = path[path.length - 2];
    if (targetNode.c === prevNode.c && targetNode.r === prevNode.r) {
      if (progress > CONFIG.logic.snapThreshold) { path.pop(); updateDrawingTip(); return; }
      let targetPixel = nodeToPixel(targetNode);
      drawingTip = { x: lerp(lastNodePixel.x, targetPixel.x, progress), y: lerp(lastNodePixel.y, targetPixel.y, progress) };
      return;
    }
  }
  
  if (isWithinBounds(targetNode) && !isVisited(targetNode)) {
     if (progress > CONFIG.logic.snapThreshold) { path.push(targetNode); updateDrawingTip(); return; }
     let targetPixel = nodeToPixel(targetNode);
     drawingTip = { x: lerp(lastNodePixel.x, targetPixel.x, progress), y: lerp(lastNodePixel.y, targetPixel.y, progress) };
  }
}

function checkIfAtGoal() {
  if (path.length === 0) { isAtGoal = false; return; }
  let head = path[path.length - 1];
  isAtGoal = (head.c === PUZZLE_DATA.goal.c && head.r === PUZZLE_DATA.goal.r);
}

function updateFade() {
  fadeOpacity -= 10; 
  if (fadeOpacity <= 0) { fadeOpacity = 0; gameState = 'IDLE'; fadingPath = []; }
}

function calculateAutoGoalOffset() {
  let g = PUZZLE_DATA.goal;
  let len = CONFIG.style.nubLength;
  let dirX = 0, dirY = 0;
  if (g.c === 0) dirX = -1; else if (g.c === PUZZLE_DATA.cols) dirX = 1;
  if (g.r === 0) dirY = -1; else if (g.r === PUZZLE_DATA.rows) dirY = 1;
  if (dirX === 0 && dirY === 0) { configError = "Goal inside grid"; return; }
  goalOffset = { x: dirX * len, y: dirY * len };
}

// ---------------------------------------------------------
// 2. RULE VALIDATION
// ---------------------------------------------------------
function validateRule() {
  // 六角形(通過必須)チェック
  if (!validateMustPasses()) return false;

  let visited = Array(PUZZLE_DATA.cols).fill().map(() => Array(PUZZLE_DATA.rows).fill(false));
  
  for (let c = 0; c < PUZZLE_DATA.cols; c++) {
    for (let r = 0; r < PUZZLE_DATA.rows; r++) {
      if (!visited[c][r]) {
        let regionCells = getRegionCells(c, r, visited);
        // 消去マーク対応の領域判定
        if (!validateRegionWithEliminators(regionCells)) return false;
      }
    }
  }
  return true;
}

function getRegionCells(startC, startR, visited) {
  let cells = [];
  let queue = [{c: startC, r: startR}];
  visited[startC][startR] = true;
  cells.push({c: startC, r: startR});

  while(queue.length > 0) {
    let current = queue.shift();
    let neighbors = [
      {c:current.c,r:current.r-1},{c:current.c,r:current.r+1},
      {c:current.c-1,r:current.r},{c:current.c+1,r:current.r}
    ];
    for (let n of neighbors) {
      if (n.c < 0 || n.c >= PUZZLE_DATA.cols || n.r < 0 || n.r >= PUZZLE_DATA.rows) continue;
      if (visited[n.c][n.r] || isPathBlocking(current, n)) continue;
      visited[n.c][n.r] = true;
      cells.push({c: n.c, r: n.r});
      queue.push({c: n.c, r: n.r});
    }
  }
  return cells;
}

function validateRegionWithEliminators(regionCells) {
  let elements = collectElements(regionCells);
  let eliminatorCount = elements.eliminators.length;

  // 判定対象となる要素 (消去マーク自体は除く)
  let targets = [
    ...elements.squares,
    ...elements.stars,
    ...elements.polyominoes,
    ...elements.triangleSymbols
  ];

  // ----------------------------------------------------------
  // 消去マークがない場合 (通常チェック)
  // ----------------------------------------------------------
  if (eliminatorCount === 0) {
    return checkSubsetRules(targets, regionCells);
  }

  // ----------------------------------------------------------
  // 消去マークがある場合
  // ----------------------------------------------------------
  
  // ターゲットの数より消去マークが多い = 消すものが足りない = NG
  if (eliminatorCount > targets.length) return false;

  // ルール: 「0個」～「N-1個」の消去では『不正解』でなければならない
  // つまり、消去マークを使わなくても正解だったり、余ったりしてはいけない
  for (let k = 0; k < eliminatorCount; k++) {
    let keepCount = targets.length - k;
    let combinations = getCombinations(targets, keepCount);
    
    // もし「少ない消去数」で正解できる組み合わせが見つかったら、
    // 消去マークが「余っている（無駄がある）」ことになるので NG
    for (let subset of combinations) {
      if (checkSubsetRules(subset, regionCells)) {
        return false; 
      }
    }
  }

  // ルール: 「N個」消去した時には『正解』になる組み合わせが存在しなければならない
  {
    let keepCount = targets.length - eliminatorCount;
    let combinations = getCombinations(targets, keepCount);

    for (let subset of combinations) {
      if (checkSubsetRules(subset, regionCells)) {
        return true; // ちょうど使い切って正解できた！
      }
    }
  }

  // N個消しても正解が見つからなかった = NG (エラーが多すぎる)
  return false;
}

// サブセットに対するルール判定
function checkSubsetRules(subset, regionCells) {
  let sqs = subset.filter(e => e.kind === 'square');
  let strs = subset.filter(e => e.kind === 'star');
  let polys = subset.filter(e => e.kind === 'poly');
  let tris = subset.filter(e => e.kind === 'triangle');

  // 1. 四角 & 星 (連携ルール)
  let distinctColors = new Set(sqs.map(s => s.color));
  if (distinctColors.size > 1) return false; // 色混在NG

  let allColors = new Set([...sqs.map(s => s.color), ...strs.map(s => s.color)]);
  for (let color of allColors) {
    let starCount = strs.filter(s => s.color === color).length;
    let squareCount = sqs.filter(s => s.color === color).length;
    
    // 星がある場合のみ個数制限(2個)が発生
    if (starCount > 0) {
      if ((starCount + squareCount) !== 2) return false;
    }
    // 星がない場合、四角は何個あってもOK
  }

  // 2. 三角形
  for (let t of tris) {
    if (countEdgesForCell(t.c, t.r) !== t.count) return false;
  }

  // 3. テトリス
  if (polys.length > 0) {
    let totalBlocks = 0;
    for (let p of polys) {
      for (let row of p.shape) for (let col of row) if (col === 1) totalBlocks++;
    }
    // 面積オーバーならNG
    if (totalBlocks !== regionCells.length) return false;
    
    // 配置シミュレーション
    let availableCells = new Set(regionCells.map(c => `${c.c},${c.r}`));
    if (!canFitPolyominoes(availableCells, polys)) return false;
  }

  return true;
}

// ---------------------------------------------------------
// 3. HELPER FUNCTIONS
// ---------------------------------------------------------
function validateMustPasses() {
  if (!PUZZLE_DATA.mustPasses) return true;
  for (let mp of PUZZLE_DATA.mustPasses) {
    if (mp.type === 'node') { if (!isNodeCovered(mp)) return false; }
    else { if (!isEdgeCovered(mp)) return false; }
  }
  return true;
}

function collectElements(cells) {
  let res = { squares: [], stars: [], polyominoes: [], eliminators: [], triangleSymbols: [] };
  for (let cell of cells) {
    let sq = getElementAt(PUZZLE_DATA.squares, cell.c, cell.r);
    if (sq) res.squares.push({ ...sq, kind: 'square' });
    let st = getElementAt(PUZZLE_DATA.stars, cell.c, cell.r);
    if (st) res.stars.push({ ...st, kind: 'star' });
    let ply = getElementAt(PUZZLE_DATA.polyominoes, cell.c, cell.r);
    if (ply) res.polyominoes.push({ ...ply, kind: 'poly' });
    let elm = getElementAt(PUZZLE_DATA.eliminators, cell.c, cell.r);
    if (elm) res.eliminators.push({ ...elm, kind: 'eliminator' });
    
    // ここで名前を triangleSymbols に統一して取得
    let tr = getElementAt(PUZZLE_DATA.triangleSymbols, cell.c, cell.r);
    if (tr) res.triangleSymbols.push({ ...tr, kind: 'triangle' });
  }
  return res;
}

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (k === arr.length) return [arr];
  if (k > arr.length) return [];
  let first = arr[0];
  let rest = arr.slice(1);
  return [...getCombinations(rest, k - 1).map(c => [first, ...c]), ...getCombinations(rest, k)];
}

function canFitPolyominoes(availableCells, polys) {
  if (polys.length === 0) return true;
  let current = polys[0], remaining = polys.slice(1);
  let shapeCells = [];
  for(let r=0;r<current.shape.length;r++) for(let c=0;c<current.shape[r].length;c++) if(current.shape[r][c]===1) shapeCells.push({x:c,y:r});

  for (let cellStr of availableCells) {
    let [baseC, baseR] = cellStr.split(',').map(Number);
    let startOffsetX = shapeCells[0].x, startOffsetY = shapeCells[0].y;
    let fit = true, placed = [];
    for (let block of shapeCells) {
      let tc = baseC + block.x - startOffsetX;
      let tr = baseR + block.y - startOffsetY;
      let key = `${tc},${tr}`;
      if (availableCells.has(key)) placed.push(key); else { fit = false; break; }
    }
    if (fit) {
      let nextAvail = new Set(availableCells);
      for(let k of placed) nextAvail.delete(k);
      if (canFitPolyominoes(nextAvail, remaining)) return true;
    }
  }
  return false;
}

function nodeToPixel(node) { return { x: node.c * CONFIG.display.spacing, y: node.r * CONFIG.display.spacing }; }
function isWithinBounds(node) { return node.c >= 0 && node.c <= PUZZLE_DATA.cols && node.r >= 0 && node.r <= PUZZLE_DATA.rows; }
function isVisited(targetNode) { return path.some(p => p.c === targetNode.c && p.r === targetNode.r); }
function hasWall(c, r, type) { return PUZZLE_DATA.walls ? PUZZLE_DATA.walls.some(w => w.c === c && w.r === r && w.type === type) : false; }
function canMoveBetween(n1, n2) {
  if (n1.r === n2.r) { if (hasWall(min(n1.c, n2.c), n1.r, 'h')) return false; }
  else if (n1.c === n2.c) { if (hasWall(n1.c, min(n1.r, n2.r), 'v')) return false; }
  return true;
}
function isPathBlocking(cell1, cell2) {
  let n1, n2;
  if (cell1.r === cell2.r) { n1 = {c:max(cell1.c,cell2.c),r:cell1.r}; n2={c:n1.c,r:n1.r+1}; }
  else { n1 = {c:cell1.c,r:max(cell1.r,cell2.r)}; n2={c:n1.c+1,r:n1.r}; }
  return isEdgeInPath(n1.c, n1.r, n2.c, n2.r);
}
function isEdgeInPath(c1, r1, c2, r2) {
  for (let i = 0; i < path.length - 1; i++) {
    let p1 = path[i], p2 = path[i+1];
    if ((p1.c===c1 && p1.r===r1 && p2.c===c2 && p2.r===r2) || (p1.c===c2 && p1.r===r2 && p2.c===c1 && p2.r===r1)) return true;
  }
  return false;
}
function isNodeCovered(n) { return path.some(p => p.c === n.c && p.r === n.r); }
function isEdgeCovered(e) {
  let n1 = {c:e.c,r:e.r}, n2 = e.type==='h' ? {c:e.c+1,r:e.r} : {c:e.c,r:e.r+1};
  return isEdgeInPath(n1.c, n1.r, n2.c, n2.r);
}
function countEdgesForCell(c, r) {
  let cnt = 0;
  if (isEdgeInPath(c, r, c+1, r)) cnt++;
  if (isEdgeInPath(c, r+1, c+1, r+1)) cnt++;
  if (isEdgeInPath(c, r, c, r+1)) cnt++;
  if (isEdgeInPath(c+1, r, c+1, r+1)) cnt++;
  return cnt;
}
function getElementAt(list, c, r) { return list ? list.find(i => i.c === c && i.r === r) : null; }