import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import Draggable from 'react-draggable'; 
import RubikVisualizer from './visualize';
import './styles.css';

const MemoizedVisualizer = memo(RubikVisualizer);

export default function App() {
  const nodeRef = useRef(null);

  // --- ステート管理 ---
  const [cubeState, setCubeState] = useState<number[]>([]);
  const [moveQueue, setMoveQueue] = useState<string[]>([]);
  const [pendingMoves, setPendingMoves] = useState<string[]>([]);
  const [isAnimated, setIsAnimated] = useState(true);
  const [isInverseMode, setIsInverseMode] = useState(false); // 逆回転モード
  const [animationSpeed, setAnimationSpeed] = useState(300); // アニメーション速度 (ms)
  
  // Juliaから返ってくる中間状態の軌跡を保持する参照
  const historyRef = useRef<number[][]>([]);

  /**
   * 1. 初期状態のロード
   */
  const fetchInitial = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8080/get-state`);
      const data = await res.json();
      setCubeState(data.current);
    } catch (e) { console.error("Initial fetch failed:", e); }
  }, []);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  /**
   * 2. アニメーションの各ステップ完了時の同期
   * ビジュアライザー側で1手の回転が終わるたびに呼ばれます。
   */
  const handleStepComplete = useCallback(() => {
    if (historyRef.current.length > 0) {
      const nextState = historyRef.current.shift();
      if (nextState) setCubeState(nextState); // 色を物理的に正しい状態へ更新
    }
  }, []);

  /**
   * 3. 手順の実行 (Apply)
   */
  const executeMoves = async () => {
    if (pendingMoves.length === 0) return;
    try {
      const response = await fetch('http://localhost:8080/apply-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: pendingMoves })
      });

      if (response.ok) {
        const data = await response.json();
        if (isAnimated && data.history) {
          historyRef.current = [...data.history]; // 中間状態の軌跡をセット
          setMoveQueue([...pendingMoves]);       // アニメーション開始
        } else {
          setCubeState(data.current);            // アニメーションなしなら即時反映
        }
        setPendingMoves([]);
      }
    } catch (e) { console.error("Execute failed:", e); }
  };

  /**
   * 4. ランダムシャッフル (Scramble)
   */
  const scrambleCube = async () => {
  try {
    const res = await fetch('http://localhost:8080/scramble', { method: 'POST' });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    if (isAnimated && data.history) {
      historyRef.current = [...data.history];
      setMoveQueue([...data.moves]);
    } else {
      setCubeState(data.current);
    }
  } catch (e) {
    console.error("Scramble failed:", e);
    alert("Scramble failed. Check if Julia server is running and has /scramble endpoint.");
  }
  };
  const solvePuzzle = async () => {
    try {
      // 1. まず解法（文字列）を取得
      const res = await fetch('http://localhost:8080/solve');
      if (!res.ok) throw new Error("Solve API failed");
      
      const data = await res.json();
      if (!data.solution || data.solution.trim() === "") {
        return alert("The cube is already solved or no solution found.");
      }

      const solutionMoves = data.solution.split(" ");
      
      // 2. 取得した解法をサーバーに適用させて「中間状態の履歴」をもらう
      const applyRes = await fetch('http://localhost:8080/apply-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: solutionMoves })
      });
      
      if (!applyRes.ok) throw new Error("Failed to apply solution moves");
      
      const applyData = await applyRes.json();

      // 3. アニメーションキューに解法を、履歴参照に状態をセット
      historyRef.current = [...applyData.history];
      setMoveQueue(solutionMoves); 
    } catch (e) {
      console.error("Solve failed:", e);
      alert("Solve failed. Make sure GAP is correctly configured in the backend.");
    }
  };

  return (
    <div className="app-container">
      <div className="cube-viewport">
        {/* メモ化された3D領域 */}
        <MemoizedVisualizer 
          state={cubeState} 
          moveQueue={moveQueue} 
          animationSpeed={animationSpeed} 
          onAnimationComplete={() => setMoveQueue([])}
          onStepComplete={handleStepComplete} 
        />

        {/* ドラッグ可能な操作パネル */}
        <Draggable nodeRef={nodeRef} handle=".drag-handle">
          <div ref={nodeRef} className="control-panel">
            <div className="drag-handle">⠿</div>
            
            {/* 入力中の手順表示 */}
            <div className="history-box">
              {pendingMoves.length > 0 ? pendingMoves.join(' ') : '> input moves...'}
            </div>

            {/* 逆回転モード設定 */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: isInverseMode ? '#ff4d4d' : '#888' }}>
                <input type="checkbox" checked={isInverseMode} onChange={() => setIsInverseMode(!isInverseMode)} />
                Inverse Mode (Append ')
              </label>
            </div>

            {/* 回転ボタン群 */}
            <div className="button-grid">
              {['U', 'L', 'F', 'R', 'B', 'D'].map(m => {
                const moveLabel = isInverseMode ? `${m}'` : m;
                return (
                  <button key={m} className="rotate-btn" onClick={() => setPendingMoves(p => [...p, moveLabel])}>
                    {moveLabel}
                  </button>
                );
              })}
            </div>

            {/* アニメーションと速度設定 */}
            <div className="action-row" style={{ gridTemplateColumns: '1fr', gap: '4px' }}>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" checked={isAnimated} onChange={() => setIsAnimated(!isAnimated)} />
                Use Animation
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', marginLeft: '18px' }}>
                <input 
                  type="number" 
                  value={animationSpeed} 
                  onChange={(e) => setAnimationSpeed(Math.max(1, Number(e.target.value)))}
                  style={{ width: '55px', background: '#000', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '2px 4px' }}
                />
                <span>ms</span>
              </div>
            </div>

            {/* 各種アクションボタン */}
            <div className="action-row">
               <button className="action-btn" onClick={() => setPendingMoves([])} style={{ background: '#444' }}>Clear</button>
               <button className="action-btn" onClick={scrambleCube} style={{ background: '#6c757d' }}>Random</button>
            </div>

            <div className="action-row" style={{ gridTemplateColumns: '1fr' }}>
               <button className="action-btn" onClick={executeMoves} style={{ background: '#28a745' }}>Apply Moves</button>
            </div>

            <button className="action-btn" onClick={solvePuzzle} style={{ background: '#007bff', width: '100%', marginTop: '8px' }}>
              Solve Puzzle
            </button>
          </div>
        </Draggable>
      </div>
    </div>
  );
}