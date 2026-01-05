import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import Draggable from 'react-draggable'; 
import RubikVisualizer from './visualize';
import './styles.css';

const MemoizedVisualizer = memo(RubikVisualizer);

export default function App() {
  const nodeRef = useRef(null);
  const [cubeState, setCubeState] = useState<number[]>([]);
  const [moveQueue, setMoveQueue] = useState<string[]>([]);
  const [pendingMoves, setPendingMoves] = useState<string[]>([]);
  const [isAnimated, setIsAnimated] = useState(true);
  const historyRef = useRef<number[][]>([]);
  const [animationSpeed, setAnimationSpeed] = useState(300);
  const fetchInitial = useCallback(async () => {
    const res = await fetch(`http://localhost:8080/get-state`);
    const data = await res.json();
    setCubeState(data.current);
  }, []);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  const handleStepComplete = useCallback(() => {
    if (historyRef.current.length > 0) {
      const nextState = historyRef.current.shift();
      if (nextState) setCubeState(nextState);
    }
  }, []);

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
          historyRef.current = [...data.history];
          setMoveQueue([...pendingMoves]);
          
          // ループではなく、ビジュアライザー側の onStepComplete と連携するか、
          // 指定した ms で逐次更新するようにします。
          // ここでは単純化のため、ループで指定ms待機します
          /* 注: handleStepComplete を使う場合は、ビジュアライザー側で 
             ms に合わせた回転速度を計算させるのが「マシ」な設計です。
          */
        } else {
          setCubeState(data.current);
        }
        setPendingMoves([]);
      }
    } catch (e) { console.error(e); }
  };
  return (
    <div className="app-container">
      <div className="cube-viewport">
        <MemoizedVisualizer 
          state={cubeState} 
          moveQueue={moveQueue} 
          animationSpeed={animationSpeed} 
          onAnimationComplete={() => setMoveQueue([])}
          onStepComplete={handleStepComplete} 
        />
        <Draggable nodeRef={nodeRef} handle=".drag-handle">
          <div ref={nodeRef} className="control-panel">
            <div className="drag-handle">⠿</div>
            <div className="history-box">
              {pendingMoves.join(' ') || '> input moves...'}
            </div>
            <div className="button-grid">
              {['U', 'L', 'F', 'R', 'B', 'D'].map(m => (
                <button key={m} className="rotate-btn" onClick={() => setPendingMoves(p => [...p, m])}>{m}</button>
              ))}
            </div>
            <div className="action-row" style={{ gridTemplateColumns: '1fr' }}>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" checked={isAnimated} onChange={() => setIsAnimated(!isAnimated)} />
                Use Animation
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', marginLeft: '20px' }}>
                <input 
                  type="number" 
                  value={animationSpeed} 
                  onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                  style={{ width: '50px', background: '#000', color: '#fff', border: '1px solid #444', borderRadius: '3px', padding: '2px' }}
                />
                <span>ms</span>
              </div>
            </div>
            <div className="action-row">
               <button className="action-btn" onClick={() => setPendingMoves([])} style={{ background: '#444' }}>Clear</button>
               <button className="action-btn" onClick={executeMoves} style={{ background: '#28a745' }}>Apply</button>
            </div>
            <button className="action-btn" style={{ background: '#007bff', width: '100%', marginTop: '8px' }}>
              Solve Puzzle
            </button>
          </div>
        </Draggable>
      </div>
    </div>
  );
}