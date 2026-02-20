// ==========================================
// solver.js - COMPLETE VERSION
// ==========================================

async function solvePuzzle() {
  console.log("Solver started...");
  
  // UIのステータス更新
  let statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.innerText = "SOLVING...";
    statusEl.style.color = "yellow";
  }
  
  // 画面描画更新のために少し待機 (UIがフリーズしないように)
  await new Promise(r => setTimeout(r, 50));

  let solutions = [];
  let visited = new Set();
  
  // スタート地点取得
  let startNode = PUZZLE_DATA.start;
  if (!startNode) {
    console.error("No start node defined");
    return;
  }
  
  // 現在の探索パス (ノードの配列)
  let currentPath = [startNode];
  visited.add(`${startNode.c},${startNode.r}`);

  // 元のパスを退避（探索後に戻すため）
  let originalPath = [...path];
  
  // 探索打ち切りフラグ
  let found = false;

  // 深さ優先探索 (DFS)
  function dfs(curr) {
    if (found) return; // 既に見つかっていれば終了

    // 1. ゴール到達判定
    if (curr.c === PUZZLE_DATA.goal.c && curr.r === PUZZLE_DATA.goal.r) {
      
      // ★重要★: logic.js はグローバル変数 'path' を参照して判定を行うため、
      // 一時的に探索中のパスをグローバル path に代入して判定させる
      path = currentPath;
      
      try {
        // logic.js のルール判定関数を呼び出す
        if (validateRule()) {
          // 正解なら保存
          solutions.push([...currentPath]);
          found = true; // 1つ見つかれば終了
        }
      } catch (e) {
        console.error("Validation error in solver:", e);
      }
      return;
    }

    // 2. 隣接ノードへ移動 (上下左右)
    let neighbors = [
      { c: curr.c, r: curr.r - 1 }, // 上
      { c: curr.c, r: curr.r + 1 }, // 下
      { c: curr.c - 1, r: curr.r }, // 左
      { c: curr.c + 1, r: curr.r }  // 右
    ];

    // ランダムに並び替えると、毎回違う解が見つかるかも（今回は固定）
    
    for (let next of neighbors) {
      if (found) break;

      // 範囲外チェック
      if (next.c < 0 || next.c > PUZZLE_DATA.cols || next.r < 0 || next.r > PUZZLE_DATA.rows) continue;
      
      // 訪問済みチェック (ループ防止)
      let key = `${next.c},${next.r}`;
      if (visited.has(key)) continue;

      // 壁チェック (logic.js の関数を再利用)
      // canMoveBetween は logic.js で定義されている必要があります
      if (typeof canMoveBetween === 'function' && !canMoveBetween(curr, next)) continue;

      // 進む
      visited.add(key);
      currentPath.push(next);
      
      dfs(next);

      // 戻る (バックトラック)
      if (!found) {
        currentPath.pop();
        visited.delete(key);
      }
    }
  }

  // 探索実行
  try {
    // pathをクリアして探索開始
    path = [];
    dfs(startNode);
  } catch (e) {
    console.error("Solver error:", e);
  } finally {
    // 見つからなかった場合は元のパスに戻す
    if (!found) {
      path = originalPath;
    }
  }

  // 結果表示
  if (solutions.length > 0) {
    console.log("Solution found!");
    if (statusEl) {
      statusEl.innerText = "SOLVED! (Auto-played)";
      statusEl.style.color = "lime";
    }
    
    // 見つかった解を適用して状態を「解決済み」にする
    path = solutions[0];
    gameState = 'SOLVED';
    
    // ステージモード中なら、自動で次へ進む処理を呼ぶか検討
    // (ここでは自動進行させず、ユーザーに見せるだけに留める)
    
  } else {
    console.log("No solution found.");
    if (statusEl) {
      statusEl.innerText = "NO SOLUTION.";
      statusEl.style.color = "red";
    }
    // 元のパスに戻す
    path = originalPath;
  }
}