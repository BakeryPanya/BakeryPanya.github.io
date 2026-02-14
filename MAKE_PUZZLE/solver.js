// solver.js - IMPROVED VERSION

async function solvePuzzle() {
  console.log("Solver started...");
  let statusEl = document.getElementById('status');
  if (statusEl) statusEl.innerText = "SOLVING...";
  
  // 画面描画更新のために少し待機
  await new Promise(r => setTimeout(r, 10));

  let solutions = [];
  let visited = new Set();
  
  // スタート地点取得
  let startNode = PUZZLE_DATA.start;
  
  // 現在の探索パス (ノードの配列)
  let currentPath = [startNode];
  visited.add(`${startNode.c},${startNode.r}`);

  // 元のパスを退避（探索後に戻すため）
  let originalPath = [...path];

  // 深さ優先探索 (DFS)
  function dfs(curr) {
    // 1. ゴール到達判定
    if (curr.c === PUZZLE_DATA.goal.c && curr.r === PUZZLE_DATA.goal.r) {
      
      // ★重要★: logic.js はグローバル変数 'path' を参照して判定を行います。
      // そのため、一時的に探索中の currentPath をグローバル path に代入します。
      path = currentPath;
      
      try {
        // logic.js のルール判定関数を呼び出す
        // ここで星、四角、テトリス、消去マークなどの全ルールがチェックされます
        if (validateRule()) {
          // 正解なら保存 (配列のコピーを作成)
          solutions.push([...currentPath]);
          
          // 1つ見つかれば十分ならここで return true; などを返す
        }
      } catch (e) {
        console.error("Validation error:", e);
      }
      
      return;
    }

    // 2. 隣接ノードへ移動
    let neighbors = [
      { c: curr.c, r: curr.r - 1 }, // 上
      { c: curr.c, r: curr.r + 1 }, // 下
      { c: curr.c - 1, r: curr.r }, // 左
      { c: curr.c + 1, r: curr.r }  // 右
    ];

    for (let next of neighbors) {
      // 範囲外チェック
      if (next.c < 0 || next.c > PUZZLE_DATA.cols || next.r < 0 || next.r > PUZZLE_DATA.rows) continue;
      
      // 訪問済みチェック (ループ防止)
      let key = `${next.c},${next.r}`;
      if (visited.has(key)) continue;

      // 壁チェック (logic.js の関数を再利用)
      if (!canMoveBetween(curr, next)) continue;

      // 進む
      visited.add(key);
      currentPath.push(next);
      
      dfs(next);

      // 戻る (バックトラック)
      currentPath.pop();
      visited.delete(key);
      
      // パフォーマンスのため、解が1つ見つかったら探索を打ち切る場合はここを有効化
      if (solutions.length > 0) return;
    }
  }

  // 探索実行
  try {
    dfs(startNode);
  } finally {
    // 必ず元のパスに戻す（これがないと画面上の線がおかしくなる）
    path = originalPath;
  }

  // 結果表示
  if (solutions.length > 0) {
    console.log(`Found ${solutions.length} solutions.`);
    if (statusEl) {
      statusEl.innerText = "SOLVED! (See console)";
      statusEl.style.color = "lime";
    }
    
    // 最初の正解を画面に表示してアニメーションさせる
    gameState = 'SOLVED';
    path = solutions[0];
    
  } else {
    console.log("No solution found.");
    if (statusEl) {
      statusEl.innerText = "NO SOLUTION.";
      statusEl.style.color = "red";
    }
  }
}