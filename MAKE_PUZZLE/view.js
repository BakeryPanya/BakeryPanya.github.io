// ==========================================
// RENDER / DRAWING FUNCTIONS
// ==========================================

function drawSquares() {
  if (!PUZZLE_DATA.squares) return;
  rectMode(CENTER);
  noStroke();
  let s = CONFIG.display.spacing;
  let size = CONFIG.style.squareSize;
  let rad = CONFIG.style.squareRadius;

  for (let sq of PUZZLE_DATA.squares) {
    let x = sq.c * s + s/2;
    let y = sq.r * s + s/2;
    
    // カラーパレットから色を取得
    let c = CONFIG.style.colors.palette[sq.color] || [255, 255, 255];
    fill(...c);
    
    rect(x, y, size, size, rad);
  }
  rectMode(CORNER);
}

function drawEliminators() {
  if (!PUZZLE_DATA.eliminators) return;
  
  noFill();
  stroke(...CONFIG.style.eliminator.color);
  strokeWeight(CONFIG.style.eliminator.width);
  strokeCap(ROUND);

  let s = CONFIG.display.spacing;
  let r = CONFIG.style.eliminator.radius;

  for (let e of PUZZLE_DATA.eliminators) {
    let cx = e.c * s + s/2;
    let cy = e.r * s + s/2;

    push();
    translate(cx, cy);
    // ベンツマーク(Y字)を描く
    for (let i = 0; i < 3; i++) {
      let angle = (TWO_PI / 3) * i - HALF_PI; // 上(-90度)から開始
      let x = cos(angle) * r;
      let y = sin(angle) * r;
      line(0, 0, x, y);
    }
    pop();
  }
}

// 新規追加: ポリオミノ（テトリス型）の描画
function drawPolyominoes() {
  if (!PUZZLE_DATA.polyominoes) return;

  noStroke();
  let s = CONFIG.display.spacing;
  let blockSize = CONFIG.style.polyomino.blockSize;
  let gap = CONFIG.style.polyomino.gap;

  for (let p of PUZZLE_DATA.polyominoes) {
    // ★変更点: 固定色ではなく、オブジェクトのcolorIDからパレット色を取得
    // colorが未定義の場合はデフォルトで黄色(4)を使う
    let colorId = (p.color !== undefined) ? p.color : 4;
    let rgb = CONFIG.style.colors.palette[colorId];
    
    // 万が一パレットにないIDなら黄色にする安全策
    if (!rgb) rgb = CONFIG.style.colors.palette[4];

    fill(...rgb);

    let centerX = p.c * s + s/2;
    let centerY = p.r * s + s/2;

    // 形状の中心を計算してオフセット
    let rows = p.shape.length;
    let cols = p.shape[0].length;
    let totalW = cols * blockSize + (cols - 1) * gap;
    let totalH = rows * blockSize + (rows - 1) * gap;

    let startX = centerX - totalW / 2;
    let startY = centerY - totalH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (p.shape[r][c] === 1) {
          rect(
            startX + c * (blockSize + gap),
            startY + r * (blockSize + gap),
            blockSize,
            blockSize,
            2 // 角丸
          );
        }
      }
    }
  }
}

function drawGrid() {
  stroke(...CONFIG.style.colors.grid);
  strokeWeight(CONFIG.style.strokeWeights.gridLines);
  let s = CONFIG.display.spacing;
  let stub = s * CONFIG.logic.wallStubRatio;

  for (let r = 0; r <= PUZZLE_DATA.rows; r++) {
    for (let c = 0; c < PUZZLE_DATA.cols; c++) {
      let x1 = c * s, y1 = r * s, x2 = (c+1)*s, y2 = r*s;
      if (!hasWall(c, r, 'h')) line(x1, y1, x2, y2);
      else { line(x1, y1, x1+stub, y1); line(x2-stub, y2, x2, y2); }
    }
  }
  for (let c = 0; c <= PUZZLE_DATA.cols; c++) {
    for (let r = 0; r < PUZZLE_DATA.rows; r++) {
      let x1 = c * s, y1 = r * s, x2 = c*s, y2 = (r+1)*s;
      if (!hasWall(c, r, 'v')) line(x1, y1, x2, y2);
      else { line(x1, y1, x1, y1+stub); line(x2, y2-stub, x2, y2); }
    }
  }
  noStroke();
  fill(...CONFIG.style.colors.grid);
  for (let r = 0; r <= PUZZLE_DATA.rows; r++) {
    for (let c = 0; c <= PUZZLE_DATA.cols; c++) {
      circle(c * s, r * s, CONFIG.style.strokeWeights.nodeSize);
    }
  }
}

function drawActivePath() {
  if (path.length === 0) return;
  let alphaCore = 255;
  if (gameState === 'DRAWING' && isAtGoal) alphaCore = map(sin(frameCount * 0.15), -1, 1, 150, 255);
  noFill();
  stroke(...CONFIG.style.colors.pathCore); strokeWeight(CONFIG.style.strokeWeights.pathCore);
  let col = color(...CONFIG.style.colors.pathCore); col.setAlpha(alphaCore); stroke(col);
  drawPathShape(path, true);
}

function drawFadingPath(colorArr) {
  if (fadingPath.length === 0) return;
  noFill();
  let colCore = color(...colorArr);
  colCore.setAlpha(fadeOpacity);
  stroke(colCore);
  strokeWeight(CONFIG.style.strokeWeights.pathCore);
  drawPathShape(fadingPath, false);
}

function drawPathShape(nodeList, useTip) {
  beginShape();
  for (let p of nodeList) vertex(p.c * CONFIG.display.spacing, p.r * CONFIG.display.spacing);
  if (gameState === 'DRAWING' && useTip && drawingTip && !isAtGoal) vertex(drawingTip.x, drawingTip.y);
  let lastNode = nodeList[nodeList.length - 1];
  if (lastNode.c === PUZZLE_DATA.goal.c && lastNode.r === PUZZLE_DATA.goal.r) {
    if ((gameState === 'DRAWING' && isAtGoal) || gameState === 'SOLVED' || gameState === 'FADING' || gameState === 'ERROR_FADING') {
      let g = PUZZLE_DATA.goal;
      vertex((g.c * CONFIG.display.spacing) + goalOffset.x, (g.r * CONFIG.display.spacing) + goalOffset.y);
    }
  }
  endShape();
}

function drawGoalNub() {
  let g = PUZZLE_DATA.goal;
  let startX = g.c * CONFIG.display.spacing, startY = g.r * CONFIG.display.spacing;
  let endX = startX + goalOffset.x, endY = startY + goalOffset.y;
  stroke(...CONFIG.style.colors.grid); strokeWeight(CONFIG.style.strokeWeights.gridLines); noFill();
  line(startX, startY, endX, endY);
}

function drawStartCircle() {
  let p = nodeToPixel(PUZZLE_DATA.start);
  fill(...CONFIG.style.colors.startCircle); noStroke();
  circle(p.x, p.y, CONFIG.style.strokeWeights.startNodeSize);
}

function drawStars() {
  if (!PUZZLE_DATA.stars) return;
  noStroke();

  let s = CONFIG.display.spacing;
  let rOuter = CONFIG.style.star.radiusOuter;
  let rInner = CONFIG.style.star.radiusInner;

  for (let star of PUZZLE_DATA.stars) {
    let cx = star.c * s + s/2;
    let cy = star.r * s + s/2;
    
    // カラーパレットから色を取得
    let c = CONFIG.style.colors.palette[star.color] || [255, 255, 255];
    fill(...c);

    let numPoints = 8; 
    let numVertices = numPoints * 2;

    beginShape();
    for (let i = 0; i < numVertices; i++) {
      let angle = TWO_PI * i / numVertices - HALF_PI;
      let r = (i % 2 === 0) ? rOuter : rInner;
      let x = cx + cos(angle) * r;
      let y = cy + sin(angle) * r;
      vertex(x, y);
    }
    endShape(CLOSE);
  }
}

function drawMustPasses() {
  if (!PUZZLE_DATA.mustPasses) return;
  noStroke();
  fill(...CONFIG.style.hexagon.color);

  let s = CONFIG.display.spacing;
  let r = CONFIG.style.hexagon.radius;

  for (let mp of PUZZLE_DATA.mustPasses) {
    let cx, cy;

    // 座標計算
    if (mp.type === 'node') {
      // 交差点: グリッドの交点そのもの
      cx = mp.c * s;
      cy = mp.r * s;
    } else if (mp.type === 'h') {
      // 横線の中点
      cx = (mp.c + 0.5) * s;
      cy = mp.r * s;
    } else { // 'v'
      // 縦線の中点
      cx = mp.c * s;
      cy = (mp.r + 0.5) * s;
    }

    // 六角形を描画
    beginShape();
    for (let i = 0; i < 6; i++) {
      let angle = TWO_PI * i / 6; 
      let x = cx + cos(angle) * r;
      let y = cy + sin(angle) * r;
      vertex(x, y);
    }
    endShape(CLOSE);
  }
}

function drawTriangleSymbols() {
  if (!PUZZLE_DATA.triangleSymbols) return;
  
  noStroke();
  // CONFIG.style.triSymbol に変更
  fill(...CONFIG.style.triSymbol.color);

  let s = CONFIG.display.spacing;
  let tSize = CONFIG.style.triSymbol.size;
  let gap = CONFIG.style.triSymbol.gap;

  for (let t of PUZZLE_DATA.triangleSymbols) {
    let centerX = t.c * s + s/2;
    let centerY = t.r * s + s/2;

    for (let i = 0; i < t.count; i++) {
      let offsetX = (i - (t.count - 1) / 2) * (tSize + gap);
      
      push();
      translate(centerX + offsetX, centerY);
      
      // 描画自体は p5.js の関数 triangle() を安全に呼び出せます
      beginShape();
      for (let j = 0; j < 3; j++) {
        let angle = TWO_PI * j / 3 - HALF_PI;
        vertex(cos(angle) * (tSize / 1.5), sin(angle) * (tSize / 1.5));
      }
      endShape(CLOSE);
      pop();
    }
  }
}